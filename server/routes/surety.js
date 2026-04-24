const createCrudRouter = require('./crudHelper');
module.exports = createCrudRouter('sureties', [
  'defendant_id', 'surety_name', 'relationship', 'phone', 'email', 'address',
  'occupation', 'annual_income', 'assets_value', 'collateral_offered', 'collateral_type',
  'verified', 'verification_date', 'reliability_score', 'notes'
]);
