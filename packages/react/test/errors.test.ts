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

  it('still recognises a stack trace by its indented frames', () => {
    const trace = 'Something broke.\n    at render (editor.js:10:5)\n\tat run (main.js:2:1)';
    expect(errorMessage(new Error(trace), 'Fallback.')).toBe('Fallback.');
    expect(errorMessage(new Error('at handler (x.js:1:1)'), 'Fallback.')).toBe('Fallback.');
  });

  it('reads a message of thousands of blank lines in linear time', () => {
    // With `\s` in the frame pattern, each newline restarted a scan of the whole run.
    const message = `Odd.${'\n'.repeat(60_000)}x`;
    const start = performance.now();
    expect(errorMessage(new Error(message), 'Fallback.')).toBe(message.trim());
    expect(performance.now() - start).toBeLessThan(1500);
  });
});
