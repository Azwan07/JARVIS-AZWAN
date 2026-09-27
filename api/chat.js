export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { message } = req.body || {};

    if (!message || typeof message !== "string") {
      return res.status(400).json({
        error: { message: "Missing message" }
      });
    }

    const apiKey = (process.env.GEMINI_API_KEY || "").trim();
    const model = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";

    if (!apiKey) {
      return res.status(500).json({
        error: {
          message: "GEMINI_API_KEY is not configured in this Vercel deployment."
        }
      });
    }

    const system = `
You are JARVIS AZWAN, Azwan's personal AI assistant.

Identity:
- Your name is JARVIS AZWAN.
- Address the owner as Azwan.
- Calm, intelligent, concise and natural.
- Do not behave like Siri.

Language:
- If Azwan speaks Malay, answer naturally in Bahasa Malaysia.
- If Azwan speaks English, answer in English.
- Use Mandarin when requested.

Behaviour:
- Answer questions naturally.
- Understand conversation context.
- Help with work, building maintenance, vendors, reports,
  documents, technology, gaming, travel and everyday tasks.
- Do not invent information.
- Never claim an action was completed unless it was actually executed.

Security:
- Never expose API keys or secrets.
- Financial BUY, SELL, DEPOSIT, WITHDRAW and TRANSFER actions
  require explicit owner approval.
- Never infer financial approval from ambiguous language.
`;

    const response = await fetch(
      \`https://generativelanguage.googleapis.com/v1beta/models/\${encodeURIComponent(model)}:generateContent\`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: system }]
          },
          contents: [
            {
              role: "user",
              parts: [{ text: message }]
            }
          ],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 1500
          }
        })
      }
    );

    const raw = await response.text();

    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      data = { raw };
    }

    if (!response.ok) {
      const upstream =
        data?.error?.message ||
        data?.message ||
        data?.raw ||
        \`Gemini API returned HTTP \${response.status}\`;

      console.error("Gemini API error:", response.status, upstream);

      return res.status(502).json({
        error: {
          message: \`Gemini API error \${response.status}: \${upstream}\`
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
        error: {
          message: "Gemini returned no assistant message."
        }
      });
    }

    return res.status(200).json({ answer });

  } catch (error) {
    console.error("JARVIS gateway exception:", error);

    return res.status(500).json({
      error: {
        message: \`JARVIS gateway exception: \${error?.message || "Unknown error"}\`
      }
    });
  }
}
