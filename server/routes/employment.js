const createCrudRouter = require('./crudHelper');
module.exports = createCrudRouter('employment_records', [
  'defendant_id', 'employer_name', 'position', 'employment_type', 'start_date',
  'end_date', 'monthly_income', 'supervisor_name', 'supervisor_phone', 'verified',
  'verification_date', 'verification_method', 'status', 'notes'
]);
