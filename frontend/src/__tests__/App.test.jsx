import { render, screen } from '@testing-library/react';
import App from '../App.jsx';

const responses = {
  '/api/categories': [{ id: 1, name: 'Groceries', type: 'expense', color: '#22c55e' }],
  '/api/version': { version: '1.0.0', gitSha: 'abc1234', environment: 'test' },
  '/api/summary': {
    month: '2026-09',
    income: 3000,
    expense: 120,
    net: 2880,
    count: 2,
    byCategory: [{ categoryId: 1, name: 'Groceries', color: '#22c55e', total: 120 }]
  },
  '/api/transactions': [
    { id: 1, description: 'Weekly shop', amount: 120, type: 'expense', categoryName: 'Groceries', occurredOn: '2026-09-10' }
  ]
};

beforeEach(() => {
  global.fetch = vi.fn((url) => {
    const path = url.split('?')[0];
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(responses[path]) });
  });
});

describe('App', () => {
  it('renders the dashboard with summary data and version info', async () => {
    render(<App />);
    expect(await screen.findByText('Weekly shop')).toBeInTheDocument();
    expect(screen.getByText('€2,880.00')).toBeInTheDocument();
    expect(await screen.findByText(/abc1234/)).toBeInTheDocument();
  });
});
