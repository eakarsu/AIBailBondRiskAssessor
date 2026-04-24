const createCrudRouter = require('./crudHelper');
module.exports = createCrudRouter('flight_risk_analyses', [
  'defendant_id', 'passport_status', 'travel_history', 'foreign_connections', 'prior_fta',
  'community_roots', 'employment_stability', 'family_ties', 'financial_resources',
  'risk_score', 'risk_level', 'ai_assessment', 'monitoring_recommendation', 'notes'
]);
