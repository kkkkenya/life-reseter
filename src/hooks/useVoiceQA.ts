import { useCallback, useEffect, useRef, useState } from "react";

function recognitionCtor(): (new () => {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: { results: { transcript: string }[][] }) => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, unknown>;
  const Ctor = (w.SpeechRecognition ?? w.webkitSpeechRecognition) as
    | (new () => {
        lang: string;
        interimResults: boolean;
        maxAlternatives: number;
        onresult: ((e: { results: { transcript: string }[][] }) => void) | null;
        onerror: ((e: { error?: string }) => void) | null;
        onend: (() => void) | null;
        start: () => void;
        stop: () => void;
        abort: () => void;
      })
    | undefined;
  return Ctor ?? null;
}

export function voiceCapabilities(): { speak: boolean; listen: boolean } {
  if (typeof window === "undefined") return { speak: false, listen: false };
  return {
    speak: "speechSynthesis" in window,
    listen: recognitionCtor() !== null,
  };
}

/** Speak + listen primitives for the poster-clarification flow. Typed input always remains as fallback. */
export function useVoiceQA() {
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const recRef = useRef<{ stop: () => void; abort: () => void } | null>(null);
  const caps = voiceCapabilities();

  useEffect(() => {
    return () => {
      try {
        window.speechSynthesis?.cancel();
      } catch {
        /* noop */
      }
      try {
        recRef.current?.abort();
      } catch {
        /* noop */
      }
    };
  }, []);

  const speak = useCallback(
    (text: string): Promise<void> => {
      return new Promise((resolve) => {
        if (!caps.speak) {
          resolve();
          return;
        }
        try {
          window.speechSynthesis.cancel();
          const u = new SpeechSynthesisUtterance(text.slice(0, 220));
          u.rate = 1;
          u.onend = () => {
            setSpeaking(false);
            resolve();
          };
          u.onerror = () => {
            setSpeaking(false);
            resolve(); // never block the flow on TTS failure
          };
          setSpeaking(true);
          window.speechSynthesis.speak(u);
        } catch {
          setSpeaking(false);
          resolve();
        }
      });
    },
    [caps.speak]
  );

  const listenOnce = useCallback(
    (timeoutMs = 12000): Promise<string> => {
      return new Promise((resolve, reject) => {
        const Ctor = recognitionCtor();
        if (!Ctor) {
          reject(new Error("Voice input isn't supported in this browser — type the answer instead."));
          return;
        }
        let settled = false;
        const finish = (fn: () => void) => {
          if (settled) return;
          settled = true;
          window.clearTimeout(timer);
          setListening(false);
          fn();
        };
        const timer = window.setTimeout(() => {
          try {
            recRef.current?.stop();
          } catch {
            /* noop */
          }
          finish(() => reject(new Error("Didn't catch that — try again or type it.")));
        }, timeoutMs);

        try {
          const rec = new Ctor();
          recRef.current = rec;
          rec.lang = "en-US";
          rec.interimResults = false;
          rec.maxAlternatives = 1;
          rec.onresult = (e) => {
            const transcript = e.results?.[0]?.[0]?.transcript?.trim() ?? "";
            finish(() => (transcript ? resolve(transcript) : reject(new Error("Didn't catch that — try again or type it."))));
          };
          rec.onerror = (e) => {
            const err = (e as { error?: string }).error ?? "";
            finish(() =>
              reject(
                new Error(
                  err === "not-allowed" || err === "service-not-allowed"
                    ? "Microphone blocked — allow mic access or type the answer."
                    : "Didn't catch that — try again or type it."
                )
              )
            );
          };
          rec.onend = () => {
            finish(() => reject(new Error("Didn't catch that — try again or type it.")));
          };
          setListening(true);
          rec.start();
        } catch {
          finish(() => reject(new Error("Voice input isn't available right now — type the answer instead.")));
        }
      });
    },
    []
  );

  /** Speak a question, then listen once. Always safe to fall back to typing. */
  const askQuestion = useCallback(
    async (question: string, timeoutMs = 12000): Promise<string> => {
      await speak(question);
      return listenOnce(timeoutMs);
    },
    [speak, listenOnce]
  );

  return { ...caps, speaking, listening, speak, listenOnce, askQuestion };
}
