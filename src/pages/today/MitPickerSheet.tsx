import { IconFor } from "@/components/IconFor";
import type { TaskEntry } from "./TaskList";

export function MitPickerSheet({
  entries,
  onClose,
  onPick,
}: {
  entries: TaskEntry[];
  onClose: () => void;
  onPick: (uid: string, label: string) => void;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[70vh] w-full max-w-md overflow-y-auto rounded-t-3xl p-6"
        style={{ background: "var(--color-surface-raised)" }}
      >
        <h2 className="font-display text-lg font-semibold">Pick your one thing</h2>
        <div className="mt-4 space-y-2">
          {entries.filter((e) => e.task).map((e) => (
            <button
              key={e.uid}
              onClick={() => onPick(e.uid, e.task!.label)}
              className="flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left"
              style={{ borderColor: "var(--color-line)", background: "var(--color-surface)" }}
            >
              <IconFor name={e.task!.icon} size={16} color="var(--color-ember)" />
              <span className="text-sm">{e.task!.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
