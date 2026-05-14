# Audit Apply Note — AIBailBondRiskAssessor

Source: `_AUDIT/reports/batch_01.md` § 1.

## Original audit recommendations

### Gaps & opportunities
- Missing Integration API (no webhooks for third-party tool integration)

### Strategic features
- Agentic Bail Review Workflow
- Historical Case RAG
- Real-time Risk Alerts (PACER, NCIC, WebLOMS)
- Integrations: court systems (PACER), law enforcement (NCIC), probation software (WebLOMS)

## Audit findings vs. reality
The codebase already has 9+ AI endpoints in `routes/ai.js` plus 11 more in `routes/aiNew.js` (FTA forecast, condition monitoring, forfeiture prediction, risk trends, etc.) — already very comprehensive.

## Implemented in this pass (MECHANICAL)

| # | Item | File | Endpoints |
|---|------|------|-----------|
| 1 | Webhook subscription stub | `server/routes/webhooks.js` (new) + `server/index.js` | `GET/POST/DELETE /api/webhooks`, `POST /api/webhooks/:id/test`, `GET /api/webhooks/_/events` |

Allowed events: risk_assessment created/updated, bail_bond created/forfeited, flight_risk alert, court_case hearing scheduled, compliance violation. Stores subscriptions in lazily-created `webhooks` table; test endpoint produces a synthetic payload but does not perform external HTTP delivery (no new deps). `node --check` passes.

## Backlog (not implemented)

| Item | Tag | Why deferred |
|------|-----|---------------|
| PACER integration | NEEDS-CREDS | Court system credentials |
| NCIC integration | NEEDS-CREDS | Restricted law-enforcement access |
| WebLOMS integration | NEEDS-CREDS | Vendor partnership |
| Outbound webhook delivery (HMAC, retry) | TOO-RISKY | Background job infra |
| Multi-agent bail review orchestration | NEEDS-PRODUCT-DECISION | Agent topology decision |
| Historical case RAG | NEEDS-PRODUCT-DECISION | Vector store choice & corpus |

## Apply pass 4 (mechanical backlog)

**Skipped** — every remaining backlog item is tagged NEEDS-CREDS (PACER, NCIC, WebLOMS), TOO-RISKY (outbound webhook delivery requires HMAC + retry infra), or NEEDS-PRODUCT-DECISION (multi-agent orchestration topology, RAG vector store choice). Apply pass 3 already verified that every backend AI endpoint has FE coverage. No mechanical work to apply.

## Apply pass 3 (frontend)

- **Stack:** Express + CRA React 18 (`client/src`) with `react-toastify`, `react-router-dom`, shared axios `services/api.js` (already attaches `Bearer ${localStorage.token}`).
- **Backend AI endpoints (verified):** 9 in `routes/ai.js` (assess-risk, flight-risk, recidivism, compliance-check, financial-analysis, substance-risk, mental-health-eval, community-analysis, predict-recidivism); 11 in `routes/aiNew.js` (fta-forecast, condition-monitoring, forfeiture-predictor, risk-trends, surety-network-validation, court-hearing-prep, geopolitical-risk-alert, comparative-benchmarking, bond-premium-optimizer, warrant-risk-assessment, portfolio-risk-summary); webhooks subscribe/test in `routes/webhooks.js`.
- **FE coverage:** `pages/FeaturePage.js` maps every `routes/ai.js` endpoint; `pages/AIInsights.js` switches across all 11 advanced features in `routes/aiNew.js`; `pages/WebhooksPage.js` covers GET/POST/DELETE/test.
- **Action:** **FE already wired** — no changes.

