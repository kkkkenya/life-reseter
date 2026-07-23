import React from "react";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";
import { playTap } from "@/lib/sound";

/** Wraps a click handler with a tap sound, without swallowing the caller's own logic. */
function withTap<E extends React.SyntheticEvent>(handler?: (e: E) => void) {
  return (e: E) => {
    playTap();
    handler?.(e);
  };
}

export function PrimaryButton({
  children,
  className,
  disabled,
  onClick,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "tactile w-full rounded-full bg-ember py-4 text-center font-display font-semibold text-[15px] tracking-wide text-[#fbf3e7]",
        "disabled:opacity-40 disabled:pointer-events-none disabled:translate-y-0",
        className
      )}
      style={{ backgroundColor: "var(--color-ember)", boxShadow: "var(--shadow-raised)" }}
      disabled={disabled}
      onClick={withTap(onClick)}
      {...props}
    >
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  className,
  onClick,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "tactile w-full rounded-full border py-4 text-center font-display font-semibold text-[15px]",
        "border-line text-ink-dim",
        className
      )}
      style={{ borderColor: "var(--color-line)", color: "var(--color-ink-dim)", boxShadow: "var(--shadow-flush)", background: "var(--color-surface)" }}
      onClick={withTap(onClick)}
      {...props}
    >
      {children}
    </button>
  );
}

export function OptionRow({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={withTap(onClick)}
      className={cn("tactile w-full rounded-3xl px-5 py-4 text-left text-[15px] font-medium border")}
      style={{
        background: selected ? "var(--color-ember)" : "var(--color-surface)",
        color: selected ? "#fbf3e7" : "var(--color-ink)",
        borderColor: selected ? "var(--color-ember)" : "var(--color-line)",
        boxShadow: selected ? "var(--shadow-floating)" : "var(--shadow-flush)",
      }}
    >
      {label}
    </button>
  );
}

/** Small pill toggle used for settings like theme/sound. */
export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={withTap(() => onChange(!checked))}
      className="relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200"
      style={{ background: checked ? "var(--color-ember)" : "var(--color-line)" }}
    >
      <span
        className="absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200"
        style={{ transform: checked ? "translateX(23px)" : "translateX(4px)" }}
      />
    </button>
  );
}

export function TopProgress({ value }: { value: number }) {
  return (
    <div className="h-1.5 w-full rounded-full" style={{ background: "var(--color-line)" }}>
      <div
        className="h-1.5 rounded-full transition-all duration-300"
        style={{ width: `${value}%`, background: "var(--color-ember)" }}
      />
    </div>
  );
}

export function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex h-10 w-10 items-center justify-center rounded-2xl"
      style={{ background: "var(--color-surface)" }}
      aria-label="Go back"
    >
      <ArrowLeft size={18} style={{ color: "var(--color-ink)" }} />
    </button>
  );
}

export const Card = React.forwardRef<
  HTMLDivElement,
  {
    children: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
    /** Category/accent hex — renders as a colored spine tab on the left edge instead of a flat tint. */
    spineColor?: string;
    /** "flush" | "raised" | "floating" — defaults to raised, the standard resting elevation for content cards. */
    elevation?: "flush" | "raised" | "floating";
  }
>(function Card({ children, className, style, spineColor, elevation = "raised" }, ref) {
  return (
    <div
      ref={ref}
      className={cn("paper-grain rounded-3xl border p-5", spineColor && "spine-card", className)}
      style={{
        background: "var(--color-surface)",
        borderColor: "var(--color-line)",
        boxShadow: `var(--shadow-${elevation})`,
        ...(spineColor ? ({ "--spine-color": spineColor } as React.CSSProperties) : {}),
        ...style,
      }}
    >
      {children}
    </div>
  );
});

export function ScreenShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex h-full max-w-md flex-col px-5 pt-14 pb-8">{children}</div>
  );
}
