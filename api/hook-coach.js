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

function stripJsonFences(text) {
  return String(text || '')
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

function getToneInstruction(tone) {
  const map = {
    auth: 'Ton: autoritativ-sachlich, ruhig, belastbar, Dr.-Dirk-Koetting-Stil.',
    prov: 'Ton: pointiert, kontrastreich, aber weiterhin glaubwuerdig und fachlich sauber.',
    acad: 'Ton: akademisch-praktisch, klar argumentiert, evidenznah.',
    sol: 'Ton: beratend-loesungsorientiert, konkret, umsetzungsnah.'
  };
  return map[tone] || 'Ton: sachlich, autoritativ, praezise und glaubwuerdig.';
}

function buildInstructions({ articleTitle, currentHook, personalAngle, focus, tone, topics }) {
  return [
    'Du bist ein LinkedIn Hook Coach fuer Dr. Dirk Koetting.',
    'Du verwandelst schwache Hooks in scroll-stoppende Hooks fuer eine DACH-Zielgruppe.',
    getToneInstruction(tone),
    'Arbeite direkt, ehrlich und ohne Marketing-Sprech.',
    'Pruefe die Hook auf Neugier, mobile Lesbarkeit, persoenlichen Bezug, Austauschbarkeit und Pointe.',
    'Die erste Hook-Zeile darf maximal 8 bis 10 Woerter haben und sollte mobil in eine Zeile passen.',
    'Zwischen Zeile 1 und Zeile 2 steht bei LinkedIn eine Leerzeile.',
    'Bevorzuge Hook-Formeln wie Ich-hab-Twist, Gegensatz, Zitat plus Konter, Gestaendnis mit Twist, Zahl plus Proof oder starkes Statement.',
    'Wenn kein persoenlicher Bezug erkennbar ist, formuliere eine kurze Rueckfrage und liefere trotzdem professionelle Varianten aus einer glaubwuerdigen Beobachter- oder Governance-Perspektive.',
    `Thema: ${articleTitle || 'KI-Governance Update'}.`,
    focus ? `Gewuenschter Fokus: ${focus}.` : '',
    personalAngle ? `Persoenlicher Bezug / berufliche Perspektive: ${personalAngle}.` : 'Es wurde noch kein persoenlicher Bezug angegeben.',
    currentHook ? `Aktuelle Hook: ${currentHook}.` : 'Es wurde noch keine Hook geliefert.',
    topics?.length ? `Aktive Themen im Curator: ${topics.join(', ')}.` : '',
    'Gib ausschliesslich JSON zurueck.',
    'JSON-Schema:',
    '{',
    '  "analysis": "kurzes ehrliches Feedback in 1 bis 3 Saetzen",',
    '  "needsPersonalAngle": true,',
    '  "personalQuestion": "eine konkrete Frage, falls persoenlicher Bezug fehlt, sonst leer",',
    '  "variants": [',
    '    {',
    '      "formula": "Name der Formel",',
    '      "line1": "Hook Zeile 1",',
    '      "line2": "Hook Zeile 2",',
    '      "why": "Warum das funktioniert in einem Satz"',
    '    }',
    '  ]',
    '}',
    'Liefere genau 5 Varianten.',
    'Jede Variante soll kurz, mobil lesbar und unterschiedlich gebaut sein.',
    'Keine Markdown-Codebloecke, keine Vorrede.'
  ].filter(Boolean).join('\n');
}

function normalizePayload(parsed) {
  const variants = Array.isArray(parsed?.variants) ? parsed.variants : [];
  return {
    analysis: typeof parsed?.analysis === 'string' ? parsed.analysis.trim() : '',
    needsPersonalAngle: Boolean(parsed?.needsPersonalAngle),
    personalQuestion: typeof parsed?.personalQuestion === 'string' ? parsed.personalQuestion.trim() : '',
    variants: variants.slice(0, 5).map((variant) => ({
      formula: typeof variant?.formula === 'string' ? variant.formula.trim() : 'Hook',
      line1: typeof variant?.line1 === 'string' ? variant.line1.trim() : '',
      line2: typeof variant?.line2 === 'string' ? variant.line2.trim() : '',
      why: typeof variant?.why === 'string' ? variant.why.trim() : 'Schafft Neugier und einen staerkeren Einstieg.'
    })).filter((variant) => variant.line1)
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const {
    provider,
    model,
    articleTitle = 'KI-Governance Update',
    currentHook = '',
    personalAngle = '',
    focus = '',
    tone = '',
    topics = []
  } = req.body || {};

  if (provider && provider !== 'OpenAI') {
    return res.status(400).json({ error: 'Der Hook Coach ist aktuell nur mit OpenAI live angebunden.' });
  }

  const effectiveKey = process.env.OPENAI_API_KEY;
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
        input: buildInstructions({ articleTitle, currentHook, personalAngle, focus, tone, topics }),
        max_output_tokens: 1400
      })
    });

    const payload = await upstream.json();
    if (!upstream.ok) {
      const errorMessage = payload?.error?.message || 'OpenAI request failed.';
      return res.status(upstream.status).json({ error: errorMessage });
    }

    const text = extractText(payload);
    if (!text) {
      return res.status(502).json({ error: 'OpenAI hat keine Hook-Daten zurueckgegeben.' });
    }

    let parsed;
    try {
      parsed = JSON.parse(stripJsonFences(text));
    } catch (error) {
      return res.status(502).json({
        error: 'Der Hook Coach hat kein gueltiges JSON zurueckgegeben.'
      });
    }

    const normalized = normalizePayload(parsed);
    if (!normalized.variants.length) {
      return res.status(502).json({ error: 'Der Hook Coach hat keine Varianten geliefert.' });
    }

    return res.status(200).json(normalized);
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Unbekannter Serverfehler.'
    });
  }
};
