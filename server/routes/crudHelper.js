const pool = require('../db');
const auth = require('../middleware/auth');

function createCrudRouter(tableName, columns) {
  const router = require('express').Router();

  // Helper: build WHERE clause from search + filters
  function buildWhereClause(query, columns) {
    const conditions = [];
    const values = [];
    let paramIndex = 1;

    // Search across all text columns
    if (query.search && query.search.trim()) {
      const searchConditions = columns.map(col => {
        values.push(`%${query.search.trim()}%`);
        return `${col}::text ILIKE $${paramIndex++}`;
      });
      conditions.push(`(${searchConditions.join(' OR ')})`);
    }

    // Filter by specific column values: ?filter_status=Active&filter_risk_level=HIGH
    for (const key of Object.keys(query)) {
      if (key.startsWith('filter_')) {
        const colName = key.substring(7); // strip 'filter_'
        if (columns.includes(colName) || colName === 'id') {
          values.push(query[key]);
          conditions.push(`${colName} = $${paramIndex++}`);
        }
      }
    }

    const whereSQL = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    return { whereSQL, values, paramIndex };
  }

  // GET /export - CSV export (must be before /:id to avoid route conflict)
  router.get('/export', auth, async (req, res) => {
    try {
      const { whereSQL, values } = buildWhereClause(req.query, columns);

      const result = await pool.query(
        `SELECT * FROM ${tableName} ${whereSQL} ORDER BY created_at DESC`,
        values
      );

      const rows = result.rows;
      if (rows.length === 0) {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${tableName}_export.csv"`);
        return res.send('');
      }

      const csvColumns = Object.keys(rows[0]);
      const header = csvColumns.map(c => `"${c}"`).join(',');
      const csvRows = rows.map(row =>
        csvColumns.map(c => {
          const val = row[c];
          if (val === null || val === undefined) return '';
          const str = String(val).replace(/"/g, '""');
          return `"${str}"`;
        }).join(',')
      );

      const csv = [header, ...csvRows].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${tableName}_export.csv"`);
      res.send(csv);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET all with search, pagination, sorting, filtering
  router.get('/', auth, async (req, res) => {
    try {
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 25));
      const offset = (page - 1) * limit;

      // Validate sort column against allowed columns
      const allSortable = ['id', 'created_at', 'updated_at', ...columns];
      const sortCol = allSortable.includes(req.query.sort) ? req.query.sort : 'created_at';
      const sortOrder = req.query.order && req.query.order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

      const { whereSQL, values, paramIndex } = buildWhereClause(req.query, columns);

      // Count query
      const countResult = await pool.query(
        `SELECT COUNT(*) FROM ${tableName} ${whereSQL}`,
        values
      );
      const total = parseInt(countResult.rows[0].count);

      // Data query
      const dataValues = [...values, limit, offset];
      const result = await pool.query(
        `SELECT * FROM ${tableName} ${whereSQL} ORDER BY ${sortCol} ${sortOrder} LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        dataValues
      );

      res.json({
        data: result.rows,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET by id
  router.get('/:id', auth, async (req, res) => {
    try {
      const result = await pool.query(`SELECT * FROM ${tableName} WHERE id = $1`, [req.params.id]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST create
  router.post('/', auth, async (req, res) => {
    try {
      const cols = columns.filter(c => req.body[c] !== undefined);
      const vals = cols.map(c => req.body[c]);
      const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
      const result = await pool.query(
        `INSERT INTO ${tableName} (${cols.join(', ')}) VALUES (${placeholders}) RETURNING *`,
        vals
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // PUT update
  router.put('/:id', auth, async (req, res) => {
    try {
      const cols = columns.filter(c => req.body[c] !== undefined);
      const vals = cols.map(c => req.body[c]);
      const setClause = cols.map((c, i) => `${c} = $${i + 1}`).join(', ');
      vals.push(req.params.id);
      const result = await pool.query(
        `UPDATE ${tableName} SET ${setClause}, updated_at = NOW() WHERE id = $${vals.length} RETURNING *`,
        vals
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE batch - must be before /:id
  router.delete('/batch', auth, async (req, res) => {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: 'ids must be a non-empty array' });
      }

      const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ');
      const result = await pool.query(
        `DELETE FROM ${tableName} WHERE id IN (${placeholders}) RETURNING id`,
        ids
      );

      res.json({ message: `Deleted ${result.rowCount} records`, deletedIds: result.rows.map(r => r.id) });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE single
  router.delete('/:id', auth, async (req, res) => {
    try {
      const result = await pool.query(`DELETE FROM ${tableName} WHERE id = $1 RETURNING *`, [req.params.id]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
      res.json({ message: 'Deleted successfully' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}

module.exports = createCrudRouter;
