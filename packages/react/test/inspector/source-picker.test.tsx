import { useState } from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
  refreshBlock,
  type DataSource,
  type IssuePeriod,
  type NameListItem,
} from '@subterra-technologies/blockletter';
import { SourcePicker, togglePick } from '../../src/inspector/source-picker';
import { renderInEditor } from '../helpers/render';
import { testBlock } from '../helpers/fixtures';

const PERIOD: IssuePeriod = { start: '2026-11-01', end: '2026-11-30', lookaheadEnd: '2027-01-11' };

const MEMBERS: NameListItem[] = [
  { ref: 'm1', name: 'Rosa Delgado', detail: 'Joined Nov. 2' },
  { ref: 'm2', name: 'Ken Ito', detail: 'Joined Nov. 9' },
  { ref: 'm3', name: 'Ada Brook', detail: 'Joined Nov. 20' },
];

const memberSource = (
  items: DataSource<'name_list'>['items'] = () => MEMBERS,
): DataSource<'name_list'> => ({
  id: 'new_members',
  label: 'New members',
  blockType: 'name_list',
  items,
});

/** A promise and the means to settle it from the test. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((settle, fail) => {
    resolve = settle;
    reject = fail;
  });
  return { promise, resolve, reject };
}

/** The picker over a controlled list, as a list editor holds it. */
function renderPicker(
  source: DataSource,
  options: { items?: NameListItem[]; limit?: number; period?: IssuePeriod | null } = {},
) {
  const onChange = vi.fn();
  function Host() {
    const [items, setItems] = useState<NameListItem[]>(options.items ?? []);
    return (
      <SourcePicker
        source={source}
        items={items}
        limit={options.limit}
        describe={(item) => ({ name: item.name, detail: item.detail ?? '' })}
        onChange={(next) => {
          onChange(next);
          setItems(next);
        }}
      />
    );
  }
  const period = options.period === null ? {} : { period: options.period ?? PERIOD };
  const view = renderInEditor(<Host />, { context: period });
  const latest = (): NameListItem[] => onChange.mock.calls.at(-1)?.[0] as NameListItem[];
  return { ...view, onChange, latest };
}

