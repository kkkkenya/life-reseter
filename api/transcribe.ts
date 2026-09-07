// POST /api/transcribe — short voice answer -> text, via Gemini audio input.
// Powers the "record instead" fallback in the poster-clarification flow for
// browsers without SpeechRecognition (Firefox, iOS Safari). Same key rules as
// api/gemini.ts: GEMINI_API_KEY never leaves the server. Audio is transcribed
// once and never stored.
const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";

const MAX_BASE64_CHARS = 2_000_000; // ~1.5MB ≈ 60-90s of compressed speech
const ALLOWED_MIME = new Set([
  "audio/webm",
  "audio/mp4",
  "audio/mpeg",
  "audio/ogg",
  "audio/wav",
  "audio/x-m4a",
]);

function stripFences(s: string): string {
  const t = s.trim();
  if (!t.startsWith("```")) return t;
  return t.replace(/^```[a-zA-Z]*\s*/, "").replace(/\s*```\s*$/, "").trim();
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  if (!API_KEY) {
    res.status(501).json({ error: "Gemini isn't configured on the server (GEMINI_API_KEY missing)." });
    return;
  }
  const { audioBase64, mimeType } = req.body ?? {};
  if (typeof audioBase64 !== "string" || audioBase64.length < 1000) {
    res.status(400).json({ error: "No audio received. Try recording again." });
    return;
  }
  if (audioBase64.length > MAX_BASE64_CHARS) {
    res.status(413).json({ error: "Recording is too long — keep answers under a minute." });
    return;
  }
  if (typeof mimeType !== "string" || !ALLOWED_MIME.has(mimeType)) {
    res.status(400).json({ error: "Unsupported audio format from this browser." });
    return;
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;
    const upstream = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: 'Transcribe this short spoken answer verbatim (English). Respond with JSON ONLY, no markdown: {"transcript":string}. If there is no intelligible speech, use an empty string.',
              },
              { inline_data: { mime_type: mimeType, data: audioBase64 } },
            ],
          },
        ],
        generationConfig: { temperature: 0, maxOutputTokens: 300, thinkingConfig: { thinkingLevel: "low" } },
      }),
    });
    const data = await upstream.json();
    if (!upstream.ok) {
      res.status(upstream.status).json({ error: data?.error?.message || "Gemini API error" });
      return;
    }
    const text: string =
      data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";
    let transcript = "";
    try {
      const parsed = JSON.parse(stripFences(text));
      if (typeof parsed?.transcript === "string") transcript = parsed.transcript.trim().slice(0, 300);
    } catch {
      transcript = text.trim().slice(0, 300); // model answered in plain text — still usable
    }
    if (!transcript) {
      res.status(502).json({ error: "Didn't catch that — try again or type it." });
      return;
    }
    res.status(200).json({ transcript });
  } catch {
    res.status(502).json({ error: "Failed to reach Gemini" });
  }
}
