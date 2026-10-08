import type { ReactNode } from 'react';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  BetweenHorizontalEndIcon,
  BetweenHorizontalStartIcon,
  CopyIcon,
  EyeIcon,
  EyeOffIcon,
  PencilIcon,
  RefreshCwIcon,
  Trash2Icon,
} from 'lucide-react';
import {
  blockLabel,
  isStructural,
  sourceFor,
  type BlockBase,
} from '@subterra-technologies/blockletter';
import { useEditorContext } from '../editor/context';
import { cn } from '../lib/cn';
import { Separator } from '../ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

export interface CanvasToolbarProps {
  block: BlockBase;
  index: number;
  /** How many places the block can move between: the body, without the footer. */
  count: number;
  refreshing?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onInsertAbove?: () => void;
  onInsertBelow?: () => void;
  onToggleHidden?: () => void;
  onDuplicate?: () => void;
  onRefresh?: () => void;
  onRemove?: () => void;
  /** Opens the block's form where it is not in view (a phone); given, the toolbar leads with Edit. */
  onEdit?: (() => void) | undefined;
}

/**
 * The toolbar on the selected canvas block. Every button is the keyboard equivalent of a mouse
 * gesture on the canvas: the arrows replace dragging, and Insert above / below replaces dropping a
 * palette block at a chosen place. Each is named for the block it acts on, and a tooltip says the
 * same for somebody pointing at it.
 *
 * The footer keeps its place and cannot be hidden, copied or deleted; a structural block (one of
 * which an issue holds at most one) cannot be copied or deleted. Refresh appears only on a block
 * whose `source` names a data source the host registered, and names that source.
 */
export function CanvasToolbar({
  block,
  index,
  count,
  refreshing = false,
  onMoveUp,
  onMoveDown,
  onInsertAbove,
  onInsertBelow,
  onToggleHidden,
  onDuplicate,
  onRefresh,
  onRemove,
  onEdit,
}: CanvasToolbarProps) {
  const { definitions, sources } = useEditorContext();
  const name = blockLabel(block.type, definitions);
  const footer = block.type === 'footer';
  const structural = isStructural(block, definitions);
  const source = sourceFor(block, sources);
  return (
    // Its own provider, with a short delay, so tooltips do not flash while the pointer crosses.
    <TooltipProvider delayDuration={300}>
      <div
        role="toolbar"
        aria-label={`${name} block`}
        className="bl:flex bl:items-center bl:gap-0.5 bl:rounded-lg bl:border bl:bg-background bl:p-0.5 bl:text-foreground bl:shadow-md"
      >
        {onEdit ? (
          <>
            <ToolButton label={`Edit ${name}`} tip="Edit block" onClick={onEdit}>
              <PencilIcon />
            </ToolButton>
            <Separator
              orientation="vertical"
              className="bl:mx-0.5 bl:data-[orientation=vertical]:h-4"
            />
          </>
        ) : null}
        <ToolButton
          label={`Move ${name} up`}
          tip="Move up"
          disabled={footer || index === 0}
          onClick={onMoveUp}
        >
          <ArrowUpIcon />
        </ToolButton>
        <ToolButton
          label={`Move ${name} down`}
          tip="Move down"
          disabled={footer || index >= count - 1}
          onClick={onMoveDown}
        >
          <ArrowDownIcon />
        </ToolButton>
        <Separator
          orientation="vertical"
          className="bl:mx-0.5 bl:data-[orientation=vertical]:h-4"
        />
        <ToolButton
          label={`Insert a block above ${name}`}
          tip="Insert a block above"
          onClick={onInsertAbove}
        >
          <BetweenHorizontalStartIcon />
        </ToolButton>
        {footer ? null : (
          <ToolButton
            label={`Insert a block below ${name}`}
            tip="Insert a block below"
            onClick={onInsertBelow}
          >
            <BetweenHorizontalEndIcon />
          </ToolButton>
        )}
        <Separator
          orientation="vertical"
          className="bl:mx-0.5 bl:data-[orientation=vertical]:h-4"
        />
        {!footer || block.hidden ? (
          <ToolButton
            label={`${block.hidden ? 'Show' : 'Hide'} ${name}`}
            tip={block.hidden ? 'Show in the email' : 'Hide from the email'}
            pressed={block.hidden}
            onClick={onToggleHidden}
          >
            {block.hidden ? <EyeIcon /> : <EyeOffIcon />}
          </ToolButton>
        ) : null}
        {structural ? null : (
          <ToolButton label={`Duplicate ${name}`} tip="Duplicate block" onClick={onDuplicate}>
            <CopyIcon />
          </ToolButton>
        )}
        {source ? (
          <ToolButton
            label={`Refresh ${name} from ${source.label}`}
            tip={`Refresh from ${source.label}`}
            disabled={refreshing}
            busy={refreshing}
            onClick={onRefresh}
          >
            <RefreshCwIcon className={refreshing ? 'bl:animate-spin' : undefined} />
          </ToolButton>
        ) : null}
        {structural ? null : (
          <ToolButton label={`Delete ${name}`} tip="Delete block" danger onClick={onRemove}>
            <Trash2Icon />
          </ToolButton>
        )}
      </div>
    </TooltipProvider>
  );
}

function ToolButton({
  label,
  tip,
  disabled = false,
  pressed,
  busy = false,
  danger = false,
  onClick,
  children,
}: {
  label: string;
  tip: string;
  disabled?: boolean;
  pressed?: boolean;
  busy?: boolean;
  danger?: boolean;
  onClick?: (() => void) | undefined;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          aria-pressed={pressed}
          aria-busy={busy || undefined}
          disabled={disabled}
          onClick={() => onClick?.()}
          className={cn(
            'bl:inline-flex bl:size-7 bl:items-center bl:justify-center bl:rounded-md bl:text-muted-foreground bl:outline-none bl:transition-colors',
            'bl:hover:bg-accent bl:hover:text-foreground bl:focus-visible:ring-[3px] bl:focus-visible:ring-ring/50',
            'bl:disabled:pointer-events-none bl:disabled:opacity-40',
            'bl:aria-pressed:bg-accent bl:aria-pressed:text-foreground',
            danger && 'bl:hover:bg-danger-soft bl:hover:text-danger',
            'bl:[&_svg]:size-4 bl:[&_svg]:shrink-0',
          )}
        >
          <span aria-hidden="true" className="bl:contents">
            {children}
          </span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={6}>
        {tip}
      </TooltipContent>
    </Tooltip>
  );
}
