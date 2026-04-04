const crypto = require('crypto');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toBase64Url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function sanitizeFilename(title) {
  return String(title || 'curator-podcast')
    .replace(/[^a-z0-9-_]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'curator-podcast';
}

function parseServiceAccountJson() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON fehlt auf dem Server.');
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON ist kein gueltiges JSON.');
  }
}

async function getGoogleAccessToken(serviceAccount) {
  if (!serviceAccount.client_email || !serviceAccount.private_key) {
    throw new Error('Das Google-Dienstkonto ist unvollstaendig konfiguriert.');
  }

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claimSet = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  };

  const unsignedToken = `${toBase64Url(JSON.stringify(header))}.${toBase64Url(JSON.stringify(claimSet))}`;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(unsignedToken);
  signer.end();
  const signature = signer.sign(serviceAccount.private_key);
  const assertion = `${unsignedToken}.${toBase64Url(signature)}`;

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion
    })
  });

  const tokenPayload = await tokenResponse.json().catch(() => ({}));
  if (!tokenResponse.ok || !tokenPayload.access_token) {
    throw new Error(tokenPayload.error_description || tokenPayload.error || 'Google Access Token konnte nicht abgerufen werden.');
  }

  return tokenPayload.access_token;
}

async function createOpenAiMp3({ apiKey, text, title }) {
  const upstream = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini-tts',
      voice: 'cedar',
      input: text,
      response_format: 'mp3',
      instructions: 'Voice Affect: Composed and trustworthy. Tone: Professional and calm. Pacing: Steady. Delivery: Clear DACH business narration.'
    })
  });

  if (!upstream.ok) {
    const payload = await upstream.json().catch(() => ({}));
    throw new Error(payload?.error?.message || 'Die Audio-Erstellung bei OpenAI ist fehlgeschlagen.');
  }

  return {
    buffer: Buffer.from(await upstream.arrayBuffer()),
    filename: `${sanitizeFilename(title)}.mp3`
  };
}

async function createGooglePodcastMp3({
  serviceAccount,
  text,
  title,
  podcastLength,
  languageCode,
  focus,
  projectId
}) {
  const effectiveProjectId = projectId || process.env.GOOGLE_CLOUD_PROJECT_ID || serviceAccount.project_id;
  if (!effectiveProjectId) {
    throw new Error('Es konnte keine Google Project ID ermittelt werden.');
  }

  const accessToken = await getGoogleAccessToken(serviceAccount);
  const createResponse = await fetch(`https://discoveryengine.googleapis.com/v1/projects/${encodeURIComponent(effectiveProjectId)}/locations/global/podcasts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      podcastConfig: {
        focus: focus || 'Erstelle ein ruhiges, belastbares Audio-Briefing fuer KI-Governance im DACH-Raum.',
        length: podcastLength || 'SHORT',
        languageCode: languageCode || 'de-DE'
      },
      contexts: [{ text }],
      title: title || 'Curator Podcast',
      description: 'Automatisch aus dem Curator generiertes Audio-Briefing.'
    })
  });

  const createPayload = await createResponse.json().catch(() => ({}));
  if (!createResponse.ok || !createPayload?.name) {
    const googleMessage =
      createPayload?.error?.message ||
      createPayload?.message ||
      'Die Google Podcast API konnte nicht gestartet werden.';
    throw new Error(`${googleMessage} Hinweis: Die Podcast API ist laut Google GA mit Allowlist.`);
  }

  const operationName = String(createPayload.name || '').replace(/^\/+/, '');
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const operationResponse = await fetch(`https://discoveryengine.googleapis.com/v1/${operationName}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const operationPayload = await operationResponse.json().catch(() => ({}));

    if (!operationResponse.ok) {
      throw new Error(operationPayload?.error?.message || 'Der Google-Podcast-Status konnte nicht abgefragt werden.');
    }

    if (operationPayload?.done) {
      const downloadResponse = await fetch(`https://discoveryengine.googleapis.com/v1/${operationName}:download?alt=media`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (!downloadResponse.ok) {
        const payload = await downloadResponse.json().catch(() => ({}));
        throw new Error(payload?.error?.message || 'Der fertige Google-Podcast konnte nicht heruntergeladen werden.');
      }

      return {
        buffer: Buffer.from(await downloadResponse.arrayBuffer()),
        filename: `${sanitizeFilename(title)}-google-podcast.mp3`
      };
    }

    await sleep(3000);
  }

  return {
    pending: true,
    message: 'Der Google-Podcast wird noch erstellt. Bitte in wenigen Sekunden noch einmal auf MP3 klicken.'
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const {
    text = '',
    title = 'curator-podcast',
    provider = 'openai',
    podcastLength = 'SHORT',
    languageCode = 'de-DE',
    focus = '',
    projectId = ''
  } = req.body || {};

  const input = String(text || '').trim().slice(0, 8000);
  if (!input) {
    return res.status(400).json({ error: 'Es wurde kein Text fuer die Audioausgabe uebergeben.' });
  }

  try {
    let result;

    if (provider === 'google-podcast') {
      const serviceAccount = parseServiceAccountJson();
      result = await createGooglePodcastMp3({
        serviceAccount,
        text: input,
        title,
        podcastLength,
        languageCode,
        focus,
        projectId
      });
    } else {
      const effectiveKey = process.env.OPENAI_API_KEY;
      if (!effectiveKey) {
        return res.status(400).json({ error: 'OPENAI_API_KEY fehlt auf dem Server.' });
      }

      result = await createOpenAiMp3({
        apiKey: effectiveKey,
        text: input.slice(0, 4000),
        title
      });
    }

    if (result?.pending) {
      return res.status(202).json({
        status: 'pending',
        message: result.message
      });
    }

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    return res.status(200).send(result.buffer);
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Unbekannter Serverfehler.'
    });
  }
};
