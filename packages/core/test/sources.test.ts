import { describe, expect, it } from 'vitest';
import {
  BUILT_IN_TEMPLATES,
  assembleDocument,
  refreshBlock,
  sourceFor,
  validateDocument,
  type DataSource,
  type DataSourceContext,
  type DatedItem,
  type EventTileItem,
  type ListBlockItems,
  type ListBlockType,
  type NewsletterTemplate,
  type PostItem,
  type SponsorItem,
} from '../src';
import { block } from './helpers';

const source = <T extends ListBlockType>(
  id: string,
  blockType: T,
  items: ListBlockItems[T][],
  extra: Partial<DataSource<T>> = {},
): DataSource<T> => ({ id, label: id, blockType, items: () => items, ...extra });

const event = (n: number): EventTileItem => ({
  title: `Event ${n}`,
  date: `2026-10-${String(n).padStart(2, '0')}`,
  ref: `event-${n}`,
});
const post = (n: number): PostItem => ({
  title: `Post ${n}`,
  excerpt: '',
  url: `/p/${n}`,
  ref: `post-${n}`,
});
const titles = (items: { title: string }[]) => items.map((item) => item.title);

describe('sourceFor', () => {
  const events = source('events', 'event_tiles', []);
  const posts = source('posts', 'post_list', []);

  it('finds the source a block names, for its type', () => {
    expect(sourceFor(block('event_tiles', 'e', { source: 'events' }), [posts, events])).toBe(
      events,
    );
  });

  it('finds nothing for a manual block, an unknown source, or a source of another type', () => {
    expect(sourceFor(block('event_tiles', 'e'), [events])).toBeUndefined();
    expect(sourceFor(block('event_tiles', 'e', { source: 'nope' }), [events])).toBeUndefined();
    expect(sourceFor(block('post_list', 'p', { source: 'events' }), [events])).toBeUndefined();
  });
});

describe('refreshBlock', () => {
  it('fills event tiles with the first four, replacing everything they held', async () => {
    const tiles = block('event_tiles', 'e', {
      items: [{ title: 'Written by hand', date: '2026-10-01' }],
    });
    const refreshed = await refreshBlock(
      tiles,
      source('events', 'event_tiles', [1, 2, 3, 4, 5, 6].map(event)),
    );
    expect(titles(refreshed.items)).toEqual(['Event 1', 'Event 2', 'Event 3', 'Event 4']);
    expect(refreshed.id).toBe('e');
    expect(tiles.items).toHaveLength(1);
  });

  it("keeps a source's own limit, within the block's", async () => {
    const tiles = block('event_tiles', 'e');
    const fewer = await refreshBlock(
      tiles,
      source('events', 'event_tiles', [1, 2, 3].map(event), { limit: 2 }),
    );
    expect(fewer.items).toHaveLength(2);
    const more = await refreshBlock(
      tiles,
      source('events', 'event_tiles', [1, 2, 3, 4, 5].map(event), { limit: 9 }),
    );
    expect(more.items).toHaveLength(4);
  });

  it('replaces sourced sponsors where they stood and keeps the ones written by hand', async () => {
    const sponsors = block('sponsors', 's', {
      items: [
        { name: 'Hand first', message: '' },
        { name: 'Old sourced A', message: '', ref: 'a' },
        { name: 'Old sourced B', message: '', ref: 'b' },
        { name: 'Hand last', message: '' },
      ],
    });
    const fresh: SponsorItem[] = [
      { name: 'New one', message: 'Thanks!', ref: 'n1' },
      { name: 'New two', message: 'Thanks!', ref: 'n2' },
    ];
    const refreshed = await refreshBlock(sponsors, source('sponsors', 'sponsors', fresh));
    expect(refreshed.items.map((item) => item.name)).toEqual([
      'Hand first',
      'New one',
      'New two',
      'Hand last',
    ]);
  });

  it('puts sourced items first when there were none before', async () => {
    const names = block('name_list', 'n', { items: [{ name: 'Written by hand' }] });
    const refreshed = await refreshBlock(
      names,
      source('new_members', 'name_list', [{ name: 'Joined', ref: 'm1' }]),
    );
    expect(refreshed.items.map((item) => item.name)).toEqual(['Joined', 'Written by hand']);
  });

  it('keeps a post list to three in all, never dropping a hand-written post', async () => {
    const posts = block('post_list', 'p', {
      items: [{ title: 'Ours', excerpt: '', url: '/ours' }],
    });
    const refreshed = await refreshBlock(posts, source('posts', 'post_list', [1, 2, 3].map(post)));
    expect(titles(refreshed.items)).toEqual(['Post 1', 'Post 2', 'Ours']);
    expect(
      validateDocument({ version: 1, subject: '', preheader: '', blocks: [refreshed] }),
    ).toEqual([]);
  });

  it('gives an item without a ref one, so the next refresh replaces it', async () => {
    const posts = block('post_list', 'p');
    const refs = source('posts', 'post_list', [{ title: 'A', excerpt: '', url: '/a' }]);
    const once = await refreshBlock(posts, refs);
    expect(once.items[0]?.ref).toBe('posts:1');
    const twice = await refreshBlock(once, refs);
    expect(titles(twice.items)).toEqual(['A']);
  });

  it('adds calendar lines to the hand-written ones and orders them all by date', async () => {
    const dated = block('dated_list', 'd', {
      items: [
        { date: 'Every Saturday', text: 'Market' },
        { date: 'Oct. 20', text: 'Hand-written, dated', sortDate: '2026-10-20' },
        { date: 'Oct. 1', text: 'Stale', sortDate: '2026-10-01', ref: 'old' },
      ],
    });
    const calendar: DatedItem[] = [
      { date: 'Oct. 25', text: 'Late', sortDate: '2026-10-25', ref: 'c2' },
      { date: 'Oct. 5', text: 'Early', sortDate: '2026-10-05', ref: 'c1' },
    ];
    const refreshed = await refreshBlock(dated, source('calendar', 'dated_list', calendar));
    expect(refreshed.items.map((item) => item.text)).toEqual([
      'Early',
      'Hand-written, dated',
      'Late',
      'Market',
    ]);
  });

  it('shows a block that gains its first items', async () => {
    const empty = block('event_tiles', 'e', { hidden: true });
    expect((await refreshBlock(empty, source('events', 'event_tiles', [event(1)]))).hidden).toBe(
      false,
    );
  });

  it('leaves a block hidden that its editor hid while it had items', async () => {
    const hidden = block('event_tiles', 'e', { hidden: true, items: [event(1)] });
    expect((await refreshBlock(hidden, source('events', 'event_tiles', [event(2)]))).hidden).toBe(
      true,
    );
  });

  it('does not hide a block a refresh empties: that is for assembly to decide', async () => {
    const shown = block('event_tiles', 'e', { items: [event(1)] });
    const refreshed = await refreshBlock(shown, source('events', 'event_tiles', []));
    expect(refreshed.items).toEqual([]);
    expect(refreshed.hidden).toBe(false);
  });

  it('passes the period to the source, and waits for an async one', async () => {
    const seen: DataSourceContext[] = [];
    const async: DataSource<'event_tiles'> = {
      id: 'events',
      label: 'Events',
      blockType: 'event_tiles',
      items: async (context) => {
        seen.push(context);
        await Promise.resolve();
        return [event(3)];
      },
    };
    const period = { start: '2026-09-01', end: '2026-09-30', lookaheadEnd: '2026-11-10' };
    const refreshed = await refreshBlock(block('event_tiles', 'e'), async, { period });
    expect(titles(refreshed.items)).toEqual(['Event 3']);
    expect(seen).toEqual([{ period }]);
  });

  it('refuses a source of another block type, and a cancelled refresh', async () => {
    await expect(
      refreshBlock(block('post_list', 'p'), source('events', 'event_tiles', [])),
    ).rejects.toThrow(/fills event_tiles blocks, not post_list blocks/);
    const controller = new AbortController();
    controller.abort(new Error('Stop'));
    await expect(
      refreshBlock(block('event_tiles', 'e'), source('events', 'event_tiles', [event(1)]), {
        signal: controller.signal,
      }),
    ).rejects.toThrow('Stop');
  });
});

