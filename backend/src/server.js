'use strict';

const config = require('./config');
const { createPool } = require('./db');
const { createApp } = require('./app');
const { migrate } = require('./migrate');

async function main() {
  const pool = createPool();

  if (config.migrateOnStart) {
    await migrate(pool);
  }

  const app = createApp({ pool });
  const server = app.listen(config.port, () => {
    console.info(`pennypilot-api ${config.appVersion} (${config.gitSha}) listening on :${config.port}`);
  });

  // Graceful shutdown so rolling updates on Kubernetes do not drop requests.
  const shutdown = (signal) => {
    console.info(`${signal} received, shutting down`);
    server.close(async () => {
      await pool.end().catch(() => {});
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  console.error('failed to start:', err);
  process.exit(1);
});
