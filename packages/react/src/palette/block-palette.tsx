import { useId, type DragEvent } from 'react';
import { GripVerticalIcon, XIcon } from 'lucide-react';
import { paletteGroups, type BlockBase } from '@subterra-technologies/blockletter';
import { useEditorContext } from '../editor/context';
import type { EditorBlockDefinition } from '../editor/types';
import { definitionText } from '../i18n/blocks';
import { useEditorMessages } from '../i18n/context';
import type { BoundMessages } from '../i18n/resolve';
import { cn } from '../lib/cn';
import { Button } from '../ui/button';

export interface BlockPaletteProps {
  /** Id of the palette's heading, which an editor focuses after Insert above / below. */
  headingId?: string;
  /** Off inside a sheet, whose title already names it. */
  showHeading?: boolean;
  /** Every item off: the issue is full, or nothing may change. The editor's `readOnly` is too. */
  disabled?: boolean;
  /** "12 of 30 blocks", beside the heading, in the host's words. */
  countLabel?: string;
  /** Set while Insert above / below waits for a choice ("above Event tiles"). */
  insertLabel?: string | null;
  /** Show each block's one-line description (on touch screens, where nothing hovers). */
  showHints?: boolean;
  /** Blocks can be dragged onto the canvas; off inside a sheet, which covers the canvas. */
  draggable?: boolean;
  /**
   * The issue's blocks. A structural block it already has (its header, its footer) is not offered
   * again, since an issue holds at most one of each.
   */
  blocks?: readonly Pick<BlockBase, 'type'>[];
  /** The block type to add (click); the editor decides where. */
  onAdd?: (type: string) => void;
  onCancelInsert?: () => void;
  /** A palette drag started; the canvas shows insertion points while it runs. */
  onDragStart?: (type: string) => void;
  onDragEnd?: () => void;
}

type BuiltInGroup = keyof BoundMessages['palette']['groups'];

/** A piece of an element id: nothing an id list (`aria-labelledby`) would split on. */
const slug = (value: string): string => value.trim().replace(/\s+/g, '-');

/**
 * The blocks an issue can add, in the editor's definitions' groups (Content, Layout, Graphics,
 * then any group of a host's own), each item named by its label and described by its definition's
 * description (a built-in block's, and a built-in group's, in the editor's language). Every item is a button (choosing it adds the block at the end, or at the insertion
 * point the canvas set) and, where the canvas is beside it, a drag source that drops anywhere on
 * the canvas.
 */
