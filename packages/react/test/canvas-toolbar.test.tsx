import type { ComponentProps } from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CanvasToolbar } from '../src/canvas/canvas-toolbar';
import { CANVAS_DEFINITIONS } from './helpers/canvas-registry';
import { TEST_SOURCES, testBlock } from './helpers/fixtures';
import { renderInEditor } from './helpers/render';

const letter = testBlock('letter', { body: 'Autumn is our busiest season.' });
const header = testBlock('header');
const footer = testBlock('footer');
const events = testBlock('event_tiles', { source: 'events' });

function renderToolbar(props: ComponentProps<typeof CanvasToolbar>) {
  return renderInEditor(<CanvasToolbar {...props} />, {
    context: { definitions: CANVAS_DEFINITIONS, sources: [TEST_SOURCES.events] },
  });
}

describe('CanvasToolbar', () => {
  it('names the toolbar after the block it acts on', () => {
    renderToolbar({ block: letter, index: 1, count: 4 });
    expect(screen.getByRole('toolbar', { name: 'Letter block' })).toBeInTheDocument();
  });

  it('disables Move up on the first block and Move down on the last', () => {
    const { unmount } = renderToolbar({ block: header, index: 0, count: 4 });
    expect(screen.getByRole('button', { name: 'Move Header up' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move Header down' })).toBeEnabled();
    unmount();

    renderToolbar({ block: letter, index: 3, count: 4 });
    expect(screen.getByRole('button', { name: 'Move Letter down' })).toBeDisabled();
  });

  it('emits move, insert, hide, duplicate and delete', async () => {
    const handlers = {
      onMoveUp: vi.fn(),
      onMoveDown: vi.fn(),
      onInsertAbove: vi.fn(),
      onInsertBelow: vi.fn(),
      onToggleHidden: vi.fn(),
      onDuplicate: vi.fn(),
      onRemove: vi.fn(),
    };
    renderToolbar({ block: letter, index: 1, count: 4, ...handlers });
    for (const name of [
      'Move Letter up',
      'Move Letter down',
      'Insert a block above Letter',
      'Insert a block below Letter',
      'Hide Letter',
      'Duplicate Letter',
      'Delete Letter',
    ]) {
      await userEvent.click(screen.getByRole('button', { name }));
    }
    for (const handler of Object.values(handlers)) expect(handler).toHaveBeenCalledOnce();
  });

  it('flips the hide button to Show and presses it when the block is hidden', () => {
    renderToolbar({ block: { ...letter, hidden: true }, index: 1, count: 4 });
    expect(screen.getByRole('button', { name: 'Show Letter' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('neither copies nor deletes a structural block, of which an issue holds one', () => {
    renderToolbar({ block: header, index: 0, count: 4 });
    expect(screen.queryByRole('button', { name: 'Delete Header' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Duplicate Header' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hide Header' })).toBeInTheDocument();
  });

  it('keeps the footer last and in the email', () => {
    renderToolbar({ block: footer, index: 3, count: 4 });
    for (const name of ['Hide Footer', 'Duplicate Footer', 'Delete Footer']) {
      expect(screen.queryByRole('button', { name })).not.toBeInTheDocument();
    }
    // Nothing goes below the footer, so only Insert above is offered.
    expect(
      screen.queryByRole('button', { name: 'Insert a block below Footer' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Insert a block above Footer' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Move Footer up' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move Footer down' })).toBeDisabled();
  });

  it('lets an older hidden footer be shown without offering Duplicate', async () => {
    const onToggleHidden = vi.fn();
    renderToolbar({ block: { ...footer, hidden: true }, index: 3, count: 4, onToggleHidden });
    await userEvent.click(screen.getByRole('button', { name: 'Show Footer' }));
    expect(onToggleHidden).toHaveBeenCalledOnce();
    expect(screen.queryByRole('button', { name: 'Duplicate Footer' })).not.toBeInTheDocument();
  });

  it('offers Refresh, named for the source, only where a registered source fills the block', async () => {
    const onRefresh = vi.fn();
    const { unmount } = renderToolbar({ block: events, index: 2, count: 4, onRefresh });
    await userEvent.click(
      screen.getByRole('button', { name: 'Refresh Event tiles from Club events' }),
    );
    expect(onRefresh).toHaveBeenCalledOnce();
    unmount();

    for (const block of [
      letter,
      // A source the host never registered, and a registered source of another block type.
      testBlock('dated_list', { source: 'calendar' }),
      testBlock('name_list', { source: 'events' }),
    ]) {
      const { unmount: done } = renderToolbar({ block, index: 1, count: 4 });
      expect(screen.queryByRole('button', { name: /^Refresh/ })).not.toBeInTheDocument();
      done();
    }
  });

  it('disables Refresh and marks it busy while the block refreshes', () => {
    renderToolbar({ block: events, index: 2, count: 4, refreshing: true });
    const refresh = screen.getByRole('button', { name: 'Refresh Event tiles from Club events' });
    expect(refresh).toBeDisabled();
    expect(refresh).toHaveAttribute('aria-busy', 'true');
  });
});
