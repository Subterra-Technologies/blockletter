import { BLOCK_ALIGNMENTS, BLOCK_FONT_SIZES, BLOCK_PADDINGS, LIMITS, formatCount } from './limits';
import { isIsoDate } from './period';
import type { ValidationIssue } from './types';

/**
 * Small, dependency-free checks for untrusted input: a document read from storage, a request
 * body, a pasted template. The source project leaned on Convex validators for shape; a document
 * that can live anywhere needs its own.
 *
 * Every built-in block validates itself with these, and they are exported so a host's own block
 * can do the same. Messages are plain English a person can act on; `path` says where, for code,
 * and `values` carries anything else a message was made from (a limit, the part of an image that
 * is wrong), so a form in another language can word the same problem from `code` and `path`.
 *
 * Issue codes: `invalid_document`, `unsupported_version`, `invalid_type`, `required`, `too_long`,
 * `invalid_value`, `invalid_color`, `invalid_date`, `invalid_image`, `invalid_email`,
 * `invalid_period`, `too_few_items`, `too_many_items`, `too_many_blocks`, `duplicate_block_id`,
 * `unknown_block_type`.
 */

/** Six-digit hex colour such as `#1f2937`, the only colour form a document or brand kit accepts. */
export const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export const isHexColor = (value: unknown): value is string =>
  typeof value === 'string' && HEX_COLOR.test(value);

/** A plain object: not null, not an array. */
export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** `blocks/3` + `items` → `blocks/3/items`. */
export const joinPath = (path: string, key: string | number): string =>
  path ? `${path}/${key}` : String(key);

/** "issueLabel" → "issue label", for messages when a field has no label of its own. */
const words = (key: string): string =>
  key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .toLowerCase();

const UNREADABLE = 'is not in a format Blockletter can read.';
const COLOR_MESSAGE = 'Colours must be six-digit hex values such as #1f2937.';

/** What an issue's message was made from, beyond its code and path. */
type IssueValues = Readonly<Record<string, string | number>>;

/**
 * Which part of an image is wrong, as `values.problem` on an `invalid_image` issue: not an image
 * at all, an asset id that is not text, a `url` that is not text, an address that is not http(s),
 * or neither an address nor an asset id.
 */
export type ImageProblem = 'unreadable' | 'asset_id' | 'not_text' | 'not_web' | 'no_address';

export interface FieldOptions {
  /** Absent is fine; present must still be valid. */
  optional?: boolean;
  /** The field's name in messages. Defaults to the key in words ("issueLabel" → "issue label"). */
  label?: string;
}

export interface TextOptions extends FieldOptions {
  /** Blank (after trimming) is a problem: `true` for the standard message, or the message. */
  required?: boolean | string;
  /** Longest allowed length. Block text is capped by `blockValidator` already. */
  max?: number;
}

export interface ChoiceOptions extends FieldOptions {
  message?: string;
}

export interface ColorOptions extends FieldOptions {
  /** An empty string means "not set", as in a block's style; otherwise blank is invalid. */
  allowBlank?: boolean;
  message?: string;
}

export interface ListOptions extends FieldOptions {
  min?: number;
  max?: number;
  /** Message when there are fewer than `min` items. */
  tooFew?: string;
  /** Message when there are more than `max` items. */
  tooMany?: string;
}

export interface ValidatorOptions {
  /** Stamped on every issue, so an editor can point at the block. */
  blockId?: string;
  /** Where issues go; nested validators share their parent's list. */
  issues?: ValidationIssue[];
  /** What this object is called in messages. */
  label?: string;
}

/**
 * Checks one object field by field, collecting issues rather than throwing, so a person sees
 * every problem at once. Each check returns the validator for chaining; when the value was not
 * an object at all, that is the one issue reported and every field check is skipped.
 */
export class ObjectValidator {
  readonly issues: ValidationIssue[];
  /** The value as a record (empty when it was not an object). */
  readonly value: Record<string, unknown>;
  /** False when the value was not an object. */
  readonly ok: boolean;
  readonly path: string;
  readonly blockId: string | undefined;

  constructor(value: unknown, path: string, options: ValidatorOptions = {}) {
    this.path = path;
    this.blockId = options.blockId;
    this.issues = options.issues ?? [];
    this.ok = isRecord(value);
    this.value = isRecord(value) ? value : {};
    if (!this.ok) {
      this.addAt(
        path,
        'invalid_type',
        `${options.label ? `The ${options.label}` : 'This'} ${UNREADABLE}`,
      );
    }
  }

