exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const body = JSON.parse(event.body);
    const apiKey = process.env.GEMINI_API_KEY;
    const systemMsg = (body.messages.find(m => m.role === "system")?.content || "") + "\n\nÖnemli: Kısa ve tamamlanmış cümlelerle cevap ver.";
    const userMsg = body.messages.find(m => m.role === "user")?.content || "";

    // Yoğunluk (high demand) durumunda otomatik olarak bir sonraki aktif modele geçer
    const models = ["gemini-3.5-flash-lite", "gemini-3.5-flash", "gemini-3.8-flash"];

    for (const model of models) {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemMsg }] },
            contents: [{ role: "user", parts: [{ text: userMsg }] }]
          })
        }
      );

      const data = await response.json();

      if (response.ok) {
        const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || "Yanıt üretilemedi.";
        return {
          statusCode: 200,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ choices: [{ message: { content: replyText } }] })
        };
      }
    }

    return {
      statusCode: 503,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Sunucular şu an yoğun, lütfen biraz sonra tekrar dene." })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: error.message })
    };
  }
};
