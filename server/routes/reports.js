const router = require('express').Router();
const auth = require('../middleware/auth');
const pool = require('../db');

// GET /api/reports/risk-distribution - count of defendants by risk level
router.get('/risk-distribution', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT risk_level, COUNT(*) as count
       FROM defendants
       GROUP BY risk_level
       ORDER BY count DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reports/bond-summary - bond stats
router.get('/bond-summary', auth, async (req, res) => {
  try {
    const totalResult = await pool.query(
      `SELECT
         COUNT(*) as total_bonds,
         COALESCE(SUM(bond_amount), 0) as total_bond_amount,
         COALESCE(SUM(premium_amount), 0) as total_premium_amount,
         COALESCE(AVG(bond_amount), 0) as avg_bond_amount
       FROM bail_bonds`
    );

    const byTypeResult = await pool.query(
      `SELECT bond_type, COUNT(*) as count, COALESCE(SUM(bond_amount), 0) as total_amount
       FROM bail_bonds
       GROUP BY bond_type
       ORDER BY count DESC`
    );

    const byStatusResult = await pool.query(
      `SELECT status, COUNT(*) as count, COALESCE(SUM(bond_amount), 0) as total_amount
       FROM bail_bonds
       GROUP BY status
       ORDER BY count DESC`
    );

    res.json({
      summary: totalResult.rows[0],
      by_type: byTypeResult.rows,
      by_status: byStatusResult.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reports/court-calendar - upcoming court dates with defendant info
router.get('/court-calendar', auth, async (req, res) => {
  try {
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const values = [limit];
    let dateFilter = 'WHERE cc.next_hearing_date >= CURRENT_DATE';

    if (req.query.start) {
      values.push(req.query.start);
      dateFilter = `WHERE cc.next_hearing_date >= $${values.length}`;
    }
    if (req.query.end) {
      values.push(req.query.end);
      dateFilter += ` AND cc.next_hearing_date <= $${values.length}`;
    }

    const result = await pool.query(
      `SELECT cc.*, d.first_name, d.last_name, d.risk_level as defendant_risk_level
       FROM court_cases cc
       LEFT JOIN defendants d ON cc.defendant_id = d.id
       ${dateFilter}
       ORDER BY cc.next_hearing_date ASC
       LIMIT $1`,
      values
    );

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reports/compliance-summary - compliance stats
router.get('/compliance-summary', auth, async (req, res) => {
  try {
    const byStatusResult = await pool.query(
      `SELECT status, COUNT(*) as count
       FROM compliance_reports
       GROUP BY status
       ORDER BY count DESC`
    );

    const byRiskRating = await pool.query(
      `SELECT risk_rating, COUNT(*) as count
       FROM compliance_reports
       GROUP BY risk_rating
       ORDER BY count DESC`
    );

    const overdueResult = await pool.query(
      `SELECT COUNT(*) as overdue_count
       FROM compliance_reports
       WHERE due_date < CURRENT_DATE AND (status IS NULL OR status NOT IN ('Completed', 'completed'))`
    );

    const upcomingResult = await pool.query(
      `SELECT COUNT(*) as upcoming_count
       FROM compliance_reports
       WHERE due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + interval '7 days'
         AND (status IS NULL OR status NOT IN ('Completed', 'completed'))`
    );

    res.json({
      by_status: byStatusResult.rows,
      by_risk_rating: byRiskRating.rows,
      overdue_count: parseInt(overdueResult.rows[0].overdue_count),
      upcoming_7_days: parseInt(upcomingResult.rows[0].upcoming_count)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reports/defendant-profile/:id - aggregated defendant data
router.get('/defendant-profile/:id', auth, async (req, res) => {
  try {
    const id = req.params.id;

    const defendant = await pool.query('SELECT * FROM defendants WHERE id = $1', [id]);
    if (defendant.rows.length === 0) return res.status(404).json({ error: 'Defendant not found' });

    // Fetch all related data in parallel
    const [
      bailBonds,
      riskAssessments,
      courtCases,
      compliance,
      flightRisk,
      criminalHistory,
      employment,
      communityTies,
      financial,
      substanceAbuse,
      mentalHealth,
      recidivism,
      surety,
      notifications
    ] = await Promise.all([
      pool.query('SELECT * FROM bail_bonds WHERE defendant_id = $1 ORDER BY created_at DESC', [id]),
      pool.query('SELECT * FROM risk_assessments WHERE defendant_id = $1 ORDER BY created_at DESC', [id]),
      pool.query('SELECT * FROM court_cases WHERE defendant_id = $1 ORDER BY created_at DESC', [id]),
      pool.query('SELECT * FROM compliance_reports WHERE id IN (SELECT id FROM compliance_reports) ORDER BY created_at DESC LIMIT 20'),
      pool.query('SELECT * FROM flight_risk WHERE defendant_id = $1 ORDER BY created_at DESC', [id]),
      pool.query('SELECT * FROM criminal_history WHERE defendant_id = $1 ORDER BY created_at DESC', [id]),
      pool.query('SELECT * FROM employment WHERE defendant_id = $1 ORDER BY created_at DESC', [id]),
      pool.query('SELECT * FROM community_ties WHERE defendant_id = $1 ORDER BY created_at DESC', [id]),
      pool.query('SELECT * FROM financial WHERE defendant_id = $1 ORDER BY created_at DESC', [id]),
      pool.query('SELECT * FROM substance_abuse WHERE defendant_id = $1 ORDER BY created_at DESC', [id]),
      pool.query('SELECT * FROM mental_health WHERE defendant_id = $1 ORDER BY created_at DESC', [id]),
      pool.query('SELECT * FROM recidivism WHERE defendant_id = $1 ORDER BY created_at DESC', [id]),
      pool.query('SELECT * FROM surety WHERE defendant_id = $1 ORDER BY created_at DESC', [id]),
      pool.query("SELECT * FROM notifications WHERE related_entity_id = $1 AND related_entity_type = 'defendant' ORDER BY created_at DESC", [id])
    ]);

    res.json({
      defendant: defendant.rows[0],
      bail_bonds: bailBonds.rows,
      risk_assessments: riskAssessments.rows,
      court_cases: courtCases.rows,
      compliance: compliance.rows,
      flight_risk: flightRisk.rows,
      criminal_history: criminalHistory.rows,
      employment: employment.rows,
      community_ties: communityTies.rows,
      financial: financial.rows,
      substance_abuse: substanceAbuse.rows,
      mental_health: mentalHealth.rows,
      recidivism: recidivism.rows,
      surety: surety.rows,
      notifications: notifications.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reports/activity-feed - recent changes across all tables
router.get('/activity-feed', auth, async (req, res) => {
  try {
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));

    const tables = [
      { table: 'defendants', label: 'Defendant' },
      { table: 'bail_bonds', label: 'Bail Bond' },
      { table: 'risk_assessments', label: 'Risk Assessment' },
      { table: 'court_cases', label: 'Court Case' },
      { table: 'compliance_reports', label: 'Compliance Report' },
      { table: 'flight_risk', label: 'Flight Risk' },
      { table: 'criminal_history', label: 'Criminal History' },
      { table: 'employment', label: 'Employment' },
      { table: 'community_ties', label: 'Community Ties' },
      { table: 'financial', label: 'Financial' },
      { table: 'substance_abuse', label: 'Substance Abuse' },
      { table: 'mental_health', label: 'Mental Health' },
      { table: 'recidivism', label: 'Recidivism' },
      { table: 'surety', label: 'Surety' },
      { table: 'notifications', label: 'Notification' }
    ];

    const unionQueries = tables.map(t =>
      `SELECT id, '${t.label}' as entity_type, '${t.table}' as table_name, created_at, updated_at FROM ${t.table}`
    );

    const result = await pool.query(
      `SELECT * FROM (${unionQueries.join(' UNION ALL ')}) as activity
       ORDER BY GREATEST(created_at, COALESCE(updated_at, created_at)) DESC
       LIMIT $1`,
      [limit]
    );

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reports/overdue - overdue items
router.get('/overdue', auth, async (req, res) => {
  try {
    const [courtCases, compliance, notifications] = await Promise.all([
      pool.query(
        `SELECT cc.*, d.first_name, d.last_name
         FROM court_cases cc
         LEFT JOIN defendants d ON cc.defendant_id = d.id
         WHERE cc.next_hearing_date < CURRENT_DATE
           AND (cc.status IS NULL OR cc.status NOT IN ('Closed', 'closed', 'Completed', 'completed', 'Dismissed', 'dismissed'))
         ORDER BY cc.next_hearing_date ASC`
      ),
      pool.query(
        `SELECT *
         FROM compliance_reports
         WHERE due_date < CURRENT_DATE
           AND (status IS NULL OR status NOT IN ('Completed', 'completed'))
         ORDER BY due_date ASC`
      ),
      pool.query(
        `SELECT *
         FROM notifications
         WHERE due_date < CURRENT_DATE
           AND (is_read = false OR is_read IS NULL)
         ORDER BY due_date ASC`
      )
    ]);

    res.json({
      overdue_court_cases: courtCases.rows,
      overdue_compliance: compliance.rows,
      overdue_notifications: notifications.rows,
      summary: {
        court_cases: courtCases.rowCount,
        compliance: compliance.rowCount,
        notifications: notifications.rowCount,
        total: courtCases.rowCount + compliance.rowCount + notifications.rowCount
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
