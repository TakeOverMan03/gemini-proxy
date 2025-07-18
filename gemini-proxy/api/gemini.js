// api/gemini.js
// Один ключ, без ротации. Работает на Node 18+ (Vercel)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GOOGLE_API_KEY_1; // твой единственный ключ
  if (!apiKey) {
    return res.status(500).json({ error: 'API key is missing on server' });
  }

  const body = req.body;

  // 👇 Настраиваем safetySettings (снимаем фильтры)
  body.safetySettings = [
    { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
    { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
    { category: 'HARM_CATEGORY_CIVIC_INTEGRITY', threshold: 'BLOCK_NONE' }
  ];

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    console.log(`▶️ Работаем с одним ключом`);

    const gRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await gRes.json();

    if (gRes.ok) {
      // ✅ Успех — возвращаем клиенту
      return res.status(200).json(data);
    } else {
      // ❌ Ошибка от Google
      return res.status(gRes.status).json(data);
    }
  } catch (err) {
    console.error(`❌ Ошибка запроса:`, err);
    return res.status(500).json({ error: 'Internal Server Error', details: err });
  }
}
