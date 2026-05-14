const createCrudRouter = require('./crudHelper');
module.exports = createCrudRouter('court_cases', [
  'defendant_id', 'case_number', 'court_name', 'judge', 'judge_name', 'courtroom',
  'charge', 'charge_severity', 'next_hearing_date', 'hearing_type', 'status',
  'prosecutor', 'defense_attorney', 'reminder_sent', 'notes'
]);
