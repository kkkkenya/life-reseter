import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeMode = "dark" | "light";

interface UIState {
  theme: ThemeMode;
  soundEnabled: boolean;
  motionEnabled: boolean;
  toggleTheme: () => void;
  setTheme: (theme: ThemeMode) => void;
  toggleSound: () => void;
  toggleMotion: () => void;
}

/**
 * Display/interaction preferences (theme, sound, motion). Kept separate from the
 * life-tracking `useAppStore` so that cosmetic settings don't get tangled up with
 * the profile persistence/merge logic — this store never needs a migration when
 * the data model in `types.ts` changes.
 */
export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      theme: "light",
      soundEnabled: true,
      motionEnabled: true,
      toggleTheme: () => set((s) => ({ theme: s.theme === "dark" ? "light" : "dark" })),
      setTheme: (theme) => set({ theme }),
      toggleSound: () => set((s) => ({ soundEnabled: !s.soundEnabled })),
      toggleMotion: () => set((s) => ({ motionEnabled: !s.motionEnabled })),
    }),
    { name: "life-reset-ui" }
  )
);
