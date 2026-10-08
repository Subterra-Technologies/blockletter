import type { ReactNode } from 'react';
import {
  LIMITS,
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
import { useEditorMessages } from '../../i18n/context';
import type { BoundMessages } from '../../i18n/resolve';
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
  (source: DataSource | undefined, messages: BoundMessages) =>
  (item: SourcedItem): ReactNode =>
    source && item.ref ? (
      <StatusBadge tone="info">{messages.sources.from(source.label)}</StatusBadge>
    ) : null;

/** What a list says while it is empty, with a source above it to pick from or not. */
const emptyNote = (
  words: { empty: string; emptyFromSource: (source: string) => string },
  source: DataSource | undefined,
): string => (source ? words.emptyFromSource(source.label) : words.empty);

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

export function EventTilesEditor({ block, onChange, readOnly }: BlockEditorProps<EventTilesBlock>) {
  const source = useBlockSource(block);
  const m = useEditorMessages();
  const { fields } = m;
  const words = m.blocks.event_tiles;
  const { patch } = blockEditor(block, onChange);
  const setItems = (items: EventTileItem[]) =>
    patch({ items: items.map((item) => compact(item, ['time', 'location', 'url'])) });
  const help = words.help(LIMITS.eventTiles);
  // The date as the editor writes dates, with the time and place the source gave beside it.
  const describeEvent = (item: EventTileItem) => ({
    name: item.title,
    detail: words.pickDetail({
      date: item.date,
      ...(item.time ? { time: item.time } : {}),
      ...(item.location ? { location: item.location } : {}),
    }),
  });

  return (
    <EditorFields readOnly={readOnly}>
      <TextField
        label={fields.heading}
        value={block.heading}
        onChange={(heading) => patch({ heading })}
      />
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
        words={words.list}
        reorderable
        items={block.items}
        onChange={setItems}
        max={LIMITS.eventTiles}
        create={() => ({ title: '', date: '' })}
        limitHint={words.list.limit(LIMITS.eventTiles)}
        empty={emptyNote(words.list, source)}
        hint={source ? undefined : help}
        badge={sourceBadge(source, m)}
        renderItem={(item, update) => (
          <>
            <TextField
              label={fields.title}
              value={item.title}
              onChange={(title) => update({ title })}
            />
            <FieldPair>
              <TextField
                label={fields.date}
                type="date"
                value={item.date}
                onChange={(date) => update({ date })}
              />
              <TextField
                label={words.timeOptional}
                placeholder={words.timePlaceholder}
                value={item.time ?? ''}
                onChange={(time) => update({ time })}
              />
            </FieldPair>
            <TextField
              label={words.locationOptional}
              value={item.location ?? ''}
              onChange={(location) => update({ location })}
            />
            <TextField
              label={fields.linkOptional}
              placeholder={words.linkPlaceholder}
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
  const m = useEditorMessages();
  const { fields } = m;
  const words = m.blocks.sponsors;
  const { patch } = blockEditor(block, onChange);
  const setItems = (items: SponsorItem[]) =>
    patch({ items: items.map((item) => compact(item, ['logo', 'url'])) });

  return (
    <EditorFields readOnly={readOnly}>
      <TextField
        label={fields.heading}
        value={block.heading}
        onChange={(heading) => patch({ heading })}
      />
      {source ? (
        <SourcePicker
          source={source}
          items={block.items}
          onChange={setItems}
          describe={describeSponsor}
        />
      ) : null}
      <ItemList
        words={words.list}
        reorderable
        items={block.items}
        onChange={setItems}
        create={() => ({ name: '', message: words.newMessage })}
        empty={emptyNote(words.list, source)}
        badge={sourceBadge(source, m)}
        renderItem={(item, update) => (
          <>
            <FieldPair>
              <TextField
                label={words.sponsorName}
                value={item.name}
                onChange={(name) => update({ name })}
              />
              <TextField
                label={fields.linkOptional}
                value={item.url ?? ''}
                onChange={(url) => update({ url })}
              />
            </FieldPair>
            <AreaField
              label={words.message}
              rows={2}
              value={item.message}
              onChange={(message) => update({ message })}
            />
            <ImageField
              label={words.logo}
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
  const m = useEditorMessages();
  const { fields } = m;
  const words = m.blocks.name_list;
  const { patch } = blockEditor(block, onChange);
  const setItems = (items: NameListItem[]) =>
    patch({ items: items.map((item) => compact(item, ['detail', 'url'])) });

  return (
    <EditorFields readOnly={readOnly}>
      <TextField
        label={fields.heading}
        value={block.heading}
        onChange={(heading) => patch({ heading })}
      />
      <AreaField
        label={words.intro}
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
        words={words.list}
        reorderable
        items={block.items}
        onChange={setItems}
        create={() => ({ name: '' })}
        empty={emptyNote(words.list, source)}
        badge={sourceBadge(source, m)}
        renderItem={(item, update) => (
          <>
            <TextField
              label={fields.name}
              value={item.name}
              onChange={(name) => update({ name })}
            />
            <TextField
              label={words.secondLine}
              placeholder={words.secondLinePlaceholder}
              value={item.detail ?? ''}
              onChange={(detail) => update({ detail })}
            />
            <TextField
              label={fields.linkOptional}
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
  const m = useEditorMessages();
  const { fields } = m;
  const words = m.blocks.post_list;
  const { patch } = blockEditor(block, onChange);
  const setItems = (items: PostItem[]) =>
    patch({ items: items.map((item) => compact(item, ['kicker'])) });
  const help = words.help(LIMITS.posts);

  return (
    <EditorFields readOnly={readOnly}>
      <TextField
        label={fields.heading}
        value={block.heading}
        onChange={(heading) => patch({ heading })}
      />
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
        words={words.list}
        reorderable
        items={block.items}
        onChange={setItems}
        max={LIMITS.posts}
        create={() => ({ title: '', excerpt: '', url: '' })}
        limitHint={words.list.limit(LIMITS.posts)}
        empty={emptyNote(words.list, source)}
        hint={source ? undefined : help}
        badge={sourceBadge(source, m)}
        renderItem={(item, update) => (
          <>
            <TextField
              label={words.kicker}
              placeholder={words.kickerPlaceholder}
              value={item.kicker ?? ''}
              onChange={(kicker) => update({ kicker })}
            />
            <TextField
              label={fields.title}
              value={item.title}
              onChange={(title) => update({ title })}
            />
            <AreaField
              label={words.excerpt}
              rows={2}
              value={item.excerpt}
              onChange={(excerpt) => update({ excerpt })}
            />
            <TextField
              label={fields.link}
              placeholder={words.linkPlaceholder}
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
  const m = useEditorMessages();
  const { fields } = m;
  const words = m.blocks.dated_list;
  const { patch } = blockEditor(block, onChange);
  const setItems = (items: DatedItem[]) =>
    patch({ items: items.map((item) => compact(item, ['sortDate'])) });

  return (
    <EditorFields readOnly={readOnly}>
      <FieldPair>
        <TextField
          label={fields.heading}
          value={block.heading}
          onChange={(heading) => patch({ heading })}
        />
        <TextField
          label={fields.subheading}
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
        words={words.list}
        reorderable
        items={block.items}
        onChange={setItems}
        create={() => ({ date: '', text: '' })}
        empty={emptyNote(words.list, source)}
        hint={words.hint}
        badge={sourceBadge(source, m)}
        renderItem={(item, update) => (
          <>
            <FieldPair>
              <TextField
                label={fields.date}
                placeholder={words.datePlaceholder}
                value={item.date}
                onChange={(date) => update({ date })}
              />
              <TextField
                label={words.sortDate}
                type="date"
                value={item.sortDate ?? ''}
                onChange={(sortDate) => update({ sortDate })}
              />
            </FieldPair>
            <TextField
              label={words.happening}
              placeholder={words.happeningPlaceholder}
              value={item.text}
              onChange={(text) => update({ text })}
            />
          </>
        )}
      />
    </EditorFields>
  );
}
