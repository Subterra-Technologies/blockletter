import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import Ajv, { type SchemaObject, type ValidateFunction } from 'ajv';
import { describe, expect, it } from 'vitest';
import { SCHEMA_DIR, buildSchemas } from '../scripts/schema';
import {
  BUILT_IN_TEMPLATES,
  DEFAULT_BRAND,
  HEX_COLOR,
  LIMITS,
  applyTemplate,
  assembleDocument,
  blockValidator,
  builtInBlocks,
  createDocument,
  defineBlock,
  templateFromDocument,
  validateBrandKit,
  validateDocument,
  type BlockBase,
  type BlockOfType,
  type BlockStyle,
  type BrandKit,
  type BuiltInBlock,
  type BuiltInBlockType,
  type DataSource,
  type IssuePeriod,
} from '../src';
import { formatCount } from '../src/limits';
import { PHOTO, SAMPLES, block } from './helpers';

/** A schema as committed in `schema/`, which is what the package publishes. */
const committed = (file: string): SchemaObject =>
  JSON.parse(readFileSync(join(SCHEMA_DIR, file), 'utf8')) as SchemaObject;

const ajv = new Ajv({ allErrors: true });
const matchesDocument = ajv.compile(committed('newsletter-document.json'));
const matchesTemplate = ajv.compile(committed('newsletter-template.json'));
const matchesBrandKit = ajv.compile(committed('brand-kit.json'));

/** Where and why the schema refuses `value`; empty when it accepts it. */
const schemaErrors = (matches: ValidateFunction, value: unknown): string[] =>
  matches(value)
    ? []
    : (matches.errors ?? []).map((error) => `${error.instancePath || '/'} ${error.message ?? ''}`);

/** A JSON round trip: a document as storage, or a program in another language, hands it over. */
const stored = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const PERIOD: IssuePeriod = { start: '2026-09-01', end: '2026-09-30', lookaheadEnd: '2026-11-10' };
const BRAND: BrandKit = { ...DEFAULT_BRAND, name: 'Riverside Choir' };

const STYLE: BlockStyle = {
  background: '#fef3c7',
  textColor: '#1f2937',
  align: 'center',
  paddingY: 'loose',
  fontSize: 'large',
  fullWidth: true,
  divider: true,
};
const LINK = { linkLabel: 'Read more', linkUrl: '/more' };

/** What the samples in `helpers.ts` leave out, so that together they fill every field. */
const MORE: { [T in BuiltInBlockType]?: Partial<BlockOfType<BuiltInBlock, T>> } = {
  letter: { photo: { url: '', assetId: 'portrait-1' } },
  event_tiles: {
    items: [
      {
        ref: 'e1',
        title: 'Fair',
        date: '2026-10-03',
        time: '10 AM',
        location: 'Green',
        url: '/fair',
      },
    ],
  },
  sponsors: {
    items: [{ ref: 's1', name: 'Oak Works', message: 'Thank you!', logo: PHOTO, url: '/oak' }],
  },
  name_list: {
    items: [{ ref: 'm1', name: 'Harbor Lane Bakery', detail: 'Bakery', url: '/bakery' }],
  },
  post_list: {
    items: [
      { ref: 'p1', title: 'New hours', excerpt: 'Open Sundays.', url: '/hours', kicker: 'News' },
    ],
  },
  article: { image: PHOTO, ...LINK },
  dated_list: { items: [{ ref: 'c1', date: 'Oct. 2', text: 'Market', sortDate: '2026-10-02' }] },
  text: { body: '<p>We open at <strong>nine</strong>.</p>', format: 'html' },
  image: { linkUrl: '/gallery' },
  image_text: LINK,
  columns: {
    columns: [
      { heading: 'Volunteer', body: 'Give an hour.', image: PHOTO, alt: 'Volunteers', ...LINK },
      { body: 'Every gift helps.' },
    ],
  },
  banner: { ctaLabel: 'See the details', ctaUrl: '/events' },
  footer: {
    social: [{ network: 'instagram', url: 'https://instagram.example/club' }],
    links: [{ label: 'Events', url: '/events' }],
  },
};

