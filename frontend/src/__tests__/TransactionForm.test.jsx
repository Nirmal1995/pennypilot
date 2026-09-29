import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TransactionForm, { validate } from '../components/TransactionForm.jsx';

const categories = [
  { id: 1, name: 'Groceries', type: 'expense', color: '#22c55e' },
  { id: 7, name: 'Salary', type: 'income', color: '#10b981' }
];

describe('validate', () => {
  it('flags missing fields', () => {
    const errors = validate({ description: ' ', amount: '0', occurredOn: '' });
    expect(Object.keys(errors).sort()).toEqual(['amount', 'description', 'occurredOn']);
  });

  it('passes a valid transaction', () => {
    expect(validate({ description: 'Coffee', amount: '3.5', occurredOn: '2026-09-01' })).toEqual({});
  });
});

describe('TransactionForm', () => {
  it('shows errors and does not submit when invalid', async () => {
    const onSubmit = vi.fn();
    render(<TransactionForm categories={categories} onSubmit={onSubmit} onCancel={() => {}} />);
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByText('Description is required')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('only offers categories matching the selected type', async () => {
    render(<TransactionForm categories={categories} onSubmit={vi.fn()} onCancel={() => {}} />);
    expect(screen.getByRole('option', { name: 'Groceries' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Salary' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Income' }));
    expect(screen.getByRole('option', { name: 'Salary' })).toBeInTheDocument();
  });

  it('submits a cleaned payload', async () => {
    const onSubmit = vi.fn().mockResolvedValue();
    render(<TransactionForm categories={categories} onSubmit={onSubmit} onCancel={() => {}} />);
    await userEvent.type(screen.getByLabelText('Description'), '  Lidl run ');
    await userEvent.type(screen.getByLabelText('Amount (€)'), '42.10');
    await userEvent.selectOptions(screen.getByLabelText('Category'), '1');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ description: 'Lidl run', amount: 42.1, type: 'expense', categoryId: 1, notes: null })
    );
  });

  it('prefills when editing', () => {
    const initial = { id: 3, description: 'Pay', amount: 2500, type: 'income', categoryId: 7, occurredOn: '2026-09-25', notes: null };
    render(<TransactionForm initial={initial} categories={categories} onSubmit={vi.fn()} onCancel={() => {}} />);
    expect(screen.getByText('Edit transaction')).toBeInTheDocument();
    expect(screen.getByLabelText('Description')).toHaveValue('Pay');
  });
});
