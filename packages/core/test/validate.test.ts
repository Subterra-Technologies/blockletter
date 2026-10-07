import { describe, expect, it } from 'vitest';
import {
  BlockletterValidationError,
  DEFAULT_BRAND,
  LIMITS,
  assertValidDocument,
  builtInBlocks,
  createBlock,
  createDocument,
  migrateDocument,
  validateBrandKit,
  validateDocument,
  type BuiltInBlock,
  type BuiltInBlockType,
  type ValidationIssue,
} from '../src';
import { PHOTO, SAMPLES, block } from './helpers';

const codes = (issues: ValidationIssue[]) => issues.map((issue) => issue.code);

/** A JSON round trip, as a document read back from storage would be. */
const stored = (value: unknown): unknown => JSON.parse(JSON.stringify(value));

const everyBlock = (): BuiltInBlock[] =>
  builtInBlocks.map((definition) => {
    const type = definition.type as BuiltInBlockType;
    return block(type, `b-${type}`, SAMPLES[type].overrides as never) as BuiltInBlock;
  });

describe('validateDocument', () => {
  it('accepts a document holding every built-in block, as stored', () => {
    const doc = createDocument({
      subject: 'September news',
      preheader: 'What is on',
      period: { start: '2026-09-01', end: '2026-09-30', lookaheadEnd: '2026-11-10' },
      blocks: everyBlock(),
    });
    expect(validateDocument(stored(doc))).toEqual([]);
  });

  it('refuses something that is not a document at all', () => {
    expect(validateDocument(null)).toEqual([
      { code: 'invalid_document', message: 'This is not a newsletter document.' },
    ]);
    expect(codes(validateDocument([]))).toEqual(['invalid_document']);
  });

  it('names a version it cannot read', () => {
    const issues = validateDocument({ ...createDocument(), version: 2 });
    expect(issues).toEqual([
      expect.objectContaining({ code: 'unsupported_version', path: 'version' }),
    ]);
  });

  it('checks the subject, preheader and block list shapes', () => {
    const issues = validateDocument({
      version: 1,
      subject: 3,
      preheader: 'x'.repeat(5001),
      blocks: {},
    });
    expect(issues).toEqual([
      expect.objectContaining({ code: 'invalid_type', path: 'subject' }),
      expect.objectContaining({ code: 'too_long', path: 'preheader' }),
      expect.objectContaining({ code: 'invalid_type', path: 'blocks' }),
    ]);
  });

  it('names a block type it does not know, with where and which', () => {
    const issues = validateDocument({
      ...createDocument(),
      blocks: [{ id: 'c1', type: 'carousel', hidden: false }],
    });
    expect(issues).toEqual([
      {
        code: 'unknown_block_type',
        message: '"carousel" is not a block this newsletter knows how to show.',
        blockId: 'c1',
        path: 'blocks/0/type',
      },
    ]);
  });

  it('refuses duplicate and missing block ids', () => {
    const issues = validateDocument(
      createDocument({
        blocks: [block('text', 'same'), block('quote', 'same'), block('divider', ' ')],
      }),
    );
    expect(issues).toEqual([
      expect.objectContaining({ code: 'duplicate_block_id', blockId: 'same', path: 'blocks/1/id' }),
      expect.objectContaining({
        code: 'required',
        path: 'blocks/2/id',
        message: 'Every block needs an id.',
      }),
    ]);
  });

  it(`refuses more than ${LIMITS.maxBlocks} blocks`, () => {
    const blocks = Array.from({ length: LIMITS.maxBlocks + 1 }, (_, index) =>
      block('spacer', `s${index}`),
    );
    expect(codes(validateDocument(createDocument({ blocks })))).toEqual(['too_many_blocks']);
    expect(validateDocument(createDocument({ blocks: blocks.slice(1) }))).toEqual([]);
  });

  it('refuses over-long text anywhere in a block, known field or not', () => {
    const long = 'x'.repeat(LIMITS.maxTextLength + 1);
    const issues = validateDocument(
      createDocument({
        blocks: [
          block('text', 't', { body: long }),
          { ...block('quote', 'q'), note: long } as BuiltInBlock,
          block('name_list', 'n', { items: [{ name: long }] }),
        ],
      }),
    );
    expect(issues.map((issue) => [issue.code, issue.path])).toEqual([
      ['too_long', 'blocks/0/body'],
      ['too_long', 'blocks/1/note'],
      ['too_long', 'blocks/2/items/0/name'],
    ]);
    expect(issues[0]?.message).toBe('Keep each text field to 5,000 characters or fewer.');
  });

  it('refuses colours that are not six-digit hex, and appearance values it does not know', () => {
    const issues = validateDocument(
      createDocument({
        blocks: [
          block('text', 't', {
            style: { background: 'red', textColor: '' },
          }),
          block('quote', 'q', {
            style: { align: 'justify', paddingY: 'huge' } as unknown as BuiltInBlock['style'],
          }),
        ],
      }),
    );
    expect(issues).toEqual([
      {
        code: 'invalid_color',
        message: 'Colours must be six-digit hex values such as #1f2937.',
        blockId: 't',
        path: 'blocks/0/style/background',
      },
      expect.objectContaining({ code: 'invalid_value', path: 'blocks/1/style/align' }),
      expect.objectContaining({ code: 'invalid_value', path: 'blocks/1/style/paddingY' }),
    ]);
  });

  it('keeps the list blocks to their item limits', () => {
    const events = Array.from({ length: 5 }, (_, index) => ({
      title: `E${index}`,
      date: '2026-10-01',
    }));
    const posts = Array.from({ length: 4 }, () => ({ title: 'P', excerpt: '', url: '/p' }));
    const issues = validateDocument(
      createDocument({
        blocks: [
          block('event_tiles', 'e', { items: events }),
          block('post_list', 'p', { items: posts }),
          block('columns', 'c1', { columns: [{ body: 'Only one' }] }),
          block('columns', 'c4', { columns: Array.from({ length: 4 }, () => ({ body: 'x' })) }),
          block('stats', 's1', { items: [{ value: '1', label: 'One' }] }),
          block('stats', 's5', {
            items: Array.from({ length: 5 }, () => ({ value: '1', label: 'One' })),
          }),
          block('photo_grid', 'g1', { photos: [{ alt: 'One' }] }),
          block('photo_grid', 'g7', { photos: Array.from({ length: 7 }, () => ({ alt: 'One' })) }),
        ],
      }),
    );
    expect(issues.map((issue) => [issue.blockId, issue.code, issue.message])).toEqual([
      ['e', 'too_many_items', 'Pick up to 4 events for the event tiles.'],
      ['p', 'too_many_items', 'Pick up to 3 posts.'],
      ['c1', 'too_few_items', 'A columns block needs 2 or 3 columns.'],
      ['c4', 'too_many_items', 'A columns block needs 2 or 3 columns.'],
      ['s1', 'too_few_items', 'A numbers block needs 2 to 4 numbers.'],
      ['s5', 'too_many_items', 'A numbers block needs 2 to 4 numbers.'],
      ['g1', 'too_few_items', 'A photo grid needs 2 to 6 photos.'],
      ['g7', 'too_many_items', 'A photo grid needs 2 to 6 photos.'],
    ]);
  });

  it('requires a button label and link', () => {
    const issues = validateDocument(
      createDocument({ blocks: [block('button', 'b', { label: ' ', url: '' })] }),
    );
    expect(issues.map((issue) => issue.message)).toEqual([
      'Give the button a label.',
      'Give the button a link.',
    ]);
  });

  it('checks dates, images, choices and field types', () => {
    const issues = validateDocument(
      createDocument({
        blocks: [
          block('event_tiles', 'e', { items: [{ title: 'Fair', date: 'next Tuesday' }] }),
          block('image', 'i', { image: { url: 'javascript:alert(1)' }, alt: 'A' }),
          block('image', 'j', { image: { url: '' }, alt: 'B' }),
          block('button', 'b', { variant: 'huge' as 'solid' }),
          { ...block('divider', 'd'), hidden: 'no' } as unknown as BuiltInBlock,
          block('dated_list', 'l', {
            items: [{ date: 'Soon', text: 'x', sortDate: '2026-02-30' }],
          }),
        ],
      }),
    );
    expect(issues.map((issue) => [issue.code, issue.path])).toEqual([
      ['invalid_date', 'blocks/0/items/0/date'],
      ['invalid_image', 'blocks/1/image/url'],
      ['invalid_image', 'blocks/2/image/url'],
      ['invalid_value', 'blocks/3/variant'],
      ['invalid_type', 'blocks/4/hidden'],
      ['invalid_date', 'blocks/5/items/0/sortDate'],
    ]);
  });

  it('accepts an image with only an asset id, for the host to resolve', () => {
    expect(
      validateDocument(
        createDocument({
          blocks: [block('image', 'i', { image: { url: '', assetId: 'a1' }, alt: 'A' })],
        }),
      ),
    ).toEqual([]);
  });

  it('checks the period', () => {
    const issues = validateDocument({
      ...createDocument(),
      period: { start: '2026-09-30', end: '2026-09-01', lookaheadEnd: 'soon' },
    });
    expect(issues).toEqual([
      {
        code: 'invalid_period',
        message: 'The start date is after the end date.',
        path: 'period/start',
      },
      {
        code: 'invalid_period',
        message: 'Choose how far ahead to look for events.',
        path: 'period/lookaheadEnd',
      },
    ]);
  });

  it('validates a block nothing else checked, through its own definition', () => {
    const issues = validateDocument(
      createDocument({
        blocks: [{ id: 'x', type: 'quote', hidden: false } as unknown as BuiltInBlock],
      }),
    );
    expect(issues).toEqual([
      expect.objectContaining({ code: 'invalid_type', path: 'blocks/0/quote', blockId: 'x' }),
    ]);
  });
});

