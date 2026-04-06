const fs = require('fs');
const path = require('path');

const LINKEDIN_FORMATS = new Set(['li-post', 'li-story', 'li-list', 'li-question', 'li-news', 'li-article', 'li-carousel']);

function readReferenceFile(...segments) {
  try {
    return fs.readFileSync(path.join(process.cwd(), ...segments), 'utf8').trim();
  } catch {
    return '';
  }
}

const carouselReference =
  readReferenceFile('docs', 'carousell.md') ||
  readReferenceFile('docs', 'CAROUSELL.md') ||
  readReferenceFile('docs', 'CAROUSEL_CREATOR_SKILL.md');

function getToneInstruction(tone) {
  const map = {
    auth: 'Ton: autoritativ-sachlich, ruhig, belastbar, Dr.-Dirk-Koetting-Stil.',
    prov: 'Ton: pointiert, kontrastreich, aber weiterhin glaubwuerdig und fachlich sauber.',
    acad: 'Ton: akademisch-praktisch, klar argumentiert, evidenznah.',
    sol: 'Ton: beratend-loesungsorientiert, konkret, umsetzungsnah.'
  };
  return map[tone] || 'Ton: sachlich, autoritativ, praezise und glaubwuerdig.';
}

function buildLinkedInHookInstructions({ focus, articleTitle, currentHook, personalAngle }) {
  return [
    'Fuer LinkedIn gelten harte Hook-Regeln.',
    'Die ersten 2 Zeilen muessen scroll-stoppend sein und mobil funktionieren.',
    'Hook-Zeile 1: maximal 8 bis 10 Woerter und idealerweise nicht mehr als ca. 38 bis 40 Zeichen.',
    'Hook-Zeile 2: eigene Zeile mit Re-Hook, ebenfalls kurz und mobil lesbar.',
    'Zwischen Hook-Zeile 1 und Hook-Zeile 2 steht eine Leerzeile.',
    'Die Hook darf die Pointe nicht verraten, sondern muss Neugier erzeugen.',
    'Nutze nach Moeglichkeit persoenlichen Bezug, klare Position oder Kontrast statt generischem How-to.',
    'Verwende bevorzugt eine der bewaehrten Hook-Formeln: Ich-hab-Twist, Gegensatz, Zitat-plus-Konter, Gestaendnis-mit-Klammer, Zahlen-plus-persoenlicher-Proof oder starkes Statement.',
    currentHook ? `Nutze diese vorhandene Hook als Ausgangspunkt und verschaerfe sie nur dort, wo sie noch nicht stark genug ist: ${currentHook}.` : '',
    personalAngle ? `Binde diesen persoenlichen oder professionellen Bezug sichtbar ein: ${personalAngle}.` : '',
    'Wenn kein offensichtlicher persoenlicher Bezug aus dem Thema kommt, nutze eine glaubwuerdige professionelle Perspektive von Dr. Dirk Koetting als Beobachter, Einordner oder Governance-Praktiker.',
    focus ? `Gewuenschter Blickwinkel fuer die Hook und den Post: ${focus}.` : '',
    `Der Hook muss zum Thema passen: ${articleTitle}.`
  ].filter(Boolean);
}

function buildCarouselInstructions({ articleTitle, focus, topics = [], personalAngle = '' }) {
  return [
    'Nutze fuer Carousel-Formate eine feste Slide-Dramaturgie statt frei fliessendem LinkedIn-Text.',
    'Bevorzuge 7 Slides in dieser Reihenfolge: Hero, Problem, Loesung, Features, Details, How-To, CTA.',
    'Wenn das Thema mehr Tiefe braucht, sind 8 bis 10 Slides erlaubt, aber nur wenn jede Slide klar begruendet ist.',
    'Slide 1 muss den Hook tragen und sofort scroll-stoppend sein.',
    'Die letzte Slide braucht eine klare CTA- oder Diskussionsfrage.',
    'Jede Slide soll eine kurze Ueberschrift und 1 bis 3 kurze Aussagezeilen haben.',
    'Keine langen Absatzfolien, kein Fliesstext, keine generischen Buzzword-Slides.',
    'Formatiere exakt als "Slide 1 - ...", "Slide 2 - ..." usw.',
    'Denke in swipebarer Dramaturgie: Jede Slide muss die naechste Slide rechtfertigen.',
    focus ? `Carousel-Schwerpunkt: ${focus}.` : '',
    personalAngle ? `Persoenliche oder professionelle Perspektive, die im Carousel sichtbar werden soll: ${personalAngle}.` : '',
    topics.length ? `Relevante Curator-Themen fuer das Carousel: ${topics.join(', ')}.` : '',
    `Das Carousel muss zum Thema passen: ${articleTitle}.`,
    carouselReference ? `Nutze diese interne Carousel-Referenz als zusaetzlichen Produktionsrahmen:\n${carouselReference}` : ''
  ].filter(Boolean);
}

