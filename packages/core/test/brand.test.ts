import { describe, expect, it } from 'vitest';
import {
  DEFAULT_BRAND,
  DEFAULT_PALETTE,
  FONT_STACKS,
  contrastRatio,
  createDocument,
  fontStack,
  labelOn,
  readable,
  relativeLuminance,
  renderEmail,
  resolvePalette,
  type BrandKit,
} from '../src';
import { block } from './helpers';

const withColors = (colors: Partial<BrandKit['colors']>): BrandKit => ({
  ...DEFAULT_BRAND,
  colors: { ...DEFAULT_BRAND.colors, ...colors },
});

/** Hue in degrees, for checking that a shade kept its colour. */
function hue(hex: string): number {
  const value = Number.parseInt(hex.slice(1), 16);
  const [r, g, b] = [(value >> 16) & 255, (value >> 8) & 255, value & 255].map((c) => c / 255) as [
    number,
    number,
    number,
  ];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === min) return 0;
  const delta = max - min;
  const raw =
    max === r ? ((g - b) / delta) % 6 : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4;
  return (raw * 60 + 360) % 360;
}

describe('contrast helpers', () => {
  it('measures WCAG contrast, and treats an unparseable colour as no contrast', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 0);
    expect(contrastRatio('#ffffff', '#ffffff')).toBeCloseTo(1, 5);
    expect(contrastRatio('not a colour', '#ffffff')).toBeCloseTo(1, 5);
    expect(contrastRatio('#000000', 'nope')).toBeCloseTo(1, 5);
  });

  it('measures relative luminance from black to white', () => {
    expect(relativeLuminance('#000000')).toBe(0);
    expect(relativeLuminance('#ffffff')).toBeCloseTo(1, 5);
    expect(relativeLuminance('#808080')).toBeCloseTo(0.2158, 3);
  });

  it('darkens decorative text only until it reads, and leaves readable colours alone', () => {
    expect(readable('#1f2937', '#ffffff')).toBe('#1f2937');
    const coral = readable('#fb923c', '#ffffff');
    expect(coral).not.toBe('#fb923c');
    expect(contrastRatio(coral, '#ffffff')).toBeGreaterThanOrEqual(4.5);
    // Large text needs only 3:1, and a dark background lightens rather than darkens.
    expect(contrastRatio(readable('#334155', '#1f2937', true), '#1f2937')).toBeGreaterThanOrEqual(
      3,
    );
  });

  it('puts a label on a filled colour in dark or white, whichever reads', () => {
    expect(labelOn('#1f2937')).toBe('#ffffff');
    expect(labelOn('#f59e0b')).toBe('#111111');
    expect(labelOn('#f59e0b', '#1f2937')).toBe('#1f2937');
  });
});

