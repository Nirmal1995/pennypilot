import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { formatDate, formatMoney } from '../format.js';

export default function Dashboard({ month }) {
  const [summary, setSummary] = useState(null);
  const [recent, setRecent] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setError('');
    Promise.all([api.summary(month), api.listTransactions({ month, limit: 5 })])
      .then(([s, r]) => {
        if (cancelled) return;
        setSummary(s);
        setRecent(r);
      })
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [month]);

  if (error) return <p className="alert" role="alert">{error}</p>;
  if (!summary) return <p className="muted">Loading…</p>;

  const maxCategory = Math.max(...summary.byCategory.map((c) => c.total), 1);

  return (
    <div className="stack">
      <section className="stats">
        <Stat label="Income" value={summary.income} tone="good" />
        <Stat label="Spent" value={summary.expense} tone="bad" />
        <Stat label="Net" value={summary.net} tone={summary.net >= 0 ? 'good' : 'bad'} />
        <div className="stat">
          <span className="stat-label">Transactions</span>
          <span className="stat-value">{summary.count}</span>
        </div>
      </section>

      <div className="grid-2">
        <section className="card">
          <h2>Spending by category</h2>
          {summary.byCategory.length === 0 ? (
            <p className="muted">No expenses recorded this month.</p>
          ) : (
            <ul className="bars">
              {summary.byCategory.map((c) => (
                <li key={c.categoryId ?? 'none'}>
                  <div className="bar-head">
                    <span>
                      <span className="swatch" style={{ background: c.color }} />
                      {c.name}
                    </span>
                    <span>{formatMoney(c.total)}</span>
                  </div>
                  <div className="bar-track">
                    <div
                      className="bar-fill"
                      style={{ width: `${(c.total / maxCategory) * 100}%`, background: c.color }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <h2>Recent activity</h2>
          {recent.length === 0 ? (
            <p className="muted">Nothing yet. Add a transaction to get started.</p>
          ) : (
            <ul className="recent">
              {recent.map((t) => (
                <li key={t.id}>
                  <div>
                    <strong>{t.description}</strong>
                    <span className="muted small">
                      {formatDate(t.occurredOn)} · {t.categoryName || 'Uncategorised'}
                    </span>
                  </div>
                  <span className={t.type === 'income' ? 'amount good' : 'amount bad'}>
                    {t.type === 'income' ? '+' : '-'}
                    {formatMoney(t.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }) {
  return (
    <div className="stat">
      <span className="stat-label">{label}</span>
      <span className={`stat-value ${tone}`}>{formatMoney(value)}</span>
    </div>
  );
}
