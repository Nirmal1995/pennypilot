import { useState } from 'react';
import { api } from '../api.js';

const BLANK = { name: '', type: 'expense', color: '#6366f1' };

export default function Categories({ categories, onChange }) {
  const [form, setForm] = useState(BLANK);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    if (!form.name.trim()) return setError('Name is required');
    try {
      if (editingId) await api.updateCategory(editingId, form);
      else await api.createCategory(form);
      setForm(BLANK);
      setEditingId(null);
      setError('');
      await onChange();
    } catch (err) {
      setError(err.message);
    }
  }

  async function remove(c) {
    if (!window.confirm(`Delete category "${c.name}"? Transactions keep their data but become uncategorised.`)) return;
    try {
      await api.deleteCategory(c.id);
      await onChange();
    } catch (err) {
      setError(err.message);
    }
  }

  function startEdit(c) {
    setEditingId(c.id);
    setForm({ name: c.name, type: c.type, color: c.color });
  }

  return (
    <div className="grid-2">
      <form className="card form" onSubmit={submit}>
        <h2>{editingId ? 'Edit category' : 'New category'}</h2>
        <label>
          Name
          <input value={form.name} onChange={set('name')} maxLength={50} />
        </label>
        <div className="row">
          <label>
            Type
            <select value={form.type} onChange={set('type')}>
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
          </label>
          <label>
            Colour
            <input type="color" value={form.color} onChange={set('color')} />
          </label>
        </div>
        {error && <p className="field-error">{error}</p>}
        <div className="actions">
          {editingId && (
            <button
              type="button"
              className="ghost"
              onClick={() => {
                setEditingId(null);
                setForm(BLANK);
              }}
            >
              Cancel
            </button>
          )}
          <button type="submit" className="primary">
            {editingId ? 'Update' : 'Add category'}
          </button>
        </div>
      </form>

      <section className="card">
        <h2>Your categories</h2>
        <ul className="category-list">
          {categories.map((c) => (
            <li key={c.id}>
              <span>
                <span className="swatch" style={{ background: c.color }} />
                {c.name} <span className="pill">{c.type}</span>
              </span>
              <span className="row-actions">
                <button className="ghost" onClick={() => startEdit(c)}>
                  Edit
                </button>
                <button className="ghost danger" onClick={() => remove(c)}>
                  Delete
                </button>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