function buildInstructions({ articleTitle, format, requirement, topics = [], focus = '', tone = '', currentHook = '', personalAngle = '' }) {
  return [
    'Du bist ein deutscher KI-Governance-Redakteur fuer Dr. Dirk Koetting.',
    getToneInstruction(tone),
    'Vermeide generisches Marketing-Sprech, leere AI-Phrasen und austauschbare Business-Floskeln.',
    'Nutze klare deutsche Sprache fuer eine DACH-Zielgruppe.',
    LINKEDIN_FORMATS.has(format) ? 'Die ersten 2-3 Zeilen muessen bei LinkedIn-Formaten als Hook funktionieren.' : '',
    ...(LINKEDIN_FORMATS.has(format) ? buildLinkedInHookInstructions({ focus, articleTitle, currentHook, personalAngle }) : []),
    ...(format === 'li-carousel' ? buildCarouselInstructions({ articleTitle, focus, topics, personalAngle }) : []),
    `Zielformat: ${format}.`,
    `Anforderung: ${requirement}.`,
    `Thema / Artikelkontext: ${articleTitle}.`,
    format === 'blog' ? 'Der Blog-Artikel muss mindestens 800 Wörter erreichen und eine klare SEO-Struktur mit Zwischenüberschriften haben.' : '',
    format === 'blog' ? 'Wenn der Text zu kurz bleibt, erweitere ihn substanziell mit Einordnung, Praxisnutzen, Suchintention, Beispielen und Fazit.' : '',
    format === 'li-article' ? 'Der LinkedIn Artikel muss mindestens 900 Wörter erreichen und wie ein echter Langformbeitrag lesbar bleiben.' : '',
    format === 'li-article' ? 'Wenn der Text zu kurz bleibt, erweitere Analyse, Beispiele, Einordnung, Übergänge und Schlussfolgerungen, bis die Mindestlänge klar erreicht ist.' : '',
    format === 'fach' ? 'Der Fachbeitrag muss substanziell sein und mindestens 12000 Zeichen umfassen. Zielkorridor: etwa 1500 bis 2200 Woerter.' : '',
    format === 'fach' ? 'Wenn der Text in Gefahr ist zu kurz zu werden, erweitere Analyse, Einordnung, Praxisimplikationen, typische Fehler, Implementierungsrahmen und Schlussfolgerung, bis die Mindestlaenge sicher erreicht ist.' : '',
    focus ? `Inhaltlicher Schwerpunkt: ${focus}.` : '',
    personalAngle ? `Persoenliche oder professionelle Perspektive: ${personalAngle}.` : '',
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

function getWordCount(text = '') {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/[`#>]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .length;
}

function getTokenLimit(format) {
  if (format === 'fach') return 5200;
  if (format === 'blog') return 2800;
  if (format === 'li-article') return 3800;
  if (format === 'li-carousel') return 1600;
  return 900;
}

function getLengthGuard(format) {
  if (format === 'fach') {
    return {
      minChars: 12000,
      label: 'mindestens 12.000 Zeichen'
    };
  }

  if (format === 'blog') {
    return {
      minWords: 800,
      minChars: 5500,
      label: 'mindestens 800 Wörter'
    };
  }

  if (format === 'li-article') {
    return {
      minWords: 900,
      minChars: 6500,
      label: 'mindestens 900 Wörter'
    };
  }

  return null;
}

function isTooShort(text, guard) {
  if (!guard) return false;
  const wordCount = getWordCount(text);
  if (guard.minWords && wordCount < guard.minWords) return true;
  if (guard.minChars && text.length < guard.minChars) return true;
  return false;
}

function buildExpansionInstructions({ articleTitle, format, focus = '', text = '', guard }) {
  return [
    'Der folgende Text ist fuer das Zielformat noch zu kurz.',
    `Zielformat: ${format}.`,
    `Thema: ${articleTitle}.`,
    focus ? `Inhaltlicher Schwerpunkt: ${focus}.` : '',
    guard ? `Erweitere ihn jetzt auf ${guard.label}.` : '',
    'Wichtig: Nicht nur aufblasen, sondern substanziell vertiefen.',
    'Erweitere Einordnung, Praxisbeispiele, typische Fehler, Governance-Implikationen, Umsetzungsrahmen und Fazit.',
    format === 'blog' ? 'Der Blog-Artikel braucht eine saubere SEO-Struktur mit Zwischenueberschriften, klarer Suchintention und belastbaren Abschnitten.' : '',
    format === 'li-article' ? 'Der LinkedIn Artikel muss wie ein echter Langformbeitrag wirken: Hook, Einordnung, Hauptteil, Verdichtung, Schluss.' : '',
    'Vermeide Wiederholungen und leere Floskeln.',
    'Liefere nur die vollstaendige, ueberarbeitete Endfassung.',
    '',
    'Aktuelle Fassung:',
    text
  ].filter(Boolean).join('\n');
}

async function requestOpenAI({ effectiveKey, model, input, maxOutputTokens }) {
  const upstream = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${effectiveKey}`
    },
    body: JSON.stringify({
      model: model || 'gpt-4.1',
      input,
      max_output_tokens: maxOutputTokens
    })
  });

  const payload = await upstream.json();
  return { upstream, payload };
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
    tone = '',
    currentHook = '',
    personalAngle = ''
  } = req.body || {};

  if (provider && provider !== 'OpenAI') {
    return res.status(400).json({ error: 'Aktuell ist nur OpenAI live angebunden.' });
  }

  const effectiveKey = process.env.OPENAI_API_KEY || apiKey;
  if (!effectiveKey) {
    return res.status(400).json({ error: 'OPENAI_API_KEY fehlt auf dem Server.' });
  }

  try {
    const initialInput = buildInstructions({ articleTitle, format, requirement, topics, focus, tone, currentHook, personalAngle });
    const { upstream, payload } = await requestOpenAI({
      effectiveKey,
      model,
      input: initialInput,
      maxOutputTokens: getTokenLimit(format)
    });

    if (!upstream.ok) {
      const errorMessage = payload?.error?.message || 'OpenAI request failed.';
      return res.status(upstream.status).json({ error: errorMessage });
    }

    let text = extractText(payload);
    if (!text) {
      return res.status(502).json({ error: 'OpenAI hat keinen Text zurueckgegeben.' });
    }

    const guard = getLengthGuard(format);
    if (isTooShort(text, guard)) {
      const expansionInput = buildExpansionInstructions({ articleTitle, format, focus, text, guard });
      const retry = await requestOpenAI({
        effectiveKey,
        model,
        input: expansionInput,
        maxOutputTokens: getTokenLimit(format)
      });

      if (!retry.upstream.ok) {
        const retryError = retry.payload?.error?.message || 'OpenAI expansion request failed.';
        return res.status(retry.upstream.status).json({ error: retryError });
      }

      const expandedText = extractText(retry.payload);
      if (expandedText) {
        text = expandedText;
      }
    }

    if (isTooShort(text, guard)) {
      const wordCount = getWordCount(text);
      return res.status(502).json({
        error: `Der ${format === 'fach' ? 'Fachbeitrag' : 'Text'} ist noch zu kurz (${wordCount} Wörter, ${text.length} Zeichen). Erwartet werden ${guard.label}.`
      });
    }

    return res.status(200).json({
      text,
      sourceLabel: 'OpenAI Live',
      stats: {
        wordCount: getWordCount(text),
        charCount: text.length
      }
    });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Unbekannter Serverfehler.'
    });
  }
};
