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
  const header = {
    alg: 'RS256',
    typ: 'JWT'
  };
  const claimSet = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
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

function mapRows(values = []) {
  if (!Array.isArray(values) || values.length === 0) {
    return [];
  }

  const [headerRow, ...rows] = values;
  const headers = headerRow.map((header) => String(header || '').trim());

  return rows
    .filter((row) => row.some((cell) => String(cell || '').trim() !== ''))
    .map((row) => {
      const record = {};
      headers.forEach((header, index) => {
        record[header] = String(row[index] || '').trim();
      });
      return record;
    });
}

async function fetchRange(spreadsheetId, range, accessToken) {
  const encodedRange = encodeURIComponent(range);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedRange}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message || `Google Sheets Fehler fuer ${range}.`);
  }

  return mapRows(payload.values);
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  try {
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
    if (!spreadsheetId) {
      throw new Error('GOOGLE_SHEETS_SPREADSHEET_ID fehlt.');
    }

    const serviceAccount = parseServiceAccount();
    const accessToken = await getAccessToken(serviceAccount);
    const [topics, sources] = await Promise.all([
      fetchRange(spreadsheetId, 'Themen!A:Z', accessToken),
      fetchRange(spreadsheetId, 'Quellen!A:Z', accessToken)
    ]);

    return res.status(200).json({
      topics,
      sources
    });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Google Sheets konnten nicht geladen werden.'
    });
  }
};