describe('assembleDocument', () => {
  const monthly = (): NewsletterTemplate => {
    const found = BUILT_IN_TEMPLATES.find((item) => item.id === 'monthly-newsletter');
    if (!found) throw new Error('No monthly template');
    return found;
  };
  const period = { start: '2026-09-01', end: '2026-09-30', lookaheadEnd: '2026-11-10' };

  it('fills sourced blocks from the matching sources, shows the full ones and hides the empty ones', async () => {
    const doc = await assembleDocument(monthly(), {
      period,
      sources: [
        source('events', 'event_tiles', [event(1), event(2)]),
        source('posts', 'post_list', []),
        source('calendar', 'dated_list', []),
        // Named like the template's sponsors source, but for another block type: ignored.
        source('sponsors', 'post_list', [post(9)]),
      ],
    });
    const byType = new Map(doc.blocks.map((item) => [item.type, item]));
    expect(byType.get('event_tiles')).toMatchObject({
      hidden: false,
      items: [{ title: 'Event 1' }, { title: 'Event 2' }],
    });
    expect(byType.get('post_list')).toMatchObject({ hidden: true, items: [] });
    expect(byType.get('dated_list')).toMatchObject({ hidden: true, items: [] });
    // No source for these: they stay as the template has them.
    expect(byType.get('sponsors')).toMatchObject({ hidden: true, items: [] });
    expect(byType.get('name_list')).toMatchObject({ hidden: true, items: [] });
    expect(doc.period).toEqual(period);
    expect(validateDocument(doc)).toEqual([]);
  });

  it('gives every source the period', async () => {
    const periods: unknown[] = [];
    await assembleDocument(monthly(), {
      period,
      sources: [
        {
          ...source('events', 'event_tiles', []),
          items: (context) => {
            periods.push(context.period);
            return [];
          },
        },
      ],
    });
    expect(periods).toEqual([period]);
  });
});
