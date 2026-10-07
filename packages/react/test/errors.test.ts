import { describe, expect, it } from 'vitest';
import { errorMessage } from '../src/lib/errors';

describe('errorMessage', () => {
  it('shows a refusal written for a person as written', () => {
    expect(errorMessage(new Error('That name is taken.'), 'Fallback.')).toBe('That name is taken.');
    expect(errorMessage('Choose a smaller image.', 'Fallback.')).toBe('Choose a smaller image.');
    expect(errorMessage({ data: { message: 'Enter a valid email address.' } }, 'Fallback.')).toBe(
      'Enter a valid email address.',
    );
  });

  it('falls back for what nobody can act on', () => {
    expect(errorMessage(new TypeError('Failed to fetch'), 'Fallback.')).toBe('Fallback.');
    expect(errorMessage(new Error(''), 'Fallback.')).toBe('Fallback.');
    expect(errorMessage(undefined, 'Fallback.')).toBe('Fallback.');
    expect(
      errorMessage(
        new Error('[CONVEX M(brand:update)] [Request ID: 1a2b] Server Error'),
        'Fallback.',
      ),
    ).toBe('Fallback.');
  });
});
