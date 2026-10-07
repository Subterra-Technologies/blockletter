import { describe, expect, it } from 'vitest';
import {
  DEFAULT_BRAND,
  RESPONSIVE_CLASSES,
  builtInBlocks,
  createDocument,
  defineBlock,
  renderEmail,
  type BlockBase,
  type BuiltInBlock,
  type BuiltInBlockType,
} from '../src';
import { PHOTO, SAMPLES, block, occurrences, render } from './helpers';

/**
 * The phone layout: a fluid card with a fixed ghost table for Outlook, one small style block,
 * and classes on the cells that stack. The browser check that it fits a 320px screen is a script
 * outside the suite; these pin the markup it relies on.
 */

const styleBlock = (html: string): string => /<style>([\s\S]*?)<\/style>/.exec(html)?.[1] ?? '';

/** One of every built-in block, with pictures wherever a block can have one. */
const everyBlock = (): BuiltInBlock[] =>
  builtInBlocks.map((definition) => {
    const type = definition.type as BuiltInBlockType;
    const sample = block(type, `b-${type}`, SAMPLES[type].overrides as never) as BuiltInBlock;
    switch (sample.type) {
      case 'letter':
        return { ...sample, photo: PHOTO };
      case 'article':
        return { ...sample, image: PHOTO };
      case 'sponsors':
        return { ...sample, items: sample.items.map((item) => ({ ...item, logo: PHOTO })) };
      case 'columns':
        return {
          ...sample,
          columns: sample.columns.map((column) => ({ ...column, image: PHOTO, alt: 'Column' })),
        };
      default:
        return sample;
    }
  });

/** The start tag of the first `<td>` holding `text`, e.g. a column's heading. */
const cellOf = (html: string, text: string): string => {
  const at = html.indexOf(text);
  const start = html.lastIndexOf('<td', at);
  return html.slice(start, html.indexOf('>', start) + 1);
};

