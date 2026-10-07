import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import {
  ButtonEditor,
  ColumnsEditor,
  DividerEditor,
  QuoteEditor,
  SpacerEditor,
} from '../../src/inspector/editors';
import { renderEditor } from '../helpers/editor-registry';
import { testBlock } from '../helpers/fixtures';

describe('ColumnsEditor', () => {
  const block = testBlock('columns');

  it('shows one card per column with its picture, heading, alt, text and link fields', () => {
    renderEditor(ColumnsEditor, block);
    expect(screen.getByRole('list', { name: 'Columns' })).toBeInTheDocument();
    expect(screen.getByText('Column 1')).toBeInTheDocument();
    expect(screen.getByText('Column 2')).toBeInTheDocument();
    expect(screen.getAllByRole('group', { name: 'Picture (optional)' })).toHaveLength(2);
    expect(screen.getAllByLabelText('Heading (optional)')).toHaveLength(2);
    expect(screen.getAllByLabelText('Alt text')).toHaveLength(2);
    expect(screen.getAllByLabelText('Text')).toHaveLength(2);
    expect(screen.getAllByLabelText('Link (optional)')).toHaveLength(2);
    expect(screen.getByText('Two or three columns. They stack on phones.')).toBeInTheDocument();
  });

  it('disables Remove at the minimum of two and Add at the maximum of three', async () => {
    renderEditor(ColumnsEditor, block);
    expect(screen.getByRole('button', { name: 'Remove column 1' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Add column' }));
    expect(screen.getByRole('button', { name: 'Add column' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Remove column 1' })).toBeEnabled();
  });

  it('adds an empty column', async () => {
    const { latest } = renderEditor(ColumnsEditor, block);
    await userEvent.click(screen.getByRole('button', { name: 'Add column' }));
    expect(latest().columns).toEqual([...block.columns, { body: '' }]);
  });

  it('edits one column and leaves blank optional fields off the payload', async () => {
    const { latest } = renderEditor(ColumnsEditor, {
      ...block,
      columns: [{ body: '' }, { body: '' }],
    });
    await userEvent.type(screen.getAllByLabelText('Heading (optional)')[1] as HTMLElement, 'Two');
    const [first, second] = latest().columns;
    expect(first).toEqual({ body: '' });
    expect(second).toEqual({ heading: 'Two', body: '' });
  });

  it('moves focus to the column that takes a removed one’s place', async () => {
    renderEditor(ColumnsEditor, {
      ...block,
      columns: [{ body: 'a' }, { body: 'b' }, { body: 'c' }],
    });
    await userEvent.click(screen.getByRole('button', { name: 'Remove column 2' }));
    expect(screen.getByText('Column 2')).toHaveFocus();
    expect(
      screen.getAllByLabelText('Text').map((field) => (field as HTMLTextAreaElement).value),
    ).toEqual(['a', 'c']);
  });
});

describe('ButtonEditor', () => {
  const block = testBlock('button');

  it('shows the label, the link with its helper, and the two styles with their descriptions', () => {
    renderEditor(ButtonEditor, block);
    expect(screen.getByLabelText('Button label')).toHaveValue('Learn more');
    expect(screen.getByLabelText('Link')).toHaveAttribute('placeholder', '/events');
    expect(screen.getByLabelText('Link')).toHaveAccessibleDescription(
      'Paths like /events become full links when the email is rendered.',
    );
    expect(screen.getByRole('radiogroup', { name: 'Button style' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Solid' })).toHaveAccessibleDescription(
      'Filled with the accent colour',
    );
    expect(screen.getByText('Accent border, clear inside')).toBeInTheDocument();
  });

  it('emits the chosen variant', async () => {
    const { latest } = renderEditor(ButtonEditor, block);
    await userEvent.click(screen.getByLabelText(/^Outline/));
    expect(latest().variant).toBe('outline');
  });
});

describe('DividerEditor', () => {
  const block = testBlock('divider');

  it('shows the thickness choice and the appearance note', () => {
    renderEditor(DividerEditor, block);
    expect(screen.getByRole('radiogroup', { name: 'Rule thickness' })).toBeInTheDocument();
    expect(screen.getByLabelText('Hairline')).toBeChecked();
    expect(
      screen.getByText(
        'A divider has no text. Use the Appearance tab to change its colour and the space around it.',
      ),
    ).toBeInTheDocument();
  });

  it('emits the chosen thickness', async () => {
    const { latest } = renderEditor(DividerEditor, block);
    await userEvent.click(screen.getByLabelText('Thick'));
    expect(latest().thickness).toBe('thick');
  });
});

describe('SpacerEditor', () => {
  const block = testBlock('spacer');

  it('shows the three gap sizes with their pixel notes', () => {
    renderEditor(SpacerEditor, block);
    expect(screen.getByRole('radiogroup', { name: 'Gap size' })).toBeInTheDocument();
    expect(screen.getByText('12px')).toBeInTheDocument();
    expect(screen.getByText('28px')).toBeInTheDocument();
    expect(screen.getByText('56px')).toBeInTheDocument();
    expect(screen.getByLabelText(/^Medium/)).toBeChecked();
  });

  it('emits the chosen size', async () => {
    const { latest } = renderEditor(SpacerEditor, block);
    await userEvent.click(screen.getByLabelText(/^Large/));
    expect(latest().size).toBe('large');
  });
});

describe('QuoteEditor', () => {
  const block = testBlock('quote');

  it('shows the quote and the optional attribution', () => {
    renderEditor(QuoteEditor, block);
    expect(screen.getByLabelText('Quote')).toHaveValue(block.quote);
    expect(screen.getByLabelText('Who said it (optional)')).toHaveAttribute(
      'placeholder',
      'Sam Rivera, Corner Bakery',
    );
  });

  it('drops an emptied attribution rather than storing an empty string', async () => {
    const { latest } = renderEditor(QuoteEditor, { ...block, attribution: 'X' });
    await userEvent.clear(screen.getByLabelText('Who said it (optional)'));
    expect(latest()).not.toHaveProperty('attribution');
  });

  it('disables every field when read-only', () => {
    renderEditor(QuoteEditor, block, { readOnly: true });
    expect(screen.getByLabelText('Quote')).toBeDisabled();
  });
});
