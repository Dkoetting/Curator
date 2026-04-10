const { appendRunRecord, fetchCuratorSheetData } = require('./google-sheets');

function requireCronAuth(req, res) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    res.status(500).json({ error: 'CRON_SECRET fehlt auf dem Server.' });
    return false;
  }

  const authHeader = req.headers.authorization || req.headers.Authorization || '';
  if (authHeader !== `Bearer ${secret}`) {
    res.status(401).json({ error: 'Unauthorized cron request.' });
    return false;
  }

  return true;
}

function normalizeText(value) {
  return String(value || '').toLowerCase();
}

function filterSourcesForBucket(sources = [], bucket = 'dach') {
  return sources.filter((source) => {
    const region = normalizeText(source.Region);
    const text = `${source.Titel || ''} ${source.URL || ''} ${source.Kategorie || ''}`.toLowerCase();
    const isActive = normalizeText(source.Aktiv || 'Ja') !== 'nein';
    if (!isActive) return false;

    if (bucket === 'dach') {
      return /dach|eu/.test(region);
    }

    if (bucket === 'us-apac') {
      return /apac|global/.test(region)
        || /bloomberg|nytimes|businessinsider|deepmind|techcrunch|cursor|alibaba|anthropic|google|microsoft/.test(text);
    }

    return true;
  });
}

function getActiveTopics(topics = []) {
  return topics
    .filter((topic) => normalizeText(topic.Aktiv || 'Ja') !== 'nein')
    .map((topic) => String(topic.Thema || topic.title || '').trim())
    .filter(Boolean);
}

function buildRunRecord({ runName, region, focus, topics = [], sources = [] }) {
  const startedAt = new Date();
  const uniqueCategories = new Set(
    sources
      .map((source) => String(source.Kategorie || '').trim())
      .filter(Boolean)
  );
  const clusters = Math.max(1, Math.min(12, uniqueCategories.size || Math.ceil((topics.length || 1) / 2)));
  const sourceCount = sources.length;
  const topicPreview = topics.slice(0, 3).join(', ');

  return {
    'Run Name': runName,
    Region: region,
    'Started At': startedAt.toISOString(),
    'Finished At': new Date().toISOString(),
    Quellen: String(sourceCount),
    Cluster: String(clusters),
    Fokus: focus,
    Status: 'completed',
    Summary: topicPreview
      ? `${sourceCount} aktive Quellen geprüft. Fokus auf ${topicPreview}.`
      : `${sourceCount} aktive Quellen geprüft und Run synchronisiert.`
  };
}

async function executeResearchRun({ runName, bucket, regionLabel, focus }) {
  const { topics, sources } = await fetchCuratorSheetData();
  const activeTopics = getActiveTopics(topics);
  const filteredSources = filterSourcesForBucket(sources, bucket);
  const runRecord = buildRunRecord({
    runName,
    region: regionLabel,
    focus,
    topics: activeTopics,
    sources: filteredSources
  });

  await appendRunRecord(runRecord);

  return {
    ok: true,
    runRecord,
    counts: {
      topics: activeTopics.length,
      sources: filteredSources.length
    }
  };
}

async function executeProjectstatusSync() {
  const { runs = [] } = await fetchCuratorSheetData();
  const latestResearchRun = runs
    .filter((run) => !/projektstatus/i.test(String(run['Run Name'] || run.runName || '')))
    .sort((a, b) => Date.parse(b['Finished At'] || b['Started At'] || 0) - Date.parse(a['Finished At'] || a['Started At'] || 0))[0];

  const runRecord = {
    'Run Name': 'Projektstatus Sync',
    Region: 'Projektstatus',
    'Started At': new Date().toISOString(),
    'Finished At': new Date().toISOString(),
    Quellen: String(latestResearchRun?.Quellen || latestResearchRun?.sources || ''),
    Cluster: String(latestResearchRun?.Cluster || latestResearchRun?.clusters || ''),
    Fokus: 'Veröffentlichte Themen & Status',
    Status: 'completed',
    Summary: latestResearchRun
      ? `Projektstatus mit letztem Research-Stand aus ${latestResearchRun['Run Name'] || latestResearchRun.runName} synchronisiert.`
      : 'Projektstatus synchronisiert. Noch kein Research-Run im Sheet vorhanden.'
  };

  await appendRunRecord(runRecord);
  return { ok: true, runRecord };
}

module.exports = {
  executeProjectstatusSync,
  executeResearchRun,
  requireCronAuth
};
