const router = require('express').Router();
const auth = require('../middleware/auth');
const pool = require('../db');
const { queryOpenRouter, persistAIResult } = require('../services/openrouter');
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const { body, validationResult } = require('express-validator');

// Rate limiter: 20 AI calls per user per hour
const aiRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  keyGenerator: (req) => req.user?.id ? `user_${req.user.id}` : ipKeyGenerator(req),
  message: { error: 'Too many AI requests. Limit is 20 per hour. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
};

const BAIL_SYSTEM_PROMPT = 'You are an AI bail bond risk assessment expert. Provide detailed, professional analysis based on defendant data.';

/**
 * Auto-create a CRITICAL notification when AI detects high risk.
 * Best-effort — never throws.
 */
async function autoNotifyIfCritical(pool, { result, feature, defendant_id, defendant_name, user_id }) {
  try {
    const riskLevel = (result.risk_level || result.alert_level || '').toUpperCase();
    const rapidDeg = result.rapid_degradation_alert === true;
    const isCritical = riskLevel === 'CRITICAL' || riskLevel === 'VERY HIGH' || rapidDeg;
    if (!isCritical) return;

    const featureLabels = {
      'fta-forecast': 'FTA Forecast',
      'condition-monitoring': 'Condition Monitoring',
      'risk-trends': 'Risk Trend Analysis',
      'geopolitical-risk-alert': 'Geopolitical Risk Alert',
    };
    const featureLabel = featureLabels[feature] || feature;

    const title = `CRITICAL AI Alert: ${featureLabel}`;
    const message = rapidDeg
      ? `Rapid risk degradation detected for ${defendant_name}. Immediate review required.`
      : `AI ${featureLabel} flagged ${defendant_name} as ${riskLevel} risk. Immediate review required.`;

    await pool.query(
      `INSERT INTO notifications (title, message, type, priority, recipient_id, related_entity_type, related_entity_id, is_read, action_required)
       VALUES ($1, $2, $3, $4, $5, $6, $7, false, true)`,
      [title, message, 'risk_change', 'CRITICAL', user_id || null, 'defendant', defendant_id]
    );
  } catch (err) {
    // Best-effort: don't fail the request
  }
}

