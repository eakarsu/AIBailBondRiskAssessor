const createCrudRouter = require('./crudHelper');
module.exports = createCrudRouter('community_ties', [
  'defendant_id', 'relationship_type', 'contact_name', 'contact_phone', 'contact_address',
  'years_known', 'frequency_of_contact', 'willingness_to_supervise', 'verified',
  'community_involvement', 'organization_name', 'tie_strength', 'notes'
]);
