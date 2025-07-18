// api/gemini.js
// Прокладка: OpenAI формат -> Gemini API
// Ключ берём из переменной окружения GOOGLE_API_KEY (в Vercel)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 🔑 Ключ из переменной окружения (задать в Vercel Settings -> Environment Variables)
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'API key is missing on server' });
    }

    const {
      messages,
      temperature = 0.7,
      top_p = 0.95,
      max_tokens = 1024
    } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Missing or invalid messages array' });
    }

    // 🔄 Конвертируем OpenAI messages -> Gemini contents
    const contents = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    // 📦 Формируем тело для Gemini
    const geminiBody = {
      contents,
      generationConfig: {
        temperature,
        topP: top_p,
        maxOutputTokens: max_tokens
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_CIVIC_INTEGRITY', threshold: 'BLOCK_NONE' }
      ]
    };

    // 🚀 Делаем запрос к Gemini API
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(geminiBody)
      }
    );

    const data = await geminiRes.json();

    if (!geminiRes.ok) {
      console.error('Gemini API error:', data);
      return res.status(geminiRes.status).json(data);
    }

    // ✨ Достаём текст ответа
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // 📤 Возвращаем в формате OpenAI
    return res.status(200).json({
      id: `chatcmpl-${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: 'gemini-2.5-flash',
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: text
          },
          finish_reason: 'stop'
        }
      ],
      usage: {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0
      }
    });

  } catch (err) {
    console.error('Proxy error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
