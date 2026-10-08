import {
  LIMITS,
  type ButtonBlock,
  type ColumnItem,
  type ColumnsBlock,
  type DividerBlock,
  type QuoteBlock,
  type SpacerBlock,
} from '@subterra-technologies/blockletter';
import type { BlockEditorProps } from '../../editor/types';
import { useEditorMessages } from '../../i18n/context';
import { blockEditor, withOptional } from '../editor-base';
import {
  AreaField,
  ChoiceField,
  EditorFields,
  FieldPair,
  Note,
  TextField,
  type Choice,
} from '../editor-fields';
import { ImageField } from '../image-field';
import { ItemList } from '../item-list';

/** The layout block editors: columns, button, divider, spacer and quote. */

const [MIN_COLUMNS, MAX_COLUMNS] = LIMITS.columns;

// --- Columns -------------------------------------------------------------------------------------

/** `body` always; every other field only when it carries something. */
function toColumn(row: ColumnItem): ColumnItem {
  const column: ColumnItem = { body: row.body };
  if (row.heading?.trim()) column.heading = row.heading;
  if (row.image) column.image = row.image;
  if (row.alt?.trim()) column.alt = row.alt;
  if (row.linkLabel?.trim()) column.linkLabel = row.linkLabel;
  if (row.linkUrl?.trim()) column.linkUrl = row.linkUrl;
  return column;
}

export function ColumnsEditor({ block, onChange, readOnly }: BlockEditorProps<ColumnsBlock>) {
  const { fields, blocks } = useEditorMessages();
  const words = blocks.columns;
  const { commit } = blockEditor(block, onChange);
  return (
    <EditorFields readOnly={readOnly}>
      <ItemList
        words={words.list}
        items={block.columns}
        min={MIN_COLUMNS}
        max={MAX_COLUMNS}
        onChange={(columns) => commit({ ...block, columns: columns.map(toColumn) })}
        create={() => ({ body: '' })}
        limitHint={words.list.limit(MAX_COLUMNS)}
        hint={words.hint}
        renderItem={(column, update) => (
          <>
            <ImageField
              label={fields.pictureOptional}
              value={column.image}
              disabled={readOnly}
              onChange={(image) => update({ image })}
            />
            <FieldPair>
              <TextField
                label={fields.headingOptional}
                value={column.heading ?? ''}
                onChange={(heading) => update({ heading })}
              />
              <TextField
                label={fields.altText}
                value={column.alt ?? ''}
                onChange={(alt) => update({ alt })}
              />
            </FieldPair>
            <AreaField
              label={fields.text}
              rows={3}
              value={column.body}
              onChange={(body) => update({ body })}
            />
            <FieldPair>
              <TextField
                label={fields.linkLabelOptional}
                value={column.linkLabel ?? ''}
                onChange={(linkLabel) => update({ linkLabel })}
              />
              <TextField
                label={fields.linkOptional}
                value={column.linkUrl ?? ''}
                onChange={(linkUrl) => update({ linkUrl })}
              />
            </FieldPair>
          </>
        )}
      />
    </EditorFields>
  );
}

// --- Button --------------------------------------------------------------------------------------

export function ButtonEditor({ block, onChange, readOnly }: BlockEditorProps<ButtonBlock>) {
  const { fields, blocks } = useEditorMessages();
  const words = blocks.button;
  const { patch } = blockEditor(block, onChange);
  const styles: readonly Choice<ButtonBlock['variant']>[] = [
    { value: 'solid', label: words.solid, hint: words.solidHint },
    { value: 'outline', label: words.outline, hint: words.outlineHint },
  ];
  return (
    <EditorFields readOnly={readOnly}>
      <FieldPair>
        <TextField
          label={fields.buttonLabel}
          value={block.label}
          onChange={(label) => patch({ label })}
        />
        <TextField
          label={fields.link}
          placeholder={words.linkPlaceholder}
          value={block.url}
          onChange={(url) => patch({ url })}
          help={words.linkHelp}
        />
      </FieldPair>
      <ChoiceField
        legend={words.style}
        value={block.variant}
        onChange={(variant) => patch({ variant })}
        options={styles}
      />
    </EditorFields>
  );
}

// --- Divider -------------------------------------------------------------------------------------

export function DividerEditor({ block, onChange, readOnly }: BlockEditorProps<DividerBlock>) {
  const words = useEditorMessages().blocks.divider;
  const { patch } = blockEditor(block, onChange);
  return (
    <EditorFields readOnly={readOnly}>
      <ChoiceField
        legend={words.thickness}
        value={block.thickness}
        onChange={(thickness) => patch({ thickness })}
        options={[
          { value: 'hairline', label: words.hairline },
          { value: 'thick', label: words.thick },
        ]}
      />
      <Note>{words.note}</Note>
    </EditorFields>
  );
}

// --- Spacer --------------------------------------------------------------------------------------

/** The email's height for each spacer size, in pixels. */
const SPACER_HEIGHTS: Readonly<Record<SpacerBlock['size'], number>> = {
  small: 12,
  medium: 28,
  large: 56,
};

export function SpacerEditor({ block, onChange, readOnly }: BlockEditorProps<SpacerBlock>) {
  const { common, blocks } = useEditorMessages();
  const words = blocks.spacer;
  const { patch } = blockEditor(block, onChange);
  const sizes: readonly Choice<SpacerBlock['size']>[] = (['small', 'medium', 'large'] as const).map(
    (size) => ({ value: size, label: words[size], hint: common.pixels(SPACER_HEIGHTS[size]) }),
  );
  return (
    <EditorFields readOnly={readOnly}>
      <ChoiceField
        legend={words.size}
        value={block.size}
        onChange={(size) => patch({ size })}
        options={sizes}
      />
    </EditorFields>
  );
}

// --- Quote ---------------------------------------------------------------------------------------

export function QuoteEditor({ block, onChange, readOnly }: BlockEditorProps<QuoteBlock>) {
  const words = useEditorMessages().blocks.quote;
  const { patch, commit } = blockEditor(block, onChange);
  return (
    <EditorFields readOnly={readOnly}>
      <AreaField
        label={words.quote}
        rows={4}
        value={block.quote}
        onChange={(quote) => patch({ quote })}
      />
      <TextField
        label={words.attribution}
        placeholder={words.attributionPlaceholder}
        value={block.attribution ?? ''}
        onChange={(value) => commit(withOptional(block, 'attribution', value))}
      />
    </EditorFields>
  );
}
