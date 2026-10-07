import type { ComponentProps } from 'react';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { paletteGroups } from '@subterra-technologies/blockletter';
import type { EditorBlockDefinition } from '../src/editor/types';
import { BlockPalette } from '../src/palette/block-palette';
import { CANVAS_DEFINITIONS, SHOUT_DEFINITION } from './helpers/canvas-registry';
import { testBlock } from './helpers/fixtures';
import { renderInEditor } from './helpers/render';

function renderPalette(
  props: Partial<ComponentProps<typeof BlockPalette>> = {},
  context: { definitions?: readonly EditorBlockDefinition[]; readOnly?: boolean } = {},
) {
  return renderInEditor(<BlockPalette headingId="palette" {...props} />, {
    context: { definitions: CANVAS_DEFINITIONS, ...context },
  });
}

/**
 * Several block labels are prefixes of others ("Image" / "Image + text"), so a button is found
 * by the description id it points `aria-describedby` at rather than by its accessible name.
 */
function paletteItem(type: string, headingId = 'palette'): HTMLButtonElement {
  const button = document
    .getElementById(`${headingId}-hint-${type}`)
    ?.closest<HTMLButtonElement>('button');
  if (!button) throw new Error(`No palette button for ${type}`);
  return button;
}

const GROUPS = paletteGroups(CANVAS_DEFINITIONS);
const FIRST = GROUPS[0]!.items[0]!;

describe('BlockPalette', () => {
  it('heads the palette with the block count and how to use it', () => {
    renderPalette({ countLabel: '11 of 30 blocks' });
    expect(screen.getByRole('heading', { level: 2, name: 'Blocks' })).toBeInTheDocument();
    expect(screen.getByText('11 of 30 blocks')).toBeInTheDocument();
    expect(
      screen.getByText('Choose a block to add it at the end, or drag it onto the canvas.'),
    ).toBeInTheDocument();
  });

  it('names each block by its label alone, with its definition’s description', () => {
    renderPalette();
    expect(screen.getByRole('button', { name: 'Quote' })).toHaveAccessibleDescription(
      'One pull quote in large type, with an attribution.',
    );
  });

  it('renders every group and every block in the definitions', () => {
    renderPalette();
    for (const group of GROUPS) {
      expect(screen.getByRole('heading', { level: 3, name: group.label })).toBeInTheDocument();
      for (const definition of group.items) {
        expect(paletteItem(definition.type)).toHaveTextContent(definition.label);
      }
    }
  });

  it('describes each item with its description', () => {
    renderPalette();
    expect(paletteItem(FIRST.type)).toHaveAttribute(
      'aria-describedby',
      `palette-hint-${FIRST.type}`,
    );
    expect(document.getElementById(`palette-hint-${FIRST.type}`)).toHaveTextContent(
      FIRST.description,
    );
  });

  it('lists a host’s own block in its own group, after the built-in ones', () => {
    renderPalette({}, { definitions: [...CANVAS_DEFINITIONS, SHOUT_DEFINITION] });
    const headings = screen
      .getAllByRole('heading', { level: 3 })
      .map((heading) => heading.textContent);
    expect(headings).toEqual(['Content', 'Layout', 'Graphics', 'Extras']);
    expect(
      within(screen.getByRole('list', { name: 'Extras' })).getByRole('button'),
    ).toHaveTextContent('Shout');
  });

  it('does not offer a second header or footer once the issue has one', () => {
    const { unmount } = renderPalette({ blocks: [testBlock('text')] });
    expect(paletteItem('header')).toBeInTheDocument();
    expect(paletteItem('footer')).toBeInTheDocument();
    unmount();

    renderPalette({ blocks: [testBlock('header'), testBlock('footer')] });
    expect(document.getElementById('palette-hint-header')).toBeNull();
    expect(document.getElementById('palette-hint-footer')).toBeNull();
    expect(paletteItem('text')).toBeInTheDocument();
  });

  it('adds a block on click — the keyboard path', async () => {
    const onAdd = vi.fn();
    renderPalette({ onAdd });
    await userEvent.click(paletteItem(FIRST.type));
    expect(onAdd).toHaveBeenCalledWith(FIRST.type);
  });

  it('is a drag source carrying a new: payload', () => {
    const onDragStart = vi.fn();
    renderPalette({ onDragStart });
    const button = paletteItem(FIRST.type);
    expect(button).toHaveAttribute('draggable', 'true');

    const setData = vi.fn();
    const dataTransfer = { setData, effectAllowed: '' };
    const event = new Event('dragstart', { bubbles: true });
    Object.defineProperty(event, 'dataTransfer', { value: dataTransfer });
    button.dispatchEvent(event);

    expect(setData).toHaveBeenCalledWith('text/plain', `new:${FIRST.type}`);
    expect(dataTransfer.effectAllowed).toBe('copy');
    expect(onDragStart).toHaveBeenCalledWith(FIRST.type);
  });

  it('disables every item and drops the drag source when full or read-only', () => {
    const { unmount } = renderPalette({ disabled: true });
    expect(paletteItem(FIRST.type)).toBeDisabled();
    expect(paletteItem(FIRST.type)).not.toHaveAttribute('draggable');
    unmount();

    renderPalette({}, { readOnly: true });
    expect(paletteItem(FIRST.type)).toBeDisabled();
  });

  it('says where the block goes while an insertion point is set, and can cancel it', async () => {
    const onCancelInsert = vi.fn();
    renderPalette({
      headingId: 'insert-palette',
      insertLabel: 'above Event tiles',
      onCancelInsert,
    });
    const heading = screen.getByRole('heading', { level: 2, name: 'Insert above Event tiles' });
    expect(heading).toHaveAttribute('id', 'insert-palette');
    expect(
      screen.getByText('The block goes exactly where the line on the canvas is.'),
    ).toBeInTheDocument();
    const group = GROUPS[0]!;
    const list = screen.getByRole('list', { name: group.label });
    expect(within(list).getAllByRole('listitem')).toHaveLength(group.items.length);
    await userEvent.click(screen.getByRole('button', { name: 'Cancel insert' }));
    expect(onCancelInsert).toHaveBeenCalled();
  });

  it('shows the descriptions and drops dragging inside a sheet, where the canvas is covered', () => {
    renderPalette({ showHints: true, draggable: false });
    expect(paletteItem(FIRST.type)).not.toHaveAttribute('draggable');
    expect(document.getElementById(`palette-hint-${FIRST.type}`)).not.toHaveClass('bl:sr-only');
    expect(
      screen.getByText('Choose a block to add it at the end of the issue.'),
    ).toBeInTheDocument();
  });

  it('keeps two palettes on one page apart when neither names its heading', () => {
    renderInEditor(
      <>
        <BlockPalette />
        <BlockPalette />
      </>,
      { context: { definitions: CANVAS_DEFINITIONS } },
    );
    const ids = screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.id);
    expect(new Set(ids).size).toBe(2);
  });
});
