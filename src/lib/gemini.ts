// The Gemini API key never lives here anymore — this just calls our own
// serverless function (api/gemini.ts), which holds the real key server-side.
// isGeminiConfigured is a non-secret UI hint (set VITE_GEMINI_ENABLED=true
// once you've set GEMINI_API_KEY on the server) so components can show/hide
// AI-powered UI without an extra network round trip.
export const isGeminiConfigured = (import.meta.env.VITE_GEMINI_ENABLED as string | undefined) === "true";

interface GeminiOptions {
  systemInstruction?: string;
  temperature?: number;
  maxOutputTokens?: number;
}

export async function askGemini(prompt: string, options: GeminiOptions = {}): Promise<string> {
  const res = await fetch("/api/gemini", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, ...options }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data?.error || `Gemini request failed (${res.status})`);
  }

  const text: string = data?.text ?? "";
  if (!text.trim()) {
    throw new Error("Gemini returned an empty response.");
  }

  return text.trim();
}
