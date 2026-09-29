'use strict';

const express = require('express');
const config = require('./config');
const { createMetrics } = require('./metrics');
const { ValidationError } = require('./validation');
const categoriesRouter = require('./routes/categories');
const transactionsRouter = require('./routes/transactions');
const summaryRouter = require('./routes/summary');

// Express 4 does not forward rejected promises to the error handler, so wrap handlers.
function wrapAsync(router) {
  for (const layer of router.stack) {
    if (!layer.route) continue;
    for (const handle of layer.route.stack) {
      const fn = handle.handle;
      handle.handle = (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
    }
  }
  return router;
}

function createApp({ pool, logger = console }) {
  const app = express();
  const metrics = createMetrics();

  app.disable('x-powered-by');
  app.set('trust proxy', true);
  app.use(express.json({ limit: '100kb' }));
  app.use(metrics.middleware);

  if (config.corsOrigin) {
    app.use((req, res, next) => {
      res.set('Access-Control-Allow-Origin', config.corsOrigin);
      res.set('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
      res.set('Access-Control-Allow-Headers', 'Content-Type');
      if (req.method === 'OPTIONS') return res.status(204).end();
      next();
    });
  }

  // Probes: liveness never touches the DB, readiness does.
  app.get('/healthz', (req, res) => res.json({ status: 'ok' }));
  app.get('/readyz', async (req, res) => {
    try {
      await pool.query('SELECT 1');
      res.json({ status: 'ready' });
    } catch (err) {
      res.status(503).json({ status: 'unavailable', error: err.message });
    }
  });
  app.get('/metrics', async (req, res) => {
    res.set('Content-Type', metrics.registry.contentType);
    res.end(await metrics.registry.metrics());
  });

  app.get('/api/version', (req, res) =>
    res.json({ version: config.appVersion, gitSha: config.gitSha, environment: config.environment })
  );
  app.use('/api/categories', wrapAsync(categoriesRouter(pool)));
  app.use('/api/transactions', wrapAsync(transactionsRouter(pool)));
  app.use('/api/summary', wrapAsync(summaryRouter(pool)));

  app.use((req, res) => res.status(404).json({ error: 'Not found' }));

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err instanceof ValidationError) return res.status(400).json({ error: err.message, details: err.details });
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON body' });
    if (err.code === '23505') return res.status(409).json({ error: 'A record with that value already exists' });
    if (err.code === '23503') return res.status(400).json({ error: 'Referenced record does not exist' });
    logger.error(err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}

module.exports = { createApp };
