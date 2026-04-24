const createCrudRouter = require('./crudHelper');
module.exports = createCrudRouter('bail_bonds', [
  'defendant_id', 'bond_amount', 'premium_amount', 'bond_type', 'status',
  'court_date', 'court_name', 'case_number', 'charge', 'collateral', 'notes'
]);
