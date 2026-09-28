export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: {
        message: "Method not allowed"
      }
    });
  }

  try {
    const { message } = req.body || {};

    if (!message || typeof message !== "string") {
      return res.status(400).json({
        error: {
          message: "Missing message"
        }
      });
    }

    const apiKey = (
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      ""
    ).trim();

    if (!apiKey) {
      return res.status(500).json({
        error: {
          message:
            "JARVIS gateway has no Gemini API key configured."
        }
      });
    }

    const preferredModel = (
      process.env.GEMINI_MODEL ||
      "gemini-3.8-flash"
    ).trim();

    /*
     * Primary model first.
     * If Google returns temporary capacity errors,
     * automatically try the next available model.
     */
    const models = [
      preferredModel,
      "gemini-3.7-flash",
      "gemini-3.6-flash",
      "gemini-3.5-flash-lite"
    ].filter(
      (model, index, array) =>
        array.indexOf(model) === index
    );

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

    let lastError = null;

    for (const model of models) {

      /*
       * Try the model.
       */
      let response;

      try {

        response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
            model
          )}:generateContent`,
          {
            method: "POST",

            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": apiKey
            },

            body: JSON.stringify({
              systemInstruction: {
                parts: [
                  {
                    text: system
                  }
                ]
              },

              contents: [
                {
                  role: "user",
                  parts: [
                    {
                      text: message
                    }
                  ]
                }
              ],

              generationConfig: {
                maxOutputTokens: 1500
              }
            })
          }
        );

      } catch (networkError) {

        lastError = networkError;

        console.error(
          "Gemini network error:",
          model,
          networkError
        );

        continue;
      }


      const raw =
        await response.text();

      let data;

      try {
        data = JSON.parse(raw);
      } catch {
        data = {
          raw
        };
      }


      /*
       * SUCCESS
       */
      if (response.ok) {

        const answer =
          data?.candidates?.[0]?.content?.parts
            ?.filter(
              part =>
                typeof part?.text === "string"
            )
            ?.map(
              part => part.text
            )
            ?.join("") || "";


        if (answer) {

          console.log(
            "JARVIS Gemini model:",
            model
          );

          return res.status(200).json({
            answer,
            model
          });
        }


        lastError =
          new Error(
            "Gemini returned no assistant message."
          );

        continue;
      }


      const upstream =
        data?.error?.message ||
        data?.message ||
        data?.raw ||
        `Gemini API returned HTTP ${response.status}`;


      lastError =
        new Error(
          `Gemini API error ${response.status}: ${upstream}`
        );


      console.error(
        "Gemini API error:",
        model,
        response.status,
        upstream
      );


      /*
       * 503 = temporary overload.
       * 429 = rate/capacity limit.
       *
       * Automatically try another model.
       */
      if (
        response.status === 503 ||
        response.status === 429
      ) {

        continue;
      }


      /*
       * Other errors are normally configuration,
       * authentication, request, or permission
       * problems. Don't hide them behind another
       * model attempt.
       */
      return res.status(502).json({
        error: {
          message:
            `Gemini API error ${response.status}: ${upstream}`
        }
      });
    }


    /*
     * Every fallback model failed.
     */
    return res.status(503).json({
      error: {
        message:
          lastError?.message ||
          "All Gemini models are temporarily unavailable."
      }
    });


  } catch (error) {

    console.error(
      "JARVIS gateway exception:",
      error
    );

    return res.status(502).json({
      error: {
        message:
          `JARVIS gateway exception: ${
            error?.message ||
            "Unknown error"
          }`
      }
    });
  }
}
