const createCrudRouter = require('./crudHelper');
module.exports = createCrudRouter('substance_abuse_assessments', [
  'defendant_id', 'substance_type', 'usage_frequency', 'last_use_date', 'treatment_history',
  'current_treatment', 'treatment_facility', 'counselor_name', 'sobriety_duration',
  'risk_level', 'drug_test_results', 'compliance_status', 'notes'
]);
