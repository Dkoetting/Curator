const LINKEDIN_FORMATS = new Set(['li-post', 'li-story', 'li-list', 'li-question', 'li-news', 'li-article']);

function getToneInstruction(tone) {
  const map = {
    auth: 'Ton: autoritativ-sachlich, ruhig, belastbar, Dr.-Dirk-Koetting-Stil.',
    prov: 'Ton: pointiert, kontrastreich, aber weiterhin glaubwuerdig und fachlich sauber.',
    acad: 'Ton: akademisch-praktisch, klar argumentiert, evidenznah.',
    sol: 'Ton: beratend-loesungsorientiert, konkret, umsetzungsnah.'
  };
  return map[tone] || 'Ton: sachlich, autoritativ, praezise und glaubwuerdig.';
}

function buildLinkedInHookInstructions({ focus, articleTitle }) {
  return [
    'Fuer LinkedIn gelten harte Hook-Regeln.',
    'Die ersten 2 Zeilen muessen scroll-stoppend sein und mobil funktionieren.',
    'Hook-Zeile 1: maximal 8 bis 10 Woerter und idealerweise nicht mehr als ca. 38 bis 40 Zeichen.',
    'Hook-Zeile 2: eigene Zeile mit Re-Hook, ebenfalls kurz und mobil lesbar.',
    'Zwischen Hook-Zeile 1 und Hook-Zeile 2 steht eine Leerzeile.',
    'Die Hook darf die Pointe nicht verraten, sondern muss Neugier erzeugen.',
    'Nutze nach Moeglichkeit persoenlichen Bezug, klare Position oder Kontrast statt generischem How-to.',
    'Verwende bevorzugt eine der bewaehrten Hook-Formeln: Ich-hab-Twist, Gegensatz, Zitat-plus-Konter, Gestaendnis-mit-Klammer, Zahlen-plus-persoenlicher-Proof oder starkes Statement.',
    'Wenn kein offensichtlicher persoenlicher Bezug aus dem Thema kommt, nutze eine glaubwuerdige professionelle Perspektive von Dr. Dirk Koetting als Beobachter, Einordner oder Governance-Praktiker.',
    focus ? `Gewuenschter Blickwinkel fuer die Hook und den Post: ${focus}.` : '',
    `Der Hook muss zum Thema passen: ${articleTitle}.`
  ].filter(Boolean);
}

function buildInstructions({ articleTitle, format, requirement, topics = [], focus = '', tone = '' }) {
  return [
    'Du bist ein deutscher KI-Governance-Redakteur fuer Dr. Dirk Koetting.',
    getToneInstruction(tone),
    'Vermeide generisches Marketing-Sprech, leere AI-Phrasen und austauschbare Business-Floskeln.',
    'Nutze klare deutsche Sprache fuer eine DACH-Zielgruppe.',
    LINKEDIN_FORMATS.has(format) ? 'Die ersten 2-3 Zeilen muessen bei LinkedIn-Formaten als Hook funktionieren.' : '',
    ...(LINKEDIN_FORMATS.has(format) ? buildLinkedInHookInstructions({ focus, articleTitle }) : []),
    `Zielformat: ${format}.`,
    `Anforderung: ${requirement}.`,
    `Thema / Artikelkontext: ${articleTitle}.`,
    focus ? `Inhaltlicher Schwerpunkt: ${focus}.` : '',
    topics.length ? `Aktive Themen im Curator: ${topics.join(', ')}.` : '',
    'Liefere nur den finalen Text ohne Vorbemerkung, ohne Erklaerung und ohne Markdown-Codeblock.'
  ].filter(Boolean).join('\n');
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
    requirement = 'Praezise deutsche Fachkommunikation.',
    topics = [],
    focus = '',
    tone = ''
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
        input: buildInstructions({ articleTitle, format, requirement, topics, focus, tone }),
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
