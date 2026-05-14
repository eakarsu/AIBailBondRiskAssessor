const router = require('express').Router();
const auth = require('../middleware/auth');
const pool = require('../db');
const { queryOpenRouter, persistAIResult } = require('../services/openrouter');
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const { body, validationResult } = require('express-validator');

// Rate limiter: 20 AI requests per user per hour
const aiRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  keyGenerator: (req) => req.user?.id ? `user_${req.user.id}` : ipKeyGenerator(req),
  message: { error: 'Too many AI requests. Limit is 20 per hour. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Validation middleware helper
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Common AI endpoint validators
const assessmentValidators = [
  body('defendant_id').optional().isInt({ min: 1 }).withMessage('defendant_id must be a positive integer'),
  body('bond_amount').optional().isFloat({ min: 0.01 }).withMessage('bond_amount must be a positive number'),
  body('charge_level').optional().isIn(['misdemeanor', 'felony', 'federal'])
    .withMessage('charge_level must be one of: misdemeanor, felony, federal'),
];

// AI Risk Assessment
router.post('/assess-risk', auth, aiRateLimiter, assessmentValidators, validateRequest, async (req, res) => {
  try {
    const { defendantId } = req.body;
    let defendantData = req.body;
    let entityId = defendantId || null;

    if (defendantId) {
      const def = await pool.query('SELECT * FROM defendants WHERE id = $1', [defendantId]);
      if (def.rows.length > 0) defendantData = { ...def.rows[0], ...req.body };
      const history = await pool.query('SELECT * FROM criminal_histories WHERE defendant_id = $1', [defendantId]);
      defendantData.criminal_history = history.rows;
      const employment = await pool.query('SELECT * FROM employment_records WHERE defendant_id = $1', [defendantId]);
      defendantData.employment = employment.rows;
    }

    const prompt = `Analyze the following defendant profile for bail bond risk assessment. Provide a comprehensive risk evaluation with scores (0-100) for each category and an overall recommendation.

Defendant Data: ${JSON.stringify(defendantData)}

Provide your response in this JSON format:
{
  "overall_risk_score": <number 0-100>,
  "risk_level": "<LOW/MEDIUM/HIGH/VERY HIGH>",
  "flight_risk_score": <number>,
  "recidivism_score": <number>,
  "community_ties_score": <number>,
  "employment_score": <number>,
  "financial_score": <number>,
  "substance_abuse_risk": <number>,
  "mental_health_risk": <number>,
  "recommendation": "<APPROVE/DENY/CONDITIONAL>",
  "conditions": ["list of recommended conditions"],
  "key_risk_factors": ["list of risk factors"],
  "mitigating_factors": ["list of mitigating factors"],
  "detailed_analysis": "comprehensive narrative analysis",
  "confidence_level": <number 0-100>
}`;

    const result = await queryOpenRouter(prompt);

    await persistAIResult(pool, {
      feature: 'assess-risk', entity_type: 'defendant', entity_id: entityId,
      user_email: req.user?.email, request_payload: req.body, response: result,
    });

    res.json({
      defendant_id: entityId,
      assessment: result,
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Flight Risk Analysis
router.post('/flight-risk', auth, aiRateLimiter, assessmentValidators, validateRequest, async (req, res) => {
  try {
    const { defendant_id } = req.body;
    let data = req.body;

    if (defendant_id) {
      const def = await pool.query('SELECT * FROM defendants WHERE id = $1', [defendant_id]);
      if (def.rows.length > 0) data = { ...def.rows[0], ...req.body };
      const fr = await pool.query('SELECT * FROM flight_risk_analyses WHERE defendant_id = $1 ORDER BY created_at DESC LIMIT 1', [defendant_id])
        .catch(() => ({ rows: [] }));
      if (fr.rows.length > 0) data.flight_risk_record = fr.rows[0];
    }

    const prompt = `Analyze the following data for flight risk assessment. Consider passport status, travel history, foreign connections, prior failures to appear, community roots, employment stability, family ties, and financial resources.

Data: ${JSON.stringify(data)}

Provide your response in this JSON format:
{
  "flight_risk_score": <number 0-100>,
  "risk_level": "<LOW/MEDIUM/HIGH/CRITICAL>",
  "key_indicators": ["list of key flight risk indicators"],
  "monitoring_recommendations": ["recommended monitoring measures"],
  "gps_monitoring_recommended": <boolean>,
  "passport_surrender_recommended": <boolean>,
  "travel_restrictions": ["recommended travel restrictions"],
  "detailed_analysis": "comprehensive flight risk narrative"
}`;

    const result = await queryOpenRouter(prompt);

    await persistAIResult(pool, {
      feature: 'flight-risk', entity_type: 'defendant', entity_id: defendant_id || null,
      user_email: req.user?.email, request_payload: req.body, response: result,
    });

    res.json({
      defendant_id: defendant_id || null,
      assessment: result,
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Recidivism Prediction
router.post('/recidivism', auth, aiRateLimiter, assessmentValidators, validateRequest, async (req, res) => {
  try {
    const { defendant_id } = req.body;
    let data = req.body;

    if (defendant_id) {
      const def = await pool.query('SELECT * FROM defendants WHERE id = $1', [defendant_id]);
      if (def.rows.length > 0) data = { ...def.rows[0], ...req.body };
      const hist = await pool.query('SELECT * FROM criminal_histories WHERE defendant_id = $1 ORDER BY offense_date DESC', [defendant_id])
        .catch(() => ({ rows: [] }));
      data.criminal_history = hist.rows;
    }

    const prompt = `Predict recidivism risk based on the following data. Consider prior offense patterns, age factors, social environment, economic conditions, and behavioral indicators.

Data: ${JSON.stringify(data)}

Provide your response in this JSON format:
{
  "recidivism_score": <number 0-100>,
  "risk_level": "<LOW/MEDIUM/HIGH/VERY HIGH>",
  "predicted_timeframe": "<6 months/1 year/2 years/5 years>",
  "risk_factors": ["list of risk factors contributing to recidivism"],
  "protective_factors": ["factors that reduce recidivism risk"],
  "intervention_recommendations": ["recommended interventions"],
  "program_recommendations": ["recommended rehabilitation programs"],
  "detailed_analysis": "comprehensive recidivism prediction narrative"
}`;

    const result = await queryOpenRouter(prompt);

    await persistAIResult(pool, {
      feature: 'recidivism', entity_type: 'defendant', entity_id: defendant_id || null,
      user_email: req.user?.email, request_payload: req.body, response: result,
    });

    res.json({
      defendant_id: defendant_id || null,
      assessment: result,
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Compliance Check
router.post('/compliance-check', auth, aiRateLimiter, assessmentValidators, validateRequest, async (req, res) => {
  try {
    const prompt = `Review the following bail bond operation data for regulatory compliance. Check against standard bail bond regulations, reporting requirements, and industry best practices.

Data: ${JSON.stringify(req.body)}

Provide your response in this JSON format:
{
  "compliance_score": <number 0-100>,
  "status": "<COMPLIANT/NON-COMPLIANT/NEEDS REVIEW>",
  "violations_found": ["list of potential violations"],
  "recommendations": ["compliance recommendations"],
  "regulatory_references": ["relevant regulations"],
  "action_items": ["immediate action items needed"],
  "detailed_analysis": "comprehensive compliance analysis"
}`;

    const result = await queryOpenRouter(prompt);

    await persistAIResult(pool, {
      feature: 'compliance-check', entity_type: 'compliance', entity_id: req.body.id || null,
      user_email: req.user?.email, request_payload: req.body, response: result,
    });

    res.json({
      assessment: result,
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Financial Analysis
router.post('/financial-analysis', auth, aiRateLimiter, assessmentValidators, validateRequest, async (req, res) => {
  try {
    const { defendant_id } = req.body;
    let data = req.body;

    if (defendant_id) {
      const fin = await pool.query('SELECT * FROM financial_analyses WHERE defendant_id = $1 ORDER BY created_at DESC LIMIT 1', [defendant_id])
        .catch(() => ({ rows: [] }));
      if (fin.rows.length > 0) data = { ...fin.rows[0], ...req.body };
    }

    const prompt = `Analyze the financial capability and stability of this individual for bail bond purposes. Evaluate their ability to meet financial obligations.

Data: ${JSON.stringify(data)}

Provide your response in this JSON format:
{
  "financial_stability_score": <number 0-100>,
  "ability_to_pay_score": <number 0-100>,
  "risk_level": "<LOW/MEDIUM/HIGH>",
  "net_worth_assessment": "assessment of net worth",
  "income_stability": "assessment of income stability",
  "collateral_adequacy": "assessment of collateral",
  "recommendations": ["financial recommendations"],
  "detailed_analysis": "comprehensive financial analysis"
}`;

    const result = await queryOpenRouter(prompt);

    await persistAIResult(pool, {
      feature: 'financial-analysis', entity_type: 'defendant', entity_id: defendant_id || null,
      user_email: req.user?.email, request_payload: req.body, response: result,
    });

    res.json({
      defendant_id: defendant_id || null,
      assessment: result,
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Substance Abuse Risk
router.post('/substance-risk', auth, aiRateLimiter, assessmentValidators, validateRequest, async (req, res) => {
  try {
    const { defendant_id } = req.body;
    let data = req.body;

    if (defendant_id) {
      const sub = await pool.query('SELECT * FROM substance_abuse_assessments WHERE defendant_id = $1 ORDER BY created_at DESC LIMIT 1', [defendant_id])
        .catch(() => ({ rows: [] }));
      if (sub.rows.length > 0) data = { ...sub.rows[0], ...req.body };
    }

    const prompt = `Evaluate substance abuse risk for bail bond decision-making based on the following data.

Data: ${JSON.stringify(data)}

Provide your response in this JSON format:
{
  "substance_risk_score": <number 0-100>,
  "risk_level": "<LOW/MEDIUM/HIGH/CRITICAL>",
  "primary_concerns": ["list of primary substance concerns"],
  "treatment_recommendations": ["recommended treatments"],
  "monitoring_requirements": ["recommended monitoring"],
  "compliance_conditions": ["conditions for bail compliance"],
  "detailed_analysis": "comprehensive substance abuse risk narrative"
}`;

    const result = await queryOpenRouter(prompt);

    await persistAIResult(pool, {
      feature: 'substance-risk', entity_type: 'defendant', entity_id: defendant_id || null,
      user_email: req.user?.email, request_payload: req.body, response: result,
    });

    res.json({
      defendant_id: defendant_id || null,
      assessment: result,
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Mental Health Evaluation
router.post('/mental-health-eval', auth, aiRateLimiter, assessmentValidators, validateRequest, async (req, res) => {
  try {
    const { defendant_id } = req.body;
    let data = req.body;

    if (defendant_id) {
      const mh = await pool.query('SELECT * FROM mental_health_evaluations WHERE defendant_id = $1 ORDER BY created_at DESC LIMIT 1', [defendant_id])
        .catch(() => ({ rows: [] }));
      if (mh.rows.length > 0) data = { ...mh.rows[0], ...req.body };
    }

    const prompt = `Provide a preliminary mental health risk evaluation for bail bond decision-making based on the following data. Note: This is a screening tool, not a clinical diagnosis.

Data: ${JSON.stringify(data)}

Provide your response in this JSON format:
{
  "mental_health_risk_score": <number 0-100>,
  "risk_level": "<LOW/MEDIUM/HIGH/CRITICAL>",
  "areas_of_concern": ["list of mental health concerns"],
  "competency_assessment": "preliminary competency assessment",
  "treatment_compliance_likelihood": <number 0-100>,
  "recommended_evaluations": ["recommended clinical evaluations"],
  "supervision_recommendations": ["recommended supervision measures"],
  "detailed_analysis": "comprehensive mental health risk narrative"
}`;

    const result = await queryOpenRouter(prompt);

    await persistAIResult(pool, {
      feature: 'mental-health-eval', entity_type: 'defendant', entity_id: defendant_id || null,
      user_email: req.user?.email, request_payload: req.body, response: result,
    });

    res.json({
      defendant_id: defendant_id || null,
      assessment: result,
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Community Ties Analysis
router.post('/community-analysis', auth, aiRateLimiter, assessmentValidators, validateRequest, async (req, res) => {
  try {
    const { defendant_id } = req.body;
    let data = req.body;

    if (defendant_id) {
      const ct = await pool.query('SELECT * FROM community_ties WHERE defendant_id = $1 ORDER BY created_at DESC', [defendant_id])
        .catch(() => ({ rows: [] }));
      data.community_ties = ct.rows;
    }

    const prompt = `Analyze the strength of community ties for this individual as it relates to bail bond risk assessment.

Data: ${JSON.stringify(data)}

Provide your response in this JSON format:
{
  "community_ties_score": <number 0-100>,
  "strength_level": "<WEAK/MODERATE/STRONG/VERY STRONG>",
  "positive_ties": ["list of positive community connections"],
  "concerns": ["areas of concern"],
  "stability_indicators": ["indicators of community stability"],
  "flight_risk_mitigation": "how community ties mitigate flight risk",
  "recommendations": ["recommendations for strengthening ties"],
  "detailed_analysis": "comprehensive community ties analysis"
}`;

    const result = await queryOpenRouter(prompt);

    await persistAIResult(pool, {
      feature: 'community-analysis', entity_type: 'defendant', entity_id: defendant_id || null,
      user_email: req.user?.email, request_payload: req.body, response: result,
    });

    res.json({
      defendant_id: defendant_id || null,
      assessment: result,
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai/predict-recidivism - AI recidivism predictor with full defendant data fetch
router.post('/predict-recidivism',
  auth,
  aiRateLimiter,
  [
    body('defendant_id').notEmpty().isInt({ min: 1 }).withMessage('defendant_id is required and must be a positive integer'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { defendant_id } = req.body;

      // Fetch defendant profile + criminal history + current charge
      const [defResult, historyResult, bondResult, employmentResult, communityResult] = await Promise.all([
        pool.query('SELECT * FROM defendants WHERE id = $1', [defendant_id]),
        pool.query('SELECT * FROM criminal_histories WHERE defendant_id = $1 ORDER BY offense_date DESC', [defendant_id])
          .catch(() => ({ rows: [] })),
        pool.query('SELECT * FROM bail_bonds WHERE defendant_id = $1 ORDER BY created_at DESC LIMIT 3', [defendant_id]),
        pool.query('SELECT * FROM employment_records WHERE defendant_id = $1 ORDER BY created_at DESC LIMIT 3', [defendant_id])
          .catch(() => ({ rows: [] })),
        pool.query('SELECT * FROM community_ties WHERE defendant_id = $1 ORDER BY created_at DESC LIMIT 1', [defendant_id])
          .catch(() => ({ rows: [] })),
      ]);

      if (defResult.rows.length === 0) {
        return res.status(404).json({ error: 'Defendant not found' });
      }

      const defendant = defResult.rows[0];
      const criminalHistory = historyResult.rows;
      const currentBonds = bondResult.rows;
      const employment = employmentResult.rows;
      const communityTies = communityResult.rows[0] || {};

      const currentCharge = currentBonds.length > 0 ? currentBonds[0].charge : 'Unknown';
      const chargeLevel = currentBonds.length > 0 ? currentBonds[0].bond_type : 'Unknown';

      const prompt = `You are a criminology expert specializing in recidivism prediction. Analyze the following defendant profile and predict their likelihood of reoffending.

DEFENDANT PROFILE:
Name: ${defendant.first_name} ${defendant.last_name}
Age/DOB: ${defendant.date_of_birth || 'Unknown'}
Current Charge: ${currentCharge}
Charge Level: ${chargeLevel}
Current Risk Level: ${defendant.risk_level || 'Unknown'}

CRIMINAL HISTORY (${criminalHistory.length} records):
${criminalHistory.length > 0 ? JSON.stringify(criminalHistory, null, 2) : 'No prior criminal history on record'}

EMPLOYMENT STATUS:
${employment.length > 0 ? JSON.stringify(employment, null, 2) : 'No employment data available'}

COMMUNITY TIES:
${Object.keys(communityTies).length > 0 ? JSON.stringify(communityTies, null, 2) : 'No community ties data available'}

CURRENT BONDS:
${currentBonds.length > 0 ? JSON.stringify(currentBonds, null, 2) : 'No active bonds'}

Based on this data, provide a detailed recidivism prediction. Return ONLY valid JSON in this exact format:
{
  "flight_risk_probability": <number 0-100>,
  "recidivism_probability": <number 0-100>,
  "risk_level": "<LOW|MEDIUM|HIGH|CRITICAL>",
  "factors_increasing_risk": ["factor1", "factor2", "..."],
  "factors_decreasing_risk": ["factor1", "factor2", "..."],
  "recommended_monitoring_level": "<GPS|CHECK-IN|NONE>",
  "monitoring_rationale": "explanation for monitoring recommendation",
  "predicted_timeframe_if_reoffend": "<6 months|1 year|2 years|5+ years>",
  "intervention_recommendations": ["recommendation1", "recommendation2"],
  "confidence_level": <number 0-100>,
  "detailed_analysis": "comprehensive 2-3 paragraph criminological analysis"
}`;

      const result = await queryOpenRouter(
        prompt,
        'You are a criminology expert and forensic psychologist specializing in bail bond risk assessment and recidivism prediction. Always respond with valid JSON only.'
      );

      await persistAIResult(pool, {
        feature: 'predict-recidivism', entity_type: 'defendant', entity_id: defendant_id,
        user_email: req.user?.email, request_payload: req.body, response: result,
      });

      res.json({
        defendant_id,
        defendant_name: `${defendant.first_name} ${defendant.last_name}`,
        current_charge: currentCharge,
        criminal_history_count: criminalHistory.length,
        prediction: result,
        generated_at: new Date().toISOString(),
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

module.exports = router;