  /** Records a problem at `key` below this object, or at the object itself. */
  add(code: string, message: string, key?: string | number, values?: IssueValues): this {
    return this.addAt(
      key === undefined ? this.path : joinPath(this.path, key),
      code,
      message,
      values,
    );
  }

  /** Records a problem at an absolute `path`. */
  addAt(path: string, code: string, message: string, values?: IssueValues): this {
    this.issues.push({
      code,
      message,
      ...(this.blockId ? { blockId: this.blockId } : {}),
      ...(path ? { path } : {}),
      ...(values ? { values } : {}),
    });
    return this;
  }

  /** Whether `key` should be skipped: nothing to check, or absent and allowed to be. */
  private skip(key: string, options: FieldOptions, blank = false): boolean {
    const value = this.value[key];
    return (
      !this.ok || (options.optional === true && (value === undefined || (blank && value === '')))
    );
  }

  /** Text. `required` rejects blank text; `max` caps its length. */
  string(key: string, options: TextOptions = {}): this {
    if (this.skip(key, options)) return this;
    const value = this.value[key];
    const label = options.label ?? words(key);
    if (typeof value !== 'string') {
      return this.add('invalid_type', `The ${label} should be text.`, key);
    }
    if (options.required && !value.trim()) {
      const message = typeof options.required === 'string' ? options.required : `Add the ${label}.`;
      return this.add('required', message, key);
    }
    if (options.max !== undefined && value.length > options.max) {
      return this.add(
        'too_long',
        `Keep the ${label} to ${formatCount(options.max)} characters or fewer.`,
        key,
        { max: options.max },
      );
    }
    return this;
  }

  /** `true` or `false`. */
  boolean(key: string, options: FieldOptions = {}): this {
    if (this.skip(key, options) || typeof this.value[key] === 'boolean') return this;
    return this.add(
      'invalid_type',
      `The ${options.label ?? words(key)} setting should be true or false.`,
      key,
    );
  }

  /** One of a fixed set of strings. */
  oneOf(key: string, values: readonly string[], options: ChoiceOptions = {}): this {
    if (this.skip(key, options)) return this;
    const value = this.value[key];
    if (typeof value === 'string' && values.includes(value)) return this;
    return this.add(
      'invalid_value',
      options.message ?? `Choose the ${options.label ?? words(key)} from: ${values.join(', ')}.`,
      key,
    );
  }

  /** A real calendar date written `YYYY-MM-DD`. An optional date may also be blank. */
  isoDate(key: string, options: FieldOptions = {}): this {
    if (this.skip(key, options, true) || isIsoDate(this.value[key])) return this;
    return this.add(
      'invalid_date',
      `Write the ${options.label ?? words(key)} as a calendar date (YYYY-MM-DD).`,
      key,
    );
  }

  /** A six-digit hex colour. */
  color(key: string, options: ColorOptions = {}): this {
    const value = this.value[key];
    if (this.skip(key, options) || (options.allowBlank && value === '') || isHexColor(value)) {
      return this;
    }
    return this.add('invalid_color', options.message ?? COLOR_MESSAGE, key);
  }

  /**
   * An `ImageRef`: an http(s) `url`, or a blank one with an `assetId` the host resolves at
   * render time.
   */
  image(key: string, options: FieldOptions = {}): this {
    if (this.skip(key, options)) return this;
    const value = this.value[key];
    const label = options.label ?? words(key);
    const problem = (kind: ImageProblem): IssueValues => ({ problem: kind });
    if (!isRecord(value)) {
      return this.add('invalid_image', `The ${label} ${UNREADABLE}`, key, problem('unreadable'));
    }
    const { url, assetId } = value;
    if (assetId !== undefined && typeof assetId !== 'string') {
      this.add(
        'invalid_image',
        `The ${label}'s asset id should be text.`,
        `${key}/assetId`,
        problem('asset_id'),
      );
    }
    if (typeof url !== 'string') {
      return this.add(
        'invalid_image',
        `The ${label} needs a web address.`,
        `${key}/url`,
        problem('not_text'),
      );
    }
    if (url.trim() && !/^https?:\/\//i.test(url.trim())) {
      return this.add(
        'invalid_image',
        `The ${label} needs a web address starting with https://.`,
        `${key}/url`,
        problem('not_web'),
      );
    }
    if (!url.trim() && !(typeof assetId === 'string' && assetId.trim())) {
      return this.add(
        'invalid_image',
        `The ${label} has no address.`,
        `${key}/url`,
        problem('no_address'),
      );
    }
    return this;
  }

