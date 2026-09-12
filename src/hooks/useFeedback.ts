import { useCallback } from "react";
import { playComplete, playMilestone, playLevelUp, playTap, playSkip, playSoft } from "@/lib/sound";

/**
 * Central place for "this felt good, tell the user" moments — a synthesized
 * sound, nothing more. No confetti, no popups: the reward for finishing a task
 * is the finished task. Keeping this in one hook means every page gets the
 * same tactile feel for free.
 */
export function useFeedback() {
  const complete = useCallback((_el: Element | null) => {
    playComplete();
  }, []);

  const milestone = useCallback((_el: Element | null) => {
    playMilestone();
  }, []);

  const levelUp = useCallback((_el: Element | null) => {
    playLevelUp();
  }, []);

  const tap = useCallback(() => playTap(), []);
  const skip = useCallback(() => playSkip(), []);
  const soft = useCallback(() => playSoft(), []);

  return { complete, milestone, levelUp, tap, skip, soft };
}
