const router = require('express').Router();
const auth = require('../middleware/auth');
const pool = require('../db');

// GET /api/calendar - returns all events with optional date range filter
router.get('/', auth, async (req, res) => {
  try {
    const conditions = [];
    const values = [];
    let paramIndex = 1;

    // Build date range conditions for each source
    let courtDateFilter = '';
    let complianceDateFilter = '';
    let notificationDateFilter = '';

    if (req.query.start) {
      values.push(req.query.start);
      const startParam = `$${paramIndex++}`;
      courtDateFilter += ` AND cc.next_hearing_date >= ${startParam}::date`;
      complianceDateFilter += ` AND cr.due_date >= ${startParam}::date`;
      notificationDateFilter += ` AND n.due_date >= ${startParam}::date`;
    }

    if (req.query.end) {
      values.push(req.query.end);
      const endParam = `$${paramIndex++}`;
      courtDateFilter += ` AND cc.next_hearing_date <= ${endParam}::date`;
      complianceDateFilter += ` AND cr.due_date <= ${endParam}::date`;
      notificationDateFilter += ` AND n.due_date <= ${endParam}::date`;
    }

    const query = `
      SELECT * FROM (
        SELECT
          cc.id,
          COALESCE(d.first_name || ' ' || d.last_name || ' - ', '') || cc.hearing_type || ' (' || cc.court_name || ')' as title,
          cc.next_hearing_date as date,
          'court' as type,
          cc.id as entity_id,
          'court_cases' as entity_type,
          '#3B82F6' as color
        FROM court_cases cc
        LEFT JOIN defendants d ON cc.defendant_id = d.id
        WHERE cc.next_hearing_date IS NOT NULL ${courtDateFilter}

        UNION ALL

        SELECT
          cr.id,
          cr.title as title,
          cr.due_date as date,
          'compliance' as type,
          cr.id as entity_id,
          'compliance_reports' as entity_type,
          '#F59E0B' as color
        FROM compliance_reports cr
        WHERE cr.due_date IS NOT NULL ${complianceDateFilter}

        UNION ALL

        SELECT
          n.id,
          n.title as title,
          n.due_date as date,
          'notification' as type,
          n.id as entity_id,
          'notifications' as entity_type,
          '#EF4444' as color
        FROM notifications n
        WHERE n.due_date IS NOT NULL ${notificationDateFilter}
      ) events
      ORDER BY date ASC
    `;

    const result = await pool.query(query, values);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/calendar/court-dates - list upcoming court dates for active bonds
router.get('/court-dates', auth, async (req, res) => {
  try {
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));

    const result = await pool.query(
      `SELECT cc.*, d.first_name, d.last_name, d.risk_level,
              bb.bond_amount, bb.status as bond_status, bb.case_number
       FROM court_cases cc
       LEFT JOIN defendants d ON cc.defendant_id = d.id
       LEFT JOIN bail_bonds bb ON bb.defendant_id = d.id AND bb.status = 'active'
       WHERE cc.next_hearing_date >= CURRENT_DATE
       ORDER BY cc.next_hearing_date ASC
       LIMIT $1`,
      [limit]
    );

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/calendar/court-dates - add court date for a bond
router.post('/court-dates', auth, async (req, res) => {
  try {
    const {
      defendant_id, hearing_type, court_name, next_hearing_date, judge_name,
      courtroom, case_number, notes, status
    } = req.body;

    if (!defendant_id) return res.status(400).json({ error: 'defendant_id is required' });
    if (!next_hearing_date) return res.status(400).json({ error: 'next_hearing_date is required' });

    const result = await pool.query(
      `INSERT INTO court_cases
        (defendant_id, hearing_type, court_name, next_hearing_date, judge_name, courtroom, case_number, notes, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [
        defendant_id, hearing_type || 'Hearing', court_name || null,
        next_hearing_date, judge_name || null, courtroom || null,
        case_number || null, notes || null, status || 'Scheduled'
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/calendar/reminders - list reminders due in next 7 days
router.get('/reminders', auth, async (req, res) => {
  try {
    const days = Math.min(30, Math.max(1, parseInt(req.query.days) || 7));

    const [courtReminders, complianceReminders, notificationReminders] = await Promise.all([
      pool.query(
        `SELECT cc.id, cc.next_hearing_date as due_date, cc.hearing_type, cc.court_name,
                d.first_name, d.last_name, d.risk_level,
                'court_date' as reminder_type,
                CONCAT(d.first_name, ' ', d.last_name, ' - ', cc.hearing_type) as title
         FROM court_cases cc
         LEFT JOIN defendants d ON cc.defendant_id = d.id
         WHERE cc.next_hearing_date BETWEEN CURRENT_DATE AND CURRENT_DATE + $1 * INTERVAL '1 day'
           AND (cc.status IS NULL OR cc.status NOT IN ('Closed','closed','Completed','completed','Dismissed','dismissed'))
         ORDER BY cc.next_hearing_date ASC`,
        [days]
      ),
      pool.query(
        `SELECT id, due_date, title, status, risk_rating,
                'compliance' as reminder_type
         FROM compliance_reports
         WHERE due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + $1 * INTERVAL '1 day'
           AND (status IS NULL OR status NOT IN ('Completed','completed'))
         ORDER BY due_date ASC`,
        [days]
      ),
      pool.query(
        `SELECT id, due_date, title, is_read,
                'notification' as reminder_type
         FROM notifications
         WHERE due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + $1 * INTERVAL '1 day'
           AND (is_read = false OR is_read IS NULL)
         ORDER BY due_date ASC`,
        [days]
      )
    ]);

    res.json({
      court_dates: courtReminders.rows,
      compliance: complianceReminders.rows,
      notifications: notificationReminders.rows,
      total: courtReminders.rowCount + complianceReminders.rowCount + notificationReminders.rowCount,
      days_ahead: days
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/calendar/upcoming - next 30 days court dates
router.get('/upcoming', auth, async (req, res) => {
  try {
    const days = Math.min(90, Math.max(1, parseInt(req.query.days) || 30));
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 25));
    const offset = (page - 1) * limit;

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM court_cases cc
       WHERE cc.next_hearing_date BETWEEN CURRENT_DATE AND CURRENT_DATE + $1 * INTERVAL '1 day'
         AND (cc.status IS NULL OR cc.status NOT IN ('Closed','closed','Completed','completed','Dismissed','dismissed'))`,
      [days]
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(
      `SELECT cc.*, d.first_name, d.last_name, d.risk_level,
              bb.bond_amount, bb.status as bond_status, bb.case_number as bond_case_number
       FROM court_cases cc
       LEFT JOIN defendants d ON cc.defendant_id = d.id
       LEFT JOIN bail_bonds bb ON bb.defendant_id = d.id AND bb.status = 'active'
       WHERE cc.next_hearing_date BETWEEN CURRENT_DATE AND CURRENT_DATE + $1 * INTERVAL '1 day'
         AND (cc.status IS NULL OR cc.status NOT IN ('Closed','closed','Completed','completed','Dismissed','dismissed'))
       ORDER BY cc.next_hearing_date ASC
       LIMIT $2 OFFSET $3`,
      [days, limit, offset]
    );

    res.json({
      data: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      days_ahead: days,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/calendar/court-date - schedule a court date (alias for /court-dates)
router.post('/court-date', auth, async (req, res) => {
  try {
    const {
      defendant_id, hearing_type, court_name, next_hearing_date,
      judge_name, courtroom, case_number, notes, status
    } = req.body;

    if (!defendant_id) return res.status(400).json({ error: 'defendant_id is required' });
    if (!next_hearing_date) return res.status(400).json({ error: 'next_hearing_date is required' });

    const defCheck = await pool.query('SELECT id FROM defendants WHERE id = $1', [defendant_id]);
    if (defCheck.rows.length === 0) return res.status(404).json({ error: 'Defendant not found' });

    const result = await pool.query(
      `INSERT INTO court_cases
        (defendant_id, hearing_type, court_name, next_hearing_date, judge_name, courtroom, case_number, notes, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [
        defendant_id,
        hearing_type || 'Hearing',
        court_name || null,
        next_hearing_date,
        judge_name || null,
        courtroom || null,
        case_number || null,
        notes || null,
        status || 'Scheduled',
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/calendar/court-date/:id - update/reschedule a court date
router.put('/court-date/:id', auth, async (req, res) => {
  try {
    const id = req.params.id;
    const {
      hearing_type, court_name, next_hearing_date,
      judge_name, courtroom, case_number, notes, status
    } = req.body;

    const existing = await pool.query('SELECT * FROM court_cases WHERE id = $1', [id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Court date not found' });

    const current = existing.rows[0];

    const result = await pool.query(
      `UPDATE court_cases SET
        hearing_type = $1,
        court_name = $2,
        next_hearing_date = $3,
        judge_name = $4,
        courtroom = $5,
        case_number = $6,
        notes = $7,
        status = $8,
        updated_at = NOW()
       WHERE id = $9
       RETURNING *`,
      [
        hearing_type !== undefined ? hearing_type : current.hearing_type,
        court_name !== undefined ? court_name : current.court_name,
        next_hearing_date !== undefined ? next_hearing_date : current.next_hearing_date,
        judge_name !== undefined ? judge_name : current.judge_name,
        courtroom !== undefined ? courtroom : current.courtroom,
        case_number !== undefined ? case_number : current.case_number,
        notes !== undefined ? notes : current.notes,
        status !== undefined ? status : current.status,
        id,
      ]
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

