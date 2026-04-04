module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const { text = '', title = 'curator-podcast' } = req.body || {};
  const effectiveKey = process.env.OPENAI_API_KEY;

  if (!effectiveKey) {
    return res.status(400).json({ error: 'OPENAI_API_KEY fehlt auf dem Server.' });
  }

  const input = String(text || '').trim().slice(0, 4000);
  if (!input) {
    return res.status(400).json({ error: 'Es wurde kein Text für die Audioausgabe übergeben.' });
  }

  try {
    const upstream = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${effectiveKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini-tts-2025-12-15',
        voice: 'cedar',
        input,
        response_format: 'mp3',
        instructions: 'Voice Affect: Composed and trustworthy. Tone: Professional and calm. Pacing: Steady. Delivery: Clear DACH business narration.'
      })
    });

    if (!upstream.ok) {
      const payload = await upstream.json().catch(() => ({}));
      return res.status(upstream.status).json({
        error: payload?.error?.message || 'Die Audio-Erstellung bei OpenAI ist fehlgeschlagen.'
      });
    }

    const buffer = Buffer.from(await upstream.arrayBuffer());
    const safeTitle = String(title || 'curator-podcast').replace(/[^a-z0-9-_]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'curator-podcast';
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}.mp3"`);
    return res.status(200).send(buffer);
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Unbekannter Serverfehler.'
    });
  }
};