describe('the container', () => {
  it('is fluid up to 600px, inside a fixed 600px ghost table only Outlook reads', () => {
    const { html } = render([block('text', 't', { body: 'Hello.' })], {
      issueLabel: 'Spring issue',
    });
    const ghostOpen =
      '<!--[if mso]><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" align="center"><tr><td><![endif]-->';
    const fluid = '<div style="max-width:600px;margin:0 auto;">';
    const card =
      '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;background:#ffffff;border:1px solid #d6d3d1;border-radius:10px;overflow:hidden;">';
    const ghostClose = '<!--[if mso]></td></tr></table><![endif]-->';
    const order = [ghostOpen, fluid, card, 'Hello.', 'Spring issue', '</div>', ghostClose].map(
      (part) => html.indexOf(part),
    );
    expect(order.every((position) => position >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    // The fixed width lives only in the Outlook comment.
    expect(occurrences(html, /width="600"/g)).toBe(1);
    expect(html).not.toMatch(/[";]width:600px/);
  });
});

describe('the style block', () => {
  const { html } = render([]);
  const css = styleBlock(html);

  it('sits in the head, once', () => {
    expect(occurrences(html, /<style>/g)).toBe(1);
    expect(html.indexOf('<style>')).toBeGreaterThan(html.indexOf('<title>'));
    expect(html.indexOf('</style>')).toBeLessThan(html.indexOf('</head>'));
  });

  it('only switches things on for phones', () => {
    const outsideMedia = css.replace(
      /@media only screen and \(max-width:\d+px\)\{(?:[^{}]*\{[^{}]*\})*\}/g,
      '',
    );
    expect(outsideMedia).toBe('');
    expect(css).toContain('@media only screen and (max-width:620px){');
    expect(css).toContain('@media only screen and (max-width:360px){');
  });

  it('is short and plain enough that Gmail keeps it', () => {
    expect(css.length).toBeLessThan(1000);
    expect(css).not.toMatch(/\/\*|@import|url\(|expression|<|>/);
    expect(occurrences(css, /\{/g)).toBe(occurrences(css, /\}/g));
    // Every declaration is terminated and important (inline styles would win otherwise).
    for (const rule of css.match(/\{[^{}]*\}/g) ?? []) {
      const declarations = rule.slice(1, -1).split(';').filter(Boolean);
      expect(rule.endsWith(';}'), rule).toBe(true);
      for (const declaration of declarations)
        expect(declaration, rule).toMatch(/^[a-z-]+:[^:]+ !important$/);
    }
  });

  it('defines every class the blocks use, and nothing else', () => {
    const everything = render(everyBlock()).html;
    const used = new Set(
      [...everything.matchAll(/class="([^"]+)"/g)].flatMap((match) => (match[1] ?? '').split(' ')),
    );
    const defined = new Set([...css.matchAll(/\.(bl-[a-z-]+)/g)].map((match) => match[1]));
    expect([...used].sort()).toEqual([...defined].sort());
    expect([...defined].sort()).toEqual(Object.values(RESPONSIVE_CLASSES).sort());
  });
});

describe('section padding', () => {
  it('narrows the 32px sides of a padded section on a phone', () => {
    const { html } = render([block('text', 't', { body: 'Padded.' })]);
    expect(html).toContain('<tr><td class="bl-pad" style="padding:20px 32px 20px 32px;');
  });

  it('leaves full-width and narrow-sided sections alone', () => {
    const narrow = defineBlock<BlockBase<'narrow'>>({
      type: 'narrow',
      label: 'Narrow',
      description: 'A section with small sides.',
      group: 'layout',
      create: () => ({}),
      validate: () => [],
      render: (item, ctx) =>
        ctx.section(item, 'Narrow sides.', { padding: '28px 12px' }) +
        ctx.section(item, 'No sides.', { padding: '28px 0' }),
    });
    const { html } = renderEmail(
      createDocument<BlockBase>({
        subject: 'S',
        blocks: [
          block('text', 'wide', { body: 'Edge to edge.', style: { fullWidth: true } }),
          { id: 'n', type: 'narrow', hidden: false },
        ],
      }),
      { definitions: [...builtInBlocks, narrow] },
    );
    expect(cellOf(html, 'Edge to edge.')).not.toContain('bl-pad');
    expect(cellOf(html, 'Narrow sides.')).not.toContain('bl-pad');
    expect(cellOf(html, 'No sides.')).not.toContain('bl-pad');
  });
});

describe('cells that stack on a phone', () => {
  it('stacks columns, with space under all but the last and the gaps hidden', () => {
    const { html } = render([block('columns', 'c', SAMPLES.columns.overrides)]);
    expect(cellOf(html, 'Volunteer')).toBe(
      '<td class="bl-stack bl-space" width="50%" valign="top" style="padding:0;">',
    );
    expect(cellOf(html, 'Donate')).toBe(
      '<td class="bl-stack" width="50%" valign="top" style="padding:0;">',
    );
    expect(html).toContain(
      '<td class="bl-gap" width="16" style="width:16px;font-size:0;line-height:0;">&nbsp;</td>',
    );
  });

  it('lets column, image + text and photo-grid pictures fill their stacked cell', () => {
    const { html } = render([
      block('columns', 'c', {
        columns: [{ body: 'One', image: PHOTO, alt: 'One' }, { body: 'Two' }],
      }),
      block('image_text', 'i', { image: PHOTO, alt: 'Beside' }),
      block('photo_grid', 'g', {
        photos: [
          { image: PHOTO, alt: 'A' },
          { image: PHOTO, alt: 'B' },
        ],
      }),
    ]);
    expect(occurrences(html, /<img class="bl-fill" /g)).toBe(4);
  });

  it('stacks an image beside text in source order, either side', () => {
    const left = render([block('image_text', 'l', { heading: 'Left story' })]).html;
    expect(left).toMatch(
      /<td class="bl-stack bl-space" width="220"[^>]*>.*<td class="bl-gap" width="20".*<td class="bl-stack" valign="top"><h2/,
    );
    const right = render([
      block('image_text', 'r', { heading: 'Right story', imageSide: 'right' }),
    ]).html;
    expect(right).toMatch(
      /<td class="bl-stack bl-space" valign="top"><h2.*<td class="bl-gap" width="20".*<td class="bl-stack" width="220"/,
    );
  });

  it('puts an article picture above its story, still a thumbnail', () => {
    const { html } = render([block('article', 'a', { image: PHOTO })]);
    expect(html).toContain(
      '<td class="bl-stack bl-space" width="160" valign="top" style="width:160px;padding-right:20px;"><img src=',
    );
    expect(html).toContain(
      'style="display:block;width:100%;max-width:160px;height:auto;border-radius:8px;"',
    );
    expect(html).toContain('<td class="bl-stack" valign="top"><h2');
    // With neither picture nor kicker tile there is one cell, and nothing to stack.
    const plain = render([block('article', 'a', { kicker: '' })]).html;
    expect(plain).not.toContain('class="bl-stack');
  });

  it('stacks the photo grid one photo per row', () => {
    const { html } = render([
      block('photo_grid', 'g', {
        photos: Array.from({ length: 3 }, (_, index) => ({ alt: `P${index}` })),
      }),
    ]);
    expect(occurrences(html, /<td class="bl-stack" width="33%"/g)).toBe(3);
    expect(occurrences(html, /<td class="bl-gap" width="12"/g)).toBe(2);
  });

  it('stacks three or four numbers or event tiles, and leaves two side by side', () => {
    const pair = render([
      block('stats', 's', SAMPLES.stats.overrides),
      block('event_tiles', 'e', {
        items: [
          { title: 'A', date: '2026-10-01' },
          { title: 'B', date: '2026-10-02' },
        ],
      }),
    ]).html;
    expect(pair).not.toContain('class="bl-stack');
    const four = render([
      block('stats', 's', {
        items: ['1', '2', '3', '4'].map((value) => ({ value, label: `Label ${value}` })),
      }),
      block('event_tiles', 'e', {
        items: [1, 2, 3, 4].map((day) => ({ title: `Tile ${day}`, date: `2026-10-0${day}` })),
      }),
    ]).html;
    expect(occurrences(four, /<td class="bl-stack bl-space" width="25%" align="center"/g)).toBe(3);
    expect(occurrences(four, /<td class="bl-stack" width="25%" align="center"/g)).toBe(1);
    expect(occurrences(four, /<td class="bl-stack" width="25%" valign="top" align="center"/g)).toBe(
      4,
    );
  });

  it('keeps sponsor logos and the letter photo beside their text until the narrowest phones', () => {
    const { html } = render([
      block('sponsors', 's', SAMPLES.sponsors.overrides),
      block('letter', 'l', { ...SAMPLES.letter.overrides, photo: PHOTO }),
      block('letter', 'm', { ...SAMPLES.letter.overrides, heading: 'No photo' }),
    ]);
    expect(html).toContain('<tr><td class="bl-stack-xs" width="96" valign="top"');
    expect(html).toContain('<td class="bl-stack-xs" valign="middle" style="padding:10px 0;">');
    expect(html).toContain('<td class="bl-stack-xs bl-space-xs" width="88" valign="top"');
    expect(cellOf(html, 'Thank you for a wonderful summer.')).toBe(
      '<td class="bl-stack-xs" valign="top">',
    );
    const withoutPhoto = html.slice(html.indexOf('No photo'));
    expect(cellOf(withoutPhoto, 'Thank you for a wonderful summer.')).toBe('<td valign="top">');
  });

  it('gives host blocks the same class names', () => {
    const pair = defineBlock<BlockBase<'pair'>>({
      type: 'pair',
      label: 'Pair',
      description: 'Two cells that stack.',
      group: 'layout',
      create: () => ({}),
      validate: () => [],
      render: (item, ctx) =>
        ctx.section(
          item,
          `<table><tr><td class="${ctx.classes.stack} ${ctx.classes.space}">A</td><td class="${ctx.classes.gap}"></td><td class="${ctx.classes.stack}">B</td></tr></table>`,
        ),
    });
    const { html } = renderEmail(
      createDocument<BlockBase>({
        subject: 'S',
        blocks: [{ id: 'p', type: 'pair', hidden: false }],
      }),
      { definitions: [...builtInBlocks, pair] },
    );
    expect(html).toContain(
      '<td class="bl-stack bl-space">A</td><td class="bl-gap"></td><td class="bl-stack">B</td>',
    );
  });
});

describe('images', () => {
  it('keep a width for Outlook and scale down with their cell everywhere else', () => {
    const { html } = render(everyBlock(), { brand: { ...DEFAULT_BRAND, logo: PHOTO } });
    const images = html.match(/<img\b[^>]*>/g) ?? [];
    expect(images.length).toBeGreaterThan(5);
    for (const image of images) {
      const width = Number(/\swidth="(\d+)"/.exec(image)?.[1]);
      expect(width, image).toBeGreaterThan(0);
      // Small fixed-size pictures (a round portrait, a logo tile) cannot push a layout wider.
      if (width > 96)
        expect(image).toMatch(new RegExp(`width:100%;max-width:${width}px;height:auto;`));
    }
  });

  it('keep pasted rich-text pictures and preformatted lines inside the column', () => {
    const { html } = render([
      block('text', 't', {
        format: 'html',
        body: '<p><img src="https://files.example.test/wide.png" width="900" alt="Wide"></p><pre>one very long preformatted line</pre>',
      }),
    ]);
    expect(html).toContain(
      '<img src="https://files.example.test/wide.png" width="900" alt="Wide" style="max-width:100%;height:auto">',
    );
    expect(html).toContain('<pre style="white-space:pre-wrap">');
  });
});
