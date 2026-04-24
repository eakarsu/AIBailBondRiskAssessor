const createCrudRouter = require('./crudHelper');
module.exports = createCrudRouter('financial_analyses', [
  'defendant_id', 'annual_income', 'monthly_expenses', 'total_assets', 'total_liabilities',
  'credit_score', 'bank_accounts', 'property_owned', 'vehicles_owned', 'investment_accounts',
  'outstanding_debts', 'bankruptcy_history', 'financial_stability_score', 'notes'
]);
