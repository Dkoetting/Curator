const { executeResearchRun, requireCronAuth } = require('./_lib/cron-utils');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  if (!requireCronAuth(req, res)) return;

  try {
    const result = await executeResearchRun({
      runName: 'Morning DACH',
      bucket: 'dach',
      regionLabel: 'DACH / EU',
      focus: 'Top-Themen aktiv'
    });

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Morning DACH fehlgeschlagen.'
    });
  }
};
