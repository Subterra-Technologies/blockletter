import { firstWords, plainWords } from './blocks/shared';
import { BLOCK_ALIGNMENTS, BLOCK_FONT_SIZES, BLOCK_PADDINGS } from './limits';
import { htmlToText } from './rich-text';
import type { ImageRef, Link } from './types';
import { cloneJson } from './util';
import type { ObjectValidator } from './validate';

/**
 * Field schemas: a block's fields declared once, with `field.text()`, `field.list()` and the rest,
 * and handed to `defineBlock({ fields })`. Its TypeScript type, `create()`, `validate()`, JSON
 * Schema and the editor's form all come from that one declaration, so they cannot disagree.
 *
 * A field schema is plain data with no functions, except a custom field's own checks, so the same
 * declaration can describe the block to a form, to an AI assistant or to another language.
 */

/** A JSON Schema as plain data, keyword by keyword. */
export type JsonSchema = Record<string, unknown>;

export type FieldKind =
  | 'text'
  | 'markdown'
  | 'html'
  | 'url'
  | 'image'
  | 'color'
  | 'choice'
  | 'number'
  | 'toggle'
  | 'date'
  | 'link'
  | 'list'
  | 'custom';

/** What every field schema carries. */
interface FieldSpecBase {
  readonly kind: FieldKind;
  /** The field's name in the form ("Apply link"), and in messages. Default: its key in words. */
  readonly label?: string;
  /** A line under the field in the form, and what an AI assistant is told the field is for. */
  readonly help?: string;
  /**
   * Absent is allowed: the key is optional in the block's type, `create()` leaves it out unless a
   * default is given, and the form drops it when it is cleared.
   */
  readonly optional: boolean;
  /**
   * The type of the value a block stores. Only a type: no field schema has this property at run
   * time, and `FieldValues` reads it.
   */
  readonly '~value': unknown;
}

export interface TextFieldSpec extends FieldSpecBase {
  readonly kind: 'text';
  readonly default?: string;
  /** Longest allowed length; every text in a block is capped at `LIMITS.maxTextLength` anyway. */
  readonly max?: number;
  /** Blank (after trimming) is invalid: `true` for the standard message, or the message. */
  readonly required?: boolean | string;
  /** A text area rather than a one-line box. */
  readonly multiline?: boolean;
  readonly placeholder?: string;
}

/** Free text with Markdown in it, drawn with `ctx.markdown()`; the form adds a formatting toolbar. */
export interface MarkdownFieldSpec extends FieldSpecBase {
  readonly kind: 'markdown';
  readonly default?: string;
  readonly max?: number;
  readonly required?: boolean | string;
  readonly placeholder?: string;
}

/** Formatted text stored as HTML, cleaned with `sanitizeHtml` before it is drawn. */
export interface HtmlFieldSpec extends FieldSpecBase {
  readonly kind: 'html';
  readonly default?: string;
  readonly max?: number;
}

/**
 * A link's address: absolute (`https://…`, `mailto:`), or a path on the host's own site that the
 * renderer resolves against `baseUrl`. Draw it through `ctx.url()`.
 */
export interface UrlFieldSpec extends FieldSpecBase {
  readonly kind: 'url';
  readonly default?: string;
  readonly required?: boolean | string;
  readonly placeholder?: string;
}

/** An `ImageRef`. Always optional: a fresh block has no picture yet. */
export interface ImageFieldSpec extends FieldSpecBase {
  readonly kind: 'image';
  readonly optional: true;
  readonly default?: ImageRef;
  /** How the form's thumbnail fills its box: cropped (`cover`, photos) or whole (`contain`, logos). */
  readonly fit?: 'cover' | 'contain';
}

/** A six-digit hex colour, or `''` for "not set", where the block falls back to the brand's. */
export interface ColorFieldSpec extends FieldSpecBase {
  readonly kind: 'color';
  readonly default?: string;
}

