// api/gemini.js
// Ротация между несколькими ключами при превышении квоты.
// Работает на Node 18+ (Vercel), глобальный fetch встроен.

const apiKeys = [
  process.env.GOOGLE_API_KEY_1, // новый ключ
  process.env.GOOGLE_API_KEY_2  // запасной ключ
];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
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

  let lastError = null;

  // 🔄 Перебираем ключи
  for (let i = 0; i < apiKeys.length; i++) {
    const key = apiKeys[i];
    if (!key) continue; // пропускаем пустые

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`;
    console.log(`▶️ Пробую ключ #${i + 1}`);

    try {
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
        // Если квота кончилась — пробуем следующий
        if (
          data.error &&
          data.error.message &&
          data.error.message.toLowerCase().includes('quota')
        ) {
          console.warn(`⚠️ Ключ #${i + 1} исчерпан, переключаюсь на следующий…`);
          lastError = data;
          continue; // пробуем следующий ключ
        } else {
          // Другая ошибка — сразу возвращаем
          return res.status(gRes.status).json(data);
        }
      }
    } catch (err) {
      console.error(`❌ Ошибка с ключом #${i + 1}:`, err);
      lastError = err;
      continue;
    }
  }

  // 🚫 Если все ключи кончились
  res.status(429).json({
    error: 'Все доступные API-ключи исчерпаны или недоступны',
    details: lastError
  });
}
