exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const body = JSON.parse(event.body);
    const apiKey = process.env.GROQ_API_KEY;

    // Hesapta aktif olan modelleri otomatik sorgula
    const modelsRes = await fetch("https://api.groq.com/openai/v1/models", {
      headers: { "Authorization": `Bearer ${apiKey}` }
    });
    const modelsData = await modelsRes.json();

    if (!modelsRes.ok) {
      return {
        statusCode: modelsRes.status,
        body: JSON.stringify(modelsData)
      };
    }

    // Whisper (ses) modellerini eleyip ilk uygun sohbet modelini seç
    const chatModel = modelsData.data.find(m => !m.id.includes("whisper") && !m.id.includes("guard"))?.id || body.model;
    body.model = chatModel;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    return {
      statusCode: response.status,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
