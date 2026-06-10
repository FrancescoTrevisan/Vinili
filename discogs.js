export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const DISCOGS_TOKEN = process.env.DISCOGS_TOKEN;
  const { barcode, query, releaseId } = req.query;

  try {
    let url;
    if (releaseId) {
      url = `https://api.discogs.com/releases/${releaseId}`;
    } else if (barcode) {
      url = `https://api.discogs.com/database/search?barcode=${barcode}&per_page=5`;
    } else if (query) {
      url = `https://api.discogs.com/database/search?q=${encodeURIComponent(query)}&type=release&per_page=8`;
    } else {
      return res.status(400).json({ error: 'Parametro mancante' });
    }

    const r = await fetch(url, {
      headers: {
        'Authorization': `Discogs token=${DISCOGS_TOKEN}`,
        'User-Agent': 'ViniliApp/1.0'
      }
    });

    if (!r.ok) throw new Error(`Discogs error: ${r.status}`);
    const data = await r.json();

    // Se è una ricerca per barcode o query, prendi il primo risultato
    // e recupera anche il prezzo di mercato
    if (!releaseId && data.results && data.results.length > 0) {
      const first = data.results[0];
      // Recupera stats di mercato per il primo risultato
      try {
        const statsUrl = `https://api.discogs.com/marketplace/stats/${first.id}`;
        const statsR = await fetch(statsUrl, {
          headers: {
            'Authorization': `Discogs token=${DISCOGS_TOKEN}`,
            'User-Agent': 'ViniliApp/1.0'
          }
        });
        if (statsR.ok) {
          const stats = await statsR.json();
          data.results[0].market_stats = stats;
        }
      } catch(e) {}
    }

    // Se è un singolo release, recupera anche le stats
    if (releaseId) {
      try {
        const statsUrl = `https://api.discogs.com/marketplace/stats/${releaseId}`;
        const statsR = await fetch(statsUrl, {
          headers: {
            'Authorization': `Discogs token=${DISCOGS_TOKEN}`,
            'User-Agent': 'ViniliApp/1.0'
          }
        });
        if (statsR.ok) {
          data.market_stats = await statsR.json();
        }
      } catch(e) {}
    }

    res.status(200).json(data);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}
