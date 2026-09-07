import { useEffect, useRef, useState } from "react";
import { ImagePlus, Mic, Loader2, Check, Pencil, Square } from "lucide-react";
import { GhostButton } from "@/components/ui";
import { LIFE_AREAS } from "@/data/lifeAreas";
import { useVoiceQA } from "@/hooks/useVoiceQA";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useGoogleCalendar } from "@/hooks/useGoogleCalendar";
import { buildEventInsert } from "@/lib/googleCalendar";
import {
  isValidIsoDate,
  isValidTime,
  parseEventFromImage,
  spokenDateToISO,
  spokenTimeToHHMM,
  type ParsedEvent,
} from "@/lib/parseEvent";
import type { LifeAreaKey, TimeBlock } from "@/types";

type Phase = "pick" | "scanning" | "review";

function inputStyle(): React.CSSProperties {
  return {
    borderColor: "var(--color-line)",
    background: "var(--color-surface-raised)",
    color: "var(--color-ink)",
  };
}

/** "18:00" -> "19:00" (wraps past midnight) for sensible default end times. */
function plusOneHour(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return "19:00";
  return `${String((h + 1) % 24).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function EventScanSheet({
  onClose,
  onConfirm,
}: {
  onClose: () => void;
  onConfirm: (date: string, block: Omit<TimeBlock, "id">) => void;
}) {
  const todayIso = new Date().toISOString().slice(0, 10);
  const fileRef = useRef<HTMLInputElement>(null);

  const [phase, setPhase] = useState<Phase>("pick");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<string[]>([]);
  const [confidence, setConfidence] = useState<number | null>(null);

  const [title, setTitle] = useState("");
  const [date, setDate] = useState(todayIso);
  const [start, setStart] = useState("18:00");
  const [end, setEnd] = useState("19:00");
  const [area, setArea] = useState<LifeAreaKey>("productivity");
  const [location, setLocation] = useState("");
  const [manualMode, setManualMode] = useState(false);

  const voice = useVoiceQA();
  const recorder = useAudioRecorder();
  const gcal = useGoogleCalendar();
  const [toGoogle, setToGoogle] = useState(false);
  const [gError, setGError] = useState<string | null>(null);

  useEffect(() => {
    if (gcal.connected) setToGoogle(true);
  }, [gcal.connected]);
  const [voiceMsg, setVoiceMsg] = useState<string | null>(null);
  const [voiceBusy, setVoiceBusy] = useState(false);
  const [recSession, setRecSession] = useState<{ finish: () => Promise<{ base64: string; mimeType: string }> } | null>(null);
  const [recBusy, setRecBusy] = useState(false);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setScanError(null);
    setVoiceMsg(null);
    setPreviewUrl(URL.createObjectURL(file));
    setPhase("scanning");
    try {
      const parsed: ParsedEvent = await parseEventFromImage(file, todayIso);
      setTitle(parsed.title ?? "");
      setDate(parsed.date && isValidIsoDate(parsed.date) ? parsed.date : todayIso);
      setStart(parsed.startTime && isValidTime(parsed.startTime) ? parsed.startTime : "18:00");
      setEnd(
        parsed.endTime && isValidTime(parsed.endTime)
          ? parsed.endTime
          : parsed.startTime && isValidTime(parsed.startTime)
            ? plusOneHour(parsed.startTime)
            : "19:00"
      );
      setArea(parsed.lifeArea);
      setLocation(parsed.location ?? "");
      setQuestions(parsed.clarifyingQuestions ?? []);
      setConfidence(parsed.confidence);
      setManualMode(!parsed.title && !parsed.date && !parsed.startTime);
      setPhase("review");
    } catch (e) {
      setScanError(e instanceof Error ? e.message : "Scan failed.");
      // Fall through to manual entry — the sheet stays useful offline / unconfigured.
      setManualMode(true);
      setPhase("review");
    }
  }

  type AnswerTarget = { field: "title" | "date" | "startTime" | "location"; question: string };

  /** First field that still needs an answer (time re-asked for confirmation). */
  function nextTarget(): AnswerTarget | null {
    if (!title.trim()) return { field: "title", question: "What is the event called?" };
    if (!isValidIsoDate(date)) return { field: "date", question: "Which date is it on?" };
    return { field: "startTime", question: title ? `What time does ${title.slice(0, 40)} start?` : "What time does it start?" };
  }

  /** Fill the matching field from a heard/typed transcript. Shared by live
   *  voice, recorded-voice transcription, so every path parses identically. */
  function fillFromTranscript(target: AnswerTarget, heard: string): string {
    if (target.field === "startTime") {
      const hhmm = spokenTimeToHHMM(heard);
      if (hhmm) {
        setStart(hhmm);
        setEnd((prev) => (isValidTime(prev) && prev > hhmm ? prev : plusOneHour(hhmm)));
        return `Heard "${heard}" — set start to ${hhmm}. Adjust below if needed.`;
      }
      return `Heard "${heard}" — couldn't parse a time, please type it.`;
    }
    if (target.field === "date") {
      const iso = spokenDateToISO(heard, todayIso);
      if (iso) {
        setDate(iso);
        return `Heard "${heard}" — set date to ${iso}.`;
      }
      return `Heard "${heard}" — couldn't parse a date, please pick it.`;
    }
    if (target.field === "title") {
      setTitle(heard.slice(0, 90));
      return `Heard "${heard}" — set as title.`;
    }
    setLocation(heard.slice(0, 120));
    return `Heard "${heard}" — set as location.`;
  }

  /** Voice Q&A: speak the first open question, listen, and fill the matching field. */
  async function answerWithVoice() {
    setVoiceMsg(null);
    const target = nextTarget();
    if (!target) {
      setVoiceMsg("Everything looks filled — review and tap Add to calendar.");
      return;
    }
    setVoiceBusy(true);
    try {
      const heard = await voice.askQuestion(target.question);
      setVoiceMsg(fillFromTranscript(target, heard));
    } catch (e) {
      setVoiceMsg(e instanceof Error ? e.message : "Voice input failed — type it instead.");
    } finally {
      setVoiceBusy(false);
    }
  }

  /** Recorded fallback for browsers without SpeechRecognition: record the
   *  answer, transcribe it server-side, fill identically to live voice. */
  async function toggleRecord() {
    if (recSession) {
      // Stop pressed -> transcribe what was captured.
      const session = recSession;
      setRecSession(null);
      setRecBusy(true);
      try {
        const { base64, mimeType } = await session.finish();
        const target = nextTarget() ?? {
          field: "startTime" as const,
          question: "What time does it start?",
        };
        const heard = await recorder.transcribe(base64, mimeType);
        setVoiceMsg(fillFromTranscript(target, heard));
      } catch (e) {
        setVoiceMsg(e instanceof Error ? e.message : "Recording failed — type it instead.");
      } finally {
        setRecBusy(false);
      }
      return;
    }
    setVoiceMsg(null);
    const target = nextTarget();
    if (!target) {
      setVoiceMsg("Everything looks filled — review and tap Add to calendar.");
      return;
    }
    try {
      if (target.field !== "startTime") {
        // Speak the question where possible, then record (best of both).
        await voice.speak(target.question);
      }
      const session = await recorder.start();
      setRecSession(session);
      setVoiceMsg(`Recording — say: ${target.question} Tap stop when done.`);
    } catch (e) {
      setVoiceMsg(e instanceof Error ? e.message : "Recording failed — type it instead.");
    }
  }

  const timesValid = isValidTime(start) && isValidTime(end);
  const timeOrderOk = timesValid && end > start;
  const valid = title.trim().length > 0 && isValidIsoDate(date) && timeOrderOk;

  function buildBlock(): Omit<TimeBlock, "id"> {
    const label = location.trim() ? `${title.trim()} · ${location.trim()}` : title.trim();
    return { startTime: start, endTime: end, label: label.slice(0, 140), lifeArea: area };
  }

  async function confirm() {
    if (!valid) return;
    setGError(null);
    if (toGoogle && gcal.connected) {
      try {
        await gcal.insert(
          buildEventInsert({
            label: title.trim(),
            date,
            startTime: start,
            endTime: end,
            location: location.trim() || undefined,
          })
        );
      } catch {
        setGError("Google push failed — reconnect (green dot, top right) and retry, or keep it local only.");
        return; // stay open so nothing is lost silently
      }
    }
    onConfirm(date, buildBlock());
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[86vh] w-full max-w-md overflow-y-auto rounded-t-3xl p-6"
        style={{ background: "var(--color-surface-raised)" }}
      >
        <h2 className="font-display text-lg font-semibold">Add from poster</h2>
        <p className="mt-1 text-sm" style={{ color: "var(--color-ink-dim)" }}>
          Upload a screenshot or event banner — the calendar fills itself in. The image is only sent for one-shot
          reading, never stored.
        </p>

        {phase === "pick" && (
          <div className="mt-4">
            <button
              onClick={() => fileRef.current?.click()}
              className="flex w-full flex-col items-center gap-2 rounded-2xl border border-dashed py-8 text-sm font-medium"
              style={{ borderColor: "var(--color-line)", color: "var(--color-ink-dim)" }}
            >
              <ImagePlus size={22} color="var(--color-ember)" />
              Tap to upload a screenshot
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => void handleFile(e.target.files?.[0])}
            />
            <div className="mt-3">
              <GhostButton onClick={() => { setManualMode(true); setPhase("review"); }}>
                <span className="flex items-center justify-center gap-1.5">
                  <Pencil size={13} /> Enter manually instead
                </span>
              </GhostButton>
            </div>
          </div>
        )}

        {phase === "scanning" && (
          <div className="mt-6 flex flex-col items-center gap-3 py-8">
            {previewUrl && (
              <img src={previewUrl} alt="Uploaded poster preview" className="max-h-40 rounded-xl" style={{ border: "1px solid var(--color-line)" }} />
            )}
            <p className="flex items-center gap-2 text-sm" style={{ color: "var(--color-ink-dim)" }}>
              <Loader2 size={15} className="animate-spin" /> Reading your poster…
            </p>
          </div>
        )}

        {phase === "review" && (
          <div className="mt-4 space-y-3">
            {previewUrl && (
              <img src={previewUrl} alt="Uploaded poster preview" className="max-h-32 rounded-xl" style={{ border: "1px solid var(--color-line)" }} />
            )}
            {scanError && (
              <p className="rounded-xl px-3 py-2 text-xs" style={{ background: "var(--color-ember-soft)", color: "var(--color-ember)" }}>
                {scanError} You can still fill it in below.
              </p>
            )}
            {confidence !== null && !manualMode && (
              <p className="text-xs" style={{ color: "var(--color-ink-dim)" }}>
                Scan confidence: <span className="font-mono font-semibold">{Math.round(confidence * 100)}%</span> — always
                double-check before adding.
              </p>
            )}
            {questions.length > 0 && (
              <div className="rounded-2xl border p-3" style={{ borderColor: "var(--color-line)", background: "var(--color-surface)" }}>
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-ember)" }}>
                  Needs a check
                </p>
                <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-sm" style={{ color: "var(--color-ink-dim)" }}>
                  {questions.map((q, i) => (
                    <li key={i}>{q}</li>
                  ))}
                </ul>
                <button
                  onClick={() => void answerWithVoice()}
                  disabled={voiceBusy}
                  className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50"
                  style={{ background: "var(--color-ember-soft)", color: "var(--color-ember)" }}
                >
                  {voice.listening ? <Loader2 size={14} className="animate-spin" /> : <Mic size={14} />}
                  {voiceBusy ? "Listening…" : "Answer with voice"}
                </button>
                {!voice.listen && !recSession && recorder.supported && (
                  <button
                    onClick={() => void toggleRecord()}
                    className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed py-2.5 text-sm font-semibold"
                    style={{ borderColor: "var(--color-line)", color: "var(--color-ink-dim)" }}
                  >
                    <Mic size={14} /> No live voice here — record the answer instead
                  </button>
                )}
                {recSession && (
                  <button
                    onClick={() => void toggleRecord()}
                    className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold"
                    style={{ background: "var(--color-bad)", color: "#fbf3e7" }}
                  >
                    <Square size={12} fill="currentColor" /> Stop & transcribe
                  </button>
                )}
                {recBusy && (
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs" style={{ color: "var(--color-ink-dim)" }}>
                    <Loader2 size={12} className="animate-spin" /> Transcribing…
                  </p>
                )}
                {!voice.listen && !recorder.supported && (
                  <p className="mt-1.5 text-[11px]" style={{ color: "var(--color-ink-faint)" }}>
                    No mic in this browser — just type below, it works the same.
                  </p>
                )}
                {voiceMsg && (
                  <p className="mt-1.5 text-xs" style={{ color: "var(--color-ink-dim)" }}>{voiceMsg}</p>
                )}
              </div>
            )}

            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Event title"
              className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
              style={inputStyle()}
            />
            <div className="flex gap-2">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
                style={inputStyle()}
              />
            </div>
            <div className="flex gap-2">
              <input type="time" value={start} onChange={(e) => setStart(e.target.value)} className="w-1/2 rounded-xl border px-3 py-2.5 text-sm outline-none" style={inputStyle()} />
              <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="w-1/2 rounded-xl border px-3 py-2.5 text-sm outline-none" style={inputStyle()} />
            </div>
            {timesValid && !timeOrderOk && (
              <p className="text-xs font-medium" style={{ color: "var(--color-bad)" }}>
                End time must be after start time.
              </p>
            )}
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Location (optional)"
              className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
              style={inputStyle()}
            />
            <select value={area} onChange={(e) => setArea(e.target.value as LifeAreaKey)} className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none" style={inputStyle()}>
              {LIFE_AREAS.map((a) => (
                <option key={a.key} value={a.key}>{a.label}</option>
              ))}
            </select>

            <div className="flex gap-2 pt-1">
              <GhostButton className="text-xs" onClick={() => { setPhase("pick"); setPreviewUrl(null); }}>
                Retry
              </GhostButton>
              <button
                disabled={!valid}
                onClick={() => void confirm()}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-full py-3 text-sm font-semibold disabled:opacity-40"
                style={{ background: "var(--color-ember)", color: "#fbf3e7" }}
              >
                <Check size={14} /> Add to calendar
              </button>
            </div>
            {gcal.connected && (
              <label className="flex cursor-pointer items-center gap-2 text-xs" style={{ color: "var(--color-ink-dim)" }}>
                <input
                  type="checkbox"
                  checked={toGoogle}
                  onChange={(e) => setToGoogle(e.target.checked)}
                  className="accent-[var(--color-ember)]"
                />
                Also add to Google Calendar
              </label>
            )}
            {gError && (
              <div className="rounded-xl px-3 py-2 text-xs" style={{ background: "var(--color-ember-soft)", color: "var(--color-ember)" }}>
                <p>{gError}</p>
                <button onClick={() => onConfirm(date, buildBlock())} className="mt-1 font-semibold underline underline-offset-2">
                  Keep it local only →
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
