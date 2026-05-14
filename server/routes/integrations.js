// PRODUCT-DECISION: External integrations are exposed as gated stubs that
// return 503 with a `missing` field naming the unset env var. This keeps the
// API surface stable without requiring restricted creds at dev time.
//
// Required env vars (all optional, all gated):
//   PACER_API_KEY         — court records (PACER)
//   NCIC_API_KEY          — law-enforcement criminal background (NCIC)
//   WEBLOMS_API_KEY       — probation/case management (WebLOMS)
//
// When a key is set, this stub still does NOT call the external service —
// outbound HTTP to government systems is deliberately deferred to a future
// implementation that includes auth-handshake, signed-request, and audit
// requirements specific to each provider. The 200 path returns a clearly
// labelled mock payload so the UI can be wired end-to-end.

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const pool = require('../db');

router.use(auth);

function gate(req, res, envVar) {
  if (!process.env[envVar]) {
    res.status(503).json({
      error: `${envVar} not configured`,
      missing: envVar,
      hint: `Set ${envVar} in .env to enable this integration.`,
    });
    return false;
  }
  return true;
}

async function ensureIntegrationLogTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS integration_log (
      id SERIAL PRIMARY KEY,
      provider VARCHAR(64) NOT NULL,
      defendant_id INTEGER,
      payload JSONB,
      response JSONB,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `).catch(() => {});
}
ensureIntegrationLogTable();

async function logIntegration(provider, defendantId, payload, response) {
  try {
    await pool.query(
      'INSERT INTO integration_log (provider, defendant_id, payload, response) VALUES ($1,$2,$3,$4)',
      [provider, defendantId || null, payload || {}, response || {}]
    );
  } catch (_) { /* best-effort */ }
}

// PACER — court records lookup
router.post('/pacer/lookup', async (req, res) => {
  if (!gate(req, res, 'PACER_API_KEY')) return;
  const { defendant_id, case_number, name } = req.body || {};
  const stub = {
    provider: 'PACER',
    matched: !!(case_number || name),
    case_number: case_number || null,
    cases: case_number ? [{ case_number, court: 'PACER-STUB', filed: '2024-01-01', status: 'PENDING' }] : [],
    note: 'STUB response — outbound PACER calls not yet implemented.',
  };
  await logIntegration('pacer', defendant_id, req.body, stub);
  res.json(stub);
});

// NCIC — criminal background flag check
router.post('/ncic/check', async (req, res) => {
  if (!gate(req, res, 'NCIC_API_KEY')) return;
  const { defendant_id, ssn_last4, dob } = req.body || {};
  const stub = {
    provider: 'NCIC',
    flags: [],
    warrants: [],
    advisory: 'STUB response — NCIC requires CJIS-compliant transport not implemented here.',
    matched_on: { ssn_last4: ssn_last4 || null, dob: dob || null },
  };
  await logIntegration('ncic', defendant_id, req.body, stub);
  res.json(stub);
});

// WebLOMS — probation/case-management push
router.post('/webloms/sync', async (req, res) => {
  if (!gate(req, res, 'WEBLOMS_API_KEY')) return;
  const { defendant_id, status, notes } = req.body || {};
  const stub = {
    provider: 'WebLOMS',
    synced: true,
    defendant_id: defendant_id || null,
    status: status || 'unknown',
    note: 'STUB response — outbound WebLOMS push not yet implemented.',
  };
  await logIntegration('webloms', defendant_id, req.body, stub);
  res.json(stub);
});

// GET recent integration log (across providers)
router.get('/log', async (req, res) => {
  try {
    const r = await pool.query(
      'SELECT id, provider, defendant_id, response, created_at FROM integration_log ORDER BY created_at DESC LIMIT 50'
    );
    res.json(r.rows);
  } catch (err) {
    res.json([]); // table may not exist yet on a brand-new DB
  }
});

module.exports = router;
