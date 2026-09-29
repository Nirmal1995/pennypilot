'use strict';

const express = require('express');
const { parseMonth, currentMonth } = require('../validation');

module.exports = function summaryRouter(pool) {
  const router = express.Router();

  router.get('/', async (req, res) => {
    const month = parseMonth(req.query.month) || currentMonth();
    const start = `${month}-01`;
    const range = `occurred_on >= $1::date AND occurred_on < ($1::date + INTERVAL '1 month')`;

    const totals = await pool.query(
      `SELECT
         COALESCE(SUM(amount) FILTER (WHERE type = 'income'), 0)  AS income,
         COALESCE(SUM(amount) FILTER (WHERE type = 'expense'), 0) AS expense,
         COUNT(*)::int AS count
       FROM transactions WHERE ${range}`,
      [start]
    );

    const byCategory = await pool.query(
      `SELECT t.category_id AS "categoryId",
              COALESCE(c.name, 'Uncategorised') AS name,
              COALESCE(c.color, '#94a3b8')      AS color,
              SUM(t.amount) AS total
       FROM transactions t
       LEFT JOIN categories c ON c.id = t.category_id
       WHERE t.type = 'expense' AND ${range}
       GROUP BY t.category_id, c.name, c.color
       ORDER BY total DESC`,
      [start]
    );

    const { income, expense, count } = totals.rows[0];
    res.json({
      month,
      income,
      expense,
      net: Math.round((income - expense) * 100) / 100,
      count,
      byCategory: byCategory.rows
    });
  });

  return router;
};
