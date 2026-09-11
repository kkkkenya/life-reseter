import { Suspense, lazy, useCallback, useEffect, useState } from "react";
import { Sun, Moon, Volume2, VolumeX, Cloud, CloudOff, LogOut } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { useUIStore } from "@/store/useUIStore";
import { useSyncTheme } from "@/hooks/useSyncTheme";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { useCloudSync, type SyncStatus } from "@/hooks/useCloudSync";
// Route-level code-splitting: each tab loads on demand so the first paint
// stays light on mobile data (recharts etc. only load when Compass opens).
const Setup = lazy(() => import("@/pages/Setup"));
const SignIn = lazy(() => import("@/pages/SignIn"));
const Today = lazy(() => import("@/pages/Today"));
const Streaks = lazy(() => import("@/pages/Streaks"));
const Detox = lazy(() => import("@/pages/Detox"));
const Examen = lazy(() => import("@/pages/Examen"));
const Compass = lazy(() => import("@/pages/Compass"));
const Events = lazy(() => import("@/pages/Events"));
import { BottomNav, type Tab } from "@/components/BottomNav";
import { SideNav } from "@/components/SideNav";
import { CelebrationLayer } from "@/components/CelebrationLayer";
import SplashScreen from "@/components/SplashScreen";
import { useGoogleCalendar } from "@/hooks/useGoogleCalendar";
import { playTap } from "@/lib/sound";

function GoogleDot() {
  const { configured, connected, busy, error, connect, disconnect } = useGoogleCalendar();
  const [showNote, setShowNote] = useState(false);

  useEffect(() => {
    if (!error) return;
    setShowNote(true);
    const t = window.setTimeout(() => setShowNote(false), 7000);
    return () => window.clearTimeout(t);
  }, [error]);

  const note = !configured
    ? "Google Calendar isn't set up on this deploy (missing VITE_GOOGLE_CLIENT_ID env var)."
    : error;

  return (
    <div className="relative">
      <button
        onClick={() => {
          if (!configured) {
            setShowNote((s) => !s);
            return;
          }
          if (connected) {
            if (confirm("Disconnect Google Calendar on this device?")) disconnect();
          } else {
            void connect();
          }
        }}
        aria-label={connected ? "Google Calendar connected — tap to disconnect" : note ?? "Connect Google Calendar"}
        title={connected ? "Google Calendar connected" : note ?? "Connect Google Calendar"}
        className="flex h-8 items-center gap-1.5 rounded-lg px-2"
        style={{ background: "var(--color-surface)", opacity: configured ? 1 : 0.6 }}
      >
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{
            background: !configured ? "var(--color-ink-faint)" : connected ? "var(--color-good)" : "var(--color-bad)",
            opacity: busy ? 0.5 : 1,
          }}
        />
        <span className="text-[10px] font-semibold" style={{ color: "var(--color-ink-dim)" }}>
          GCal
        </span>
      </button>
      {showNote && note && (
        <div
          className="absolute right-0 top-full z-50 mt-1.5 w-56 rounded-xl border px-3 py-2 text-xs leading-snug"
          style={{
            borderColor: "var(--color-line)",
            background: "var(--color-surface)",
            color: "var(--color-ink-dim)",
            boxShadow: "var(--shadow-floating)",
          }}
        >
          {note}
        </div>
      )}
    </div>
  );
}

function PageFallback() {
  return <div className="min-h-screen" style={{ background: "var(--color-bg)" }} />;
}

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
    <div className="fixed right-4 top-4 z-30 flex items-center gap-1.5 lg:right-8">
      <GoogleDot />
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
  const [splash, setSplash] = useState(true);
  const dismissSplash = useCallback(() => setSplash(false), []);

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
    return (
      <div className="min-h-screen" style={{ background: "var(--color-bg)" }}>
        {splash && <SplashScreen onDone={dismissSplash} />}
      </div>
    );
  }
  if (isConfigured && !userId) {
    return (
      <div className="min-h-screen" style={{ background: "var(--color-bg)" }}>
        <Suspense fallback={<PageFallback />}>
          <SignIn />
        </Suspense>
        {splash && <SplashScreen onDone={dismissSplash} />}
      </div>
    );
  }

  if (!onboarded) {
    return (
      <div className="min-h-screen" style={{ background: "var(--color-bg)" }}>
        <Suspense fallback={<PageFallback />}>
          <Setup />
        </Suspense>
        <CelebrationLayer />
        {splash && <SplashScreen onDone={dismissSplash} />}
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--color-bg)" }}>
      <SideNav active={tab} onChange={setTab} />
      <div className="lg:pl-64">
        <Suspense fallback={<PageFallback />}>
          {tab === "today" && <Today onOpenExamen={() => setTab("examen")} onOpenStreaks={() => setStreaksOpen(true)} onOpenDetox={() => setTab("detox")} />}
        {tab === "examen" && <Examen />}
        {tab === "detox" && <Detox />}
        {tab === "compass" && <Compass />}
        {tab === "events" && <Events />}
        {streaksOpen && (
          <div className="fixed inset-0 z-40" style={{ background: "var(--color-bg)" }}>
            <Streaks onBack={() => setStreaksOpen(false)} />
          </div>
        )}
        </Suspense>
      </div>
      <BottomNav active={tab} onChange={setTab} />
      <TopControls syncStatus={syncStatus} onSignOut={signOut} />
      <CelebrationLayer />
      {splash && <SplashScreen onDone={dismissSplash} />}
    </div>
  );
}
