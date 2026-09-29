import { useState } from 'react';
import { today } from '../format.js';

const EMPTY = { description: '', amount: '', type: 'expense', categoryId: '', occurredOn: '', notes: '' };

export function validate(values) {
  const errors = {};
  if (!values.description.trim()) errors.description = 'Description is required';
  const amount = Number(values.amount);
  if (!values.amount || !Number.isFinite(amount) || amount <= 0) errors.amount = 'Enter an amount greater than 0';
  if (!values.occurredOn) errors.occurredOn = 'Pick a date';
  return errors;
}

export default function TransactionForm({ initial, categories, onSubmit, onCancel }) {
  const [values, setValues] = useState(() => ({
    ...EMPTY,
    occurredOn: today(),
    ...(initial
      ? {
          description: initial.description,
          amount: String(initial.amount),
          type: initial.type,
          categoryId: initial.categoryId ?? '',
          occurredOn: initial.occurredOn,
          notes: initial.notes ?? ''
        }
      : {})
  }));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const set = (field) => (e) => setValues((v) => ({ ...v, [field]: e.target.value }));
  const visibleCategories = categories.filter((c) => c.type === values.type);

  async function handleSubmit(e) {
    e.preventDefault();
    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length) return;

    setSaving(true);
    setSubmitError('');
    try {
      await onSubmit({
        description: values.description.trim(),
        amount: Number(values.amount),
        type: values.type,
        categoryId: values.categoryId ? Number(values.categoryId) : null,
        occurredOn: values.occurredOn,
        notes: values.notes.trim() || null
      });
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="card form" onSubmit={handleSubmit} noValidate>
      <h2>{initial ? 'Edit transaction' : 'New transaction'}</h2>

      <div className="segmented" role="group" aria-label="Type">
        {['expense', 'income'].map((type) => (
          <button
            type="button"
            key={type}
            className={values.type === type ? 'active' : ''}
            onClick={() => setValues((v) => ({ ...v, type, categoryId: '' }))}
          >
            {type === 'expense' ? 'Expense' : 'Income'}
          </button>
        ))}
      </div>

      <label>
        Description
        <input value={values.description} onChange={set('description')} maxLength={200} />
        {errors.description && <span className="field-error">{errors.description}</span>}
      </label>

      <div className="row">
        <label>
          Amount (€)
          <input type="number" step="0.01" min="0" inputMode="decimal" value={values.amount} onChange={set('amount')} />
          {errors.amount && <span className="field-error">{errors.amount}</span>}
        </label>
        <label>
          Date
          <input type="date" value={values.occurredOn} onChange={set('occurredOn')} />
          {errors.occurredOn && <span className="field-error">{errors.occurredOn}</span>}
        </label>
      </div>

      <label>
        Category
        <select value={values.categoryId} onChange={set('categoryId')}>
          <option value="">Uncategorised</option>
          {visibleCategories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      <label>
        Notes
        <textarea rows={2} value={values.notes} onChange={set('notes')} maxLength={1000} />
      </label>

      {submitError && <p className="field-error">{submitError}</p>}

      <div className="actions">
        <button type="button" className="ghost" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  );
}
