import { Check } from "lucide-react";
import type { GoalTarget } from "@/types";

/** Thin colored progress bar — like ui.tsx's TopProgress, but tintable per life area. */
function ProgressBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-1.5 w-full rounded-full" style={{ background: "var(--color-line)" }}>
      <div
        className="h-1.5 rounded-full transition-all duration-300"
        style={{ width: `${Math.max(0, Math.min(1, pct)) * 100}%`, background: color }}
      />
    </div>
  );
}

function parseNonNegNumber(raw: string): number {
  if (raw.trim() === "") return 0;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

/**
 * Edits one horizon's GoalTarget: what it is, the current/target numbers, the unit,
 * and a live progress bar. Achievement (achievedAt) is computed by the store the
 * moment currentValue reaches targetValue — this component just renders that state.
 */
export function GoalTargetEditor({
  value,
  onChange,
  accent,
  labelPlaceholder,
  size = "default",
}: {
  value: GoalTarget;
  onChange: (patch: Partial<GoalTarget>) => void;
  accent: string;
  labelPlaceholder: string;
  size?: "default" | "compact";
}) {
  const hasTarget = value.targetValue > 0;
  const pct = hasTarget ? value.currentValue / value.targetValue : 0;
  const met = hasTarget && value.currentValue >= value.targetValue;
  const compact = size === "compact";

  const fieldClass = compact
    ? "rounded-lg border px-2 py-1.5 text-xs outline-none"
    : "rounded-xl border px-3 py-2 text-sm outline-none";
  const fieldStyle = {
    borderColor: "var(--color-line)",
    background: "var(--color-surface-raised)",
    color: "var(--color-ink)",
  } as const;

  return (
    <div className={compact ? "space-y-1.5" : "space-y-2"}>
      <input
        value={value.label}
        onChange={(e) => onChange({ label: e.target.value })}
        placeholder={labelPlaceholder}
        className={`w-full ${fieldClass}`}
        style={fieldStyle}
      />
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          inputMode="decimal"
          min={0}
          value={value.currentValue === 0 ? "" : value.currentValue}
          onChange={(e) => onChange({ currentValue: parseNonNegNumber(e.target.value) })}
          placeholder="0"
          aria-label="Current progress"
          className={`w-16 text-center ${fieldClass}`}
          style={fieldStyle}
        />
        <span className="shrink-0 text-xs font-medium" style={{ color: "var(--color-ink-faint)" }}>
          /
        </span>
        <input
          type="number"
          inputMode="decimal"
          min={0}
          value={value.targetValue === 0 ? "" : value.targetValue}
          onChange={(e) => onChange({ targetValue: parseNonNegNumber(e.target.value) })}
          placeholder="Target"
          aria-label="Target value"
          className={`w-16 text-center ${fieldClass}`}
          style={fieldStyle}
        />
        <input
          value={value.unit}
          onChange={(e) => onChange({ unit: e.target.value })}
          placeholder="unit"
          aria-label="Unit"
          className={`min-w-0 flex-1 ${fieldClass}`}
          style={fieldStyle}
        />
        <div
          className="flex shrink-0 items-center justify-center rounded-full"
          style={{
            width: compact ? 22 : 26,
            height: compact ? 22 : 26,
            background: met ? "var(--color-good)" : "var(--color-surface-raised)",
            border: "1px solid var(--color-line)",
          }}
          aria-label={met ? "Target met" : "Target not yet met"}
        >
          <Check size={compact ? 11 : 13} color={met ? "#fbf3e7" : "var(--color-ink-faint)"} />
        </div>
      </div>
      {hasTarget ? (
        <ProgressBar pct={pct} color={met ? "var(--color-good)" : accent} />
      ) : (
        <p className="text-[11px]" style={{ color: "var(--color-ink-faint)" }}>
          Set a target to track progress
        </p>
      )}
    </div>
  );
}
