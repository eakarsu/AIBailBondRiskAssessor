const router = require('express').Router();
const auth = require('../middleware/auth');
const pool = require('../db');

/**
 * GET /api/search?q=<term>&limit=20
 * Global search across defendants, bail bonds, and court cases.
 * Returns up to `limit` combined results grouped by entity type.
 */
router.get('/', auth, async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q || q.length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }

    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const term = `%${q}%`;

    const [defendants, bonds, cases] = await Promise.all([
      pool.query(
        `SELECT id, first_name, last_name, risk_level, status, city, state, phone
         FROM defendants
         WHERE first_name ILIKE $1 OR last_name ILIKE $1 OR phone ILIKE $1 OR email ILIKE $1
            OR (first_name || ' ' || last_name) ILIKE $1
         ORDER BY last_name, first_name
         LIMIT $2`,
        [term, limit]
      ).catch(() => ({ rows: [] })),

      pool.query(
        `SELECT bb.id, bb.case_number, bb.charge, bb.bond_amount, bb.status, bb.bond_type,
                d.first_name, d.last_name
         FROM bail_bonds bb
         LEFT JOIN defendants d ON bb.defendant_id = d.id
         WHERE bb.case_number ILIKE $1 OR bb.charge ILIKE $1 OR bb.court_name ILIKE $1
            OR (d.first_name || ' ' || d.last_name) ILIKE $1
         ORDER BY bb.created_at DESC
         LIMIT $2`,
        [term, limit]
      ).catch(() => ({ rows: [] })),

      pool.query(
        `SELECT cc.id, cc.case_number, cc.charge, cc.next_hearing_date, cc.status, cc.hearing_type,
                d.first_name, d.last_name
         FROM court_cases cc
         LEFT JOIN defendants d ON cc.defendant_id = d.id
         WHERE cc.case_number ILIKE $1 OR cc.charge ILIKE $1 OR cc.court_name ILIKE $1
            OR (d.first_name || ' ' || d.last_name) ILIKE $1
         ORDER BY cc.next_hearing_date DESC
         LIMIT $2`,
        [term, limit]
      ).catch(() => ({ rows: [] })),
    ]);

    res.json({
      query: q,
      results: {
        defendants: defendants.rows.map(r => ({ ...r, entity_type: 'defendant' })),
        bail_bonds: bonds.rows.map(r => ({ ...r, entity_type: 'bail_bond' })),
        court_cases: cases.rows.map(r => ({ ...r, entity_type: 'court_case' })),
      },
      total: defendants.rows.length + bonds.rows.length + cases.rows.length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
