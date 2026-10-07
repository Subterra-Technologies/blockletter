import { describe, expect, it } from 'vitest';
import {
  BLOCK_GROUPS,
  LIMITS,
  blockIssues,
  blockLabel,
  blockSummary,
  blockValidator,
  builtInBlocks,
  createBlock,
  createDocument,
  defineBlock,
  duplicateBlock,
  ensureFooter,
  escapeHtml,
  getDefinition,
  insertBlock,
  isStructural,
  moveBlock,
  newBlockId,
  paletteGroups,
  removeBlock,
  renderBlock,
  renderEmail,
  styleSummary,
  toggleHidden,
  updateBlock,
  type BlockBase,
  type BlockDefinition,
  type BuiltInBlock,
  type BuiltInBlockType,
} from '../src';
import { SAMPLES, block, occurrences, render } from './helpers';

const TYPES = builtInBlocks.map((definition) => definition.type as BuiltInBlockType);

describe('every built-in block definition', () => {
  it('ships all 21 blocks, once each, in palette order', () => {
    expect(TYPES).toEqual([
      'header',
      'letter',
      'text',
      'event_tiles',
      'name_list',
      'sponsors',
      'post_list',
      'article',
      'dated_list',
      'callout',
      'footer',
      'columns',
      'image_text',
      'button',
      'divider',
      'spacer',
      'banner',
      'image',
      'photo_grid',
      'quote',
      'stats',
    ]);
    expect(Object.keys(SAMPLES).sort()).toEqual([...TYPES].sort());
  });

  it.each(TYPES)('%s: describes itself for the palette', (type) => {
    const definition = getDefinition(type);
    expect(definition?.label.trim()).toBeTruthy();
    expect(definition?.description.trim()).toBeTruthy();
    expect(BLOCK_GROUPS.map((group) => group.id)).toContain(definition?.group);
  });

  it.each(TYPES)('%s: a fresh block is valid', (type) => {
    const fresh = createBlock(type);
    expect(fresh).toMatchObject({ type, hidden: false });
    expect(fresh.id.startsWith(`${type}-`)).toBe(true);
    expect(getDefinition(type)?.validate(fresh, 'blocks/0')).toEqual([]);
  });

  it.each(TYPES)('%s: renders its words in the HTML and the plain text', (type) => {
    const sample = SAMPLES[type];
    const filled = block(type, `sample-${type}`, sample.overrides as never) as BuiltInBlock;
    expect(getDefinition(type)?.validate(filled, 'blocks/0')).toEqual([]);
    const { html, text } = render([filled]);
    const ownRows = renderBlock(filled, { baseUrl: 'https://example.test' });
    expect(ownRows.html).toMatch(/^<tr><td/);
    for (const word of sample.words) {
      expect(html).toContain(escapeHtml(word));
      expect(text.toLowerCase()).toContain(word.toLowerCase());
    }
  });

  it('draws the rules and gaps that carry no words', () => {
    expect(render([block('divider', 'd', SAMPLES.divider.overrides)]).html).toContain(
      'height:4px;background:',
    );
    expect(render([block('divider', 'd')]).text).toContain('---');
    expect(render([block('spacer', 's', SAMPLES.spacer.overrides)]).html).toContain('height:56px');
  });

  it('marks only the header and footer as structural', () => {
    expect(builtInBlocks.filter((definition) => definition.structural).map((d) => d.type)).toEqual([
      'header',
      'footer',
    ]);
    expect(isStructural({ type: 'header' })).toBe(true);
    expect(isStructural({ type: 'footer' })).toBe(true);
    expect(isStructural({ type: 'text' })).toBe(false);
    expect(isStructural({ type: 'photo_grid' })).toBe(false);
  });
});

