import { useState } from "react";
import { CalendarClock, Check, GraduationCap, Loader2, ScanLine, TimerOff, X } from "lucide-react";
import { Card, GhostButton, PrimaryButton } from "@/components/ui";
import { useAppStore } from "@/store/useAppStore";
import { useFeedback } from "@/hooks/useFeedback";
import { useGoogleCalendar } from "@/hooks/useGoogleCalendar";
import { downscalePhoto } from "@/lib/mediaStore";
import { WEEKDAY_SHORT } from "@/lib/school";
import type { ClassSession } from "@/types";

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Mon..Sun

interface ScannedClass {
  course: string;
  weekday: number;
  startTime: string;
  endTime: string;
  venue: string | null;
  lecturer: string | null;
}

function inputStyle(): React.CSSProperties {
  return {
    borderColor: "var(--color-line)",
    background: "var(--color-surface-raised)",
    color: "var(--color-ink)",
  };
}

/** School — timetable, deadlines, and the Google Calendar link. Feeds the
 *  Tomorrow + Rest-of-week sections in Today. */
export default function School() {
  const classes = useAppStore((s) => s.profile.classes);
  const deadlines = useAppStore((s) => s.profile.deadlines);
  const addClassSession = useAppStore((s) => s.addClassSession);
  const removeClassSession = useAppStore((s) => s.removeClassSession);
  const addDeadline = useAppStore((s) => s.addDeadline);
  const toggleDeadlineDone = useAppStore((s) => s.toggleDeadlineDone);
  const removeDeadline = useAppStore((s) => s.removeDeadline);
  const feedback = useFeedback();
  const gcal = useGoogleCalendar();

  const [course, setCourse] = useState("");
  const [weekday, setWeekday] = useState(1);
  const [start, setStart] = useState("08:00");
  const [end, setEnd] = useState("10:00");
  const [venue, setVenue] = useState("");
  const [lecturer, setLecturer] = useState("");

  const [dTitle, setDTitle] = useState("");
  const [dCourse, setDCourse] = useState("");
  const [dDate, setDDate] = useState(new Date().toISOString().slice(0, 10));
  const [dTime, setDTime] = useState("");

  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanned, setScanned] = useState<ScannedClass[] | null>(null);

  function submitClass() {
    if (!course.trim() || !(end > start)) return;
    addClassSession({
      course: course.trim().slice(0, 80),
      weekday,
      startTime: start,
      endTime: end,
      venue: venue.trim() || undefined,
      lecturer: lecturer.trim() || undefined,
    });
    setCourse("");
    setVenue("");
    setLecturer("");
    feedback.tap();
  }

  function submitDeadline() {
    if (!dTitle.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(dDate)) return;
    addDeadline({
      title: dTitle.trim().slice(0, 140),
      course: dCourse.trim() || undefined,
      dueDate: dDate,
      dueTime: dTime || undefined,
    });
    setDTitle("");
    setDCourse("");
    setDTime("");
    feedback.tap();
  }

  async function handleScan(file: File | undefined) {
    if (!file) return;
    setScanError(null);
    setScanned(null);
    setScanning(true);
    try {
      const small = await downscalePhoto(file, 1568, 0.82);
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const parts = typeof reader.result === "string" ? reader.result.split(",") : [];
          if (parts[1]) resolve(parts[1]);
          else reject(new Error("Couldn't read that photo."));
        };
        reader.onerror = () => reject(new Error("Couldn't read that photo."));
        reader.readAsDataURL(small);
      });
      const res = await fetch("/api/parse-timetable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mimeType: "image/jpeg" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Scan failed.");
      const list: ScannedClass[] = Array.isArray(data.sessions) ? data.sessions : [];
      if (list.length === 0) throw new Error("No classes found — try a clearer photo.");
      setScanned(list);
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
    setScanned(null);
    feedback.complete(null);
  }

  const openDeadlines = deadlines.filter((d) => !d.done);
  const doneDeadlines = deadlines.filter((d) => d.done);

  return (
    <div>
      {/* Google link */}
      <Card className="flex items-center justify-between py-3">
        <div className="flex items-center gap-2.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: gcal.connected ? "var(--color-good)" : "var(--color-bad)" }} />
          <div>
            <p className="text-sm font-semibold">Google Calendar</p>
            <p className="text-xs" style={{ color: "var(--color-ink-dim)" }}>
              {gcal.configured
                ? gcal.connected
                  ? "Connected — reads your events, adds on request"
                  : "Tap to connect (green dot, top right, works too)"
                : "Needs VITE_GOOGLE_CLIENT_ID to enable"}
            </p>
          </div>
        </div>
        {gcal.configured && !gcal.connected && (
          <button
            onClick={() => void gcal.connect()}
            disabled={gcal.busy}
            className="rounded-full px-3.5 py-2 text-xs font-semibold disabled:opacity-50"
            style={{ background: "var(--color-ember)", color: "#fbf3e7" }}
          >
            {gcal.busy ? "…" : "Connect"}
          </button>
        )}
      </Card>
      {gcal.error && (
        <p className="mt-1.5 text-xs" style={{ color: "var(--color-bad)" }}>{gcal.error}</p>
      )}

      {/* Timetable */}
      <p className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-ink-dim)" }}>
        Weekly timetable
      </p>
      {classes.length === 0 ? (
        <Card>
          <p className="flex items-center gap-2 text-sm" style={{ color: "var(--color-ink-dim)" }}>
            <GraduationCap size={15} /> No classes yet — add below or scan your timetable.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {DAY_ORDER.map((d) => {
            const day = classes.filter((c) => c.weekday === d);
            if (day.length === 0) return null;
            return (
              <Card key={d} className="py-3">
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-ember)" }}>
                  {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][d]}
                </p>
                {day.map((c: ClassSession) => (
                  <div key={c.id} className="flex items-center justify-between py-1">
                    <div>
                      <span className="font-mono text-xs" style={{ color: "var(--color-ink-dim)" }}>
                        {c.startTime}–{c.endTime}
                      </span>{" "}
                      <span className="text-sm font-medium">{c.course}</span>
                      {c.venue && <span className="text-xs" style={{ color: "var(--color-ink-dim)" }}> · {c.venue}</span>}
                    </div>
                    <button onClick={() => removeClassSession(c.id)} aria-label={`Remove ${c.course}`}>
                      <X size={15} color="var(--color-ink-faint)" />
                    </button>
                  </div>
                ))}
              </Card>
            );
          })}
        </div>
      )}

      <Card className="mt-3">
        <p className="text-sm font-semibold">Add a class</p>
        <input value={course} onChange={(e) => setCourse(e.target.value)} placeholder="Course e.g. EMT 204" maxLength={80} className="mt-2 w-full rounded-xl border px-3 py-2 text-sm outline-none" style={inputStyle()} />
        <div className="mt-2 flex gap-2">
          <select value={weekday} onChange={(e) => setWeekday(Number(e.target.value))} className="w-1/3 rounded-xl border px-2 py-2 text-sm outline-none" style={inputStyle()} aria-label="Day">
            {DAY_ORDER.map((d) => (
              <option key={d} value={d}>{WEEKDAY_SHORT[d]}</option>
            ))}
          </select>
          <input type="time" value={start} onChange={(e) => setStart(e.target.value)} className="w-1/3 rounded-xl border px-2 py-2 text-sm outline-none" style={inputStyle()} aria-label="Start" />
          <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="w-1/3 rounded-xl border px-2 py-2 text-sm outline-none" style={inputStyle()} aria-label="End" />
        </div>
        <div className="mt-2 flex gap-2">
          <input value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="Venue (optional)" maxLength={80} className="w-1/2 rounded-xl border px-3 py-2 text-sm outline-none" style={inputStyle()} />
          <input value={lecturer} onChange={(e) => setLecturer(e.target.value)} placeholder="Lecturer (optional)" maxLength={80} className="w-1/2 rounded-xl border px-3 py-2 text-sm outline-none" style={inputStyle()} />
        </div>
        {start && end && !(end > start) && (
          <p className="mt-1.5 text-xs" style={{ color: "var(--color-bad)" }}>End must be after start.</p>
        )}
        <div className="mt-3">
          <PrimaryButton disabled={!course.trim() || !(end > start)} onClick={submitClass}>Add class</PrimaryButton>
        </div>
      </Card>

      {/* Timetable scan */}
      <Card className="mt-3">
        <p className="flex items-center gap-1.5 text-sm font-semibold">
          <ScanLine size={14} color="var(--color-ember)" /> Scan timetable photo
        </p>
        <p className="mt-1 text-xs" style={{ color: "var(--color-ink-dim)" }}>
          Snap your class timetable — review what it finds, add them all at once.
        </p>
        <label className="tactile mt-2.5 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed py-2.5 text-xs font-semibold" style={{ borderColor: "var(--color-line)", color: "var(--color-ink-dim)" }}>
          {scanning ? <Loader2 size={13} className="animate-spin" /> : <ScanLine size={13} />}
          {scanning ? "Reading timetable…" : "Upload timetable photo"}
          <input type="file" accept="image/*" className="hidden" onChange={(e) => { void handleScan(e.target.files?.[0]); e.target.value = ""; }} />
        </label>
        {scanError && <p className="mt-1.5 text-xs" style={{ color: "var(--color-bad)" }}>{scanError}</p>}
        {scanned && (
          <div className="mt-2.5 space-y-1.5">
            {scanned.map((s, i) => (
              <div key={i} className="flex items-center justify-between gap-2 rounded-xl px-2.5 py-1.5" style={{ background: "var(--color-surface-raised)" }}>
                <p className="text-xs">
                  <span className="font-mono font-semibold">{WEEKDAY_SHORT[s.weekday]} {s.startTime}–{s.endTime}</span> · {s.course}
                  {s.venue ? ` · ${s.venue}` : ""}
                </p>
                <button onClick={() => setScanned(scanned.filter((_, j) => j !== i))} aria-label={`Drop ${s.course}`}>
                  <X size={13} color="var(--color-ink-faint)" />
                </button>
              </div>
            ))}
            <PrimaryButton onClick={addAllScanned}>Add all {scanned.length}</PrimaryButton>
          </div>
        )}
      </Card>

      {/* Deadlines */}
      <p className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-ink-dim)" }}>
        Deadlines
      </p>
      {openDeadlines.length === 0 && doneDeadlines.length === 0 ? (
        <Card>
          <p className="flex items-center gap-2 text-sm" style={{ color: "var(--color-ink-dim)" }}>
            <CalendarClock size={15} /> No deadlines. Assignments, exams, applications — park them here.
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {openDeadlines.map((d) => (
            <Card key={d.id} className="flex items-center gap-3 py-3">
              <button
                onClick={() => toggleDeadlineDone(d.id)}
                aria-label={`Mark ${d.title} done`}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2"
                style={{ borderColor: "var(--color-line)" }}
              >
                {d.done && <Check size={13} color="var(--color-good)" />}
              </button>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{d.title}</p>
                <p className="font-mono text-[11px]" style={{ color: "var(--color-bad)" }}>
                  {d.dueDate}{d.dueTime ? ` ${d.dueTime}` : ""}{d.course ? ` · ${d.course}` : ""}
                </p>
              </div>
              <button onClick={() => removeDeadline(d.id)} aria-label={`Remove ${d.title}`}>
                <X size={15} color="var(--color-ink-faint)" />
              </button>
            </Card>
          ))}
          {doneDeadlines.length > 0 && (
            <p className="flex items-center gap-1.5 pt-1 text-xs" style={{ color: "var(--color-good)" }}>
              <TimerOff size={12} /> {doneDeadlines.length} cleared — nice.
            </p>
          )}
        </div>
      )}
      <Card className="mt-3">
        <p className="text-sm font-semibold">Add a deadline</p>
        <input value={dTitle} onChange={(e) => setDTitle(e.target.value)} placeholder="e.g. Thermodynamics assignment 4" maxLength={140} className="mt-2 w-full rounded-xl border px-3 py-2 text-sm outline-none" style={inputStyle()} />
        <div className="mt-2 flex gap-2">
          <input value={dCourse} onChange={(e) => setDCourse(e.target.value)} placeholder="Course (optional)" maxLength={80} className="w-1/3 rounded-xl border px-3 py-2 text-sm outline-none" style={inputStyle()} />
          <input type="date" value={dDate} onChange={(e) => setDDate(e.target.value)} className="w-1/3 rounded-xl border px-2 py-2 text-sm outline-none" style={inputStyle()} aria-label="Due date" />
          <input type="time" value={dTime} onChange={(e) => setDTime(e.target.value)} className="w-1/3 rounded-xl border px-2 py-2 text-sm outline-none" style={inputStyle()} aria-label="Due time" />
        </div>
        <div className="mt-3 space-y-2">
          <PrimaryButton disabled={!dTitle.trim()} onClick={submitDeadline}>Add deadline</PrimaryButton>
          <GhostButton onClick={() => { setDTitle(""); setDCourse(""); setDTime(""); }}>Clear</GhostButton>
        </div>
      </Card>
    </div>
  );
}
