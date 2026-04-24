const createCrudRouter = require('./crudHelper');
module.exports = createCrudRouter('criminal_histories', [
  'defendant_id', 'offense_type', 'offense_date', 'offense_description', 'severity',
  'disposition', 'sentence', 'jurisdiction', 'case_number', 'arresting_agency',
  'conviction_date', 'release_date', 'probation_status', 'notes'
]);
