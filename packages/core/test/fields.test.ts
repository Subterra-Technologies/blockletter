import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import Ajv from 'ajv';
import { describe, expect, expectTypeOf, it } from 'vitest';
import { SCHEMA_DIR } from '../scripts/schema';
import {
  blockJsonSchema,
  builtInBlocks,
  calloutBlock,
  createBlock,
  createDocument,
  defineBlock,
  field,
  fieldLabel,
  fieldsJsonSchema,
  renderEmail,
  validateDocument,
  type BlockOf,
  type CalloutBlock,
  type ImageRef,
  type JsonSchema,
  type Link,
} from '../src';

const jobBlock = defineBlock({
  type: 'job',
  label: 'Job opening',
  description: 'A role you are hiring for, with an apply button.',
  group: 'content',
  fields: {
    title: field.text({ default: 'Full stack developer', max: 120, required: true }),
    location: field.text({ default: 'Remote' }),
    summary: field.markdown(),
    url: field.url({ label: 'Apply link' }),
    logo: field.image(),
    level: field.choice({ options: ['junior', 'senior', { value: 'lead', label: 'Team lead' }] }),
    openings: field.number({ min: 1, max: 9, integer: true }),
    remote: field.toggle({ label: 'Remote friendly', default: true }),
    closes: field.date({ optional: true }),
    accent: field.color(),
    apply: field.link({ default: { label: 'Apply', url: '' } }),
    perks: field.list({
      item: { name: field.text(), detail: field.text({ optional: true }) },
      min: 1,
      max: 4,
      itemLabel: 'perk',
    }),
  },
  render: (block, ctx) => ctx.section(block, ctx.heading(block.title, { size: 20 })),
});

type JobBlock = BlockOf<typeof jobBlock>;

const valid = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  id: 'j1',
  type: 'job',
  hidden: false,
  ...jobBlock.create(),
  ...overrides,
});

const codes = (block: unknown): string[] =>
  jobBlock.validate(block, 'blocks/0').map((issue) => `${issue.code} ${issue.path ?? ''}`);

