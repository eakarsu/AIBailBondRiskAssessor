require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const { startCourtDateReminderScheduler } = require('./services/emailService');
const { generalRateLimiter } = require('./middleware/rateLimiter');
const auditLog = require('./middleware/auditLog');

// Guard: fail fast if JWT_SECRET is not configured
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32 || process.env.JWT_SECRET === 'your_jwt_secret_here') {
  console.error('[FATAL] JWT_SECRET is not set or is using the default placeholder. Set a strong secret in .env');
  process.exit(1);
}

const app = express();
const PORT = process.env.SERVER_PORT || 3001;

// Security headers
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

// Env-driven CORS allowlist (comma-separated origins via CORS_ORIGINS)
const corsOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000')
  .split(',').map(o => o.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (corsOrigins.includes('*') || corsOrigins.includes(origin)) return cb(null, true);
    return cb(new Error(`CORS blocked for origin ${origin}`));
  },
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));

// Global rate limiter: 100 requests per IP per 15 minutes
app.use(generalRateLimiter);

// Routes — audit logging applied to all data-mutating endpoints
app.use('/api/auth', require('./routes/auth'));
app.use('/api/defendants', auditLog('defendant'), require('./routes/defendants'));
app.use('/api/bail-bonds', auditLog('bail_bond'), require('./routes/bailBonds'));
app.use('/api/risk-assessments', auditLog('risk_assessment'), require('./routes/riskAssessments'));
app.use('/api/court-cases', auditLog('court_case'), require('./routes/courtCases'));
app.use('/api/compliance', auditLog('compliance'), require('./routes/compliance'));
app.use('/api/flight-risk', auditLog('flight_risk'), require('./routes/flightRisk'));
app.use('/api/criminal-history', auditLog('criminal_history'), require('./routes/criminalHistory'));
app.use('/api/employment', auditLog('employment'), require('./routes/employment'));
app.use('/api/community-ties', auditLog('community_ties'), require('./routes/communityTies'));
app.use('/api/financial', auditLog('financial'), require('./routes/financial'));
app.use('/api/substance-abuse', auditLog('substance_abuse'), require('./routes/substanceAbuse'));
app.use('/api/mental-health', auditLog('mental_health'), require('./routes/mentalHealth'));
app.use('/api/recidivism', auditLog('recidivism'), require('./routes/recidivism'));
app.use('/api/surety', auditLog('surety'), require('./routes/surety'));
app.use('/api/notifications', auditLog('notification'), require('./routes/notifications'));
// Model-generated bail recommendations are quarantined from the decision surface.
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/audit-log', require('./routes/auditLog'));
app.use('/api/users', auditLog('user'), require('./routes/users'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/calendar', auditLog('calendar'), require('./routes/calendar'));

app.use('/api/search', require('./routes/search'));
app.use('/api/webhooks', require('./routes/webhooks'));
app.use('/api/integrations', require('./routes/integrations')); // apply pass 5: PACER/NCIC/WebLOMS gated stubs
app.use('/api/historical-rag', require('./routes/historicalRag')); // apply pass 5: in-memory historical-case RAG
app.use('/api/governed-cases', require('./routes/governedCases'));
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));


// Agentic bail-review prototype deliberately unmounted.

app.use('/api/precedent-rag', require('./routes/precedentRagSearch')); // apply pass 6 — audit custom suggestion

app.use('/api/risk-event-stream', require('./routes/riskEventStream')); // apply pass 6 — audit custom suggestion

app.use('/api/court-integrations', require('./routes/courtSystemIntegrations')); // apply pass 6 — audit custom suggestion
app.use('/api/collateral-lien-monitor', require('./routes/collateralLienMonitor'));
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  // Start court date reminder email scheduler (runs every hour)
  if (process.env.ENABLE_REMINDER_SCHEDULER === 'true') startCourtDateReminderScheduler();
});


// Generated gap endpoints remain unmounted audit artifacts.
