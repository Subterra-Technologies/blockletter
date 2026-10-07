import { useEffect, useState } from 'react';

/**
 * The demo's two views of one issue: the editor, filling the screen, and the docs around it. The
 * address's fragment says which, so the back button, a new tab and a README link all work:
 *
 * - no fragment, `#editor` or anything unknown — the editor
 * - `#docs` — the docs, where the reader left them
 * - `#blocks`, `#rendering`, … — the docs, at that section
 */

export type View = 'editor' | 'docs';

export interface DocSection {
  id: string;
  label: string;
}

/** The docs' sections in page order, each an address a link can open the docs on. */
export const DOC_SECTIONS: readonly DocSection[] = [
  { id: 'embed', label: 'Embed it' },
  { id: 'blocks', label: 'Blocks' },
  { id: 'data-sources', label: 'Data sources' },
  { id: 'rendering', label: 'Rendering' },
  { id: 'brand-kit', label: 'Brand kit' },
  { id: 'accessibility', label: 'Accessibility' },
];

export interface Route {
  view: View;
  /** A docs section to open on, when the address names one. */
  section?: string;
}

export function routeFor(hash: string): Route {
  let id = hash.replace(/^#/, '');
  try {
    id = decodeURIComponent(id);
  } catch {
    // A malformed escape names no view: the editor.
  }
  if (id === 'docs') return { view: 'docs' };
  if (DOC_SECTIONS.some((section) => section.id === id)) return { view: 'docs', section: id };
  return { view: 'editor' };
}

const sameRoute = (left: Route, right: Route): boolean =>
  left.view === right.view && left.section === right.section;

/** The route the address holds, following it as links and the back button change it. */
export function useRoute(): Route {
  const [route, setRoute] = useState(() => routeFor(window.location.hash));

  useEffect(() => {
    const follow = () => {
      const next = routeFor(window.location.hash);
      setRoute((current) => (sameRoute(current, next) ? current : next));
    };
    window.addEventListener('hashchange', follow);
    return () => window.removeEventListener('hashchange', follow);
  }, []);

  return route;
}