describe('assertValidDocument', () => {
  it('passes a valid document through', () => {
    const doc: unknown = stored(createDocument({ blocks: [createBlock('text')] }));
    assertValidDocument(doc);
    expect(doc.blocks).toHaveLength(1);
  });

  it('throws with every issue attached', () => {
    const doc = createDocument({ blocks: [block('button', 'b', { label: '', url: '' })] });
    try {
      assertValidDocument(doc);
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(BlockletterValidationError);
      const { issues, message, name } = error as BlockletterValidationError;
      expect(name).toBe('BlockletterValidationError');
      expect(issues).toHaveLength(2);
      expect(message).toBe('Give the button a label. (and 1 more problem)');
    }
  });
});

describe('migrateDocument', () => {
  it('returns a version 1 document as it is', () => {
    const doc = createDocument({ subject: 'Hello' });
    expect(migrateDocument(doc)).toBe(doc);
  });

  it('refuses a version it does not know, and things that are not documents', () => {
    expect(() => migrateDocument({ version: 2, blocks: [] })).toThrow(/version 2/);
    expect(() => migrateDocument({ subject: 'No version' })).toThrow(/no format version/);
    expect(() => migrateDocument('text')).toThrow(TypeError);
    expect(() => migrateDocument({ version: 1, blocks: 'none' })).toThrow(/not a list/);
  });
});