/** Every built-in block, with every field it has filled in. */
const everyField = (): BuiltInBlock[] =>
  builtInBlocks.map((definition) => {
    const type = definition.type as BuiltInBlockType;
    const fields = { ...SAMPLES[type].overrides, ...MORE[type], style: STYLE, source: 'notes' };
    return block(type, `b-${type}`, fields as never) as BuiltInBlock;
  });

/** `HeaderBlock.title`, `BlockStyle.align`…: every field `schema` declares, root fields as `root.…`. */
const fieldsOf = (schema: SchemaObject): string[] =>
  [
    ...Object.keys(schema.properties).map((key) => `root.${key}`),
    ...Object.entries<SchemaObject>(schema.definitions).flatMap(([name, definition]) =>
      Object.keys(definition.properties ?? {}).map((key) => `${name}.${key}`),
    ),
  ].sort();

/** The same names for every field `value` sets, found by walking it beside `schema`. */
function fieldsIn(schema: SchemaObject, value: unknown): string[] {
  const found = new Set<string>();
  const definition = (ref: string): [string, SchemaObject] => {
    const name = ref.replace('#/definitions/', '');
    return [name, schema.definitions[name]];
  };
  const walk = (node: SchemaObject, data: unknown, name: string): void => {
    if (typeof node.$ref === 'string') {
      const [ref, target] = definition(node.$ref);
      return walk(target, data, ref);
    }
    if (Array.isArray(data)) return data.forEach((item: unknown) => walk(node.items, item, name));
    if (typeof data !== 'object' || data === null) return;
    if (Array.isArray(node.anyOf)) {
      // A block: the branch for the type it carries.
      const { type } = data as { type?: unknown };
      const branch = node.anyOf.find((option: SchemaObject) =>
        definition(option.$ref)[1].properties.type.enum.includes(type),
      );
      if (branch) walk(branch, data, name);
      return;
    }
    for (const [key, item] of Object.entries(data)) {
      found.add(`${name}.${key}`);
      if (node.properties?.[key]) walk(node.properties[key], item, name);
    }
  };
  walk(schema, value, 'root');
  return [...found].sort();
}

/** One source for each conventional id the built-in templates name. */
const SOURCES: DataSource[] = [
  {
    id: 'events',
    label: 'Events',
    blockType: 'event_tiles',
    items: () => [{ ref: 'e1', title: 'Autumn fair', date: '2026-10-03', time: '10:00 AM' }],
  },
  {
    id: 'sponsors',
    label: 'Sponsors',
    blockType: 'sponsors',
    items: () => [{ ref: 's1', name: 'Oak and Iron Works', message: 'Thank you!', logo: PHOTO }],
  },
  {
    id: 'new_members',
    label: 'New members',
    blockType: 'name_list',
    items: () => [{ ref: 'm1', name: 'Harbor Lane Bakery', detail: 'Bakery · Joined Sept. 3' }],
  },
  {
    id: 'posts',
    label: 'Posts',
    blockType: 'post_list',
    items: () => [{ ref: 'p1', title: 'New hours', excerpt: 'Open on Sundays.', url: '/hours' }],
  },
  {
    id: 'calendar',
    label: 'Calendar',
    blockType: 'dated_list',
    items: () => [{ ref: 'c1', date: 'Oct. 2', text: 'Farmers market', sortDate: '2026-10-02' }],
  },
];

const documentWith = (blocks: unknown[], fields: Record<string, unknown> = {}): unknown =>
  stored({
    ...createDocument({ subject: 'September news', preheader: 'What is on' }),
    blocks,
    ...fields,
  });

/** The keywords the schemas keep to: ones the structured-output APIs of LLMs commonly accept. */
const SUBSET = new Set([
  '$schema',
  '$id',
  'title',
  'description',
  'definitions',
  '$ref',
  'type',
  'properties',
  'required',
  'additionalProperties',
  'items',
  'enum',
  'pattern',
  'anyOf',
]);

