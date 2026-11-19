import { useId, useState } from 'react';
import {
  createFields,
  fieldLabel,
  type BlockBase,
  type FieldMap,
  type FieldSpec,
  type ImageRef,
  type ListFieldSpec,
  type NumberFieldSpec,
} from '@subterra-technologies/blockletter';
import { ColorField } from '../appearance/color-field';
import type { BlockComponent, BlockEditorProps } from '../editor/types';
import { useEditorMessages } from '../i18n/context';
import { MarkdownField } from '../markdown/markdown-field';
import { RichTextField } from '../rich-text/rich-text-field';
import { sameBlock } from './editor-base';
import {
  AreaField,
  CheckField,
  ChoiceField,
  EditorFields,
  FieldPair,
  GroupLabel,
  Hint,
  Note,
  SelectField,
  TextField,
  useFieldsReadOnly,
} from './editor-fields';
import { ImageField } from './image-field';
import { ItemList } from './item-list';

/**
 * The form the editor builds for a block declared with fields: one control per field, in the
 * order the fields are declared, each labelled with the field's `label` and helped by its `help`.
 * Text is a text box (a text area when `multiline`), Markdown has the formatting toolbar, HTML the
 * formatted-text box, an image the upload and address control, a choice radio buttons or a
 * select, a list a card per item with Add, Remove and Move.
 *
 * Writing follows the inspector's rule: each control reads straight off the block and emits a
 * whole next block, and a change that changes nothing is never emitted. An optional field that is
 * cleared is dropped from the block rather than stored blank.
 */

/** What a control of the host's own receives, in place of the one the form would draw. */
export interface FieldEditorProps<V = unknown> {
  /** The field's value; undefined while an optional field is absent. */
  value: V | undefined;
  /** The next value, or undefined to drop an optional field from the block. */
  onChange(value: V | undefined): void;
  /** The field's name, with "(optional)" when the block may leave it out. */
  label: string;
  field: FieldSpec;
  /** The issue is read-only: show the value without letting it change. */
  readOnly: boolean;
}

/** A control for one field, such as a field of the host's own kind (`field.custom`). */
export type FieldEditor = BlockComponent<FieldEditorProps>;

/**
 * Controls of the host's own by field key, used in place of the ones the form would draw: `rating`
 * for a top-level field, `speakers.photo` for a field of each item in the `speakers` list.
 */
export type FieldEditors = Readonly<Record<string, FieldEditor>>;

type Values = Readonly<Record<string, unknown>>;

/** `values` with `key` set to `value`, or without it when `value` is undefined. */
function withValue(values: Values, key: string, value: unknown): Record<string, unknown> {
  const next = { ...values };
  if (value === undefined) delete next[key];
  else next[key] = value;
  return next;
}

const textOf = (value: unknown): string => (typeof value === 'string' ? value : '');

const isImage = (value: unknown): value is ImageRef =>
  typeof value === 'object' && value !== null && typeof (value as ImageRef).url === 'string';

export interface FieldInputsProps {
  fields: FieldMap;
  values: Values;
  /** One field's next value, or undefined to drop it. */
  onChange: (key: string, value: unknown) => void;
  editors?: FieldEditors;
  /** Where these fields sit, for `editors`' keys: '' for a block, `speakers` for its items. */
  path?: string;
}

/**
 * The controls for a set of fields, without the fieldset around them: for a form of the host's own
 * that draws some of a block's fields itself and leaves the rest to these.
 */
export function FieldInputs({ fields, values, onChange, editors, path = '' }: FieldInputsProps) {
  return Object.entries(fields).map(([key, field]) => (
    <FieldInput
      key={key}
      name={key}
      field={field}
      value={values[key]}
      onChange={(value) => onChange(key, value)}
      editors={editors}
      path={path ? `${path}.${key}` : key}
    />
  ));
}

interface FieldInputProps {
  name: string;
  field: FieldSpec;
  value: unknown;
  onChange: (value: unknown) => void;
  editors: FieldEditors | undefined;
  path: string;
}

