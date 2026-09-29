'use strict';

const { Pool, types } = require('pg');
const config = require('./config');

// Return NUMERIC columns as JS numbers and DATE columns as plain YYYY-MM-DD strings.
types.setTypeParser(1700, (v) => (v === null ? null : Number(v)));
types.setTypeParser(1082, (v) => v);

function createPool(connectionString = config.databaseUrl) {
  return new Pool({
    connectionString,
    ssl: config.dbSsl ? { rejectUnauthorized: false } : undefined,
    max: Number(process.env.DB_POOL_MAX || 10),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000
  });
}

module.exports = { createPool };
