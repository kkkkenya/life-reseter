import { supabase, isSupabaseConfigured } from "./supabase";
import type { UserProfile } from "@/types";

export { isSupabaseConfigured };

const TABLE = "life_reset_profiles";

/**
 * Fetches the signed-in user's saved profile blob, if one exists yet.
 * Returns null when Supabase isn't configured, the request fails, or no row exists.
 */
export async function pullProfile(userId: string): Promise<UserProfile | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from(TABLE)
    .select("data")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Supabase pull failed:", error.message);
    return null;
  }
  return (data?.data as UserProfile) ?? null;
}

/**
 * Upserts the full profile blob for the signed-in user.
 * Returns true on success, false on any failure (network, RLS, etc.) — callers
 * surface this as a sync-status indicator rather than blocking the UI.
 */
export async function pushProfile(userId: string, profile: UserProfile): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase
    .from(TABLE)
    .upsert({ user_id: userId, data: profile, updated_at: new Date().toISOString() }, { onConflict: "user_id" });

  if (error) {
    console.error("Supabase push failed:", error.message);
    return false;
  }
  return true;
}
