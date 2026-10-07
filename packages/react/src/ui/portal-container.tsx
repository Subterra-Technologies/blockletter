import { createContext, useContext, type ReactNode } from 'react';

/**
 * Where the editor's overlays (dialogs, menus, selects, tooltips, the confirmation) portal to.
 *
 * Radix portals into `document.body` by default, which is outside `.bl-root`: an overlay there
 * would lose the editor's theme tokens, its scoped reset, and the shield that reset gives it
 * against the host page's own element rules. `BlockletterRoot` renders one container inside
 * itself and provides it here, so the nearest root always wins. Outside any root (a unit test
 * rendering one component alone) this is `undefined` and Radix falls back to `document.body`.
 */
const PortalContainerContext = createContext<HTMLElement | null>(null);

export function PortalContainerProvider({
  container,
  children,
}: {
  container: HTMLElement | null;
  children: ReactNode;
}) {
  return (
    <PortalContainerContext.Provider value={container}>{children}</PortalContainerContext.Provider>
  );
}

export function usePortalContainer(): HTMLElement | undefined {
  return useContext(PortalContainerContext) ?? undefined;
}