/** `schema` and every schema inside it: its definitions, properties, items and branches. */
function* schemasIn(schema: SchemaObject): Generator<SchemaObject> {
  yield schema;
  const children: SchemaObject[] = [
    ...Object.values<SchemaObject>(schema.definitions ?? {}),
    ...Object.values<SchemaObject>(schema.properties ?? {}),
    ...(schema.items ? [schema.items as SchemaObject] : []),
    ...((schema.anyOf as SchemaObject[] | undefined) ?? []),
  ];
  for (const child of children) yield* schemasIn(child);
}

describe('the committed JSON Schemas', () => {
  it('are what the types generate: after changing one, run `npm run schema -w packages/core`', () => {
    const generated = buildSchemas();
    expect(readdirSync(SCHEMA_DIR).sort()).toEqual(generated.map(({ file }) => file).sort());
    for (const { file, schema } of generated) {
      expect(committed(file), `${file} is stale`).toEqual(schema);
    }
  }, 30_000);

  it('say what they are, and name the function that checks what they leave out', () => {
    const document = committed('newsletter-document.json');
    expect(document).toMatchObject({
      $schema: 'http://json-schema.org/draft-07/schema#',
      $id: expect.stringMatching(/^https:\/\/.+\/newsletter-document\.json$/),
      title: 'Blockletter newsletter document',
      type: 'object',
    });
    expect(document.description).toContain('`validateDocument()`');
    // The limits the description quotes are the ones validateDocument enforces.
    expect(document.description).toContain(`${LIMITS.maxBlocks} blocks`);
    expect(document.description).toContain(`${formatCount(LIMITS.maxTextLength)} characters`);
    expect(committed('newsletter-template.json').description).toContain('`validateDocument()`');
    expect(committed('brand-kit.json').description).toContain('`validateBrandKit()`');
  });

  it('carry the colour pattern validateDocument checks', () => {
    const style = committed('newsletter-document.json').definitions.BlockStyle;
    expect(style.properties.background.pattern).toBe(HEX_COLOR.source);
    expect(committed('brand-kit.json').properties.colors.properties.ink.pattern).toBe(
      HEX_COLOR.source,
    );
  });

  it('keep to the part of JSON Schema that structured-output APIs take', () => {
    for (const file of readdirSync(SCHEMA_DIR)) {
      const root = committed(file);
      expect(root.type, file).toBe('object');
      for (const node of schemasIn(root)) {
        expect(
          Object.keys(node).filter((keyword) => !SUBSET.has(keyword)),
          file,
        ).toEqual([]);
        // Draft-07 ignores keywords beside a `$ref`, and some of those APIs refuse them.
        if (node.$ref !== undefined) expect(Object.keys(node), file).toEqual(['$ref']);
        if (node.type === 'object') expect(node.additionalProperties, file).toBe(false);
      }
    }
  });
});

