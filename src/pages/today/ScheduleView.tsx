import { useState } from "react";
import { X as XIcon, Check, ArrowDownToLine, Wand2 } from "lucide-react";
import { Card, GhostButton } from "@/components/ui";
import { LIFE_AREAS } from "@/data/lifeAreas";
import { suggestAutoSchedule, type SchedulableTask } from "@/lib/autoSchedule";
import type { LifeAreaKey, TimeBlock } from "@/types";

export interface RolloverCandidate {
  fromDate: string;
  block: TimeBlock;
}

export function ScheduleView({
  blocks,
  rolloverCandidates,
  autoScheduleCandidates,
  onAddBlock,
  onRemoveBlock,
  onToggleDone,
  onCarryOver,
  onAutoSchedule,
}: {
  blocks: TimeBlock[];
  rolloverCandidates: RolloverCandidate[];
  autoScheduleCandidates: SchedulableTask[];
  onAddBlock: (block: Omit<TimeBlock, "id">) => void;
  onRemoveBlock: (id: string) => void;
  onToggleDone: (id: string) => void;
  onCarryOver: (fromDate: string, id: string) => void;
  onAutoSchedule: (suggestions: ReturnType<typeof suggestAutoSchedule>) => void;
}) {
  const [blockForm, setBlockForm] = useState(false);
  const [blockStart, setBlockStart] = useState("09:00");
  const [blockEnd, setBlockEnd] = useState("10:00");
  const [blockLabel, setBlockLabel] = useState("");
  const [blockArea, setBlockArea] = useState<LifeAreaKey>("productivity");

  function runAutoSchedule() {
    const suggestions = suggestAutoSchedule(autoScheduleCandidates, blocks);
    onAutoSchedule(suggestions);
  }

  return (
    <div className="space-y-3">
      {rolloverCandidates.length > 0 && (
        <Card className="border-dashed">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-ember)" }}>
            Didn't finish yesterday
          </p>
          <div className="mt-2 space-y-2">
            {rolloverCandidates.map(({ fromDate, block }) => (
              <div key={block.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm">{block.label}</p>
                  <p className="font-mono text-[11px]" style={{ color: "var(--color-ink-dim)" }}>
                    {block.startTime}–{block.endTime}
                  </p>
                </div>
                <button
                  onClick={() => onCarryOver(fromDate, block.id)}
                  className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold"
                  style={{ background: "var(--color-ember-soft)", color: "var(--color-ember)" }}
                >
                  <ArrowDownToLine size={12} /> Carry to today
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {autoScheduleCandidates.length > 0 && (
        <button
          onClick={runAutoSchedule}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed py-3 text-sm font-medium"
          style={{ borderColor: "var(--color-ember)", color: "var(--color-ember)" }}
        >
          <Wand2 size={14} /> Auto-fill {autoScheduleCandidates.length} unscheduled task{autoScheduleCandidates.length === 1 ? "" : "s"}
        </button>
      )}

      {blocks.length === 0 && rolloverCandidates.length === 0 && (
        <Card>
          <p className="text-sm" style={{ color: "var(--color-ink-dim)" }}>No blocks yet for this day.</p>
        </Card>
      )}

      {blocks.map((b) => {
        const area = LIFE_AREAS.find((a) => a.key === b.lifeArea);
        return (
          <Card key={b.id} className="flex items-center justify-between py-3">
            <button className="flex flex-1 items-center gap-3 text-left" onClick={() => onToggleDone(b.id)}>
              <div
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2 transition"
                style={{
                  borderColor: b.done ? "var(--color-good)" : "var(--color-line)",
                  background: b.done ? "var(--color-good)" : "transparent",
                }}
              >
                {b.done && <Check size={13} color="#fbf3e7" />}
              </div>
              <div>
                <p className="font-mono text-xs" style={{ color: "var(--color-ember)" }}>
                  {b.startTime} – {b.endTime}
                </p>
                <p
                  className="text-sm font-medium"
                  style={{ textDecoration: b.done ? "line-through" : "none", color: b.done ? "var(--color-ink-dim)" : "var(--color-ink)" }}
                >
                  {b.label}
                  {b.autoScheduled && (
                    <span className="ml-1.5 text-[10px] font-normal" style={{ color: "var(--color-ink-faint)" }}>
                      auto
                    </span>
                  )}
                </p>
                <p className="text-xs" style={{ color: area?.color ?? "var(--color-ink-dim)" }}>
                  {area?.shortLabel}
                </p>
              </div>
            </button>
            <button onClick={() => onRemoveBlock(b.id)} aria-label="Remove block">
              <XIcon size={15} color="var(--color-ink-faint)" />
            </button>
          </Card>
        );
      })}

      {!blockForm ? (
        <button
          onClick={() => setBlockForm(true)}
          className="w-full rounded-2xl border border-dashed py-3 text-sm font-medium"
          style={{ borderColor: "var(--color-line)", color: "var(--color-ink-dim)" }}
        >
          + Add a block
        </button>
      ) : (
        <Card>
          <div className="flex gap-2">
            <input
              type="time"
              value={blockStart}
              onChange={(e) => setBlockStart(e.target.value)}
              className="w-1/2 rounded-xl border px-3 py-2 text-sm outline-none"
              style={{ borderColor: "var(--color-line)", background: "var(--color-surface-raised)", color: "var(--color-ink)" }}
            />
            <input
              type="time"
              value={blockEnd}
              onChange={(e) => setBlockEnd(e.target.value)}
              className="w-1/2 rounded-xl border px-3 py-2 text-sm outline-none"
              style={{ borderColor: "var(--color-line)", background: "var(--color-surface-raised)", color: "var(--color-ink)" }}
            />
          </div>
          <input
            value={blockLabel}
            onChange={(e) => setBlockLabel(e.target.value)}
            placeholder="What are you doing?"
            className="mt-2 w-full rounded-xl border px-3 py-2 text-sm outline-none"
            style={{ borderColor: "var(--color-line)", background: "var(--color-surface-raised)", color: "var(--color-ink)" }}
          />
          <select
            value={blockArea}
            onChange={(e) => setBlockArea(e.target.value as LifeAreaKey)}
            className="mt-2 w-full rounded-xl border px-3 py-2 text-sm outline-none"
            style={{ borderColor: "var(--color-line)", background: "var(--color-surface-raised)", color: "var(--color-ink)" }}
          >
            {LIFE_AREAS.map((a) => (
              <option key={a.key} value={a.key}>{a.label}</option>
            ))}
          </select>
          <div className="mt-3 flex gap-2">
            <GhostButton className="text-xs" onClick={() => setBlockForm(false)}>Cancel</GhostButton>
            <button
              disabled={!blockLabel.trim()}
              onClick={() => {
                onAddBlock({ startTime: blockStart, endTime: blockEnd, label: blockLabel.trim(), lifeArea: blockArea });
                setBlockLabel("");
                setBlockForm(false);
              }}
              className="flex-1 rounded-2xl py-2.5 text-sm font-semibold disabled:opacity-40"
              style={{ background: "var(--color-ember)", color: "#fbf3e7" }}
            >
              Add block
            </button>
          </div>
        </Card>
      )}
    </div>
  );
}
