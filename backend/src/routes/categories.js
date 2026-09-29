'use strict';

const express = require('express');
const { validateCategory, parseId } = require('../validation');

const COLUMNS = 'id, name, type, color, created_at AS "createdAt"';

module.exports = function categoriesRouter(pool) {
  const router = express.Router();

  router.get('/', async (req, res) => {
    const { rows } = await pool.query(`SELECT ${COLUMNS} FROM categories ORDER BY type, name`);
    res.json(rows);
  });

  router.post('/', async (req, res) => {
    const c = validateCategory(req.body || {});
    const { rows } = await pool.query(
      `INSERT INTO categories (name, type, color)
       VALUES ($1, COALESCE($2, 'expense'), COALESCE($3, '#6366f1'))
       RETURNING ${COLUMNS}`,
      [c.name, c.type ?? null, c.color ?? null]
    );
    res.status(201).json(rows[0]);
  });

  router.put('/:id', async (req, res) => {
    const id = parseId(req.params.id);
    const c = validateCategory(req.body || {}, { partial: true });
    const { rows } = await pool.query(
      `UPDATE categories SET
         name  = COALESCE($2, name),
         type  = COALESCE($3, type),
         color = COALESCE($4, color)
       WHERE id = $1
       RETURNING ${COLUMNS}`,
      [id, c.name ?? null, c.type ?? null, c.color ?? null]
    );
    if (!rows.length) return res.status(404).json({ error: 'Category not found' });
    res.json(rows[0]);
  });

  router.delete('/:id', async (req, res) => {
    const id = parseId(req.params.id);
    const { rowCount } = await pool.query('DELETE FROM categories WHERE id = $1', [id]);
    if (!rowCount) return res.status(404).json({ error: 'Category not found' });
    res.status(204).end();
  });

  return router;
};
