/** The nearest ancestor that scrolls vertically, or `null` when only the page does. */
export function scrollParent(element: Element): HTMLElement | null {
  const view = element.ownerDocument.defaultView;
  for (let node = element.parentElement; node; node = node.parentElement) {
    if (node === element.ownerDocument.body || node === element.ownerDocument.documentElement) {
      return null;
    }
    const overflowY = view?.getComputedStyle(node).overflowY;
    if (overflowY === 'auto' || overflowY === 'scroll') return node;
  }
  return null;
}

/**
 * Brings `element` into view the way `scrollIntoView({ block: 'nearest' })` does, but scrolls only
 * the nearest scrolling ancestor (an editor pane), never the page around it. The element's own
 * `scroll-margin` is kept clear, and an element taller than the pane shows its top. Where only
 * the page scrolls, it is `scrollIntoView`.
 */
export function revealInScroller(element: HTMLElement): void {
  const scroller = scrollParent(element);
  if (!scroller) {
    element.scrollIntoView({ block: 'nearest' });
    return;
  }
  const style = element.ownerDocument.defaultView?.getComputedStyle(element);
  const marginTop = parseFloat(style?.scrollMarginTop ?? '') || 0;
  const marginBottom = parseFloat(style?.scrollMarginBottom ?? '') || 0;
  const box = element.getBoundingClientRect();
  const view = scroller.getBoundingClientRect();
  const above = box.top - marginTop - view.top;
  const below = box.bottom + marginBottom - view.bottom;
  if (above < 0) scroller.scrollTop += above;
  else if (below > 0) scroller.scrollTop += Math.min(below, above);
}
