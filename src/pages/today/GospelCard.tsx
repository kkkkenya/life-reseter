import { Card } from "@/components/ui";
import type { DailyGospelEntry } from "@/types";

export function GospelCard({ gospel, reflecting }: { gospel: DailyGospelEntry; reflecting: boolean }) {
  return (
    <Card className="mt-4">
      <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-ember)" }}>
        {gospel.ref}
      </p>
      <p className="mt-1.5 text-sm italic leading-relaxed">"{gospel.text}"</p>
      {gospel.reflection && (
        <p className="mt-2 text-xs leading-relaxed" style={{ color: "var(--color-ink-dim)" }}>
          {gospel.reflection}
        </p>
      )}
      {reflecting && !gospel.reflection && (
        <p className="mt-2 text-xs" style={{ color: "var(--color-ink-faint)" }}>Reflecting...</p>
      )}
    </Card>
  );
}
