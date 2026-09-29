'use strict';

const express = require('express');
const { validateTransaction, parseId, parseMonth, ValidationError } = require('../validation');

const SELECT = `
  SELECT t.id, t.description, t.amount, t.type,
         t.category_id AS "categoryId",
         c.name        AS "categoryName",
         c.color       AS "categoryColor",
         t.occurred_on AS "occurredOn",
         t.notes,
         t.created_at  AS "createdAt",
         t.updated_at  AS "updatedAt"
  FROM transactions t
  LEFT JOIN categories c ON c.id = t.category_id`;

async function fetchOne(pool, id) {
  const { rows } = await pool.query(`${SELECT} WHERE t.id = $1`, [id]);
  return rows[0];
}

module.exports = function transactionsRouter(pool) {
  const router = express.Router();

  router.get('/', async (req, res) => {
    const where = [];
    const params = [];
    const month = parseMonth(req.query.month);

    if (month) {
      params.push(`${month}-01`);
      where.push(`t.occurred_on >= $${params.length}::date AND t.occurred_on < ($${params.length}::date + INTERVAL '1 month')`);
    }
    if (req.query.type) {
      if (!['expense', 'income'].includes(req.query.type)) throw new ValidationError(['type must be expense or income']);
      params.push(req.query.type);
      where.push(`t.type = $${params.length}`);
    }
    if (req.query.categoryId) {
      params.push(parseId(req.query.categoryId));
      where.push(`t.category_id = $${params.length}`);
    }
    if (req.query.q) {
      params.push(`%${String(req.query.q).slice(0, 100)}%`);
      where.push(`t.description ILIKE $${params.length}`);
    }

    const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    params.push(limit, offset);

    const sql = `${SELECT}
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY t.occurred_on DESC, t.id DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const { rows } = await pool.query(sql, params);
    res.json(rows);
  });

  router.get('/:id', async (req, res) => {
    const row = await fetchOne(pool, parseId(req.params.id));
    if (!row) return res.status(404).json({ error: 'Transaction not found' });
    res.json(row);
  });

  router.post('/', async (req, res) => {
    const t = validateTransaction(req.body || {});
    const { rows } = await pool.query(
      `INSERT INTO transactions (description, amount, type, category_id, occurred_on, notes)
       VALUES ($1, $2, $3, $4, COALESCE($5::date, CURRENT_DATE), $6)
       RETURNING id`,
      [t.description, t.amount, t.type, t.categoryId ?? null, t.occurredOn ?? null, t.notes ?? null]
    );
    res.status(201).json(await fetchOne(pool, rows[0].id));
  });

  router.put('/:id', async (req, res) => {
    const id = parseId(req.params.id);
    const body = req.body || {};
    const t = validateTransaction(body, { partial: true });
    const setCategory = Object.prototype.hasOwnProperty.call(body, 'categoryId');
    const { rowCount } = await pool.query(
      `UPDATE transactions SET
         description = COALESCE($2, description),
         amount      = COALESCE($3, amount),
         type        = COALESCE($4, type),
         category_id = CASE WHEN $5::boolean THEN $6::integer ELSE category_id END,
         occurred_on = COALESCE($7::date, occurred_on),
         notes       = CASE WHEN $8::boolean THEN $9 ELSE notes END,
         updated_at  = now()
       WHERE id = $1`,
      [
        id,
        t.description ?? null,
        t.amount ?? null,
        t.type ?? null,
        setCategory,
        t.categoryId ?? null,
        t.occurredOn ?? null,
        Object.prototype.hasOwnProperty.call(body, 'notes'),
        t.notes ?? null
      ]
    );
    if (!rowCount) return res.status(404).json({ error: 'Transaction not found' });
    res.json(await fetchOne(pool, id));
  });

  router.delete('/:id', async (req, res) => {
    const id = parseId(req.params.id);
    const { rowCount } = await pool.query('DELETE FROM transactions WHERE id = $1', [id]);
    if (!rowCount) return res.status(404).json({ error: 'Transaction not found' });
    res.status(204).end();
  });

  return router;
};
