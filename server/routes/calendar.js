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

module.exports = router;