describe('a block declared by its fields', () => {
  it('has the type its fields describe', () => {
    expectTypeOf<JobBlock['title']>().toEqualTypeOf<string>();
    expectTypeOf<JobBlock['logo']>().toEqualTypeOf<ImageRef | undefined>();
    expectTypeOf<JobBlock['level']>().toEqualTypeOf<'junior' | 'senior' | 'lead'>();
    expectTypeOf<JobBlock['openings']>().toEqualTypeOf<number>();
    expectTypeOf<JobBlock['remote']>().toEqualTypeOf<boolean>();
    expectTypeOf<JobBlock['closes']>().toEqualTypeOf<string | undefined>();
    expectTypeOf<JobBlock['apply']>().toEqualTypeOf<Link>();
    expectTypeOf<JobBlock['perks']>().toEqualTypeOf<{ name: string; detail?: string }[]>();
    expectTypeOf<JobBlock['type']>().toEqualTypeOf<'job'>();
    expectTypeOf<(typeof jobBlock.fields)['title']['optional']>().toEqualTypeOf<false>();
    expectTypeOf<(typeof jobBlock.fields)['closes']['optional']>().toEqualTypeOf<true>();
  });

  it('starts from each default, or the kind’s own blank, leaving optional fields out', () => {
    expect(jobBlock.create()).toEqual({
      title: 'Full stack developer',
      location: 'Remote',
      summary: '',
      url: '',
      level: 'junior',
      openings: 1,
      remote: true,
      accent: '',
      apply: { label: 'Apply', url: '' },
      perks: [{ name: '' }],
    });
  });

  it('copies its defaults, so two blocks never share a list', () => {
    const first = jobBlock.create();
    first.perks.push({ name: 'Bikes' });
    first.apply.url = 'https://example.test';
    expect(jobBlock.create().perks).toHaveLength(1);
    expect(jobBlock.create().apply.url).toBe('');
  });

  it('accepts a fresh block, and one with its optional fields set', () => {
    expect(jobBlock.validate(valid(), 'blocks/0')).toEqual([]);
    expect(
      jobBlock.validate(
        valid({ closes: '2026-12-01', logo: { url: 'https://example.test/l.png' } }),
        'blocks/0',
      ),
    ).toEqual([]);
  });

  it('reports every field that is wrong, where it is', () => {
    expect(
      codes(
        valid({
          title: ' ',
          summary: 4,
          level: 'intern',
          openings: 2.5,
          remote: 'yes',
          closes: '2026-02-30',
          accent: 'red',
          logo: { url: 'ftp://x' },
          apply: { label: 'Apply' },
          perks: [{ name: 'Bikes', detail: 3 }, 'x'],
        }),
      ),
    ).toEqual([
      'required blocks/0/title',
      'invalid_type blocks/0/summary',
      'invalid_image blocks/0/logo/url',
      'invalid_value blocks/0/level',
      'invalid_value blocks/0/openings',
      'invalid_type blocks/0/remote',
      'invalid_date blocks/0/closes',
      'invalid_color blocks/0/accent',
      'invalid_type blocks/0/apply/url',
      'invalid_type blocks/0/perks/0/detail',
      'invalid_type blocks/0/perks/1',
    ]);
  });

  it('words its messages from the field’s label', () => {
    const messages = jobBlock
      .validate(valid({ url: 1, openings: 12, perks: [] }), 'blocks/0')
      .map((issue) => issue.message);
    expect(messages).toEqual([
      'The apply link should be text.',
      'The openings should be from 1 to 9.',
      'Add at least 1 perk.',
    ]);
  });

  it('still checks what every block has, and the text-length cap', () => {
    expect(codes({ ...valid(), id: '', type: 'other' })).toEqual([
      'required blocks/0/id',
      'invalid_type blocks/0/type',
    ]);
    expect(codes(valid({ location: 'x'.repeat(6000) }))).toContain('too_long blocks/0/location');
    expect(codes('nope')).toEqual(['invalid_type blocks/0']);
  });

  it('runs its own checks after the fields’', () => {
    const range = defineBlock({
      type: 'range',
      label: 'Range',
      description: 'From and to.',
      group: 'content',
      fields: { from: field.number(), to: field.number() },
      validate(check) {
        const { from, to } = check.value;
        if (typeof from === 'number' && typeof to === 'number' && to < from) {
          check.add('invalid_value', 'End after the start.', 'to');
        }
      },
      render: () => '',
    });
    const block = { id: 'r', type: 'range', hidden: false, from: 5, to: 2 };
    expect(range.validate(block, '')).toEqual([
      { code: 'invalid_value', message: 'End after the start.', blockId: 'r', path: 'to' },
    ]);
  });

  it('sums itself up from its first text field with words in it', () => {
    expect(jobBlock.summary?.(valid({ title: 'Designer' }) as unknown as JobBlock)).toBe('Designer');
    const notes = defineBlock({
      type: 'notes',
      label: 'Notes',
      description: 'Notes.',
      group: 'content',
      fields: { heading: field.text(), body: field.markdown() },
      render: () => '',
    });
    const block = {
      ...createBlock<BlockOf<typeof notes>>('notes', [notes]),
      body: 'Some **bold** words',
    };
    expect(notes.summary?.(block)).toBe('Some bold words');
  });

  it('renders through a document like any other block', () => {
    const definitions = [...builtInBlocks, jobBlock];
    const doc = createDocument({ subject: 'Jobs', blocks: [createBlock('job', definitions)] });
    expect(validateDocument(doc, definitions)).toEqual([]);
    expect(renderEmail(doc, { definitions }).html).toContain('Full stack developer');
  });

  it('refuses a field that would clash with what every block has, or an unusable name', () => {
    const declare = (fields: Record<string, ReturnType<typeof field.text>>) => () =>
      defineBlock({
        type: 'x',
        label: 'X',
        description: '',
        group: 'content',
        fields,
        render: () => '',
      });
    expect(declare({ id: field.text() })).toThrow('cannot have a field called "id"');
    expect(declare({ style: field.text() })).toThrow('cannot have a field called "style"');
    expect(declare({ 'my-field': field.text() })).toThrow('letters, digits and _');
    expect(() => field.list({ item: { 'a b': field.text() } })).toThrow('letters, digits and _');
    expect(() => field.choice({ options: [] })).toThrow('at least one option');
  });

  it('keeps a definition written part by part exactly as it was', () => {
    const definition = builtInBlocks.find((candidate) => candidate.type === 'text');
    expect(definition && defineBlock(definition)).toBe(definition);
  });
});

describe('field labels', () => {
  it('come from the label, or the key in words', () => {
    expect(fieldLabel('ctaUrl', field.url())).toBe('Cta url');
    expect(fieldLabel('url', field.url({ label: 'Apply link' }))).toBe('Apply link');
  });

  it('keep an abbreviation’s capitals inside a message', () => {
    const block = defineBlock({
      type: 'u',
      label: 'U',
      description: '',
      group: 'content',
      fields: { address: field.url({ label: 'URL', required: true }) },
      render: () => '',
    });
    expect(block.validate({ id: 'u', type: 'u', hidden: false, address: '' }, '')).toMatchObject([
      { message: 'Add the URL.' },
    ]);
  });
});

