import { useEffect, useState } from "react";
import { Sun, Moon, Volume2, VolumeX, Cloud, CloudOff, LogOut } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { useUIStore } from "@/store/useUIStore";
import { useSyncTheme } from "@/hooks/useSyncTheme";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { useCloudSync, type SyncStatus } from "@/hooks/useCloudSync";
import Setup from "@/pages/Setup";
import SignIn from "@/pages/SignIn";
import Today from "@/pages/Today";
import Streaks from "@/pages/Streaks";
import Detox from "@/pages/Detox";
import Examen from "@/pages/Examen";
import Compass from "@/pages/Compass";
import { BottomNav, type Tab } from "@/components/BottomNav";
import { CelebrationLayer } from "@/components/CelebrationLayer";
import { playTap } from "@/lib/sound";

function SyncIndicator({ status, onSignOut }: { status: SyncStatus; onSignOut: () => void }) {
  if (status === "offline") return null;
  const label = status === "syncing" ? "Syncing…" : status === "error" ? "Sync error" : "Synced";
  const Icon = status === "error" ? CloudOff : Cloud;
  return (
    <button
      onClick={() => {
        if (confirm("Sign out of cloud sync on this device?")) onSignOut();
      }}
      aria-label={`${label} — tap to sign out`}
      title={label}
      className="flex h-8 items-center gap-1 rounded-lg px-2"
      style={{ background: "var(--color-surface)" }}
    >
      <Icon size={13} color={status === "error" ? "var(--color-bad)" : "var(--color-ink-dim)"} />
      <LogOut size={11} color="var(--color-ink-faint)" />
    </button>
  );
}

function TopControls({ syncStatus, onSignOut }: { syncStatus: SyncStatus; onSignOut: () => void }) {
  const theme = useUIStore((s) => s.theme);
  const toggleTheme = useUIStore((s) => s.toggleTheme);
  const soundEnabled = useUIStore((s) => s.soundEnabled);
  const toggleSound = useUIStore((s) => s.toggleSound);
  const resetAll = useAppStore((s) => s.resetAll);

  return (
    <div className="fixed right-4 top-4 z-30 flex items-center gap-1.5">
      <SyncIndicator status={syncStatus} onSignOut={onSignOut} />
      <button
        onClick={() => {
          toggleTheme();
          playTap();
        }}
        aria-label="Toggle theme"
        className="flex h-8 w-8 items-center justify-center rounded-lg"
        style={{ background: "var(--color-surface)" }}
      >
        {theme === "dark" ? <Sun size={14} color="var(--color-ink-dim)" /> : <Moon size={14} color="var(--color-ink-dim)" />}
      </button>
      <button
        onClick={() => {
          toggleSound();
          if (!soundEnabled) playTap();
        }}
        aria-label="Toggle sound"
        className="flex h-8 w-8 items-center justify-center rounded-lg"
        style={{ background: "var(--color-surface)" }}
      >
        {soundEnabled ? <Volume2 size={14} color="var(--color-ink-dim)" /> : <VolumeX size={14} color="var(--color-ink-dim)" />}
      </button>
      <button
        onClick={() => {
          if (confirm("Reset all progress and redo onboarding? This can't be undone.")) resetAll();
        }}
        className="rounded-lg px-2 py-1 text-[10px]"
        style={{ background: "var(--color-surface)", color: "var(--color-ink-faint)" }}
      >
        Reset
      </button>
    </div>
  );
}

export default function App() {
  const onboarded = useAppStore((s) => s.profile.onboarded);
  const checkMilestones = useAppStore((s) => s.checkMilestones);
  const [tab, setTab] = useState<Tab>("today");
  const [streaksOpen, setStreaksOpen] = useState(false);
  const [detoxOpen, setDetoxOpen] = useState(false);

  useSyncTheme();
  const { userId, loading: authLoading, isConfigured, signOut } = useSupabaseAuth();
  const syncStatus = useCloudSync(userId);

  useEffect(() => {
    if (onboarded) checkMilestones();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onboarded]);

  // Cloud sync is opt-in: with no Supabase env vars set, this block never
  // triggers and the app behaves exactly as it did local-only.
  if (isConfigured && authLoading) {
    return <div className="min-h-screen" style={{ background: "var(--color-bg)" }} />;
  }
  if (isConfigured && !userId) {
    return (
      <div className="min-h-screen" style={{ background: "var(--color-bg)" }}>
        <SignIn />
      </div>
    );
  }

  if (!onboarded) {
    return (
      <div className="min-h-screen" style={{ background: "var(--color-bg)" }}>
        <Setup />
        <CelebrationLayer />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--color-bg)" }}>
      {tab === "today" && (
        <Today onOpenExamen={() => setTab("examen")} onOpenStreaks={() => setStreaksOpen(true)} onOpenDetox={() => setDetoxOpen(true)} />
      )}
      {tab === "examen" && <Examen />}
      {tab === "compass" && <Compass />}
      {streaksOpen && (
        <div className="fixed inset-0 z-40" style={{ background: "var(--color-bg)" }}>
          <Streaks onBack={() => setStreaksOpen(false)} />
        </div>
      )}
      {detoxOpen && (
        <div className="fixed inset-0 z-40" style={{ background: "var(--color-bg)" }}>
          <Detox onBack={() => setDetoxOpen(false)} />
        </div>
      )}
      <BottomNav active={tab} onChange={setTab} />
      <TopControls syncStatus={syncStatus} onSignOut={signOut} />
      <CelebrationLayer />
    </div>
  );
}