describe('what each block renders from', () => {
  it('numbers the day of an event tile from its date alone, with no time-zone arithmetic', () => {
    const { html, text } = render([
      block('event_tiles', 'tiles', {
        items: [
          { title: 'New year walk', date: '2027-01-01', url: '/walk' },
          { title: 'Late talk', date: '2026-12-31', time: '11:30 PM', location: 'Library' },
        ],
      }),
    ]);
    expect(html).toContain('>1</p>');
    expect(html).toContain('>31</p>');
    expect(html).toContain('Jan. 1');
    expect(html).toContain('Dec. 31 · 11:30 PM · Library');
    expect(html).toContain('<a href="https://example.test/walk"');
    expect(text).toContain('Dec. 31 · 11:30 PM · Library — Late talk');
  });

  it('shows at most four event tiles and three posts', () => {
    const events = Array.from({ length: 6 }, (_, index) => ({
      title: `Event ${index + 1}`,
      date: `2026-10-0${index + 1}`,
    }));
    const posts = Array.from({ length: 5 }, (_, index) => ({
      title: `Post ${index + 1}`,
      excerpt: 'Excerpt.',
      url: `/p/${index + 1}`,
    }));
    const { html } = render([
      block('event_tiles', 't', { items: events }),
      block('post_list', 'p', { items: posts }),
    ]);
    expect(html).toContain('Event 4');
    expect(html).not.toContain('Event 5');
    expect(html).toContain('Post 3');
    expect(html).not.toContain('Post 4');
  });

  it('gives a sponsor without a logo a tile with their initials, never anyone else’s', () => {
    const { html } = render([
      block('sponsors', 's', {
        items: [
          { name: 'Oak and Iron Works', message: 'Thanks!' },
          { name: 'The', message: 'One small word.' },
          { name: '', message: 'Anonymous.' },
        ],
      }),
    ]);
    expect(html).toMatch(/>OI<\/td>/);
    expect(html).toMatch(/>T<\/td>/);
    expect(html).toMatch(/>•<\/td>/);
  });

  it('lists names with numbers, and a second line only when there is one', () => {
    const { html, text } = render([
      block('name_list', 'n', {
        items: [{ name: 'First Shop', detail: 'Florist' }, { name: 'Second Shop' }],
      }),
    ]);
    expect(html).toContain('>1.</td>');
    expect(html).toContain('>2.</td>');
    expect(text).toContain('1. First Shop — Florist');
    expect(text).toMatch(/^2\. Second Shop$/m);
  });

  it('labels a post with its kicker and links its title and "Read more" to the post', () => {
    const { html, text } = render([
      block('post_list', 'p', {
        items: [
          { title: 'Park reopens', excerpt: 'New paths.', url: '/news/park', kicker: 'News' },
        ],
      }),
    ]);
    expect(html).toContain('>News</p>');
    expect(occurrences(html, /href="https:\/\/example\.test\/news\/park"/g)).toBe(2);
    expect(html).toContain('>Read more</a>');
    expect(text).toContain('News: Park reopens');
  });

  it('fills an article without a photo with its own kicker, upper-cased', () => {
    const { html } = render([block('article', 'a', { kicker: 'Garden tips' })]);
    expect(html).toContain('>GARDEN TIPS</td>');
  });

  it('orders a dated list by date, with undated lines after in the order written', () => {
    const { text } = render([
      block('dated_list', 'd', {
        items: [
          { date: 'Every Saturday', text: 'Market' },
          { date: 'Oct. 9', text: 'Second', sortDate: '2026-10-09' },
          { date: 'Weekdays', text: 'Library' },
          { date: 'Oct. 2', text: 'First', sortDate: '2026-10-02' },
        ],
      }),
    ]);
    const order = [
      'Oct. 2 · First',
      'Oct. 9 · Second',
      'Every Saturday · Market',
      'Weekdays · Library',
    ];
    const positions = order.map((line) => text.indexOf(line));
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  it('links an image when it has a link, and only when there is an image', () => {
    const linked = render([
      block('image', 'i', {
        image: { url: 'https://files.example.test/a.jpg' },
        alt: 'A',
        linkUrl: '/a',
      }),
    ]).html;
    expect(linked).toMatch(/<a href="https:\/\/example\.test\/a"[^>]*><img /);
    const placeholder = render([block('image', 'i', { alt: 'A', linkUrl: '/a' })]).html;
    expect(placeholder).not.toContain('href="https://example.test/a"');
  });

  it('shows a callout button only once it has both a label and a link', () => {
    expect(render([block('callout', 'c')]).html).not.toContain(
      'display:inline-block;padding:12px 22px',
    );
    expect(render([block('callout', 'c', { ctaUrl: '/share' })]).html).toContain(
      'href="https://example.test/share"',
    );
  });

  it('renders nothing for an empty letter, list or quote', () => {
    const { html } = render(
      [
        block('letter', 'l'),
        block('event_tiles', 'e'),
        block('sponsors', 's'),
        block('name_list', 'n'),
        block('post_list', 'p'),
        block('dated_list', 'd'),
        block('quote', 'q', { quote: '  ' }),
        block('text', 't'),
      ],
      { annotate: true },
    );
    expect(occurrences(html, /data-block-id="/g)).toBe(1);
    expect(html).toContain('data-block-id="required-footer"');
  });
});

describe('describing blocks without rendering them', () => {
  it('labels blocks for a list', () => {
    expect(blockSummary(block('spacer', 's', { size: 'large' }))).toBe('Spacer · large');
    expect(blockSummary(block('quote', 'q', { quote: 'Short quote.' }))).toBe(
      'Quote · Short quote.',
    );
    expect(blockSummary(block('divider', 'd', { thickness: 'thick' }))).toBe('Divider · thick');
    expect(
      blockSummary(
        block('columns', 'c', { columns: [{ body: 'One' }, { body: 'Two' }, { body: 'Three' }] }),
      ),
    ).toBe('Columns · 3 columns');
    expect(
      blockSummary(block('header', 'h', { title: 'Newsletter', issueLabel: 'March 2026' })),
    ).toBe('Header · Newsletter · March 2026');
    expect(blockSummary(block('button', 'b'))).toBe('Button · Learn more');
    expect(
      blockSummary(
        block('sponsors', 's', {
          items: [
            { name: 'Ada', message: '' },
            { name: 'Bo', message: '' },
          ],
        }),
      ),
    ).toBe('Sponsors · Ada, Bo');
    expect(blockSummary(block('event_tiles', 'e'))).toBe('Event tiles · Upcoming events');
    expect(blockSummary(block('text', 't'))).toBe('Text');
    expect(blockSummary({ id: 'x', type: 'mystery', hidden: false })).toBe('mystery');
  });

  it('elides a long body to its first words, and a long line to 60 characters', () => {
    expect(
      blockSummary(
        block('text', 't', { body: 'one two three four five six seven eight nine ten' }),
      ),
    ).toBe('Text · one two three four five six seven eight…');
    const long = block('quote', 'q', { quote: 'word '.repeat(40) });
    expect(blockSummary(long)).toHaveLength('Quote · '.length + 58);
    expect(blockSummary(long).endsWith('…')).toBe(true);
  });

  it('names block types, and falls back to the type itself', () => {
    expect(blockLabel('event_tiles')).toBe('Event tiles');
    expect(blockLabel('image_text')).toBe('Image + text');
    expect(blockLabel('unknown_thing')).toBe('unknown_thing');
  });

  it('summarises appearance overrides', () => {
    expect(styleSummary(undefined)).toBe('Brand defaults');
    expect(styleSummary({})).toBe('Brand defaults');
    expect(styleSummary({ align: 'left', paddingY: 'normal', fontSize: 'normal' })).toBe(
      'Brand defaults',
    );
    expect(
      styleSummary({
        background: '#f5f5f4',
        textColor: '#1f2937',
        align: 'center',
        paddingY: 'loose',
        fontSize: 'large',
        fullWidth: true,
        divider: true,
      }),
    ).toBe(
      'background #f5f5f4 · text #1f2937 · center · loose padding · large text · full width · divider',
    );
  });
});

describe('blockIssues', () => {
  it('is empty for a fresh block', () => {
    for (const type of TYPES.filter((type) => type !== 'callout')) {
      expect(blockIssues(createBlock(type)), type).toEqual([]);
    }
    // A fresh callout has a button label but no link yet, and says so.
    expect(blockIssues(createBlock('callout'))).toEqual(['Add a link so the button appears.']);
  });

  it('caps the list blocks', () => {
    const events = Array.from({ length: 5 }, () => ({ title: 'E', date: '2026-10-01' }));
    expect(blockIssues(block('event_tiles', 'e', { items: events }))).toEqual([
      'Choose at most 4 events.',
    ]);
    const posts = Array.from({ length: 4 }, () => ({ title: 'P', excerpt: '', url: '/p' }));
    expect(blockIssues(block('post_list', 'p', { items: posts }))).toEqual([
      'Choose at most 3 posts.',
    ]);
  });

  it('ranges columns, numbers and photo grids', () => {
    expect(blockIssues(block('columns', 'c', { columns: [{ body: '' }] }))).toEqual([
      'Use 2 or 3 columns.',
    ]);
    expect(blockIssues(block('stats', 's', { items: [{ value: '1', label: 'a' }] }))).toEqual([
      'Use between 2 and 4 numbers.',
    ]);
    expect(blockIssues(block('photo_grid', 'g', { photos: [{ alt: '' }] }))).toEqual([
      'Use between 2 and 6 photos.',
    ]);
  });

  it('requires a button label and link', () => {
    expect(blockIssues(block('button', 'b', { label: '  ', url: '' }))).toEqual([
      'Give the button a label.',
      'Give the button a link.',
    ]);
  });

  it('caps long text with a thousands-separated limit', () => {
    const body = 'x'.repeat(LIMITS.maxTextLength + 1);
    expect(blockIssues(block('text', 't', { body }))).toEqual([
      'Keep the text to 5,000 characters or fewer.',
    ]);
    expect(blockIssues(block('quote', 'q', { quote: body }))).toEqual([
      'Keep the quote to 5,000 characters or fewer.',
    ]);
    expect(blockIssues(block('columns', 'c', { columns: [{ body }, { body: '' }] }))).toEqual([
      'Keep the column text to 5,000 characters or fewer.',
    ]);
  });

  it('asks for alt text wherever an image has none', () => {
    const image = { url: 'https://files.example.test/a.jpg' };
    const altIssue = 'Add alt text so screen readers can describe the image.';
    expect(blockIssues(block('image', 'i', { image, alt: '' }))).toEqual([altIssue]);
    expect(blockIssues(block('image', 'i', { image, alt: 'A view' }))).toEqual([]);
    expect(blockIssues(block('banner', 'b', { image, alt: ' ' }))).toEqual([altIssue]);
    expect(blockIssues(block('image_text', 'it', { image, alt: '' }))).toEqual([altIssue]);
    expect(
      blockIssues(block('photo_grid', 'g', { photos: [{ image, alt: '' }, { alt: 'B' }] })),
    ).toEqual(['Add alt text to every photo.']);
    expect(
      blockIssues(block('sponsors', 's', { items: [{ name: '', message: '', logo: image }] })),
    ).toHaveLength(1);
  });
});

describe('block definitions as plugins', () => {
  interface CountdownBlock extends BlockBase<'countdown'> {
    days: number;
    caption: string;
  }

  const countdown = defineBlock<CountdownBlock>({
    type: 'countdown',
    label: 'Countdown',
    description: 'Days to go until the big day.',
    group: 'extras',
    create: () => ({ days: 10, caption: 'days to go' }),
    validate: (value, path) => {
      const check = blockValidator(value, path, 'countdown').string('caption');
      if (typeof check.value.days !== 'number') {
        check.add('invalid_type', 'Days must be a number.', 'days');
      }
      return check.issues;
    },
    summary: (item) => `${item.days} ${item.caption}`,
    render: (item, ctx) => {
      ctx.text(`${item.days} ${item.caption}`, '');
      return ctx.section(
        item,
        `<p style="${ctx.bodyStyle(ctx.palette.accent)}">${ctx.escape(String(item.days))} ${ctx.escape(item.caption)}</p>`,
        { background: ctx.palette.soft },
      );
    },
  });
  const definitions: readonly BlockDefinition[] = [...builtInBlocks, countdown];

  it('renders a host block registered through `definitions`, with the shared helpers', () => {
    const custom = createBlock<CountdownBlock>('countdown', definitions);
    expect(custom).toMatchObject({ type: 'countdown', days: 10, hidden: false });
    const doc = createDocument<BlockBase>({ subject: 'Soon', blocks: [custom] });
    const { html, text, warnings } = renderEmail(doc, { definitions, annotate: true });
    expect(html).toContain(`data-block-id="${custom.id}"`);
    expect(html).toContain('10 days to go');
    expect(text).toContain('10 days to go');
    expect(warnings.some((warning) => warning.includes('countdown'))).toBe(false);
    expect(blockSummary(custom, definitions)).toBe('Countdown · 10 days to go');
  });

  it('lists a host group after the built-in ones in the palette', () => {
    const groups = paletteGroups(definitions);
    expect(groups.map((group) => group.id)).toEqual(['content', 'layout', 'graphics', 'extras']);
    expect(groups.at(-1)).toMatchObject({ label: 'Extras' });
    expect(groups[0]?.items.map((item) => item.type)).toEqual(TYPES.slice(0, 11));
  });

  it('lets a later definition replace a built-in one', () => {
    const plainButton = defineBlock({
      ...getDefinition('button')!,
      label: 'Link button',
      render: () => '<tr><td>overridden</td></tr>',
    });
    const overridden = [...builtInBlocks, plainButton];
    expect(getDefinition('button', overridden)?.label).toBe('Link button');
    expect(paletteGroups(overridden).flatMap((group) => group.items)).toHaveLength(21);
    const { html } = renderEmail(createDocument({ subject: 'x', blocks: [block('button', 'b')] }), {
      definitions: overridden,
    });
    expect(html).toContain('overridden');
  });

  it('leaves out a block nothing defines, and says so', () => {
    const stray = { id: 'stray', type: 'carousel', hidden: false } as unknown as BuiltInBlock;
    const { html, warnings } = render([block('text', 't', { body: 'Still here.' }), stray]);
    expect(html).toContain('Still here.');
    expect(html).not.toContain('stray');
    expect(warnings).toContain(
      'There is no definition for the "carousel" block, so it was left out.',
    );
  });

  it('refuses to create a block nothing defines', () => {
    expect(() => createBlock('carousel')).toThrow(/carousel/);
  });

  it('mints a distinct id each time', () => {
    expect(newBlockId('text')).not.toBe(newBlockId('text'));
  });
});

describe('list operations', () => {
  const ids = (blocks: BlockBase[]) => blocks.map((item) => item.id);
  const three = (): BuiltInBlock[] => ['a', 'b', 'c'].map((id) => block('text', id));

  it('moves a block and leaves the rest in order', () => {
    const blocks = three();
    expect(ids(moveBlock(blocks, 0, 2))).toEqual(['b', 'c', 'a']);
    expect(ids(moveBlock(blocks, 2, 0))).toEqual(['c', 'a', 'b']);
  });

  it('returns the same array for a no-op or an out-of-range move', () => {
    const blocks = three();
    expect(moveBlock(blocks, 1, 1)).toBe(blocks);
    expect(moveBlock(blocks, -1, 1)).toBe(blocks);
    expect(moveBlock(blocks, 0, 9)).toBe(blocks);
  });

  it('inserts at an index, or at the end before a trailing footer', () => {
    const withFooter = [...three(), block('footer', 'f')];
    expect(ids(insertBlock(withFooter, block('quote', 'q')))).toEqual(['a', 'b', 'c', 'q', 'f']);
    expect(ids(insertBlock(three(), block('quote', 'q')))).toEqual(['a', 'b', 'c', 'q']);
    expect(ids(insertBlock(three(), block('quote', 'q'), 0))).toEqual(['q', 'a', 'b', 'c']);
    expect(ids(insertBlock(three(), block('quote', 'q'), 99))).toEqual(['a', 'b', 'c', 'q']);
  });

  it('removes, updates and toggles by id, and changes nothing for an unknown id', () => {
    const blocks = three();
    expect(ids(removeBlock(blocks, 'b'))).toEqual(['a', 'c']);
    expect(removeBlock(blocks, 'zz')).toBe(blocks);
    const edited = block('text', 'b', { body: 'Edited.' });
    expect(updateBlock(blocks, edited)[1]).toBe(edited);
    expect(updateBlock(blocks, block('text', 'zz'))).toBe(blocks);
    expect(toggleHidden(blocks, 'c')[2]?.hidden).toBe(true);
    expect(toggleHidden(toggleHidden(blocks, 'c'), 'c')[2]?.hidden).toBe(false);
    expect(toggleHidden(blocks, 'zz')).toBe(blocks);
    expect(blocks.every((item) => !item.hidden)).toBe(true);
  });

  it('duplicates a block deeply, with a new id, right after it', () => {
    const blocks: BuiltInBlock[] = [
      block('stats', 's', {
        items: [
          { value: '1', label: 'One' },
          { value: '2', label: 'Two' },
        ],
      }),
      block('text', 't'),
    ];
    const next = duplicateBlock(blocks, 's');
    expect(next).toHaveLength(3);
    const [original, copy] = next as [BuiltInBlock, BuiltInBlock];
    expect(copy.id).not.toBe('s');
    expect(copy.type).toBe('stats');
    expect(copy).toMatchObject({ items: [{ value: '1' }, { value: '2' }] });
    expect((copy as { items: unknown }).items).not.toBe((original as { items: unknown }).items);
    expect(duplicateBlock(blocks, 'zz')).toBe(blocks);
  });
});

describe('ensureFooter', () => {
  const make = (id: string) => block('footer', id);

  it('returns the same array when the footer is already single, visible and last', () => {
    const blocks: BuiltInBlock[] = [block('text', 't'), make('f')];
    expect(ensureFooter(blocks, make)).toBe(blocks);
  });

  it('moves the last footer to the end, shows it, and drops the others', () => {
    const blocks: BuiltInBlock[] = [
      make('first'),
      block('text', 't'),
      { ...make('last'), hidden: true },
      block('quote', 'q'),
    ];
    const next = ensureFooter(blocks, make);
    expect(next.map((item) => item.id)).toEqual(['t', 'q', 'last']);
    expect(next.at(-1)?.hidden).toBe(false);
    expect(blocks[2]?.hidden).toBe(true);
  });

  it('adds one with an id that does not clash', () => {
    const blocks: BuiltInBlock[] = [block('text', 'required-footer')];
    const next = ensureFooter(blocks, make);
    expect(next.map((item) => item.id)).toEqual(['required-footer', 'required-footer-1']);
  });
});
