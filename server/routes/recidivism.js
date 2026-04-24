const createCrudRouter = require('./crudHelper');
module.exports = createCrudRouter('recidivism_predictions', [
  'defendant_id', 'prediction_score', 'risk_level', 'prior_offenses_count', 'age_at_first_offense',
  'offense_type_pattern', 'time_since_last_offense', 'social_factors', 'economic_factors',
  'behavioral_indicators', 'protective_factors', 'ai_prediction', 'model_version', 'notes'
]);