export function BlockPalette({
  headingId,
  showHeading = true,
  disabled = false,
  countLabel,
  insertLabel = null,
  showHints = false,
  draggable = true,
  blocks = [],
  onAdd,
  onCancelInsert,
  onDragStart,
  onDragEnd,
}: BlockPaletteProps) {
  const { definitions, readOnly } = useEditorContext();
  const m = useEditorMessages();
  const generated = useId();
  const id = headingId ?? `${generated}-palette`;
  const off = disabled || readOnly;
  const dragging = draggable && !off;
  const inserting = Boolean(insertLabel);
  const present = new Set(blocks.map((block) => block.type));
  const groups = paletteGroups(definitions)
    .map((group) => ({
      ...group,
      // A host's own group keeps the name core gave it from its id.
      label: Object.hasOwn(m.palette.groups, group.id)
        ? m.palette.groups[group.id as BuiltInGroup]
        : group.label,
      items: (group.items as EditorBlockDefinition[]).filter(
        (definition) => !(definition.structural && present.has(definition.type)),
      ),
    }))
    .filter((group) => group.items.length > 0);

  function handleDragStart(event: DragEvent<HTMLButtonElement>, type: string): void {
    if (!dragging) {
      event.preventDefault();
      return;
    }
    event.dataTransfer?.setData('text/plain', `new:${type}`);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'copy';
    onDragStart?.(type);
  }

  return (
    // Escape anywhere in the palette gives up a waiting insertion point; the controls inside are
    // the interactive elements, and this only listens to keys bubbling up from them.
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div
      className="bl:@container/palette bl:flex bl:min-w-0 bl:flex-col bl:gap-4"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && inserting) {
          event.preventDefault();
          onCancelInsert?.();
        }
      }}
    >
      <div className="bl:flex bl:flex-col bl:gap-1 bl:px-2">
        <div
          className={cn(
            'bl:flex bl:items-start bl:justify-between bl:gap-2',
            !showHeading && 'bl:sr-only',
          )}
        >
          <h2
            id={id}
            tabIndex={-1}
            className="bl:text-sm bl:font-semibold bl:text-foreground bl:outline-none"
          >
            {inserting && insertLabel ? m.palette.insertHeading(insertLabel) : m.palette.heading}
          </h2>
          {inserting ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label={m.palette.cancelInsert}
              onClick={onCancelInsert}
            >
              <XIcon aria-hidden="true" />
            </Button>
          ) : countLabel ? (
            <span className="bl:text-xs bl:text-muted-foreground bl:tabular-nums">
              {countLabel}
            </span>
          ) : null}
        </div>
        <p className="bl:text-xs bl:text-muted-foreground">
          {inserting ? m.palette.insertHint : draggable ? m.palette.dragHint : m.palette.hint}
        </p>
      </div>
      {groups.map((group) => {
        const groupId = `${id}-${slug(group.id)}`;
        return (
          <section
            key={group.id}
            aria-labelledby={groupId}
            className="bl:flex bl:flex-col bl:gap-1"
          >
            <h3 id={groupId} className="bl:px-2 bl:text-xs bl:font-medium bl:text-muted-foreground">
              {group.label}
            </h3>
            {/* One column in a side panel; across the page when the panes stack, so the palette
                is not a screen of scrolling above the canvas. */}
            <ul
              className={cn(
                'bl:grid bl:grid-cols-1',
                showHints
                  ? 'bl:@[30rem]/palette:grid-cols-2 bl:@[48rem]/palette:grid-cols-3'
                  : 'bl:@[16rem]/palette:grid-cols-2 bl:@[30rem]/palette:grid-cols-3 bl:@[44rem]/palette:grid-cols-4',
              )}
              aria-labelledby={groupId}
            >
              {group.items.map((definition) => {
                const Icon = definition.icon;
                const text = definitionText(definition, m);
                const hintId = `${id}-hint-${slug(definition.type)}`;
                const labelId = `${id}-label-${slug(definition.type)}`;
                return (
                  <li key={definition.type}>
                    <button
                      type="button"
                      draggable={dragging ? true : undefined}
                      disabled={off}
                      aria-labelledby={labelId}
                      aria-describedby={hintId}
                      title={showHints ? undefined : text.description}
                      onDragStart={(event) => handleDragStart(event, definition.type)}
                      onDragEnd={() => onDragEnd?.()}
                      onClick={() => onAdd?.(definition.type)}
                      className={cn(
                        'bl:group/item bl:flex bl:w-full bl:items-start bl:gap-2.5 bl:rounded-md bl:px-2 bl:py-1.5 bl:text-left bl:outline-none bl:transition-colors',
                        'bl:hover:bg-accent bl:focus-visible:ring-[3px] bl:focus-visible:ring-ring/50',
                        'bl:disabled:pointer-events-none bl:disabled:opacity-50',
                        dragging && 'bl:cursor-grab bl:active:cursor-grabbing',
                      )}
                    >
                      <Icon
                        aria-hidden="true"
                        className="bl:mt-0.5 bl:size-4 bl:shrink-0 bl:text-muted-foreground bl:group-hover/item:text-foreground"
                      />
                      <span className="bl:flex bl:min-w-0 bl:flex-1 bl:flex-col bl:gap-0.5">
                        {/* Wraps rather than truncates: two columns on a phone are narrow. */}
                        <span
                          id={labelId}
                          className="bl:text-[0.8125rem] bl:font-medium bl:break-words bl:text-foreground"
                        >
                          {text.label}
                        </span>
                        <span
                          id={hintId}
                          className={
                            showHints
                              ? 'bl:text-xs bl:leading-snug bl:text-muted-foreground'
                              : 'bl:sr-only'
                          }
                        >
                          {text.description}
                        </span>
                      </span>
                      {dragging ? (
                        <GripVerticalIcon
                          aria-hidden="true"
                          className="bl:mt-0.5 bl:size-4 bl:shrink-0 bl:text-muted-foreground bl:opacity-0 bl:transition-opacity bl:group-hover/item:opacity-100"
                        />
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
