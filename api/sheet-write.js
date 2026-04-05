function parseServiceAccount() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON fehlt.');
  }

  const parsed = JSON.parse(raw);
  if (!parsed.client_email || !parsed.private_key) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON ist unvollstaendig.');
  }

  return parsed;
}

function base64Url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

async function createSignedJwt(serviceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claimSet = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  };

  const unsignedToken = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(claimSet))}`;
  const signer = require('crypto').createSign('RSA-SHA256');
  signer.update(unsignedToken);
  signer.end();
  const signature = signer.sign(serviceAccount.private_key);
  return `${unsignedToken}.${base64Url(signature)}`;
}

async function getAccessToken(serviceAccount) {
  const assertion = await createSignedJwt(serviceAccount);
  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion
  });

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  });

  const payload = await response.json();
  if (!response.ok || !payload.access_token) {
    throw new Error(payload?.error_description || payload?.error || 'Google OAuth fehlgeschlagen.');
  }

  return payload.access_token;
}

function buildAppendPayload(kind, data) {
  const createdAt = String(data?.['Erfasst am'] || new Date().toISOString().slice(0, 10)).trim();
  if (kind === 'topic') {
    const title = String(data?.Thema || '').trim();
    if (!title) {
      throw new Error('Thema fehlt.');
    }

    return {
      range: 'Themen!A:G',
      values: [[
        title,
        String(data?.Kategorie || 'Weitere Themen').trim(),
        String(data?.Region || 'DACH / EU').trim(),
        String(data?.Prioritaet || 'Mittel').trim(),
        String(data?.Aktiv || 'Ja').trim(),
        String(data?.Notizen || 'Manuell aus dem Curator ergaenzt').trim(),
        createdAt
      ]]
    };
  }

  if (kind === 'source') {
    const url = String(data?.URL || '').trim();
    if (!url) {
      throw new Error('URL fehlt.');
    }

    return {
      range: 'Quellen!A:H',
      values: [[
        String(data?.Titel || 'Eigene Quelle').trim(),
        url,
        String(data?.Kategorie || 'Custom').trim(),
        String(data?.Region || 'Eigene Quelle').trim(),
        String(data?.Primaerquelle || 'Nein').trim(),
        String(data?.Aktiv || 'Ja').trim(),
        String(data?.Kommentar || 'Manuell aus dem Curator ergaenzt').trim(),
        createdAt
      ]]
    };
  }

  if (kind === 'run') {
    const finishedAt = String(data?.['Finished At'] || data?.finishedAt || '').trim();
    const startedAt = String(data?.['Started At'] || data?.startedAt || finishedAt || '').trim();
    return {
      range: 'Runs!A:I',
      values: [[
        String(data?.['Run Name'] || data?.runName || 'Research Run').trim(),
        String(data?.Region || data?.region || 'Global').trim(),
        startedAt,
        finishedAt,
        String(data?.Quellen || data?.sources || '').trim(),
        String(data?.Cluster || data?.clusters || '').trim(),
        String(data?.Fokus || data?.focus || '').trim(),
        String(data?.Status || data?.status || 'completed').trim(),
        String(data?.Summary || data?.summary || '').trim()
      ]]
    };
  }

  throw new Error('Unbekannter Schreibtyp.');
}

async function appendRow(spreadsheetId, accessToken, range, values) {
  const encodedRange = encodeURIComponent(range);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedRange}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify({ values })
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message || 'Google Sheets Append fehlgeschlagen.');
  }

  return payload;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  try {
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
    if (!spreadsheetId) {
      throw new Error('GOOGLE_SHEETS_SPREADSHEET_ID fehlt.');
    }

    const { kind, data } = req.body || {};
    const appendPayload = buildAppendPayload(kind, data);
    const serviceAccount = parseServiceAccount();
    const accessToken = await getAccessToken(serviceAccount);
    const result = await appendRow(
      spreadsheetId,
      accessToken,
      appendPayload.range,
      appendPayload.values
    );

    return res.status(200).json({
      ok: true,
      updatedRange: result?.updates?.updatedRange || '',
      kind
    });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Google Sheets konnten nicht beschrieben werden.'
    });
  }
};
