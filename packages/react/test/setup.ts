import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

/**
 * Testing Library unmounts after each test by itself only when the runner exposes a global
 * `afterEach`; this project imports its test functions from `vitest` instead of enabling globals,
 * so the unmount is registered here. Without it every render stays in the document and the next
 * test finds two of everything.
 */
afterEach(() => {
  cleanup();
});

/**
 * jsdom implements neither the Pointer Capture API, scrollIntoView, ResizeObserver nor
 * matchMedia. Radix calls pointer capture and scrollIntoView while opening a listbox (a Select
 * trigger throws `target.hasPointerCapture is not a function` on the first click without
 * these), its popper watches its anchor with ResizeObserver, and the editor's preview measures
 * its frame with one too. matchMedia is here for any component that asks about the viewport.
 *
 * They are stubs on purpose. Nothing under test asserts on pointer capture, scroll position,
 * element size or media queries; what the tests need is for the component to get through its
 * own event handling. This is test-environment plumbing and changes nothing that ships.
 */
const noop = (): void => undefined;

if (typeof Element !== 'undefined') {
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.setPointerCapture ??= noop;
  Element.prototype.releasePointerCapture ??= noop;
  Element.prototype.scrollIntoView ??= noop;
}

if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe = noop;
    unobserve = noop;
    disconnect = noop;
  } as unknown as typeof ResizeObserver;
}

if (typeof window !== 'undefined' && !window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: noop,
      removeEventListener: noop,
      addListener: noop,
      removeListener: noop,
      dispatchEvent: () => false,
    }),
  });
}
