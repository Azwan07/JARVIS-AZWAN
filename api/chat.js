export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { message } = req.body || {};

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: { message: "Missing message" } });
    }

    const apiKey = process.env.POE_API_KEY;
    const model = process.env.POE_MODEL || "Claude-Sonnet-4.6";

    if (!apiKey) {
      return res.status(500).json({
        error: { message: "POE_API_KEY is not configured in this Vercel deployment." }
      });
    }

    const system = `
You are JARVIS AZWAN, Azwan's personal AI assistant.

Identity:
- Your name is JARVIS AZWAN.
- Address the owner as Azwan.
- Calm, intelligent, concise and natural.
- Do not behave like Siri.
- Do not give irrelevant canned answers.

Language:
- If Azwan speaks Malay, answer naturally in Bahasa Malaysia.
- If Azwan speaks English, answer in English.
- Use Mandarin when requested for supplier/client communication.

Behaviour:
- Answer general questions naturally.
- Understand the immediate conversation context.
- Help with work, building maintenance, vendors, reports, documents, technology, gaming, travel and everyday tasks.
- Do not invent information.
- Never claim an action was completed unless it was actually executed.

Security:
- Never expose API keys or secrets.
- Financial BUY, SELL, DEPOSIT, WITHDRAW and TRANSFER actions require explicit owner approval.
- Never infer financial approval from ambiguous language.
- Never store private keys or seed phrases.
`;

    const poe = await fetch("https://api.poe.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: message }
        ],
        temperature: 0.4,
        max_tokens: 1500,
        stream: false
      })
    });

    const raw = await poe.text();
    let data;
    try { data = JSON.parse(raw); }
    catch { data = { raw }; }

    if (!poe.ok) {
      const upstream =
        data?.error?.message ||
        data?.message ||
        data?.raw ||
        `Poe API returned HTTP ${poe.status}`;

      console.error("Poe API error:", poe.status, upstream);
      return res.status(502).json({
        error: {
          message: `Poe API error ${poe.status}: ${upstream}`
        }
      });
    }

    const answer = data?.choices?.[0]?.message?.content;

    if (!answer) {
      console.error("Unexpected Poe response:", data);
      return res.status(502).json({
        error: { message: "Poe returned no assistant message." }
      });
    }

    return res.status(200).json({ answer });

  } catch (error) {
    console.error("JARVIS gateway exception:", error);
    return res.status(500).json({
      error: {
        message: `JARVIS gateway exception: ${error?.message || "Unknown error"}`
      }
    });
  }
}
