import { notificationBody } from '@/notifications/scheduler';

describe('notificationBody (first clause, ≤ ~100 chars)', () => {
  test('cuts at a legacy em-dash clause boundary', () => {
    expect(
      notificationBody(
        'The warmth of the sun on a cold winter’s day — small, specific, and disproportionately comforting.',
      ),
    ).toBe('The warmth of the sun on a cold winter’s day.');
  });

  test('cuts at a normalized semicolon clause boundary', () => {
    expect(
      notificationBody(
        'The warmth of the sun on a cold winter’s day; small, specific, and disproportionately comforting.',
      ),
    ).toBe('The warmth of the sun on a cold winter’s day.');
  });

  test('cuts at a sentence boundary', () => {
    expect(notificationBody('A short sentence. And then more detail follows here.')).toBe(
      'A short sentence.',
    );
  });

  test('truncates very long clauses with an ellipsis', () => {
    const long = 'x'.repeat(140);
    const body = notificationBody(long);
    expect(body.length).toBeLessThanOrEqual(101);
    expect(body.endsWith('…')).toBe(true);
  });

  test('always ends with terminal punctuation', () => {
    expect(notificationBody('An unpunctuated clause')).toBe('An unpunctuated clause.');
  });
});
