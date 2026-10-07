import { createRef, useState } from 'react';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
  LIMITS,
  defineBlock,
  type BlockBase,
  type BuiltInBlockType,
} from '@subterra-technologies/blockletter';
import type { EditorBlockDefinition } from '../../src/editor/types';
import { BlockInspector, type BlockInspectorHandle } from '../../src/inspector/block-inspector';
import { TEST_SOURCES, everyBlock, testBlock } from '../helpers/fixtures';
import { EDITOR_DEFINITIONS } from '../helpers/editor-registry';
import { renderInEditor } from '../helpers/render';

const HEADER = testBlock('header', { title: 'Book club news', issueLabel: 'November 2026' });
const LETTER = testBlock('letter', { body: 'Dear readers,' });

function renderInspector(
  block: BlockBase,
  props: Partial<Parameters<typeof BlockInspector>[0]> = {},
  context: Parameters<typeof renderInEditor>[1] = {},
) {
  const onChange = vi.fn();
  const view = renderInEditor(<BlockInspector block={block} onChange={onChange} {...props} />, {
    ...context,
    context: { definitions: EDITOR_DEFINITIONS, ...context.context },
  });
  return { ...view, onChange };
}

describe('BlockInspector', () => {
  it('names the block in a focusable heading the editor can target', () => {
    renderInspector(HEADER, { headingId: 'editor-heading' });
    const heading = screen.getByRole('heading', { level: 2, name: 'Header' });
    expect(heading).toHaveAttribute('id', 'editor-heading');
    expect(heading).toHaveAttribute('tabindex', '-1');
  });

  it('uses the definition’s label for the selected block', () => {
    renderInspector(LETTER);
    expect(screen.getByRole('heading', { level: 2, name: 'Letter' })).toBeInTheDocument();
  });

  it('focusHeading on the ref moves focus to the heading', () => {
    const ref = createRef<BlockInspectorHandle>();
    renderInspector(HEADER, { ref });
    ref.current?.focusHeading();
    expect(screen.getByRole('heading', { level: 2 })).toHaveFocus();
  });

  it('takes focus without dragging the page to it', () => {
    // Picking a block two thirds down a long canvas moved focus here, and the browser scrolled
    // to it, throwing the reader back to the top of the issue.
    const ref = createRef<BlockInspectorHandle>();
    renderInspector(HEADER, { ref });
    const focus = vi.spyOn(screen.getByRole('heading', { level: 2 }), 'focus');
    ref.current?.focusHeading();
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
  });

  it('flags a hidden block, and a block a registered source fills', () => {
    renderInspector(
      testBlock('event_tiles', { hidden: true, source: 'events' }),
      {},
      { context: { sources: [TEST_SOURCES.events] } },
    );
    expect(screen.getByText('Hidden from email')).toBeInTheDocument();
    expect(screen.getByText('Filled from Club events')).toBeInTheDocument();
  });

  it('shows no badges for a visible, hand-written block', () => {
    renderInspector(HEADER);
    expect(screen.queryByText('Hidden from email')).toBeNull();
    expect(screen.queryByText(/^Filled from/)).toBeNull();
  });

  it('says nothing about a source the host has not registered', () => {
    renderInspector(
      testBlock('sponsors', { source: 'sponsors' }),
      {},
      {
        context: { sources: [TEST_SOURCES.events] },
      },
    );
    expect(screen.queryByText(/^Filled from/)).toBeNull();
  });

  it('explains the read-only state in general words, or the host’s own', () => {
    const { unmount } = renderInspector(HEADER, { readOnly: true });
    expect(screen.getByRole('note')).toHaveTextContent(
      'This issue is read-only, so its content can’t be changed.',
    );
    unmount();

    renderInspector(HEADER, {
      readOnly: true,
      readOnlyReason:
        'This issue was sent, so its content is read-only. Duplicate it to keep working.',
    });
    expect(screen.getByRole('note')).toHaveTextContent(
      'This issue was sent, so its content is read-only. Duplicate it to keep working.',
    );
  });

  it('takes read-only from the editor context when the prop is left out', () => {
    renderInspector(HEADER, {}, { context: { readOnly: true } });
    expect(screen.getByRole('note')).toBeInTheDocument();
    expect(screen.getByLabelText('Title')).toBeDisabled();
  });

  it('shows no read-only note on an editable issue', () => {
    renderInspector(HEADER);
    expect(screen.queryByRole('note')).toBeNull();
  });

  it('disables every field and emits nothing while read-only', async () => {
    const { onChange } = renderInspector(HEADER, { readOnly: true });
    const title = screen.getByLabelText('Title');
    expect(title).toBeDisabled();
    await userEvent.type(title, 'x');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('lists the block’s issues in an alert', () => {
    renderInspector(testBlock('text', { body: 'x'.repeat(LIMITS.maxTextLength + 1) }));
    const alert = screen.getByRole('alert');
    expect(within(alert).getByRole('listitem')).toHaveTextContent(
      'Keep the text to 5,000 characters or fewer.',
    );
  });

  it('renders no alert when the block has no issues', () => {
    renderInspector(HEADER);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('shows the form the block’s definition provides, and passes its changes on', async () => {
    const { onChange } = renderInspector(HEADER);
    expect(screen.getByLabelText('Issue label')).toHaveValue('November 2026');
    await userEvent.type(screen.getByLabelText('Title'), '!');
    expect(onChange).toHaveBeenLastCalledWith({ ...HEADER, title: 'Book club news!' });
  });

  it('gives a host’s own block its own form, exactly as a built-in gets one', async () => {
    interface ShoutBlock extends BlockBase<'shout'> {
      text: string;
    }
    const shoutDefinition = {
      ...defineBlock<ShoutBlock>({
        type: 'shout',
        label: 'Shout',
        description: 'A short line in capitals.',
        group: 'extras',
        create: () => ({ text: '' }),
        validate: () => [],
        issues: (block) => (block.text ? [] : ['Say something.']),
        render: () => '',
      }),
      icon: () => null,
      Editor: ({ block, onChange, readOnly }) => (
        <label>
          Shout text
          <input
            value={block.text}
            disabled={readOnly}
            onChange={(event) => onChange({ ...block, text: event.target.value })}
          />
        </label>
      ),
    } satisfies EditorBlockDefinition<ShoutBlock>;
    const shout: ShoutBlock = { id: 'shout-1', type: 'shout', hidden: false, text: '' };

    const { onChange } = renderInspector(
      shout,
      {},
      {
        context: {
          definitions: [...EDITOR_DEFINITIONS, shoutDefinition as unknown as EditorBlockDefinition],
        },
      },
    );
    expect(screen.getByRole('heading', { level: 2, name: 'Shout' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Say something.');
    await userEvent.type(screen.getByLabelText('Shout text'), 'H');
    expect(onChange).toHaveBeenLastCalledWith({ ...shout, text: 'H' });
  });

  it('says so when no editor is registered for the block’s type', () => {
    renderInspector({ id: 'mystery-1', type: 'mystery', hidden: false });
    expect(screen.getByRole('heading', { level: 2, name: 'mystery' })).toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveTextContent(
      'There is no editor for “mystery” blocks, so this block’s content can’t be changed here.',
    );
  });

  it('leaves how the block looks to the Appearance panel', () => {
    renderInspector(HEADER);
    expect(screen.queryByText('Background')).toBeNull();
    expect(screen.queryByLabelText('Alignment')).toBeNull();
  });

  it('starts the form afresh for another block of the same type', async () => {
    const first = testBlock('image', { id: 'image-1' });
    const second = testBlock('image', { id: 'image-2' });
    function Switcher() {
      const [block, setBlock] = useState<BlockBase>(first);
      return (
        <>
          <button type="button" onClick={() => setBlock(second)}>
            Next image
          </button>
          <BlockInspector block={block} onChange={vi.fn()} />
        </>
      );
    }
    renderInEditor(<Switcher />, { context: { definitions: EDITOR_DEFINITIONS } });
    // Half typed, never applied: it belongs to the first image only.
    await userEvent.type(screen.getByLabelText(/Image URL/), 'https://photos.example/a');
    await userEvent.click(screen.getByRole('button', { name: 'Next image' }));
    expect(screen.getByLabelText(/Image URL/)).toHaveValue('');
  });

  it.each([
    ['image_text', 'Picture side'],
    ['banner', 'Place the headline over the image'],
    ['photo_grid', 'Photos'],
    ['stats', 'Numbers'],
    ['columns', 'Columns'],
    ['button', 'Button style'],
    ['divider', 'Rule thickness'],
    ['spacer', 'Gap size'],
    ['sponsors', 'Sponsors'],
    ['quote', 'Quote'],
    ['dated_list', 'Subheading'],
    ['event_tiles', 'Events'],
    ['name_list', 'Intro'],
    ['post_list', 'Posts'],
    ['callout', 'Button link'],
    ['article', 'Section heading'],
    ['footer', 'Mailing address'],
  ] as const)('reaches the %s form through its definition', (type: BuiltInBlockType, label) => {
    // The fixtures' list blocks hold items, so their rows are there to find.
    renderInspector(everyBlock().find((block) => block.type === type) ?? testBlock(type));
    expect(screen.getByLabelText(label)).toBeInTheDocument();
  });

  it('renders every built-in block’s form under its own name', () => {
    for (const block of everyBlock()) {
      const { unmount } = renderInspector(block);
      const definition = EDITOR_DEFINITIONS.find((candidate) => candidate.type === block.type);
      expect(
        screen.getByRole('heading', { level: 2, name: definition?.label }),
      ).toBeInTheDocument();
      expect(screen.queryByText(/There is no editor/)).toBeNull();
      unmount();
    }
  });
});
