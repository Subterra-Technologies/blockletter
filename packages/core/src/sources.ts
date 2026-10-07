import { sortDatedItems } from './blocks/dated-list';
import { LIMITS } from './limits';
import { applyTemplate } from './templates';
import type {
  BlockBase,
  BrandKit,
  BuiltInBlock,
  DataSource,
  DataSourceContext,
  DatedItem,
  IssuePeriod,
  ListBlockType,
  NewsletterDocument,
  NewsletterTemplate,
  SourcedItem,
} from './types';

/**
 * Filling list blocks from a host's own data. Content is a snapshot: a refresh copies the
 * source's records into the block, tagged with their `ref`, and rendering never looks anything up.
 */

/** How many items a refresh keeps when the source does not say: the block type's own limit. */
const TYPE_LIMITS: Partial<Record<ListBlockType, number>> = {
  event_tiles: LIMITS.eventTiles,
  post_list: LIMITS.posts,
};

const itemsOf = (block: BlockBase): SourcedItem[] => {
  const items = (block as { items?: unknown }).items;
  return Array.isArray(items) ? (items as SourcedItem[]) : [];
};

/** The source that fills `block`: the one its `source` names, for its type. */
export function sourceFor<S extends DataSource>(
  block: Pick<BlockBase, 'type' | 'source'>,
  sources: readonly S[] = [],
): S | undefined {
  if (!block.source) return undefined;
  return sources.find((source) => source.id === block.source && source.blockType === block.type);
}

/**
 * Re-reads `source` into a list block. Event tiles take the source's first `limit` items. Sponsors,
 * name lists and post lists replace the items a source supplied before (those with a `ref`) where
 * the first of them stood, and keep the ones written by hand. A dated list does the same, then
 * orders everything by `sortDate`. A block that gains its first items is shown; one its editor
 * hid while it had items stays hidden. An item without a `ref` is given one, so the next refresh
 * knows it came from the source.
 */
export async function refreshBlock<B extends BlockBase>(
  block: B,
  source: DataSource,
  context: DataSourceContext = {},
): Promise<B> {
  if (source.blockType !== block.type) {
    throw new TypeError(
      `The "${source.id}" source fills ${source.blockType} blocks, not ${block.type} blocks.`,
    );
  }
  const fetched: SourcedItem[] = await source.items(context);
  if (context.signal?.aborted) {
    throw context.signal.reason ?? new Error('The refresh was cancelled.');
  }
  const current = itemsOf(block);
  const replaceAll = source.blockType === 'event_tiles';
  const kept = replaceAll ? [] : current.filter((item) => !item.ref);
  const typeLimit = TYPE_LIMITS[source.blockType] ?? Number.POSITIVE_INFINITY;
  const wanted =
    typeof source.limit === 'number' && !Number.isNaN(source.limit) ? source.limit : typeLimit;
  const room = Math.max(0, Math.floor(Math.min(wanted, typeLimit - kept.length)));
  const incoming = fetched
    .slice(0, room)
    .map((item, index) => ({ ...item, ref: item.ref || `${source.id}:${index + 1}` }));

  let items: SourcedItem[] = incoming;
  if (!replaceAll) {
    const first = current.findIndex((item) => item.ref);
    const at = first < 0 ? 0 : first;
    items = [...kept.slice(0, at), ...incoming, ...kept.slice(at)];
    if (source.blockType === 'dated_list') items = sortDatedItems(items as DatedItem[]);
  }
  const hidden = items.length > 0 && current.length === 0 ? false : block.hidden;
  return { ...block, items, hidden };
}

export interface AssembleOptions {
  period?: IssuePeriod;
  brand?: BrandKit;
  sources?: readonly DataSource[];
  signal?: AbortSignal;
}

/**
 * An issue that fills itself: `applyTemplate`, then every block whose `source` names one of
 * `sources` (for its type) refreshed from it, all at once. A sourced block that comes back empty
 * is hidden, so an issue never shows an empty "Upcoming events".
 */
export async function assembleDocument<B extends BlockBase = BuiltInBlock>(
  template: NewsletterTemplate<B>,
  options: AssembleOptions = {},
): Promise<NewsletterDocument<B>> {
  const doc = applyTemplate(template, options);
  const sources = options.sources ?? [];
  const context: DataSourceContext = {
    ...(options.period ? { period: options.period } : {}),
    ...(options.signal ? { signal: options.signal } : {}),
  };
  const blocks = await Promise.all(
    doc.blocks.map(async (block) => {
      const source = sourceFor(block, sources);
      if (!source) return block;
      const refreshed = await refreshBlock(block, source, context);
      return itemsOf(refreshed).length === 0 ? { ...refreshed, hidden: true } : refreshed;
    }),
  );
  return { ...doc, blocks };
}