  /** A nested object, checked by `check`. */
  object(key: string, check: (child: ObjectValidator) => void, options: FieldOptions = {}): this {
    if (this.skip(key, options)) return this;
    const child = new ObjectValidator(this.value[key], joinPath(this.path, key), {
      issues: this.issues,
      label: options.label ?? words(key),
      ...(this.blockId ? { blockId: this.blockId } : {}),
    });
    if (child.ok) check(child);
    return this;
  }

  /** A list with an optional item count range; `each` checks every item as an object. */
  array(
    key: string,
    options: ListOptions = {},
    each?: (item: ObjectValidator, index: number) => void,
  ): this {
    if (this.skip(key, options)) return this;
    const value = this.value[key];
    const label = options.label ?? words(key);
    if (!Array.isArray(value)) {
      return this.add('invalid_type', `The ${label} should be a list.`, key);
    }
    if (options.min !== undefined && value.length < options.min) {
      this.add('too_few_items', options.tooFew ?? `Add at least ${options.min} ${label}.`, key, {
        min: options.min,
        ...(options.max !== undefined ? { max: options.max } : {}),
      });
    }
    if (options.max !== undefined && value.length > options.max) {
      this.add(
        'too_many_items',
        options.tooMany ?? `Keep the ${label} to ${options.max} or fewer.`,
        key,
        { max: options.max, ...(options.min !== undefined ? { min: options.min } : {}) },
      );
    }
    if (each) {
      const path = joinPath(this.path, key);
      value.forEach((item: unknown, index) => {
        const child = new ObjectValidator(item, joinPath(path, index), {
          issues: this.issues,
          label: 'item',
          ...(this.blockId ? { blockId: this.blockId } : {}),
        });
        if (child.ok) each(child, index);
      });
    }
    return this;
  }

  /** A block's optional `BlockStyle`. */
  style(key = 'style'): this {
    return this.object(
      key,
      (style) => {
        style
          .color('background', { optional: true, allowBlank: true })
          .color('textColor', { optional: true, allowBlank: true })
          .oneOf('align', BLOCK_ALIGNMENTS, { optional: true, label: 'alignment' })
          .oneOf('paddingY', BLOCK_PADDINGS, { optional: true, label: 'padding' })
          .oneOf('fontSize', BLOCK_FONT_SIZES, { optional: true, label: 'text size' })
          .boolean('fullWidth', { optional: true, label: 'full width' })
          .boolean('divider', { optional: true });
      },
      { optional: true, label: 'appearance' },
    );
  }
}

/** A validator for any object at `path`. */
export const validateObject = (
  value: unknown,
  path = '',
  options: ValidatorOptions = {},
): ObjectValidator => new ObjectValidator(value, path, options);

/** No text anywhere in a block, known field or not, may be too long (the old `collectStrings`). */
function checkTextLength(value: unknown, path: string, check: ObjectValidator): void {
  if (typeof value === 'string') {
    if (value.length > LIMITS.maxTextLength) {
      check.addAt(
        path,
        'too_long',
        `Keep each text field to ${formatCount(LIMITS.maxTextLength)} characters or fewer.`,
        { max: LIMITS.maxTextLength },
      );
    }
  } else if (Array.isArray(value)) {
    value.forEach((item: unknown, index) => checkTextLength(item, joinPath(path, index), check));
  } else if (isRecord(value)) {
    for (const [key, item] of Object.entries(value))
      checkTextLength(item, joinPath(path, key), check);
  }
}

/**
 * The fields every block carries — id, type, hidden, style, source — plus the text-length cap on
 * everything in it. A definition's `validate` starts here and adds its own fields.
 */
export function blockValidator(block: unknown, path: string, type: string): ObjectValidator {
  const id = isRecord(block) ? block.id : undefined;
  const check = new ObjectValidator(block, path, {
    label: 'block',
    ...(typeof id === 'string' && id ? { blockId: id } : {}),
  });
  if (!check.ok) return check;
  check.string('id', { required: 'Every block needs an id.' });
  if (check.value.type !== type) {
    check.add('invalid_type', `Expected a "${type}" block here.`, 'type');
  }
  check.boolean('hidden').style().string('source', { optional: true, label: 'data source' });
  checkTextLength(check.value, path, check);
  return check;
}

/** Thrown by `assertValidDocument`; `issues` lists every problem found. */
export class BlockletterValidationError extends Error {
  readonly issues: ValidationIssue[];

  constructor(issues: ValidationIssue[]) {
    const [first] = issues;
    const more = issues.length - 1;
    super(
      first
        ? `${first.message}${more > 0 ? ` (and ${more} more ${more === 1 ? 'problem' : 'problems'})` : ''}`
        : 'The newsletter is not valid.',
    );
    this.name = 'BlockletterValidationError';
    this.issues = issues;
  }
}
