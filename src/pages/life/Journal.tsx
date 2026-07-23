import { useState } from "react";
import { Card, PrimaryButton, GhostButton } from "@/components/ui";
import { useAppStore } from "@/store/useAppStore";
import { programDayFromDate, dateFromProgramDay, formatShortDate } from "@/lib/planGenerator";
import { Check, ChevronDown, Sparkles } from "lucide-react";
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
      examen: examenOpen ? { noticedGod, fellShort, gratefulFor } : existing?.examen,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  }

  async function reflectOnEntry() {
    setReflecting(true);
    setReflectError(null);
    try {
      const prompt = `Here's my reflection for today:\nWent well: ${wentWell || "(nothing noted)"}\nCould improve: ${couldImprove || "(nothing noted)"}\nTomorrow's win: ${tomorrowWin || "(nothing noted)"}\nMood: ${mood}/10`;
      const text = await askGemini(prompt, {
        systemInstruction: `${coachVoice(profile.coachTone)} Respond in 2-4 sentences to this journal entry. Don't just validate — if something in the entry deserves a pointed follow-up question or a push, give it.`,
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
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
