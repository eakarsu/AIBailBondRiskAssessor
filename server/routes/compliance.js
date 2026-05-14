const createCrudRouter = require('./crudHelper');
module.exports = createCrudRouter('compliance_reports', [
  'defendant_id', 'report_type', 'title', 'description', 'status', 'due_date', 'completed_date',
  'jurisdiction', 'regulatory_body', 'findings', 'corrective_actions', 'risk_rating', 'assigned_to'
]);
