import type { ReactNode } from 'react';
import {
  LIMITS,
  formatShortDate,
  sortDatedItems,
  sourceFor,
  type BlockBase,
  type DataSource,
  type DatedItem,
  type DatedListBlock,
  type EventTileItem,
  type EventTilesBlock,
  type NameListBlock,
  type NameListItem,
  type PostItem,
  type PostListBlock,
  type SourcedItem,
  type SponsorItem,
  type SponsorsBlock,
} from '@subterra-technologies/blockletter';
import { useEditorContext } from '../../editor/context';
import type { BlockEditorProps } from '../../editor/types';
import { StatusBadge } from '../../ui/status-badge';
import { blockEditor } from '../editor-base';
import { AreaField, EditorFields, FieldPair, TextField } from '../editor-fields';
import { ImageField } from '../image-field';
import { ItemList } from '../item-list';
import { SourcePicker } from '../source-picker';

/**
 * The list blocks a data source can fill: event tiles, sponsors, a name list, a post list and a
 * dated list. Each holds snapshot items. When the host registered the block's source, its
 * candidates are offered as a checklist; below it, every item (picked or written by hand) is a
 * row that can be edited, reordered or removed. A picked item is labelled with where it came
 * from, because the next refresh replaces it.
 */

/** The source that fills `block`, when the host registered one for its type. */
function useBlockSource(block: Pick<BlockBase, 'type' | 'source'>): DataSource | undefined {
  return sourceFor(block, useEditorContext().sources);
}

/** "From Club events" beside a row the source supplied. */
const sourceBadge =
  (source: DataSource | undefined) =>
  (item: SourcedItem): ReactNode =>
    source && item.ref ? <StatusBadge tone="info">From {source.label}</StatusBadge> : null;

const emptyNote = (plural: string, source: DataSource | undefined): string =>
  source
    ? `No ${plural} yet. Pick from ${source.label} above, or add one by hand.`
    : `No ${plural} yet.`;

/** Copies `item` with its blank optional fields left out. */
function compact<T extends object>(item: T, optional: readonly (keyof T)[]): T {
  const next = { ...item };
  for (const key of optional) {
    const value = next[key];
    if (value === undefined || (typeof value === 'string' && !value.trim())) delete next[key];
  }
  return next;
}

// --- Event tiles ---------------------------------------------------------------------------------

const describeEvent = (item: EventTileItem) => ({
  name: item.title,
  detail: [formatShortDate(item.date), item.time, item.location].filter(Boolean).join(' · '),
});

export function EventTilesEditor({ block, onChange, readOnly }: BlockEditorProps<EventTilesBlock>) {
  const source = useBlockSource(block);
  const { patch } = blockEditor(block, onChange);
  const setItems = (items: EventTileItem[]) =>
    patch({ items: items.map((item) => compact(item, ['time', 'location', 'url'])) });
  const help = `Up to ${LIMITS.eventTiles} events become the big date tiles.`;

  return (
    <EditorFields readOnly={readOnly}>
      <TextField label="Heading" value={block.heading} onChange={(heading) => patch({ heading })} />
      {source ? (
        <SourcePicker
          source={source}
          items={block.items}
          onChange={setItems}
          describe={describeEvent}
          limit={LIMITS.eventTiles}
          help={help}
        />
      ) : null}
      <ItemList
        label="Events"
        noun="event"
        reorderable
        items={block.items}
        onChange={setItems}
        max={LIMITS.eventTiles}
        create={() => ({ title: '', date: '' })}
        addLabel="Add event"
        limitHint={`Event tiles show up to ${LIMITS.eventTiles} events.`}
        empty={emptyNote('events', source)}
        hint={source ? undefined : help}
        badge={sourceBadge(source)}
        renderItem={(item, update) => (
          <>
            <TextField label="Title" value={item.title} onChange={(title) => update({ title })} />
            <FieldPair>
              <TextField
                label="Date"
                type="date"
                value={item.date}
                onChange={(date) => update({ date })}
              />
              <TextField
                label="Time (optional)"
                placeholder="6:30 PM"
                value={item.time ?? ''}
                onChange={(time) => update({ time })}
              />
            </FieldPair>
            <TextField
              label="Location (optional)"
              value={item.location ?? ''}
              onChange={(location) => update({ location })}
            />
            <TextField
              label="Link (optional)"
              placeholder="/events"
              value={item.url ?? ''}
              onChange={(url) => update({ url })}
            />
          </>
        )}
      />
    </EditorFields>
  );
}

