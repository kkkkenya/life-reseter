import { useEffect } from "react";
import { useCelebrationStore, type Burst } from "@/store/useCelebrationStore";
import { useUIStore } from "@/store/useUIStore";

const PARTICLE_COUNT: Record<Burst["size"], number> = { sm: 8, md: 14, lg: 22 };
const SPREAD: Record<Burst["size"], number> = { sm: 40, md: 64, lg: 96 };

function BurstView({ burst, onDone }: { burst: Burst; onDone: () => void }) {
  useEffect(() => {
    const t = window.setTimeout(onDone, 750);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const count = PARTICLE_COUNT[burst.size];
  const spread = SPREAD[burst.size];

  const particles = Array.from({ length: count }, (_, i) => {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
    const distance = spread * (0.6 + Math.random() * 0.6);
    const dx = Math.cos(angle) * distance;
    const dy = Math.sin(angle) * distance - spread * 0.3; // slight upward bias
    const color = burst.colors[i % burst.colors.length];
    const isRound = i % 2 === 0;
    const size = 5 + Math.round(Math.random() * 3);
    return (
      <span
        key={i}
        className="confetti-particle"
        style={{
          left: burst.x,
          top: burst.y,
          width: size,
          height: size,
          background: color,
          borderRadius: isRound ? "50%" : "2px",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ["--dx" as any]: `${dx}px`,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ["--dy" as any]: `${dy}px`,
          animationDelay: `${Math.random() * 0.05}s`,
        }}
      />
    );
  });

  return <>{particles}</>;
}

export function CelebrationLayer() {
  const bursts = useCelebrationStore((s) => s.bursts);
  const remove = useCelebrationStore((s) => s.remove);
  const motionEnabled = useUIStore((s) => s.motionEnabled);

  if (!motionEnabled || bursts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {bursts.map((b) => (
        <BurstView key={b.id} burst={b} onDone={() => remove(b.id)} />
      ))}
    </div>
  );
}
