const router = require('express').Router();
const auth = require('../middleware/auth');
const pool = require('../db');

// GET /api/audit-log - list audit log entries with pagination and filtering
router.get('/', auth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 25));
    const offset = (page - 1) * limit;

    const conditions = [];
    const values = [];
    let paramIndex = 1;

    // Filter by entity_type
    if (req.query.entity_type) {
      values.push(req.query.entity_type);
      conditions.push(`entity_type = $${paramIndex++}`);
    }

    // Filter by user_id
    if (req.query.user_id) {
      values.push(req.query.user_id);
      conditions.push(`user_id = $${paramIndex++}`);
    }

    // Filter by action (CREATE, UPDATE, DELETE)
    if (req.query.action) {
      values.push(req.query.action.toUpperCase());
      conditions.push(`action = $${paramIndex++}`);
    }

    // Filter by date range
    if (req.query.start_date) {
      values.push(req.query.start_date);
      conditions.push(`created_at >= $${paramIndex++}`);
    }
    if (req.query.end_date) {
      values.push(req.query.end_date);
      conditions.push(`created_at <= $${paramIndex++}::date + interval '1 day'`);
    }

    const whereSQL = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM audit_log ${whereSQL}`,
      values
    );
    const total = parseInt(countResult.rows[0].count);

    // Data with user info join
    const dataValues = [...values, limit, offset];
    const result = await pool.query(
      `SELECT a.*, u.name as user_name, u.email as user_email
       FROM audit_log a
       LEFT JOIN users u ON a.user_id = u.id
       ${whereSQL}
       ORDER BY a.created_at DESC
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

// GET /api/audit-log/:id - single entry
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.*, u.name as user_name, u.email as user_email
       FROM audit_log a
       LEFT JOIN users u ON a.user_id = u.id
       WHERE a.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
