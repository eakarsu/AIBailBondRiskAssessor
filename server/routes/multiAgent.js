// PRODUCT-DECISION: Multi-agent bail review uses a fixed sequential 3-agent
// topology (RiskAnalyst -> ComplianceOfficer -> Recommender) with each agent
// receiving the previous agent's output. This simple chain is chosen because
// (a) it's deterministic, (b) avoids agent-orchestration framework lock-in
// (LangGraph / AutoGen / etc.), and (c) maps cleanly to current job
// structure. A future revision can swap to parallel/critic loops without
// changing the API contract { steps: [...], final_decision: {...} }.
//
// Env: OPENROUTER_API_KEY required — endpoint returns 503 if unset.

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const pool = require('../db');
const { queryOpenRouter, persistAIResult } = require('../services/openrouter');

router.use(auth);

const AGENTS = [
  {
    name: 'RiskAnalyst',
    system: 'You are a forensic risk analyst. Identify risk factors (flight, recidivism, FTA, violence). Return JSON {"risk_factors":[...],"key_concerns":string,"score":number_0_to_100}.',
    prompt: (ctx) => `Defendant context:\n${JSON.stringify(ctx, null, 2)}\n\nProduce a risk-factor analysis.`,
  },
  {
    name: 'ComplianceOfficer',
    system: 'You are a bail-bond compliance officer. Verify the risk analyst\'s findings against statutory release requirements. Return JSON {"compliance_issues":[...],"required_conditions":[...],"acceptable":boolean}.',
    prompt: (ctx, prev) => `Defendant context:\n${JSON.stringify(ctx)}\n\nRisk analyst output:\n${JSON.stringify(prev)}\n\nReview compliance and return JSON.`,
  },
  {
    name: 'Recommender',
    system: 'You are the senior bail-bond reviewer producing the final recommendation. Return JSON {"decision":"approve|conditional|deny","bond_amount":number,"conditions":[...],"rationale":string}.',
    prompt: (ctx, prev, prev2) => `Defendant context:\n${JSON.stringify(ctx)}\n\nRisk analyst:\n${JSON.stringify(prev)}\n\nCompliance officer:\n${JSON.stringify(prev2)}\n\nProduce the final recommendation.`,
  },
];

router.post('/review', async (req, res) => {
  try {
    if (!process.env.OPENROUTER_API_KEY) {
      return res.status(503).json({ error: 'AI service unavailable: OPENROUTER_API_KEY not configured', missing: 'OPENROUTER_API_KEY' });
    }
    const { defendant_id } = req.body || {};
    let context = req.body || {};
    if (defendant_id) {
      const d = await pool.query('SELECT * FROM defendants WHERE id = $1', [defendant_id]).catch(() => ({ rows: [] }));
      if (d.rows[0]) context = { ...d.rows[0], ...context };
      const ch = await pool.query('SELECT * FROM criminal_histories WHERE defendant_id = $1', [defendant_id]).catch(() => ({ rows: [] }));
      context.criminal_history = ch.rows;
    }

    const steps = [];
    let prev = null;
    let prev2 = null;
    for (const agent of AGENTS) {
      const promptText = agent.prompt(context, prev, prev2);
      const out = await queryOpenRouter(promptText, agent.system);
      steps.push({ agent: agent.name, output: out });
      prev2 = prev;
      prev = out;
    }

    const final_decision = steps[steps.length - 1].output;

    await persistAIResult(pool, {
      feature: 'multi_agent_bail_review',
      entity_type: 'defendant',
      entity_id: defendant_id || null,
      user_email: req.user?.email,
      request_payload: { defendant_id },
      response: { steps, final_decision },
    });

    res.json({ steps, final_decision });
  } catch (err) {
    if (/OPENROUTER_API_KEY/i.test(String(err.message))) {
      return res.status(503).json({ error: 'AI service unavailable: OPENROUTER_API_KEY not configured', missing: 'OPENROUTER_API_KEY' });
    }
    res.status(500).json({ error: 'multi-agent review failed', details: err.message });
  }
});

module.exports = router;