describe('SourcePicker', () => {
  it('asks the source for the issue’s period, and lists what it offers', async () => {
    const items = vi.fn(() => MEMBERS);
    renderPicker(memberSource(items));
    expect(await screen.findByRole('checkbox', { name: 'Rosa Delgado' })).toBeInTheDocument();
    expect(items).toHaveBeenCalledTimes(1);
    expect(items).toHaveBeenCalledWith({ period: PERIOD, signal: expect.any(AbortSignal) });
    expect(screen.getByText('Pick from New members (0)')).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Pick from New members (0)' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Ken Ito' })).toHaveAccessibleDescription(
      'Joined Nov. 9',
    );
  });

  it('says it is loading while the source is busy', async () => {
    const pending = deferred<NameListItem[]>();
    renderPicker(memberSource(() => pending.promise));
    expect(screen.getByRole('status')).toHaveTextContent('Loading New members…');
    pending.resolve(MEMBERS);
    expect(await screen.findByRole('checkbox', { name: 'Ada Brook' })).toBeInTheDocument();
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('checks the candidates the block already holds, by ref', async () => {
    renderPicker(memberSource(), { items: [{ ref: 'm2', name: 'Ken I.' }] });
    expect(await screen.findByRole('checkbox', { name: 'Ken Ito' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Rosa Delgado' })).not.toBeChecked();
  });

  it('copies a candidate in when checked and takes it out when unchecked', async () => {
    const { latest } = renderPicker(memberSource());
    await userEvent.click(await screen.findByRole('checkbox', { name: 'Ken Ito' }));
    expect(latest()).toEqual([{ ref: 'm2', name: 'Ken Ito', detail: 'Joined Nov. 9' }]);
    await userEvent.click(screen.getByRole('checkbox', { name: 'Ken Ito' }));
    expect(latest()).toEqual([]);
  });

  it('keeps hand-written items, and puts picks in the source’s order ahead of them', async () => {
    const guest = { name: 'Guest reader' };
    const { latest } = renderPicker(memberSource(), { items: [guest] });
    await userEvent.click(await screen.findByRole('checkbox', { name: 'Ada Brook' }));
    await userEvent.click(screen.getByRole('checkbox', { name: 'Rosa Delgado' }));
    expect(latest().map((item) => item.name)).toEqual([
      'Rosa Delgado',
      'Ada Brook',
      'Guest reader',
    ]);
    await userEvent.click(screen.getByRole('checkbox', { name: 'Ada Brook' }));
    expect(latest().map((item) => item.name)).toEqual(['Rosa Delgado', 'Guest reader']);
  });

  it('never goes past the limit: unchecked candidates are disabled at it, and it says why', async () => {
    renderPicker(memberSource(), {
      limit: 2,
      items: [{ name: 'Guest reader' }, { ref: 'm1', name: 'Rosa Delgado' }],
    });
    expect(await screen.findByText('Pick from New members (2/2)')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Rosa Delgado' })).toBeEnabled();
    const ken = screen.getByRole('checkbox', { name: 'Ken Ito' });
    expect(ken).toBeDisabled();
    expect(ken).toHaveAccessibleDescription(
      'Joined Nov. 9 That is as many as this block shows. Uncheck one to pick another.',
    );
  });

  it('shows the source’s error, and tries again when asked', async () => {
    const items = vi
      .fn<DataSource<'name_list'>['items']>()
      .mockRejectedValueOnce(new Error('The member list is offline.'))
      .mockResolvedValue(MEMBERS);
    renderPicker(memberSource(items));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('New members could not be loaded. The member list is offline.');
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('checkbox', { name: 'Rosa Delgado' })).toBeInTheDocument();
    expect(items).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('keeps a technical failure’s details to itself', async () => {
    renderPicker(
      memberSource(() => {
        throw new TypeError('Failed to fetch');
      }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /^New members could not be loaded\.Try again$/,
    );
  });

  it('says when the source has nothing for the period, or nothing at all', async () => {
    const { unmount } = renderPicker(memberSource(() => []));
    expect(
      await screen.findByText('Nothing from New members for this issue’s dates yet.'),
    ).toBeInTheDocument();
    unmount();
    renderPicker(
      memberSource(() => []),
      { period: null },
    );
    expect(await screen.findByText('Nothing from New members yet.')).toBeInTheDocument();
  });

  it('gives a candidate without a ref the one a refresh gives it, so the two agree', async () => {
    const source = memberSource(() => [{ name: 'Unreffed Member' }]);
    const { latest } = renderPicker(source);
    await userEvent.click(await screen.findByRole('checkbox', { name: 'Unreffed Member' }));
    const refreshed = await refreshBlock(testBlock('name_list'), source);
    expect(latest()).toEqual(refreshed.items);
  });

  it('does not read the source again when the host rebuilds its source objects', async () => {
    const items = vi.fn(() => MEMBERS);
    function Host() {
      const [count, setCount] = useState(0);
      // A new object every render, as an inline `sources={[…]}` makes.
      const source = memberSource(items);
      return (
        <>
          <button type="button" onClick={() => setCount(count + 1)}>
            Render again
          </button>
          <SourcePicker
            source={source}
            items={[]}
            describe={(item: NameListItem) => ({ name: item.name })}
            onChange={vi.fn()}
          />
        </>
      );
    }
    renderInEditor(<Host />, { context: { period: PERIOD } });
    await screen.findByRole('checkbox', { name: 'Rosa Delgado' });
    await userEvent.click(screen.getByRole('button', { name: 'Render again' }));
    await userEvent.click(screen.getByRole('button', { name: 'Render again' }));
    await waitFor(() => expect(items).toHaveBeenCalledTimes(1));
  });
});

describe('togglePick', () => {
  const candidates = MEMBERS;

  it('removes a candidate the items already hold', () => {
    expect(
      togglePick([MEMBERS[0] as NameListItem], MEMBERS[0] as NameListItem, candidates),
    ).toEqual([]);
  });

  it('adds nothing past the limit', () => {
    const items: NameListItem[] = [{ name: 'A' }, { name: 'B' }];
    expect(togglePick(items, MEMBERS[0] as NameListItem, candidates, 2)).toEqual(items);
  });

  it('slots an addition between picked items in the source’s order', () => {
    const items: NameListItem[] = [
      { ref: 'm1', name: 'Rosa Delgado' },
      { ref: 'm3', name: 'Ada Brook' },
      { name: 'Hand-written' },
    ];
    expect(
      togglePick(items, MEMBERS[1] as NameListItem, candidates).map((item) => item.name),
    ).toEqual(['Rosa Delgado', 'Ken Ito', 'Ada Brook', 'Hand-written']);
  });

  it('does nothing with a candidate that has no ref', () => {
    const items: NameListItem[] = [{ name: 'A' }];
    expect(togglePick(items, { name: 'B' }, [{ name: 'B' }])).toEqual(items);
  });
});
