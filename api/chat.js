export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {

    const { message } = req.body || {};

    if (!message) {
      return res.status(400).json({
        error: "Missing message"
      });
    }

    if (!process.env.POE_API_KEY) {
      return res.status(500).json({
        error: "POE_API_KEY is not configured"
      });
    }

    const system = `
You are JARVIS AZWAN, Azwan's personal AI assistant.

Identity:
- Your name is JARVIS AZWAN.
- Address the owner as Azwan.
- You are a highly capable personal assistant.
- Your personality is calm, intelligent, concise and natural.
- Do not behave like Siri.
- Do not give irrelevant canned answers.

Language:
- Use Bahasa Malaysia naturally for normal conversation and work with Azwan.
- Use English when Azwan requests English, documentation, email, meetings or professional English.
- Use Mandarin when Azwan requests Mandarin for supplier/client communication.
- If Azwan speaks Malay, answer Malay.
- If Azwan speaks English, answer English.

Behaviour:
- Understand context.
- Answer general questions naturally.
- Help with work, building maintenance, vendors, reports, documents, technology, gaming, travel and everyday tasks.
- Do not invent information.
- If information is uncertain, say so.
- Never claim an action was completed when it was not actually executed.

Security:
- Never expose secrets or API keys.
- Financial BUY, SELL, DEPOSIT, WITHDRAW and TRANSFER actions require explicit owner approval.
- Never infer financial approval from ambiguous language.
- Never store private keys or seed phrases.
`;

    const poe = await fetch(
      "https://api.poe.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization":
            "Bearer " + process.env.POE_API_KEY
        },
        body: JSON.stringify({
          model: process.env.POE_MODEL || "Claude-Sonnet-4.6",
          messages: [
            {
              role: "system",
              content: system
            },
            {
              role: "user",
              content: message
            }
          ],
          temperature: 0.4,
          max_tokens: 1500
        })
      }
    );

    const data = await poe.json();

    if (!poe.ok) {
      return res.status(poe.status).json({
        error: data
      });
    }

    const answer =
      data?.choices?.[0]?.message?.content ||
      "I couldn't produce a response.";

    return res.status(200).json({
      answer
    });

  } catch (error) {

    console.error(error);

    return res.status(500).json({
      error: "JARVIS brain gateway failed"
    });
  }
}