// --- Sponsors ------------------------------------------------------------------------------------

const describeSponsor = (item: SponsorItem) => ({ name: item.name, detail: item.message });

export function SponsorsEditor({ block, onChange, readOnly }: BlockEditorProps<SponsorsBlock>) {
  const source = useBlockSource(block);
  const { patch } = blockEditor(block, onChange);
  const setItems = (items: SponsorItem[]) =>
    patch({ items: items.map((item) => compact(item, ['logo', 'url'])) });

  return (
    <EditorFields readOnly={readOnly}>
      <TextField label="Heading" value={block.heading} onChange={(heading) => patch({ heading })} />
      {source ? (
        <SourcePicker
          source={source}
          items={block.items}
          onChange={setItems}
          describe={describeSponsor}
        />
      ) : null}
      <ItemList
        label="Sponsors"
        noun="sponsor"
        reorderable
        items={block.items}
        onChange={setItems}
        create={() => ({ name: '', message: 'Thank you for sponsoring!' })}
        addLabel="Add sponsor"
        empty={emptyNote('sponsors', source)}
        badge={sourceBadge(source)}
        renderItem={(item, update) => (
          <>
            <FieldPair>
              <TextField
                label="Sponsor name"
                value={item.name}
                onChange={(name) => update({ name })}
              />
              <TextField
                label="Link (optional)"
                value={item.url ?? ''}
                onChange={(url) => update({ url })}
              />
            </FieldPair>
            <AreaField
              label="Thank-you message"
              rows={2}
              value={item.message}
              onChange={(message) => update({ message })}
            />
            <ImageField
              label="Logo"
              value={item.logo}
              disabled={readOnly}
              onChange={(logo) => update({ logo })}
            />
          </>
        )}
      />
    </EditorFields>
  );
}

// --- Name list -----------------------------------------------------------------------------------

const describeName = (item: NameListItem) => ({ name: item.name, detail: item.detail ?? '' });

export function NameListEditor({ block, onChange, readOnly }: BlockEditorProps<NameListBlock>) {
  const source = useBlockSource(block);
  const { patch } = blockEditor(block, onChange);
  const setItems = (items: NameListItem[]) =>
    patch({ items: items.map((item) => compact(item, ['detail', 'url'])) });

  return (
    <EditorFields readOnly={readOnly}>
      <TextField label="Heading" value={block.heading} onChange={(heading) => patch({ heading })} />
      <AreaField
        label="Intro"
        rows={3}
        value={block.intro}
        onChange={(intro) => patch({ intro })}
      />
      {source ? (
        <SourcePicker
          source={source}
          items={block.items}
          onChange={setItems}
          describe={describeName}
        />
      ) : null}
      <ItemList
        label="Names"
        noun="name"
        reorderable
        items={block.items}
        onChange={setItems}
        create={() => ({ name: '' })}
        addLabel="Add name"
        empty={emptyNote('names', source)}
        badge={sourceBadge(source)}
        renderItem={(item, update) => (
          <>
            <TextField label="Name" value={item.name} onChange={(name) => update({ name })} />
            <TextField
              label="Second line (optional)"
              placeholder="Bakery · Joined Sept. 3"
              value={item.detail ?? ''}
              onChange={(detail) => update({ detail })}
            />
            <TextField
              label="Link (optional)"
              value={item.url ?? ''}
              onChange={(url) => update({ url })}
            />
          </>
        )}
      />
    </EditorFields>
  );
}

// --- Post list -----------------------------------------------------------------------------------

