import { describe, expect, it } from 'vitest';
import { DEFAULT_LABELS, resolvePalette } from '@subterra-technologies/blockletter';
import {
  blockBackground,
  blockPalette,
  canvasProps,
  canvasTheme,
  emailImage,
  sectionStyle,
} from '../src/canvas/canvas-theme';
import { TEST_BRAND, testBlock } from './helpers/fixtures';

describe('canvas theme', () => {
  it('paints with the brand kit’s palette and web-safe font stacks, as the renderer does', () => {
    const theme = canvasTheme(TEST_BRAND);
    expect(theme.palette).toEqual(resolvePalette(TEST_BRAND));
    expect(theme.fonts.heading).toMatch(/^Georgia,/);
    expect(theme.fonts.body).toMatch(/^Arial,/);
  });

  it('lays the host’s labels over the English ones', () => {
    const theme = canvasTheme(TEST_BRAND, { labels: { readMore: 'Keep reading' } });
    expect(theme.labels.readMore).toBe('Keep reading');
    expect(theme.labels.unsubscribe).toBe(DEFAULT_LABELS.unsubscribe);
  });

  it('applies a block’s text colour to every text colour, and ignores one that is not hex', () => {
    const palette = resolvePalette(TEST_BRAND);
    const tinted = blockPalette(palette, testBlock('text', { style: { textColor: '#7c2d12' } }));
    expect([tinted.text, tinted.heading, tinted.muted, tinted.bandText, tinted.footerText]).toEqual(
      Array(5).fill('#7c2d12'),
    );
    expect(blockPalette(palette, testBlock('text', { style: { textColor: 'red' } }))).toBe(palette);
  });

  it('scales a block’s type by its font size, rounding as the renderer does', () => {
    const theme = canvasTheme(TEST_BRAND);
    expect(canvasProps(testBlock('text'), theme).px(15)).toBe(15);
    expect(canvasProps(testBlock('text', { style: { fontSize: 'small' } }), theme).px(15)).toBe(13);
    expect(canvasProps(testBlock('text', { style: { fontSize: 'large' } }), theme).px(24)).toBe(28);
  });

  it('shows the images the renderer shows, at the address the host resolves', () => {
    expect(emailImage({ url: 'https://images.example/a.png' })).toBe(
      'https://images.example/a.png',
    );
    // An upload not stored yet: the preview shows it (with a warning), so the canvas does too.
    expect(emailImage({ url: 'data:image/png;base64,iVBORw0KGgo=' })).toBe(
      'data:image/png;base64,iVBORw0KGgo=',
    );
    expect(emailImage({ url: 'blob:https://app.example/1b2c' })).toBe(
      'blob:https://app.example/1b2c',
    );
    expect(emailImage({ url: 'data:image/svg+xml;base64,PHN2Zz4=' })).toBeUndefined();
    expect(emailImage({ url: 'data:text/html;base64,PGI+' })).toBeUndefined();
    expect(emailImage({ url: '/uploads/a.png' })).toBeUndefined();
    expect(emailImage({ url: 'javascript:alert(1)' })).toBeUndefined();
    expect(emailImage(undefined)).toBeUndefined();
    expect(
      emailImage(
        { url: '/uploads/a.png', assetId: 'a' },
        { resolveImageUrl: () => 'https://cdn.example/a.png' },
      ),
    ).toBe('https://cdn.example/a.png');
  });

  it('turns a block style into its section padding, background and alignment', () => {
    const palette = resolvePalette(TEST_BRAND);
    const block = testBlock('text', {
      style: { paddingY: 'tight', fullWidth: true, align: 'right', divider: true },
    });
    expect(sectionStyle(palette, block, '#ffffff')).toEqual({
      padding: '12px 0 12px 0',
      backgroundColor: '#ffffff',
      textAlign: 'right',
      borderBottom: `1px solid ${palette.border}`,
    });
    expect(sectionStyle(palette, testBlock('text'), '#ffffff', '20px 32px')).toEqual({
      padding: '20px 32px 20px 32px',
      backgroundColor: '#ffffff',
    });
  });

  it('keeps a block’s own background, when it is a colour', () => {
    expect(blockBackground(testBlock('text', { style: { background: '#123456' } }), '#fff')).toBe(
      '#123456',
    );
    expect(blockBackground(testBlock('text', { style: { background: 'blue' } }), '#ffffff')).toBe(
      '#ffffff',
    );
  });
});
