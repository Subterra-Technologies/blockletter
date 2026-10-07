import { SOCIAL_NETWORKS } from './limits';
import { BRAND_FONTS, type BrandFont, type BrandKit, type ValidationIssue } from './types';
import { deepFreeze } from './util';
import { isHexColor, validateObject } from './validate';

/**
 * The brand kit, and the email palette it paints.
 *
 * A brand kit is four colours, two web-safe fonts, a logo and the contact details every issue's
 * footer falls back to. The renderer never uses a colour straight from the kit for text without
 * checking it reads: text on a filled band or button is chosen for WCAG AA contrast against that
 * fill, so a pale accent gets dark button labels rather than invisible white ones.
 */

/** Neutral defaults: no organisation's identity, just a calm, readable starting point. */
export const DEFAULT_BRAND: BrandKit = deepFreeze<BrandKit>({
  name: 'Your Organization',
  colors: { ink: '#1f2937', accent: '#0f766e', highlight: '#f59e0b', page: '#f5f5f4' },
  fonts: { heading: 'Georgia', body: 'Arial' },
  contact: { address: '', phone: '', email: '', website: '' },
  social: [],
});

/** Web-safe stacks for each brand font, with fallbacks every email client has. */
export const FONT_STACKS: Readonly<Record<BrandFont, string>> = deepFreeze({
  Georgia: "Georgia, 'Times New Roman', Times, serif",
  'Times New Roman': "'Times New Roman', Times, serif",
  Helvetica: 'Helvetica, Arial, sans-serif',
  Arial: 'Arial, Helvetica, sans-serif',
  Verdana: 'Verdana, Geneva, sans-serif',
  'Trebuchet MS': "'Trebuchet MS', Tahoma, Geneva, sans-serif",
});

const isBrandFont = (value: unknown): value is BrandFont =>
  typeof value === 'string' && (BRAND_FONTS as readonly string[]).includes(value);

/** The CSS font stack for a brand font; anything else gets `fallback`'s. */
export function fontStack(font: string | undefined, fallback: BrandFont = 'Arial'): string {
  return isBrandFont(font) ? FONT_STACKS[font] : FONT_STACKS[fallback];
}

// ---------------------------------------------------------------------------
// Colour
// ---------------------------------------------------------------------------

const WHITE = '#ffffff';
const NEAR_BLACK = '#111111';
/** WCAG AA for body text. */
const AA = 4.5;

const channels = (value: string): [number, number, number] | undefined => {
  const match = /^#?([0-9a-fA-F]{6})$/.exec(value.trim());
  if (!match) return undefined;
  const raw = Number.parseInt(match[1] ?? '', 16);
  return [(raw >> 16) & 255, (raw >> 8) & 255, raw & 255];
};

const linear = (component: number): number => {
  const scaled = component / 255;
  return scaled <= 0.03928 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
};

/** WCAG relative luminance of a six-digit hex colour: 0 for black, 1 for white (and unreadable). */
export function relativeLuminance(hex: string): number {
  const rgb = channels(hex);
  if (!rgb) return 1;
  return 0.2126 * linear(rgb[0]) + 0.7152 * linear(rgb[1]) + 0.0722 * linear(rgb[2]);
}

/** WCAG contrast ratio between two hex colours, 1–21; 1 when either is unreadable. */
export function contrastRatio(a: string, b: string): number {
  if (!channels(a) || !channels(b)) return 1;
  const first = relativeLuminance(a);
  const second = relativeLuminance(b);
  const [light, dark] = first >= second ? [first, second] : [second, first];
  return (light + 0.05) / (dark + 0.05);
}

const isDark = (hex: string): boolean => relativeLuminance(hex) < 0.4;

