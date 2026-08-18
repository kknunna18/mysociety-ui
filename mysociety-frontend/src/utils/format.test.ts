import { describe, expect, it } from 'vitest';
import { formatCurrency, formatDate, titleCase } from '@/utils/format';

describe('format helpers', () => {
  it('formats amounts as Indian rupees without decimals', () => {
    expect(formatCurrency(4200)).toMatch(/4,200/);
    expect(formatCurrency(4200)).toContain('₹');
  });

  it('renders an em dash for invalid dates', () => {
    expect(formatDate('not-a-date')).toBe('—');
    expect(formatDate('2024-05-10')).toMatch(/2024/);
  });

  it('turns SCREAMING_SNAKE enums into readable labels', () => {
    expect(titleCase('IN_PROGRESS')).toBe('In Progress');
    expect(titleCase('UPI')).toBe('Upi');
  });
});
