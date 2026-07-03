import { nextStreak } from '@/store/streak';

describe('streak rule (DESIGN.md §7 — three explicit cases)', () => {
  test('first open ever starts at 1', () => {
    expect(nextStreak({ lastOpenDate: null, streak: 0 }, '2026-07-03')).toEqual({
      lastOpenDate: '2026-07-03',
      streak: 1,
    });
  });

  test('same-day repeat opens are a no-op', () => {
    const s = { lastOpenDate: '2026-07-03', streak: 4 };
    expect(nextStreak(s, '2026-07-03')).toEqual(s);
  });

  test('next calendar day increments', () => {
    expect(nextStreak({ lastOpenDate: '2026-07-03', streak: 4 }, '2026-07-04')).toEqual({
      lastOpenDate: '2026-07-04',
      streak: 5,
    });
  });

  test('a missed day resets to 1', () => {
    expect(nextStreak({ lastOpenDate: '2026-07-03', streak: 9 }, '2026-07-05')).toEqual({
      lastOpenDate: '2026-07-05',
      streak: 1,
    });
  });

  test('clock set back / date-line travel cannot farm streaks (negative diff = no-op)', () => {
    const s = { lastOpenDate: '2026-07-03', streak: 4 };
    expect(nextStreak(s, '2026-07-02')).toEqual(s); // keeps the LATER date
    // ...so the "next real day" does not double-count:
    expect(nextStreak(nextStreak(s, '2026-07-02'), '2026-07-04').streak).toBe(5);
  });

  test('increments across month and year boundaries', () => {
    expect(nextStreak({ lastOpenDate: '2026-07-31', streak: 2 }, '2026-08-01').streak).toBe(3);
    expect(nextStreak({ lastOpenDate: '2026-12-31', streak: 2 }, '2027-01-01').streak).toBe(3);
  });
});
