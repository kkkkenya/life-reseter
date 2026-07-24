import { useState } from "react";
import { Lock } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Card, PrimaryButton, GhostButton, ScreenShell } from "@/components/ui";

type Mode = "signIn" | "signUp";

export default function SignIn() {
  const [mode, setMode] = useState<Mode>("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleSubmit() {
    if (!supabase || !email.trim() || !password) return;
    setSubmitting(true);
    setError(null);
    setNotice(null);

    if (mode === "signUp") {
      const { error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });
      setSubmitting(false);
      if (signUpError) {
        setError(signUpError.message);
        return;
      }
      // With email confirmation disabled in Supabase, signUp already returns a live
      // session and App.tsx picks it up via onAuthStateChange — nothing else to do here.
      // If confirmation is ever re-enabled on the Supabase side, surface that instead:
      setNotice("Account created. If you don't land in the app automatically, sign in below.");
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setSubmitting(false);
    if (signInError) setError(signInError.message);
  }

  return (
    <ScreenShell>
      <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
        <div
          className="flex h-14 w-14 items-center justify-center rounded-2xl"
          style={{ background: "var(--color-surface)" }}
        >
          <Lock size={24} color="var(--color-ember)" />
        </div>
        <div>
          <h1 className="font-display text-xl font-semibold" style={{ color: "var(--color-ink)" }}>
            {mode === "signIn" ? "Sign in to sync" : "Create an account"}
          </h1>
          <p className="mt-2 text-sm" style={{ color: "var(--color-ink-dim)" }}>
            Keeps your progress the same across every device.
          </p>
        </div>

        <div className="flex w-full flex-col gap-3">
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
            className="w-full rounded-full border px-5 py-4 text-center text-[15px] outline-none"
            style={{ background: "var(--color-surface)", color: "var(--color-ink)", borderColor: "var(--color-line)" }}
          />
          <input
            type="password"
            autoComplete={mode === "signIn" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="Password"
            className="w-full rounded-full border px-5 py-4 text-center text-[15px] outline-none"
            style={{ background: "var(--color-surface)", color: "var(--color-ink)", borderColor: "var(--color-line)" }}
          />

          <PrimaryButton onClick={handleSubmit} disabled={submitting || !email.trim() || !password}>
            {submitting ? "Please wait…" : mode === "signIn" ? "Sign in" : "Create account"}
          </PrimaryButton>

          <GhostButton
            onClick={() => {
              setMode(mode === "signIn" ? "signUp" : "signIn");
              setError(null);
              setNotice(null);
            }}
          >
            {mode === "signIn" ? "New here? Create an account" : "Already have an account? Sign in"}
          </GhostButton>

          {error && (
            <Card>
              <p className="text-xs" style={{ color: "var(--color-bad)" }}>
                {error}
              </p>
            </Card>
          )}
          {notice && (
            <Card>
              <p className="text-xs" style={{ color: "var(--color-ink)" }}>
                {notice}
              </p>
            </Card>
          )}
        </div>
      </div>
    </ScreenShell>
  );
}
