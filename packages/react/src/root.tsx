import { useState, type ComponentProps } from 'react';
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
 */
export function BlockletterRoot({ theme, className, children, ...props }: BlockletterRootProps) {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);

  return (
    <div {...props} className={cn('bl-root', className)} data-theme={theme}>
      <PortalContainerProvider container={container}>
        <TooltipProvider>
          <ToastProvider>
            <ConfirmProvider>{children}</ConfirmProvider>
            <ToastRegion />
          </ToastProvider>
        </TooltipProvider>
      </PortalContainerProvider>
      {/* Overlays are fixed, so where this sits in the tree does not move them on screen. */}
      <div ref={setContainer} data-bl-portal="" />
    </div>
  );
}
