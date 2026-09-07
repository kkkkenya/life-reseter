import { useEffect, useMemo, useState } from "react";
import { BackButton, Card, GhostButton, PrimaryButton, TopProgress } from "@/components/ui";
import { useAppStore } from "@/store/useAppStore";
import { programDayFromDate } from "@/lib/planGenerator";
import { verseOfTheDay } from "@/data/gospel";
import { askGemini, isGeminiConfigured } from "@/lib/gemini";
import { examenStreak } from "@/lib/examen";
import { GospelCard } from "@/pages/today/GospelCard";
import type { JournalEntry } from "@/types";

const STEPS = ["arrive", "gratitude", "review", "sorrow", "tomorrow", "rest"] as const;

/**
 * Examen — guided Ignatian review, one step per screen. Writes into the same
 * journal entry the Journal tab edits, so nothing is ever duplicated or lost.
 */
export default function Examen({ onBack }: { onBack?: () => void }) {
  const profile = useAppStore((s) => s.profile);
  const setDailyGospel = useAppStore((s) => s.setDailyGospel);
  const saveJournalEntry = useAppStore((s) => s.saveJournalEntry);
  const [reflecting, setReflecting] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const step = STEPS[stepIdx];

  const todayIso = new Date().toISOString().slice(0, 10);
  const todayDay = profile.startDate ? programDayFromDate(profile.startDate, todayIso) : 1;
  const existing = profile.journal[todayDay];
  const gospel = profile.dailyGospel[todayIso];
  const devotional = profile.devotional;
  const firstName = profile.displayName.trim().split(/\s+/)[0] || "";
  const streak = useMemo(() => examenStreak(profile.journal, todayDay), [profile.journal, todayDay]);

  const [gratefulFor, setGratefulFor] = useState(existing?.examen?.gratefulFor ?? "");
  const [wentWell, setWentWell] = useState(existing?.wentWell ?? "");
  const [couldImprove, setCouldImprove] = useState(existing?.couldImprove ?? "");
  const [fellShort, setFellShort] = useState(existing?.examen?.fellShort ?? "");
  const [tomorrowWin, setTomorrowWin] = useState(existing?.tomorrowWin ?? "");
  const [noticedGod, setNoticedGod] = useState(existing?.examen?.noticedGod ?? "");

  useEffect(() => {
    if (!devotional.enabled) return;
    if (profile.dailyGospel[todayIso]) return;
    const verse = verseOfTheDay(new Date(), devotional.mode);
    setDailyGospel(todayIso, verse.ref, verse.text);
    if (isGeminiConfigured) {
      setReflecting(true);
      askGemini(`Verse: "${verse.text}" (${verse.ref})`, {
        systemInstruction:
          `You are a Catholic reflection companion writing for ${firstName || "a friend"} working on becoming their best self. ` +
          "In 2 sentences, tie this Gospel verse to daily discipline and self-mastery. Warm and direct, like a best friend who refuses to let them settle. Reverent, plain language, no cliches.",
        temperature: 0.7,
        maxOutputTokens: 120,
      })
        .then((text) => setDailyGospel(todayIso, verse.ref, verse.text, text))
        .catch(() => {})
        .finally(() => setReflecting(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todayIso, devotional.enabled, devotional.mode]);

  function saveExamen(patch: Partial<NonNullable<JournalEntry["examen"]>>) {
    saveJournalEntry(todayDay, { examen: { noticedGod, fellShort, gratefulFor, ...existing?.examen, ...patch } });
  }

  function saveReview() {
    saveJournalEntry(todayDay, { wentWell, couldImprove });
  }

  function saveTomorrow() {
    saveJournalEntry(todayDay, { tomorrowWin });
    saveExamen({ noticedGod });
  }

  const next = () => setStepIdx((i) => Math.min(i + 1, STEPS.length - 1));

  const recentEvenings = useMemo(
    () =>
      Object.values(profile.journal)
        .filter((e) => e.day < todayDay && e.wentWell.trim())
        .sort((a, b) => b.day - a.day)
        .slice(0, 3),
    [profile.journal, todayDay]
  );

  function area(
    label: string,
    value: string,
    onChange: (v: string) => void,
    placeholder: string,
    rows = 4
  ) {
    return (
      <div>
        <p className="mb-1.5 text-sm font-medium">{label}</p>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          maxLength={800}
          className="w-full resize-none rounded-2xl border p-4 text-sm outline-none"
          style={{ borderColor: "var(--color-line)", background: "var(--color-surface)", color: "var(--color-ink)" }}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-5 pb-28 pt-14">
      <div className="flex items-center gap-3">
        {onBack && <BackButton onClick={onBack} />}
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-ink-dim)" }}>
            The pause · {streak} evening{streak === 1 ? "" : "s"} in a row
          </p>
          <h1 className="font-display text-2xl font-semibold">Examen</h1>
        </div>
      </div>

      <div className="mt-4">
        <TopProgress value={((stepIdx + 1) / STEPS.length) * 100} />
        <p className="mt-2 text-xs" style={{ color: "var(--color-ink-faint)" }}>
          Step {stepIdx + 1} of {STEPS.length} · {firstName ? `${firstName}, take` : "Take"} it slow
        </p>
      </div>

      <div className="mt-4">
        {step === "arrive" && (
          <div>
            <h2 className="font-display text-xl font-semibold">Arrive.</h2>
            <p className="mt-1 text-sm" style={{ color: "var(--color-ink-dim)" }}>
              One slow breath. The day is done being lived — now it gets to teach you.
            </p>
            {devotional.enabled && gospel && (
              <div className="mt-3">
                <GospelCard gospel={gospel} reflecting={reflecting} />
              </div>
            )}
            <div className="mt-5">
              <PrimaryButton onClick={next}>Begin the review</PrimaryButton>
            </div>
          </div>
        )}

        {step === "gratitude" && (
          <div>
            <h2 className="font-display text-xl font-semibold">What are you grateful for?</h2>
            <p className="mt-1 text-sm" style={{ color: "var(--color-ink-dim)" }}>Name one gift from today. Specific beats grand.</p>
            <div className="mt-4">
              {area("Gratitude", gratefulFor, setGratefulFor, "e.g. My roommate saved me food after labs…")}
            </div>
            <div className="mt-4 space-y-2">
              <PrimaryButton onClick={() => { saveExamen({ gratefulFor }); next(); }}>Continue</PrimaryButton>
              <GhostButton onClick={next}>Skip</GhostButton>
            </div>
          </div>
        )}

        {step === "review" && (
          <div>
            <h2 className="font-display text-xl font-semibold">Replay the day.</h2>
            <p className="mt-1 text-sm" style={{ color: "var(--color-ink-dim)" }}>Walk it hour by hour in your head first — then write.</p>
            <div className="mt-4 space-y-4">
              {area("What did you do well?", wentWell, setWentWell, "e.g. Deep work before lunch, called mum…")}
              {area("What could have gone better?", couldImprove, setCouldImprove, "e.g. Phone in bed till 1am…")}
            </div>
            <div className="mt-4 space-y-2">
              <PrimaryButton onClick={() => { saveReview(); next(); }}>Continue</PrimaryButton>
              <GhostButton onClick={next}>Skip</GhostButton>
            </div>
          </div>
        )}

        {step === "sorrow" && (
          <div>
            <h2 className="font-display text-xl font-semibold">Where did you fall short?</h2>
            <p className="mt-1 text-sm" style={{ color: "var(--color-ink-dim)" }}>Honest, not harsh. Name it, don't flog yourself with it.</p>
            <div className="mt-4">
              {area("Fell short", fellShort, setFellShort, "e.g. Snapped at my deskmate over nothing…")}
            </div>
            <div className="mt-4 space-y-2">
              <PrimaryButton onClick={() => { saveExamen({ fellShort }); next(); }}>Continue</PrimaryButton>
              <GhostButton onClick={next}>Skip</GhostButton>
            </div>
          </div>
        )}

        {step === "tomorrow" && (
          <div>
            <h2 className="font-display text-xl font-semibold">Hand tomorrow its assignment.</h2>
            <p className="mt-1 text-sm" style={{ color: "var(--color-ink-dim)" }}>One win, and where you noticed God today.</p>
            <div className="mt-4 space-y-4">
              {area("Tomorrow's one win", tomorrowWin, setTomorrowWin, "e.g. Submit the lab report by noon…", 3)}
              {area("Where did you notice God today?", noticedGod, setNoticedGod, "e.g. In the quiet after evening rain…", 3)}
            </div>
            <div className="mt-4 space-y-2">
              <PrimaryButton onClick={() => { saveTomorrow(); next(); }}>Finish</PrimaryButton>
              <GhostButton onClick={next}>Skip</GhostButton>
            </div>
          </div>
        )}

        {step === "rest" && (
          <Card>
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-good)" }}>
              Examen complete
            </p>
            <h2 className="font-display mt-1 text-xl font-semibold">Rest now{firstName ? `, ${firstName}` : ""}.</h2>
            <p className="mt-1 text-sm" style={{ color: "var(--color-ink-dim)" }}>
              {streak} evening{streak === 1 ? "" : "s"} of looking back honestly.
              Tomorrow gets a cleaner you.
            </p>
            <div className="mt-4">
              <GhostButton onClick={() => setStepIdx(0)}>Walk it again</GhostButton>
            </div>
          </Card>
        )}
      </div>

      {recentEvenings.length > 0 && (
        <>
          <p className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-ink-dim)" }}>
            Recent evenings
          </p>
          <div className="space-y-2">
            {recentEvenings.map((e) => (
              <Card key={e.day} className="py-3">
                <p className="font-mono text-[11px]" style={{ color: "var(--color-ink-faint)" }}>Day {e.day}</p>
                <p className="mt-1 text-sm">{e.wentWell}</p>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
