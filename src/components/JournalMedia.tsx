import { useEffect, useState } from "react";
import { Loader2, Mic, X } from "lucide-react";
import { getMediaBlob } from "@/lib/mediaStore";
import type { JournalMediaRef } from "@/types";

function useBlobUrl(id: string): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    let created: string | null = null;
    getMediaBlob(id)
      .then((blob) => {
        if (alive && blob) {
          created = URL.createObjectURL(blob);
          setUrl(created);
        }
      })
      .catch(() => {
        /* missing blob renders as nothing */
      });
    return () => {
      alive = false;
      if (created) URL.revokeObjectURL(created);
    };
  }, [id]);
  return url;
}

function PhotoThumb({ ref, onOpen, onRemove }: { ref: JournalMediaRef; onOpen: () => void; onRemove: () => void }) {
  const url = useBlobUrl(ref.id);
  if (!url) return null;
  return (
    <div className="relative">
      <button onClick={onOpen} className="block overflow-hidden rounded-xl" style={{ border: "1px solid var(--color-line)" }}>
        <img src={url} alt="Journal photo" className="h-20 w-20 object-cover" loading="lazy" />
      </button>
      <button
        onClick={onRemove}
        aria-label="Remove photo"
        className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full"
        style={{ background: "var(--color-ink)", color: "#fbf3e7" }}
      >
        <X size={12} />
      </button>
    </div>
  );
}

function AudioNote({
  ref,
  onRemove,
  onTranscribe,
  transcribing,
}: {
  ref: JournalMediaRef;
  onRemove: () => void;
  onTranscribe: () => void;
  transcribing: boolean;
}) {
  const url = useBlobUrl(ref.id);
  return (
    <div className="rounded-xl border p-2.5" style={{ borderColor: "var(--color-line)", background: "var(--color-surface)" }}>
      <div className="flex items-center gap-2">
        <Mic size={14} color="var(--color-ember)" />
        <span className="text-xs font-semibold" style={{ color: "var(--color-ink-dim)" }}>
          Voice note
          {typeof ref.durationSec === "number" ? ` · ${Math.round(ref.durationSec)}s` : ""}
        </span>
        <button onClick={onRemove} aria-label="Remove voice note" className="ml-auto">
          <X size={14} color="var(--color-ink-faint)" />
        </button>
      </div>
      {url ? (
        <audio controls src={url} className="mt-2 w-full" style={{ height: 32 }} preload="metadata" />
      ) : (
        <p className="mt-2 flex items-center gap-1.5 text-xs" style={{ color: "var(--color-ink-faint)" }}>
          <Loader2 size={12} className="animate-spin" /> Loading…
        </p>
      )}
      <button
        onClick={onTranscribe}
        disabled={transcribing || !url}
        className="mt-1.5 text-xs font-semibold disabled:opacity-50"
        style={{ color: "var(--color-ember)" }}
      >
        {transcribing ? "Transcribing…" : "Transcribe into text"}
      </button>
    </div>
  );
}

function Lightbox({ id, onClose }: { id: string; onClose: () => void }) {
  const url = useBlobUrl(id);
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      {url && <img src={url} alt="Journal photo full view" className="max-h-full max-w-full rounded-xl object-contain" />}
      <button
        onClick={onClose}
        aria-label="Close"
        className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/90"
      >
        <X size={16} color="#4a3327" />
      </button>
    </div>
  );
}

export function JournalMediaGrid({
  media,
  transcribingId,
  onRemove,
  onTranscribe,
}: {
  media: JournalMediaRef[];
  transcribingId: string | null;
  onRemove: (id: string) => void;
  onTranscribe: (ref: JournalMediaRef) => void;
}) {
  const [lightbox, setLightbox] = useState<string | null>(null);
  const photos = media.filter((m) => m.kind === "photo");
  const audios = media.filter((m) => m.kind === "audio");
  if (media.length === 0) return null;
  return (
    <div>
      {photos.length > 0 && (
        <div className="flex flex-wrap gap-2.5">
          {photos.map((m) => (
            <PhotoThumb key={m.id} ref={m} onOpen={() => setLightbox(m.id)} onRemove={() => onRemove(m.id)} />
          ))}
        </div>
      )}
      {audios.length > 0 && (
        <div className={(photos.length > 0 ? "mt-2.5 " : "") + "space-y-2"}>
          {audios.map((m) => (
            <AudioNote
              key={m.id}
              ref={m}
              onRemove={() => onRemove(m.id)}
              onTranscribe={() => onTranscribe(m)}
              transcribing={transcribingId === m.id}
            />
          ))}
        </div>
      )}
      {lightbox && <Lightbox id={lightbox} onClose={() => setLightbox(null)} />}
    </div>
  );
}
