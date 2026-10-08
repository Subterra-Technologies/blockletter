import { useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowDownIcon, ArrowUpIcon, Trash2Icon } from 'lucide-react';
import { useEditorMessages } from '../i18n/context';
import { Button } from '../ui/button';
import { LiveRegion } from '../ui/live-region';
import { AddButton, GroupLabel, Hint, Note } from './editor-fields';

/**
 * A repeating list inside a block editor: events, sponsors, columns, photos, footer links. Each
 * row is labelled with its position ("Sponsor 2"), and its Remove (and, where order matters,
 * Move up and Move down) buttons say which row they act on.
 *
 * Rows keep a stable key of their own rather than their position, so a row that moves takes its
 * fields with it — focus, a half-typed image address, an upload in progress — instead of
 * leaving them to whichever item lands in its place. After a move, focus stays on the button
 * that was pressed (or its opposite, once the row reaches an end); after a removal it goes to
 * the row that took its place; after an addition, to the new row's first field. Each change is
 * also announced, since the list's visible order is the only other sign of it.
 */

type Control = 'first' | 'title' | 'up' | 'down';

const FOCUSABLE =
  'input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), select:not([disabled]), button:not([disabled])';

/** The source's id for an item a data source supplied; unique within a list. */
const refOf = (item: unknown): string | undefined => {
  const ref = (item as { ref?: unknown } | null)?.ref;
  return typeof ref === 'string' && ref ? ref : undefined;
};

/**
 * A stable key per row. An item a data source supplied is keyed by its `ref`, which never changes,
 * so picking or unpicking from the source leaves every other row where it is. Items written here
 * have keys of their own, in order: changes made in this list update them alongside the items,
 * and when the count changes anywhere else (a refresh, an undo) the keys that still fit are kept.
 */
function useRowKeys(items: readonly unknown[]) {
  const manualCount = items.filter((item) => !refOf(item)).length;
  const [rows, setRows] = useState(() => ({
    next: manualCount,
    manual: Array.from({ length: manualCount }, (_, index) => index),
  }));
  let current = rows;
  if (rows.manual.length !== manualCount) {
    const manual = rows.manual.slice(0, manualCount);
    let next = rows.next;
    while (manual.length < manualCount) manual.push(next++);
    current = { next, manual };
    setRows(current);
  }
  // A ref repeated by a misbehaving source still gets a key of its own.
  const seen = new Map<string, number>();
  let position = 0;
  const keys = items.map((item) => {
    const ref = refOf(item);
    if (!ref) return `row-${current.manual[position++] ?? `extra-${position}`}`;
    const count = (seen.get(ref) ?? 0) + 1;
    seen.set(ref, count);
    return count === 1 ? `ref-${ref}` : `ref-${ref}-${count}`;
  });
  /** How many hand-written items come before `index`. */
  const manualBefore = (index: number) =>
    items.slice(0, index).filter((item) => !refOf(item)).length;
  return { keys, rows: current, setRows, manualBefore };
}

export interface ItemListProps<T> {
  /**
   * The list's words: its visible name ("Events"), which labels it; one item ("event"), which
   * `lists` messages make "Event 1", "Remove event 1" and "Move event 1 up" from; and its Add
   * button's label.
   */
  words: { label: string; item: string; add: string };
  items: readonly T[];
  onChange: (items: T[]) => void;
  /** A fresh item for the Add button. */
  create: () => NoInfer<T>;
  /** The fields for one item; `update` merges changes into it. */
  renderItem: (
    item: NoInfer<T>,
    update: (changes: Partial<NoInfer<T>>) => void,
    index: number,
  ) => ReactNode;
  /** Remove is disabled at this many rows. */
  min?: number;
  /** Add is disabled at this many rows. */
  max?: number;
  /** Why Add is disabled once the list is full. */
  limitHint?: string;
  /** Shown in place of the list when it has no rows. */
  empty?: ReactNode;
  /** Shown under the Add button. */
  hint?: ReactNode;
  /** Cards with a title row (the default), or compact lines of fields. */
  variant?: 'card' | 'line';
  /** Move up and Move down on every row. */
  reorderable?: boolean;
  /** A badge beside a card's title, such as where the item came from. */
  badge?: (item: NoInfer<T>) => ReactNode;
}

