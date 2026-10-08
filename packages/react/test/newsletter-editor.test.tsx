import { act, createEvent, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DataSource, EventTileItem } from '@subterra-technologies/blockletter';
// The public entry, the way a host imports the editor.
import {
  EditorFields,
  TextField,
  builtInEditorBlocks,
  type BlockEditorProps,
  type EditorBlockDefinition,
} from '../src';
import { SHOUT_DEFINITION, type ShoutBlock } from './helpers/canvas-registry';
import {
  DIVIDER,
  EVENTS,
  FOOTER,
  HEADER,
  SEPTEMBER,
  TEXT,
  blockTab,
  canvas,
  issue,
  renderEditor,
} from './helpers/editor-harness';
import { TEST_SOURCES } from './helpers/fixtures';

/**
 * The assembled editor, driven the way a host drives it: the document held in the host's state,
 * every edit arriving through `onChange`. The editing cases are the ones the message builder it
 * was extracted from was tested for; nothing here saves or sends, because the editor does neither.
 */

const palette = () => within(screen.getByRole('region', { name: 'Block palette' }));
const paletteButton = (name: string) => palette().getByRole('button', { name });
const inspectorTab = (name: string) =>
  within(screen.getByRole('region', { name: 'Inspector' })).getByRole('tab', { name });

/** jsdom has no DataTransfer, so a drag supplies the little the handlers read. */
const dataTransfer = (payload = '') => ({
  getData: () => payload,
  setData: vi.fn(),
  effectAllowed: '',
  dropEffect: '',
});

/** A dragover at a height: jsdom's event constructor drops `clientY`, so it is set on the event. */
function dragOverAt(element: Element, clientY: number): void {
  const event = createEvent.dragOver(element, { dataTransfer: dataTransfer() });
  Object.defineProperty(event, 'clientY', { value: clientY });
  fireEvent(element, event);
}

/** A host's own block: a core definition, an icon, and a form of its own; no canvas drawing. */
function ShoutEditor({ block, onChange, readOnly }: BlockEditorProps<ShoutBlock>) {
  return (
    <EditorFields readOnly={readOnly}>
      <TextField
        label="Shout text"
        value={block.text}
        onChange={(text) => onChange({ ...block, text })}
      />
    </EditorFields>
  );
}
const SHOUT: EditorBlockDefinition = { ...SHOUT_DEFINITION, Editor: ShoutEditor };

