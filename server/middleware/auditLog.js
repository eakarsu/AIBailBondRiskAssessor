const pool = require('../db');

/**
 * Middleware factory that logs POST/PUT/DELETE operations to the audit_log table.
 * Wraps the response to capture the outcome after the route handler completes.
 */
function auditLog(entityType) {
  return function (req, res, next) {
    // Only log mutating methods
    if (!['POST', 'PUT', 'DELETE'].includes(req.method)) {
      return next();
    }

    // Capture the original json method to intercept the response
    const originalJson = res.json.bind(res);

    res.json = function (body) {
      // Log asynchronously, don't block the response
      const action = req.method === 'POST' ? 'CREATE'
        : req.method === 'PUT' ? 'UPDATE'
        : 'DELETE';

      const userId = req.user ? req.user.id : null;
      const entityId = req.params.id || (body && body.id) || null;
      const statusCode = res.statusCode;

      // Only log successful operations (2xx status codes)
      if (statusCode >= 200 && statusCode < 300) {
        const details = {};
        if (req.method === 'POST' || req.method === 'PUT') {
          // Store request body minus sensitive fields
          const sanitized = { ...req.body };
          delete sanitized.password;
          delete sanitized.password_hash;
          details.requestBody = sanitized;
        }
        if (req.method === 'DELETE' && req.body && req.body.ids) {
          details.batchIds = req.body.ids;
        }

        pool.query(
          `INSERT INTO audit_log (user_id, action, entity_type, entity_id, details, ip_address)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [userId, action, entityType, entityId, JSON.stringify(details), req.ip]
        ).catch(err => {
          console.error('Audit log error:', err.message);
        });
      }

      return originalJson(body);
    };

    next();
  };
}

module.exports = auditLog;
