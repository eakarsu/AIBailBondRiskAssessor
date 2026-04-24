const router = require('express').Router();
const auth = require('../middleware/auth');
const pool = require('../db');
const { queryOpenRouter } = require('../services/openrouter');

// AI Risk Assessment
router.post('/assess-risk', auth, async (req, res) => {
  try {
    const { defendantId } = req.body;
    let defendantData = req.body;

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
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Flight Risk Analysis
router.post('/flight-risk', auth, async (req, res) => {
  try {
    const prompt = `Analyze the following data for flight risk assessment. Consider passport status, travel history, foreign connections, prior failures to appear, community roots, employment stability, family ties, and financial resources.

Data: ${JSON.stringify(req.body)}

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
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Recidivism Prediction
router.post('/recidivism', auth, async (req, res) => {
  try {
    const prompt = `Predict recidivism risk based on the following data. Consider prior offense patterns, age factors, social environment, economic conditions, and behavioral indicators.

Data: ${JSON.stringify(req.body)}

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
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Compliance Check
router.post('/compliance-check', auth, async (req, res) => {
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
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Financial Analysis
router.post('/financial-analysis', auth, async (req, res) => {
  try {
    const prompt = `Analyze the financial capability and stability of this individual for bail bond purposes. Evaluate their ability to meet financial obligations.

Data: ${JSON.stringify(req.body)}

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
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Substance Abuse Risk
router.post('/substance-risk', auth, async (req, res) => {
  try {
    const prompt = `Evaluate substance abuse risk for bail bond decision-making based on the following data.

Data: ${JSON.stringify(req.body)}

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
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Mental Health Evaluation
router.post('/mental-health-eval', auth, async (req, res) => {
  try {
    const prompt = `Provide a preliminary mental health risk evaluation for bail bond decision-making based on the following data. Note: This is a screening tool, not a clinical diagnosis.

Data: ${JSON.stringify(req.body)}

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
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Community Ties Analysis
router.post('/community-analysis', auth, async (req, res) => {
  try {
    const prompt = `Analyze the strength of community ties for this individual as it relates to bail bond risk assessment.

Data: ${JSON.stringify(req.body)}

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
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
