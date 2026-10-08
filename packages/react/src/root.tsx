import { useState, type ComponentProps } from 'react';
import { MessagesProvider } from './i18n/context';
import { canonicalLocale } from './i18n/format';
import type { EditorMessageOverrides } from './i18n/messages';
import { cn } from './lib/cn';
import { ConfirmProvider } from './ui/confirm';
import { PortalContainerProvider } from './ui/portal-container';
import { ToastProvider, ToastRegion } from './ui/toast';
import { TooltipProvider } from './ui/tooltip';

export type BlockletterTheme = 'light' | 'dark';

export interface BlockletterRootProps extends ComponentProps<'div'> {
  /**
   * The editor's palette. Left unset it is light, unless an ancestor carries the `.dark` class
   * most Tailwind and shadcn hosts use for their own dark mode, which it then follows. Set
   * either value to fix the palette whatever the host page does.
   */
  theme?: BlockletterTheme;
  /**
   * The editor's words in another language, or some of them in other words: any part of
   * `EditorMessages`, laid over the English (`enMessages`) or over an enclosing root's. Keep the
   * object stable (a constant, or memoised): every part reads it.
   */
  messages?: EditorMessageOverrides;
  /**
   * The language the editor speaks, as a BCP 47 tag (`es`, `pt-BR`): set as the root's `lang`, so
   * assistive technology reads its words in it, and used with `Intl` for the numbers and dates
   * the editor writes. Without one the editor writes them as it always has, in English style.
   */
  locale?: string;
}

/**
 * The element Blockletter's UI renders inside. `styles.css` keys everything off `.bl-root`: the
 * `--bl-*` design tokens, the reset the utilities rely on, and the dark palette.
 *
 * Overlays (dialogs, menus, selects, tooltips, the confirmation dialog) portal into a container
 * at the end of the root rather than into `document.body`, so they keep the root's theme and
 * reset, and stay inside whatever landmark the host placed the editor in. The root also provides
 * the styled dialog the editor uses to confirm destructive actions, and a tooltip provider, so a
 * tooltip works without one of its own (a part that wants a different delay brings its own).
 *
 * It is where the editor's words come from, too: every part inside reads `messages` and `locale`
 * from the nearest root, so a host composing the parts itself translates them all in one place.
 */
export function BlockletterRoot({
  theme,
  messages,
  locale,
  className,
  children,
  ...props
}: BlockletterRootProps) {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);

  return (
    <div
      lang={canonicalLocale(locale)}
      {...props}
      className={cn('bl-root', className)}
      data-theme={theme}
    >
      <MessagesProvider messages={messages} locale={locale}>
        <PortalContainerProvider container={container}>
          <TooltipProvider>
            <ToastProvider>
              <ConfirmProvider>{children}</ConfirmProvider>
              <ToastRegion />
            </ToastProvider>
          </TooltipProvider>
        </PortalContainerProvider>
      </MessagesProvider>
      {/* Overlays are fixed, so where this sits in the tree does not move them on screen. */}
      <div ref={setContainer} data-bl-portal="" />
    </div>
  );
}
