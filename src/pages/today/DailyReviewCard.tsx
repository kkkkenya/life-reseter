import { Sparkles } from "lucide-react";
import { Card, GhostButton } from "@/components/ui";
import { isGeminiConfigured } from "@/lib/gemini";

export function DailyReviewCard({
  review,
  generating,
  error,
  onGenerate,
}: {
  review: string | undefined;
  generating: boolean;
  error: string | null;
  onGenerate: () => void;
}) {
  return (
    <Card>
      <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-ink-dim)" }}>
        Daily review
      </p>
      {!isGeminiConfigured ? (
        <p className="mt-1.5 text-xs" style={{ color: "var(--color-ink-dim)" }}>
          Set GEMINI_API_KEY (and VITE_GEMINI_ENABLED=true) to enable this.
        </p>
      ) : review ? (
        <p className="mt-1.5 text-sm leading-relaxed">{review}</p>
      ) : (
        <div className="mt-2">
          <GhostButton onClick={onGenerate} disabled={generating}>
            <span className="flex items-center justify-center gap-1.5">
              <Sparkles size={14} /> {generating ? "Generating..." : "Generate today's review"}
            </span>
          </GhostButton>
        </div>
      )}
      {error && <p className="mt-2 text-xs" style={{ color: "var(--color-bad)" }}>{error}</p>}
    </Card>
  );
}
