import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { CircleAlertIcon, CircleCheckIcon, InfoIcon, XIcon } from 'lucide-react';
import { cn } from '../lib/cn';

export type ToastTone = 'success' | 'error' | 'info';

/** An optional button inside a toast, such as Undo. Pressing it also dismisses the toast. */
export interface ToastAction {
  label: string;
  onSelect: () => void;
}

export interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
  action?: ToastAction;
}

export interface ToastOptions {
  tone?: ToastTone;
  /** Milliseconds before it goes; `0` keeps it until dismissed. */
  duration?: number;
  action?: ToastAction;
}

export const TOAST_DURATION_MS = 5_000;

interface ToastsValue {
  toast: (message: string, options?: ToastOptions) => number;
  toasts: Toast[];
  dismiss: (id: number) => void;
}

const ToastsContext = createContext<ToastsValue | null>(null);

/** What a part gets when it is rendered outside a `BlockletterRoot`: messages are dropped. */
const SILENT: ToastsValue = { toast: () => 0, toasts: [], dismiss: () => undefined };

/**
 * Short confirmations ("Template saved.") for the editor's own actions. `BlockletterRoot`
 * provides them; a part rendered on its own still works, it just says nothing.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  // Not render state: the timers must survive re-renders untouched.
  const timersRef = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const idRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    const timer = timersRef.current.get(id);
    if (timer !== undefined) clearTimeout(timer);
    timersRef.current.delete(id);
    setToasts((items) => items.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, options: ToastOptions = {}) => {
      const { tone = 'success', duration = TOAST_DURATION_MS, action } = options;
      idRef.current += 1;
      const id = idRef.current;
      setToasts((items) => [...items, { id, message, tone, ...(action ? { action } : {}) }]);
      if (duration > 0)
        timersRef.current.set(
          id,
          setTimeout(() => dismiss(id), duration),
        );
      return id;
    },
    [dismiss],
  );

  // A dismiss must never fire against an unmounted tree.
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, []);

  const value = useMemo<ToastsValue>(() => ({ toast, toasts, dismiss }), [toast, toasts, dismiss]);
  return <ToastsContext.Provider value={value}>{children}</ToastsContext.Provider>;
}

export function useToasts(): ToastsValue {
  return useContext(ToastsContext) ?? SILENT;
}

const toneIcon: Record<ToastTone, typeof InfoIcon> = {
  success: CircleCheckIcon,
  error: CircleAlertIcon,
  info: InfoIcon,
};

const toneColor: Record<ToastTone, string> = {
  success: 'bl:text-success',
  error: 'bl:text-danger',
  info: 'bl:text-muted-foreground',
};

/**
 * The toasts, bottom right (bottom centre on a phone). An error is `role="alert"`; success and
 * info are `role="status"`, all inside one polite live region that is always mounted, so screen
 * readers hear the first message too.
 */
export function ToastRegion() {
  const { toasts, dismiss } = useToasts();

  return (
    <div
      aria-live="polite"
      className="bl:pointer-events-none bl:fixed bl:inset-x-3 bl:bottom-3 bl:z-[60] bl:flex bl:flex-col bl:items-center bl:gap-2 bl:sm:inset-x-auto bl:sm:right-4 bl:sm:bottom-4 bl:sm:items-end"
    >
      {toasts.map((toast) => {
        const Icon = toneIcon[toast.tone];
        return (
          <div
            key={toast.id}
            role={toast.tone === 'error' ? 'alert' : 'status'}
            data-tone={toast.tone}
            className="bl:pointer-events-auto bl:flex bl:w-full bl:max-w-sm bl:items-start bl:gap-2.5 bl:rounded-lg bl:border bl:bg-popover bl:py-3 bl:pr-2 bl:pl-3 bl:text-sm bl:text-popover-foreground bl:shadow-lg bl:shadow-black/5"
          >
            <Icon
              aria-hidden="true"
              className={cn('bl:mt-0.5 bl:size-4 bl:shrink-0', toneColor[toast.tone])}
            />
            <p className="bl:min-w-0 bl:flex-1">{toast.message}</p>
            {toast.action ? (
              <button
                type="button"
                onClick={() => {
                  toast.action?.onSelect();
                  dismiss(toast.id);
                }}
                className="bl:-my-1 bl:h-7 bl:shrink-0 bl:rounded-md bl:px-2 bl:text-sm bl:font-medium bl:text-foreground bl:outline-none bl:hover:bg-accent bl:focus-visible:ring-2 bl:focus-visible:ring-ring/50"
              >
                {toast.action.label}
              </button>
            ) : null}
            <button
              type="button"
              aria-label="Dismiss message"
              onClick={() => dismiss(toast.id)}
              className="bl:-my-1 bl:flex bl:size-7 bl:shrink-0 bl:items-center bl:justify-center bl:rounded-md bl:text-muted-foreground bl:outline-none bl:hover:bg-accent bl:hover:text-foreground bl:focus-visible:ring-2 bl:focus-visible:ring-ring/50"
            >
              <XIcon aria-hidden="true" className="bl:size-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
