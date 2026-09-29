const currency = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' });

export function formatMoney(value) {
  return currency.format(Number(value) || 0);
}

export function formatDate(isoDate) {
  if (!isoDate) return '';
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-IE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC'
  });
}

export function monthLabel(month) {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-IE', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC'
  });
}

export function shiftMonth(month, delta) {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}
