const createCrudRouter = require('./crudHelper');
module.exports = createCrudRouter('notifications', [
  'title', 'message', 'type', 'priority', 'recipient_id', 'related_entity_type',
  'related_entity_id', 'is_read', 'action_required', 'action_url', 'due_date', 'notes'
]);
