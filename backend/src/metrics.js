'use strict';

const client = require('prom-client');

function createMetrics() {
  const registry = new client.Registry();
  registry.setDefaultLabels({ app: 'pennypilot-api' });
  client.collectDefaultMetrics({ register: registry });

  const httpDuration = new client.Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request latency in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
    registers: [registry]
  });

  const httpTotal = new client.Counter({
    name: 'http_requests_total',
    help: 'Total HTTP requests',
    labelNames: ['method', 'route', 'status_code'],
    registers: [registry]
  });

  function middleware(req, res, next) {
    if (req.path === '/metrics') return next();
    const end = httpDuration.startTimer();
    res.on('finish', () => {
      // Use the matched route pattern so label cardinality stays low.
      const route = req.route ? `${req.baseUrl}${req.route.path}` : 'unmatched';
      const labels = { method: req.method, route, status_code: res.statusCode };
      end(labels);
      httpTotal.inc(labels);
    });
    next();
  }

  return { registry, middleware };
}

module.exports = { createMetrics };