/** One choice the form offers, and the value stored for it. */
export interface FieldChoice<V extends string = string> {
  readonly value: V;
  readonly label: string;
}

export interface ChoiceFieldSpec extends FieldSpecBase {
  readonly kind: 'choice';
  readonly options: readonly FieldChoice[];
  /** Default: the first option. */
  readonly default?: string;
  /** Radio buttons (the default up to four options) or a select (the default beyond). */
  readonly display?: 'radio' | 'select';
}

export interface NumberFieldSpec extends FieldSpecBase {
  readonly kind: 'number';
  /** Default: 0, moved inside `min` and `max`. */
  readonly default?: number;
  readonly min?: number;
  readonly max?: number;
  /** Whole numbers only. */
  readonly integer?: boolean;
  /** The form's step; default 1. */
  readonly step?: number;
}

/** On or off: a checkbox, its label beside it. */
export interface ToggleFieldSpec extends FieldSpecBase {
  readonly kind: 'toggle';
  readonly default?: boolean;
}

/** A calendar date written `YYYY-MM-DD`, or `''` for none unless it is required. */
export interface DateFieldSpec extends FieldSpecBase {
  readonly kind: 'date';
  readonly default?: string;
  readonly required?: boolean | string;
}

/** A `Link`: a label and an address, drawn together as a button or a link. */
export interface LinkFieldSpec extends FieldSpecBase {
  readonly kind: 'link';
  readonly default?: Link;
  /** Both the label and the address must be filled in. */
  readonly required?: boolean;
}

/** A list of items, each with fields of its own. */
export interface ListFieldSpec extends FieldSpecBase {
  readonly kind: 'list';
  readonly item: FieldMap;
  /** Default: `min` fresh items, or none. */
  readonly default?: readonly unknown[];
  readonly min?: number;
  readonly max?: number;
  /** One item's name in the form, "speaker" (rows read "Speaker 1"). Default: "item". */
  readonly itemLabel?: string;
}

/**
 * A field of the host's own kind: any JSON value, its own checks, its own JSON Schema. The
 * editor's generated form needs a control for it (`fieldEditors` on the editor block).
 */
export interface CustomFieldSpec extends FieldSpecBase {
  readonly kind: 'custom';
  readonly default?: unknown;
  /**
   * Checks `check.value[key]`, adding an issue for each problem (`check.add(code, message, key)`).
   * Not called for an optional field that is absent. `label` is the field's name for messages.
   */
  readonly validate?: (check: ObjectValidator, key: string, label: string) => void;
  /** The value's JSON Schema. Default: `{}`, any value. */
  readonly schema?: JsonSchema;
}

export type FieldSpec =
  | TextFieldSpec
  | MarkdownFieldSpec
  | HtmlFieldSpec
  | UrlFieldSpec
  | ImageFieldSpec
  | ColorFieldSpec
  | ChoiceFieldSpec
  | NumberFieldSpec
  | ToggleFieldSpec
  | DateFieldSpec
  | LinkFieldSpec
  | ListFieldSpec
  | CustomFieldSpec;

/** A block's (or a list item's) fields by key, in the order the form shows them. */
export type FieldMap = Readonly<Record<string, FieldSpec>>;

type Simplify<T> = { [K in keyof T]: T[K] } & {};

type OptionalKeys<M extends FieldMap> = {
  [K in keyof M]: M[K]['optional'] extends true ? K : never;
}[keyof M];

/** The values a set of fields stores: `{ title: string; logo?: ImageRef; … }`. */
export type FieldValues<M extends FieldMap> = Simplify<
  { -readonly [K in Exclude<keyof M, OptionalKeys<M>>]: M[K]['~value'] } & {
    -readonly [K in OptionalKeys<M>]?: M[K]['~value'];
  }
>;

/** A field schema as the builders return it: its stored type and optionality known. */
type Typed<S extends FieldSpec, V, O extends boolean> = S & {
  readonly optional: O;
  readonly '~value': V;
};

