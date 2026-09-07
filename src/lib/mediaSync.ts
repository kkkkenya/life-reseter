import { isSupabaseConfigured, supabase } from "./supabase";
import { getMediaBlob, saveMediaBlob } from "./mediaStore";
import type { JournalMediaRef, UserProfile } from "@/types";

const BUCKET = "journal-media";

/** Storage path: "<userId>/<mediaId>" — matches the RLS folder policy in
 *  supabase/storage.sql, so a user can only ever touch their own folder. */
export function mediaRemotePath(userId: string, mediaId: string): string {
  return `${userId}/${mediaId}`;
}

function requireClient() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error("Cloud backup isn't set up on this device.");
  }
  return supabase;
}

/** Every media ref across all journal days, tagged with its day. */
export function collectJournalMedia(profile: UserProfile): { day: number; ref: JournalMediaRef }[] {
  const out: { day: number; ref: JournalMediaRef }[] = [];
  for (const entry of Object.values(profile.journal)) {
    for (const ref of entry.media ?? []) out.push({ day: entry.day, ref });
  }
  return out;
}

/** Refs whose blobs still need uploading. */
export function pendingMediaUploads(all: { ref: JournalMediaRef }[]): JournalMediaRef[] {
  return all.map((r) => r.ref).filter((r) => !r.remote);
}

export async function uploadMediaBlob(userId: string, ref: JournalMediaRef): Promise<void> {
  const client = requireClient();
  const blob = await getMediaBlob(ref.id);
  if (!blob) throw new Error("That file is gone from this device — nothing to back up.");
  const { error } = await client.storage
    .from(BUCKET)
    .upload(mediaRemotePath(userId, ref.id), blob, { upsert: true, contentType: blob.type || undefined });
  if (error) throw new Error(error.message);
}

export async function downloadMediaBlob(userId: string, ref: JournalMediaRef): Promise<void> {
  const client = requireClient();
  const { data, error } = await client.storage.from(BUCKET).download(mediaRemotePath(userId, ref.id));
  if (error || !data) throw new Error(error?.message || "Couldn't download that file.");
  await saveMediaBlob(ref.id, data);
}

/** Best-effort: a failed remote delete must never block removing the ref. */
export async function deleteRemoteMedia(userId: string, mediaId: string): Promise<void> {
  try {
    const client = requireClient();
    await client.storage.from(BUCKET).remove([mediaRemotePath(userId, mediaId)]);
  } catch {
    /* ignore — the ref is already gone locally */
  }
}
