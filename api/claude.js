export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ANTHROPIC_KEY = process.env.ANTHROPIC_KEY;

  try {
    const { artist, title, year, label, genres, tracklist } = req.body;

    const prompt = `Scrivi una breve descrizione critica (3-4 frasi) di questo disco in italiano:
Artista: ${artist}
Titolo: ${title}
Anno: ${year}
Etichetta: ${label || 'N/A'}
Generi: ${genres?.join(', ') || 'N/A'}
Tracklist: ${tracklist?.map(t => t.title).join(', ') || 'N/A'}

Parla del contesto storico-musicale, dello stile sonoro e dell'importanza del disco. Sii conciso e appassionato.`;

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!r.ok) throw new Error(`Anthropic error: ${r.status}`);
    const data = await r.json();
    const text = data.content?.[0]?.text || '';
    res.status(200).json({ description: text });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}