function FieldInput({ name, field, value, onChange, editors, path }: FieldInputProps) {
  const words = useEditorMessages().fieldForms;
  const readOnly = useFieldsReadOnly();
  const plain = fieldLabel(name, field);
  // A checkbox can be left unticked and a list empty, so neither says "(optional)".
  const label =
    field.optional && field.kind !== 'toggle' && field.kind !== 'list'
      ? words.optional(plain)
      : plain;
  const Custom = editors?.[path];
  if (Custom) {
    return (
      <Custom value={value} onChange={onChange} label={label} field={field} readOnly={readOnly} />
    );
  }
  const help = field.help;
  /** Text as typed, or nothing when an optional field is cleared. */
  const text = (next: string) => onChange(field.optional && !next.trim() ? undefined : next);

  switch (field.kind) {
    case 'text':
      return field.multiline ? (
        <AreaField
          label={label}
          value={textOf(value)}
          onChange={text}
          help={help}
          placeholder={field.placeholder}
          maxLength={field.max}
        />
      ) : (
        <TextField
          label={label}
          value={textOf(value)}
          onChange={text}
          help={help}
          placeholder={field.placeholder}
          maxLength={field.max}
        />
      );
    case 'markdown':
      return (
        <MarkdownField
          label={label}
          value={textOf(value)}
          onChange={text}
          help={help}
          placeholder={field.placeholder}
          maxLength={field.max}
        />
      );
    case 'html':
      return <RichTextField label={label} value={textOf(value)} onChange={text} help={help} />;
    case 'url':
      return (
        <TextField
          label={label}
          type="url"
          inputMode="url"
          spellCheck={false}
          value={textOf(value)}
          onChange={text}
          help={help}
          placeholder={field.placeholder ?? 'https://'}
        />
      );
    case 'date':
      return (
        <TextField label={label} type="date" value={textOf(value)} onChange={text} help={help} />
      );
    case 'image':
      return (
        <ImageField
          label={label}
          value={isImage(value) ? value : undefined}
          onChange={onChange}
          help={help}
          fit={field.fit}
        />
      );
    case 'color':
      return (
        <ColorInput
          label={label}
          value={value}
          optional={field.optional}
          onChange={onChange}
          help={help}
        />
      );
    case 'choice': {
      const current = textOf(value);
      if (field.display === 'select' || (field.display !== 'radio' && field.options.length > 4)) {
        return (
          <SelectField
            label={label}
            value={current}
            options={field.options}
            onChange={onChange}
            help={help}
          />
        );
      }
      return (
        <div className="bl:flex bl:flex-col bl:gap-2">
          <ChoiceField legend={label} value={current} options={field.options} onChange={onChange} />
          {help ? <Hint>{help}</Hint> : null}
        </div>
      );
    }
    case 'number':
      return (
        <NumberInput label={label} field={field} value={value} onChange={onChange} help={help} />
      );
    case 'toggle':
      return (
        <div className="bl:flex bl:flex-col bl:gap-1.5">
          <CheckField label={label} checked={value === true} onChange={onChange} />
          {help ? <Hint>{help}</Hint> : null}
        </div>
      );
    case 'link':
      return (
        <LinkInput
          label={label}
          value={value}
          optional={field.optional}
          onChange={onChange}
          help={help}
        />
      );
    case 'list':
      return (
        <ListInput
          label={label}
          field={field}
          value={value}
          onChange={onChange}
          editors={editors}
          path={path}
        />
      );
    case 'custom':
      return <Note>{words.noControl(plain)}</Note>;
  }
}

function ColorInput({
  label,
  value,
  optional,
  onChange,
  help,
}: {
  label: string;
  value: unknown;
  optional: boolean;
  onChange: (value: unknown) => void;
  help: string | undefined;
}) {
  const id = useId();
  const colour = textOf(value);
  return (
    <ColorField
      label={label}
      controlId={id}
      value={colour || undefined}
      {...(help ? { help } : {})}
      // Cleared, the field is '' (the brand's colour) rather than absent, unless it is optional.
      onValueChange={(next) => onChange(next ?? (optional ? undefined : ''))}
    />
  );
}

/**
 * A number box that keeps what is typed while it is half written ("1.", "-"), and stores a number
 * once the text is one.
 */
