import { useState } from "react";
import { Check } from "lucide-react";
import { Card, GhostButton, PrimaryButton, TopProgress } from "@/components/ui";
import { useAppStore } from "@/store/useAppStore";
import { checkInInsights, obstacleLabel } from "@/lib/onboarding";
import { OBSTACLE_OPTIONS } from "@/lib/onboarding";
import { isoWeekKey } from "@/lib/isoWeek";
import type { CheckInRecord } from "@/types";

const CHECK_STEPS = ["score", "wins", "miss", "obstacle", "tweak", "focus", "done"] as const;

function trendSentence(count: number, trend: "up" | "flat" | "down" | "early", avg: number): string {
  if (count < 2) return "One check-in down. Give me a few weeks and I'll start connecting the dots.";
  if (trend === "up") return `Climbing — averaging ${avg}/10 and trending up. Whatever changed, protect it.`;
  if (trend === "down") return `Slipping — averaging ${avg}/10 and trending down. Not a verdict, a signal. Let's adjust one thing.`;
  return `Steady at ${avg}/10. Consistency is the whole game — now let's raise the ceiling.`;
}

/** Weekly check-in — same conversational voice as onboarding. Reviews the
 *  closing week, sets next week's focus, and compounds into self-knowledge. */
export default function CheckIn() {
  const profile = useAppStore((s) => s.profile);
  const saveCheckIn = useAppStore((s) => s.saveCheckIn);
  const setWeeklyFocus = useAppStore((s) => s.setWeeklyFocus);

  const weekKey = isoWeekKey();
  const nextWeekKey = isoWeekKey(new Date(Date.now() + 7 * 86400000));
  const existing = profile.checkins[weekKey];

  const [stepIdx, setStepIdx] = useState(0);
  const [score, setScore] = useState(6);
  const [wins, setWins] = useState("");
  const [miss, setMiss] = useState("");
  const [obstacleHit, setObstacleHit] = useState("none");
  const [tweak, setTweak] = useState("");
  const [focusNext, setFocusNext] = useState("");
  const [redoing, setRedoing] = useState(false);

  const records: CheckInRecord[] = Object.values(profile.checkins).sort((a, b) =>
    b.weekKey.localeCompare(a.weekKey)
  );
  const insights = checkInInsights(records);

  function save() {
    saveCheckIn({ weekKey, score, wins: wins.trim(), miss: miss.trim(), obstacleHit, tweak: tweak.trim(), focusNext: focusNext.trim() });
    if (focusNext.trim()) setWeeklyFocus(nextWeekKey, focusNext.trim());
    setStepIdx(CHECK_STEPS.indexOf("done"));
  }

  if (existing && !redoing) {
    return (
      <div>
        <Card spineColor="var(--color-good)">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-good)" }}>
            This week, checked in
          </p>
          <p className="mt-1 font-mono text-3xl font-bold">
            {existing.score}
            <span className="text-sm font-medium" style={{ color: "var(--color-ink-dim)" }}>/10</span>
          </p>
          {existing.wins && <p className="mt-2 text-sm">Win: {existing.wins}</p>}
          {existing.tweak && (
            <p className="mt-1 text-sm" style={{ color: "var(--color-ink-dim)" }}>
              One tweak: {existing.tweak}
            </p>
          )}
          <div className="mt-3">
            <GhostButton onClick={() => setRedoing(true)}>Redo this week's check-in</GhostButton>
          </div>
        </Card>

        <Card className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-ember)" }}>
            What I'm learning about you
          </p>
          <p className="mt-1.5 text-sm leading-relaxed">
            {trendSentence(insights.count, insights.trend, insights.avgScore)}{" "}
            {insights.topObstacle
              ? `Recurring villain: ${obstacleLabel(insights.topObstacle).toLowerCase()}.`
              : insights.count >= 2
                ? "No recurring villain lately — clean."
                : ""}
          </p>
          <p className="mt-1 text-xs" style={{ color: "var(--color-ink-faint)" }}>
            {insights.count} check-in{insights.count === 1 ? "" : "s"} on record
          </p>
        </Card>

        {records.length > 1 && (
          <>
            <p className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-ink-dim)" }}>
              Past weeks
            </p>
            <div className="space-y-2">
              {records
                .filter((r) => r.weekKey !== weekKey)
                .slice(0, 8)
                .map((r) => (
                  <Card key={r.weekKey} className="py-3">
                    <div className="flex items-center justify-between">
                      <p className="font-mono text-xs font-semibold">{r.weekKey}</p>
                      <span className="font-mono text-sm font-bold" style={{ color: "var(--color-ember)" }}>
                        {r.score}/10
                      </span>
                    </div>
                    {r.tweak && (
                      <p className="mt-1 text-xs" style={{ color: "var(--color-ink-dim)" }}>
                        Tweak was: {r.tweak}
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

  const step = CHECK_STEPS[stepIdx];

  return (
    <div>
      <TopProgress value={((stepIdx + 1) / CHECK_STEPS.length) * 100} />
      <p className="mt-3 text-xs" style={{ color: "var(--color-ink-faint)" }}>
        Week {weekKey} · honest and quick
      </p>

      <div className="mt-3">
        {step === "score" && (
          <div>
            <h2 className="font-display text-xl font-semibold">How was your week, really?</h2>
            <div className="mt-5 flex items-center gap-3">
              <input type="range" min={1} max={10} value={score} onChange={(e) => setScore(Number(e.target.value))} className="flex-1 accent-[var(--color-ember)]" />
              <span className="font-mono text-lg font-bold" style={{ color: "var(--color-ember)" }}>{score}</span>
            </div>
            <div className="mt-5">
              <PrimaryButton onClick={() => setStepIdx(1)}>Continue</PrimaryButton>
            </div>
          </div>
        )}

        {step === "wins" && (
          <div>
            <h2 className="font-display text-xl font-semibold">What are you proud of?</h2>
            <p className="mt-1 text-sm" style={{ color: "var(--color-ink-dim)" }}>Big or tiny. Claim it.</p>
            <textarea value={wins} onChange={(e) => setWins(e.target.value)} rows={4} maxLength={500} placeholder="e.g. Shipped the client fix, ran twice…" className="mt-4 w-full resize-none rounded-2xl border p-4 text-sm outline-none" style={{ borderColor: "var(--color-line)", background: "var(--color-surface)", color: "var(--color-ink)" }} />
            <div className="mt-4 space-y-2">
              <PrimaryButton onClick={() => setStepIdx(2)}>Continue</PrimaryButton>
              <GhostButton onClick={() => setStepIdx(2)}>Skip</GhostButton>
            </div>
          </div>
        )}

        {step === "miss" && (
          <div>
            <h2 className="font-display text-xl font-semibold">Where did you drop it?</h2>
            <p className="mt-1 text-sm" style={{ color: "var(--color-ink-dim)" }}>No judgment. Data, not shame.</p>
            <textarea value={miss} onChange={(e) => setMiss(e.target.value)} rows={4} maxLength={500} placeholder="e.g. Skipped gym all week, phone till 1am…" className="mt-4 w-full resize-none rounded-2xl border p-4 text-sm outline-none" style={{ borderColor: "var(--color-line)", background: "var(--color-surface)", color: "var(--color-ink)" }} />
            <div className="mt-4 space-y-2">
              <PrimaryButton onClick={() => setStepIdx(3)}>Continue</PrimaryButton>
              <GhostButton onClick={() => setStepIdx(3)}>Skip</GhostButton>
            </div>
          </div>
        )}

        {step === "obstacle" && (
          <div>
            <h2 className="font-display text-xl font-semibold">Which villain showed up most?</h2>
            <div className="mt-4 space-y-2.5">
              <button
                onClick={() => setObstacleHit("none")}
                className="tactile flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left"
                style={{ borderColor: obstacleHit === "none" ? "var(--color-ember)" : "var(--color-line)", background: obstacleHit === "none" ? "var(--color-ember-soft)" : "var(--color-surface)" }}
              >
                <span className="text-sm font-semibold">None — clean week</span>
                {obstacleHit === "none" && <Check size={15} color="var(--color-ember)" />}
              </button>
              {OBSTACLE_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  onClick={() => setObstacleHit(o.value)}
                  className="tactile flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left"
                  style={{ borderColor: obstacleHit === o.value ? "var(--color-ember)" : "var(--color-line)", background: obstacleHit === o.value ? "var(--color-ember-soft)" : "var(--color-surface)" }}
                >
                  <span>
                    <span className="block text-sm font-semibold">{o.label}</span>
                    <span className="block text-xs" style={{ color: "var(--color-ink-dim)" }}>{o.blurb}</span>
                  </span>
                  {obstacleHit === o.value && <Check size={15} color="var(--color-ember)" />}
                </button>
              ))}
            </div>
            <div className="mt-4">
              <PrimaryButton onClick={() => setStepIdx(4)}>Continue</PrimaryButton>
            </div>
          </div>
        )}

        {step === "tweak" && (
          <div>
            <h2 className="font-display text-xl font-semibold">One tweak for next week?</h2>
            <p className="mt-1 text-sm" style={{ color: "var(--color-ink-dim)" }}>Not five. One.</p>
            <textarea value={tweak} onChange={(e) => setTweak(e.target.value)} rows={3} maxLength={280} placeholder="e.g. Phone charges in the kitchen overnight…" className="mt-4 w-full resize-none rounded-2xl border p-4 text-sm outline-none" style={{ borderColor: "var(--color-line)", background: "var(--color-surface)", color: "var(--color-ink)" }} />
            <div className="mt-4 space-y-2">
              <PrimaryButton onClick={() => setStepIdx(5)}>Continue</PrimaryButton>
              <GhostButton onClick={() => setStepIdx(5)}>Skip</GhostButton>
            </div>
          </div>
        )}

        {step === "focus" && (
          <div>
            <h2 className="font-display text-xl font-semibold">Next week in one sentence?</h2>
            <p className="mt-1 text-sm" style={{ color: "var(--color-ink-dim)" }}>This becomes next week's focus banner.</p>
            <input value={focusNext} onChange={(e) => setFocusNext(e.target.value)} maxLength={140} placeholder="e.g. Ship the billing fix and run 3x…" className="mt-4 w-full rounded-2xl border p-4 text-sm outline-none" style={{ borderColor: "var(--color-line)", background: "var(--color-surface)", color: "var(--color-ink)" }} />
            <div className="mt-4 space-y-2">
              <PrimaryButton onClick={save}>Finish check-in</PrimaryButton>
              <GhostButton onClick={save}>Skip & finish</GhostButton>
            </div>
          </div>
        )}

        {step === "done" && (
          <Card>
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-good)" }}>
              Checked in
            </p>
            <h2 className="font-display mt-1 text-xl font-semibold">Proud of you for looking honestly.</h2>
            <p className="mt-1 text-sm" style={{ color: "var(--color-ink-dim)" }}>
              {score}/10 this week{focusNext.trim() ? ` — next week: ${focusNext.trim()}` : ""}. See you Sunday.
            </p>
            <div className="mt-4">
              <GhostButton onClick={() => { setRedoing(false); setStepIdx(0); }}>Back to overview</GhostButton>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
