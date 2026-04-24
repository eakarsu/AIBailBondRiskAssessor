const createCrudRouter = require('./crudHelper');
module.exports = createCrudRouter('court_cases', [
  'defendant_id', 'case_number', 'court_name', 'judge', 'charge', 'charge_severity',
  'next_hearing_date', 'hearing_type', 'status', 'prosecutor', 'defense_attorney', 'notes'
]);