describe('the palette a brand kit paints', () => {
  it('is neutral by default', () => {
    expect(resolvePalette()).toEqual({
      page: '#f5f5f4',
      card: '#ffffff',
      border: '#d6d3d1',
      text: '#1f2937',
      muted: '#57534e',
      heading: '#1f2937',
      accent: '#0f766e',
      accentInk: '#0f766e',
      accentText: '#ffffff',
      band: '#1f2937',
      bandText: '#f5f5f4',
      bandMuted: '#cbd5e1',
      tileDay: '#f59e0b',
      soft: '#f5f5f4',
      footer: '#1f2937',
      footerText: '#e7e5e4',
      link: '#1f2937',
    });
    expect(DEFAULT_PALETTE).toEqual(resolvePalette(DEFAULT_BRAND));
    expect(Object.isFrozen(DEFAULT_PALETTE)).toBe(true);
  });

  it('paints the brand kit over the defaults', () => {
    const palette = resolvePalette(withColors({ ink: '#112233' }));
    expect(palette.heading).toBe('#112233');
    expect(palette.text).toBe('#112233');
    expect(palette.band).toBe('#112233');
    expect(palette.footer).toBe('#112233');
  });

  it('falls back to the default for a colour that is not six-digit hex', () => {
    const palette = resolvePalette(withColors({ ink: 'navy', accent: '#abc' }));
    expect(palette.text).toBe(DEFAULT_BRAND.colors.ink);
    expect(palette.accent).toBe(DEFAULT_BRAND.colors.accent);
  });

  it('labels a pale accent dark, and a deep one white', () => {
    expect(resolvePalette(withColors({ accent: '#fcd34d' })).accentText).toBe('#1f2937');
    expect(resolvePalette(withColors({ accent: '#7c2d12' })).accentText).toBe('#ffffff');
  });

  it('keeps text readable on a pale ink: near-black body text and labels on its bands', () => {
    const palette = resolvePalette(withColors({ ink: '#e5e7eb' }));
    expect(palette.text).toBe('#111111');
    expect(palette.bandText).toBe('#111111');
    expect(palette.footerText).toBe('#111111');
    expect(contrastRatio(palette.bandMuted, palette.band)).toBeGreaterThanOrEqual(4.5);
  });

  it('uses white on the bands when the page colour is dark too', () => {
    expect(resolvePalette(withColors({ page: '#0b1120' })).bandText).toBe('#ffffff');
  });

  it('gives every brand readable text on every fill', () => {
    const brands = [
      withColors({}),
      withColors({ ink: '#e5e7eb', accent: '#fde68a' }),
      withColors({ ink: '#3f3f46', accent: '#2563eb', page: '#fafaf9' }),
      withColors({ ink: '#7c3aed', accent: '#00b5ee', highlight: '#a78bfa' }),
      withColors({ ink: '#767676', accent: '#22c55e', page: '#e7e5e4' }),
      // A mid-grey ink: only darker text reads on it, day numbers included.
      withColors({ ink: '#a0a0a0' }),
    ];
    for (const brand of brands) {
      const p = resolvePalette(brand);
      const label = JSON.stringify(brand.colors);
      expect(contrastRatio(p.text, p.card), label).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(p.bandText, p.band), label).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(p.footerText, p.footer), label).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(p.accentText, p.accent), label).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(p.accentInk, p.card), label).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(p.accentInk, p.soft), label).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(p.tileDay, p.band), label).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('the accent as text', () => {
  it("is the default brand's accent itself, since it already reads", () => {
    expect(resolvePalette().accentInk).toBe(DEFAULT_BRAND.colors.accent);
  });

  it('is a darker shade of a light accent, the same hue, that meets AA on card and soft', () => {
    const accent = '#00b5ee';
    expect(contrastRatio(accent, '#ffffff')).toBeLessThan(4.5);
    const palette = resolvePalette(withColors({ accent }));
    expect(palette.accent).toBe(accent);
    expect(palette.accentInk).not.toBe(accent);
    expect(contrastRatio(palette.accentInk, palette.card)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(palette.accentInk, palette.soft)).toBeGreaterThanOrEqual(4.5);
    expect(Math.abs(hue(palette.accentInk) - hue(accent))).toBeLessThan(2);
  });

  it('is what the blocks draw text in, while fills keep the accent', () => {
    const accent = '#00b5ee';
    const { accentInk } = resolvePalette(withColors({ accent }));
    const { html } = renderEmail(
      createDocument({
        subject: 'S',
        blocks: [
          block('header', 'h', { title: 'Newsletter', issueLabel: 'May 2026' }),
          block('stats', 's'),
          block('post_list', 'p', {
            items: [{ title: 'Story', excerpt: 'More.', url: 'https://x.example', kicker: 'News' }],
          }),
          block('name_list', 'n', { items: [{ name: 'A shop' }] }),
          block('article', 'a'),
          block('button', 'b', { url: 'https://x.example', variant: 'outline' }),
          block('button', 'c', { url: 'https://x.example', variant: 'solid' }),
          block('quote', 'q'),
        ],
      }),
      { brand: withColors({ accent }) },
    );
    expect(html).not.toContain(`color:${accent}`);
    expect(html).not.toContain(`border:2px solid ${accent}`);
    expect(html).toContain(`border:2px solid ${accentInk}`);
    // Header strapline, numbers, kicker labels, list numbers and the outline button label.
    expect(html.split(`color:${accentInk}`).length - 1).toBeGreaterThanOrEqual(7);
    // The solid button and the quote bar are fills, and stay the brand's own accent.
    expect(html).toContain(`<td style="background:${accent};border-radius:6px;">`);
    expect(html).toContain(`width:4px;background:${accent};`);
  });
});

describe('event-tile day numbers', () => {
  it('keep a highlight that reads on the band', () => {
    expect(resolvePalette().tileDay).toBe(DEFAULT_BRAND.colors.highlight);
  });

  it('correct a highlight too close to the ink to read', () => {
    const palette = resolvePalette(withColors({ ink: '#1f2937', highlight: '#334155' }));
    expect(contrastRatio('#334155', '#1f2937')).toBeLessThan(3);
    expect(palette.tileDay).not.toBe('#334155');
    expect(contrastRatio(palette.tileDay, palette.band)).toBeGreaterThanOrEqual(3);
    const pale = resolvePalette(withColors({ ink: '#e5e7eb', highlight: '#f3f4f6' }));
    expect(contrastRatio(pale.tileDay, pale.band)).toBeGreaterThanOrEqual(3);
  });
});

describe('fonts', () => {
  it('maps every brand font to a web-safe stack', () => {
    expect(fontStack('Georgia')).toBe("Georgia, 'Times New Roman', Times, serif");
    expect(fontStack('Trebuchet MS')).toBe(FONT_STACKS['Trebuchet MS']);
    expect(fontStack('Comic Sans MS')).toBe(FONT_STACKS.Arial);
    expect(fontStack(undefined, 'Georgia')).toBe(FONT_STACKS.Georgia);
  });
});

describe('the default brand', () => {
  it('is neutral, and cannot be edited by accident', () => {
    expect(DEFAULT_BRAND.name).toBe('Your Organization');
    expect(DEFAULT_BRAND.contact).toEqual({ address: '', phone: '', email: '', website: '' });
    expect(DEFAULT_BRAND.social).toEqual([]);
    expect(Object.isFrozen(DEFAULT_BRAND.colors)).toBe(true);
    expect(() => {
      (DEFAULT_BRAND.colors as { ink: string }).ink = '#000000';
    }).toThrow(TypeError);
  });
});
