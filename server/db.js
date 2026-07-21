const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'bail_bond_risk_assessor',
  user: process.env.DB_USER || process.env.USER,
};
if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL && (!process.env.DB_NAME || !process.env.DB_USER || !process.env.DB_PASSWORD)) throw new Error('Explicit database credentials required');
if (process.env.DATABASE_URL) config.connectionString = process.env.DATABASE_URL;
if (process.env.DB_SSL === 'true') config.ssl = { rejectUnauthorized: true };

if (process.env.DB_PASSWORD) {
  config.password = process.env.DB_PASSWORD;
}

const pool = new Pool(config);

module.exports = pool;