// POST /api/ai/fta-forecast
// Predict next court appearance failure-to-appear probability
router.post('/fta-forecast',
  auth,
  aiRateLimiter,
  [
    body('defendant_id').notEmpty().isInt({ min: 1 }).withMessage('defendant_id is required and must be a positive integer'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { defendant_id } = req.body;

      const [defResult, bondResult, courtResult, historyResult, flightResult] = await Promise.all([
        pool.query('SELECT * FROM defendants WHERE id = $1', [defendant_id]),
        pool.query('SELECT * FROM bail_bonds WHERE defendant_id = $1 ORDER BY created_at DESC LIMIT 5', [defendant_id]),
        pool.query('SELECT * FROM court_cases WHERE defendant_id = $1 ORDER BY next_hearing_date DESC LIMIT 10', [defendant_id]),
        pool.query('SELECT * FROM criminal_histories WHERE defendant_id = $1 ORDER BY offense_date DESC', [defendant_id])
          .catch(() => ({ rows: [] })),
        pool.query('SELECT * FROM flight_risk_analyses WHERE defendant_id = $1 ORDER BY created_at DESC LIMIT 1', [defendant_id])
          .catch(() => ({ rows: [] })),
      ]);

      if (defResult.rows.length === 0) {
        return res.status(404).json({ error: 'Defendant not found' });
      }

      const defendant = defResult.rows[0];
      const priorFTAs = courtResult.rows.filter(c => c.status && c.status.toLowerCase().includes('fta')).length;
      const totalHearings = courtResult.rows.length;

      const prompt = `You are an expert in predicting Failure-to-Appear (FTA) for bail bond defendants. Analyze the following defendant data and predict the probability that this defendant will fail to appear at their next scheduled court date.

DEFENDANT PROFILE:
${JSON.stringify(defendant, null, 2)}

BAIL BONDS (most recent first):
${JSON.stringify(bondResult.rows, null, 2)}

COURT CASE HISTORY (${totalHearings} hearings, ${priorFTAs} prior FTAs):
${JSON.stringify(courtResult.rows, null, 2)}

CRIMINAL HISTORY:
${JSON.stringify(historyResult.rows, null, 2)}

FLIGHT RISK DATA:
${JSON.stringify(flightResult.rows[0] || {}, null, 2)}

Return ONLY valid JSON in this exact format:
{
  "fta_probability": <number 0-100>,
  "risk_level": "<LOW|MEDIUM|HIGH|CRITICAL>",
  "key_fta_indicators": ["list of factors driving FTA risk"],
  "mitigating_factors": ["factors reducing FTA risk"],
  "prior_fta_count": ${priorFTAs},
  "recommended_interventions": ["specific steps to reduce FTA likelihood"],
  "check_in_frequency": "<DAILY|WEEKLY|BI-WEEKLY|MONTHLY>",
  "gps_monitoring_recommended": <boolean>,
  "appearance_bond_recommendation": "<MAINTAIN|INCREASE|SURRENDER>",
  "confidence_level": <number 0-100>,
  "detailed_analysis": "2-3 paragraph professional FTA risk analysis"
}`;

      const result = await queryOpenRouter(prompt, BAIL_SYSTEM_PROMPT);

      await persistAIResult(pool, {
        feature: 'fta-forecast', entity_type: 'defendant', entity_id: defendant_id,
        user_email: req.user?.email, request_payload: req.body, response: result,
      });

      await autoNotifyIfCritical(pool, {
        result, feature: 'fta-forecast', defendant_id,
        defendant_name: `${defendant.first_name} ${defendant.last_name}`,
        user_id: req.user?.id,
      });

      res.json({
        defendant_id,
        defendant_name: `${defendant.first_name} ${defendant.last_name}`,
        total_hearings: totalHearings,
        prior_ftas: priorFTAs,
        forecast: result,
        generated_at: new Date().toISOString(),
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// POST /api/ai/condition-monitoring
// Suggest GPS/substance testing frequency based on risk tier
router.post('/condition-monitoring',
  auth,
  aiRateLimiter,
  [
    body('defendant_id').notEmpty().isInt({ min: 1 }).withMessage('defendant_id is required and must be a positive integer'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { defendant_id } = req.body;

      const [defResult, bondResult, substanceResult, mentalResult, complianceResult] = await Promise.all([
        pool.query('SELECT * FROM defendants WHERE id = $1', [defendant_id]),
        pool.query('SELECT * FROM bail_bonds WHERE defendant_id = $1 AND status = $2 ORDER BY created_at DESC LIMIT 1', [defendant_id, 'active']),
        pool.query('SELECT * FROM substance_abuse_assessments WHERE defendant_id = $1 ORDER BY created_at DESC LIMIT 1', [defendant_id])
          .catch(() => ({ rows: [] })),
        pool.query('SELECT * FROM mental_health_evaluations WHERE defendant_id = $1 ORDER BY created_at DESC LIMIT 1', [defendant_id])
          .catch(() => ({ rows: [] })),
        pool.query('SELECT * FROM compliance_reports WHERE defendant_id = $1 ORDER BY created_at DESC LIMIT 5', [defendant_id])
          .catch(() => ({ rows: [] })),
      ]);

      if (defResult.rows.length === 0) {
        return res.status(404).json({ error: 'Defendant not found' });
      }

      const defendant = defResult.rows[0];

      const prompt = `You are an expert bail bond supervision specialist. Based on the defendant's risk profile, recommend a comprehensive monitoring plan including GPS tracking and substance testing protocols.

DEFENDANT:
${JSON.stringify(defendant, null, 2)}

ACTIVE BOND:
${JSON.stringify(bondResult.rows[0] || {}, null, 2)}

SUBSTANCE ABUSE HISTORY:
${JSON.stringify(substanceResult.rows[0] || {}, null, 2)}

MENTAL HEALTH PROFILE:
${JSON.stringify(mentalResult.rows[0] || {}, null, 2)}

COMPLIANCE HISTORY (last 5):
${JSON.stringify(complianceResult.rows, null, 2)}

Return ONLY valid JSON in this exact format:
{
  "risk_tier": "<TIER_1_LOW|TIER_2_MEDIUM|TIER_3_HIGH|TIER_4_CRITICAL>",
  "gps_monitoring": {
    "required": <boolean>,
    "device_type": "<ANKLE_BRACELET|PHONE_APP|NONE>",
    "check_in_interval_hours": <number>,
    "exclusion_zones": ["list of recommended exclusion zones if any"]
  },
  "substance_testing": {
    "required": <boolean>,
    "frequency": "<DAILY|2X_WEEKLY|WEEKLY|BI-WEEKLY|MONTHLY|NONE>",
    "panel_type": "<5-PANEL|10-PANEL|12-PANEL|ALCOHOL|NONE>",
    "random_testing_pct": <number 0-100>
  },
  "check_ins": {
    "frequency": "<DAILY|2X_WEEKLY|WEEKLY|BI-WEEKLY>",
    "method": "<IN_PERSON|PHONE|VIDEO|APP>",
    "officer_assigned": <boolean>
  },
  "additional_conditions": ["list of additional recommended supervision conditions"],
  "estimated_monthly_cost": "<LOW_$50-200|MEDIUM_$200-500|HIGH_$500-1000>",
  "rationale": "professional explanation of monitoring plan",
  "review_date_days": <number of days until monitoring plan review>
}`;

      const result = await queryOpenRouter(prompt, BAIL_SYSTEM_PROMPT);

      await persistAIResult(pool, {
        feature: 'condition-monitoring', entity_type: 'defendant', entity_id: defendant_id,
        user_email: req.user?.email, request_payload: req.body, response: result,
      });

      res.json({
        defendant_id,
        defendant_name: `${defendant.first_name} ${defendant.last_name}`,
        risk_level: defendant.risk_level,
        monitoring_plan: result,
        generated_at: new Date().toISOString(),
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// POST /api/ai/forfeiture-predictor
// Score likelihood of asset recovery if bond is forfeited
router.post('/forfeiture-predictor',
  auth,
  aiRateLimiter,
  [
    body('bond_id').notEmpty().isInt({ min: 1 }).withMessage('bond_id is required and must be a positive integer'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { bond_id } = req.body;

      const bondResult = await pool.query(
        `SELECT bb.*, d.first_name, d.last_name, d.risk_level, d.date_of_birth, d.address
         FROM bail_bonds bb
         LEFT JOIN defendants d ON bb.defendant_id = d.id
         WHERE bb.id = $1`,
        [bond_id]
      );

      if (bondResult.rows.length === 0) {
        return res.status(404).json({ error: 'Bond not found' });
      }

      const bond = bondResult.rows[0];

      const [suretyResult, financialResult, courtResult] = await Promise.all([
        pool.query('SELECT * FROM sureties WHERE defendant_id = $1 ORDER BY created_at DESC LIMIT 3', [bond.defendant_id])
          .catch(() => ({ rows: [] })),
        pool.query('SELECT * FROM financial_analyses WHERE defendant_id = $1 ORDER BY created_at DESC LIMIT 1', [bond.defendant_id])
          .catch(() => ({ rows: [] })),
        pool.query("SELECT * FROM court_cases WHERE defendant_id = $1 AND status NOT IN ('Closed','Dismissed') ORDER BY next_hearing_date ASC LIMIT 1", [bond.defendant_id])
          .catch(() => ({ rows: [] })),
      ]);

      const prompt = `You are an expert bail bond forfeiture analyst specializing in asset recovery. Analyze this bond and collateral data to predict the likelihood and feasibility of recovering assets if the bond is forfeited.

BOND DETAILS:
Bond Amount: $${bond.bond_amount}
Bond Type: ${bond.bond_type}
Premium: $${bond.premium_amount || 'N/A'}
Collateral Value: $${bond.collateral_value || 'N/A'}
Status: ${bond.status}
Case Number: ${bond.case_number || 'N/A'}
Charge: ${bond.charge || 'N/A'}

DEFENDANT:
Name: ${bond.first_name} ${bond.last_name}
Risk Level: ${bond.risk_level}
Address: ${bond.address || 'Unknown'}

SURETY / CO-SIGNER DATA:
${JSON.stringify(suretyResult.rows, null, 2)}

FINANCIAL PROFILE:
${JSON.stringify(financialResult.rows[0] || {}, null, 2)}

ACTIVE COURT CASE:
${JSON.stringify(courtResult.rows[0] || {}, null, 2)}

Return ONLY valid JSON in this exact format:
{
  "forfeiture_probability": <number 0-100>,
  "asset_recovery_score": <number 0-100>,
  "recovery_likelihood": "<VERY_LOW|LOW|MEDIUM|HIGH|VERY_HIGH>",
  "collateral_analysis": {
    "collateral_type": "<REAL_ESTATE|VEHICLE|CASH|JEWELRY|MIXED|NONE>",
    "estimated_liquidation_value": "<BELOW_BOND|COVERS_PARTIAL|COVERS_FULL|EXCEEDS_BOND>",
    "liquidation_time_estimate": "<30_DAYS|60_DAYS|90_DAYS|180_DAYS|OVER_180_DAYS>"
  },
  "surety_strength": "<WEAK|MODERATE|STRONG>",
  "recovery_obstacles": ["list of specific obstacles to asset recovery"],
  "recommended_actions": ["proactive steps to take before potential forfeiture"],
  "legal_steps_on_forfeiture": ["ordered list of legal steps to initiate"],
  "estimated_recovery_pct": <number 0-100>,
  "net_loss_risk": "<LOW|MEDIUM|HIGH|CRITICAL>",
  "detailed_analysis": "professional 2-paragraph forfeiture and recovery analysis"
}`;

      const result = await queryOpenRouter(prompt, BAIL_SYSTEM_PROMPT);

      await persistAIResult(pool, {
        feature: 'forfeiture-predictor', entity_type: 'bond', entity_id: bond_id,
        user_email: req.user?.email, request_payload: req.body, response: result,
      });

      res.json({
        bond_id,
        bond_amount: bond.bond_amount,
        defendant_name: `${bond.first_name} ${bond.last_name}`,
        collateral_value: bond.collateral_value,
        forfeiture_assessment: result,
        generated_at: new Date().toISOString(),
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// POST /api/ai/risk-trends
// Plot 30-day risk trajectory; alert if rapid degradation detected
router.post('/risk-trends',
  auth,
  aiRateLimiter,
  [
    body('defendant_id').notEmpty().isInt({ min: 1 }).withMessage('defendant_id is required and must be a positive integer'),
    body('window_days').optional().isInt({ min: 7, max: 180 }).withMessage('window_days must be 7-180'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { defendant_id, window_days = 30 } = req.body;

      const [defResult, assessmentsResult, complianceResult, courtResult] = await Promise.all([
        pool.query('SELECT * FROM defendants WHERE id = $1', [defendant_id]),
        pool.query(
          `SELECT id, risk_score, risk_level, flight_risk_score, recidivism_score,
                  community_ties_score, employment_score, financial_score,
                  substance_abuse_score, mental_health_score, criminal_history_score,
                  overall_recommendation, status, created_at
           FROM risk_assessments WHERE defendant_id = $1
             AND created_at >= NOW() - INTERVAL '${parseInt(window_days)} days'
           ORDER BY created_at ASC`,
          [defendant_id]
        ).catch(() => ({ rows: [] })),
        pool.query(
          `SELECT id, status, risk_rating, completed_date, due_date, created_at
           FROM compliance_reports WHERE defendant_id = $1
             AND created_at >= NOW() - INTERVAL '${parseInt(window_days)} days'
           ORDER BY created_at ASC`,
          [defendant_id]
        ).catch(() => ({ rows: [] })),
        pool.query(
          `SELECT id, status, next_hearing_date, charge_severity, created_at
           FROM court_cases WHERE defendant_id = $1
             AND created_at >= NOW() - INTERVAL '${parseInt(window_days)} days'
           ORDER BY created_at ASC`,
          [defendant_id]
        ).catch(() => ({ rows: [] })),
      ]);

      if (defResult.rows.length === 0) {
        return res.status(404).json({ error: 'Defendant not found' });
      }

      const defendant = defResult.rows[0];
      const series = assessmentsResult.rows.map(r => ({
        date: r.created_at,
        risk_score: r.risk_score,
        risk_level: r.risk_level,
      }));

      const prompt = `You are an AI bail bond risk analyst. Analyze the following ${window_days}-day risk trajectory and identify trends, inflection points and any rapid degradation.

DEFENDANT:
${JSON.stringify(defendant, null, 2)}

RISK ASSESSMENT TIME SERIES (${assessmentsResult.rows.length} points):
${JSON.stringify(assessmentsResult.rows, null, 2)}

COMPLIANCE EVENTS:
${JSON.stringify(complianceResult.rows, null, 2)}

COURT CASE EVENTS:
${JSON.stringify(courtResult.rows, null, 2)}

Return ONLY valid JSON in this exact format:
{
  "trend_direction": "<IMPROVING|STABLE|DEGRADING|RAPID_DEGRADATION>",
  "current_risk_score": <number 0-100>,
  "previous_risk_score": <number 0-100>,
  "delta_score": <number>,
  "delta_pct": <number>,
  "rapid_degradation_alert": <boolean>,
  "alert_severity": "<NONE|INFO|WARNING|CRITICAL>",
  "inflection_dates": ["YYYY-MM-DD"],
  "drivers_of_change": ["list of factors driving the trend"],
  "projected_30_day_score": <number 0-100>,
  "recommended_actions": ["list of immediate recommended actions"],
  "next_review_days": <number>,
  "detailed_analysis": "2-paragraph trend interpretation"
}`;

      const result = await queryOpenRouter(prompt, BAIL_SYSTEM_PROMPT);
      await persistAIResult(pool, {
        feature: 'risk-trends', entity_type: 'defendant', entity_id: defendant_id,
        user_email: req.user?.email, request_payload: req.body, response: result,
      });
      await autoNotifyIfCritical(pool, {
        result, feature: 'risk-trends', defendant_id,
        defendant_name: `${defendant.first_name} ${defendant.last_name}`,
        user_id: req.user?.id,
      });
      res.json({
        defendant_id,
        defendant_name: `${defendant.first_name} ${defendant.last_name}`,
        window_days,
        series,
        trend: result,
        generated_at: new Date().toISOString(),
      });
    } catch (err) { res.status(500).json({ error: err.message }); }
  }
);

// POST /api/ai/surety-network-validation
// Cross-check guarantor creditworthiness and prior bail forfeitures
router.post('/surety-network-validation',
  auth,
  aiRateLimiter,
  [
    body('surety_id').optional().isInt({ min: 1 }),
    body('defendant_id').optional().isInt({ min: 1 }),
    body('surety_data').optional().isObject(),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { surety_id, defendant_id, surety_data } = req.body;
      let surety = surety_data || null;

      if (surety_id) {
        const r = await pool.query('SELECT * FROM sureties WHERE id = $1', [surety_id]).catch(() => ({ rows: [] }));
        if (r.rows.length) surety = r.rows[0];
      }
      if (!surety && defendant_id) {
        const r = await pool.query('SELECT * FROM sureties WHERE defendant_id = $1 ORDER BY created_at DESC LIMIT 1', [defendant_id]).catch(() => ({ rows: [] }));
        if (r.rows.length) surety = r.rows[0];
      }
      if (!surety) return res.status(400).json({ error: 'surety_id, defendant_id, or surety_data is required' });

      const priorBonds = await pool.query(
        `SELECT bb.id, bb.bond_amount, bb.status, bb.created_at
         FROM bail_bonds bb
         WHERE bb.defendant_id = $1
         ORDER BY bb.created_at DESC LIMIT 10`,
        [surety.defendant_id || defendant_id || 0]
      ).catch(() => ({ rows: [] }));

      const prompt = `You are a bail bond surety validation expert. Cross-check the following surety/co-signer for creditworthiness, asset adequacy, and any prior bond forfeitures.

SURETY:
${JSON.stringify(surety, null, 2)}

ASSOCIATED PRIOR BONDS:
${JSON.stringify(priorBonds.rows, null, 2)}

Return ONLY valid JSON in this exact format:
{
  "validation_score": <number 0-100>,
  "creditworthiness_tier": "<EXCELLENT|GOOD|FAIR|POOR|UNKNOWN>",
  "asset_coverage_ratio": <number>,
  "prior_forfeiture_count": <number>,
  "red_flags": ["list of concerning findings"],
  "verification_actions": ["list of verifications to perform before approving"],
  "recommended_max_bond_exposure": <number USD>,
  "approval_recommendation": "<APPROVE|APPROVE_WITH_CONDITIONS|REJECT>",
  "conditions": ["list of recommended approval conditions"],
  "detailed_analysis": "2-paragraph surety analysis"
}`;

      const result = await queryOpenRouter(prompt, BAIL_SYSTEM_PROMPT);
      await persistAIResult(pool, {
        feature: 'surety-network-validation',
        entity_type: 'surety', entity_id: surety.id || surety.defendant_id || defendant_id,
        user_email: req.user?.email, request_payload: req.body, response: result,
      });
      res.json({
        surety_id: surety.id || null,
        defendant_id: surety.defendant_id || defendant_id || null,
        surety_name: surety.surety_name || null,
        validation: result,
        generated_at: new Date().toISOString(),
      });
    } catch (err) { res.status(500).json({ error: err.message }); }
  }
);

// POST /api/ai/court-hearing-prep
// AI generates defendant-specific talking points for bail reduction hearings
router.post('/court-hearing-prep',
  auth,
  aiRateLimiter,
  [
    body('defendant_id').notEmpty().isInt({ min: 1 }),
    body('hearing_type').optional().isString(),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { defendant_id, hearing_type = 'Bail Reduction Hearing' } = req.body;

      const [defResult, bondResult, courtResult, employmentResult, communityResult, mhResult] = await Promise.all([
        pool.query('SELECT * FROM defendants WHERE id = $1', [defendant_id]),
        pool.query('SELECT * FROM bail_bonds WHERE defendant_id = $1 ORDER BY created_at DESC LIMIT 1', [defendant_id]).catch(() => ({ rows: [] })),
        pool.query('SELECT * FROM court_cases WHERE defendant_id = $1 ORDER BY next_hearing_date ASC LIMIT 1', [defendant_id]).catch(() => ({ rows: [] })),
        pool.query('SELECT * FROM employment_records WHERE defendant_id = $1 ORDER BY created_at DESC LIMIT 1', [defendant_id]).catch(() => ({ rows: [] })),
        pool.query('SELECT * FROM community_ties WHERE defendant_id = $1 ORDER BY created_at DESC LIMIT 5', [defendant_id]).catch(() => ({ rows: [] })),
        pool.query('SELECT * FROM mental_health_evaluations WHERE defendant_id = $1 ORDER BY created_at DESC LIMIT 1', [defendant_id]).catch(() => ({ rows: [] })),
      ]);

      if (defResult.rows.length === 0) return res.status(404).json({ error: 'Defendant not found' });
      const defendant = defResult.rows[0];

      const prompt = `You are an experienced bail bond defense advocate preparing talking points for a ${hearing_type}. Generate persuasive, defendant-specific arguments grounded in the case facts.

DEFENDANT:
${JSON.stringify(defendant, null, 2)}

CURRENT BOND:
${JSON.stringify(bondResult.rows[0] || {}, null, 2)}

COURT CASE:
${JSON.stringify(courtResult.rows[0] || {}, null, 2)}

EMPLOYMENT:
${JSON.stringify(employmentResult.rows[0] || {}, null, 2)}

COMMUNITY TIES:
${JSON.stringify(communityResult.rows, null, 2)}

MENTAL HEALTH:
${JSON.stringify(mhResult.rows[0] || {}, null, 2)}

Return ONLY valid JSON in this exact format:
{
  "hearing_type": "${hearing_type}",
  "opening_statement": "1-paragraph proposed opening statement",
  "key_arguments": [
    {"argument": "...", "supporting_facts": ["fact 1", "fact 2"], "estimated_strength": "WEAK|MODERATE|STRONG"}
  ],
  "anticipated_prosecution_points": ["expected prosecution arguments"],
  "rebuttals": [{"prosecution_point": "...", "rebuttal": "..."}],
  "exhibits_to_prepare": ["recommended documentary evidence"],
  "witnesses_to_call": ["recommended witnesses with rationale"],
  "proposed_bail_amount": <number USD>,
  "proposed_conditions": ["proposed release conditions"],
  "closing_statement": "1-paragraph proposed closing",
  "risk_acknowledgments": ["risks to acknowledge proactively"],
  "expected_outcome_likelihood": "<UNFAVORABLE|MIXED|FAVORABLE>"
}`;

      const result = await queryOpenRouter(prompt, BAIL_SYSTEM_PROMPT);
      await persistAIResult(pool, {
        feature: 'court-hearing-prep', entity_type: 'defendant', entity_id: defendant_id,
        user_email: req.user?.email, request_payload: req.body, response: result,
      });
      res.json({
        defendant_id,
        defendant_name: `${defendant.first_name} ${defendant.last_name}`,
        hearing_type,
        prep: result,
        generated_at: new Date().toISOString(),
      });
    } catch (err) { res.status(500).json({ error: err.message }); }
  }
);

// POST /api/ai/geopolitical-risk-alert
// Flag defendants with travel to high-risk countries; suggest restrictions
router.post('/geopolitical-risk-alert',
  auth,
  aiRateLimiter,
  [
    body('defendant_id').notEmpty().isInt({ min: 1 }),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { defendant_id } = req.body;
      const [defResult, flightResult] = await Promise.all([
        pool.query('SELECT * FROM defendants WHERE id = $1', [defendant_id]),
        pool.query('SELECT * FROM flight_risk WHERE defendant_id = $1 ORDER BY created_at DESC LIMIT 1', [defendant_id]).catch(() => ({ rows: [] })),
      ]);
      if (defResult.rows.length === 0) return res.status(404).json({ error: 'Defendant not found' });
      const defendant = defResult.rows[0];
      const flight = flightResult.rows[0] || {};

      const prompt = `You are a geopolitical risk analyst supporting bail bond decisions. Evaluate the defendant's travel history, foreign connections, and passport status against current high-risk jurisdictions.

DEFENDANT:
${JSON.stringify(defendant, null, 2)}

FLIGHT RISK PROFILE:
${JSON.stringify(flight, null, 2)}

Return ONLY valid JSON in this exact format:
{
  "geopolitical_risk_score": <number 0-100>,
  "alert_level": "<NONE|LOW|MEDIUM|HIGH|CRITICAL>",
  "high_risk_countries_visited": ["list"],
  "active_foreign_connections": ["list"],
  "non_extradition_jurisdictions_flagged": ["list of relevant countries"],
  "passport_recommendation": "<HOLD|SURRENDER|MONITOR|NO_ACTION>",
  "no_fly_list_recommendation": <boolean>,
  "border_alerts_to_issue": ["specific alert types"],
  "recommended_travel_restrictions": ["list"],
  "monitoring_actions": ["list of actions"],
  "detailed_analysis": "2-paragraph geopolitical risk write-up"
}`;

      const result = await queryOpenRouter(prompt, BAIL_SYSTEM_PROMPT);
      await persistAIResult(pool, {
        feature: 'geopolitical-risk-alert', entity_type: 'defendant', entity_id: defendant_id,
        user_email: req.user?.email, request_payload: req.body, response: result,
      });
      await autoNotifyIfCritical(pool, {
        result, feature: 'geopolitical-risk-alert', defendant_id,
        defendant_name: `${defendant.first_name} ${defendant.last_name}`,
        user_id: req.user?.id,
      });
      res.json({
        defendant_id,
        defendant_name: `${defendant.first_name} ${defendant.last_name}`,
        assessment: result,
        generated_at: new Date().toISOString(),
      });
    } catch (err) { res.status(500).json({ error: err.message }); }
  }
);

// POST /api/ai/comparative-benchmarking
// Compare defendant scores against jurisdiction/charge cohort
router.post('/comparative-benchmarking',
  auth,
  aiRateLimiter,
  [
    body('defendant_id').notEmpty().isInt({ min: 1 }),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { defendant_id } = req.body;
      const defResult = await pool.query('SELECT * FROM defendants WHERE id = $1', [defendant_id]);
      if (defResult.rows.length === 0) return res.status(404).json({ error: 'Defendant not found' });
      const defendant = defResult.rows[0];

      const bondResult = await pool.query('SELECT * FROM bail_bonds WHERE defendant_id = $1 ORDER BY created_at DESC LIMIT 1', [defendant_id]).catch(() => ({ rows: [] }));
      const currentBond = bondResult.rows[0] || {};

      const cohortResult = await pool.query(
        `SELECT
           COUNT(*)::int as cohort_size,
           AVG(NULLIF(d.risk_score::numeric, NULL)) as avg_risk_score,
           AVG(bb.bond_amount::numeric) as avg_bond_amount,
           PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY bb.bond_amount::numeric) as median_bond,
           PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY bb.bond_amount::numeric) as p90_bond
         FROM defendants d
         LEFT JOIN bail_bonds bb ON bb.defendant_id = d.id
         WHERE (d.state = $1 OR $1 IS NULL)
           AND (bb.charge ILIKE $2 OR $2 IS NULL)
           AND d.id <> $3`,
        [defendant.state || null, currentBond.charge ? `%${currentBond.charge.split(' ')[0]}%` : null, defendant_id]
      ).catch(() => ({ rows: [{ cohort_size: 0 }] }));

      const cohortStats = cohortResult.rows[0] || { cohort_size: 0 };

      const prompt = `You are a bail bond data analyst. Benchmark the following defendant against their jurisdictional/charge cohort and produce percentile-based comparisons and recommendations.

DEFENDANT:
${JSON.stringify(defendant, null, 2)}

CURRENT BOND:
${JSON.stringify(currentBond, null, 2)}

COHORT STATISTICS (jurisdiction=${defendant.state || 'ALL'}, charge=${currentBond.charge || 'ALL'}):
${JSON.stringify(cohortStats, null, 2)}

Return ONLY valid JSON in this exact format:
{
  "cohort_size": ${cohortStats.cohort_size || 0},
  "cohort_definition": "jurisdiction + charge category",
  "defendant_risk_percentile": <number 0-100>,
  "defendant_bond_percentile": <number 0-100>,
  "comparison_summary": "1-paragraph comparative summary",
  "where_defendant_stands": {
    "risk_score": "<BELOW_AVG|AT_AVG|ABOVE_AVG|HIGH_OUTLIER>",
    "bond_amount": "<BELOW_AVG|AT_AVG|ABOVE_AVG|HIGH_OUTLIER>",
    "criminal_history_severity": "<BELOW_AVG|AT_AVG|ABOVE_AVG>"
  },
  "outlier_factors": ["list of factors making defendant an outlier"],
  "recommended_bond_range_usd": {"low": <number>, "median": <number>, "high": <number>},
  "fairness_check": "<EQUITABLE|HIGHER_THAN_PEERS|LOWER_THAN_PEERS>",
  "recommended_actions": ["list of recommended adjustments"]
}`;

      const result = await queryOpenRouter(prompt, BAIL_SYSTEM_PROMPT);
      await persistAIResult(pool, {
        feature: 'comparative-benchmarking', entity_type: 'defendant', entity_id: defendant_id,
        user_email: req.user?.email, request_payload: req.body, response: result,
      });
      res.json({
        defendant_id,
        defendant_name: `${defendant.first_name} ${defendant.last_name}`,
        cohort_stats: cohortStats,
        benchmarking: result,
        generated_at: new Date().toISOString(),
      });
    } catch (err) { res.status(500).json({ error: err.message }); }
  }
);

// POST /api/ai/bond-premium-optimizer
// Recommend optimal premium % based on defendant risk profile and historical rates
router.post('/bond-premium-optimizer',
  auth,
  aiRateLimiter,
  [
    body('defendant_id').notEmpty().isInt({ min: 1 }).withMessage('defendant_id is required'),
    body('bond_amount').optional().isFloat({ min: 1 }).withMessage('bond_amount must be positive'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { defendant_id, bond_amount } = req.body;

      const [defResult, bondResult, riskResult, histResult] = await Promise.all([
        pool.query('SELECT * FROM defendants WHERE id = $1', [defendant_id]),
        pool.query('SELECT * FROM bail_bonds WHERE defendant_id = $1 ORDER BY created_at DESC LIMIT 5', [defendant_id]),
        pool.query('SELECT * FROM risk_assessments WHERE defendant_id = $1 ORDER BY created_at DESC LIMIT 3', [defendant_id])
          .catch(() => ({ rows: [] })),
        pool.query(
          `SELECT
             AVG(premium_amount::numeric / NULLIF(bond_amount::numeric, 0) * 100) as avg_premium_pct,
             PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY premium_amount::numeric / NULLIF(bond_amount::numeric, 0) * 100) as median_premium_pct,
             COUNT(*) as sample_size
           FROM bail_bonds
           WHERE status IN ('exonerated', 'active')
             AND bond_amount > 0 AND premium_amount > 0`
        ).catch(() => ({ rows: [{ avg_premium_pct: 10, median_premium_pct: 10, sample_size: 0 }] })),
      ]);

      if (defResult.rows.length === 0) return res.status(404).json({ error: 'Defendant not found' });
      const defendant = defResult.rows[0];
      const marketStats = histResult.rows[0] || {};

      const prompt = `You are a bail bond pricing actuary. Recommend an optimal bond premium percentage that balances risk exposure against competitive pricing for this defendant.

DEFENDANT RISK PROFILE:
${JSON.stringify(defendant, null, 2)}

HISTORICAL BONDS:
${JSON.stringify(bondResult.rows, null, 2)}

RECENT RISK ASSESSMENTS:
${JSON.stringify(riskResult.rows, null, 2)}

MARKET BENCHMARKS:
Average premium rate: ${parseFloat(marketStats.avg_premium_pct || 10).toFixed(1)}%
Median premium rate: ${parseFloat(marketStats.median_premium_pct || 10).toFixed(1)}%
Portfolio sample size: ${marketStats.sample_size || 0} bonds
Requested bond amount: $${bond_amount || 'Not specified'}

Return ONLY valid JSON in this exact format:
{
  "recommended_premium_pct": <number>,
  "premium_range": {"minimum_pct": <number>, "maximum_pct": <number>},
  "risk_loading_factor": <number>,
  "market_position": "<BELOW_MARKET|AT_MARKET|ABOVE_MARKET>",
  "profitability_score": <number 0-100>,
  "risk_adjusted_return": "<LOW|MEDIUM|HIGH>",
  "key_pricing_factors": ["list of factors influencing the premium"],
  "conditions_for_lower_premium": ["list of conditions that would justify a lower rate"],
  "conditions_for_higher_premium": ["list of conditions requiring a higher rate"],
  "competitor_rate_estimate": "<LOWER|SIMILAR|HIGHER>",
  "forfeiture_risk_load_pct": <number>,
  "detailed_analysis": "2-paragraph pricing rationale"
}`;

      const result = await queryOpenRouter(prompt, BAIL_SYSTEM_PROMPT);
      await persistAIResult(pool, {
        feature: 'bond-premium-optimizer', entity_type: 'defendant', entity_id: defendant_id,
        user_email: req.user?.email, request_payload: req.body, response: result,
      });
      res.json({
        defendant_id,
        defendant_name: `${defendant.first_name} ${defendant.last_name}`,
        risk_level: defendant.risk_level,
        bond_amount: bond_amount || null,
        market_stats: marketStats,
        pricing: result,
        generated_at: new Date().toISOString(),
      });
    } catch (err) { res.status(500).json({ error: err.message }); }
  }
);

// GET /api/ai/portfolio-risk-summary
// Aggregate AI analysis of all active bonds — portfolio VaR and top risky bonds
router.get('/portfolio-risk-summary',
  auth,
  aiRateLimiter,
  async (req, res) => {
    try {
      const [portfolioResult, topRiskyResult, forfeitureResult, upcomingResult] = await Promise.all([
        pool.query(
          `SELECT
             COUNT(*) as total_active_bonds,
             COALESCE(SUM(bond_amount::numeric), 0) as total_exposure,
             COALESCE(AVG(bond_amount::numeric), 0) as avg_bond_amount,
             COUNT(CASE WHEN d.risk_level = 'HIGH' THEN 1 END) as high_risk_count,
             COUNT(CASE WHEN d.risk_level = 'VERY HIGH' THEN 1 END) as very_high_risk_count,
             COUNT(CASE WHEN d.risk_level = 'CRITICAL' THEN 1 END) as critical_risk_count,
             COALESCE(SUM(CASE WHEN d.risk_level IN ('HIGH','VERY HIGH','CRITICAL') THEN bond_amount::numeric ELSE 0 END), 0) as high_risk_exposure
           FROM bail_bonds bb
           LEFT JOIN defendants d ON bb.defendant_id = d.id
           WHERE bb.status = 'active'`
        ),
        pool.query(
          `SELECT bb.id as bond_id, bb.bond_amount, bb.charge, bb.case_number,
                  d.first_name, d.last_name, d.risk_level, d.id as defendant_id
           FROM bail_bonds bb
           LEFT JOIN defendants d ON bb.defendant_id = d.id
           WHERE bb.status = 'active'
             AND d.risk_level IN ('HIGH', 'VERY HIGH', 'CRITICAL')
           ORDER BY bb.bond_amount DESC
           LIMIT 10`
        ).catch(() => ({ rows: [] })),
        pool.query(
          `SELECT COUNT(*) as forfeited_count,
                  COALESCE(SUM(bond_amount::numeric), 0) as forfeited_amount,
                  ROUND(100.0 * COUNT(*) / NULLIF((SELECT COUNT(*) FROM bail_bonds), 0), 2) as forfeiture_rate_pct
           FROM bail_bonds WHERE status = 'forfeited'`
        ),
        pool.query(
          `SELECT COUNT(*) as upcoming_courts_30d
           FROM court_cases
           WHERE next_hearing_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
             AND status NOT IN ('Closed','closed','Dismissed','dismissed')`
        ).catch(() => ({ rows: [{ upcoming_courts_30d: 0 }] })),
      ]);

      const portfolio = portfolioResult.rows[0] || {};
      const forfeiture = forfeitureResult.rows[0] || {};
      const upcoming = upcomingResult.rows[0] || {};

      const prompt = `You are a bail bond portfolio risk manager. Analyze this portfolio snapshot and produce a Value-at-Risk assessment with key risk metrics and recommended management actions.

PORTFOLIO SNAPSHOT:
Total Active Bonds: ${portfolio.total_active_bonds}
Total Exposure: $${parseFloat(portfolio.total_exposure || 0).toLocaleString()}
Average Bond: $${parseFloat(portfolio.avg_bond_amount || 0).toLocaleString()}
High Risk Bonds: ${portfolio.high_risk_count}
Very High Risk Bonds: ${portfolio.very_high_risk_count}
High Risk Exposure: $${parseFloat(portfolio.high_risk_exposure || 0).toLocaleString()}
Historical Forfeiture Rate: ${forfeiture.forfeiture_rate_pct || 0}%
Forfeited Amount: $${parseFloat(forfeiture.forfeited_amount || 0).toLocaleString()}
Upcoming Court Dates (30 days): ${upcoming.upcoming_courts_30d}

TOP HIGH-RISK BONDS:
${JSON.stringify(topRiskyResult.rows, null, 2)}

Return ONLY valid JSON in this exact format:
{
  "portfolio_risk_score": <number 0-100>,
  "portfolio_risk_level": "<LOW|MEDIUM|HIGH|CRITICAL>",
  "estimated_var_90d_usd": <number>,
  "estimated_var_pct": <number>,
  "concentration_risk": "<LOW|MEDIUM|HIGH>",
  "top_5_risk_bond_ids": [<bond_id numbers>],
  "immediate_actions": ["list of urgent portfolio management actions"],
  "monitoring_priorities": ["list of monitoring priorities"],
  "diversification_score": <number 0-100>,
  "expected_forfeiture_next_90d": <number USD>,
  "portfolio_health": "<HEALTHY|WATCH|AT_RISK|CRITICAL>",
  "detailed_analysis": "2-paragraph portfolio risk narrative"
}`;

      const result = await queryOpenRouter(prompt, BAIL_SYSTEM_PROMPT);
      await persistAIResult(pool, {
        feature: 'portfolio-risk-summary', entity_type: 'portfolio', entity_id: null,
        user_email: req.user?.email, request_payload: {}, response: result,
      });
      res.json({
        portfolio_stats: portfolio,
        forfeiture_stats: forfeiture,
        upcoming_courts: upcoming,
        top_high_risk_bonds: topRiskyResult.rows,
        summary: result,
        generated_at: new Date().toISOString(),
      });
    } catch (err) { res.status(500).json({ error: err.message }); }
  }
);

// POST /api/ai/warrant-risk-assessment
// When a defendant misses court — AI generates immediate warrant risk report
router.post('/warrant-risk-assessment',
  auth,
  aiRateLimiter,
  [
    body('defendant_id').notEmpty().isInt({ min: 1 }).withMessage('defendant_id is required'),
    body('missed_hearing_date').optional().isISO8601().withMessage('missed_hearing_date must be a valid date'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { defendant_id, missed_hearing_date } = req.body;

      const [defResult, bondResult, flightResult, crimResult, communityResult] = await Promise.all([
        pool.query('SELECT * FROM defendants WHERE id = $1', [defendant_id]),
        pool.query("SELECT * FROM bail_bonds WHERE defendant_id = $1 AND status = 'active' ORDER BY created_at DESC LIMIT 1", [defendant_id]),
        pool.query('SELECT * FROM flight_risk_analyses WHERE defendant_id = $1 ORDER BY created_at DESC LIMIT 1', [defendant_id])
          .catch(() => ({ rows: [] })),
        pool.query('SELECT * FROM criminal_histories WHERE defendant_id = $1 ORDER BY offense_date DESC LIMIT 5', [defendant_id])
          .catch(() => ({ rows: [] })),
        pool.query('SELECT * FROM community_ties WHERE defendant_id = $1 ORDER BY created_at DESC LIMIT 3', [defendant_id])
          .catch(() => ({ rows: [] })),
      ]);

      if (defResult.rows.length === 0) return res.status(404).json({ error: 'Defendant not found' });
      const defendant = defResult.rows[0];
      const activeBond = bondResult.rows[0] || {};

      const prompt = `You are a bail enforcement and warrant recovery expert. A defendant has failed to appear in court. Generate an immediate warrant risk report with recovery recommendations.

DEFENDANT:
${JSON.stringify(defendant, null, 2)}

ACTIVE BOND:
Bond Amount: $${activeBond.bond_amount || 'Unknown'}
Case Number: ${activeBond.case_number || 'Unknown'}
Charge: ${activeBond.charge || 'Unknown'}

MISSED HEARING DATE: ${missed_hearing_date || 'Unknown'}

FLIGHT RISK HISTORY:
${JSON.stringify(flightResult.rows[0] || {}, null, 2)}

CRIMINAL HISTORY (recent):
${JSON.stringify(crimResult.rows, null, 2)}

KNOWN COMMUNITY TIES (potential hideout contacts):
${JSON.stringify(communityResult.rows, null, 2)}

Return ONLY valid JSON in this exact format:
{
  "apprehension_difficulty": "<EASY|MODERATE|DIFFICULT|VERY_DIFFICULT>",
  "probability_fled_jurisdiction": <number 0-100>,
  "estimated_location_probability": {
    "last_known_address": <number 0-100>,
    "family_contacts": <number 0-100>,
    "out_of_state": <number 0-100>,
    "international": <number 0-100>
  },
  "time_sensitivity": "<IMMEDIATE|24_HOURS|72_HOURS|1_WEEK>",
  "recommended_actions": ["ordered list of immediate actions"],
  "bounty_hunter_recommendation": <boolean>,
  "bond_forfeiture_timeline_days": <number>,
  "forfeiture_amount_at_risk_usd": <number>,
  "recovery_probability_pct": <number 0-100>,
  "known_contacts_to_check": ["list of relationship types to contact"],
  "law_enforcement_tips": ["list of enforcement recommendations"],
  "electronic_monitoring_still_active": <boolean>,
  "detailed_analysis": "2-paragraph warrant recovery analysis"
}`;

      const result = await queryOpenRouter(prompt, BAIL_SYSTEM_PROMPT);
      await persistAIResult(pool, {
        feature: 'warrant-risk-assessment', entity_type: 'defendant', entity_id: defendant_id,
        user_email: req.user?.email, request_payload: req.body, response: result,
      });
      await autoNotifyIfCritical(pool, {
        result: { risk_level: 'CRITICAL' }, feature: 'warrant-risk-assessment',
        defendant_id,
        defendant_name: `${defendant.first_name} ${defendant.last_name}`,
        user_id: req.user?.id,
      });
      res.json({
        defendant_id,
        defendant_name: `${defendant.first_name} ${defendant.last_name}`,
        missed_hearing_date: missed_hearing_date || null,
        active_bond: activeBond,
        warrant_assessment: result,
        generated_at: new Date().toISOString(),
      });
    } catch (err) { res.status(500).json({ error: err.message }); }
  }
);

// GET /api/ai/results - Paginated AI results history (filterable by feature/entity)
router.get('/results', auth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 25));
    const offset = (page - 1) * limit;
    const { feature, entity_type, entity_id } = req.query;

    const conditions = [];
    const params = [];
    if (feature) { params.push(feature); conditions.push(`feature = $${params.length}`); }
    if (entity_type) { params.push(entity_type); conditions.push(`entity_type = $${params.length}`); }
    if (entity_id) { params.push(parseInt(entity_id)); conditions.push(`entity_id = $${params.length}`); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    await pool.query(`CREATE TABLE IF NOT EXISTS ai_results (
      id SERIAL PRIMARY KEY, feature VARCHAR(100), entity_type VARCHAR(100),
      entity_id INTEGER, user_email VARCHAR(255), request_payload JSONB, response JSONB,
      created_at TIMESTAMP DEFAULT NOW()
    )`);

    const countResult = await pool.query(`SELECT COUNT(*) FROM ai_results ${where}`, params);
    const total = parseInt(countResult.rows[0].count);

    params.push(limit, offset);
    const result = await pool.query(
      `SELECT * FROM ai_results ${where} ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    res.json({
      data: result.rows,
      pagination: { page, limit, total, total_pages: Math.ceil(total / limit) || 1 },
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
