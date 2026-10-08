import { describe, expect, it } from 'vitest';
import {
  LIMITS,
  PERIOD_ERROR_MESSAGES,
  blockIssueDetails,
  blockIssues,
  builtInBlocks,
  createDocument,
  defineBlock,
  imageBlock,
  periodErrorCodes,
  periodErrors,
  renderEmail,
  validateBrandKit,
  validateDocument,
  type BlockBase,
  type BuiltInBlock,
  type IssuePeriod,
} from '../src';
import { PHOTO, UNSUBSCRIBE_URL, block } from './helpers';

/**
 * Every sentence core writes for a person also comes with a stable code and the values in it, so
 * an editor in another language can say the same thing in its own words. The English stays
 * exactly as it was; these pin the codes and values beside it.
 */

const long = 'x'.repeat(LIMITS.maxTextLength + 1);

describe('period error codes', () => {
  const TODAY = '2026-09-28';
  const period = (overrides: Partial<IssuePeriod> = {}): IssuePeriod => ({
    start: '2026-09-01',
    end: '2026-09-28',
    lookaheadEnd: '2026-11-09',
    ...overrides,
  });

  it('names each problem by field', () => {
    expect(periodErrorCodes(period(), { today: TODAY })).toEqual({});
    expect(periodErrorCodes({ start: '', end: '', lookaheadEnd: '' }, { today: TODAY })).toEqual({
      start: 'missing_start',
      end: 'missing_end',
      lookaheadEnd: 'missing_lookahead',
    });
    expect(periodErrorCodes(period({ end: '2026-09-29' }), { today: TODAY })).toEqual({
      end: 'end_after_today',
    });
    expect(periodErrorCodes(period({ start: '2026-09-30' }), { today: TODAY })).toEqual({
      start: 'start_after_end',
    });
    expect(periodErrorCodes(period({ lookaheadEnd: '2026-09-01' }))).toEqual({
      lookaheadEnd: 'lookahead_before_end',
    });
  });

  it('is what periodErrors words, field for field', () => {
    for (const candidate of [
      period({ start: '', end: '', lookaheadEnd: '' }),
      period({ end: '2026-09-29' }),
      period({ start: '2026-09-30', lookaheadEnd: '2026-09-01' }),
    ]) {
      const codes = periodErrorCodes(candidate, { today: TODAY });
      const words = Object.fromEntries(
        Object.entries(codes).map(([field, code]) => [field, PERIOD_ERROR_MESSAGES[code]]),
      );
      expect(periodErrors(candidate, { today: TODAY })).toEqual(words);
    }
  });
});

describe('validation values', () => {
  it('gives the limit with a message that names one', () => {
    const issues = validateBrandKit({
      name: 'n'.repeat(121),
      colors: { ink: '#1f2937', accent: '#0f766e', highlight: '#f59e0b', page: '#f5f5f4' },
      fonts: { heading: 'Georgia', body: 'Arial' },
      contact: { address: 'a'.repeat(201), phone: '', email: '', website: '' },
      social: [],
    });
    expect(issues.map(({ path, code, values }) => [path, code, values])).toEqual([
      ['name', 'too_long', { max: 120 }],
      ['contact/address', 'too_long', { max: 200 }],
    ]);
  });

  it('says which part of an image is wrong', () => {
    const problems = [
      { logo: 'logo.png' },
      { logo: { url: 'https://example.test/logo.png', assetId: 7 } },
      { logo: { assetId: 'a1' } },
      { logo: { url: 'ftp://example.test/logo.png' } },
      { logo: { url: ' ' } },
    ].map(({ logo }) =>
      validateBrandKit({
        name: 'Example',
        logo,
        colors: { ink: '#1f2937', accent: '#0f766e', highlight: '#f59e0b', page: '#f5f5f4' },
        fonts: { heading: 'Georgia', body: 'Arial' },
        contact: { address: '', phone: '', email: '', website: '' },
        social: [],
      }).map((issue) => [issue.path, issue.code, issue.values?.problem]),
    );
    expect(problems).toEqual([
      [['logo', 'invalid_image', 'unreadable']],
      [['logo/assetId', 'invalid_image', 'asset_id']],
      [['logo/url', 'invalid_image', 'not_text']],
      [['logo/url', 'invalid_image', 'not_web']],
      [['logo/url', 'invalid_image', 'no_address']],
    ]);
  });

  it('gives item limits with a list that has too few or too many', () => {
    const issues = validateDocument(
      createDocument({
        blocks: [
          block('columns', 'c', { columns: [{ body: 'Only one' }] }),
          block('post_list', 'p', {
            items: Array.from({ length: 4 }, () => ({ title: 'P', excerpt: '', url: '/p' })),
          }),
          block('text', 't', { body: long }),
        ],
      }),
    );
    expect(issues.map(({ code, values }) => [code, values])).toEqual([
      ['too_few_items', { min: 2, max: 3 }],
      ['too_many_items', { max: 3 }],
      ['too_long', { max: LIMITS.maxTextLength }],
    ]);
  });
});

