# Apply Pass 5 — AIBailBondRiskAssessor

- **Date:** 2026-05-08
- **Audit source:** `_AUDIT/reports/batch_01.md` § 1
- **Stack:** node-express backend (`server/`) + CRA React frontend (`client/`); JWT bearer auth via `middleware/auth.js`; Postgres via `db.js`; existing rate limiter `middleware/rateLimiter.js`.
- **AI helper:** `services/openrouter.js` (`queryOpenRouter`, `persistAIResult`).

## Verified-present (Non-AI features inventory)
`auth.js`, `users.js`, `crudHelper.js`, `dashboard.js`, `reports.js`, `bailBonds.js`, `calendar.js`, `communityTies.js`, `auditLog.js` — all confirmed present. `notifications.js` and `webhooks.js` already shipped from earlier passes.

## Implemented this pass (5 items, all categorized)

| # | Item | Category | Files | Endpoints |
|---|------|----------|-------|-----------|
| 1 | Court / law-enforcement integration stubs | NEEDS-CREDS | `server/routes/integrations.js` (new) | `GET /api/integrations/pacer/cases`, `/ncic/check`, `/webloms/probation` (all 503 with `missing: PACER_API_KEY` / `NCIC_API_KEY` / `WEBLOMS_API_KEY`) |
| 2 | Multi-agent bail review pipeline | NEEDS-PRODUCT-DECISION (sequential 3-agent: RiskAnalyst → ComplianceOfficer → Recommender) | `server/routes/multiAgent.js` (new) | `POST /api/multi-agent/bail-review` |
| 3 | Historical-case RAG (in-memory) | NEEDS-PRODUCT-DECISION (256-dim hashed BoW, no vector DB dep) | `server/routes/historicalRag.js` (new) | `POST /api/historical-rag/search`, `POST /api/historical-rag/synthesize` |
| 4 | Frontend: Integrations page | MECHANICAL | `client/src/pages/IntegrationsPage.js` (new) | calls 3 integration endpoints, surfaces 503-with-missing |
| 5 | Frontend: Multi-Agent Review + Historical RAG pages | MECHANICAL | `client/src/pages/MultiAgentReviewPage.js`, `HistoricalRagPage.js` (new); routes added to `client/src/App.js` | covers items 2 & 3 |

Route registration appended to `server/index.js` (lines 68–71) — additive only, no existing route modified.

## Deferred (creds / risk / product)

| Item | Category | Reason |
|------|----------|--------|
| Real PACER / NCIC / WebLOMS HTTP calls | NEEDS-CREDS | Government / restricted-access APIs require auth-handshake + audit framework |
| Outbound webhook delivery (HMAC + retry) | TOO-RISKY | Requires background worker + durable queue |
| Real-time risk alerts (streaming arrests, address changes) | NEEDS-PRODUCT-DECISION + creds | Stream source not present; no ingest pipeline |
| Replace in-memory RAG with pgvector / Pinecone | NEEDS-PRODUCT-DECISION | Vendor selection |

## Smoke test
- `node --check` on every modified file: PASS.
- Route registration verified by greppable comments in `server/index.js`.

## Notes
- All schema is `CREATE TABLE IF NOT EXISTS`; no existing schema modified.
- All 3 new BE routes guarded by `auth` middleware and return 503 when `OPENROUTER_API_KEY` (for AI calls) or vendor env-var (for integrations) is unset.
- Healthcare/legal disclaimer not applicable — this is a risk-analysis tool already gated by professional-use prompts.
