import { describe, expect, it } from 'vitest';
import { cn } from '../src';

describe('cn', () => {
  it('lets the later of two conflicting prefixed utilities win', () => {
    expect(cn('bl:p-2 bl:p-4')).toBe('bl:p-4');
    expect(cn('bl:px-3', 'bl:px-6')).toBe('bl:px-6');
  });

  it('resolves conflicts within a variant and leaves other variants alone', () => {
    expect(cn('bl:hover:bg-accent', 'bl:hover:bg-muted')).toBe('bl:hover:bg-muted');
    expect(cn('bl:bg-background bl:dark:bg-input/30', 'bl:bg-card')).toBe(
      'bl:dark:bg-input/30 bl:bg-card',
    );
  });

  it('knows the theme colours from the size scale', () => {
    expect(cn('bl:text-sm bl:text-muted-foreground', 'bl:text-danger')).toBe(
      'bl:text-sm bl:text-danger',
    );
    expect(cn('bl:bg-success-soft', 'bl:bg-danger-soft')).toBe('bl:bg-danger-soft');
  });

  it('joins conditional classes the way clsx does', () => {
    const selected = false;
    expect(cn('bl:flex', selected && 'bl:ring-2', { 'bl:opacity-50': true }, ['bl-root'])).toBe(
      'bl:flex bl:opacity-50 bl-root',
    );
  });

  it('keeps unprefixed classes, which are not Blockletter utilities', () => {
    expect(cn('p-2 p-4')).toBe('p-2 p-4');
  });
});
