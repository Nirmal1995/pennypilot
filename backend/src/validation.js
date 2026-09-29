'use strict';

class ValidationError extends Error {
  constructor(details) {
    super('Validation failed');
    this.status = 400;
    this.details = details;
  }
}

const TYPES = ['expense', 'income'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const COLOR_RE = /^#[0-9a-fA-F]{6}$/;

function isValidDate(s) {
  if (!DATE_RE.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

function validateCategory(body, { partial = false } = {}) {
  const errors = [];
  const out = {};

  if (body.name !== undefined || !partial) {
    if (typeof body.name !== 'string' || !body.name.trim()) errors.push('name is required');
    else if (body.name.trim().length > 50) errors.push('name must be 50 characters or fewer');
    else out.name = body.name.trim();
  }
  if (body.type !== undefined) {
    if (!TYPES.includes(body.type)) errors.push('type must be expense or income');
    else out.type = body.type;
  }
  if (body.color !== undefined) {
    if (typeof body.color !== 'string' || !COLOR_RE.test(body.color)) errors.push('color must be a hex value like #22c55e');
    else out.color = body.color.toLowerCase();
  }

  if (errors.length) throw new ValidationError(errors);
  return out;
}

function validateTransaction(body, { partial = false } = {}) {
  const errors = [];
  const out = {};

  if (body.description !== undefined || !partial) {
    if (typeof body.description !== 'string' || !body.description.trim()) errors.push('description is required');
    else if (body.description.trim().length > 200) errors.push('description must be 200 characters or fewer');
    else out.description = body.description.trim();
  }
  if (body.amount !== undefined || !partial) {
    const amount = Number(body.amount);
    if (body.amount === null || body.amount === '' || !Number.isFinite(amount) || amount <= 0) {
      errors.push('amount must be a positive number');
    } else if (amount > 9999999999.99) {
      errors.push('amount is too large');
    } else {
      out.amount = Math.round(amount * 100) / 100;
    }
  }
  if (body.type !== undefined || !partial) {
    if (!TYPES.includes(body.type)) errors.push('type must be expense or income');
    else out.type = body.type;
  }
  if (body.categoryId !== undefined) {
    if (body.categoryId === null || body.categoryId === '') out.categoryId = null;
    else if (!Number.isInteger(Number(body.categoryId)) || Number(body.categoryId) <= 0) errors.push('categoryId must be a positive integer');
    else out.categoryId = Number(body.categoryId);
  }
  if (body.occurredOn !== undefined) {
    if (typeof body.occurredOn !== 'string' || !isValidDate(body.occurredOn)) errors.push('occurredOn must be a date in YYYY-MM-DD format');
    else out.occurredOn = body.occurredOn;
  }
  if (body.notes !== undefined) {
    if (body.notes !== null && typeof body.notes !== 'string') errors.push('notes must be text');
    else if (body.notes && body.notes.length > 1000) errors.push('notes must be 1000 characters or fewer');
    else out.notes = body.notes ? body.notes.trim() : null;
  }

  if (errors.length) throw new ValidationError(errors);
  return out;
}

function parseId(raw) {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) throw new ValidationError(['id must be a positive integer']);
  return id;
}

function parseMonth(raw) {
  if (raw === undefined) return undefined;
  if (typeof raw !== 'string' || !MONTH_RE.test(raw)) throw new ValidationError(['month must be in YYYY-MM format']);
  return raw;
}

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

module.exports = {
  ValidationError,
  validateCategory,
  validateTransaction,
  parseId,
  parseMonth,
  currentMonth
};
