import { useEffect } from "react";
import { useUIStore } from "@/store/useUIStore";

/** Applies the active theme as a `data-theme` attribute on <html>, which index.css keys off of. */
export function useSyncTheme() {
  const theme = useUIStore((s) => s.theme);
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);
}
