import { useCallback } from "react";
import { celebrateAt } from "@/store/useCelebrationStore";
import { playComplete, playMilestone, playLevelUp, playTap, playSkip, playSoft } from "@/lib/sound";

/**
 * Central place for "this felt good, tell the user" moments — a synthesized
 * sound, nothing more. No confetti, no popups: the reward for finishing a task
 * is the finished task. Keeping this in one hook means every page gets the
 * same tactile feel for free.
 */
export function useFeedback() {
  const complete = useCallback((el: Element | null) => {
    playComplete();
    celebrateAt(el, { size: "md" });
  }, []);

  const milestone = useCallback((el: Element | null) => {
    playMilestone();
    celebrateAt(el, { size: "lg", colors: ["#e8b85c", "#ff5f2e", "#edeef0", "#46d17a"] });
  }, []);

  const levelUp = useCallback((el: Element | null) => {
    playLevelUp();
    celebrateAt(el, { size: "lg" });
  }, []);

  const tap = useCallback(() => playTap(), []);
  const skip = useCallback(() => playSkip(), []);
  const soft = useCallback(() => playSoft(), []);

  return { complete, milestone, levelUp, tap, skip, soft };
}
