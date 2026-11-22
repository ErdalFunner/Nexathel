exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const body = JSON.parse(event.body);
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          choices: [{ message: { content: "HATA: GEMINI_API_KEY bulunamadı. Netlify Environment Variables kısmını kontrol et." } }]
        })
      };
    }

    const systemMsg = body.messages.find(m => m.role === "system")?.content || "";
    const userMsg = body.messages.find(m => m.role === "user")?.content || "";

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
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

    if (!response.ok) {
      const errMsg = data.error?.message || JSON.stringify(data);
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          choices: [{ message: { content: "API HATASI: " + errMsg } }]
        })
      };
    }

    const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || "Yanıt üretilemedi.";

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        choices: [{ message: { content: replyText } }]
      })
    };
  } catch (error) {
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        choices: [{ message: { content: "SUNUCU HATASI: " + error.message } }]
      })
    };
  }
};
