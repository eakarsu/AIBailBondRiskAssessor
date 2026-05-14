require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const { startCourtDateReminderScheduler } = require('./services/emailService');
const { generalRateLimiter } = require('./middleware/rateLimiter');
const auditLog = require('./middleware/auditLog');

// Guard: fail fast if JWT_SECRET is not configured
if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'your_jwt_secret_here') {
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
app.use('/api/ai', require('./routes/ai'));
app.use('/api/ai', require('./routes/aiNew'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/audit-log', require('./routes/auditLog'));
app.use('/api/users', auditLog('user'), require('./routes/users'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/calendar', auditLog('calendar'), require('./routes/calendar'));

app.use('/api/search', require('./routes/search'));
app.use('/api/webhooks', require('./routes/webhooks'));
app.use('/api/integrations', require('./routes/integrations')); // apply pass 5: PACER/NCIC/WebLOMS gated stubs
app.use('/api/historical-rag', require('./routes/historicalRag')); // apply pass 5: in-memory historical-case RAG
app.use('/api/multi-agent', require('./routes/multiAgent')); // apply pass 5: 3-agent bail review pipeline
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));


app.use('/api/agentic-bail-review', require('./routes/agenticBailReview')); // apply pass 6 — audit custom suggestion

app.use('/api/precedent-rag', require('./routes/precedentRagSearch')); // apply pass 6 — audit custom suggestion

app.use('/api/risk-event-stream', require('./routes/riskEventStream')); // apply pass 6 — audit custom suggestion

app.use('/api/court-integrations', require('./routes/courtSystemIntegrations')); // apply pass 6 — audit custom suggestion
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  // Start court date reminder email scheduler (runs every hour)
  startCourtDateReminderScheduler();
});


// === Batch 01 Gaps & Frontend Mounts ===
app.use('/api/gap-no-ai-driven-bond-pricing-despite-financial-analys', require('./routes/gap_no_ai_driven_bond_pricing_despite_financial_analys'));
app.use('/api/gap-no-nlp-intake-of-police-reports-arrest-records', require('./routes/gap_no_nlp_intake_of_police_reports_arrest_records'));
app.use('/api/gap-no-vision-document-ocr-for-booking-sheets', require('./routes/gap_no_vision_document_ocr_for_booking_sheets'));
app.use('/api/gap-no-anomaly-detection-on-check-in-curfew-violations', require('./routes/gap_no_anomaly_detection_on_check_in_curfew_violations'));
app.use('/api/gap-no-predictive-court-date-no-show-forecasting', require('./routes/gap_no_predictive_court_date_no_show_forecasting'));
app.use('/api/gap-no-gps-ankle-monitor-device-integration', require('./routes/gap_no_gps_ankle_monitor_device_integration'));
app.use('/api/gap-no-payment-processing-for-premiums-and-collateral', require('./routes/gap_no_payment_processing_for_premiums_and_collateral'));
app.use('/api/gap-no-defendant-facing-mobile-check-in-app', require('./routes/gap_no_defendant_facing_mobile_check_in_app'));
app.use('/api/gap-no-sms-voice-reminder-delivery-notifications-modul', require('./routes/gap_no_sms_voice_reminder_delivery_notifications_modul'));
app.use('/api/gap-no-e-signature-workflow-for-bond-contracts', require('./routes/gap_no_e_signature_workflow_for_bond_contracts'));
app.use('/api/gap-no-direct-pacer-ncic-court-record-sync', require('./routes/gap_no_direct_pacer_ncic_court_record_sync'));