/** A builder's options: the schema's own settings and `optional`, everything else implied. */
type Options<S extends FieldSpec, O extends boolean> = Omit<
  S,
  'kind' | 'optional' | '~value' | 'default'
> & { readonly optional?: O };

/** Keeps the settings that were given, so a schema never carries `max: undefined`. */
function spec<S extends FieldSpec>(kind: S['kind'], options: object): S {
  const given = Object.entries(options).filter(([, value]) => value !== undefined);
  const { optional, ...rest } = Object.fromEntries(given) as { optional?: boolean };
  return { kind, ...rest, optional: optional === true } as unknown as S;
}

/** "issueLabel" → "issue label". */
const keyWords = (key: string): string =>
  key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .toLowerCase();

const capitalised = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);

/** A field's name for the form: its `label`, or its key in words ("ctaUrl" → "Cta url"). */
export const fieldLabel = (key: string, field: FieldSpec): string =>
  field.label ?? capitalised(keyWords(key));

/**
 * A field's name inside a sentence ("Add the apply link."): its label with the first letter
 * lowered, unless the label starts with an abbreviation ("URL").
 */
function messageLabel(key: string, field: FieldSpec): string {
  const label = fieldLabel(key, field);
  return /^\p{Lu}\p{Lu}/u.test(label) ? label : label.charAt(0).toLowerCase() + label.slice(1);
}

/** A choice given as its value alone is labelled with the value in words. */
const toChoice = <V extends string>(option: V | FieldChoice<V>): FieldChoice<V> =>
  typeof option === 'string' ? { value: option, label: capitalised(keyWords(option)) } : option;

/**
 * The field builders. Each returns a field schema, typed with the value a block stores, for
 * `defineBlock({ fields })` or a list's `item`. Pass `optional: true` for a field a block may
 * leave out.
 */
export const field = {
  /** One line of text, or several with `multiline`. Default `''`. */
  text<const O extends boolean = false>(
    options: Options<TextFieldSpec, O> & { default?: string } = {},
  ): Typed<TextFieldSpec, string, NoInfer<O>> {
    return spec('text', options);
  },

  /** Free text with Markdown in it. Default `''`. */
  markdown<const O extends boolean = false>(
    options: Options<MarkdownFieldSpec, O> & { default?: string } = {},
  ): Typed<MarkdownFieldSpec, string, NoInfer<O>> {
    return spec('markdown', options);
  },

  /** Formatted text stored as HTML. Default `''`. */
  html<const O extends boolean = false>(
    options: Options<HtmlFieldSpec, O> & { default?: string } = {},
  ): Typed<HtmlFieldSpec, string, NoInfer<O>> {
    return spec('html', options);
  },

  /** A link's address. Default `''`. */
  url<const O extends boolean = false>(
    options: Options<UrlFieldSpec, O> & { default?: string } = {},
  ): Typed<UrlFieldSpec, string, NoInfer<O>> {
    return spec('url', options);
  },

  /** A picture; always optional. */
  image(
    options: Omit<Options<ImageFieldSpec, true>, 'optional'> & { default?: ImageRef } = {},
  ): Typed<ImageFieldSpec, ImageRef, true> {
    return spec('image', { ...options, optional: true });
  },

  /** A colour, `''` meaning the brand's. Default `''`. */
  color<const O extends boolean = false>(
    options: Options<ColorFieldSpec, O> & { default?: string } = {},
  ): Typed<ColorFieldSpec, string, NoInfer<O>> {
    return spec('color', options);
  },

  /**
   * One of a fixed set of values, given alone (`['small', 'large']`, labelled "Small" and
   * "Large") or with labels (`[{ value: 'sm', label: 'Small' }]`).
   */
  choice<const V extends string, const O extends boolean = false>(
    options: Omit<Options<ChoiceFieldSpec, O>, 'options'> & {
      options: readonly (V | FieldChoice<V>)[];
      default?: NoInfer<V>;
    },
  ): Typed<ChoiceFieldSpec, V, NoInfer<O>> {
    if (options.options.length === 0) throw new Error('A choice field needs at least one option.');
    return spec('choice', { ...options, options: options.options.map(toChoice) });
  },

  /** A number. Default 0, moved inside `min` and `max`. */
  number<const O extends boolean = false>(
    options: Options<NumberFieldSpec, O> & { default?: number } = {},
  ): Typed<NumberFieldSpec, number, NoInfer<O>> {
    return spec('number', options);
  },

  /** On or off. Default off. */
  toggle<const O extends boolean = false>(
    options: Options<ToggleFieldSpec, O> & { default?: boolean } = {},
  ): Typed<ToggleFieldSpec, boolean, NoInfer<O>> {
    return spec('toggle', options);
  },

  /** A calendar date, `YYYY-MM-DD`. Default `''`. */
  date<const O extends boolean = false>(
    options: Options<DateFieldSpec, O> & { default?: string } = {},
  ): Typed<DateFieldSpec, string, NoInfer<O>> {
    return spec('date', options);
  },

  /** A label and an address. Default both blank. */
  link<const O extends boolean = false>(
    options: Options<LinkFieldSpec, O> & { default?: Link } = {},
  ): Typed<LinkFieldSpec, Link, NoInfer<O>> {
    return spec('link', options);
  },

  /** A list of items with fields of their own, `min` to `max` of them. */
  list<I extends FieldMap, const O extends boolean = false>(
    options: Omit<Options<ListFieldSpec, O>, 'item'> & {
      item: I;
      default?: NoInfer<FieldValues<I>[]>;
    },
  ): Typed<ListFieldSpec, FieldValues<I>[], NoInfer<O>> {
    checkKeys(options.item, 'A list item');
    return spec('list', options);
  },

  /** A value of the host's own kind, with its own checks and JSON Schema. */
  custom<V, const O extends boolean = false>(
    options: Options<CustomFieldSpec, O> & { default: V },
  ): Typed<CustomFieldSpec, V, NoInfer<O>> {
    return spec('custom', options);
  },
};

