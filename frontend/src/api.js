const BASE = import.meta.env.VITE_API_BASE_URL || '';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = data.details ? data.details.join(', ') : data.error || `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data;
}

function qs(params) {
  const clean = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '');
  return clean.length ? `?${new URLSearchParams(clean).toString()}` : '';
}

export const api = {
  version: () => request('/api/version'),
  summary: (month) => request(`/api/summary${qs({ month })}`),

  listTransactions: (filters = {}) => request(`/api/transactions${qs(filters)}`),
  createTransaction: (body) => request('/api/transactions', { method: 'POST', body }),
  updateTransaction: (id, body) => request(`/api/transactions/${id}`, { method: 'PUT', body }),
  deleteTransaction: (id) => request(`/api/transactions/${id}`, { method: 'DELETE' }),

  listCategories: () => request('/api/categories'),
  createCategory: (body) => request('/api/categories', { method: 'POST', body }),
  updateCategory: (id, body) => request(`/api/categories/${id}`, { method: 'PUT', body }),
  deleteCategory: (id) => request(`/api/categories/${id}`, { method: 'DELETE' })
};
