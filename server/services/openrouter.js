const https = require('https');

/**
 * 3-strategy AI JSON parser.
 *  1. Direct JSON.parse on full content
 *  2. Extract first ```json fenced block
 *  3. Extract first {...} object via regex
 * Falls back to { raw_response } when none succeed.
 */
function parseAIJson(content) {
  if (content && typeof content === 'object') return content;
  if (typeof content !== 'string') return { raw_response: String(content ?? '') };
  const text = content.trim();

  // Strategy 1: direct parse
  try { return JSON.parse(text); } catch {}

  // Strategy 2: ```json ... ``` block
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) {
    try { return JSON.parse(fence[1].trim()); } catch {}
  }

  // Strategy 3: first {...} object
  const obj = text.match(/\{[\s\S]*\}/);
  if (obj) {
    try { return JSON.parse(obj[0]); } catch {}
  }

  return { raw_response: text };
}

async function queryOpenRouter(prompt, systemPrompt = 'You are an AI bail bond risk assessment expert. Provide detailed, professional analysis.') {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022';

  if (!apiKey || apiKey === 'your_openrouter_api_key_here') {
    return {
      analysis: 'OpenRouter API key not configured. Please add your OPENROUTER_API_KEY to the .env file.',
      confidence: 0,
      recommendations: ['Configure OpenRouter API key in .env file'],
    };
  }

  const body = JSON.stringify({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt },
    ],
    temperature: 0.3,
    max_tokens: 2000,
  });

  return new Promise((resolve) => {
    const options = {
      hostname: 'openrouter.ai',
      path: '/api/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'AI Bail Bond Risk Assessor',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) {
            return resolve({ analysis: `API Error: ${parsed.error.message}`, confidence: 0, recommendations: [] });
          }
          const content = parsed.choices?.[0]?.message?.content || 'No response';
          const json = parseAIJson(content);
          if (json && typeof json === 'object' && !json.raw_response) return resolve(json);
          return resolve({ analysis: content, model: parsed.model, usage: parsed.usage });
        } catch (e) {
          resolve({ analysis: 'Failed to parse AI response', confidence: 0, recommendations: [] });
        }
      });
    });

    req.on('error', (e) => {
      resolve({ analysis: `Request failed: ${e.message}`, confidence: 0, recommendations: [] });
    });

    req.write(body);
    req.end();
  });
}

/**
 * Persist an AI result row to ai_results (created on demand).
 * Best-effort: never throws — logs and continues so the API still returns the response.
 */
async function persistAIResult(pool, { feature, entity_type, entity_id, user_email, request_payload, response }) {
  if (!pool) return null;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ai_results (
        id SERIAL PRIMARY KEY,
        feature VARCHAR(100) NOT NULL,
        entity_type VARCHAR(100),
        entity_id INTEGER,
        user_email VARCHAR(255),
        request_payload JSONB,
        response JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_ai_results_feature ON ai_results(feature);
      CREATE INDEX IF NOT EXISTS idx_ai_results_entity ON ai_results(entity_type, entity_id);
    `);
    const r = await pool.query(
      `INSERT INTO ai_results (feature, entity_type, entity_id, user_email, request_payload, response)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, created_at`,
      [feature, entity_type || null, entity_id || null, user_email || null,
       request_payload ? JSON.stringify(request_payload) : null,
       response ? JSON.stringify(response) : null]
    );
    return r.rows[0];
  } catch (err) {
    // Schema mismatch / transient: don't fail the request
    return null;
  }
}

module.exports = { queryOpenRouter, parseAIJson, persistAIResult };
