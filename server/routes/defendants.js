const createCrudRouter = require('./crudHelper');
module.exports = createCrudRouter('defendants', [
  'first_name', 'last_name', 'date_of_birth', 'ssn_last4', 'address',
  'city', 'state', 'zip_code', 'phone', 'email', 'gender', 'risk_level', 'status', 'notes'
]);
