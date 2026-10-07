import { useRef } from 'react';

/**
 * Focus's way back to whatever opened a dialog that has no trigger of its own.
 *
 * Radix returns focus to a `DialogTrigger` when a dialog closes. The editor's dialogs are opened
 * from menus, toolbars and host buttons instead, so there is no trigger and focus would fall to
 * the page. These put it back on whatever had it when the dialog opened.
 */
export function useReturnFocus() {
  const opener = useRef<HTMLElement | null>(null);
  return {
    /** For `onOpenAutoFocus`: at that moment focus is still on the opener. */
    capture: () => {
      const active = document.activeElement;
      opener.current = active instanceof HTMLElement && active !== document.body ? active : null;
    },
    /** For `onCloseAutoFocus`. An opener that has gone meanwhile is skipped. */
    restore: (event: Event) => {
      const target = opener.current;
      opener.current = null;
      if (target?.isConnected) {
        event.preventDefault();
        target.focus();
      }
    },
  };
}
