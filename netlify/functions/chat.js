exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const body = JSON.parse(event.body);
    const apiKey = process.env.GEMINI_API_KEY;

    const systemMsg = body.messages.find(m => m.role === "system")?.content || "";
    const userMsg = body.messages.find(m => m.role === "user")?.content || "";

    // En hızlı yanıt veren modelleri sırayla dene (10 sn Netlify sınırına takılmamak için)
    const modelsToTry = ["gemini-3.8-flash-lite", "gemini-3.8-flash", "gemini-2.5-flash-lite"];
    let lastError = "";

    for (const modelName of modelsToTry) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000); // Her model için max 8 sn bekle

      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: controller.signal,
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: systemMsg }] },
              contents: [{ role: "user", parts: [{ text: userMsg }] }]
            })
          }
        );
        clearTimeout(timeout);

        const data = await response.json();

        if (response.ok) {
          const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || "Yanıt üretilemedi.";
          return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              choices: [{ message: { content: replyText } }]
            })
          };
        }

        lastError = `${modelName}: ${data.error?.message || response.status}`;
      } catch (e) {
        clearTimeout(timeout);
        lastError = `${modelName}: Zaman aşımı veya bağlantı hatası`;
      }
    }

    // Hiçbiri çalışmazsa gerçek sebebi ekranda göster
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        choices: [{ message: { content: "API HATASI: " + lastError } }]
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
