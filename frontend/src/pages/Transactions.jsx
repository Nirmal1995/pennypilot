import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import { formatDate, formatMoney } from '../format.js';
import TransactionForm from '../components/TransactionForm.jsx';

export default function Transactions({ month, categories }) {
  const [rows, setRows] = useState([]);
  const [filters, setFilters] = useState({ type: '', categoryId: '', q: '' });
  const [editing, setEditing] = useState(null); // null = closed, {} = new, row = edit
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await api.listTransactions({ month, ...filters }));
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [month, filters]);

  useEffect(() => {
    load();
  }, [load]);

  async function save(body) {
    if (editing && editing.id) await api.updateTransaction(editing.id, body);
    else await api.createTransaction(body);
    setEditing(null);
    await load();
  }

  async function remove(row) {
    if (!window.confirm(`Delete "${row.description}"?`)) return;
    try {
      await api.deleteTransaction(row.id);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  const setFilter = (field) => (e) => setFilters((f) => ({ ...f, [field]: e.target.value }));

  return (
    <div className="stack">
      <div className="toolbar">
        <input placeholder="Search description" value={filters.q} onChange={setFilter('q')} aria-label="Search" />
        <select value={filters.type} onChange={setFilter('type')} aria-label="Filter by type">
          <option value="">All types</option>
          <option value="expense">Expenses</option>
          <option value="income">Income</option>
        </select>
        <select value={filters.categoryId} onChange={setFilter('categoryId')} aria-label="Filter by category">
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button className="primary" onClick={() => setEditing({})}>
          + Add transaction
        </button>
      </div>

      {editing && (
        <TransactionForm
          key={editing.id || 'new'}
          initial={editing.id ? editing : null}
          categories={categories}
          onSubmit={save}
          onCancel={() => setEditing(null)}
        />
      )}

      {error && <p className="alert" role="alert">{error}</p>}

      <section className="card table-card">
        {loading ? (
          <p className="muted">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="muted">No transactions match for this month.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Category</th>
                <th className="num">Amount</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id}>
                  <td>{formatDate(t.occurredOn)}</td>
                  <td>
                    {t.description}
                    {t.notes && <div className="muted small">{t.notes}</div>}
                  </td>
                  <td>
                    <span className="swatch" style={{ background: t.categoryColor || '#94a3b8' }} />
                    {t.categoryName || 'Uncategorised'}
                  </td>
                  <td className={`num ${t.type === 'income' ? 'good' : 'bad'}`}>
                    {t.type === 'income' ? '+' : '-'}
                    {formatMoney(t.amount)}
                  </td>
                  <td className="row-actions">
                    <button className="ghost" onClick={() => setEditing(t)}>
                      Edit
                    </button>
                    <button className="ghost danger" onClick={() => remove(t)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