/** Keys a field may not take: every block already carries these. */
export const RESERVED_FIELD_KEYS: readonly string[] = ['id', 'type', 'hidden', 'style', 'source'];

/** Throws when a key could not be stored as written, so a mistake shows when the block is defined. */
export function checkKeys(fields: FieldMap, owner: string, reserved: readonly string[] = []): void {
  for (const key of Object.keys(fields)) {
    if (reserved.includes(key)) {
      throw new Error(`${owner} cannot have a field called "${key}": every block has one.`);
    }
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
      throw new Error(`${owner}'s field "${key}" needs a name made of letters, digits and _.`);
    }
  }
}

// ---------------------------------------------------------------------------
// create
// ---------------------------------------------------------------------------

/** What a field holds in a fresh block, or undefined to leave it out. */
function initialValue(field: FieldSpec): unknown {
  if (field.default !== undefined) return cloneJson(field.default);
  if (field.optional) return undefined;
  switch (field.kind) {
    case 'text':
    case 'markdown':
    case 'html':
    case 'url':
    case 'color':
    case 'date':
      return '';
    case 'choice':
      return field.options[0]?.value;
    case 'number':
      return Math.min(Math.max(0, field.min ?? 0), field.max ?? Number.POSITIVE_INFINITY);
    case 'toggle':
      return false;
    case 'link':
      return { label: '', url: '' };
    case 'list':
      return Array.from({ length: field.min ?? 0 }, () => createFields(field.item));
    // An image is always optional, so it is already left out.
    case 'custom':
      return undefined;
  }
}

/** A fresh set of values for `fields`: each default, copied, or the kind's own blank. */
export function createFields<M extends FieldMap>(fields: M): FieldValues<M> {
  const values: Record<string, unknown> = {};
  for (const [key, field] of Object.entries(fields)) {
    const value = initialValue(field);
    if (value !== undefined) values[key] = value;
  }
  return values as FieldValues<M>;
}

