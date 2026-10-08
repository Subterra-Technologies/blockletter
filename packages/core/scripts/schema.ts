/**
 * Generates the JSON Schemas in `schema/` from the types in `src/types.ts`, so other languages and
 * AI tools can produce documents, templates and brand kits that Blockletter reads. After changing
 * one of those types, run `npm run schema -w packages/core` and commit what it writes;
 * `test/schema.test.ts` fails while a committed schema is stale.
 *
 * The schemas are JSON Schema draft-07, the version with the widest support, shaped for the
 * structured-output modes of LLM APIs, which take only part of JSON Schema: each root is an
 * object, every object rejects properties its type does not declare, every `$ref` stands alone
 * (draft-07 ignores keywords beside one, and some of those APIs refuse them), and a constant is a
 * one-value `enum`: every such API documents `enum`, and not all of them `const`.
 *
 * They describe shape and format. The rules (limits, real dates, image addresses, unique ids)
 * stay with the runtime validators, which each schema's description names.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { format, resolveConfig } from 'prettier';
import { createGenerator, type Schema } from 'ts-json-schema-generator';

/** A schema as plain JSON, keyword by keyword. */
export type JsonSchema = Record<string, unknown>;

const packageDir = fileURLToPath(new URL('..', import.meta.url));

/** Where the schemas are written; the package exports this folder as `./schema/*`. */
export const SCHEMA_DIR = join(packageDir, 'schema');

/** The files on the default branch, so each schema's `$id` also fetches it. */
const ID_BASE =
  'https://raw.githubusercontent.com/Subterra-Technologies/blockletter/main/packages/core/schema/';

const PACKAGE = '`@subterra-technologies/blockletter`';

interface SchemaSpec {
  file: string;
  /** The alias in `schema-roots.ts` the schema starts from. */
  root: string;
  title: string;
  /** Follows the type's own description: what the schema covers, and what checks the rest. */
  scope: string;
}

const SPECS: readonly SchemaSpec[] = [
  {
    file: 'newsletter-document.json',
    root: 'DocumentSchemaRoot',
    title: 'Blockletter newsletter document',
    scope:
      `Format version 1 with the built-in blocks, generated from the TypeScript types in ${PACKAGE}. ` +
      'A document that matches this schema must still pass `validateDocument()` from that package ' +
      'before it is stored or rendered: that function is the source of truth for the rules this ' +
      'schema leaves out. They are: at most 30 blocks; no text longer than 5,000 characters; the ' +
      'number of items each list block takes; block ids that are unique and not blank; a label ' +
      'and a link on every button; real calendar dates, in a period that does not end before it ' +
      'starts; and image addresses that are http(s) URLs, or blank beside an `assetId` the host ' +
      'resolves.',
  },
  {
    file: 'newsletter-template.json',
    root: 'TemplateSchemaRoot',
    title: 'Blockletter newsletter template',
    scope:
      `Generated from the TypeScript types in ${PACKAGE}, with the built-in blocks. A template ` +
      'becomes a document through `applyTemplate()` or `assembleDocument()` from that package, and ' +
      'that document must still pass `validateDocument()`, the source of truth for the rules this ' +
      'schema leaves out: limits, unique block ids, real dates and image addresses.',
  },
  {
    file: 'brand-kit.json',
    root: 'BrandKitSchemaRoot',
    title: 'Blockletter brand kit',
    scope:
      `Generated from the TypeScript types in ${PACKAGE}. A brand kit that matches this schema ` +
      'must still pass `validateBrandKit()` from that package, the source of truth for the rules ' +
      'this schema leaves out: a name that is not blank, the length of each field, an email ' +
      'address that looks like one, and a logo address that is an http(s) URL, or blank beside ' +
      'an `assetId` the host resolves.',
  },
];

const isSchema = (value: unknown): value is JsonSchema =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** `schema` rebuilt with `visit` applied to it and to every schema inside it, innermost first. */
function mapSchemas(schema: JsonSchema, visit: (node: JsonSchema) => JsonSchema): JsonSchema {
  const map = (value: unknown): unknown => (isSchema(value) ? mapSchemas(value, visit) : value);
  const node: JsonSchema = { ...schema };
  for (const key of ['properties', 'definitions']) {
    const schemas = node[key];
    if (isSchema(schemas)) {
      node[key] = Object.fromEntries(
        Object.entries(schemas).map(([name, value]) => [name, map(value)]),
      );
    }
  }
  for (const key of ['items', 'additionalProperties', 'not', 'anyOf', 'allOf', 'oneOf']) {
    const value = node[key];
    if (value !== undefined) node[key] = Array.isArray(value) ? value.map(map) : map(value);
  }
  return visit(node);
}