function mix(value: string, target: [number, number, number], amount: number): string {
  const rgb = channels(value);
  if (!rgb) return value;
  return `#${rgb
    .map((component, index) =>
      Math.round(component + ((target[index] ?? component) - component) * amount)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;
}

/**
 * `color` as text on `background`, darkened (or lightened, where white stands out more) in small
 * steps until it clears WCAG AA: 4.5:1, or 3:1 for large text. A colour that already reads comes
 * back unchanged, so only a decorative colour used as text is ever touched.
 */
export function readable(color: string, background: string, large = false): string {
  const minimum = large ? 3 : AA;
  if (!channels(color) || !channels(background)) return color;
  if (contrastRatio(color, background) >= minimum) return color;
  // Toward whichever extreme stands out more: on a mid-grey, only black can get there.
  const lighten = contrastRatio(WHITE, background) > contrastRatio('#000000', background);
  const target: [number, number, number] = lighten ? [255, 255, 255] : [0, 0, 0];
  for (let step = 1; step <= 20; step += 1) {
    const candidate = mix(color, target, step / 20);
    if (contrastRatio(candidate, background) >= minimum) return candidate;
  }
  return lighten ? WHITE : '#000000';
}

/** A label on a filled background: `dark` or white, whichever reads, else black. */
export function labelOn(background: string, dark: string = NEAR_BLACK): string {
  if (contrastRatio(background, dark) >= AA) return dark;
  if (contrastRatio(background, WHITE) >= AA) return WHITE;
  return '#000000';
}

/**
 * `color` as text on every one of `backgrounds`: itself when it reaches WCAG AA on all of them,
 * else mixed toward black in small steps — which keeps its hue — until it does. `fallback` when
 * even black does not (a dark page colour).
 */
function shadeToRead(color: string, backgrounds: readonly string[], fallback: string): string {
  const reads = (candidate: string): boolean =>
    backgrounds.every((background) => contrastRatio(candidate, background) >= AA);
  if (reads(color)) return color;
  for (let step = 1; step <= 20; step += 1) {
    const candidate = mix(color, [0, 0, 0], step / 20);
    if (reads(candidate)) return candidate;
  }
  return fallback;
}

/** The first candidate that reads on `background`, else the better of white and near-black. */
function firstReadable(background: string, candidates: readonly string[]): string {
  for (const color of candidates) if (contrastRatio(color, background) >= AA) return color;
  return contrastRatio(WHITE, background) >= contrastRatio(NEAR_BLACK, background)
    ? WHITE
    : NEAR_BLACK;
}

// ---------------------------------------------------------------------------
// Palette
// ---------------------------------------------------------------------------

/** Every colour the renderer paints with, resolved from a brand kit. */
export interface Palette {
  /** Page background behind the 600px card. */
  page: string;
  /** Card background. */
  card: string;
  border: string;
  text: string;
  muted: string;
  heading: string;
  /** Button fills, the quote bar and thick rules. */
  accent: string;
  /**
   * The accent drawn as text (kickers, the header strapline, big numbers, outline buttons): the
   * accent itself when it reads on both `card` and `soft`, else a darker shade of it.
   */
  accentInk: string;
  /** A button label on the accent colour. */
  accentText: string;
  /** Dark band (event tiles, banners without a photo). */
  band: string;
  bandText: string;
  bandMuted: string;
  /** Event-tile day numbers: the highlight, adjusted until it reads on the band as large text. */
  tileDay: string;
  /** Alternate section background (name lists, dated lists, quotes, numbers). */
  soft: string;
  footer: string;
  footerText: string;
  link: string;
}

const CARD = WHITE;
const BORDER = '#d6d3d1';
const MUTED_ON_LIGHT = '#57534e';
const MUTED_ON_DARK = '#cbd5e1';
const FINE_PRINT_ON_DARK = '#e7e5e4';

const colorOr = (value: string | undefined, fallback: string): string =>
  isHexColor(value) ? value : fallback;

/**
 * The palette a brand kit paints: its colours over neutral defaults, contrast-aware. Text is the
 * ink when the ink reads on white, else near-black; text on the ink's bands and footer is the
 * page colour, white or near-black, whichever reads; button labels are white or dark to suit the
 * accent; the accent as text and the event-tile day numbers are shaded until they read. An
 * invalid colour falls back to the default brand's.
 */
export function resolvePalette(brand: BrandKit = DEFAULT_BRAND): Palette {
  const defaults = DEFAULT_BRAND.colors;
  const ink = colorOr(brand.colors?.ink, defaults.ink);
  const accent = colorOr(brand.colors?.accent, defaults.accent);
  const highlight = colorOr(brand.colors?.highlight, defaults.highlight);
  const page = colorOr(brand.colors?.page, defaults.page);
  const darkInk = isDark(ink);

  const text = contrastRatio(ink, CARD) >= AA ? ink : NEAR_BLACK;
  const onInk = firstReadable(ink, [page, WHITE, text, NEAR_BLACK]);
  return {
    page,
    card: CARD,
    border: BORDER,
    text,
    muted: MUTED_ON_LIGHT,
    heading: text,
    accent,
    accentInk: shadeToRead(accent, [CARD, page], text),
    accentText: firstReadable(accent, [WHITE, text, NEAR_BLACK]),
    band: ink,
    bandText: onInk,
    bandMuted: firstReadable(ink, [darkInk ? MUTED_ON_DARK : MUTED_ON_LIGHT, onInk]),
    // Day numbers are large text, so 3:1 is enough; a highlight too close to the ink is moved
    // toward white (or black, on a light band) until it gets there.
    tileDay: readable(highlight, ink, true),
    soft: page,
    footer: ink,
    footerText: darkInk ? firstReadable(ink, [FINE_PRINT_ON_DARK, onInk]) : onInk,
    link: text,
  };
}

/** What `resolvePalette()` returns for `DEFAULT_BRAND`. */
export const DEFAULT_PALETTE: Readonly<Palette> = deepFreeze(resolvePalette(DEFAULT_BRAND));

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Problems with a brand kit from untrusted input, in words a brand-kit form can show. */
export function validateBrandKit(input: unknown): ValidationIssue[] {
  const brand = validateObject(input, '', { label: 'brand kit' });
  if (!brand.ok) return brand.issues;
  brand
    .string('name', {
      required: 'Enter the organisation name.',
      max: 120,
      label: 'organisation name',
    })
    .image('logo', { optional: true })
    .object('colors', (colors) => {
      for (const key of ['ink', 'accent', 'highlight', 'page'] as const) {
        colors.color(key, {
          message: `Enter the ${key} colour as a six-digit hex colour such as #1f2937.`,
        });
      }
    })
    .object('fonts', (fonts) => {
      for (const key of ['heading', 'body'] as const) {
        fonts.oneOf(key, BRAND_FONTS, {
          message: `Choose a ${key} font from: ${BRAND_FONTS.join(', ')}.`,
        });
      }
    })
    .object('contact', (contact) => {
      contact
        .string('address', { max: 200 })
        .string('phone', { max: 40, label: 'phone number' })
        .string('email', { max: 254, label: 'email address' })
        .string('website', { max: 300 });
      const email = contact.value.email;
      if (typeof email === 'string' && email.trim() && !EMAIL.test(email.trim())) {
        contact.add('invalid_email', 'Enter a valid email address.', 'email');
      }
    })
    .array('social', { label: 'social links' }, (link) => {
      link
        .oneOf('network', SOCIAL_NETWORKS, { label: 'network' })
        .string('url', { required: 'Add the link.', max: 300, label: 'link' });
    });
  return brand.issues;
}
