const crypto = require('crypto');

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

function getSpreadsheetId() {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  if (!spreadsheetId) {
    throw new Error('GOOGLE_SHEETS_SPREADSHEET_ID fehlt.');
  }

  return spreadsheetId;
}

function base64Url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

async function createSignedJwt(serviceAccount, scope) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claimSet = {
    iss: serviceAccount.client_email,
    scope,
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  };

  const unsignedToken = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(claimSet))}`;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(unsignedToken);
  signer.end();
  const signature = signer.sign(serviceAccount.private_key);
  return `${unsignedToken}.${base64Url(signature)}`;
}

async function getAccessToken(scope = 'https://www.googleapis.com/auth/spreadsheets') {
  const serviceAccount = parseServiceAccount();
  const assertion = await createSignedJwt(serviceAccount, scope);
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

async function fetchRange(range, accessToken, spreadsheetId = getSpreadsheetId()) {
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

async function fetchRangeSafe(range, accessToken, spreadsheetId = getSpreadsheetId()) {
  try {
    return await fetchRange(range, accessToken, spreadsheetId);
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (/Unable to parse range|Range .* not found|Requested entity was not found/i.test(message)) {
      return [];
    }
    throw error;
  }
}

async function appendValues(range, values, accessToken, spreadsheetId = getSpreadsheetId()) {
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
    throw new Error(payload?.error?.message || `Google Sheets Append fehlgeschlagen fuer ${range}.`);
  }

  return payload;
}

function buildRunValues(data = {}) {
  const finishedAt = String(data['Finished At'] || data.finishedAt || '').trim();
  const startedAt = String(data['Started At'] || data.startedAt || finishedAt || '').trim();

  return [[
    String(data['Run Name'] || data.runName || 'Research Run').trim(),
    String(data.Region || data.region || 'Global').trim(),
    startedAt,
    finishedAt,
    String(data.Quellen || data.sources || '').trim(),
    String(data.Cluster || data.clusters || '').trim(),
    String(data.Fokus || data.focus || '').trim(),
    String(data.Status || data.status || 'completed').trim(),
    String(data.Summary || data.summary || '').trim()
  ]];
}

async function fetchCuratorSheetData() {
  const accessToken = await getAccessToken('https://www.googleapis.com/auth/spreadsheets');
  const [topics, sources, runs] = await Promise.all([
    fetchRange('Themen!A:Z', accessToken),
    fetchRange('Quellen!A:Z', accessToken),
    fetchRangeSafe('Runs!A:Z', accessToken)
  ]);

  return { topics, sources, runs, accessToken };
}

async function appendRunRecord(runRecord) {
  const accessToken = await getAccessToken('https://www.googleapis.com/auth/spreadsheets');
  return appendValues('Runs!A:I', buildRunValues(runRecord), accessToken);
}

module.exports = {
  appendRunRecord,
  appendValues,
  buildRunValues,
  fetchCuratorSheetData,
  fetchRange,
  fetchRangeSafe,
  getAccessToken,
  getSpreadsheetId,
  parseServiceAccount
};
