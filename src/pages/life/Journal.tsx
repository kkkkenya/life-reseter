import { useEffect, useRef, useState } from "react";
import { Card, PrimaryButton, GhostButton } from "@/components/ui";
import { JournalMediaGrid } from "@/components/JournalMedia";
import { useAppStore } from "@/store/useAppStore";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { programDayFromDate, dateFromProgramDay, formatShortDate } from "@/lib/planGenerator";
import {
  MAX_AUDIO_PER_ENTRY,
  MAX_AUDIO_UPLOAD_BYTES,
  MAX_PHOTOS_PER_ENTRY,
  deleteMediaBlob,
  downscalePhoto,
  getMediaBlob,
  newMediaId,
  saveMediaBlob,
} from "@/lib/mediaStore";
import {
  collectJournalMedia,
  deleteRemoteMedia,
  downloadMediaBlob,
  uploadMediaBlob,
} from "@/lib/mediaSync";
import type { JournalMediaRef } from "@/types";
import { Camera, Check, ChevronDown, ImagePlus, Mic, Sparkles, Square } from "lucide-react";

function mediaSummary(media?: JournalMediaRef[]): string | null {
  if (!media || media.length === 0) return null;
  const photos = media.filter((m) => m.kind === "photo").length;
  const audios = media.filter((m) => m.kind === "audio").length;
  const bits: string[] = [];
  if (photos > 0) bits.push(`${photos} photo${photos === 1 ? "" : "s"}`);
  if (audios > 0) bits.push(`${audios} voice note${audios === 1 ? "" : "s"}`);
  return bits.join(" · ") || null;
}
import { askGemini, isGeminiConfigured } from "@/lib/gemini";
import { coachVoice } from "@/data/coachTones";

