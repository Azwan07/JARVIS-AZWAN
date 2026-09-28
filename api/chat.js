export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: { message: "Method not allowed" }
    });
  }

  try {
    const { message } = req.body || {};

    if (!message || typeof message !== "string") {
      return res.status(400).json({
        error: { message: "Missing message" }
      });
    }

    const apiKey = (
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      ""
    ).trim();

    const primaryModel = (
      process.env.GEMINI_MODEL ||
      "gemini-3.8-flash"
    ).trim();

    const fallbackModel = (
      process.env.GEMINI_FALLBACK_MODEL ||
      "gemini-2.5-flash"
    ).trim();

    if (!apiKey) {
      return res.status(500).json({
        error: { message: "JARVIS gateway has no Gemini API key configured." }
      });
    }

    const system = `
You are JARVIS AZWAN, Azwan's personal AI assistant.

IDENTITY
- Your name is JARVIS AZWAN.
- Address the owner as Azwan.
- Calm, intelligent, concise and natural.
- Do not behave like Siri.

LANGUAGE
- If Azwan speaks Malay, answer naturally in Bahasa Malaysia.
- If Azwan speaks English, answer in English.
- Use Mandarin when requested.

BEHAVIOUR
- Answer questions naturally.
- Understand conversation context.
- Help with work, building maintenance, vendors, reports,
  documents, technology, gaming, travel and everyday tasks.
- Do not invent information.
- Never claim an action was completed unless it was actually executed.

SECURITY
- Never expose API keys or secrets.
- Financial BUY, SELL, DEPOSIT, WITHDRAW and TRANSFER actions
  require explicit owner approval.
- Never infer financial approval from ambiguous language.
`;

    const body = JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: message }] }],
      generationConfig: { maxOutputTokens: 1500 }
    });

    async function callGemini(model) {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey
          },
          body
        }
      );

      const raw = await response.text();
      let data;
      try {
        data = JSON.parse(raw);
      } catch {
        data = { raw };
      }
      return { response, data };
    }

    const wait = ms => new Promise(r => setTimeout(r, ms));
    const RETRY_STATUS = [429, 500, 503, 504];

    // Try primary model twice, then the fallback model once.
    const plan = [primaryModel, primaryModel, fallbackModel];

    let last = null;
    let usedModel = primaryModel;

    for (let i = 0; i < plan.length; i++) {
      usedModel = plan[i];
      last = await callGemini(usedModel);

      if (last.response.ok) break;

      console.error(
        "Gemini API error:",
        usedModel,
        last.response.status
      );

      if (!RETRY_STATUS.includes(last.response.status)) break;

      if (i < plan.length - 1) await wait(700);
    }

    const { response, data } = last;

    if (!response.ok) {
      const upstream =
        data?.error?.message ||
        data?.message ||
        data?.raw ||
        `Gemini API returned HTTP ${response.status}`;

      return res.status(502).json({
        error: {
          message: `Gemini API error ${response.status} (${usedModel}): ${upstream}`
        }
      });
    }

    const answer =
      data?.candidates?.[0]?.content?.parts
        ?.filter(part => typeof part?.text === "string")
        ?.map(part => part.text)
        ?.join("") || "";

    if (!answer) {
      console.error("Unexpected Gemini response:", data);
      return res.status(502).json({
        error: { message: "Gemini returned no assistant message." }
      });
    }

    return res.status(200).json({ answer });

  } catch (error) {
    console.error("JARVIS gateway exception:", error);
    return res.status(502).json({
      error: {
        message: `JARVIS gateway exception: ${error?.message || "Unknown error"}`
      }
    });
  }
}
