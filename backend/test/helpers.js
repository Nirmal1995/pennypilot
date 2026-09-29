'use strict';

const { createPool } = require('../src/db');
const { migrate } = require('../src/migrate');
const { createApp } = require('../src/app');

const TEST_DB_URL =
  process.env.TEST_DATABASE_URL || 'postgres://pennypilot:pennypilot@localhost:5432/pennypilot_test';

const silent = { info() {}, error() {} };

async function setup() {
  const pool = createPool(TEST_DB_URL);
  await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  await migrate(pool, silent);
  const app = createApp({ pool, logger: silent });
  return { pool, app };
}

module.exports = { setup };
