const createCrudRouter = require('./crudHelper');
module.exports = createCrudRouter('mental_health_evaluations', [
  'defendant_id', 'diagnosis', 'severity', 'treatment_status', 'medication',
  'therapist_name', 'therapy_frequency', 'last_evaluation_date', 'hospitalization_history',
  'risk_to_self', 'risk_to_others', 'competency_status', 'compliance_level', 'notes'
]);