describe('the newsletter document schema', () => {
  it('accepts every block with every field filled, as validateDocument does', () => {
    const doc = stored(
      createDocument({ subject: 'News', preheader: 'On', period: PERIOD, blocks: everyField() }),
    );
    expect(validateDocument(doc)).toEqual([]);
    expect(schemaErrors(matchesDocument, doc)).toEqual([]);
    // Every field the schema declares is in it, so none goes unchecked against validateDocument.
    const schema = committed('newsletter-document.json');
    expect(fieldsIn(schema, doc)).toEqual(fieldsOf(schema));
    expect(schemaErrors(matchesDocument, stored(createDocument()))).toEqual([]);
  });

  it('accepts each built-in template as it starts an issue, blank or assembled for a period', async () => {
    for (const template of BUILT_IN_TEMPLATES) {
      const blank = stored(applyTemplate(template, { period: PERIOD, brand: BRAND }));
      const assembled = stored(
        await assembleDocument(template, { period: PERIOD, brand: BRAND, sources: SOURCES }),
      );
      for (const doc of [blank, assembled]) {
        expect(validateDocument(doc), template.id).toEqual([]);
        expect(schemaErrors(matchesDocument, doc), template.id).toEqual([]);
      }
    }
    const [monthly] = BUILT_IN_TEMPLATES;
    const assembled = await assembleDocument(monthly!, { period: PERIOD, sources: SOURCES });
    expect(assembled.blocks.find((item) => item.type === 'event_tiles')).toMatchObject({
      hidden: false,
      items: [{ ref: 'e1' }],
    });
  });

  it("takes a host's own block once its definition is listed with the built-in ones", () => {
    interface JobBlock extends BlockBase<'job'> {
      title: string;
      url: string;
    }
    const jobBlock = defineBlock<JobBlock>({
      type: 'job',
      label: 'Job opening',
      description: 'A role you are hiring for.',
      group: 'content',
      create: () => ({ title: 'Developer', url: '/careers' }),
      validate: (item, path) =>
        blockValidator(item, path, 'job').string('title').string('url').issues,
      render: (item, ctx) => ctx.section(item, ctx.escape(item.title)),
    });
    const doc = documentWith([{ ...jobBlock.create(), id: 'j', type: 'job', hidden: false }]);
    expect(schemaErrors(matchesDocument, doc)).not.toEqual([]);

    const schema = committed('newsletter-document.json');
    schema.definitions.JobBlock = {
      type: 'object',
      properties: {
        id: { type: 'string' },
        type: { type: 'string', enum: ['job'] },
        hidden: { type: 'boolean' },
        title: { type: 'string' },
        url: { type: 'string' },
      },
      required: ['id', 'type', 'hidden', 'title', 'url'],
      additionalProperties: false,
    };
    schema.definitions.BuiltInBlock.anyOf.push({ $ref: '#/definitions/JobBlock' });
    expect(schemaErrors(new Ajv().compile(schema), doc)).toEqual([]);
    expect(validateDocument(doc, [...builtInBlocks, jobBlock])).toEqual([]);
  });

  const header = block('header', 'h', { title: 'Harbour Notes' });
  const button = block('button', 'b', { label: 'Register', url: '/register' });
  const footer = block('footer', 'f');
  const { title: _title, ...untitled } = header;
  const { subject: _subject, ...unsubjected } = createDocument({ preheader: 'What is on' });

  it.each<[string, unknown]>([
    [
      'a block type it does not know',
      documentWith([header, { id: 'c', type: 'carousel', hidden: false }, footer]),
    ],
    ['a block without a field its type requires', documentWith([untitled, button, footer])],
    ['a document without a subject', stored({ ...unsubjected, blocks: [header, footer] })],
    ['a field of the wrong type', documentWith([header, { ...button, hidden: 'no' }, footer])],
    ['text where a list belongs', documentWith([header, button, { ...footer, links: 'none' }])],
    ['a choice that is not on the list', documentWith([{ ...button, variant: 'huge' }, footer])],
    [
      'a colour that is not six-digit hex',
      documentWith([{ ...header, style: { background: 'red' } }, footer]),
    ],
    [
      'a date not written YYYY-MM-DD',
      documentWith([header, footer], { period: { start: '1 September', end: '2026-09-30' } }),
    ],
    [
      'an image that is only an address',
      documentWith([{ ...block('image', 'i'), image: PHOTO.url }, footer]),
    ],
    ['a format version it cannot read', documentWith([header, footer], { version: 2 })],
  ])('rejects %s, as validateDocument does', (_label, doc) => {
    expect(validateDocument(doc)).not.toEqual([]);
    expect(schemaErrors(matchesDocument, doc)).not.toEqual([]);
  });

  // What the schema's description says validateDocument checks, and JSON Schema does not.
  it.each<[string, unknown]>([
    [
      `more than ${LIMITS.maxBlocks} blocks`,
      documentWith(
        Array.from({ length: LIMITS.maxBlocks + 1 }, (_, n) => block('spacer', `s${n}`)),
      ),
    ],
    [
      'text over the length limit',
      documentWith([block('text', 't', { body: 'x'.repeat(LIMITS.maxTextLength + 1) })]),
    ],
    [
      'more items than a list block takes',
      documentWith([
        block('event_tiles', 'e', {
          items: Array.from({ length: LIMITS.eventTiles + 1 }, (_, n) => ({
            title: `Event ${n}`,
            date: '2026-10-01',
          })),
        }),
      ]),
    ],
    ['two blocks with one id', documentWith([block('text', 'same'), block('quote', 'same')])],
    ['a blank block id', documentWith([block('divider', ' ')])],
    ['a button without a label', documentWith([block('button', 'b', { label: ' ' })])],
    [
      'a date that is not on the calendar',
      documentWith([block('event_tiles', 'e', { items: [{ title: 'Fair', date: '2026-02-30' }] })]),
    ],
    [
      'a period that ends before it starts',
      documentWith([], { period: { start: '2026-09-30', end: '2026-09-01' } }),
    ],
    [
      'an image address that is not a web address',
      documentWith([block('image', 'i', { image: { url: 'javascript:alert(1)' }, alt: 'A' })]),
    ],
  ])('accepts %s, which only validateDocument refuses', (_label, doc) => {
    expect(schemaErrors(matchesDocument, doc)).toEqual([]);
    expect(validateDocument(doc)).not.toEqual([]);
  });

  // Where the schema asks for the canonical form, and validateDocument is more forgiving.
  it.each<[string, unknown]>([
    [
      'a property its type does not declare',
      documentWith([{ ...block('quote', 'q'), colour: 'red' }]),
    ],
    ['a blank colour', documentWith([block('text', 't', { style: { background: '' } })])],
    [
      'a blank sort date',
      documentWith([
        block('dated_list', 'd', { items: [{ date: 'Soon', text: 'Fair', sortDate: '' }] }),
      ]),
    ],
  ])('rejects %s, which validateDocument lets pass', (_label, doc) => {
    expect(validateDocument(doc)).toEqual([]);
    expect(schemaErrors(matchesDocument, doc)).not.toEqual([]);
  });
});

