import { useCallback, useEffect, useState } from 'react';
import { api } from './api.js';
import { monthLabel, shiftMonth } from './format.js';
import Dashboard from './pages/Dashboard.jsx';
import Transactions from './pages/Transactions.jsx';
import Categories from './pages/Categories.jsx';

const TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'transactions', label: 'Transactions' },
  { id: 'categories', label: 'Categories' }
];

const WEB_VERSION = import.meta.env.VITE_APP_VERSION || 'dev';

export default function App() {
  const [tab, setTab] = useState('dashboard');
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [categories, setCategories] = useState([]);
  const [apiInfo, setApiInfo] = useState(null);
  const [error, setError] = useState('');

  const loadCategories = useCallback(async () => {
    try {
      setCategories(await api.listCategories());
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    loadCategories();
    api.version().then(setApiInfo).catch(() => setApiInfo(null));
  }, [loadCategories]);

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <img src="/favicon.svg" alt="" width="28" height="28" />
          <span>PennyPilot</span>
        </div>
        <nav className="tabs" aria-label="Main">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={tab === t.id ? 'tab active' : 'tab'}
              aria-current={tab === t.id ? 'page' : undefined}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>
        {tab !== 'categories' && (
          <div className="month-picker">
            <button aria-label="Previous month" onClick={() => setMonth((m) => shiftMonth(m, -1))}>
              ‹
            </button>
            <span>{monthLabel(month)}</span>
            <button aria-label="Next month" onClick={() => setMonth((m) => shiftMonth(m, 1))}>
              ›
            </button>
          </div>
        )}
      </header>

      {error && (
        <div className="alert" role="alert">
          {error} <button onClick={() => setError('')}>Dismiss</button>
        </div>
      )}

      <main className="content">
        {tab === 'dashboard' && <Dashboard month={month} />}
        {tab === 'transactions' && <Transactions month={month} categories={categories} />}
        {tab === 'categories' && <Categories categories={categories} onChange={loadCategories} />}
      </main>

      <footer className="footer">
        web v{WEB_VERSION}
        {apiInfo ? ` · api v${apiInfo.version} (${apiInfo.gitSha}) · ${apiInfo.environment}` : ' · api unreachable'}
      </footer>
    </div>
  );
}
