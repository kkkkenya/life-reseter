import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export function useSupabaseAuth() {
  const [session, setSession] = useState<Session | null>(null);
  // If Supabase isn't configured at all, there's nothing to load — start settled.
  const [loading, setLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  async function signOut() {
    await supabase?.auth.signOut();
  }

  return { session, userId: session?.user.id, loading, isConfigured: isSupabaseConfigured, signOut };
}
