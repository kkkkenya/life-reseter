import { useEffect, useMemo, useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { getSweetGreeting } from "@/lib/sweetWords";

const LETTERS = ["R", "E", "S", "E", "T"];
const DISPLAY_MS = 2100;
const EXIT_MS = 450;

export default function SplashScreen({ onDone }: { onDone: () => void }) {
  const [leaving, setLeaving] = useState(false);
  const sweet = useMemo(() => getSweetGreeting(new Date()), []);
  const displayName = useAppStore((s) => s.profile.displayName);
  const firstName = displayName.trim().split(/\s+/)[0] || "";

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const showFor = reduced ? 400 : DISPLAY_MS;
    const exitFor = reduced ? 80 : EXIT_MS;

    const startLeave = window.setTimeout(() => setLeaving(true), showFor);
    const finish = window.setTimeout(onDone, showFor + exitFor);
    return () => {
      window.clearTimeout(startLeave);
      window.clearTimeout(finish);
    };
  }, [onDone]);

  function skip() {
    setLeaving(true);
    window.setTimeout(onDone, 180);
  }

  return (
    <div
      role="status"
      aria-label="RESET is waking up"
      onClick={skip}
      className={`splash-root paper-grain ${leaving ? "splash-leaving" : ""}`}
    >
      <div className="splash-inner">
        {/* ---- Sleepy sun rising over hills ---- */}
        <div className="splash-scene" aria-hidden="true">
          {/* floating Zzz */}
          <span className="splash-z splash-z-1">z</span>
          <span className="splash-z splash-z-2">z</span>
          <span className="splash-z splash-z-3">z</span>

          <svg viewBox="0 0 200 170" className="splash-svg">
            {/* rays */}
            <g className="splash-rays" stroke="var(--color-gold)" strokeWidth="5" strokeLinecap="round">
              <line x1="100" y1="8" x2="100" y2="22" />
              <line x1="100" y1="8" x2="100" y2="22" transform="rotate(45 100 68)" />
              <line x1="100" y1="8" x2="100" y2="22" transform="rotate(90 100 68)" />
              <line x1="100" y1="8" x2="100" y2="22" transform="rotate(135 100 68)" />
              <line x1="100" y1="8" x2="100" y2="22" transform="rotate(180 100 68)" />
              <line x1="100" y1="8" x2="100" y2="22" transform="rotate(225 100 68)" />
              <line x1="100" y1="8" x2="100" y2="22" transform="rotate(270 100 68)" />
              <line x1="100" y1="8" x2="100" y2="22" transform="rotate(315 100 68)" />
            </g>

            {/* sun body */}
            <g className="splash-sun">
              <circle cx="100" cy="68" r="38" fill="var(--color-gold)" />
              <circle cx="100" cy="68" r="38" fill="none" stroke="var(--color-ember)" strokeOpacity="0.18" strokeWidth="2" />
              {/* sleepy happy closed eyes */}
              <path d="M82 66 q6 -7 12 0" fill="none" stroke="var(--color-ink)" strokeWidth="3" strokeLinecap="round" />
              <path d="M106 66 q6 -7 12 0" fill="none" stroke="var(--color-ink)" strokeWidth="3" strokeLinecap="round" />
              {/* blush */}
              <ellipse className="splash-blush" cx="80" cy="76" rx="7" ry="4.5" fill="#e89a8a" opacity="0.85" />
              <ellipse className="splash-blush" cx="120" cy="76" rx="7" ry="4.5" fill="#e89a8a" opacity="0.85" />
              {/* tiny smile */}
              <path d="M94 78 q6 6 12 0" fill="none" stroke="var(--color-ink)" strokeWidth="3" strokeLinecap="round" />
            </g>

            {/* hills */}
            <g className="splash-hills">
              <ellipse cx="52" cy="152" rx="62" ry="30" fill="var(--color-good)" opacity="0.55" />
              <ellipse cx="150" cy="155" rx="70" ry="32" fill="var(--color-good)" />
              {/* sprout */}
              <g className="splash-sprout" stroke="var(--color-ember)" strokeWidth="3" strokeLinecap="round">
                <line x1="150" y1="138" x2="150" y2="118" />
                <path d="M150 126 q-16 -2 -20 -16 q16 -2 20 16" fill="var(--color-good)" stroke="none" />
                <path d="M150 122 q16 -2 20 -16 q-16 -2 -20 16" fill="var(--color-good)" stroke="none" />
                <circle cx="150" cy="114" r="4" fill="var(--color-ember)" stroke="none" />
              </g>
            </g>
          </svg>
        </div>

        {/* ---- Wordmark ---- */}
        <p className="splash-hello">{sweet.greeting}{firstName ? `, ${firstName}` : ""} ☀️</p>
        <h1 className="splash-title font-display" aria-label="RESET">
          {LETTERS.map((ch, i) => (
            <span key={i} className="splash-letter" style={{ animationDelay: `${0.35 + i * 0.07}s` }}>
              {ch}
            </span>
          ))}
        </h1>
        <p className="splash-sub">{sweet.note} Waking up your day…</p>

        {/* ---- Bouncing dots ---- */}
        <div className="splash-dots" aria-hidden="true">
          <span style={{ animationDelay: "0s" }} />
          <span style={{ animationDelay: "0.15s" }} />
          <span style={{ animationDelay: "0.3s" }} />
        </div>
      </div>
    </div>
  );
}
