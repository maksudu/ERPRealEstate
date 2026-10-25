import { performanceFiscalYear } from './performance-pages.component';

describe('performanceFiscalYear', () => {
  it('uses the July–June cycle at the Dhaka midnight boundary', () => {
    expect(performanceFiscalYear(new Date('2026-06-30T17:59:00Z'))).toBe('2025-26');
    expect(performanceFiscalYear(new Date('2026-06-30T18:00:00Z'))).toBe('2026-27');
  });

  it('rolls to the next July–June cycle from July in Dhaka', () => {
    expect(performanceFiscalYear(new Date('2027-06-30T18:00:00Z'))).toBe('2027-28');
  });
});