beforeEach(() => {
  // Only the clock is fixed, so "today" is the same whenever this runs; timers stay real.
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-07T15:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('NewsletterEditor', () => {
  it('opens on the issue’s blocks, with the words already written in them', () => {
    const { onChange } = renderEditor(issue([HEADER, TEXT, FOOTER]));
    expect(canvas().getByText('Join us Friday at nine.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Canvas' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Preview' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(palette().getByText('3 of 30 blocks')).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('adds a palette block just above the footer, chosen and focused', async () => {
    const { user, onChange, types } = renderEditor(issue([HEADER, TEXT, FOOTER]));
    await user.click(paletteButton('Divider'));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(types()).toEqual(['header', 'text', 'divider', 'footer']);
    expect(blockTab('Divider')).toHaveAttribute('aria-selected', 'true');
    expect(blockTab('Divider')).toHaveFocus();
  });

  it.each(['above', 'below'] as const)(
    'inserts a palette block %s the chosen block, then forgets the insertion point',
    async (position) => {
      const { user, types } = renderEditor(issue([HEADER, TEXT, FOOTER]));
      await user.click(blockTab('Text'));
      await user.click(screen.getByRole('button', { name: `Insert a block ${position} Text` }));
      expect(screen.getByRole('heading', { name: `Insert ${position} Text` })).toHaveFocus();
      await user.click(paletteButton('Divider'));

      expect(screen.queryByRole('button', { name: 'Cancel insert' })).not.toBeInTheDocument();
      expect(blockTab('Divider')).toHaveAttribute('aria-selected', 'true');
      expect(types()).toEqual(
        position === 'above'
          ? ['header', 'divider', 'text', 'footer']
          : ['header', 'text', 'divider', 'footer'],
      );
    },
  );

  it('gives an insertion up with Cancel or Escape, and never adds below the footer', async () => {
    const { user, onChange, types } = renderEditor(issue([HEADER, TEXT, FOOTER]));
    await user.click(blockTab('Footer'));
    // The footer carries the unsubscribe line: it stays, visible, and there is one of it.
    for (const action of ['Delete Footer', 'Hide Footer', 'Duplicate Footer']) {
      expect(screen.queryByRole('button', { name: action })).not.toBeInTheDocument();
    }

    await user.click(screen.getByRole('button', { name: 'Insert a block above Footer' }));
    await user.click(screen.getByRole('button', { name: 'Cancel insert' }));
    expect(blockTab('Footer')).toHaveFocus();

    await user.click(screen.getByRole('button', { name: 'Insert a block above Footer' }));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('button', { name: 'Cancel insert' })).not.toBeInTheDocument();
    expect(blockTab('Footer')).toHaveFocus();
    expect(onChange).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Insert a block above Footer' }));
    await user.click(paletteButton('Divider'));
    expect(types()).toEqual(['header', 'text', 'divider', 'footer']);
  });

  it('moves the focused block with Alt and the arrows, keeping the focus on it', async () => {
    const { user, onChange, types } = renderEditor(issue([HEADER, TEXT, DIVIDER, FOOTER]));
    act(() => blockTab('Divider').focus());

    await user.keyboard('{Alt>}{ArrowUp}{/Alt}');
    expect(types()).toEqual(['header', 'divider', 'text', 'footer']);
    // Chosen by moving it, so the inspector does not take the focus away.
    expect(blockTab('Divider')).toHaveAttribute('aria-selected', 'true');
    expect(blockTab('Divider')).toHaveFocus();

    await user.keyboard('{Alt>}{ArrowDown}{/Alt}');
    expect(types()).toEqual(['header', 'text', 'divider', 'footer']);
    expect(blockTab('Divider')).toHaveFocus();

    // Nothing goes below the footer.
    await user.keyboard('{Alt>}{ArrowDown}{/Alt}');
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it('drops a block dragged from the palette where the line is', () => {
    const { types } = renderEditor(issue([HEADER, TEXT, FOOTER]));
    const transfer = dataTransfer('new:divider');
    fireEvent.dragStart(paletteButton('Divider'), { dataTransfer: transfer });
    const row = blockTab('Text').closest('li');
    if (!row) throw new Error('A canvas tab sits in a list item');
    // The top half of the Text row: the slot above it.
    vi.spyOn(row, 'getBoundingClientRect').mockReturnValue({ top: 0, height: 100 } as DOMRect);
    dragOverAt(row, 10);
    fireEvent.drop(screen.getByRole('tablist', { name: 'Canvas' }), { dataTransfer: transfer });

    expect(types()).toEqual(['header', 'divider', 'text', 'footer']);
  });

  it('edits the chosen block in the inspector and hands back the whole document', async () => {
    const { user, latest } = renderEditor(issue([HEADER, TEXT, FOOTER]));
    // The tab lies over the drawing, so a click on the block's words lands on it.
    await user.click(blockTab('Text'));
    expect(inspectorTab('Block')).toHaveAttribute('aria-selected', 'true');
    // Beside the canvas, the inspector takes the focus, so the keyboard lands in its fields.
    expect(screen.getByRole('heading', { level: 2, name: 'Text' })).toHaveFocus();

    const body = screen.getByRole('textbox', { name: 'Text' });
    await user.clear(body);
    await user.type(body, 'Doors open at eight.');

    expect(latest()).toMatchObject({ subject: 'September at the book club', period: SEPTEMBER });
    expect(latest().blocks[1]).toMatchObject({ id: TEXT.id, body: 'Doors open at eight.' });
    expect(canvas().getByText('Doors open at eight.')).toBeInTheDocument();
  });

  it('keeps a block tab open on the next pick, and goes to Block from anywhere else', async () => {
    const { user } = renderEditor(issue([HEADER, TEXT, FOOTER]));
    await user.click(blockTab('Text'));
    await user.click(inspectorTab('Appearance'));
    await user.click(blockTab('Header'));
    expect(inspectorTab('Appearance')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('heading', { level: 2, name: 'Header' })).toHaveFocus();

    await user.click(inspectorTab('Settings'));
    await user.click(blockTab('Text'));
    expect(inspectorTab('Block')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('heading', { level: 2, name: 'Text' })).toHaveFocus();
  });

  it('leaves the focus on the canvas when the inspector is stacked below it', async () => {
    const { user } = renderEditor(issue([HEADER, TEXT, FOOTER]));
    const inspector = screen.getByRole('region', { name: 'Inspector' });
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: Element,
    ) {
      const top = this === inspector ? 1200 : 0;
      return { left: 0, right: 800, top, bottom: top + 900, width: 800, height: 900 } as DOMRect;
    });
    await user.click(blockTab('Text'));

    expect(inspectorTab('Block')).toHaveAttribute('aria-selected', 'true');
    expect(blockTab('Text')).toHaveFocus();
  });

  it('restyles a block from the Appearance tab', async () => {
    const { user, latest } = renderEditor(issue([HEADER, TEXT, FOOTER]));
    await user.click(blockTab('Text'));
    await user.click(inspectorTab('Appearance'));
    await user.click(screen.getByRole('checkbox', { name: 'Edge-to-edge band' }));

    expect(latest().blocks[1]).toMatchObject({ id: TEXT.id, style: { fullWidth: true } });
  });

  it('hides a block from the email and shows it again', async () => {
    const { user, latest } = renderEditor(issue([HEADER, TEXT, FOOTER]));
    await user.click(blockTab('Text'));
    await user.click(screen.getByRole('button', { name: 'Hide Text' }));
    expect(latest().blocks[1]).toMatchObject({ id: TEXT.id, hidden: true });
    expect(blockTab('Text Hidden from email')).toHaveAttribute('data-hidden', 'true');

    await user.click(screen.getByRole('button', { name: 'Show Text' }));
    expect(latest().blocks[1]).toMatchObject({ id: TEXT.id, hidden: false });
  });

  it('copies a block beside its original and chooses the copy', async () => {
    const { user, latest, types } = renderEditor(issue([HEADER, TEXT, FOOTER]));
    await user.click(blockTab('Text'));
    await user.click(screen.getByRole('button', { name: 'Duplicate Text' }));

    expect(types()).toEqual(['header', 'text', 'text', 'footer']);
    const [, original, copy] = latest().blocks;
    expect(copy).toMatchObject({ type: 'text', body: 'Join us Friday at nine.' });
    expect(copy?.id).not.toBe(original?.id);
    const copyTab = canvas().getAllByRole('tab', { name: 'Text' })[1];
    expect(copyTab).toHaveAttribute('aria-selected', 'true');
    expect(copyTab).toHaveFocus();
  });

  it('deletes a block once asked, and hands the choice and the focus to its neighbour', async () => {
    const { user, types } = renderEditor(issue([HEADER, TEXT, DIVIDER, FOOTER]));
    await user.click(blockTab('Text'));
    await user.click(screen.getByRole('button', { name: 'Delete Text' }));
    const dialog = await screen.findByRole('alertdialog', { name: 'Delete the Text block?' });
    await user.click(within(dialog).getByRole('button', { name: 'Delete block' }));

    expect(types()).toEqual(['header', 'divider', 'footer']);
    expect(await screen.findByText('Text deleted.')).toBeInTheDocument();
    expect(blockTab('Divider')).toHaveAttribute('aria-selected', 'true');
    await waitFor(() => expect(blockTab('Divider')).toHaveFocus());
  });

  it('keeps the block when the deletion is declined', async () => {
    const { user, onChange } = renderEditor(issue([HEADER, TEXT, FOOTER]));
    await user.click(blockTab('Text'));
    await user.click(screen.getByRole('button', { name: 'Delete Text' }));
    const dialog = await screen.findByRole('alertdialog', { name: 'Delete the Text block?' });
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    expect(blockTab('Text')).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('refreshes a block from the source that fills it, and says so', async () => {
    let finish!: (items: EventTileItem[]) => void;
    const slow: DataSource<'event_tiles'> = {
      ...TEST_SOURCES.events,
      items: () =>
        new Promise<EventTileItem[]>((resolve) => {
          finish = resolve;
        }),
    };
    const { user, latest } = renderEditor(issue([HEADER, EVENTS, FOOTER]), { sources: [slow] });
    await user.click(blockTab('Event tiles Auto-filled'));
    const refresh = screen.getByRole('button', { name: 'Refresh Event tiles from Club events' });
    await user.click(refresh);
    // One refresh at a time.
    expect(refresh).toBeDisabled();

    await act(async () => finish(TEST_SOURCES.events.items()));
    expect(await screen.findByText('Refreshed from Club events.')).toBeInTheDocument();
    expect(latest().blocks[1]).toMatchObject({
      items: [
        { title: 'Author reading night' },
        { title: 'Poetry swap' },
        { title: 'Holiday book exchange' },
      ],
    });
    expect(canvas().getByText('Holiday book exchange')).toBeInTheDocument();
    expect(refresh).toBeEnabled();
  });

  it('previews the email as it will arrive, in a frame that runs nothing', async () => {
    const { user, types } = renderEditor(issue([HEADER, TEXT, FOOTER]));
    await user.click(screen.getByRole('button', { name: 'Preview' }));

    expect(screen.getByRole('button', { name: 'Preview' })).toHaveAttribute('aria-pressed', 'true');
    const frame = screen.getByTitle('Email preview');
    expect(frame).toHaveAttribute('sandbox', '');
    expect(frame.getAttribute('srcdoc')).toContain('Join us Friday at nine.');
    expect(screen.queryByRole('tablist', { name: 'Canvas' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Canvas' }));
    expect(screen.queryByTitle('Email preview')).not.toBeInTheDocument();

    // Adding a block goes back to the canvas, where the new block is.
    await user.click(screen.getByRole('button', { name: 'Preview' }));
    await user.click(paletteButton('Divider'));
    expect(types()).toEqual(['header', 'text', 'divider', 'footer']);
    expect(blockTab('Divider')).toHaveAttribute('aria-selected', 'true');
  });

  it('previews at the phone width where the desktop email would have to shrink', async () => {
    const { user } = renderEditor(issue([HEADER, TEXT, FOOTER]));
    // A phone: every column as narrow as the screen.
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      right: 360,
      top: 0,
      bottom: 800,
      width: 360,
      height: 800,
    } as DOMRect);
    await user.click(screen.getByRole('button', { name: 'Preview' }));

    expect(screen.getByRole('button', { name: /Phone/ })).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows a read-only issue without any way to change it', async () => {
    const reason = 'This issue went out on 2 October, so it can’t change.';
    const { user, onChange } = renderEditor(issue([HEADER, TEXT, DIVIDER, FOOTER]), {
      readOnly: true,
      readOnlyReason: reason,
    });
    expect(screen.queryByRole('region', { name: 'Block palette' })).not.toBeInTheDocument();
    expect(screen.getAllByText(reason).length).toBeGreaterThan(0);

    await user.click(blockTab('Divider'));
    expect(screen.queryByRole('toolbar')).not.toBeInTheDocument();
    act(() => blockTab('Divider').focus());
    await user.keyboard('{Alt>}{ArrowUp}{/Alt}');

    await user.click(blockTab('Text'));
    expect(screen.getByRole('textbox', { name: 'Text' })).toBeDisabled();
    await user.click(inspectorTab('Settings'));
    expect(screen.getByRole('textbox', { name: 'Subject' })).toBeDisabled();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('offers the brand kit only to a host that can save it', async () => {
    const first = renderEditor(issue([HEADER, TEXT, FOOTER]));
    expect(inspectorTab('Settings')).toBeInTheDocument();
    expect(
      within(screen.getByRole('region', { name: 'Inspector' })).queryByRole('tab', {
        name: 'Brand kit',
      }),
    ).not.toBeInTheDocument();
    first.unmount();

    const onBrandChange = vi.fn().mockResolvedValue(undefined);
    const { user } = renderEditor(issue([HEADER, TEXT, FOOTER]), { onBrandChange });
    await user.click(inspectorTab('Brand kit'));
    const name = screen.getByRole('textbox', { name: 'Organisation name' });
    await user.clear(name);
    await user.type(name, 'Harbor Lane Readers');
    await user.click(screen.getByRole('button', { name: 'Save brand kit' }));

    await waitFor(() =>
      expect(onBrandChange).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Harbor Lane Readers' }),
      ),
    );
    expect(await screen.findByText('Brand kit saved.')).toBeInTheDocument();
  });

  it('saves the layout as a template from the More menu', async () => {
    const onSaveAsTemplate = vi.fn().mockResolvedValue(undefined);
    const { user } = renderEditor(issue([HEADER, TEXT, FOOTER]), { onSaveAsTemplate });
    await user.click(screen.getByRole('button', { name: 'More' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Save as template…' }));
    const dialog = await screen.findByRole('dialog', { name: 'Save as template' });
    expect(within(dialog).getByRole('textbox', { name: 'Template name' })).toHaveValue(
      'September at the book club layout',
    );
    await user.click(within(dialog).getByRole('button', { name: 'Save template' }));

    await waitFor(() =>
      expect(onSaveAsTemplate).toHaveBeenCalledWith({
        name: 'September at the book club layout',
        description: '',
      }),
    );
  });

  it('has no More menu when there is no way to keep a template', () => {
    renderEditor(issue([HEADER, TEXT, FOOTER]));
    expect(screen.queryByRole('button', { name: 'More' })).not.toBeInTheDocument();
  });

  it('edits the subject and the preview line in Settings', async () => {
    const { user, latest } = renderEditor(issue([HEADER, TEXT, FOOTER]));
    await user.click(inspectorTab('Settings'));
    const subject = screen.getByRole('textbox', { name: 'Subject' });
    await user.clear(subject);
    await user.type(subject, 'October at the book club');
    const preheader = screen.getByRole('textbox', { name: 'Preview line' });
    await user.clear(preheader);
    await user.type(preheader, 'A reading night');

    expect(latest()).toMatchObject({
      subject: 'October at the book club',
      preheader: 'A reading night',
      period: SEPTEMBER,
    });
    expect(latest().blocks).toEqual([HEADER, TEXT, FOOTER]);
  });

  it('changes the period once asked, refreshing what a source fills for the new dates', async () => {
    const bySeason: DataSource<'event_tiles'> = {
      id: 'events',
      label: 'Club events',
      blockType: 'event_tiles',
      items: ({ period }) => [
        { ref: 'season', title: `Events after ${period?.start ?? 'nothing'}`, date: '2026-10-20' },
      ],
    };
    const { user, onChange, latest } = renderEditor(issue([HEADER, EVENTS, TEXT, FOOTER]), {
      sources: [bySeason],
    });
    await user.click(inspectorTab('Settings'));
    const update = screen.getByRole('button', { name: 'Update period' });
    expect(update).toBeDisabled();
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-08-01' } });
    expect(update).toBeEnabled();

    // Declined: nothing changes.
    await user.click(update);
    let dialog = await screen.findByRole('alertdialog', {
      name: 'Refresh 1 block for the new dates?',
    });
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(onChange).not.toHaveBeenCalled();

    await user.click(update);
    dialog = await screen.findByRole('alertdialog', { name: 'Refresh 1 block for the new dates?' });
    await user.click(within(dialog).getByRole('button', { name: 'Update period' }));

    expect(
      await screen.findByText('Period updated. 1 block refreshed for the new dates.'),
    ).toBeInTheDocument();
    expect(latest().period).toEqual({ ...SEPTEMBER, start: '2026-08-01' });
    expect(latest().blocks[1]).toMatchObject({ items: [{ title: 'Events after 2026-08-01' }] });
    // What no source fills stays exactly as it was.
    expect(latest().blocks[2]).toBe(TEXT);
  });

  it('will not cover dates after today, the rule New issue keeps too', () => {
    renderEditor(issue([HEADER, TEXT, FOOTER]));
    fireEvent.mouseDown(inspectorTab('Settings'));
    fireEvent.change(screen.getByLabelText('Up to'), { target: { value: '2026-10-31' } });

    expect(screen.getByLabelText('Up to')).toHaveAccessibleDescription(/up to today/i);
    expect(screen.getByRole('button', { name: 'Update period' })).toBeDisabled();
  });

  it('takes a host’s own block: added from the palette, edited in its form, drawn from its HTML', async () => {
    const { user, latest } = renderEditor(issue([HEADER, TEXT, FOOTER]), {
      definitions: [...builtInEditorBlocks, SHOUT],
    });
    await user.click(paletteButton('Shout'));
    expect(latest().blocks.map((block) => block.type)).toEqual([
      'header',
      'text',
      'shout',
      'footer',
    ]);
    expect(canvas().getByText('HELLO')).toBeInTheDocument();

    const field = screen.getByRole('textbox', { name: 'Shout text' });
    await user.clear(field);
    await user.type(field, 'Book sale');
    expect(latest().blocks[2]).toMatchObject({ type: 'shout', text: 'Book sale' });
    expect(canvas().getByText('BOOK SALE')).toBeInTheDocument();
    // Drawn from its HTML, cleaned: the handler it carried never ran.
    expect((window as { __shouted?: boolean }).__shouted).toBeUndefined();

    await user.click(screen.getByRole('button', { name: 'Preview' }));
    expect(screen.getByTitle('Email preview').getAttribute('srcdoc')).toContain('BOOK SALE');
  });

  it('opens on the inspector tab a host names, Brand kit only when it can be saved', () => {
    const settings = renderEditor(issue([HEADER, TEXT, FOOTER]), { defaultTab: 'settings' });
    expect(inspectorTab('Settings')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('textbox', { name: 'Subject' })).toHaveValue(
      'September at the book club',
    );
    settings.unmount();

    const unsaved = renderEditor(issue([HEADER, TEXT, FOOTER]), { defaultTab: 'brand' });
    expect(inspectorTab('Block')).toHaveAttribute('aria-selected', 'true');
    unsaved.unmount();

    renderEditor(issue([HEADER, TEXT, FOOTER]), {
      defaultTab: 'brand',
      onBrandChange: vi.fn(),
    });
    expect(inspectorTab('Brand kit')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('heading', { level: 2, name: 'Brand kit' })).toBeInTheDocument();
  });

  it('opens on a block a host names, in view, without taking the page’s focus', async () => {
    const scrolled = vi.spyOn(Element.prototype, 'scrollIntoView');
    const { onChange } = renderEditor(issue([HEADER, TEXT, FOOTER]), {
      defaultSelectedId: TEXT.id,
    });

    expect(blockTab('Text')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('toolbar', { name: 'Text block' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Text' })).toHaveValue('Join us Friday at nine.');
    // A frame later, once the editor has settled on its layout. With the page as the only
    // scroller here, the block is scrolled into view the page's way.
    await waitFor(() => expect(scrolled.mock.contexts).toContain(blockTab('Text')));
    expect(document.body).toHaveFocus();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('fills a fresh header’s issue label for the issue’s own dates, at the top', async () => {
    const { user, latest } = renderEditor(issue([TEXT, FOOTER]));
    await user.click(paletteButton('Header'));

    expect(latest().blocks[0]).toMatchObject({ type: 'header', issueLabel: 'September 2026' });
    expect(canvas().getByText(/September 2026/)).toBeInTheDocument();
    // An issue has one header, so the palette stops offering it.
    expect(palette().queryByRole('button', { name: 'Header' })).not.toBeInTheDocument();
  });
});