describe('custom fields', () => {
  const rating = field.custom({
    default: { stars: 3 },
    label: 'Rating',
    schema: { type: 'object', properties: { stars: { type: 'integer' } } },
    validate(check, key, label) {
      const value = check.value[key] as { stars?: unknown } | undefined;
      if (typeof value?.stars !== 'number')
        check.add('invalid_value', `The ${label} needs stars.`, key);
    },
  });
  const review = defineBlock({
    type: 'review',
    label: 'Review',
    description: '',
    group: 'content',
    fields: {
      rating,
      note: field.custom({
        default: 1,
        optional: true,
        validate: () => {
          throw new Error('not called when absent');
        },
      }),
    },
    render: () => '',
  });

  it('start from their default and run their own checks', () => {
    expectTypeOf<BlockOf<typeof review>['rating']>().toEqualTypeOf<{ stars: number }>();
    expect(review.create()).toEqual({ rating: { stars: 3 }, note: 1 });
    const block = { id: 'r', type: 'review', hidden: false, rating: {} };
    expect(review.validate(block, '')).toMatchObject([
      { code: 'invalid_value', message: 'The rating needs stars.', path: 'rating' },
    ]);
  });

  it('describe themselves with their own schema', () => {
    expect(fieldsJsonSchema({ rating }).properties).toEqual({
      rating: {
        type: 'object',
        properties: { stars: { type: 'integer' } },
        description: 'Rating',
      },
    });
  });
});

describe('a block’s JSON Schema', () => {
  const ajv = new Ajv({ allErrors: true });
  const schema = blockJsonSchema(jobBlock);
  const matches = ajv.compile(schema ?? {});

  it('accepts a fresh block and one with every optional field set', () => {
    expect(matches(valid())).toBe(true);
    expect(
      matches(
        valid({
          closes: '2026-12-01',
          logo: { url: 'https://example.test/l.png', assetId: 'a1' },
          style: { background: '#ffffff', align: 'center' },
          source: 'jobs',
        }),
      ),
    ).toBe(true);
  });

  it('rejects the shapes validation rejects, and anything undeclared', () => {
    for (const overrides of [
      { level: 'intern' },
      { openings: 2.5 },
      { openings: 10 },
      { accent: 'red' },
      { closes: '1 Dec' },
      { perks: [] },
      { perks: [{ name: 'a', extra: 1 }] },
      { apply: { label: 'Apply' } },
      { salary: 'lots' },
      { title: 'x'.repeat(121) },
    ]) {
      expect(matches(valid(overrides)), JSON.stringify(overrides)).toBe(false);
    }
    expect(matches({ ...valid(), id: undefined })).toBe(false);
  });

  it('describes each field by its label, help and what it takes', () => {
    const properties = schema?.properties as Record<string, JsonSchema>;
    expect(properties.url?.description).toMatch(/^Apply link\. An absolute address/);
    expect(properties.summary?.description).toMatch(/^Summary\. Markdown:/);
    expect(properties.type).toEqual({ type: 'string', enum: ['job'] });
    expect(schema?.required).toEqual([
      'id',
      'type',
      'hidden',
      'title',
      'location',
      'summary',
      'url',
      'level',
      'openings',
      'remote',
      'accent',
      'apply',
      'perks',
    ]);
  });

  it('is the same shape as the generated one for a built-in declared by its fields', () => {
    const generated = JSON.parse(
      readFileSync(join(SCHEMA_DIR, 'newsletter-document.json'), 'utf8'),
    ) as { definitions: Record<string, JsonSchema> };
    const strip = (value: unknown): unknown =>
      Array.isArray(value)
        ? value.map(strip)
        : typeof value === 'object' && value !== null
          ? Object.fromEntries(
              Object.entries(value)
                .filter(([key]) => key !== 'description')
                .map(([key, item]) => [key, strip(item)]),
            )
          : value;
    const ours = strip(blockJsonSchema(calloutBlock)) as JsonSchema;
    const theirs = strip(generated.definitions.CalloutBlock) as JsonSchema;
    expect({ ...ours, properties: { ...(ours.properties as object), style: 'style' } }).toEqual({
      ...theirs,
      properties: { ...(theirs.properties as object), style: 'style' },
    });
    expect(strip((ours.properties as JsonSchema).style)).toEqual(
      strip(generated.definitions.BlockStyle),
    );
  });

  it('is undefined for a block written part by part', () => {
    expect(blockJsonSchema(builtInBlocks[0]!)).toBeUndefined();
  });
});

describe('the callout block, declared by its fields', () => {
  it('has the shape of CalloutBlock', () => {
    expectTypeOf<BlockOf<typeof calloutBlock>>().toEqualTypeOf<CalloutBlock>();
  });

  it('starts and validates as it did when written part by part', () => {
    expect(calloutBlock.create()).toEqual({
      heading: 'Have news to share?',
      body: 'Opening a new location, celebrating an anniversary or hiring? Send us your news and we will share it in a future issue.',
      ctaLabel: 'Share your news',
      ctaUrl: '',
    });
    const block = { ...createBlock('callout'), ctaLabel: 1, ctaUrl: 2, heading: 3 };
    expect(calloutBlock.validate(block, 'blocks/0').map((issue) => issue.message)).toEqual([
      'The heading should be text.',
      'The button label should be text.',
      'The button link should be text.',
    ]);
  });
});
