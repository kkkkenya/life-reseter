import { create } from "zustand";

export interface Burst {
  id: string;
  x: number; // viewport px
  y: number; // viewport px
  colors: string[];
  size: "sm" | "md" | "lg";
}

interface CelebrationState {
  bursts: Burst[];
  fire: (x: number, y: number, opts?: { colors?: string[]; size?: Burst["size"] }) => void;
  remove: (id: string) => void;
}

const DEFAULT_COLORS = ["#ff5f2e", "#e8b85c", "#46d17a", "#edeef0"];

export const useCelebrationStore = create<CelebrationState>()((set) => ({
  bursts: [],
  fire: (x, y, opts) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    set((s) => ({
      bursts: [...s.bursts, { id, x, y, colors: opts?.colors ?? DEFAULT_COLORS, size: opts?.size ?? "md" }],
    }));
  },
  remove: (id) => set((s) => ({ bursts: s.bursts.filter((b) => b.id !== id) })),
}));

/** Fire a burst centered on a DOM element (e.g. the button that was just tapped). */
export function celebrateAt(el: Element | null, opts?: { colors?: string[]; size?: Burst["size"] }) {
  if (!el) return;
  const rect = el.getBoundingClientRect();
  useCelebrationStore.getState().fire(rect.left + rect.width / 2, rect.top + rect.height / 2, opts);
}
