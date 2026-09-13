import { useState } from "react";
import { Camera, Check, Trash2, X } from "lucide-react";
import { Card, PrimaryButton, GhostButton } from "@/components/ui";
import { useAppStore } from "@/store/useAppStore";
import { WEEKDAY_SHORT } from "@/lib/school";

/**
 * School — intentionally not a tab. A timetable is a one-off import (photo →
 * reviewed session list) plus the occasional deadline; after that the data
 * lives where it's used: Today's "Coming Up" and the schedule views.
 */

interface ScannedClass {
  course: string;
  weekday: number;
  startTime: string;
  endTime: string;
  venue: string | null;
  lecturer: string | null;
}

const inputStyle: React.CSSProperties = {
  borderColor: "var(--color-line)",
  background: "var(--color-surface-raised)",
  color: "var(--color-ink)",
};

export function SchoolImport() {
  const profile = useAppStore((s) => s.profile);
  const addClassSession = useAppStore((s) => s.addClassSession);
  const removeClassSession = useAppStore((s) => s.removeClassSession);
  const addDeadline = useAppStore((s) => s.addDeadline);
  const toggleDeadlineDone = useAppStore((s) => s.toggleDeadlineDone);
  const removeDeadline = useAppStore((s) => s.removeDeadline);

  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanned, setScanned] = useState<ScannedClass[] | null>(null);
  const [addedCount, setAddedCount] = useState<number | null>(null);

  const [dTitle, setDTitle] = useState("");
  const [dDate, setDDate] = useState(new Date().toISOString().slice(0, 10));
  const [dTime, setDTime] = useState("");

  async function handleScan(file: File | undefined) {
    if (!file) return;
    setScanError(null);
    setScanned(null);
    setAddedCount(null);
    setScanning(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const parts = typeof reader.result === "string" ? reader.result.split(",") : [];
          if (parts[1]) resolve(parts[1]);
          else reject(new Error("Couldn't read that image."));
        };
        reader.onerror = () => reject(new Error("Couldn't read that image."));
        reader.readAsDataURL(file);
      });
      const res = await fetch("/api/parse-timetable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mimeType: file.type || "image/jpeg" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Couldn't read that timetable.");
      const sessions: ScannedClass[] = Array.isArray(data?.sessions) ? data.sessions : [];
      if (sessions.length === 0) throw new Error("No class rows found — try a clearer, straight-on photo.");
      setScanned(sessions);
    } catch (e) {
      setScanError(e instanceof Error ? e.message : "Scan failed.");
    } finally {
      setScanning(false);
    }
  }

  function addAllScanned() {
    if (!scanned) return;
    for (const s of scanned) {
      addClassSession({
        course: s.course,
        weekday: s.weekday,
        startTime: s.startTime,
        endTime: s.endTime,
        venue: s.venue ?? undefined,
        lecturer: s.lecturer ?? undefined,
      });
    }
    setAddedCount(scanned.length);
    setScanned(null);
  }

  function submitDeadline() {
    if (!dTitle.trim()) return;
    addDeadline({ title: dTitle.trim(), course: undefined, dueDate: dDate, dueTime: dTime.trim() || undefined });
    setDTitle("");
    setDTime("");
  }

  const openDeadlines = [...profile.deadlines]
    .filter((d) => !d.done)
    .sort((a, b) => `${a.dueDate} ${a.dueTime ?? ""}`.localeCompare(`${b.dueDate} ${b.dueTime ?? ""}`));

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-ink-dim)" }}>
          Class timetable
        </p>
        <p className="mt-1 text-xs" style={{ color: "var(--color-ink-dim)" }}>
          Import once per semester — a photo of your timetable fills Today's "Coming Up" for the rest of it. The image is read once, never stored.
        </p>
        <Card className="mt-2">
          {scanning ? (
            <p className="py-4 text-center text-sm" style={{ color: "var(--color-ink-dim)" }}>
              Reading your timetable…
            </p>
          ) : (
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed py-4 text-sm font-medium" style={{ borderColor: "var(--color-line)", color: "var(--color-ink-dim)" }}>
              <Camera size={16} /> Upload a timetable photo
              <input type="file" accept="image/*" className="hidden" onChange={(e) => { void handleScan(e.target.files?.[0]); e.target.value = ""; }} />
            </label>
          )}
          {scanError && (
            <p className="mt-2 text-xs" style={{ color: "var(--color-bad)" }}>{scanError}</p>
          )}
          {scanned && (
            <div className="mt-3 space-y-2 border-t pt-3" style={{ borderColor: "var(--color-line)" }}>
              {scanned.map((s, i) => (
                <div key={i} className="flex items-center justify-between gap-2 text-sm">
                  <span className="font-mono text-xs" style={{ color: "var(--color-ember)" }}>
                    {WEEKDAY_SHORT[s.weekday]} {s.startTime}–{s.endTime}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{s.course}{s.venue ? ` · ${s.venue}` : ""}</span>
                  <button onClick={() => setScanned(scanned.filter((_, idx) => idx !== i))} aria-label="Drop this session">
                    <X size={14} color="var(--color-ink-faint)" />
                  </button>
                </div>
              ))}
              <div className="flex gap-2 pt-1">
                <PrimaryButton onClick={addAllScanned}>
                  <span className="flex items-center justify-center gap-1.5">
                    <Check size={14} /> Add all {scanned.length}
                  </span>
                </PrimaryButton>
                <GhostButton onClick={() => setScanned(null)}>Discard</GhostButton>
              </div>
            </div>
          )}
          {addedCount !== null && (
            <p className="mt-2 text-xs" style={{ color: "var(--color-good)" }}>
              Added {addedCount} sessions. They now show in Today → Coming Up.
            </p>
          )}
          {profile.classes.length > 0 && (
            <div className="mt-3 space-y-1.5 border-t pt-3" style={{ borderColor: "var(--color-line)" }}>
              {profile.classes.map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="font-mono text-xs" style={{ color: "var(--color-ink-dim)" }}>
                    {WEEKDAY_SHORT[c.weekday]} {c.startTime}–{c.endTime}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{c.course}</span>
                  <button onClick={() => removeClassSession(c.id)} aria-label={`Remove ${c.course}`}>
                    <Trash2 size={13} color="var(--color-ink-faint)" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-ink-dim)" }}>
          Deadlines
        </p>
        <p className="mt-1 text-xs" style={{ color: "var(--color-ink-dim)" }}>
          Assignment due dates — they surface in Today automatically as they approach.
        </p>
        <Card className="mt-2">
          <div className="flex gap-2">
            <input
              value={dTitle}
              onChange={(e) => setDTitle(e.target.value)}
              placeholder="e.g. Lab report 2"
              className="flex-1 rounded-xl border px-3 py-2 text-sm outline-none"
              style={inputStyle}
            />
            <input type="date" value={dDate} onChange={(e) => setDDate(e.target.value)} className="w-36 rounded-xl border px-3 py-2 text-sm outline-none" style={inputStyle} />
            <input type="time" value={dTime} onChange={(e) => setDTime(e.target.value)} className="w-28 rounded-xl border px-3 py-2 text-sm outline-none" style={inputStyle} />
          </div>
          <div className="mt-2">
            <PrimaryButton disabled={!dTitle.trim()} onClick={submitDeadline}>Add deadline</PrimaryButton>
          </div>
          {openDeadlines.length > 0 && (
            <div className="mt-3 space-y-1.5 border-t pt-3" style={{ borderColor: "var(--color-line)" }}>
              {openDeadlines.map((d) => (
                <div key={d.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="font-mono text-xs" style={{ color: "var(--color-bad)" }}>
                    {d.dueDate}{d.dueTime ? ` ${d.dueTime}` : ""}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{d.title}</span>
                  <button onClick={() => toggleDeadlineDone(d.id)} className="text-xs font-semibold" style={{ color: "var(--color-good)" }}>
                    Done
                  </button>
                  <button onClick={() => removeDeadline(d.id)} aria-label={`Remove ${d.title}`}>
                    <Trash2 size={13} color="var(--color-ink-faint)" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