/** A built-in block of every kind, each set up to have every warning its definition can give. */
const troubled: BuiltInBlock[] = [
  block('image', 'i', { image: PHOTO, alt: '' }),
  block('banner', 'b', { image: PHOTO, alt: '' }),
  block('article', 'a', { body: long, image: PHOTO, title: '' }),
  block('letter', 'l', { body: long, photo: PHOTO, signature: '' }),
  block('text', 't', { body: long }),
  block('quote', 'q', { quote: long }),
  block('image_text', 'it', { body: long, image: PHOTO, alt: '' }),
  block('columns', 'c', { columns: [{ body: long, image: PHOTO }] }),
  block('photo_grid', 'g', { photos: [{ alt: '', image: PHOTO }] }),
  block('sponsors', 's', { items: [{ name: ' ', message: 'Thanks', logo: PHOTO }] }),
  block('event_tiles', 'e', {
    items: Array.from({ length: 5 }, (_, index) => ({ title: `E${index}`, date: '2026-10-01' })),
  }),
  block('post_list', 'p', {
    items: Array.from({ length: 4 }, () => ({ title: 'P', excerpt: '', url: '/p' })),
  }),
  block('stats', 'n', { items: [{ value: '1', label: 'One' }] }),
  block('button', 'bt', { label: ' ', url: '' }),
  block('callout', 'co', { ctaLabel: 'Go', ctaUrl: '' }),
  block('callout', 'cu', { ctaLabel: '', ctaUrl: '/go' }),
];

