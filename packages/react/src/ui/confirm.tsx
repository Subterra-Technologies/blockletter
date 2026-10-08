import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { useEditorMessages } from '../i18n/context';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './alert-dialog';

/**
 * A styled replacement for `window.confirm()`, for actions that cannot be undone.
 *
 * ```tsx
 * const confirm = useConfirm();
 * if (!(await confirm({
 *   title: 'Delete the "Monthly digest" template?',
 *   description: 'Issues already made from it keep their content. This cannot be undone.',
 *   confirmLabel: 'Delete template',
 *   destructive: true,
 * }))) return;
 * ```
 *
 * The title asks the question with its consequence in it; the description says what
 * happens and what cannot be taken back; the confirm button repeats the verb. `destructive`
 * paints that button red for deletions and removals.
 */
export interface ConfirmOptions {
  title: string;
  description?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
}

export type Confirm = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<Confirm | null>(null);

/** Mounted by `BlockletterRoot`, so its dialog portals into the root like every other overlay. */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const { common } = useEditorMessages();
  const [request, setRequest] = useState<ConfirmOptions | null>(null);
  const resolverRef = useRef<((answer: boolean) => void) | null>(null);
  // A confirmation opened from code has no trigger for Radix to hand focus back to, so it
  // would fall to the page body. Remember what had focus and return there instead.
  const returnFocusRef = useRef<HTMLElement | null>(null);

  const confirm = useCallback<Confirm>((options) => {
    resolverRef.current?.(false);
    const active = document.activeElement;
    returnFocusRef.current = active instanceof HTMLElement ? active : null;
    setRequest(options);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  // A "no" is answered only once the dialog has gone and handed focus back, so whatever the
  // caller does next (focus the field that needs another look) is not undone by that hand-back.
  const pendingNoRef = useRef<(() => void) | null>(null);

  const settle = (answer: boolean) => {
    const resolve = resolverRef.current;
    resolverRef.current = null;
    setRequest(null);
    if (!resolve) return;
    if (answer) {
      resolve(true);
      return;
    }
    pendingNoRef.current = () => resolve(false);
    // Should the close never report back (the provider unmounting), answer anyway.
    setTimeout(() => {
      pendingNoRef.current?.();
      pendingNoRef.current = null;
    }, 1000);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AlertDialog open={request !== null} onOpenChange={(open) => (open ? null : settle(false))}>
        <AlertDialogContent
          onCloseAutoFocus={(event) => {
            const target = returnFocusRef.current;
            returnFocusRef.current = null;
            if (target?.isConnected) {
              event.preventDefault();
              target.focus();
            }
            pendingNoRef.current?.();
            pendingNoRef.current = null;
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>{request?.title}</AlertDialogTitle>
            {request?.description ? (
              <AlertDialogDescription>{request.description}</AlertDialogDescription>
            ) : null}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => settle(false)}>
              {request?.cancelLabel ?? common.cancel}
            </AlertDialogCancel>
            {/* The variant prop, not a className: the action renders through Slot, which
                would let the default fill win over a destructive class. */}
            <AlertDialogAction
              variant={request?.destructive ? 'destructive' : 'default'}
              onClick={() => settle(true)}
            >
              {request?.confirmLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmContext.Provider>
  );
}

/**
 * Ask before an irreversible action. Outside a `ConfirmProvider` (a unit test rendering one
 * component alone, with no `BlockletterRoot` around it) it falls back to `window.confirm`, so
 * behaviour is the same either way.
 */
export function useConfirm(): Confirm {
  const confirm = useContext(ConfirmContext);
  return (
    confirm ??
    (async (options: ConfirmOptions) =>
      typeof window !== 'undefined' && typeof window.confirm === 'function'
        ? window.confirm(options.title)
        : false)
  );
}
