import type { Ref } from 'react';
import { Redo2Icon, Undo2Icon } from 'lucide-react';
import { Button } from '../ui/button';
import { DropdownMenuItem, DropdownMenuShortcut } from '../ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { historyShortcuts, useApplePlatform, type HistoryAction } from './history-shortcuts';

interface HistoryControlsProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

const NAMES: Readonly<Record<HistoryAction, string>> = { undo: 'Undo', redo: 'Redo' };
const ICONS = { undo: Undo2Icon, redo: Redo2Icon } as const;

/**
 * Undo and Redo as icon buttons in the editor's top bar, each with a tooltip that names it and its
 * shortcut, on hover and on keyboard focus alike.
 *
 * A button with nothing to do says so with `aria-disabled` rather than `disabled`: it stays in the
 * tab order and keeps the focus. Pressing Undo until there is nothing left would otherwise drop
 * the focus on the page the moment the button disabled itself.
 */
export function HistoryButtons({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  undoRef,
}: HistoryControlsProps & { undoRef?: Ref<HTMLButtonElement> }) {
  const shortcuts = historyShortcuts(useApplePlatform());

  const button = (action: HistoryAction, enabled: boolean, run: () => void) => {
    const Icon = ICONS[action];
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            ref={action === 'undo' ? undoRef : undefined}
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={NAMES[action]}
            aria-keyshortcuts={shortcuts[action].aria}
            aria-disabled={enabled ? undefined : true}
            onClick={() => {
              if (enabled) run();
            }}
            className="bl:aria-disabled:cursor-not-allowed bl:aria-disabled:opacity-50 bl:aria-disabled:hover:bg-transparent"
          >
            <Icon aria-hidden="true" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" sideOffset={6}>
          {/* A real space, so the description reads "Undo Ctrl+Z", not one word. A span, not a
              `kbd`: host pages often style every `kbd`, and would box it in their own colours. */}
          {NAMES[action]} <span className="bl:ml-1 bl:opacity-75">{shortcuts[action].label}</span>
        </TooltipContent>
      </Tooltip>
    );
  };

  return (
    // Its own provider, with a short delay, so tooltips do not flash while the pointer crosses.
    <TooltipProvider delayDuration={300}>
      <div className="bl:flex bl:items-center bl:gap-1">
        {button('undo', canUndo, onUndo)}
        {button('redo', canRedo, onRedo)}
      </div>
    </TooltipProvider>
  );
}

/**
 * Undo and Redo as items of the editor's More menu, where the top bar has no room for them (one
 * pane at a time, on a phone). An item with nothing to do is disabled; its shortcut is shown, and
 * given to assistive technology as `aria-keyshortcuts` rather than read out as part of its name.
 */
export function HistoryMenuItems({ canUndo, canRedo, onUndo, onRedo }: HistoryControlsProps) {
  const shortcuts = historyShortcuts(useApplePlatform());

  const item = (action: HistoryAction, enabled: boolean, run: () => void) => {
    const Icon = ICONS[action];
    return (
      <DropdownMenuItem
        disabled={!enabled}
        aria-keyshortcuts={shortcuts[action].aria}
        onSelect={run}
      >
        <Icon aria-hidden="true" />
        {NAMES[action]}
        <DropdownMenuShortcut aria-hidden="true">{shortcuts[action].label}</DropdownMenuShortcut>
      </DropdownMenuItem>
    );
  };

  return (
    <>
      {item('undo', canUndo, onUndo)}
      {item('redo', canRedo, onRedo)}
    </>
  );
}
