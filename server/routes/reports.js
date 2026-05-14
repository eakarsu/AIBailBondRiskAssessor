const router = require('express').Router();
const auth = require('../middleware/auth');
const pool = require('../db');
const PDFDocument = require('pdfkit');

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
      pool.query('SELECT * FROM compliance_reports WHERE defendant_id = $1 ORDER BY created_at DESC LIMIT 20', [id]),
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

// GET /api/reports/risk-summary - aggregate risk scores by category
router.get('/risk-summary', auth, async (req, res) => {
  try {
    const [defendantRisks, assessmentStats, bondsByRisk] = await Promise.all([
      pool.query(
        `SELECT
           COALESCE(risk_level, 'UNKNOWN') as risk_level,
           COUNT(*) as count
         FROM defendants
         GROUP BY risk_level
         ORDER BY count DESC`
      ),
      pool.query(
        `SELECT
           COUNT(*) as total_assessments,
           COALESCE(AVG(overall_risk_score), 0) as avg_risk_score,
           COUNT(CASE WHEN overall_risk_score < 25 THEN 1 END) as low_count,
           COUNT(CASE WHEN overall_risk_score >= 25 AND overall_risk_score < 50 THEN 1 END) as medium_count,
           COUNT(CASE WHEN overall_risk_score >= 50 AND overall_risk_score < 75 THEN 1 END) as high_count,
           COUNT(CASE WHEN overall_risk_score >= 75 THEN 1 END) as critical_count
         FROM risk_assessments`
      ),
      pool.query(
        `SELECT d.risk_level, COUNT(bb.id) as bond_count,
                COALESCE(SUM(bb.bond_amount), 0) as total_bond_amount
         FROM bail_bonds bb
         LEFT JOIN defendants d ON bb.defendant_id = d.id
         GROUP BY d.risk_level
         ORDER BY total_bond_amount DESC`
      )
    ]);

    res.json({
      defendant_risk_distribution: defendantRisks.rows,
      assessment_stats: assessmentStats.rows[0],
      bonds_by_risk_level: bondsByRisk.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reports/bond-performance - forfeiture rate, active bonds, revenue metrics
router.get('/bond-performance', auth, async (req, res) => {
  try {
    const [overview, byStatus, monthly, topCharges] = await Promise.all([
      pool.query(
        `SELECT
           COUNT(*) as total_bonds,
           COUNT(CASE WHEN status = 'active' THEN 1 END) as active_bonds,
           COUNT(CASE WHEN status = 'forfeited' THEN 1 END) as forfeited_bonds,
           COUNT(CASE WHEN status = 'exonerated' THEN 1 END) as exonerated_bonds,
           COUNT(CASE WHEN status = 'surrendered' THEN 1 END) as surrendered_bonds,
           COALESCE(SUM(bond_amount), 0) as total_bond_value,
           COALESCE(SUM(premium_amount), 0) as total_premium_revenue,
           COALESCE(SUM(CASE WHEN status = 'forfeited' THEN bond_amount ELSE 0 END), 0) as forfeited_amount,
           COALESCE(AVG(bond_amount), 0) as avg_bond_amount,
           ROUND(
             100.0 * COUNT(CASE WHEN status = 'forfeited' THEN 1 END) / NULLIF(COUNT(*), 0), 2
           ) as forfeiture_rate_pct
         FROM bail_bonds`
      ),
      pool.query(
        `SELECT status, COUNT(*) as count, COALESCE(SUM(bond_amount), 0) as total_amount
         FROM bail_bonds GROUP BY status ORDER BY count DESC`
      ),
      pool.query(
        `SELECT
           TO_CHAR(created_at, 'YYYY-MM') as month,
           COUNT(*) as bonds_issued,
           COALESCE(SUM(bond_amount), 0) as bond_value,
           COALESCE(SUM(premium_amount), 0) as premium_revenue
         FROM bail_bonds
         WHERE created_at >= NOW() - INTERVAL '12 months'
         GROUP BY month
         ORDER BY month DESC`
      ),
      pool.query(
        `SELECT charge, COUNT(*) as count,
                COALESCE(AVG(bond_amount), 0) as avg_bond_amount
         FROM bail_bonds
         WHERE charge IS NOT NULL
         GROUP BY charge
         ORDER BY count DESC
         LIMIT 10`
      )
    ]);

    res.json({
      overview: overview.rows[0],
      by_status: byStatus.rows,
      monthly_trend: monthly.rows,
      top_charges: topCharges.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reports/export/pdf - generate risk report PDF using pdfkit
router.get('/export/pdf', auth, async (req, res) => {
  try {
    const [overview, riskDist, bondPerf, recentAssessments] = await Promise.all([
      pool.query(
        `SELECT COUNT(*) as total_defendants,
                COUNT(CASE WHEN status = 'active' THEN 1 END) as active_defendants
         FROM defendants`
      ),
      pool.query(
        `SELECT COALESCE(risk_level, 'UNKNOWN') as risk_level, COUNT(*) as count
         FROM defendants GROUP BY risk_level ORDER BY count DESC`
      ),
      pool.query(
        `SELECT COUNT(*) as total_bonds,
                COUNT(CASE WHEN status = 'active' THEN 1 END) as active_bonds,
                COUNT(CASE WHEN status = 'forfeited' THEN 1 END) as forfeited_bonds,
                COALESCE(SUM(CASE WHEN status = 'active' THEN bond_amount ELSE 0 END), 0) as active_bond_value,
                COALESCE(SUM(premium_amount), 0) as total_revenue,
                ROUND(100.0 * COUNT(CASE WHEN status = 'forfeited' THEN 1 END) / NULLIF(COUNT(*), 0), 2) as forfeiture_rate
         FROM bail_bonds`
      ),
      pool.query(
        `SELECT ra.*, d.first_name, d.last_name
         FROM risk_assessments ra
         LEFT JOIN defendants d ON ra.defendant_id = d.id
         ORDER BY ra.created_at DESC LIMIT 10`
      )
    ]);

    const doc = new PDFDocument({ margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="risk-report-${new Date().toISOString().slice(0,10)}.pdf"`);
    doc.pipe(res);

    // Title
    doc.fontSize(22).font('Helvetica-Bold').text('AI Bail Bond Risk Assessment Report', { align: 'center' });
    doc.fontSize(11).font('Helvetica').fillColor('#666')
      .text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
    doc.moveDown(1.5);

    // Executive Summary
    doc.fontSize(15).font('Helvetica-Bold').fillColor('#000').text('Executive Summary');
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#3B82F6').moveDown(0.5);

    const ov = overview.rows[0];
    const bp = bondPerf.rows[0];
    const summaryLines = [
      `Total Defendants: ${ov.total_defendants}  |  Active: ${ov.active_defendants}`,
      `Total Bonds: ${bp.total_bonds}  |  Active: ${bp.active_bonds}  |  Forfeited: ${bp.forfeited_bonds}`,
      `Active Bond Value: $${parseFloat(bp.active_bond_value).toLocaleString()}`,
      `Total Premium Revenue: $${parseFloat(bp.total_revenue).toLocaleString()}`,
      `Forfeiture Rate: ${bp.forfeiture_rate || 0}%`,
    ];
    doc.fontSize(11).font('Helvetica');
    summaryLines.forEach(line => doc.text(line));
    doc.moveDown(1.5);

    // Risk Distribution
    doc.fontSize(15).font('Helvetica-Bold').text('Defendant Risk Distribution');
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#3B82F6').moveDown(0.5);
    doc.fontSize(11).font('Helvetica');
    riskDist.rows.forEach(row => {
      doc.text(`${row.risk_level}: ${row.count} defendants`);
    });
    doc.moveDown(1.5);

    // Recent Assessments
    doc.fontSize(15).font('Helvetica-Bold').text('Recent Risk Assessments (Last 10)');
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#3B82F6').moveDown(0.5);
    doc.fontSize(10).font('Helvetica');
    recentAssessments.rows.forEach((ra, i) => {
      const name = `${ra.first_name || ''} ${ra.last_name || ''}`.trim() || `Defendant #${ra.defendant_id}`;
      const score = ra.overall_risk_score !== undefined ? `Score: ${ra.overall_risk_score}` : '';
      const level = ra.risk_level || '';
      const date = ra.created_at ? new Date(ra.created_at).toLocaleDateString() : '';
      doc.text(`${i + 1}. ${name} — ${level} ${score}  [${date}]`);
    });

    doc.moveDown(2);
    doc.fontSize(9).fillColor('#999').text('This report is generated automatically and is for internal use only.', { align: 'center' });

    doc.end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reports/defendant/:id - alias for defendant-profile/:id
router.get('/defendant/:id', auth, async (req, res) => {
  try {
    const id = req.params.id;

    const defendant = await pool.query('SELECT * FROM defendants WHERE id = $1', [id]);
    if (defendant.rows.length === 0) return res.status(404).json({ error: 'Defendant not found' });

    const [
      bailBonds, riskAssessments, courtCases, flightRisk,
      criminalHistory, employment, communityTies, financial,
      substanceAbuse, mentalHealth, recidivism, surety
    ] = await Promise.all([
      pool.query('SELECT * FROM bail_bonds WHERE defendant_id = $1 ORDER BY created_at DESC', [id]),
      pool.query('SELECT * FROM risk_assessments WHERE defendant_id = $1 ORDER BY created_at DESC', [id]),
      pool.query('SELECT * FROM court_cases WHERE defendant_id = $1 ORDER BY created_at DESC', [id]),
      pool.query('SELECT * FROM flight_risk WHERE defendant_id = $1 ORDER BY created_at DESC', [id]),
      pool.query('SELECT * FROM criminal_history WHERE defendant_id = $1 ORDER BY created_at DESC', [id]),
      pool.query('SELECT * FROM employment WHERE defendant_id = $1 ORDER BY created_at DESC', [id]),
      pool.query('SELECT * FROM community_ties WHERE defendant_id = $1 ORDER BY created_at DESC', [id]),
      pool.query('SELECT * FROM financial WHERE defendant_id = $1 ORDER BY created_at DESC', [id]),
      pool.query('SELECT * FROM substance_abuse WHERE defendant_id = $1 ORDER BY created_at DESC', [id]),
      pool.query('SELECT * FROM mental_health WHERE defendant_id = $1 ORDER BY created_at DESC', [id]),
      pool.query('SELECT * FROM recidivism WHERE defendant_id = $1 ORDER BY created_at DESC', [id]),
      pool.query('SELECT * FROM surety WHERE defendant_id = $1 ORDER BY created_at DESC', [id]),
    ]);

    res.json({
      defendant: defendant.rows[0],
      bail_bonds: bailBonds.rows,
      risk_assessments: riskAssessments.rows,
      court_cases: courtCases.rows,
      flight_risk: flightRisk.rows,
      criminal_history: criminalHistory.rows,
      employment: employment.rows,
      community_ties: communityTies.rows,
      financial: financial.rows,
      substance_abuse: substanceAbuse.rows,
      mental_health: mentalHealth.rows,
      recidivism: recidivism.rows,
      surety: surety.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/reports/pdf-export - generate PDF for a specific defendant risk report
router.post('/pdf-export', auth, async (req, res) => {
  try {
    const { defendant_id } = req.body;

    if (!defendant_id) {
      return res.status(400).json({ error: 'defendant_id is required' });
    }

    const [defResult, bondResult, riskResult, courtResult, historyResult] = await Promise.all([
      pool.query('SELECT * FROM defendants WHERE id = $1', [defendant_id]),
      pool.query('SELECT * FROM bail_bonds WHERE defendant_id = $1 ORDER BY created_at DESC LIMIT 5', [defendant_id]),
      pool.query('SELECT * FROM risk_assessments WHERE defendant_id = $1 ORDER BY created_at DESC LIMIT 5', [defendant_id]),
      pool.query('SELECT * FROM court_cases WHERE defendant_id = $1 ORDER BY next_hearing_date ASC', [defendant_id]),
      pool.query('SELECT * FROM criminal_history WHERE defendant_id = $1 ORDER BY created_at DESC', [defendant_id]),
    ]);

    if (defResult.rows.length === 0) {
      return res.status(404).json({ error: 'Defendant not found' });
    }

    const defendant = defResult.rows[0];
    const doc = new PDFDocument({ margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="defendant-${defendant_id}-report-${new Date().toISOString().slice(0, 10)}.pdf"`);
    doc.pipe(res);

    // Header
    doc.fontSize(20).font('Helvetica-Bold').text('Defendant Risk Report', { align: 'center' });
    doc.fontSize(11).font('Helvetica').fillColor('#666')
      .text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
    doc.moveDown(1.5);

    // Defendant Info
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#000').text('Defendant Information');
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#3B82F6').moveDown(0.5);
    doc.fontSize(11).font('Helvetica');
    doc.text(`Name: ${defendant.first_name} ${defendant.last_name}`);
    doc.text(`Risk Level: ${defendant.risk_level || 'N/A'}`);
    doc.text(`Date of Birth: ${defendant.date_of_birth || 'N/A'}`);
    doc.text(`Phone: ${defendant.phone || 'N/A'}`);
    doc.text(`Address: ${defendant.address || 'N/A'}`);
    doc.moveDown(1.5);

    // Active Bonds
    doc.fontSize(14).font('Helvetica-Bold').text('Bail Bonds');
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#3B82F6').moveDown(0.5);
    doc.fontSize(10).font('Helvetica');
    if (bondResult.rows.length > 0) {
      bondResult.rows.forEach((b, i) => {
        doc.text(`${i + 1}. Amount: $${parseFloat(b.bond_amount || 0).toLocaleString()} | Type: ${b.bond_type || 'N/A'} | Status: ${b.status || 'N/A'} | Case: ${b.case_number || 'N/A'}`);
      });
    } else {
      doc.text('No bonds on record.');
    }
    doc.moveDown(1.5);

    // Risk Assessments
    doc.fontSize(14).font('Helvetica-Bold').text('Risk Assessments');
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#3B82F6').moveDown(0.5);
    doc.fontSize(10).font('Helvetica');
    if (riskResult.rows.length > 0) {
      riskResult.rows.forEach((r, i) => {
        doc.text(`${i + 1}. Score: ${r.overall_risk_score || 'N/A'} | Level: ${r.risk_level || 'N/A'} | Date: ${r.created_at ? new Date(r.created_at).toLocaleDateString() : 'N/A'}`);
      });
    } else {
      doc.text('No risk assessments on record.');
    }
    doc.moveDown(1.5);

    // Court Cases
    doc.fontSize(14).font('Helvetica-Bold').text('Court Cases');
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#3B82F6').moveDown(0.5);
    doc.fontSize(10).font('Helvetica');
    if (courtResult.rows.length > 0) {
      courtResult.rows.forEach((c, i) => {
        doc.text(`${i + 1}. ${c.hearing_type || 'Hearing'} at ${c.court_name || 'N/A'} on ${c.next_hearing_date ? new Date(c.next_hearing_date).toLocaleDateString() : 'N/A'} — Status: ${c.status || 'N/A'}`);
      });
    } else {
      doc.text('No court cases on record.');
    }
    doc.moveDown(1.5);

    // Criminal History
    doc.fontSize(14).font('Helvetica-Bold').text('Criminal History');
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#3B82F6').moveDown(0.5);
    doc.fontSize(10).font('Helvetica');
    if (historyResult.rows.length > 0) {
      historyResult.rows.forEach((h, i) => {
        doc.text(`${i + 1}. ${h.offense || h.offense_type || 'N/A'} — ${h.outcome || h.disposition || 'N/A'}`);
      });
    } else {
      doc.text('No criminal history on record.');
    }

    doc.moveDown(2);
    doc.fontSize(9).fillColor('#999')
      .text('This report is generated automatically and is for internal use only.', { align: 'center' });

    doc.end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