describe('validateBrandKit', () => {
  it('accepts the default brand, and one with every field filled', () => {
    expect(validateBrandKit(stored(DEFAULT_BRAND))).toEqual([]);
    expect(
      validateBrandKit({
        ...DEFAULT_BRAND,
        logo: PHOTO,
        contact: {
          address: '12 Example Road',
          phone: '(555) 010-0100',
          email: 'hello@example.test',
          website: 'https://example.test',
        },
        social: [{ network: 'linkedin', url: 'https://linkedin.example/x' }],
      }),
    ).toEqual([]);
  });

  it('says what is wrong with each field, in words a form can show', () => {
    const issues = validateBrandKit({
      name: ' ',
      logo: { url: 'ftp://files.example.test/logo.png' },
      colors: { ink: '#12345', accent: '#0f766e', highlight: 'gold', page: '#f5f5f4' },
      fonts: { heading: 'Comic Sans MS', body: 'Arial' },
      contact: { address: '', phone: '1'.repeat(41), email: 'not-an-email', website: '' },
      social: [{ network: 'myspace', url: '' }],
    });
    expect(issues.map((issue) => [issue.path, issue.message])).toEqual([
      ['name', 'Enter the organisation name.'],
      ['logo/url', 'The logo needs a web address starting with https://.'],
      ['colors/ink', 'Enter the ink colour as a six-digit hex colour such as #1f2937.'],
      ['colors/highlight', 'Enter the highlight colour as a six-digit hex colour such as #1f2937.'],
      [
        'fonts/heading',
        'Choose a heading font from: Georgia, Helvetica, Arial, Verdana, Trebuchet MS, Times New Roman.',
      ],
      ['contact/phone', 'Keep the phone number to 40 characters or fewer.'],
      ['contact/email', 'Enter a valid email address.'],
      [
        'social/0/network',
        'Choose the network from: facebook, instagram, linkedin, x, youtube, tiktok, github, website.',
      ],
      ['social/0/url', 'Add the link.'],
    ]);
  });

  it('refuses something that is not a brand kit', () => {
    expect(codes(validateBrandKit('blue'))).toEqual(['invalid_type']);
    expect(codes(validateBrandKit({ name: 'X' }))).toEqual([
      'invalid_type',
      'invalid_type',
      'invalid_type',
      'invalid_type',
    ]);
  });
});
