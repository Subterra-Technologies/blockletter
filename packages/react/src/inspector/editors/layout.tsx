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
  const { commit } = blockEditor(block, onChange);
  return (
    <EditorFields readOnly={readOnly}>
      <ItemList
        label="Columns"
        noun="column"
        items={block.columns}
        min={MIN_COLUMNS}
        max={MAX_COLUMNS}
        onChange={(columns) => commit({ ...block, columns: columns.map(toColumn) })}
        create={() => ({ body: '' })}
        addLabel="Add column"
        limitHint={`A columns block holds up to ${MAX_COLUMNS} columns.`}
        hint="Two or three columns. They stack on phones."
        renderItem={(column, update) => (
          <>
            <ImageField
              label="Picture (optional)"
              value={column.image}
              disabled={readOnly}
              onChange={(image) => update({ image })}
            />
            <FieldPair>
              <TextField
                label="Heading (optional)"
                value={column.heading ?? ''}
                onChange={(heading) => update({ heading })}
              />
              <TextField
                label="Alt text"
                value={column.alt ?? ''}
                onChange={(alt) => update({ alt })}
              />
            </FieldPair>
            <AreaField
              label="Text"
              rows={3}
              value={column.body}
              onChange={(body) => update({ body })}
            />
            <FieldPair>
              <TextField
                label="Link label (optional)"
                value={column.linkLabel ?? ''}
                onChange={(linkLabel) => update({ linkLabel })}
              />
              <TextField
                label="Link (optional)"
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

const BUTTON_STYLES: readonly Choice<ButtonBlock['variant']>[] = [
  { value: 'solid', label: 'Solid', hint: 'Filled with the accent colour' },
  { value: 'outline', label: 'Outline', hint: 'Accent border, clear inside' },
];

export function ButtonEditor({ block, onChange, readOnly }: BlockEditorProps<ButtonBlock>) {
  const { patch } = blockEditor(block, onChange);
  return (
    <EditorFields readOnly={readOnly}>
      <FieldPair>
        <TextField
          label="Button label"
          value={block.label}
          onChange={(label) => patch({ label })}
        />
        <TextField
          label="Link"
          placeholder="/events"
          value={block.url}
          onChange={(url) => patch({ url })}
          help="Paths like /events become full links when the email is rendered."
        />
      </FieldPair>
      <ChoiceField
        legend="Button style"
        value={block.variant}
        onChange={(variant) => patch({ variant })}
        options={BUTTON_STYLES}
      />
    </EditorFields>
  );
}

// --- Divider -------------------------------------------------------------------------------------

export function DividerEditor({ block, onChange, readOnly }: BlockEditorProps<DividerBlock>) {
  const { patch } = blockEditor(block, onChange);
  return (
    <EditorFields readOnly={readOnly}>
      <ChoiceField
        legend="Rule thickness"
        value={block.thickness}
        onChange={(thickness) => patch({ thickness })}
        options={[
          { value: 'hairline', label: 'Hairline' },
          { value: 'thick', label: 'Thick' },
        ]}
      />
      <Note>
        A divider has no text. Use the Appearance tab to change its colour and the space around it.
      </Note>
    </EditorFields>
  );
}

// --- Spacer --------------------------------------------------------------------------------------

const SPACER_SIZES: readonly Choice<SpacerBlock['size']>[] = [
  { value: 'small', label: 'Small', hint: '12px' },
  { value: 'medium', label: 'Medium', hint: '28px' },
  { value: 'large', label: 'Large', hint: '56px' },
];

export function SpacerEditor({ block, onChange, readOnly }: BlockEditorProps<SpacerBlock>) {
  const { patch } = blockEditor(block, onChange);
  return (
    <EditorFields readOnly={readOnly}>
      <ChoiceField
        legend="Gap size"
        value={block.size}
        onChange={(size) => patch({ size })}
        options={SPACER_SIZES}
      />
    </EditorFields>
  );
}

// --- Quote ---------------------------------------------------------------------------------------

export function QuoteEditor({ block, onChange, readOnly }: BlockEditorProps<QuoteBlock>) {
  const { patch, commit } = blockEditor(block, onChange);
  return (
    <EditorFields readOnly={readOnly}>
      <AreaField
        label="Quote"
        rows={4}
        value={block.quote}
        onChange={(quote) => patch({ quote })}
      />
      <TextField
        label="Who said it (optional)"
        placeholder="Sam Rivera, Corner Bakery"
        value={block.attribution ?? ''}
        onChange={(value) => commit(withOptional(block, 'attribution', value))}
      />
    </EditorFields>
  );
}