const DEFINITIONS = '#/definitions/';

/** `HexColor` for `#/definitions/HexColor`; undefined for anything else. */
const definitionName = (ref: unknown): string | undefined =>
  typeof ref === 'string' && ref.startsWith(DEFINITIONS)
    ? decodeURIComponent(ref.slice(DEFINITIONS.length))
    : undefined;

/**
 * The generator's schema for `spec`, reshaped: the root type written out at the root, each string
 * type with a pattern or a set of values (`HexColor`, `BlockAlign`, `BrandFont`…) written out where
 * it is used, constants as one-value enums, and `required` in the order the properties appear.
 */
function finish(generated: JsonSchema, spec: SchemaSpec): JsonSchema {
  const definitions = { ...(generated.definitions as Record<string, JsonSchema>) };
  const rootName = definitionName(generated.$ref);
  const root = rootName === undefined ? undefined : definitions[rootName];
  if (rootName === undefined || root === undefined) {
    throw new Error(`${spec.file}: the generator's root is not a reference to a definition.`);
  }
  delete definitions[rootName];

  // Written out in place, a field's own description sits beside the type's pattern or values
  // instead of beside a `$ref`, where draft-07 would ignore it.
  const scalars = new Map<string, JsonSchema>();
  for (const [name, definition] of Object.entries(definitions)) {
    if (typeof definition.type === 'string' && definition.type !== 'object') {
      scalars.set(name, definition);
      delete definitions[name];
    }
  }

  const inline = (node: JsonSchema): JsonSchema => {
    const { $ref, ...keywords } = node;
    const name = definitionName($ref);
    if (name === undefined) return node;
    const target = scalars.get(name);
    // The field's own keywords (its description) win over the type's.
    if (target) return { ...target, ...keywords };
    if (Object.keys(keywords).length > 0) {
      throw new Error(
        `${spec.file}: a reference to ${name} carries ${Object.keys(keywords).join(', ')}. ` +
          'Document the type rather than the field: draft-07 ignores keywords beside a `$ref`, ' +
          'and some structured-output APIs refuse them.',
      );
    }
    return node;
  };

  const tidy = (node: JsonSchema): JsonSchema => {
    const tidied = Object.fromEntries(
      Object.entries(node).map(([keyword, value]) =>
        keyword === 'const' ? ['enum', [value]] : [keyword, value],
      ),
    );
    const { properties, required } = tidied;
    if (isSchema(properties) && Array.isArray(required)) {
      const order = Object.keys(properties);
      tidied.required = [...(required as string[])].sort(
        (a, b) => order.indexOf(a) - order.indexOf(b),
      );
    }
    return tidied;
  };

  const { description, ...body } = mapSchemas(mapSchemas({ ...root, definitions }, inline), tidy);
  return {
    $schema: generated.$schema,
    $id: `${ID_BASE}${spec.file}`,
    title: spec.title,
    description: typeof description === 'string' ? `${description} ${spec.scope}` : spec.scope,
    ...body,
  };
}

/** Every schema, generated from the types as they are now. Takes a second or so. */
export function buildSchemas(): { file: string; schema: JsonSchema }[] {
  const generator = createGenerator({
    path: join(packageDir, 'scripts', 'schema-roots.ts'),
    // Absolute: from a relative path the generator does not find `@types/node`.
    tsconfig: join(packageDir, 'tsconfig.json'),
    topRef: false,
    // Declaration order: the order a person reads the type in, and the order a model writes it.
    sortProps: false,
    additionalProperties: false,
  });
  // A plain JSON copy, so the reshaping works on data rather than the generator's own types.
  const plain = (schema: Schema): JsonSchema => JSON.parse(JSON.stringify(schema)) as JsonSchema;
  return SPECS.map((spec) => ({
    file: spec.file,
    schema: finish(plain(generator.createSchema(spec.root)), spec),
  }));
}

/** A schema as it is committed: Prettier's JSON, so `npm run format:check` passes. */
async function formatSchema(schema: JsonSchema, path: string): Promise<string> {
  const options = await resolveConfig(path);
  return format(JSON.stringify(schema), { ...options, filepath: path });
}

async function writeSchemas(): Promise<void> {
  await mkdir(SCHEMA_DIR, { recursive: true });
  for (const { file, schema } of buildSchemas()) {
    const path = join(SCHEMA_DIR, file);
    await writeFile(path, await formatSchema(schema, path));
    console.log(`Wrote ${relative(process.cwd(), path)}`);
  }
}

// Run as a script (`npm run schema`), but not when the test imports it.
if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await writeSchemas();
}
