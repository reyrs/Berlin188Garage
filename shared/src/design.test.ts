import { describe, it, expect } from 'vitest';
import { formatRupiah } from './design';

describe('formatRupiah', () => {
  it('formats with the Rp prefix and Indonesian thousands separators', () => {
    expect(formatRupiah(500000)).toBe('Rp 500.000');
  });

  it('formats zero correctly', () => {
    expect(formatRupiah(0)).toBe('Rp 0');
  });

  it('formats large numbers with multiple separator groups', () => {
    expect(formatRupiah(17550000)).toBe('Rp 17.550.000');
  });

  it('formats negative numbers (e.g. a discrepancy) with the minus sign preserved', () => {
    expect(formatRupiah(-25000)).toBe('Rp -25.000');
  });
});
