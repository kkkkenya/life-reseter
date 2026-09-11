import { IconFor } from "@/components/IconFor";

const SIZE = 240;
const CENTER = SIZE / 2;
const R_MAX = 80;
const ICON_R = R_MAX + 24;
const START_ANGLE = -90; // top
const RING_FRACTIONS = [0.25, 0.5, 0.75, 1];

export interface CompassRoseDatum {
  key: string;
  shortLabel: string;
  icon: string;
  color: string;
  value: number; // 0-1
}

function polarToXY(angleDeg: number, radius: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: CENTER + radius * Math.cos(rad), y: CENTER + radius * Math.sin(rad) };
}

function polygonPoints(n: number, radiusFor: (i: number) => number) {
  return Array.from({ length: n }, (_, i) => {
    const angle = START_ANGLE + (360 / n) * i;
    const { x, y } = polarToXY(angle, radiusFor(i));
    return `${x},${y}`;
  }).join(" ");
}

/**
 * Instrument-style radar/rose: one spoke per life area, reading how aligned the person
 * currently is there (blend of task completion and goal progress). The center number is
 * the overall bearing across all seven. Grounded in the app's existing dial vocabulary
 * (StatGauge, AreaRing) rather than a generic dashboard tile.
 */
export function CompassRose({
  data,
  overall,
  headline,
}: {
  data: CompassRoseDatum[];
  overall: number;
  headline: string;
}) {
  const n = data.length;
  const dataPoints = polygonPoints(n, (i) => R_MAX * Math.max(0, Math.min(1, data[i].value)));
  const bearing = Math.round(Math.max(0, Math.min(1, overall)) * 100);

  return (
    <div>
      <div className="relative mx-auto" style={{ width: "100%", maxWidth: SIZE }}>
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full" style={{ display: "block", height: "auto" }}>
          {RING_FRACTIONS.map((f) => (
            <polygon
              key={f}
              points={polygonPoints(n, () => R_MAX * f)}
              fill="none"
              stroke="var(--color-line)"
              strokeWidth={1}
            />
          ))}
          {data.map((_, i) => {
            const { x, y } = polarToXY(START_ANGLE + (360 / n) * i, R_MAX);
            return (
              <line key={i} x1={CENTER} y1={CENTER} x2={x} y2={y} stroke="var(--color-line)" strokeWidth={1} />
            );
          })}
          <polygon
            points={dataPoints}
            fill="var(--color-ember)"
            fillOpacity={0.16}
            stroke="var(--color-ember)"
            strokeWidth={1.75}
            strokeLinejoin="round"
          />
          {data.map((d, i) => {
            const angle = START_ANGLE + (360 / n) * i;
            const { x, y } = polarToXY(angle, R_MAX * Math.max(0, Math.min(1, d.value)));
            return <circle key={d.key} cx={x} cy={y} r={3} fill={d.color} />;
          })}
          <text
            x={CENTER}
            y={CENTER - 5}
            textAnchor="middle"
            className="font-mono"
            fontSize="30"
            fontWeight="700"
            fill="var(--color-ink)"
          >
            {bearing}
          </text>
          <text
            x={CENTER}
            y={CENTER + 15}
            textAnchor="middle"
            className="font-mono"
            fontSize="10"
            fontWeight="600"
            fill="var(--color-ink-faint)"
            style={{ textTransform: "uppercase", letterSpacing: "0.08em" }}
          >
            heading
          </text>
        </svg>
        {data.map((d, i) => {
          const angle = START_ANGLE + (360 / n) * i;
          const { x, y } = polarToXY(angle, ICON_R);
          return (
            <div
              key={d.key}
              className="absolute flex items-center justify-center rounded-full"
              style={{
                left: `${(x / SIZE) * 100}%`,
                top: `${(y / SIZE) * 100}%`,
                transform: "translate(-50%, -50%)",
                width: 26,
                height: 26,
                background: "var(--color-surface)",
                border: "1px solid var(--color-line)",
                boxShadow: "var(--shadow-flush)",
              }}
            >
              <IconFor name={d.icon} size={13} color={d.color} />
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-center text-sm" style={{ color: "var(--color-ink-dim)" }}>
        {headline}
      </p>
    </div>
  );
}