describe('the newsletter template schema', () => {
  it('accepts every built-in template, and one saved from an issue', () => {
    for (const template of BUILT_IN_TEMPLATES) {
      expect(schemaErrors(matchesTemplate, stored(template)), template.id).toEqual([]);
    }
    const issue = applyTemplate(BUILT_IN_TEMPLATES[0]!, { period: PERIOD, brand: BRAND });
    const saved = templateFromDocument(issue, { id: 'ours', name: 'Ours', description: '' });
    expect(schemaErrors(matchesTemplate, stored(saved))).toEqual([]);
  });

  it('rejects a template with a block type it does not know', () => {
    const [template] = BUILT_IN_TEMPLATES;
    const unknown = { ...stored(template), blocks: [{ id: 'c', type: 'carousel', hidden: false }] };
    expect(schemaErrors(matchesTemplate, unknown)).not.toEqual([]);
  });
});

describe('the brand kit schema', () => {
  it('accepts the default brand kit, and one with every field filled', () => {
    const full: BrandKit = {
      ...BRAND,
      logo: { url: 'https://files.example.test/logo.png', assetId: 'logo-1' },
      contact: {
        address: '12 Example Road',
        phone: '(555) 010-0100',
        email: 'hello@example.test',
        website: 'https://example.test',
      },
      social: [{ network: 'linkedin', url: 'https://linkedin.example/x' }],
    };
    for (const brand of [DEFAULT_BRAND, full]) {
      expect(validateBrandKit(stored(brand))).toEqual([]);
      expect(schemaErrors(matchesBrandKit, stored(brand))).toEqual([]);
    }
  });

  it('rejects what validateBrandKit rejects for its shape, and leaves it the rest', () => {
    const misshapen = {
      ...stored(DEFAULT_BRAND),
      colors: { ...DEFAULT_BRAND.colors, ink: 'navy' },
      fonts: { heading: 'Comic Sans MS', body: 'Arial' },
    };
    expect(validateBrandKit(misshapen)).not.toEqual([]);
    expect(schemaErrors(matchesBrandKit, misshapen)).not.toEqual([]);

    const unnamed = { ...stored(DEFAULT_BRAND), name: ' ' };
    expect(schemaErrors(matchesBrandKit, unnamed)).toEqual([]);
    expect(validateBrandKit(unnamed)).not.toEqual([]);
  });
});
