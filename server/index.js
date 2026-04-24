require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.SERVER_PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/defendants', require('./routes/defendants'));
app.use('/api/bail-bonds', require('./routes/bailBonds'));
app.use('/api/risk-assessments', require('./routes/riskAssessments'));
app.use('/api/court-cases', require('./routes/courtCases'));
app.use('/api/compliance', require('./routes/compliance'));
app.use('/api/flight-risk', require('./routes/flightRisk'));
app.use('/api/criminal-history', require('./routes/criminalHistory'));
app.use('/api/employment', require('./routes/employment'));
app.use('/api/community-ties', require('./routes/communityTies'));
app.use('/api/financial', require('./routes/financial'));
app.use('/api/substance-abuse', require('./routes/substanceAbuse'));
app.use('/api/mental-health', require('./routes/mentalHealth'));
app.use('/api/recidivism', require('./routes/recidivism'));
app.use('/api/surety', require('./routes/surety'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/audit-log', require('./routes/auditLog'));
app.use('/api/users', require('./routes/users'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/calendar', require('./routes/calendar'));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
