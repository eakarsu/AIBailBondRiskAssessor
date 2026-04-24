const router = require('express').Router();
const auth = require('../middleware/auth');
const pool = require('../db');

router.get('/stats', auth, async (req, res) => {
  try {
    const defendants = await pool.query('SELECT COUNT(*) as count FROM defendants');
    const bonds = await pool.query('SELECT COUNT(*) as count, COALESCE(SUM(bond_amount),0) as total FROM bail_bonds');
    const assessments = await pool.query('SELECT COUNT(*) as count FROM risk_assessments');
    const cases = await pool.query('SELECT COUNT(*) as count FROM court_cases');
    const highRisk = await pool.query("SELECT COUNT(*) as count FROM defendants WHERE risk_level IN ('HIGH', 'VERY HIGH')");
    const pendingCases = await pool.query("SELECT COUNT(*) as count FROM court_cases WHERE status = 'Pending'");
    const activeNotifications = await pool.query("SELECT COUNT(*) as count FROM notifications WHERE is_read = false");
    const complianceIssues = await pool.query("SELECT COUNT(*) as count FROM compliance_reports WHERE status = 'Non-Compliant'");

    res.json({
      total_defendants: parseInt(defendants.rows[0].count),
      total_bonds: parseInt(bonds.rows[0].count),
      total_bond_amount: parseFloat(bonds.rows[0].total),
      total_assessments: parseInt(assessments.rows[0].count),
      total_cases: parseInt(cases.rows[0].count),
      high_risk_defendants: parseInt(highRisk.rows[0].count),
      pending_cases: parseInt(pendingCases.rows[0].count),
      unread_notifications: parseInt(activeNotifications.rows[0].count),
      compliance_issues: parseInt(complianceIssues.rows[0].count)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
