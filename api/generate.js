function buildInstructions({ articleTitle, format, requirement }) {
  return [
    'Du bist ein deutscher KI-Governance-Redakteur fuer Dr. Dirk Koetting.',
    'Schreibe sachlich, autoritativ, praezise und glaubwuerdig.',
    'Vermeide generisches Marketing-Sprech und leere AI-Phrasen.',
    'Nutze klare deutsche Sprache fuer eine DACH-Zielgruppe.',
    'Die ersten 2-3 Zeilen muessen bei LinkedIn-Formaten als Hook funktionieren.',
    `Zielformat: ${format}.`,
    `Anforderung: ${requirement}.`,
    `Thema / Artikelkontext: ${articleTitle}.`,
    'Liefere nur den finalen Text ohne Vorbemerkung, ohne Erklaerung und ohne Markdown-Codeblock.'
  ].join('\n');
}

function extractText(payload) {
  if (typeof payload?.output_text === 'string' && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  const output = Array.isArray(payload?.output) ? payload.output : [];
  const chunks = [];

  for (const item of output) {
    if (!Array.isArray(item?.content)) continue;
    for (const contentItem of item.content) {
      if (contentItem?.type === 'output_text' && contentItem?.text) {
        chunks.push(contentItem.text);
      }
    }
  }

  return chunks.join('\n').trim();
}

function getTokenLimit(format) {
  if (format === 'fach') return 2800;
  if (format === 'blog') return 1800;
  if (format === 'li-article') return 2200;
  return 900;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const {
    provider,
    model,
    apiKey,
    articleTitle = 'KI-Governance Update',
    format = 'li-post',
    requirement = 'Praezise deutsche Fachkommunikation.'
  } = req.body || {};

  if (provider && provider !== 'OpenAI') {
    return res.status(400).json({ error: 'Aktuell ist nur OpenAI live angebunden.' });
  }

  const effectiveKey = process.env.OPENAI_API_KEY || apiKey;
  if (!effectiveKey) {
    return res.status(400).json({ error: 'OPENAI_API_KEY fehlt auf dem Server.' });
  }

  try {
    const upstream = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${effectiveKey}`
      },
      body: JSON.stringify({
        model: model || 'gpt-4.1',
        input: buildInstructions({ articleTitle, format, requirement }),
        max_output_tokens: getTokenLimit(format)
      })
    });

    const payload = await upstream.json();
    if (!upstream.ok) {
      const errorMessage = payload?.error?.message || 'OpenAI request failed.';
      return res.status(upstream.status).json({ error: errorMessage });
    }

    const text = extractText(payload);
    if (!text) {
      return res.status(502).json({ error: 'OpenAI hat keinen Text zurueckgegeben.' });
    }

    return res.status(200).json({
      text,
      sourceLabel: 'OpenAI Live'
    });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Unbekannter Serverfehler.'
    });
  }
};
