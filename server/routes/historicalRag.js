// PRODUCT-DECISION: Historical-case RAG uses an in-memory hashed-bag-of-words
// embedding (no external vector store, no heavy ML deps). Cases are pulled
// from the existing `risk_assessments` + `defendants` + `criminal_histories`
// tables and re-indexed lazily on each query (acceptable for current dataset
// sizes; revisit if N grows beyond a few thousand). The choice avoids
// committing to a vendor (pgvector vs. Pinecone vs. Weaviate) prematurely.
//
// Env: OPENROUTER_API_KEY — when unset, the endpoint returns the retrieved
// context but the synthesis step is replaced by a 503 so the caller can
// distinguish "no AI" from "no matches".

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const pool = require('../db');
const { queryOpenRouter, persistAIResult } = require('../services/openrouter');

router.use(auth);

const HASH_DIM = 256;

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t && t.length > 2 && t.length < 30);
}

function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h >>> 0;
}

function embed(text) {
  const v = new Array(HASH_DIM).fill(0);
  const toks = tokenize(text);
  for (const t of toks) v[fnv1a(t) % HASH_DIM] += 1;
  // L2 normalize
  let n = 0;
  for (const x of v) n += x * x;
  n = Math.sqrt(n) || 1;
  for (let i = 0; i < v.length; i++) v[i] /= n;
  return v;
}

function cosine(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

async function loadCorpus() {
  const sql = `
    SELECT
      ra.id AS assessment_id,
      ra.defendant_id,
      ra.risk_score,
      ra.risk_level,
      ra.assessment_data,
      ra.recommendations,
      d.first_name,
      d.last_name,
      d.charges,
      d.bond_amount
    FROM risk_assessments ra
    LEFT JOIN defendants d ON d.id = ra.defendant_id
    ORDER BY ra.id DESC
    LIMIT 500
  `;
  const r = await pool.query(sql).catch(() => ({ rows: [] }));
  return r.rows.map((row) => {
    const text = [
      row.first_name,
      row.last_name,
      row.charges,
      row.risk_level,
      typeof row.assessment_data === 'string' ? row.assessment_data : JSON.stringify(row.assessment_data || {}),
      typeof row.recommendations === 'string' ? row.recommendations : JSON.stringify(row.recommendations || {}),
    ].filter(Boolean).join(' ');
    return {
      id: row.assessment_id,
      defendant_id: row.defendant_id,
      risk_score: row.risk_score,
      risk_level: row.risk_level,
      bond_amount: row.bond_amount,
      summary: `${row.first_name || ''} ${row.last_name || ''} — ${row.charges || ''}`.trim(),
      vec: embed(text),
    };
  });
}

router.post('/search', async (req, res) => {
  try {
    const { query, k } = req.body || {};
    if (!query || typeof query !== 'string') return res.status(400).json({ error: 'query is required' });
    const corpus = await loadCorpus();
    if (corpus.length === 0) return res.json({ matches: [], total_corpus: 0 });
    const qv = embed(query);
    const topK = Math.min(Math.max(parseInt(k, 10) || 5, 1), 20);
    const scored = corpus
      .map((c) => ({ ...c, score: cosine(qv, c.vec) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map(({ vec, ...rest }) => rest);
    res.json({ matches: scored, total_corpus: corpus.length });
  } catch (err) {
    res.status(500).json({ error: 'rag search failed', details: err.message });
  }
});

router.post('/ask', async (req, res) => {
  try {
    if (!process.env.OPENROUTER_API_KEY) {
      return res.status(503).json({ error: 'AI service unavailable: OPENROUTER_API_KEY not configured', missing: 'OPENROUTER_API_KEY' });
    }
    const { query, k } = req.body || {};
    if (!query || typeof query !== 'string') return res.status(400).json({ error: 'query is required' });
    const corpus = await loadCorpus();
    const qv = embed(query);
    const topK = Math.min(Math.max(parseInt(k, 10) || 5, 1), 20);
    const matches = corpus
      .map((c) => ({ ...c, score: cosine(qv, c.vec) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    const context = matches
      .map((m, i) => `Case ${i + 1}: id=${m.id}, defendant=${m.summary || 'n/a'}, risk_level=${m.risk_level || 'n/a'}, risk_score=${m.risk_score ?? 'n/a'}, bond=${m.bond_amount ?? 'n/a'}`)
      .join('\n');

    const prompt = `Question: ${query}\n\nHistorical case context (similarity-ranked):\n${context}\n\nAnswer the question using ONLY the cases above. Cite case ids. Return JSON {"answer": string, "cited_case_ids": number[]}.`;
    const ai = await queryOpenRouter(prompt, 'You are a senior bail-bond risk analyst answering questions over a case archive.');
    await persistAIResult(pool, {
      feature: 'historical_rag_ask',
      entity_type: 'risk_assessment',
      entity_id: null,
      user_email: req.user?.email,
      request_payload: { query, k: topK },
      response: { ai, matches },
    });
    res.json({ ai, matches: matches.map(({ vec, ...rest }) => rest) });
  } catch (err) {
    if (/OPENROUTER_API_KEY/i.test(String(err.message))) {
      return res.status(503).json({ error: 'AI service unavailable: OPENROUTER_API_KEY not configured', missing: 'OPENROUTER_API_KEY' });
    }
    res.status(500).json({ error: 'rag ask failed', details: err.message });
  }
});

module.exports = router;
