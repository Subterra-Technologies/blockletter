import { useEffect, useEffectEvent, useId, useState, type ReactNode } from 'react';
import type { DataSource, SourcedItem } from '@subterra-technologies/blockletter';
import { useEditorContext } from '../editor/context';
import { errorMessage } from '../lib/errors';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { Skeleton } from '../ui/skeleton';
import { GroupLabel, Hint, Note, describedBy } from './editor-fields';

/**
 * Picking a list block's items from the host's data: the source's candidates for the issue's
 * period as a checklist, a name and a line of detail each. A candidate is checked when the block
 * holds an item with its `ref`; checking one copies its snapshot in, unchecking takes it out.
 * Items written by hand carry no `ref`, so the picker never touches them.
 */

export interface PickDescription {
  name: string;
  detail?: string;
}

/**
 * `items` with `candidate` added or, when the block already holds it, removed. An addition never
 * goes past `limit`, and lands among the other picked items in the source's own order (before
 * the hand-written ones when it is the first), which is where a refresh would put it.
 */
export function togglePick<T extends SourcedItem>(
  items: readonly T[],
  candidate: T,
  candidates: readonly T[],
  limit: number = Number.POSITIVE_INFINITY,
): T[] {
  const { ref } = candidate;
  if (!ref) return [...items];
  if (items.some((item) => item.ref === ref)) return items.filter((item) => item.ref !== ref);
  if (items.length >= limit) return [...items];
  const order = new Map(candidates.map((item, index) => [item.ref, index]));
  const rank = order.get(ref) ?? Number.POSITIVE_INFINITY;
  let at = items.findIndex(
    (item) => Boolean(item.ref) && (order.get(item.ref) ?? Number.POSITIVE_INFINITY) > rank,
  );
  if (at < 0) {
    let last = -1;
    items.forEach((item, index) => {
      if (item.ref) last = index;
    });
    at = last + 1;
  }
  return [...items.slice(0, at), { ...candidate }, ...items.slice(at)];
}

type Loaded = { key: string; items: unknown[] } | { key: string; error: string };

export interface SourcePickerProps<T extends SourcedItem> {
  /** The source `sourceFor` found for the block, so it fills this block's type. */
  source: DataSource;
  /** The block's items. */
  items: readonly T[];
  onChange: (items: T[]) => void;
  /** The name and detail line a candidate is listed with. */
  describe: (item: T) => PickDescription;
  /** The most items the block holds, hand-written ones included. */
  limit?: number;
  help?: ReactNode;
  /** Puts the items in order after a pick, as a refresh would (dated lists sort by date). */
  arrange?: (items: T[]) => T[];
}

export function SourcePicker<T extends SourcedItem>({
  source,
  items,
  onChange,
  describe,
  limit,
  help,
  arrange = (next) => next,
}: SourcePickerProps<T>) {
  const { period } = useEditorContext();
  const id = useId();
  const labelId = `${id}-label`;
  const limitId = `${id}-limit`;
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  // What to read: a different source or period, or Try again, reads afresh. A host that rebuilds
  // its source objects on every render does not cause a reload.
  const requestKey = JSON.stringify([
    source.id,
    source.blockType,
    period?.start,
    period?.end,
    period?.lookaheadEnd,
    attempt,
  ]);

  const read = useEffectEvent((signal: AbortSignal) =>
    source.items({ ...(period ? { period } : {}), signal }),
  );

  useEffect(() => {
    const controller = new AbortController();
    let pending: Promise<unknown>;
    try {
      pending = Promise.resolve(read(controller.signal));
    } catch (cause: unknown) {
      pending = Promise.reject(cause);
    }
    pending.then(
      (result) => {
        if (controller.signal.aborted) return;
        setLoaded({ key: requestKey, items: Array.isArray(result) ? result : [] });
      },
      (cause: unknown) => {
        if (controller.signal.aborted) return;
        setLoaded({ key: requestKey, error: errorMessage(cause, '') });
      },
    );
    return () => controller.abort();
  }, [requestKey]);

  const current = loaded?.key === requestKey ? loaded : null;
  // Candidates without a `ref` get the one a refresh would give them, so the two agree.
  const candidates =
    current && 'items' in current
      ? (current.items as T[]).map((item, index) => ({
          ...item,
          ref: item.ref || `${source.id}:${index + 1}`,
        }))
      : [];
  const full = limit !== undefined && items.length >= limit;
  const count = limit === undefined ? `${items.length}` : `${items.length}/${limit}`;

  let body: ReactNode;
  if (!current) {
    body = (
      <div role="status" className="bl:flex bl:flex-col bl:gap-2">
        <span className="bl:sr-only">Loading {source.label}…</span>
        <Skeleton aria-hidden="true" className="bl:h-9 bl:w-full" />
        <Skeleton aria-hidden="true" className="bl:h-9 bl:w-full" />
      </div>
    );
  } else if ('error' in current) {
    body = (
      <div
        role="alert"
        className="bl:flex bl:flex-wrap bl:items-center bl:justify-between bl:gap-2 bl:rounded-md bl:border bl:border-danger/30 bl:bg-danger-soft bl:px-3 bl:py-2 bl:text-[0.8125rem] bl:text-danger"
      >
        <span>
          {source.label} could not be loaded.{current.error ? ` ${current.error}` : ''}
        </span>
        <Button type="button" variant="outline" size="sm" onClick={() => setAttempt((n) => n + 1)}>
          Try again
        </Button>
      </div>
    );
  } else if (candidates.length === 0) {
    body = (
      <Note>
        {period
          ? `Nothing from ${source.label} for this issue’s dates yet.`
          : `Nothing from ${source.label} yet.`}
      </Note>
    );
  } else {
    body = (
      <ul
        aria-labelledby={labelId}
        className="bl:flex bl:max-h-80 bl:flex-col bl:divide-y bl:overflow-y-auto bl:rounded-md bl:border"
      >
        {candidates.map((candidate, index) => {
          const checked = items.some((item) => item.ref === candidate.ref);
          const { name, detail } = describe(candidate);
          const optionId = `${id}-option-${index}`;
          return (
            <li key={candidate.ref} className="bl:flex bl:items-start bl:gap-2.5 bl:px-3 bl:py-2">
              <Checkbox
                id={optionId}
                checked={checked}
                disabled={!checked && full}
                aria-describedby={describedBy(
                  detail ? `${optionId}-detail` : null,
                  !checked && full ? limitId : null,
                )}
                onCheckedChange={() =>
                  onChange(arrange(togglePick(items, candidate, candidates, limit)))
                }
                className="bl:mt-0.5"
              />
              <span className="bl:flex bl:min-w-0 bl:flex-col bl:gap-0.5">
                <Label htmlFor={optionId} className="bl:leading-snug">
                  {name || 'Untitled'}
                </Label>
                {detail ? (
                  <span
                    id={`${optionId}-detail`}
                    className="bl:line-clamp-2 bl:text-xs bl:text-muted-foreground"
                  >
                    {detail}
                  </span>
                ) : null}
              </span>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <div className="bl:flex bl:min-w-0 bl:flex-col bl:gap-2">
      <GroupLabel id={labelId}>
        Pick from {source.label} ({count})
      </GroupLabel>
      {body}
      {full && candidates.some((candidate) => !items.some((item) => item.ref === candidate.ref)) ? (
        <Hint id={limitId}>That is as many as this block shows. Uncheck one to pick another.</Hint>
      ) : null}
      {help ? <Hint>{help}</Hint> : null}
    </div>
  );
}
