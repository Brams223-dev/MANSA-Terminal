// /pages/api/ai.js — Proxy Claude API (clé client, option 2)
// La clé appartient à chaque abonné — $5 gratuits offerts sur console.anthropic.com
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { messages, model, max_tokens, key } = req.body || {};
  if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: 'messages requis' });

  // Clé client transmise depuis le navigateur de l'abonné
  const apiKey = key || process.env.ANTHROPIC_API_KEY;
  if (!apiKey || !apiKey.startsWith('sk-ant')) {
    return res.status(401).json({ error: 'Clé API requise — créez un compte gratuit sur console.anthropic.com' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: model || 'claude-sonnet-4-5',
        max_tokens: max_tokens || 1024,
        messages: messages
      }),
      signal: AbortSignal.timeout(30000)
    });

    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data.error?.message || 'Erreur Claude API' });
    res.status(200).json(data);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
}
