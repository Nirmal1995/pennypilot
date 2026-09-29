'use strict';

const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { setup } = require('./helpers');

let pool;
let app;

before(async () => {
  ({ pool, app } = await setup());
});

after(async () => {
  await pool.end();
});

describe('health and meta endpoints', () => {
  test('GET /healthz returns ok', async () => {
    const res = await request(app).get('/healthz');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
  });

  test('GET /readyz checks the database', async () => {
    const res = await request(app).get('/readyz');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ready');
  });

  test('GET /api/version exposes build info', async () => {
    const res = await request(app).get('/api/version');
    assert.equal(res.status, 200);
    assert.ok(res.body.version);
    assert.ok(res.body.gitSha);
  });

  test('GET /metrics serves Prometheus metrics', async () => {
    await request(app).get('/api/categories');
    const res = await request(app).get('/metrics');
    assert.equal(res.status, 200);
    assert.match(res.text, /http_requests_total/);
  });

  test('unknown routes return 404 JSON', async () => {
    const res = await request(app).get('/api/nope');
    assert.equal(res.status, 404);
  });
});

describe('categories', () => {
  test('seeded categories are listed', async () => {
    const res = await request(app).get('/api/categories');
    assert.equal(res.status, 200);
    assert.ok(res.body.find((c) => c.name === 'Groceries'));
  });

  test('create, update and delete a category', async () => {
    const created = await request(app).post('/api/categories').send({ name: 'Gym', color: '#123ABC' });
    assert.equal(created.status, 201);
    assert.equal(created.body.type, 'expense');
    assert.equal(created.body.color, '#123abc');

    const updated = await request(app).put(`/api/categories/${created.body.id}`).send({ name: 'Fitness' });
    assert.equal(updated.status, 200);
    assert.equal(updated.body.name, 'Fitness');

    const removed = await request(app).delete(`/api/categories/${created.body.id}`);
    assert.equal(removed.status, 204);
  });

  test('duplicate names return 409', async () => {
    const res = await request(app).post('/api/categories').send({ name: 'Groceries' });
    assert.equal(res.status, 409);
  });

  test('invalid colour returns 400', async () => {
    const res = await request(app).post('/api/categories').send({ name: 'Bad', color: 'red' });
    assert.equal(res.status, 400);
    assert.ok(res.body.details.length);
  });
});

describe('transactions', () => {
  let groceriesId;

  before(async () => {
    const { body } = await request(app).get('/api/categories');
    groceriesId = body.find((c) => c.name === 'Groceries').id;
  });

  test('full CRUD lifecycle', async () => {
    const created = await request(app).post('/api/transactions').send({
      description: 'Tesco weekly shop',
      amount: '54.30',
      type: 'expense',
      categoryId: groceriesId,
      occurredOn: '2026-09-12'
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.amount, 54.3);
    assert.equal(created.body.categoryName, 'Groceries');
    assert.equal(created.body.occurredOn, '2026-09-12');

    const id = created.body.id;
    const fetched = await request(app).get(`/api/transactions/${id}`);
    assert.equal(fetched.status, 200);

    const updated = await request(app).put(`/api/transactions/${id}`).send({ amount: 60, notes: 'added snacks' });
    assert.equal(updated.status, 200);
    assert.equal(updated.body.amount, 60);
    assert.equal(updated.body.notes, 'added snacks');
    assert.equal(updated.body.description, 'Tesco weekly shop');

    const cleared = await request(app).put(`/api/transactions/${id}`).send({ categoryId: null });
    assert.equal(cleared.body.categoryId, null);

    const removed = await request(app).delete(`/api/transactions/${id}`);
    assert.equal(removed.status, 204);

    const gone = await request(app).get(`/api/transactions/${id}`);
    assert.equal(gone.status, 404);
  });

  test('rejects invalid payloads', async () => {
    const res = await request(app).post('/api/transactions').send({ description: '', amount: -5, type: 'gift' });
    assert.equal(res.status, 400);
    assert.equal(res.body.details.length, 3);
  });

  test('rejects impossible dates', async () => {
    const res = await request(app)
      .post('/api/transactions')
      .send({ description: 'x', amount: 1, type: 'expense', occurredOn: '2026-02-30' });
    assert.equal(res.status, 400);
  });

  test('rejects unknown category', async () => {
    const res = await request(app)
      .post('/api/transactions')
      .send({ description: 'x', amount: 1, type: 'expense', categoryId: 99999 });
    assert.equal(res.status, 400);
  });

  test('filters by month and type', async () => {
    const seed = [
      { description: 'Salary', amount: 3200, type: 'income', occurredOn: '2026-08-28' },
      { description: 'Rent', amount: 1500, type: 'expense', occurredOn: '2026-08-01' },
      { description: 'Lidl', amount: 40, type: 'expense', categoryId: groceriesId, occurredOn: '2026-08-15' },
      { description: 'Aldi', amount: 25.5, type: 'expense', categoryId: groceriesId, occurredOn: '2026-07-15' }
    ];
    for (const t of seed) await request(app).post('/api/transactions').send(t);

    const aug = await request(app).get('/api/transactions?month=2026-08');
    assert.equal(aug.body.length, 3);

    const augExpenses = await request(app).get('/api/transactions?month=2026-08&type=expense');
    assert.equal(augExpenses.body.length, 2);

    const search = await request(app).get('/api/transactions?q=aldi');
    assert.equal(search.body.length, 1);

    const bad = await request(app).get('/api/transactions?month=2026-13');
    assert.equal(bad.status, 400);
  });

  test('monthly summary totals', async () => {
    const res = await request(app).get('/api/summary?month=2026-08');
    assert.equal(res.status, 200);
    assert.equal(res.body.income, 3200);
    assert.equal(res.body.expense, 1540);
    assert.equal(res.body.net, 1660);
    assert.equal(res.body.count, 3);
    const groceries = res.body.byCategory.find((c) => c.name === 'Groceries');
    assert.equal(groceries.total, 40);
    assert.ok(res.body.byCategory.find((c) => c.name === 'Uncategorised'));
  });
});
