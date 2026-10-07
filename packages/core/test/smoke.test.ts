import { describe, expect, it } from 'vitest';
import { BRAND_FONTS } from '../src';

describe('core package', () => {
  it('exposes the web-safe brand fonts', () => {
    expect(BRAND_FONTS).toContain('Georgia');
  });
});