describe('block issue details', () => {
  it('codes every warning a built-in block gives, in the same words', () => {
    for (const item of troubled) {
      const details = blockIssueDetails(item);
      expect(details.length, item.type).toBeGreaterThan(0);
      expect(details.map((detail) => detail.message)).toEqual(blockIssues(item));
      for (const detail of details) expect(detail.code, detail.message).toMatch(/^[a-z_]+$/);
    }
  });

  it('gives the field and the limit with text that is too long', () => {
    expect(blockIssueDetails(block('columns', 'c', { columns: [{ body: long }] }))).toEqual([
      {
        code: 'column_count',
        message: 'Use 2 or 3 columns.',
        values: { min: 2, max: 3 },
      },
      {
        code: 'too_long',
        message: 'Keep the column text to 5,000 characters or fewer.',
        values: { field: 'column_text', max: LIMITS.maxTextLength },
      },
    ]);
  });

  it('codes the counts and missing words of the list and button blocks', () => {
    const codes = troubled.map((item) => [
      item.id,
      blockIssueDetails(item).map((detail) => detail.code),
    ]);
    expect(Object.fromEntries(codes)).toEqual({
      i: ['missing_alt'],
      b: ['missing_alt'],
      a: ['too_long', 'missing_title'],
      l: ['too_long', 'missing_signature'],
      t: ['too_long'],
      q: ['too_long'],
      it: ['too_long', 'missing_alt'],
      c: ['column_count', 'too_long', 'missing_alt'],
      g: ['photo_count', 'missing_photo_alt'],
      s: ['missing_sponsor_name'],
      e: ['too_many_events'],
      p: ['too_many_posts'],
      n: ['number_count'],
      bt: ['missing_button_label', 'missing_button_link'],
      co: ['missing_callout_link'],
      cu: ['missing_button_label'],
    });
  });

  it('keeps a host’s own words, uncoded, wherever it wrote the issues itself', () => {
    interface NoteBlock extends BlockBase<'note'> {
      text: string;
    }
    const note = defineBlock<NoteBlock>({
      type: 'note',
      label: 'Note',
      description: 'A note.',
      group: 'content',
      create: () => ({ text: '' }),
      validate: () => [],
      issues: (item) => (item.text ? [] : ['Write the note.']),
      render: () => '',
    });
    const own = { ...imageBlock, issues: () => ['Pick a photo from the library.'] };
    const empty = { id: 'n', type: 'note', hidden: false, text: '' };
    expect(blockIssueDetails(empty, [note])).toEqual([{ message: 'Write the note.' }]);
    expect(blockIssueDetails(block('image', 'i'), [own])).toEqual([
      { message: 'Pick a photo from the library.' },
    ]);
    // A built-in spread into a host's definition keeps its codes.
    const spread = { ...imageBlock, label: 'Picture' };
    expect(blockIssueDetails(troubled[0] as BuiltInBlock, [spread])[0]?.code).toBe('missing_alt');
    expect(blockIssueDetails(block('divider', 'd'), builtInBlocks)).toEqual([]);
  });
});

describe('render warning details', () => {
  const send = (blocks: BlockBase[], options: Parameters<typeof renderEmail>[1] = {}) =>
    renderEmail(createDocument<BlockBase>({ subject: 'S', preheader: '', blocks }), options);

  it('codes each warning, in the same words and order', () => {
    const { warnings, warningDetails } = send([
      block('image', 'i', { image: { url: 'blob:https://example.test/1' }, alt: '' }),
      block('button', 'b', { label: 'Go', url: '/go' }),
      { id: 'x', type: 'carousel', hidden: false },
    ]);
    expect(warningDetails.map((warning) => warning.message)).toEqual(warnings);
    expect(warningDetails.map(({ code, values }) => [code, values])).toEqual([
      ['no_unsubscribe_url', undefined],
      ['local_image', undefined],
      ['missing_alt', { type: 'image', label: 'Image' }],
      ['relative_link', undefined],
      ['unknown_block', { type: 'carousel' }],
    ]);
  });

  it('gives the size of an email Gmail would clip', () => {
    const body = 'Words that go on. '.repeat(240);
    const { warningDetails } = send(
      Array.from({ length: 30 }, (_, index) => block('text', `t${index}`, { body })),
      { unsubscribeUrl: UNSUBSCRIBE_URL },
    );
    const clip = warningDetails.find((warning) => warning.code === 'gmail_clip');
    expect(clip?.values?.kilobytes).toEqual(expect.any(Number));
    expect(clip?.message).toContain(`this one is ${clip?.values?.kilobytes} KB`);
  });

  it('leaves a block’s own warning uncoded', () => {
    interface LoudBlock extends BlockBase<'loud'> {
      text: string;
    }
    const loud = defineBlock<LoudBlock>({
      type: 'loud',
      label: 'Loud',
      description: 'A loud line.',
      group: 'content',
      create: () => ({ text: '' }),
      validate: () => [],
      render: (_item, ctx) => {
        ctx.warn('Keep it down.');
        return '';
      },
    });
    const shout: LoudBlock = { id: 'l', type: 'loud', hidden: false, text: '' };
    const { warningDetails } = renderEmail(createDocument<BlockBase>({ blocks: [shout] }), {
      definitions: [loud],
      unsubscribeUrl: UNSUBSCRIBE_URL,
    });
    expect(warningDetails).toEqual([{ message: 'Keep it down.' }]);
  });
});
