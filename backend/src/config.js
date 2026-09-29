'use strict';

const pkg = require('../package.json');

function buildDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const user = process.env.DB_USER || 'pennypilot';
  const password = encodeURIComponent(process.env.DB_PASSWORD || 'pennypilot');
  const host = process.env.DB_HOST || 'localhost';
  const port = process.env.DB_PORT || '5432';
  const name = process.env.DB_NAME || 'pennypilot';
  return `postgres://${user}:${password}@${host}:${port}/${name}`;
}

module.exports = {
  port: Number(process.env.PORT || 8080),
  databaseUrl: buildDatabaseUrl(),
  dbSsl: process.env.DB_SSL === 'true',
  migrateOnStart: process.env.MIGRATE_ON_START !== 'false',
  appVersion: process.env.APP_VERSION || pkg.version,
  gitSha: process.env.GIT_SHA || 'local',
  environment: process.env.APP_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || ''
};