function NumberInput({
  label,
  field,
  value,
  onChange,
  help,
}: {
  label: string;
  field: NumberFieldSpec;
  value: unknown;
  onChange: (value: unknown) => void;
  help: string | undefined;
}) {
  const shown = typeof value === 'number' ? String(value) : '';
  const [draft, setDraft] = useState(shown);
  const [seen, setSeen] = useState(shown);
  if (shown !== seen) {
    setSeen(shown);
    // Changed elsewhere (undo, another control): show it, unless it is what the draft says.
    if (draft.trim() === '' || Number(draft) !== value) setDraft(shown);
  }
  return (
    <TextField
      label={label}
      type="number"
      inputMode={field.integer ? 'numeric' : 'decimal'}
      value={draft}
      min={field.min === undefined ? undefined : String(field.min)}
      max={field.max === undefined ? undefined : String(field.max)}
      step={field.step ?? (field.integer ? 1 : 'any')}
      help={help}
      onChange={(next) => {
        setDraft(next);
        if (!next.trim()) {
          if (field.optional) onChange(undefined);
          return;
        }
        const number = Number(next);
        if (Number.isFinite(number)) onChange(number);
      }}
      onBlur={() => setDraft(shown)}
    />
  );
}

function LinkInput({
  label,
  value,
  optional,
  onChange,
  help,
}: {
  label: string;
  value: unknown;
  optional: boolean;
  onChange: (value: unknown) => void;
  help: string | undefined;
}) {
  const words = useEditorMessages().fieldForms;
  const id = useId();
  const labelId = `${id}-label`;
  const link = {
    label: textOf((value as { label?: unknown } | undefined)?.label),
    url: textOf((value as { url?: unknown } | undefined)?.url),
  };
  const set = (changes: Partial<typeof link>) => {
    const next = { ...link, ...changes };
    onChange(optional && !next.label.trim() && !next.url.trim() ? undefined : next);
  };
  return (
    <div role="group" aria-labelledby={labelId} className="bl:flex bl:flex-col bl:gap-2">
      <GroupLabel id={labelId}>{label}</GroupLabel>
      <FieldPair>
        <TextField
          label={words.linkLabel}
          value={link.label}
          onChange={(next) => set({ label: next })}
        />
        <TextField
          label={words.linkUrl}
          type="url"
          inputMode="url"
          spellCheck={false}
          placeholder="https://"
          value={link.url}
          onChange={(next) => set({ url: next })}
        />
      </FieldPair>
      {help ? <Hint>{help}</Hint> : null}
    </div>
  );
}

function ListInput({
  label,
  field,
  value,
  onChange,
  editors,
  path,
}: {
  label: string;
  field: ListFieldSpec;
  value: unknown;
  onChange: (value: unknown) => void;
  editors: FieldEditors | undefined;
  path: string;
}) {
  const words = useEditorMessages().fieldForms;
  const items = (Array.isArray(value) ? value : []) as Values[];
  const item = field.itemLabel ?? words.item;
  const commit = (next: readonly Values[]) =>
    onChange(field.optional && next.length === 0 ? undefined : next);
  return (
    <ItemList
      words={{ label, item, add: words.add(item) }}
      items={items}
      onChange={commit}
      create={() => createFields(field.item)}
      min={field.min}
      max={field.max}
      limitHint={field.max === undefined ? undefined : words.full(field.max)}
      hint={field.help}
      reorderable
      renderItem={(entry, _update, index) => (
        <FieldInputs
          fields={field.item}
          values={entry}
          editors={editors}
          path={path}
          onChange={(key, next) =>
            commit(
              items.map((candidate, at) =>
                at === index ? withValue(entry, key, next) : candidate,
              ),
            )
          }
        />
      )}
    />
  );
}

/**
 * The Block tab's form for a block declared with `fields`, as `defineEditorBlock` makes it when a
 * definition brings no `Editor` of its own.
 */
export function createFieldsEditor<B extends BlockBase>(
  fields: FieldMap,
  editors?: FieldEditors,
): BlockComponent<BlockEditorProps<B>> {
  function FieldsEditor({ block, onChange, readOnly }: BlockEditorProps<B>) {
    const values = block as unknown as Values;
    return (
      <EditorFields readOnly={readOnly}>
        <FieldInputs
          fields={fields}
          values={values}
          editors={editors}
          onChange={(key, value) => {
            const next = withValue(values, key, value);
            if (!sameBlock(next, block)) onChange(next as unknown as B);
          }}
        />
      </EditorFields>
    );
  }
  return FieldsEditor;
}
