const createCrudRouter = require('./crudHelper');
module.exports = createCrudRouter('risk_assessments', [
  'defendant_id', 'risk_score', 'risk_level', 'flight_risk_score', 'recidivism_score',
  'community_ties_score', 'employment_score', 'financial_score', 'substance_abuse_score',
  'mental_health_score', 'criminal_history_score', 'overall_recommendation', 'ai_analysis', 'assessor_notes', 'status'
]);
