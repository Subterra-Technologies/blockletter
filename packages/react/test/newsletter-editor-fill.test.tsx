import { act, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DIVIDER,
  FOOTER,
  HEADER,
  TEXT,
  blockTab,
  issue,
  renderEditor,
} from './helpers/editor-harness';

/**
 * `fill`: the editor fits its container's height. Wide, its three panes sit side by side and
 * scroll on their own (which only a browser can show); narrow, one pane shows at a time, switched
 * from the top bar: Blocks, Canvas, Edit and Preview. jsdom has no layout, so the editor's width
 * is given by stubbing the measure it reads; unmeasured, it is the wide layout.
 */

/** Every element measures `width` pixels across, as the editor's body does in a browser. */
function measureAt(width: number): void {
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    right: width,
    bottom: 800,
    width,
    height: 800,
    toJSON: () => ({}),
  } as DOMRect);
}

const switcher = () => screen.getByRole('tablist', { name: 'Editor panes' });
const tabNames = () =>
  within(switcher())
    .getAllByRole('tab')
    .map((tab) => tab.textContent);
/** Every element in the editor that scrolls: in a fill layout, its panes. */
const scrollers = (root: Element) => [...root.querySelectorAll('[class~="bl:overflow-y-auto"]')];
const paneTab = (name: string) => within(switcher()).getByRole('tab', { name });
/** The pane a tab controls, shown or not (a hidden pane has no accessible name to find it by). */
function panel(name: string): HTMLElement {
  const id = paneTab(name).getAttribute('aria-controls');
  const element = id ? document.getElementById(id) : null;
  if (!element) throw new Error(`The ${name} tab controls no pane`);
  expect(element).toHaveAttribute('role', 'tabpanel');
  return element;
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-07T15:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('NewsletterEditor fill', () => {
  it('has no pane switcher in the default layout, however narrow', () => {
    measureAt(360);
    renderEditor(issue([HEADER, TEXT, FOOTER]));
    expect(screen.queryByRole('tablist', { name: 'Editor panes' })).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Block palette' })).toBeVisible();
    expect(screen.getByRole('region', { name: 'Inspector' })).toBeVisible();
  });

  it('lays the panes side by side when wide, or when it cannot tell, with no switcher', () => {
    measureAt(1280);
    const wide = renderEditor(issue([HEADER, TEXT, FOOTER]), { fill: true });
    expect(screen.queryByRole('tablist', { name: 'Editor panes' })).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Block palette' })).toBeVisible();
    expect(screen.getByRole('tablist', { name: 'Canvas' })).toBeVisible();
    expect(screen.getByRole('region', { name: 'Inspector' })).toBeVisible();
    // The editor holds its container's height; its panes scroll, not the page.
    expect(wide.container.firstElementChild).toHaveClass('bl:h-full', 'bl:overflow-hidden');
    wide.unmount();
    vi.restoreAllMocks();

    // No width to go by (no layout at all): the wide layout stands.
    renderEditor(issue([HEADER, TEXT, FOOTER]), { fill: true });
    expect(screen.queryByRole('tablist', { name: 'Editor panes' })).not.toBeInTheDocument();
  });

  it('shows one pane at a time when narrow, Canvas first, switched from the top bar', async () => {
    measureAt(360);
    const { user } = renderEditor(issue([HEADER, TEXT, FOOTER]), { fill: true });

    expect(tabNames()).toEqual(['Blocks', 'Canvas', 'Edit', 'Preview']);
    expect(paneTab('Canvas')).toHaveAttribute('aria-selected', 'true');
    expect(panel('Canvas')).toBeVisible();
    expect(panel('Blocks')).not.toBeVisible();
    expect(panel('Edit')).not.toBeVisible();
    expect(screen.getByRole('tabpanel')).toHaveAccessibleName('Canvas');
    // Preview is one of the tabs, so there is no second Canvas / Preview switch.
    expect(screen.queryByRole('group', { name: 'View' })).not.toBeInTheDocument();

    await user.click(paneTab('Blocks'));
    expect(paneTab('Blocks')).toHaveAttribute('aria-selected', 'true');
    expect(panel('Blocks')).toBeVisible();
    expect(panel('Canvas')).not.toBeVisible();
    // The palette and the canvas are never on screen together, so nothing is dragged.
    expect(within(panel('Blocks')).getByRole('button', { name: 'Divider' })).not.toHaveAttribute(
      'draggable',
    );

    // Arrow keys move along the tabs, showing each; Home and End go to the ends.
    await user.keyboard('{ArrowRight}');
    expect(paneTab('Canvas')).toHaveFocus();
    expect(panel('Canvas')).toBeVisible();
    await user.keyboard('{ArrowRight}');
    expect(paneTab('Edit')).toHaveFocus();
    expect(panel('Edit')).toBeVisible();
    await user.keyboard('{End}');
    expect(paneTab('Preview')).toHaveFocus();
    expect(screen.getByRole('tabpanel')).toHaveAccessibleName('Preview');
    await user.keyboard('{ArrowRight}');
    expect(paneTab('Blocks')).toHaveFocus();
    await user.keyboard('{ArrowLeft}');
    expect(paneTab('Preview')).toHaveFocus();
    await user.keyboard('{Home}');
    expect(paneTab('Blocks')).toHaveFocus();
    // Only the shown pane's tab is a Tab stop.
    for (const name of ['Canvas', 'Edit', 'Preview']) {
      expect(paneTab(name)).toHaveAttribute('tabindex', '-1');
    }
  });

  it('goes back to Canvas after a block is added from Blocks, the new block chosen', async () => {
    measureAt(360);
    const { user, types } = renderEditor(issue([HEADER, TEXT, FOOTER]), { fill: true });
    await user.click(paneTab('Blocks'));
    await user.click(within(panel('Blocks')).getByRole('button', { name: 'Divider' }));

    expect(types()).toEqual(['header', 'text', 'divider', 'footer']);
    expect(paneTab('Canvas')).toHaveAttribute('aria-selected', 'true');
    expect(panel('Blocks')).not.toBeVisible();
    expect(blockTab('Divider')).toHaveAttribute('aria-selected', 'true');
    expect(blockTab('Divider')).toHaveFocus();
  });

  it('keeps a picked block on Canvas, and Insert above opens Blocks at the line', async () => {
    measureAt(360);
    const { user, types } = renderEditor(issue([HEADER, TEXT, FOOTER]), { fill: true });
    await user.click(blockTab('Text'));
    expect(paneTab('Canvas')).toHaveAttribute('aria-selected', 'true');
    expect(blockTab('Text')).toHaveFocus();

    await user.click(screen.getByRole('button', { name: 'Insert a block above Text' }));
    expect(panel('Blocks')).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Insert above Text' })).toHaveFocus();
    // Given up, it goes back to the block it was for.
    await user.click(screen.getByRole('button', { name: 'Cancel insert' }));
    expect(panel('Canvas')).toBeVisible();
    expect(blockTab('Text')).toHaveFocus();

    await user.click(screen.getByRole('button', { name: 'Insert a block above Text' }));
    await user.click(within(panel('Blocks')).getByRole('button', { name: 'Divider' }));
    expect(types()).toEqual(['header', 'divider', 'text', 'footer']);
    expect(panel('Canvas')).toBeVisible();
    expect(blockTab('Divider')).toHaveFocus();
  });

  it('opens a block’s form from its Edit button, and comes back with the button or Escape', async () => {
    measureAt(360);
    const { user, latest } = renderEditor(issue([HEADER, TEXT, DIVIDER, FOOTER]), { fill: true });
    await user.click(blockTab('Text'));
    await user.click(screen.getByRole('button', { name: 'Edit Text' }));

    expect(paneTab('Edit')).toHaveAttribute('aria-selected', 'true');
    expect(panel('Edit')).toBeVisible();
    expect(panel('Canvas')).not.toBeVisible();
    expect(screen.getByRole('heading', { level: 2, name: 'Text' })).toHaveFocus();
    const body = screen.getByRole('textbox', { name: 'Text' });
    await user.clear(body);
    await user.type(body, 'Doors open at eight.');
    expect(latest().blocks[1]).toMatchObject({
      body: '<p>Doors open at eight.</p>',
      format: 'html',
    });

    await user.click(screen.getByRole('button', { name: 'Back to canvas' }));
    expect(panel('Canvas')).toBeVisible();
    expect(blockTab('Text')).toHaveFocus();

    await user.click(screen.getByRole('button', { name: 'Edit Text' }));
    expect(panel('Edit')).toBeVisible();
    await user.keyboard('{Escape}');
    expect(panel('Canvas')).toBeVisible();
    expect(blockTab('Text')).toHaveFocus();
  });

  it('comes back from Edit to the Canvas tab when no block was chosen', async () => {
    measureAt(360);
    const { user } = renderEditor(issue([HEADER, TEXT, FOOTER]), { fill: true });
    await user.click(paneTab('Edit'));
    expect(within(panel('Edit')).getByText(/Choose a block on the canvas/)).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Back to canvas' }));
    expect(panel('Canvas')).toBeVisible();
    expect(paneTab('Canvas')).toHaveFocus();
  });

  it('has no Edit button on the canvas toolbar unless one pane shows at a time', async () => {
    measureAt(1280);
    const { user } = renderEditor(issue([HEADER, TEXT, FOOTER]), { fill: true });
    await user.click(blockTab('Text'));
    expect(screen.queryByRole('button', { name: 'Edit Text' })).not.toBeInTheDocument();
  });

  it('previews from a tab of its own, in the canvas’s place, at the phone width', async () => {
    measureAt(360);
    const { user } = renderEditor(issue([HEADER, TEXT, FOOTER]), { fill: true });
    await user.click(paneTab('Preview'));

    expect(paneTab('Preview')).toHaveAttribute('aria-selected', 'true');
    expect(paneTab('Canvas')).toHaveAttribute('aria-selected', 'false');
    // One panel for the two: labelled by whichever of them is selected.
    const shown = screen.getByRole('tabpanel');
    expect(shown).toHaveAccessibleName('Preview');
    expect(shown).toBe(panel('Canvas'));
    expect(within(shown).getByTitle('Email preview')).toBeInTheDocument();
    expect(within(shown).getByRole('button', { name: /^Phone/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await user.click(paneTab('Canvas'));
    expect(screen.getByRole('tabpanel')).toHaveAccessibleName('Canvas');
    expect(screen.queryByTitle('Email preview')).not.toBeInTheDocument();
    expect(screen.getByRole('tablist', { name: 'Canvas' })).toBeVisible();
  });

  it('starts a preview chosen from another pane at the phone width too', async () => {
    measureAt(360);
    const { user } = renderEditor(issue([HEADER, TEXT, FOOTER]), { fill: true });
    await user.click(paneTab('Blocks'));
    // The canvas pane is hidden now, so it has no width of its own to go by: a browser gives a
    // hidden element none.
    const canvasPane = panel('Canvas');
    const measured = Element.prototype.getBoundingClientRect as unknown as {
      getMockImplementation: () => ((this: Element) => DOMRect) | undefined;
    };
    const around = measured.getMockImplementation();
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: Element,
    ) {
      const box = around?.call(this) ?? ({} as DOMRect);
      return this === canvasPane ? ({ ...box, width: 0, right: 0 } as DOMRect) : box;
    });
    await user.click(paneTab('Preview'));
    expect(screen.getByRole('button', { name: /^Phone/ })).toHaveAttribute('aria-pressed', 'true');
  });

  it('comes back from Edit to the canvas, not the preview, with the block focused', async () => {
    measureAt(360);
    const { user } = renderEditor(issue([HEADER, TEXT, FOOTER]), { fill: true });
    await user.click(blockTab('Text'));
    await user.click(paneTab('Preview'));
    await user.click(paneTab('Edit'));
    await user.click(screen.getByRole('button', { name: 'Back to canvas' }));

    expect(paneTab('Canvas')).toHaveAttribute('aria-selected', 'true');
    expect(blockTab('Text')).toHaveFocus();
  });

  it('positions every pane that scrolls, so the hidden text in it scrolls and clips with it', async () => {
    // Visually hidden text is absolutely placed: a pane that is not positioned lets it escape
    // the pane's clipping and stretch the host page.
    const panesOf = (root: Element) => {
      const panes = scrollers(root);
      for (const pane of panes) expect(pane).toHaveClass('bl:relative');
      return panes.length;
    };

    measureAt(1280);
    const wide = renderEditor(issue([HEADER, TEXT, FOOTER]), { fill: true });
    const wideRoot = wide.container.firstElementChild!;
    expect(wideRoot).toHaveClass('bl:relative');
    expect(panesOf(wideRoot)).toBe(3);
    await wide.user.click(screen.getByRole('button', { name: 'Preview' }));
    expect(panesOf(wideRoot)).toBe(3);
    wide.unmount();
    vi.restoreAllMocks();

    measureAt(360);
    const narrow = renderEditor(issue([HEADER, TEXT, FOOTER]), { fill: true });
    const narrowRoot = narrow.container.firstElementChild!;
    expect(narrowRoot).toHaveClass('bl:relative');
    expect(panesOf(narrowRoot)).toBe(3);
    await narrow.user.click(paneTab('Preview'));
    expect(panesOf(narrowRoot)).toBe(3);
  });

  it('keeps the editor’s More menu beside the pane switch', async () => {
    measureAt(360);
    const onSaveAsTemplate = vi.fn().mockResolvedValue(undefined);
    const { user } = renderEditor(issue([HEADER, TEXT, FOOTER]), { fill: true, onSaveAsTemplate });
    const more = screen.getByRole('button', { name: 'More' });
    expect(switcher().nextElementSibling).toBe(more);
    await user.click(more);
    await user.click(await screen.findByRole('menuitem', { name: 'Save as template…' }));
    expect(await screen.findByRole('dialog', { name: 'Save as template' })).toBeInTheDocument();
  });

  it('puts Undo and Redo first in the More menu when narrow, with or without templates', async () => {
    measureAt(360);
    const { user, types } = renderEditor(issue([HEADER, TEXT, FOOTER]), { fill: true });
    // A 336px top bar has no room for two more buttons beside the pane tabs.
    expect(screen.queryByRole('button', { name: 'Undo' })).not.toBeInTheDocument();
    const more = screen.getByRole('button', { name: 'More' });
    expect(switcher().nextElementSibling).toBe(more);

    await user.click(more);
    expect(await screen.findByRole('menuitem', { name: 'Undo' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(screen.getByRole('menuitem', { name: 'Redo' })).toHaveAttribute('aria-disabled', 'true');
    await user.keyboard('{Escape}');

    await user.click(paneTab('Blocks'));
    await user.click(within(panel('Blocks')).getByRole('button', { name: 'Divider' }));
    expect(types()).toEqual(['header', 'text', 'divider', 'footer']);

    await user.click(more);
    const undo = await screen.findByRole('menuitem', { name: 'Undo' });
    expect(undo).toHaveAttribute('aria-keyshortcuts', 'Control+Z');
    await user.click(undo);
    expect(types()).toEqual(['header', 'text', 'footer']);
    // The menu closes and hands the focus back to More.
    await waitFor(() => expect(more).toHaveFocus());

    await user.click(more);
    await user.click(await screen.findByRole('menuitem', { name: 'Redo' }));
    expect(types()).toEqual(['header', 'text', 'divider', 'footer']);
  });

  it('lists Undo and Redo above Save as template in the narrow More menu', async () => {
    measureAt(360);
    const { user } = renderEditor(issue([HEADER, TEXT, FOOTER]), {
      fill: true,
      onSaveAsTemplate: vi.fn(),
    });
    await user.click(screen.getByRole('button', { name: 'More' }));
    const items = within(await screen.findByRole('menu')).getAllByRole('menuitem');
    expect(items.map((item) => item.textContent)).toEqual([
      'UndoCtrl+Z',
      'RedoCtrl+Shift+Z',
      'Save as template…',
    ]);
    expect(items.map((item) => item.getAttribute('aria-keyshortcuts'))).toEqual([
      'Control+Z',
      'Control+Shift+Z Control+Y',
      null,
    ]);
  });

  it('keeps Undo and Redo in the top bar when wide', async () => {
    measureAt(1280);
    const { user, types } = renderEditor(issue([HEADER, TEXT, FOOTER]), { fill: true });
    await user.click(screen.getByRole('button', { name: 'Divider' }));
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(types()).toEqual(['header', 'text', 'footer']);
    expect(screen.queryByRole('button', { name: 'More' })).not.toBeInTheDocument();
  });

  it('offers no Blocks pane while read-only', () => {
    measureAt(360);
    renderEditor(issue([HEADER, TEXT, FOOTER]), { fill: true, readOnly: true });
    expect(tabNames()).toEqual(['Canvas', 'Edit', 'Preview']);
  });

  it('opens on Edit when the host asks for an issue-wide tab', () => {
    measureAt(360);
    renderEditor(issue([HEADER, TEXT, FOOTER]), { fill: true, defaultTab: 'settings' });
    expect(paneTab('Edit')).toHaveAttribute('aria-selected', 'true');
    expect(within(panel('Edit')).getByRole('heading', { name: 'Settings' })).toBeVisible();
  });

  it('follows a resize between the layouts, keeping a preview a preview', async () => {
    // Every observer the editor makes hears of the new size, the way a browser would tell them.
    const observers: ResizeObserverCallback[] = [];
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: ResizeObserverCallback) {
          observers.push(callback);
        }
        observe = vi.fn();
        unobserve = vi.fn();
        disconnect = vi.fn();
      },
    );
    const { user } = renderEditor(issue([HEADER, TEXT, FOOTER]), { fill: true });
    expect(screen.queryByRole('tablist', { name: 'Editor panes' })).not.toBeInTheDocument();

    const resizeTo = (width: number) =>
      act(() => {
        const entry = { contentRect: { width, height: 800 } } as ResizeObserverEntry;
        for (const callback of observers) callback([entry], {} as ResizeObserver);
      });
    resizeTo(600);
    expect(switcher()).toBeInTheDocument();
    resizeTo(1200);
    expect(screen.queryByRole('tablist', { name: 'Editor panes' })).not.toBeInTheDocument();

    // Whoever was previewing goes on previewing, whichever layout the width calls for.
    await user.click(screen.getByRole('button', { name: 'Preview' }));
    resizeTo(600);
    expect(paneTab('Preview')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTitle('Email preview')).toBeVisible();
    resizeTo(1200);
    expect(screen.getByRole('button', { name: 'Preview' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTitle('Email preview')).toBeVisible();
  });
});
