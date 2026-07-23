const SIZE = 72;
const STROKE = 5;
const R = (SIZE - STROKE) / 2;
const CENTER = SIZE / 2;
// sweep from 135deg to 405deg (270 degree arc), matching an instrument dial
const START_ANGLE = 135;
const SWEEP = 270;

function polarToXY(angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: CENTER + R * Math.cos(rad),
    y: CENTER + R * Math.sin(rad),
  };
}

function arcPath(startDeg: number, endDeg: number) {
  const start = polarToXY(startDeg);
  const end = polarToXY(endDeg);
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${R} ${R} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

export function StatGauge({
  label,
  value,
  max = 100,
  accent = "var(--color-ember)",
}: {
  label: string;
  value: number;
  max?: number;
  accent?: string;
}) {
  const pct = Math.max(0, Math.min(1, value / max));
  const valueAngle = START_ANGLE + SWEEP * pct;
  const ticks = Array.from({ length: 10 }, (_, i) => START_ANGLE + (SWEEP / 9) * i);

  return (
    <div className="flex flex-col items-center gap-1.5">
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        <path
          d={arcPath(START_ANGLE, START_ANGLE + SWEEP)}
          fill="none"
          stroke="var(--color-line)"
          strokeWidth={STROKE}
          strokeLinecap="round"
        />
        {ticks.map((t, i) => {
          const inner = polarToXY(t);
          const outer = {
            x: CENTER + (R + 4) * Math.cos((t * Math.PI) / 180),
            y: CENTER + (R + 4) * Math.sin((t * Math.PI) / 180),
          };
          return (
            <line
              key={i}
              x1={inner.x}
              y1={inner.y}
              x2={outer.x}
              y2={outer.y}
              stroke={t <= valueAngle ? accent : "var(--color-line)"}
              strokeWidth={1.5}
            />
          );
        })}
        <path
          d={arcPath(START_ANGLE, valueAngle)}
          fill="none"
          stroke={accent}
          strokeWidth={STROKE}
          strokeLinecap="round"
        />
        <text
          x={CENTER}
          y={CENTER + 4}
          textAnchor="middle"
          className="font-mono"
          fontSize="16"
          fontWeight="700"
          fill="var(--color-ink)"
        >
          {Math.round(value)}
        </text>
      </svg>
      <span
        className="font-mono text-[10px] uppercase tracking-wider"
        style={{ color: "var(--color-ink-dim)" }}
      >
        {label}
      </span>
    </div>
  );
}

export function AreaRing({
  pct,
  size = 44,
  accent = "var(--color-ember)",
  children,
}: {
  pct: number; // 0-1
  size?: number;
  accent?: string;
  children?: React.ReactNode;
}) {
  const stroke = 4;
  const r = (size - stroke) / 2;
  const c = size / 2;
  const circumference = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, pct));
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={c} cy={c} r={r} fill="none" stroke="var(--color-line)" strokeWidth={stroke} />
        <circle
          cx={c}
          cy={c}
          r={r}
          fill="none"
          stroke={accent}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped)}
          transform={`rotate(-90 ${c} ${c})`}
          style={{ transition: "stroke-dashoffset 0.4s ease" }}
        />
      </svg>
      {children && (
        <div className="absolute inset-0 flex items-center justify-center">{children}</div>
      )}
    </div>
  );
}

export function DayRing({
  day,
  total,
  size = 84,
}: {
  day: number;
  total: number;
  size?: number;
}) {
  const stroke = 6;
  const r = (size - stroke) / 2;
  const c = size / 2;
  const circumference = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, day / total));
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={c} cy={c} r={r} fill="none" stroke="var(--color-line)" strokeWidth={stroke} />
      <circle
        cx={c}
        cy={c}
        r={r}
        fill="none"
        stroke="var(--color-ember)"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - pct)}
        transform={`rotate(-90 ${c} ${c})`}
      />
      <text
        x={c}
        y={c - 2}
        textAnchor="middle"
        className="font-mono"
        fontSize="18"
        fontWeight="700"
        fill="var(--color-ink)"
      >
        {day}
      </text>
      <text
        x={c}
        y={c + 16}
        textAnchor="middle"
        className="font-mono"
        fontSize="9"
        fill="var(--color-ink-dim)"
      >
        / {total}
      </text>
    </svg>
  );
}
