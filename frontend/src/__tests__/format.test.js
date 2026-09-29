import { formatDate, formatMoney, monthLabel, shiftMonth } from '../format.js';

describe('format helpers', () => {
  it('formats euro amounts', () => {
    expect(formatMoney(1234.5)).toBe('€1,234.50');
    expect(formatMoney('abc')).toBe('€0.00');
  });

  it('formats ISO dates without timezone drift', () => {
    expect(formatDate('2026-09-01')).toBe('1 Sept 2026');
  });

  it('shifts months across year boundaries', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
  });

  it('labels months', () => {
    expect(monthLabel('2026-09')).toBe('September 2026');
  });
});
