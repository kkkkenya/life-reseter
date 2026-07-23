import { useEffect, useState } from "react";
import { BackButton } from "@/components/ui";
import { useAppStore } from "@/store/useAppStore";
import { verseOfTheDay } from "@/data/gospel";
import { askGemini, isGeminiConfigured } from "@/lib/gemini";
import { GospelCard } from "@/pages/today/GospelCard";
import Journal from "@/pages/life/Journal";

/**
 * Examen — the daily practice of pausing to reflect, named after the Ignatian
 * prayer of review. Groups the day's Gospel verse and the journal together,
 * since both are the same act: looking back at the day, not doing more of it.
 */
export default function Examen({ onBack }: { onBack?: () => void }) {
  const profile = useAppStore((s) => s.profile);
  const setDailyGospel = useAppStore((s) => s.setDailyGospel);
  const [reflecting, setReflecting] = useState(false);

  const todayIso = new Date().toISOString().slice(0, 10);
  const gospel = profile.dailyGospel[todayIso];
  const devotional = profile.devotional;

  useEffect(() => {
    if (!devotional.enabled) return;
    if (profile.dailyGospel[todayIso]) return;
    const verse = verseOfTheDay(new Date(), devotional.mode);
    setDailyGospel(todayIso, verse.ref, verse.text);
    if (isGeminiConfigured) {
      setReflecting(true);
      askGemini(`Verse: "${verse.text}" (${verse.ref})`, {
        systemInstruction:
          "You are a Catholic reflection companion. In 2 sentences, tie this Gospel verse to daily discipline and self-mastery. Reverent, plain language, no cliches.",
        temperature: 0.7,
        maxOutputTokens: 120,
      })
        .then((text) => setDailyGospel(todayIso, verse.ref, verse.text, text))
        .catch(() => {})
        .finally(() => setReflecting(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todayIso, devotional.enabled, devotional.mode]);

  return (
    <div className="mx-auto max-w-md px-5 pb-28 pt-14">
      <div className="flex items-center gap-3">
        {onBack && <BackButton onClick={onBack} />}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-ink-dim)" }}>
            The pause
          </p>
          <h1 className="font-display text-2xl font-semibold">Examen</h1>
        </div>
      </div>
      <p className="mt-1 text-sm" style={{ color: "var(--color-ink-dim)" }}>
        Look back before you look ahead.
      </p>

      {devotional.enabled && gospel && (
        <div className="mt-2">
          <GospelCard gospel={gospel} reflecting={reflecting} />
        </div>
      )}

      <div className="mt-6">
        <Journal />
      </div>
    </div>
  );
}
