const router = require('express').Router();
const auth = require('../middleware/auth');
const pool = require('../db');

// GET /api/bail-bonds - list with pagination + filters
router.get('/', auth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 25));
    const offset = (page - 1) * limit;

    const conditions = [];
    const values = [];
    let paramIndex = 1;

    if (req.query.status) {
      values.push(req.query.status);
      conditions.push(`bb.status = $${paramIndex++}`);
    }

    if (req.query.defendant_name) {
      values.push(`%${req.query.defendant_name.trim()}%`);
      conditions.push(`(d.first_name || ' ' || d.last_name) ILIKE $${paramIndex++}`);
    }

    if (req.query.bond_amount_min) {
      values.push(parseFloat(req.query.bond_amount_min));
      conditions.push(`bb.bond_amount >= $${paramIndex++}`);
    }

    if (req.query.bond_amount_max) {
      values.push(parseFloat(req.query.bond_amount_max));
      conditions.push(`bb.bond_amount <= $${paramIndex++}`);
    }

    if (req.query.search) {
      values.push(`%${req.query.search.trim()}%`);
      conditions.push(`(bb.case_number ILIKE $${paramIndex} OR bb.charge ILIKE $${paramIndex} OR bb.court_name ILIKE $${paramIndex} OR (d.first_name || ' ' || d.last_name) ILIKE $${paramIndex})`);
      paramIndex++;
    }

    const whereSQL = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM bail_bonds bb LEFT JOIN defendants d ON bb.defendant_id = d.id ${whereSQL}`,
      values
    );
    const total = parseInt(countResult.rows[0].count);

    const dataValues = [...values, limit, offset];
    const result = await pool.query(
      `SELECT bb.*, d.first_name, d.last_name, d.risk_level as defendant_risk_level, d.phone, d.email
       FROM bail_bonds bb
       LEFT JOIN defendants d ON bb.defendant_id = d.id
       ${whereSQL}
       ORDER BY bb.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      dataValues
    );

    res.json({
      data: result.rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/bail-bonds - create new bail bond case
router.post('/', auth, async (req, res) => {
  try {
    const {
      defendant_id, bond_amount, premium_amount, bond_type, status,
      court_date, court_name, case_number, charge, collateral, notes
    } = req.body;

    if (!defendant_id) return res.status(400).json({ error: 'defendant_id is required' });
    if (!bond_amount || isNaN(bond_amount) || parseFloat(bond_amount) <= 0) {
      return res.status(400).json({ error: 'bond_amount must be a positive number' });
    }

    const result = await pool.query(
      `INSERT INTO bail_bonds
        (defendant_id, bond_amount, premium_amount, bond_type, status, court_date, court_name, case_number, charge, collateral, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [defendant_id, bond_amount, premium_amount || null, bond_type || null,
       status || 'active', court_date || null, court_name || null,
       case_number || null, charge || null, collateral || null, notes || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/bail-bonds/:id - get single with defendant info and linked AI assessments
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const bondResult = await pool.query(
      `SELECT bb.*, d.first_name, d.last_name, d.date_of_birth, d.address, d.city, d.state,
              d.zip_code, d.phone, d.email, d.gender, d.risk_level as defendant_risk_level,
              d.status as defendant_status, d.notes as defendant_notes
       FROM bail_bonds bb
       LEFT JOIN defendants d ON bb.defendant_id = d.id
       WHERE bb.id = $1`,
      [id]
    );

    if (bondResult.rows.length === 0) return res.status(404).json({ error: 'Bail bond not found' });

    const bond = bondResult.rows[0];

    const [assessments, courtCases, history] = await Promise.all([
      pool.query(
        'SELECT * FROM risk_assessments WHERE defendant_id = $1 ORDER BY created_at DESC LIMIT 5',
        [bond.defendant_id]
      ),
      pool.query(
        'SELECT * FROM court_cases WHERE defendant_id = $1 ORDER BY next_hearing_date ASC',
        [bond.defendant_id]
      ),
      pool.query(
        `SELECT * FROM bail_bond_status_history WHERE bail_bond_id = $1 ORDER BY changed_at DESC`,
        [id]
      ).catch(() => ({ rows: [] })) // gracefully handle if table doesn't exist yet
    ]);

    res.json({
      ...bond,
      ai_assessments: assessments.rows,
      court_cases: courtCases.rows,
      status_history: history.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/bail-bonds/:id - update status
router.patch('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const validStatuses = ['active', 'forfeited', 'exonerated', 'surrendered'];

    const fields = [];
    const values = [];
    let paramIndex = 1;

    const allowedFields = [
      'status', 'bond_amount', 'premium_amount', 'bond_type', 'court_date',
      'court_name', 'case_number', 'charge', 'collateral', 'notes'
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        if (field === 'status' && !validStatuses.includes(req.body[field])) {
          return res.status(400).json({ error: `status must be one of: ${validStatuses.join(', ')}` });
        }
        fields.push(`${field} = $${paramIndex++}`);
        values.push(req.body[field]);
      }
    }

    if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });

    values.push(id);
    const result = await pool.query(
      `UPDATE bail_bonds SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Bail bond not found' });

    // Log status change if status was updated
    if (req.body.status) {
      await pool.query(
        `INSERT INTO bail_bond_status_history (bail_bond_id, new_status, changed_by, changed_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT DO NOTHING`,
        [id, req.body.status, req.user?.id || null]
      ).catch(() => {}); // gracefully skip if table doesn't exist
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/bail-bonds/:id/history - get status change history
router.get('/:id/history', auth, async (req, res) => {
  try {
    const { id } = req.params;

    // Verify bond exists
    const bondCheck = await pool.query('SELECT id FROM bail_bonds WHERE id = $1', [id]);
    if (bondCheck.rows.length === 0) return res.status(404).json({ error: 'Bail bond not found' });

    const history = await pool.query(
      `SELECT h.*, u.email as changed_by_email
       FROM bail_bond_status_history h
       LEFT JOIN users u ON h.changed_by = u.id
       WHERE h.bail_bond_id = $1
       ORDER BY h.changed_at DESC`,
      [id]
    ).catch(async () => {
      // If history table doesn't exist, return bond's own timeline
      const bond = await pool.query(
        'SELECT id, status, created_at, updated_at FROM bail_bonds WHERE id = $1',
        [id]
      );
      return { rows: bond.rows };
    });

    res.json(history.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
