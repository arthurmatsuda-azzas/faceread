export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { image } = req.body;
    if (!image) return res.status(400).json({ error: 'No image provided' });
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: `Você é um sistema de análise facial e contagem de fluxo de pessoas. Observe a imagem com atenção e identifique TODOS os rostos humanos presentes.

Para cada rosto encontrado, analise a expressão facial e forneça uma descrição curta da pessoa para identificação (ex: "homem jovem, camisa azul", "mulher, cabelo longo castanho, vestido preto").

Responda EXCLUSIVAMENTE com um objeto JSON válido (sem markdown, sem crases, sem texto extra) neste formato:
{
  "faces_detected": <número inteiro de rostos encontrados>,
  "people": [{"id": 1, "description": "descrição curta da pessoa para identificação"}],
  "emotions": ["emoção1 em português", "emoção2"],
  "dominant_emotion": "<emoção principal em português>",
  "confidence": "alta" ou "media" ou "baixa",
  "description": "<descrição curta da cena em português>",
  "engagement": "engajado" ou "neutro" ou "desengajado"
}

Se nenhum rosto for encontrado na imagem, responda com:
{"faces_detected":0,"people":[],"emotions":[],"dominant_emotion":"nenhum","confidence":"alta","description":"Nenhum rosto detectado na imagem","engagement":"neutro"}

IMPORTANTE: Retorne APENAS o JSON, nada mais.` },
              { inline_data: { mime_type: 'image/jpeg', data: image } }
            ]
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 1024,
            thinkingConfig: { thinkingBudget: 0 }
          },
          safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
          ]
        })
      }
    );
    const data = await response.json();

    // Check for API-level errors
    if (data.error) {
      return res.status(200).json({ text: JSON.stringify({
        faces_detected: 0,
        emotions: [],
        dominant_emotion: 'erro',
        confidence: 'baixa',
        description: 'Erro da API: ' + (data.error.message || 'desconhecido'),
        engagement: 'neutro'
      })});
    }

    // Check for safety blocks
    if (data.promptFeedback?.blockReason) {
      return res.status(200).json({ text: JSON.stringify({
        faces_detected: 0,
        emotions: [],
        dominant_emotion: 'erro',
        confidence: 'baixa',
        description: 'Conteúdo bloqueado pelo filtro de segurança',
        engagement: 'neutro'
      })});
    }

    const candidate = data.candidates?.[0];

    // Check if candidate was blocked
    if (!candidate || candidate.finishReason === 'SAFETY') {
      return res.status(200).json({ text: JSON.stringify({
        faces_detected: 0,
        emotions: [],
        dominant_emotion: 'erro',
        confidence: 'baixa',
        description: 'Resposta bloqueada pelo filtro de segurança',
        engagement: 'neutro'
      })});
    }

    const parts = candidate.content?.parts || [];
    const textPart = parts.filter(p => p.text && !p.thought).pop() || parts.find(p => p.text);
    const text = textPart?.text || '{}';
    res.status(200).json({ text });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
