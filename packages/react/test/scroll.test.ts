import { afterEach, describe, expect, it, vi } from 'vitest';
import { revealInScroller, scrollParent } from '../src/lib/scroll';

/** A pane 400px tall from the top of the window, holding `target` at `top`…`top + height`. */
function pane(top: number, height = 100, margin = 0) {
  const scroller = document.createElement('div');
  scroller.style.overflowY = 'auto';
  const inner = document.createElement('div');
  const target = document.createElement('div');
  target.style.scrollMarginTop = `${margin}px`;
  target.style.scrollMarginBottom = `${margin}px`;
  inner.append(target);
  scroller.append(inner);
  document.body.append(scroller);
  vi.spyOn(scroller, 'getBoundingClientRect').mockReturnValue({
    top: 0,
    bottom: 400,
    height: 400,
  } as DOMRect);
  vi.spyOn(target, 'getBoundingClientRect').mockReturnValue({
    top,
    bottom: top + height,
    height,
  } as DOMRect);
  return { scroller, target };
}

afterEach(() => {
  vi.restoreAllMocks();
  document.body.replaceChildren();
});

describe('revealInScroller', () => {
  it('finds the pane that scrolls, not the page', () => {
    const { scroller, target } = pane(0);
    expect(scrollParent(target)).toBe(scroller);
    const loose = document.createElement('div');
    document.body.append(loose);
    expect(scrollParent(loose)).toBeNull();
  });

  it('scrolls the pane down to a block below it, and leaves the page alone', () => {
    const { scroller, target } = pane(900);
    const page = vi.spyOn(Element.prototype, 'scrollIntoView');
    revealInScroller(target);
    expect(scroller.scrollTop).toBe(600);
    expect(page).not.toHaveBeenCalled();
  });

  it('scrolls up to a block above, keeping its scroll margin clear', () => {
    const { scroller, target } = pane(-200, 100, 48);
    scroller.scrollTop = 500;
    revealInScroller(target);
    expect(scroller.scrollTop).toBe(252);
  });

  it('shows the top of a block taller than the pane', () => {
    const { scroller, target } = pane(300, 900);
    revealInScroller(target);
    expect(scroller.scrollTop).toBe(300);
  });

  it('leaves a block already in view where it is', () => {
    const { scroller, target } = pane(100);
    revealInScroller(target);
    expect(scroller.scrollTop).toBe(0);
  });

  it('falls back to scrolling the page when nothing else scrolls', () => {
    const target = document.createElement('div');
    document.body.append(target);
    const page = vi.spyOn(Element.prototype, 'scrollIntoView');
    revealInScroller(target);
    expect(page).toHaveBeenCalledWith({ block: 'nearest' });
  });
});
