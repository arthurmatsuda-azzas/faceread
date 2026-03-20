export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { image } = req.body;
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: 'Analise os rostos e expressões nesta imagem. Responda APENAS em JSON: {"faces_detected":número,"emotions":["emoções em português"],"dominant_emotion":"emoção principal","confidence":"alta|media|baixa","description":"frase curta descrevendo a expressão","engagement":"engajado|neutro|desengajado"}. Se não houver rosto: {"faces_detected":0,"emotions":[],"dominant_emotion":"nenhum","confidence":"alta","description":"Nenhum rosto detectado","engagement":"neutro"}. SÓ JSON, sem markdown.' },
              { inline_data: { mime_type: 'image/jpeg', data: image } }
            ]
          }],
          generationConfig: { temperature: 0.1 }
        })
      }
    );
    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    res.status(200).json({ text });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