// ---------------------------------------------------------------------------
// validate
// ---------------------------------------------------------------------------

const isAbsent = (check: ObjectValidator, key: string, field: FieldSpec): boolean =>
  !check.ok || (field.optional && check.value[key] === undefined);

/** Checks every field of `fields` on the object `check` reads, adding an issue per problem. */
export function validateFields(check: ObjectValidator, fields: FieldMap): ObjectValidator {
  for (const [key, field] of Object.entries(fields)) {
    const label = messageLabel(key, field);
    const optional = field.optional;
    switch (field.kind) {
      case 'text':
      case 'markdown':
      case 'url':
        check.string(key, {
          optional,
          label,
          ...(field.required ? { required: field.required } : {}),
          ...('max' in field && field.max !== undefined ? { max: field.max } : {}),
        });
        break;
      case 'html':
        check.string(key, {
          optional,
          label,
          ...(field.max !== undefined ? { max: field.max } : {}),
        });
        break;
      case 'date': {
        check.string(key, {
          optional,
          label,
          ...(field.required ? { required: field.required } : {}),
        });
        const value = check.value[key];
        if (typeof value === 'string' && value.trim())
          check.isoDate(key, { optional: true, label });
        break;
      }
      case 'image':
        check.image(key, { optional: true, label });
        break;
      case 'color':
        check.color(key, { optional, allowBlank: true, label });
        break;
      case 'choice':
        check.oneOf(
          key,
          field.options.map((option) => option.value),
          { optional, label },
        );
        break;
      case 'number':
        check.number(key, {
          optional,
          label,
          ...(field.min !== undefined ? { min: field.min } : {}),
          ...(field.max !== undefined ? { max: field.max } : {}),
          ...(field.integer ? { integer: true } : {}),
        });
        break;
      case 'toggle':
        check.boolean(key, { optional, label });
        break;
      case 'link': {
        const required = field.required === true;
        check.object(
          key,
          (link) => {
            link
              .string('label', {
                label: `${label}'s label`,
                ...(required ? { required: true } : {}),
              })
              .string('url', {
                label: `${label}'s address`,
                ...(required ? { required: true } : {}),
              });
          },
          { optional, label },
        );
        break;
      }
      case 'list': {
        const item = field.itemLabel ?? 'item';
        check.array(
          key,
          {
            optional,
            label,
            ...(field.min !== undefined
              ? {
                  min: field.min,
                  tooFew: `Add at least ${field.min} ${field.min === 1 ? item : `${item}s`}.`,
                }
              : {}),
            ...(field.max !== undefined ? { max: field.max } : {}),
          },
          (child) => {
            validateFields(child, field.item);
          },
        );
        break;
      }
      case 'custom':
        if (!isAbsent(check, key, field)) field.validate?.(check, key, label);
        break;
    }
  }
  return check;
}

// ---------------------------------------------------------------------------
// summary
// ---------------------------------------------------------------------------

/** The first few words of the first text, Markdown or HTML field that has any. */
export function summarizeFields(fields: FieldMap, values: Record<string, unknown>): string {
  for (const [key, field] of Object.entries(fields)) {
    const value = values[key];
    if (typeof value !== 'string' || !value.trim()) continue;
    if (field.kind === 'text') return firstWords(value);
    if (field.kind === 'markdown') return firstWords(plainWords(value));
    if (field.kind === 'html') return firstWords(htmlToText(value));
  }
  return '';
}

// ---------------------------------------------------------------------------
// JSON Schema
// ---------------------------------------------------------------------------

const HEX_PATTERN = '^#[0-9a-fA-F]{6}$';

const IMAGE_SCHEMA: JsonSchema = {
  type: 'object',
  properties: { url: { type: 'string' }, assetId: { type: 'string' } },
  required: ['url'],
  additionalProperties: false,
  description: 'An image: an absolute https `url`, or a blank one beside the host’s own `assetId`.',
};

