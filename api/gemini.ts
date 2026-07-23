// Runs on Vercel's server, never in the browser. GEMINI_API_KEY (no VITE_
// prefix) is only readable here via process.env — Vite never inlines
// non-VITE_-prefixed vars into the client bundle, so this key cannot end up
// in anyone's dev tools or the deployed JS bundle.
const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  if (!API_KEY) {
    res.status(501).json({ error: "Gemini isn't configured on the server (GEMINI_API_KEY missing)." });
    return;
  }

  const { prompt, systemInstruction, temperature, maxOutputTokens } = req.body ?? {};
  if (!prompt || typeof prompt !== "string") {
    res.status(400).json({ error: "Missing prompt" });
    return;
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;
    const body = {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      ...(systemInstruction ? { systemInstruction: { parts: [{ text: systemInstruction }] } } : {}),
      generationConfig: {
        temperature: temperature ?? 0.8,
        maxOutputTokens: maxOutputTokens ?? 350,
        thinkingConfig: { thinkingLevel: "low" },
      },
    };

    const upstream = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await upstream.json();

    if (!upstream.ok) {
      res.status(upstream.status).json({ error: data?.error?.message || "Gemini API error" });
      return;
    }

    const text: string =
      data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";

    if (!text.trim()) {
      const blockReason = data?.promptFeedback?.blockReason;
      res.status(502).json({ error: blockReason ? `Gemini blocked the request: ${blockReason}` : "Gemini returned an empty response." });
      return;
    }

    res.status(200).json({ text: text.trim() });
  } catch {
    res.status(502).json({ error: "Failed to reach Gemini" });
  }
}
