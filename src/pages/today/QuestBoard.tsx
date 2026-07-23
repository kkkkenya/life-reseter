import { useEffect, useRef, useState } from "react";
import { Check, RefreshCw, Swords, Loader2 } from "lucide-react";
import { Card } from "@/components/ui";
import { IconFor } from "@/components/IconFor";
import { useAppStore } from "@/store/useAppStore";
import { useFeedback } from "@/hooks/useFeedback";
import { generateDailyQuests, generateReplacementQuest } from "@/lib/quests";
import type { DailyQuest, QuestPillar } from "@/types";

function pillarFor(pillars: QuestPillar[], key: string): QuestPillar {
  return pillars.find((p) => p.key === key) ?? { key, label: key, description: "", color: "var(--color-ember)", icon: "Swords" };
}

function QuestCard({
  quest,
  pillar,
  rerollsLeftToday,
  rerollsLeftWeek,
  onComplete,
  onReroll,
}: {
  quest: DailyQuest;
  pillar: QuestPillar;
  rerollsLeftToday: number;
  rerollsLeftWeek: number;
  onComplete: (el: Element | null) => void;
  onReroll: () => Promise<void>;
}) {
  const [rerolling, setRerolling] = useState(false);
  const canReroll = quest.status === "pending" && rerollsLeftToday > 0 && rerollsLeftWeek > 0 && !rerolling;

  return (
    <Card className={quest.status === "done" ? "opacity-60" : ""}>
      <div className="flex items-start gap-3">
        <div
          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
          style={{ background: `color-mix(in srgb, ${pillar.color} 16%, transparent)` }}
        >
          <IconFor name={pillar.icon} size={16} color={pillar.color} fallback="Swords" />
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: pillar.color }}>
            {pillar.label} quest · +{quest.xpBonus} XP
          </p>
          <p
            className="mt-0.5 text-sm font-semibold"
            style={{ textDecoration: quest.status === "done" ? "line-through" : "none" }}
          >
            {quest.title}
          </p>
          <p className="mt-1 text-xs leading-relaxed" style={{ color: "var(--color-ink-dim)" }}>
            {quest.description}
          </p>
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <button
          disabled={!canReroll}
          onClick={async () => {
            setRerolling(true);
            try {
              await onReroll();
            } finally {
              setRerolling(false);
            }
          }}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold disabled:opacity-30"
          style={{ background: "var(--color-surface-raised)", color: "var(--color-ink-dim)" }}
        >
          {rerolling ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
          Reroll {quest.status === "pending" ? `(${rerollsLeftToday}/day, ${rerollsLeftWeek}/wk left)` : ""}
        </button>
        <button
          disabled={quest.status === "done"}
          onClick={(e) => onComplete(e.currentTarget)}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold disabled:opacity-70"
          style={{ background: quest.status === "done" ? "var(--color-good)" : pillar.color, color: "#fbf3e7" }}
        >
          <Check size={12} /> {quest.status === "done" ? "Completed" : "Complete"}
        </button>
      </div>
    </Card>
  );
}

export function QuestBoard({ dateKey, isToday }: { dateKey: string; isToday: boolean }) {
  const quests = useAppStore((s) => s.profile.quests[dateKey]);
  const incomeGoal = useAppStore((s) => s.profile.incomeGoal);
  const questPillars = useAppStore((s) => s.profile.questPillars);
  const coachTone = useAppStore((s) => s.profile.coachTone);
  const aboutMe = useAppStore((s) => s.profile.aboutMe);
  const pinnedFocusArea = useAppStore((s) => s.profile.pinnedFocusArea);
  const setQuestsForDay = useAppStore((s) => s.setQuestsForDay);
  const completeQuest = useAppStore((s) => s.completeQuest);
  const rerollQuest = useAppStore((s) => s.rerollQuest);
  const rerollsRemaining = useAppStore((s) => s.rerollsRemaining);
  const feedback = useFeedback();
  const [generating, setGenerating] = useState(false);
  const genRequested = useRef(false);

  useEffect(() => {
    genRequested.current = false;
  }, [dateKey]);

  useEffect(() => {
    if (!isToday) return; // only auto-generate for today; past/future days just show what exists
    if (quests && quests.length > 0) return;
    if (genRequested.current) return;
    genRequested.current = true;
    setGenerating(true);
    generateDailyQuests(dateKey, incomeGoal, questPillars, coachTone, aboutMe, pinnedFocusArea)
      .then((q) => setQuestsForDay(dateKey, q))
      .finally(() => setGenerating(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateKey, isToday, quests?.length]);

  if (!isToday && (!quests || quests.length === 0)) return null;

  const { thisWeek, today } = rerollsRemaining();

  return (
    <Card className="mt-4 border-2" style={{ borderColor: "var(--color-ember)" }}>
      <div className="flex items-center gap-1.5">
        <Swords size={14} color="var(--color-ember)" />
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-ember)" }}>
          Today's quests
        </p>
      </div>
      <p className="mt-1 text-[11px]" style={{ color: "var(--color-ink-faint)" }}>
        Toward {incomeGoal.min.toLocaleString()}–{incomeGoal.max.toLocaleString()} {incomeGoal.currency}/month by{" "}
        {new Date(incomeGoal.targetDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
      </p>

      <div className="mt-3 space-y-3">
        {generating && (!quests || quests.length === 0) && (
          <div className="flex items-center gap-2 py-3 text-xs" style={{ color: "var(--color-ink-dim)" }}>
            <Loader2 size={13} className="animate-spin" /> Cooking up today's quests...
          </div>
        )}
        {quests?.map((q) => (
          <QuestCard
            key={q.id}
            quest={q}
            pillar={pillarFor(questPillars, q.focus)}
            rerollsLeftToday={today}
            rerollsLeftWeek={thisWeek}
            onComplete={(el) => {
              completeQuest(dateKey, q.id);
              feedback.milestone(el);
            }}
            onReroll={async () => {
              const replacement = await generateReplacementQuest(dateKey, pillarFor(questPillars, q.focus), q.title, coachTone, aboutMe);
              const ok = rerollQuest(dateKey, q.id, replacement);
              if (ok) feedback.tap();
            }}
          />
        ))}
      </div>
    </Card>
  );
}