const LINK_SCHEMA: JsonSchema = {
  type: 'object',
  properties: { label: { type: 'string' }, url: { type: 'string' } },
  required: ['label', 'url'],
  additionalProperties: false,
};

/** The same keywords `schema/newsletter-document.json` gives every block's `style`. */
export const BLOCK_STYLE_SCHEMA: JsonSchema = {
  type: 'object',
  properties: {
    background: { type: 'string', pattern: HEX_PATTERN },
    textColor: { type: 'string', pattern: HEX_PATTERN },
    align: { type: 'string', enum: [...BLOCK_ALIGNMENTS] },
    paddingY: { type: 'string', enum: [...BLOCK_PADDINGS] },
    fontSize: { type: 'string', enum: [...BLOCK_FONT_SIZES] },
    fullWidth: {
      type: 'boolean',
      description: 'Edge-to-edge band instead of the padded content column.',
    },
    divider: { type: 'boolean', description: 'Hairline rule under the block.' },
  },
  additionalProperties: false,
  description:
    'Per-block appearance. Every field is optional; an absent field inherits from the brand kit’s palette and the block’s own default.',
};

/** One field's JSON Schema, its label and help as the description. */
function fieldSchema(key: string, field: FieldSpec): JsonSchema {
  const description = [fieldLabel(key, field), field.help].filter(Boolean).join('. ');
  const described = (schema: JsonSchema): JsonSchema => ({ ...schema, description });
  switch (field.kind) {
    case 'text':
    case 'html':
      return described({
        type: 'string',
        ...(field.max !== undefined ? { maxLength: field.max } : {}),
      });
    case 'markdown':
      return {
        type: 'string',
        ...(field.max !== undefined ? { maxLength: field.max } : {}),
        description: `${description}. Markdown: **bold**, *italic*, ~~strikethrough~~, [label](https://…), # headings, - lists, > quotes.`,
      };
    case 'url':
      return {
        type: 'string',
        description: `${description}. An absolute address (https://…, mailto:…), or a path on the sender’s own site.`,
      };
    case 'date':
      return described({
        type: 'string',
        pattern: field.required
          ? '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
          : '^$|^[0-9]{4}-[0-9]{2}-[0-9]{2}$',
      });
    case 'image':
      return {
        ...IMAGE_SCHEMA,
        description: `${description}. ${String(IMAGE_SCHEMA.description)}`,
      };
    case 'color':
      return {
        type: 'string',
        pattern: `^$|${HEX_PATTERN}`,
        description: `${description}. A six-digit hex colour such as #1f2937, or blank for the brand’s.`,
      };
    case 'choice':
      return described({ type: 'string', enum: field.options.map((option) => option.value) });
    case 'number':
      return described({
        type: field.integer ? 'integer' : 'number',
        ...(field.min !== undefined ? { minimum: field.min } : {}),
        ...(field.max !== undefined ? { maximum: field.max } : {}),
      });
    case 'toggle':
      return described({ type: 'boolean' });
    case 'link':
      return described(LINK_SCHEMA);
    case 'list':
      return described({
        type: 'array',
        items: fieldsJsonSchema(field.item),
        ...(field.min !== undefined ? { minItems: field.min } : {}),
        ...(field.max !== undefined ? { maxItems: field.max } : {}),
      });
    case 'custom':
      return { ...(field.schema ?? {}), description };
  }
}

/**
 * The JSON Schema (draft-07) of an object holding `fields`, shaped like the package's own schemas:
 * every property declared in order, required ones listed, nothing else allowed.
 */
export function fieldsJsonSchema(fields: FieldMap): JsonSchema {
  const entries = Object.entries(fields);
  return {
    type: 'object',
    properties: Object.fromEntries(entries.map(([key, field]) => [key, fieldSchema(key, field)])),
    required: entries.filter(([, field]) => !field.optional).map(([key]) => key),
    additionalProperties: false,
  };
}
