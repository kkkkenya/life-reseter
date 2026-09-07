import { useCallback, useEffect, useRef, useState } from "react";

const MAX_SECONDS = 45;

/** True where MediaRecorder + microphone capture exist (covers Firefox and
 *  iOS Safari, which lack SpeechRecognition). */
export function canRecordAudio(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  return (
    typeof window.MediaRecorder !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia
  );
}

function pickMime(): string {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  for (const c of candidates) {
    try {
      if (window.MediaRecorder.isTypeSupported(c)) return c;
    } catch {
      /* ignore */
    }
  }
  return "";
}

/** Record-then-transcribe fallback for browsers without SpeechRecognition. */
export function useAudioRecorder() {
  const [recording, setRecording] = useState(false);
  const [supported] = useState(canRecordAudio);
  const recRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);

  const stopTracks = useCallback(() => {
    try {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    } catch {
      /* noop */
    }
    streamRef.current = null;
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      try {
        recRef.current?.stream.getTracks().forEach((t) => t.stop());
      } catch {
        /* noop */
      }
      stopTracks();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const start = useCallback(async () => {
    if (!canRecordAudio()) throw new Error("Recording isn't supported in this browser — type the answer instead.");
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true }).catch(() => {
      throw new Error("Microphone blocked — allow mic access or type the answer.");
    });
    streamRef.current = stream;
    const mime = pickMime();
    const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
    recRef.current = rec;
    const chunks: BlobPart[] = [];
    rec.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };
    const done = new Promise<{ base64: string; mimeType: string }>((resolve, reject) => {
      rec.onstop = () => {
        try {
          const type = rec.mimeType || "audio/webm";
          const blob = new Blob(chunks, { type });
          const reader = new FileReader();
          reader.onload = () => {
            const dataUrl = typeof reader.result === "string" ? reader.result : "";
            const base64 = dataUrl.split(",")[1] ?? "";
            if (!base64) reject(new Error("Couldn't read that recording — type it instead."));
            else resolve({ base64, mimeType: type.split(";")[0] });
          };
          reader.onerror = () => reject(new Error("Couldn't read that recording — type it instead."));
          reader.readAsDataURL(blob);
        } catch {
          reject(new Error("Couldn't read that recording — type it instead."));
        } finally {
          stopTracks();
          setRecording(false);
        }
      };
      rec.onerror = () => {
        stopTracks();
        setRecording(false);
        reject(new Error("Recording failed — type the answer instead."));
      };
    });
    rec.start();
    setRecording(true);
    timerRef.current = window.setTimeout(() => {
      try {
        rec.stop();
      } catch {
        /* noop */
      }
    }, MAX_SECONDS * 1000);
    // Caller holds finish() for the Stop button; the auto-stop timer calls
    // rec.stop() directly, which still resolves `done`.
    const finish = () => {
      try {
        if (rec.state !== "inactive") rec.stop();
      } catch {
        /* noop */
      }
      return done;
    };
    return { finish };
  }, [stopTracks]);

  const transcribe = useCallback(async (audioBase64: string, mimeType: string): Promise<string> => {
    const res = await fetch("/api/transcribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ audioBase64, mimeType }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || `Transcription failed (${res.status})`);
    const transcript: string = data?.transcript ?? "";
    if (!transcript.trim()) throw new Error("Didn't catch that — try again or type it.");
    return transcript.trim();
  }, []);

  return { supported, recording, start, transcribe };
}