export default function Journal() {
  const profile = useAppStore((s) => s.profile);
  const saveJournalEntry = useAppStore((s) => s.saveJournalEntry);

  const todayDay = profile.startDate
    ? programDayFromDate(profile.startDate, new Date().toISOString().slice(0, 10))
    : 1;
  const existing = profile.journal[todayDay];

  const [morningEnergy, setMorningEnergy] = useState(existing?.morningEnergy ?? 3);
  const [gratitude, setGratitude] = useState(existing?.gratitude ?? "");
  const [morningSaved, setMorningSaved] = useState(false);

  const [wentWell, setWentWell] = useState(existing?.wentWell ?? "");
  const [couldImprove, setCouldImprove] = useState(existing?.couldImprove ?? "");
  const [tomorrowWin, setTomorrowWin] = useState(existing?.tomorrowWin ?? "");
  const [mood, setMood] = useState(existing?.mood ?? 6);
  const [saved, setSaved] = useState(false);
  const [media, setMedia] = useState<JournalMediaRef[]>(existing?.media ?? []);
  const [mediaError, setMediaError] = useState<string | null>(null);

  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const recorder = useAudioRecorder(300); // 5 min journal takes
  const [recSession, setRecSession] = useState<{ finish: () => Promise<{ base64: string; mimeType: string }> } | null>(null);
  const recStartedAt = useRef<number>(0);
  const [transcribingId, setTranscribingId] = useState<string | null>(null);

  const { userId } = useSupabaseAuth();
  const [mediaTick, setMediaTick] = useState(0);
  const uploadingRef = useRef<Set<string>>(new Set());

  // Cloud media sync (signed in only): push new local blobs up, pull down
  // anything this device is missing. Refs ride the normal profile sync, so
  // the other device already knows *what* to fetch.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      const markRemote = (day: number, id: string) => {
        const cur = useAppStore.getState().profile.journal[day];
        if (!cur) return;
        saveJournalEntry(day, {
          media: (cur.media ?? []).map((m) => (m.id === id ? { ...m, remote: true } : m)),
        });
        if (day === todayDay) {
          setMedia((prev) => prev.map((m) => (m.id === id ? { ...m, remote: true } : m)));
        }
      };
      for (const { day, ref } of collectJournalMedia(useAppStore.getState().profile)) {
        if (cancelled || ref.remote || uploadingRef.current.has(ref.id)) continue;
        uploadingRef.current.add(ref.id);
        try {
          await uploadMediaBlob(userId, ref);
          if (!cancelled) markRemote(day, ref.id);
        } catch {
          /* offline or gone — retry on next visit */
        } finally {
          uploadingRef.current.delete(ref.id);
        }
      }
      let fetchedAny = false;
      for (const { ref } of collectJournalMedia(useAppStore.getState().profile)) {
        if (cancelled) continue;
        try {
          const local = await getMediaBlob(ref.id);
          if (!local && ref.remote) {
            await downloadMediaBlob(userId, ref);
            fetchedAny = true;
          }
        } catch {
          /* offline — try later */
        }
      }
      if (fetchedAny && !cancelled) setMediaTick((t) => t + 1);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, media]);

  const [examenOpen, setExamenOpen] = useState(Boolean(existing?.examen));
  const [noticedGod, setNoticedGod] = useState(existing?.examen?.noticedGod ?? "");
  const [fellShort, setFellShort] = useState(existing?.examen?.fellShort ?? "");
  const [gratefulFor, setGratefulFor] = useState(existing?.examen?.gratefulFor ?? "");

  const [reflection, setReflection] = useState<string | null>(null);
  const [reflecting, setReflecting] = useState(false);
  const [reflectError, setReflectError] = useState<string | null>(null);

  function saveMorning() {
    saveJournalEntry(todayDay, { morningEnergy, gratitude });
    setMorningSaved(true);
    setTimeout(() => setMorningSaved(false), 1800);
  }

  function save() {
    saveJournalEntry(todayDay, {
      wentWell,
      couldImprove,
      tomorrowWin,
      mood,
      media,
      examen: examenOpen ? { noticedGod, fellShort, gratefulFor } : existing?.examen,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  }

  function persistMedia(next: JournalMediaRef[]) {
    setMedia(next);
    // Persist refs immediately so an attached photo/voice note survives even
    // if the user never taps Save entry. Blobs stay in IndexedDB regardless.
    saveJournalEntry(todayDay, { media: next });
  }

  async function handlePhoto(file: File | undefined) {
    if (!file) return;
    setMediaError(null);
    if (media.filter((m) => m.kind === "photo").length >= MAX_PHOTOS_PER_ENTRY) {
      setMediaError(`Up to ${MAX_PHOTOS_PER_ENTRY} photos per day — remove one first.`);
      return;
    }
    try {
      const blob = await downscalePhoto(file);
      const ref: JournalMediaRef = { id: newMediaId("photo"), kind: "photo", createdAt: new Date().toISOString() };
      await saveMediaBlob(ref.id, blob);
      persistMedia([...media, ref]);
    } catch (e) {
      setMediaError(e instanceof Error ? e.message : "Couldn't add that photo.");
    }
  }

  async function toggleRecord() {
    setMediaError(null);
    if (recSession) {
      const session = recSession;
      setRecSession(null);
      try {
        const { base64, mimeType } = await session.finish();
        const blob = new Blob([Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))], { type: mimeType });
        const ref: JournalMediaRef = {
          id: newMediaId("audio"),
          kind: "audio",
          createdAt: new Date().toISOString(),
          durationSec: Math.max(1, Math.round((Date.now() - recStartedAt.current) / 1000)),
        };
        await saveMediaBlob(ref.id, blob);
        persistMedia([...media, ref]);
      } catch (e) {
        setMediaError(e instanceof Error ? e.message : "Recording failed.");
      }
      return;
    }
    if (media.filter((m) => m.kind === "audio").length >= MAX_AUDIO_PER_ENTRY) {
      setMediaError(`Up to ${MAX_AUDIO_PER_ENTRY} voice notes per day — remove one first.`);
      return;
    }
    try {
      const session = await recorder.start();
      recStartedAt.current = Date.now();
      setRecSession(session);
    } catch (e) {
      setMediaError(e instanceof Error ? e.message : "Recording failed.");
    }
  }

  async function handleRemoveMedia(id: string) {
    if (!confirm("Remove this attachment?")) return;
    const wasRemote = media.find((m) => m.id === id)?.remote;
    persistMedia(media.filter((m) => m.id !== id));
    if (wasRemote && userId) void deleteRemoteMedia(userId, id);
    try {
      await deleteMediaBlob(id);
    } catch {
      /* ref already gone; blob cleanup is best-effort */
    }
  }

  async function handleTranscribe(ref: JournalMediaRef) {
    setMediaError(null);
    setTranscribingId(ref.id);
    try {
      const blob = await getMediaBlob(ref.id);
      if (!blob) throw new Error("Audio file is gone from this device.");
      if (blob.size > MAX_AUDIO_UPLOAD_BYTES) throw new Error("Too long to transcribe — keep it under a few minutes.");
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const parts = typeof reader.result === "string" ? reader.result.split(",") : [];
          if (parts[1]) resolve(parts[1]);
          else reject(new Error("Couldn't read that recording."));
        };
        reader.onerror = () => reject(new Error("Couldn't read that recording."));
        reader.readAsDataURL(blob);
      });
      const res = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audioBase64: base64, mimeType: blob.type || "audio/webm" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Transcription failed.");
      const text: string = data?.transcript ?? "";
      if (!text.trim()) throw new Error("Didn't catch anything transcribable.");
      setWentWell((w) => (w.trim() ? `${w.trim()}\n\nVoice note: ${text.trim()}` : `Voice note: ${text.trim()}`));
    } catch (e) {
      setMediaError(e instanceof Error ? e.message : "Transcription failed.");
    } finally {
      setTranscribingId(null);
    }
  }

  async function reflectOnEntry() {
    setReflecting(true);
    setReflectError(null);
    try {
      const who = profile.displayName.trim() ? `${profile.displayName.trim().split(/\s+/)[0]}'s` : "my";
      const prompt = `Here's ${who} reflection for today:\nWent well: ${wentWell || "(nothing noted)"}\nCould improve: ${couldImprove || "(nothing noted)"}\nTomorrow's win: ${tomorrowWin || "(nothing noted)"}\nMood: ${mood}/10`;
      const text = await askGemini(prompt, {
        systemInstruction: `${coachVoice(profile.coachTone)} Respond in 2-4 sentences to this journal entry like a best friend who wants them to become their best self — warm, in their corner, but unwilling to let them slide. Don't just validate — if something in the entry deserves a pointed follow-up question or a push, give it.`,
        temperature: 0.7,
        maxOutputTokens: 200,
      });
      setReflection(text);
    } catch (e) {
      setReflectError(e instanceof Error ? e.message : "Reflection failed.");
    } finally {
      setReflecting(false);
    }
  }

  const pastEntries = Object.values(profile.journal)
    .filter((e) => e.day !== todayDay)
    .sort((a, b) => b.day - a.day);

  return (
    <div>
      <Card>
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-ink-dim)" }}>
          Morning check-in
        </p>
        <div className="mt-3">
          <p className="mb-1.5 text-sm font-medium">Energy right now</p>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={1}
              max={5}
              value={morningEnergy}
              onChange={(e) => setMorningEnergy(Number(e.target.value))}
              className="flex-1 accent-[var(--color-ember)]"
            />
            <span className="font-mono text-lg font-bold" style={{ color: "var(--color-ember)" }}>
              {morningEnergy}
            </span>
          </div>
        </div>
        <div className="mt-3">
          <p className="mb-1.5 text-sm font-medium">One thing you're grateful for</p>
          <input
            value={gratitude}
            onChange={(e) => setGratitude(e.target.value)}
            placeholder="Ten seconds, that's it..."
            className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
            style={{ borderColor: "var(--color-line)", background: "var(--color-surface-raised)", color: "var(--color-ink)" }}
          />
        </div>
        <div className="mt-3">
          <PrimaryButton onClick={saveMorning}>
            {morningSaved ? (
              <span className="flex items-center justify-center gap-1.5">
                <Check size={15} /> Saved
              </span>
            ) : (
              "Save check-in"
            )}
          </PrimaryButton>
        </div>
      </Card>

      <p className="mt-6 mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-ink-dim)" }}>
        Evening reflection
      </p>
      <Card>
        <div className="space-y-4">
          <div>
            <p className="mb-1.5 text-sm font-medium">What's one thing you did well today?</p>
            <textarea
              value={wentWell}
              onChange={(e) => setWentWell(e.target.value)}
              className="h-20 w-full rounded-xl border p-3 text-sm outline-none"
              style={{ borderColor: "var(--color-line)", background: "var(--color-surface-raised)", color: "var(--color-ink)" }}
            />
          </div>
          <div>
            <p className="mb-1.5 text-sm font-medium">What could you have done better?</p>
            <textarea
              value={couldImprove}
              onChange={(e) => setCouldImprove(e.target.value)}
              className="h-20 w-full rounded-xl border p-3 text-sm outline-none"
              style={{ borderColor: "var(--color-line)", background: "var(--color-surface-raised)", color: "var(--color-ink)" }}
            />
          </div>
          <div>
            <p className="mb-1.5 text-sm font-medium">What ONE thing makes tomorrow a win?</p>
            <textarea
              value={tomorrowWin}
              onChange={(e) => setTomorrowWin(e.target.value)}
              className="h-20 w-full rounded-xl border p-3 text-sm outline-none"
              style={{ borderColor: "var(--color-line)", background: "var(--color-surface-raised)", color: "var(--color-ink)" }}
            />
          </div>
          <div>
            <p className="mb-1.5 text-sm font-medium">How did you feel overall? (1-10)</p>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={1}
                max={10}
                value={mood}
                onChange={(e) => setMood(Number(e.target.value))}
                className="flex-1 accent-[var(--color-ember)]"
              />
              <span className="font-mono text-lg font-bold" style={{ color: "var(--color-ember)" }}>
                {mood}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-5">
          <p className="mb-1.5 text-sm font-medium">Pages & voice notes</p>
          <p className="mb-2 text-xs" style={{ color: "var(--color-ink-dim)" }}>
            Snap handwritten pages or talk it out instead of typing.{" "}
            {userId
              ? media.some((m) => !m.remote)
                ? "Backing up to your private cloud…"
                : "Backed up to your private cloud — follows you across devices."
              : "Stays on this device until you sign in."}
          </p>
          <JournalMediaGrid
            media={media}
            refreshKey={mediaTick}
            transcribingId={transcribingId}
            onRemove={handleRemoveMedia}
            onTranscribe={handleTranscribe}
          />
          <div className={(media.length > 0 ? "mt-2.5 " : "") + "flex gap-2"}>
            <button
              onClick={() => galleryRef.current?.click()}
              className="tactile flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-dashed py-2.5 text-xs font-semibold"
              style={{ borderColor: "var(--color-line)", color: "var(--color-ink-dim)" }}
            >
              <ImagePlus size={14} /> Add photo
            </button>
            <button
              onClick={() => cameraRef.current?.click()}
              aria-label="Take a photo"
              className="tactile flex h-auto w-11 items-center justify-center rounded-xl border border-dashed"
              style={{ borderColor: "var(--color-line)", color: "var(--color-ink-dim)" }}
            >
              <Camera size={15} />
            </button>
            <button
              onClick={() => void toggleRecord()}
              className="tactile flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-semibold"
              style={
                recSession
                  ? { background: "var(--color-bad)", color: "#fbf3e7" }
                  : { background: "var(--color-ember-soft)", color: "var(--color-ember)" }
              }
            >
              {recSession ? <Square size={12} fill="currentColor" /> : <Mic size={14} />}
              {recSession ? "Stop" : recorder.recording ? "…" : "Voice note"}
            </button>
          </div>
          <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={(e) => { void handlePhoto(e.target.files?.[0]); e.target.value = ""; }} />
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { void handlePhoto(e.target.files?.[0]); e.target.value = ""; }} />
          {mediaError && (
            <p className="mt-1.5 text-xs" style={{ color: "var(--color-bad)" }}>{mediaError}</p>
          )}
        </div>

        <button
          onClick={() => setExamenOpen((o) => !o)}
          className="mt-4 flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left text-sm"
          style={{ borderColor: "var(--color-line)", color: "var(--color-ink-dim)" }}
        >
          Evening examen (optional)
          <ChevronDown size={15} style={{ transform: examenOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
        </button>
        {examenOpen && (
          <div className="mt-3 space-y-3">
            <div>
              <p className="mb-1.5 text-sm font-medium">Where did you notice God today?</p>
              <textarea
                value={noticedGod}
                onChange={(e) => setNoticedGod(e.target.value)}
                className="h-16 w-full rounded-xl border p-3 text-sm outline-none"
                style={{ borderColor: "var(--color-line)", background: "var(--color-surface-raised)", color: "var(--color-ink)" }}
              />
            </div>
            <div>
              <p className="mb-1.5 text-sm font-medium">Where did you fall short?</p>
              <textarea
                value={fellShort}
                onChange={(e) => setFellShort(e.target.value)}
                className="h-16 w-full rounded-xl border p-3 text-sm outline-none"
                style={{ borderColor: "var(--color-line)", background: "var(--color-surface-raised)", color: "var(--color-ink)" }}
              />
            </div>
            <div>
              <p className="mb-1.5 text-sm font-medium">What are you grateful for?</p>
              <textarea
                value={gratefulFor}
                onChange={(e) => setGratefulFor(e.target.value)}
                className="h-16 w-full rounded-xl border p-3 text-sm outline-none"
                style={{ borderColor: "var(--color-line)", background: "var(--color-surface-raised)", color: "var(--color-ink)" }}
              />
            </div>
          </div>
        )}

        <div className="mt-5">
          <PrimaryButton onClick={save}>
            {saved ? (
              <span className="flex items-center justify-center gap-1.5">
                <Check size={15} /> Saved
              </span>
            ) : existing ? (
              "Update entry"
            ) : (
              "Save entry"
            )}
          </PrimaryButton>
        </div>

        {isGeminiConfigured && (
          <div className="mt-2">
            <GhostButton onClick={reflectOnEntry} disabled={reflecting}>
              <span className="flex items-center justify-center gap-1.5">
                <Sparkles size={14} /> {reflecting ? "Thinking..." : "Reflect on this"}
              </span>
            </GhostButton>
          </div>
        )}
        {reflectError && (
          <p className="mt-2 text-xs" style={{ color: "var(--color-bad)" }}>{reflectError}</p>
        )}
        {reflection && (
          <div className="mt-3 rounded-xl p-3" style={{ background: "var(--color-ember-soft)" }}>
            <p className="text-sm leading-relaxed" style={{ color: "var(--color-ink)" }}>{reflection}</p>
          </div>
        )}
      </Card>

      {pastEntries.length > 0 && (
        <>
          <p className="mt-6 mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-ink-dim)" }}>
            Past entries
          </p>
          <div className="space-y-2">
            {pastEntries.map((e) => (
              <Card key={e.day}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold" style={{ color: "var(--color-ink-dim)" }}>
                      Day {e.day}
                    </p>
                    <p className="text-[10px]" style={{ color: "var(--color-ink-faint)" }}>
                      {formatShortDate(profile.days[e.day]?.date ?? dateFromProgramDay(profile.startDate ?? "", e.day))}
                    </p>
                  </div>
                  <span className="font-mono text-xs" style={{ color: "var(--color-ember)" }}>
                    mood {e.mood}/10
                  </span>
                </div>
                {e.wentWell && (
                  <p className="mt-2 text-sm" style={{ color: "var(--color-ink)" }}>
                    {e.wentWell}
                  </p>
                )}
                {mediaSummary(e.media) && (
                  <p className="mt-1.5 text-xs" style={{ color: "var(--color-ink-dim)" }}>
                    {mediaSummary(e.media)}
                  </p>
                )}
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
