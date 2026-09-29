INSERT INTO categories (name, type, color) VALUES
  ('Groceries',     'expense', '#22c55e'),
  ('Rent',          'expense', '#ef4444'),
  ('Transport',     'expense', '#f59e0b'),
  ('Eating Out',    'expense', '#ec4899'),
  ('Utilities',     'expense', '#06b6d4'),
  ('Entertainment', 'expense', '#8b5cf6'),
  ('Salary',        'income',  '#10b981'),
  ('Freelance',     'income',  '#3b82f6')
ON CONFLICT (name) DO NOTHING;