const describePost = (item: PostItem) => ({
  name: item.title,
  detail: [item.kicker, item.excerpt].filter(Boolean).join(' · '),
});

export function PostListEditor({ block, onChange, readOnly }: BlockEditorProps<PostListBlock>) {
  const source = useBlockSource(block);
  const { patch } = blockEditor(block, onChange);
  const setItems = (items: PostItem[]) =>
    patch({ items: items.map((item) => compact(item, ['kicker'])) });
  const help = `Up to ${LIMITS.posts} posts, each with its title and summary.`;

  return (
    <EditorFields readOnly={readOnly}>
      <TextField label="Heading" value={block.heading} onChange={(heading) => patch({ heading })} />
      {source ? (
        <SourcePicker
          source={source}
          items={block.items}
          onChange={setItems}
          describe={describePost}
          limit={LIMITS.posts}
          help={help}
        />
      ) : null}
      <ItemList
        label="Posts"
        noun="post"
        reorderable
        items={block.items}
        onChange={setItems}
        max={LIMITS.posts}
        create={() => ({ title: '', excerpt: '', url: '' })}
        addLabel="Add post"
        limitHint={`A post list shows up to ${LIMITS.posts} posts.`}
        empty={emptyNote('posts', source)}
        hint={source ? undefined : help}
        badge={sourceBadge(source)}
        renderItem={(item, update) => (
          <>
            <TextField
              label="Label (optional)"
              placeholder="Announcement"
              value={item.kicker ?? ''}
              onChange={(kicker) => update({ kicker })}
            />
            <TextField label="Title" value={item.title} onChange={(title) => update({ title })} />
            <AreaField
              label="Summary"
              rows={2}
              value={item.excerpt}
              onChange={(excerpt) => update({ excerpt })}
            />
            <TextField
              label="Link"
              placeholder="/news"
              value={item.url}
              onChange={(url) => update({ url })}
            />
          </>
        )}
      />
    </EditorFields>
  );
}

// --- Dated list ----------------------------------------------------------------------------------

const describeDated = (item: DatedItem) => ({ name: item.text, detail: item.date });

export function DatedListEditor({ block, onChange, readOnly }: BlockEditorProps<DatedListBlock>) {
  const source = useBlockSource(block);
  const { patch } = blockEditor(block, onChange);
  const setItems = (items: DatedItem[]) =>
    patch({ items: items.map((item) => compact(item, ['sortDate'])) });

  return (
    <EditorFields readOnly={readOnly}>
      <FieldPair>
        <TextField
          label="Heading"
          value={block.heading}
          onChange={(heading) => patch({ heading })}
        />
        <TextField
          label="Subheading"
          value={block.subheading}
          onChange={(subheading) => patch({ subheading })}
        />
      </FieldPair>
      {source ? (
        <SourcePicker
          source={source}
          items={block.items}
          onChange={setItems}
          describe={describeDated}
          arrange={sortDatedItems}
        />
      ) : null}
      <ItemList
        label="Lines"
        noun="line"
        reorderable
        items={block.items}
        onChange={setItems}
        create={() => ({ date: '', text: '' })}
        addLabel="Add line"
        empty={emptyNote('lines', source)}
        hint="Lines render as “Sept. 5 · Farmers market | Town square”. Lines with a sort date appear in date order; the rest follow in the order shown here."
        badge={sourceBadge(source)}
        renderItem={(item, update) => (
          <>
            <FieldPair>
              <TextField
                label="Date"
                placeholder="Sept. 5"
                value={item.date}
                onChange={(date) => update({ date })}
              />
              <TextField
                label="Sort date (optional)"
                type="date"
                value={item.sortDate ?? ''}
                onChange={(sortDate) => update({ sortDate })}
              />
            </FieldPair>
            <TextField
              label="What’s happening"
              placeholder="Farmers market | Town square"
              value={item.text}
              onChange={(text) => update({ text })}
            />
          </>
        )}
      />
    </EditorFields>
  );
}
