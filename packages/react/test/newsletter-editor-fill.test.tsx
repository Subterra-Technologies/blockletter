import { act, screen, within } from '@testing-library/react';
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
 * from the top bar. jsdom has no layout, so the editor's width is given by stubbing the measure it
 * reads; unmeasured, it is the wide layout.
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

    expect(
      within(switcher())
        .getAllByRole('tab')
        .map((tab) => tab.textContent),
    ).toEqual(['Blocks', 'Canvas', 'Edit']);
    expect(paneTab('Canvas')).toHaveAttribute('aria-selected', 'true');
    expect(panel('Canvas')).toBeVisible();
    expect(panel('Blocks')).not.toBeVisible();
    expect(panel('Edit')).not.toBeVisible();
    expect(screen.getByRole('tabpanel')).toHaveAccessibleName('Canvas');
    // Canvas or Preview is a question about the Canvas pane, so it is asked there.
    expect(within(panel('Canvas')).getByRole('button', { name: 'Preview' })).toBeVisible();

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
    await user.keyboard('{End}');
    expect(paneTab('Edit')).toHaveFocus();
    expect(panel('Edit')).toBeVisible();
    await user.keyboard('{ArrowRight}');
    expect(paneTab('Blocks')).toHaveFocus();
    await user.keyboard('{ArrowLeft}');
    expect(paneTab('Edit')).toHaveFocus();
    await user.keyboard('{Home}');
    expect(paneTab('Blocks')).toHaveFocus();
    // Only the shown pane's tab is a Tab stop.
    expect(paneTab('Canvas')).toHaveAttribute('tabindex', '-1');
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
    expect(latest().blocks[1]).toMatchObject({ body: 'Doors open at eight.' });

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

  it('switches Canvas and Preview inside the Canvas pane', async () => {
    measureAt(360);
    const { user } = renderEditor(issue([HEADER, TEXT, FOOTER]), { fill: true });
    await user.click(within(panel('Canvas')).getByRole('button', { name: 'Preview' }));
    expect(within(panel('Canvas')).getByTitle('Email preview')).toBeInTheDocument();
    await user.click(within(panel('Canvas')).getByRole('button', { name: 'Canvas' }));
    expect(screen.getByRole('tablist', { name: 'Canvas' })).toBeVisible();
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

  it('offers no Blocks pane while read-only', () => {
    measureAt(360);
    renderEditor(issue([HEADER, TEXT, FOOTER]), { fill: true, readOnly: true });
    expect(
      within(switcher())
        .getAllByRole('tab')
        .map((tab) => tab.textContent),
    ).toEqual(['Canvas', 'Edit']);
  });

  it('opens on Edit when the host asks for an issue-wide tab', () => {
    measureAt(360);
    renderEditor(issue([HEADER, TEXT, FOOTER]), { fill: true, defaultTab: 'settings' });
    expect(paneTab('Edit')).toHaveAttribute('aria-selected', 'true');
    expect(within(panel('Edit')).getByRole('heading', { name: 'Settings' })).toBeVisible();
  });

  it('follows a resize between the layouts', () => {
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
    renderEditor(issue([HEADER, TEXT, FOOTER]), { fill: true });
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
  });
});