export function ItemList<T>({
  words,
  items,
  onChange,
  create,
  renderItem,
  min = 0,
  max = Number.POSITIVE_INFINITY,
  limitHint,
  empty,
  hint,
  variant = 'card',
  reorderable = false,
  badge,
}: ItemListProps<T>) {
  const { lists, common } = useEditorMessages();
  const id = useId();
  const labelId = `${id}-label`;
  const limitId = `${id}-limit`;
  const { keys, rows, setRows, manualBefore } = useRowKeys(items);
  const { item: noun } = words;
  const [announcement, setAnnouncement] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const addRef = useRef<HTMLButtonElement>(null);
  const pendingFocus = useRef<{ key: string; control: Control } | 'add' | null>(null);

  const full = items.length >= max;

  // Focus moves once the list has re-rendered with the change, never before.
  useLayoutEffect(() => {
    const pending = pendingFocus.current;
    const container = containerRef.current;
    if (!pending || !container) return;
    pendingFocus.current = null;
    if (pending === 'add') {
      addRef.current?.focus();
      return;
    }
    const row = Array.from(container.querySelectorAll<HTMLElement>('[data-row-key]')).find(
      (element) => element.dataset.rowKey === pending.key,
    );
    if (!row) {
      addRef.current?.focus();
      return;
    }
    const control = (name: string) =>
      row.querySelector<HTMLElement>(`[data-row-control="${name}"]`);
    const enabled = (element: HTMLElement | null) =>
      element && !(element as HTMLButtonElement).disabled ? element : null;
    const target =
      pending.control === 'first'
        ? row.querySelector<HTMLElement>(`[data-row-body] :is(${FOCUSABLE})`)
        : pending.control === 'title'
          ? (control('title') ??
            row.querySelector<HTMLElement>(`[data-row-body] :is(${FOCUSABLE})`))
          : (enabled(control(pending.control)) ??
            enabled(control(pending.control === 'up' ? 'down' : 'up')));
    (target ?? addRef.current)?.focus();
  });

  function add(): void {
    if (full) return;
    const item = create();
    const ref = refOf(item);
    let key = `ref-${ref ?? ''}`;
    if (!ref) {
      key = `row-${rows.next}`;
      setRows({ next: rows.next + 1, manual: [...rows.manual, rows.next] });
    }
    pendingFocus.current = { key, control: 'first' };
    setAnnouncement(lists.added(noun, items.length + 1));
    onChange([...items, item]);
  }

  function remove(index: number): void {
    if (items.length <= min || index >= items.length) return;
    if (!refOf(items[index])) {
      const rank = manualBefore(index);
      setRows({ next: rows.next, manual: rows.manual.filter((_, at) => at !== rank) });
    }
    const remaining = keys.filter((_, position) => position !== index);
    const neighbour = remaining[Math.min(index, remaining.length - 1)];
    pendingFocus.current =
      neighbour === undefined
        ? 'add'
        : { key: neighbour, control: variant === 'card' ? 'title' : 'first' };
    setAnnouncement(lists.removed(noun, index + 1));
    onChange(items.filter((_, position) => position !== index));
  }

  function move(index: number, direction: -1 | 1): void {
    const to = index + direction;
    const item = items[index];
    const other = items[to];
    const key = keys[index];
    if (item === undefined || other === undefined || key === undefined) return;
    // Two hand-written items trade places in the order their keys follow.
    if (!refOf(item) && !refOf(other)) {
      const from = manualBefore(index);
      const into = manualBefore(to);
      const manual = [...rows.manual];
      [manual[from], manual[into]] = [manual[into] ?? 0, manual[from] ?? 0];
      setRows({ next: rows.next, manual });
    }
    pendingFocus.current = { key, control: direction < 0 ? 'up' : 'down' };
    setAnnouncement(lists.moved(noun, to + 1, items.length));
    const next = [...items];
    next[index] = other;
    next[to] = item;
    onChange(next);
  }

  const update = (index: number) => (changes: Partial<T>) =>
    onChange(items.map((item, position) => (position === index ? { ...item, ...changes } : item)));

  return (
    <div ref={containerRef} className="bl:flex bl:min-w-0 bl:flex-col bl:gap-2">
      <GroupLabel id={labelId}>{words.label}</GroupLabel>
      {items.length === 0 ? (
        empty ? (
          <Note>{empty}</Note>
        ) : null
      ) : (
        <ol aria-labelledby={labelId} className="bl:flex bl:min-w-0 bl:flex-col bl:gap-3">
          {items.map((item, index) => {
            const key = keys[index] ?? `index-${index}`;
            const number = index + 1;
            const moveButtons = reorderable ? (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  data-row-control="up"
                  aria-label={lists.moveUp(noun, number)}
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                  className="bl:text-muted-foreground"
                >
                  <ArrowUpIcon aria-hidden="true" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  data-row-control="down"
                  aria-label={lists.moveDown(noun, number)}
                  disabled={index === items.length - 1}
                  onClick={() => move(index, 1)}
                  className="bl:text-muted-foreground"
                >
                  <ArrowDownIcon aria-hidden="true" />
                </Button>
              </>
            ) : null;

            if (variant === 'line') {
              return (
                <li
                  key={key}
                  data-row-key={key}
                  className="bl:flex bl:min-w-0 bl:items-end bl:gap-1"
                >
                  <div
                    data-row-body=""
                    className="bl:grid bl:min-w-0 bl:flex-1 bl:gap-2 bl:@xs/inspector:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]"
                  >
                    {renderItem(item, update(index), index)}
                  </div>
                  {moveButtons}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    data-row-control="remove"
                    aria-label={lists.remove(noun, number)}
                    disabled={items.length <= min}
                    onClick={() => remove(index)}
                    className="bl:shrink-0 bl:text-muted-foreground bl:hover:text-danger"
                  >
                    <Trash2Icon aria-hidden="true" />
                  </Button>
                </li>
              );
            }

            const itemBadge = badge?.(item);
            return (
              <li
                key={key}
                data-row-key={key}
                className="bl:flex bl:min-w-0 bl:flex-col bl:gap-4 bl:rounded-md bl:border bl:p-3"
              >
                <div className="bl:flex bl:flex-wrap bl:items-center bl:justify-between bl:gap-2">
                  <span className="bl:flex bl:min-w-0 bl:flex-wrap bl:items-center bl:gap-2">
                    <span
                      tabIndex={-1}
                      data-row-control="title"
                      className="bl:text-[0.8125rem] bl:font-semibold bl:outline-none bl:focus-visible:underline bl:focus-visible:underline-offset-4"
                    >
                      {lists.row(noun, number)}
                    </span>
                    {itemBadge}
                  </span>
                  <span className="bl:flex bl:items-center bl:gap-0.5">
                    {moveButtons}
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      data-row-control="remove"
                      aria-label={lists.remove(noun, number)}
                      disabled={items.length <= min}
                      onClick={() => remove(index)}
                      className="bl:text-muted-foreground bl:hover:text-danger"
                    >
                      <Trash2Icon aria-hidden="true" />
                      {common.remove}
                    </Button>
                  </span>
                </div>
                <div data-row-body="" className="bl:flex bl:min-w-0 bl:flex-col bl:gap-4">
                  {renderItem(item, update(index), index)}
                </div>
              </li>
            );
          })}
        </ol>
      )}
      <AddButton
        label={words.add}
        disabled={full}
        describedById={full && limitHint ? limitId : undefined}
        buttonRef={addRef}
        onClick={add}
      />
      {full && limitHint ? <Hint id={limitId}>{limitHint}</Hint> : null}
      {hint ? <Hint>{hint}</Hint> : null}
      <LiveRegion>{announcement}</LiveRegion>
    </div>
  );
}
