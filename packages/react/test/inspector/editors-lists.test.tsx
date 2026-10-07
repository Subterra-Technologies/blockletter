import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { LIMITS, type DataSource } from '@subterra-technologies/blockletter';
import {
  DatedListEditor,
  EventTilesEditor,
  NameListEditor,
  PostListEditor,
  SponsorsEditor,
} from '../../src/inspector/editors';
import { renderEditor } from '../helpers/editor-registry';
import { TEST_SOURCES, testBlock } from '../helpers/fixtures';

const EVENTS = [
  { ref: 'e1', title: 'Author reading night', date: '2026-11-05', time: '7:00 PM' },
  { ref: 'e2', title: 'Poetry swap', date: '2026-11-19' },
];

describe('EventTilesEditor', () => {
  it('lists its events as rows, with no picker when the host has no source for it', () => {
    renderEditor(EventTilesEditor, testBlock('event_tiles', { items: EVENTS }));
    expect(screen.getByLabelText('Heading')).toHaveValue('Upcoming events');
    expect(screen.queryByText(/^Pick from/)).toBeNull();
    const rows = within(screen.getByRole('list', { name: 'Events' })).getAllByRole('listitem');
    expect(rows).toHaveLength(2);
    expect(within(rows[0] as HTMLElement).getByLabelText('Title')).toHaveValue(
      'Author reading night',
    );
    const date = within(rows[0] as HTMLElement).getByLabelText('Date');
    expect(date).toHaveAttribute('type', 'date');
    expect(date).toHaveValue('2026-11-05');
    expect(screen.getByText('Up to 4 events become the big date tiles.')).toBeInTheDocument();
  });

  it('shows the empty sentence, and adds an event by hand', async () => {
    const { latest } = renderEditor(EventTilesEditor, testBlock('event_tiles'));
    expect(screen.getByText('No events yet.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Add event' }));
    expect(latest().items).toEqual([{ title: '', date: '' }]);
    expect(screen.getByLabelText('Title')).toHaveFocus();
  });

  it('edits one event, leaving blank optional fields off it', async () => {
    const { latest } = renderEditor(EventTilesEditor, testBlock('event_tiles', { items: EVENTS }));
    const second = within(screen.getByRole('list', { name: 'Events' })).getAllByRole(
      'listitem',
    )[1] as HTMLElement;
    await userEvent.type(within(second).getByLabelText('Location (optional)'), 'Back room');
    expect(latest().items).toEqual([EVENTS[0], { ...EVENTS[1], location: 'Back room' }]);
    await userEvent.clear(within(second).getByLabelText('Location (optional)'));
    expect(latest().items[1]).toEqual(EVENTS[1]);
  });

  it('stops adding at four events, and says why', () => {
    const four = Array.from({ length: LIMITS.eventTiles }, (_, index) => ({
      title: `Event ${index}`,
      date: '2026-11-01',
    }));
    renderEditor(EventTilesEditor, testBlock('event_tiles', { items: four }));
    const add = screen.getByRole('button', { name: 'Add event' });
    expect(add).toBeDisabled();
    expect(add).toHaveAccessibleDescription('Event tiles show up to 4 events.');
  });

  it('reorders events with Move up and Move down, keeping focus on the moved row', async () => {
    const user = userEvent.setup();
    const { latest } = renderEditor(EventTilesEditor, testBlock('event_tiles', { items: EVENTS }));
    await user.click(screen.getByRole('button', { name: 'Move event 2 up' }));
    expect(latest().items.map((item) => item.title)).toEqual([
      'Poetry swap',
      'Author reading night',
    ]);
    // At the top, Move up is disabled; focus goes to the same row's Move down.
    expect(screen.getByRole('button', { name: 'Move event 1 up' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move event 1 down' })).toHaveFocus();
    expect(screen.getByText('Event moved to position 1 of 2.')).toBeInTheDocument();

    await user.keyboard('{Enter}');
    expect(latest().items.map((item) => item.title)).toEqual([
      'Author reading night',
      'Poetry swap',
    ]);
    expect(screen.getByRole('button', { name: 'Move event 2 up' })).toHaveFocus();
  });

  it('labels a row the source supplied, since a refresh replaces it', () => {
    renderEditor(
      EventTilesEditor,
      testBlock('event_tiles', {
        source: 'events',
        items: [...EVENTS, { title: 'Bake sale', date: '2026-11-21' }],
      }),
      { context: { sources: [TEST_SOURCES.events] } },
    );
    const rows = within(screen.getByRole('list', { name: 'Events' })).getAllByRole('listitem');
    expect(within(rows[0] as HTMLElement).getByText('From Club events')).toBeInTheDocument();
    expect(within(rows[2] as HTMLElement).queryByText('From Club events')).toBeNull();
  });

  it('offers the source’s events to pick, up to four', async () => {
    const { latest } = renderEditor(
      EventTilesEditor,
      testBlock('event_tiles', { source: 'events', items: [] }),
      { context: { sources: [TEST_SOURCES.events] } },
    );
    expect(await screen.findByText('Pick from Club events (0/4)')).toBeInTheDocument();
    expect(
      screen.getByRole('checkbox', { name: 'Author reading night' }),
    ).toHaveAccessibleDescription('Nov. 5 · 7:00 PM');
    await userEvent.click(screen.getByRole('checkbox', { name: 'Poetry swap' }));
    expect(latest().items).toEqual([{ ref: 'e2', title: 'Poetry swap', date: '2026-11-19' }]);
    expect(screen.getByText('Pick from Club events (1/4)')).toBeInTheDocument();
  });
});

describe('rows and picks together', () => {
  it('leaves every other row in place when an item is picked or unpicked', async () => {
    const { latest } = renderEditor(
      NameListEditor,
      testBlock('name_list', { source: 'new_members', items: [{ name: 'Guest reader' }] }),
      { context: { sources: [TEST_SOURCES.members] } },
    );
    const guestRow = screen.getByDisplayValue('Guest reader').closest('li') as HTMLElement;
    // Picked ahead of the hand-written row, as a refresh would place it.
    await userEvent.click(await screen.findByRole('checkbox', { name: 'Ken Ito' }));
    expect(latest().items.map((item) => item.name)).toEqual(['Ken Ito', 'Guest reader']);
    const kenRow = screen.getByDisplayValue('Ken Ito').closest('li') as HTMLElement;
    await userEvent.click(screen.getByRole('checkbox', { name: 'Rosa Delgado' }));
    // The same elements, not new ones: nothing in them was thrown away and rebuilt.
    expect(screen.getByDisplayValue('Guest reader').closest('li')).toBe(guestRow);
    expect(screen.getByDisplayValue('Ken Ito').closest('li')).toBe(kenRow);
    await userEvent.click(screen.getByRole('checkbox', { name: 'Ken Ito' }));
    expect(screen.getByDisplayValue('Guest reader').closest('li')).toBe(guestRow);
  });
});

describe('SponsorsEditor', () => {
  const sponsors = testBlock('sponsors');

  it('shows the empty sentence when no sponsors have been added', () => {
    renderEditor(SponsorsEditor, sponsors);
    expect(screen.getByLabelText('Heading')).toHaveValue('Thank you to our sponsors');
    expect(screen.getByText('No sponsors yet.')).toBeInTheDocument();
  });

  it('points at the picker in the empty sentence when a source can fill it', async () => {
    const source: DataSource<'sponsors'> = {
      id: 'sponsors',
      label: 'Season sponsors',
      blockType: 'sponsors',
      items: () => [],
    };
    renderEditor(SponsorsEditor, testBlock('sponsors', { source: 'sponsors' }), {
      context: { sources: [source] },
    });
    expect(
      screen.getByText('No sponsors yet. Pick from Season sponsors above, or add one by hand.'),
    ).toBeInTheDocument();
    expect(await screen.findByText('Nothing from Season sponsors yet.')).toBeInTheDocument();
  });

  it('adds a sponsor row with the default thank-you message', async () => {
    const { latest } = renderEditor(SponsorsEditor, sponsors);
    await userEvent.click(screen.getByRole('button', { name: 'Add sponsor' }));
    expect(latest().items).toEqual([{ name: '', message: 'Thank you for sponsoring!' }]);
  });

  it('shows a row with its name, link, message and logo', () => {
    renderEditor(SponsorsEditor, {
      ...sponsors,
      items: [
        {
          name: 'Fairview Print Shop',
          message: 'Thanks!',
          logo: { url: 'https://files.example/print-shop.png' },
        },
      ],
    });
    expect(screen.getByText('Sponsor 1')).toBeInTheDocument();
    expect(screen.getByLabelText('Sponsor name')).toHaveValue('Fairview Print Shop');
    expect(screen.getByLabelText('Thank-you message')).toHaveValue('Thanks!');
    const logo = screen.getByRole('group', { name: 'Logo' });
    expect(within(logo).getByLabelText(/Image URL/)).toHaveValue(
      'https://files.example/print-shop.png',
    );
  });

  it('removes a row, and moves focus to the one that took its place', async () => {
    const { latest } = renderEditor(SponsorsEditor, {
      ...sponsors,
      items: [
        { name: 'One', message: 'a' },
        { name: 'Two', message: 'b' },
      ],
    });
    await userEvent.click(screen.getByRole('button', { name: 'Remove sponsor 1' }));
    expect(latest().items.map((item) => item.name)).toEqual(['Two']);
    expect(screen.getByText('Sponsor 1')).toHaveFocus();
    expect(screen.getByText('Sponsor 1 removed.')).toBeInTheDocument();
  });

  it('moves focus to Add once the last row is removed', async () => {
    renderEditor(SponsorsEditor, { ...sponsors, items: [{ name: 'One', message: 'a' }] });
    await userEvent.click(screen.getByRole('button', { name: 'Remove sponsor 1' }));
    expect(screen.getByRole('button', { name: 'Add sponsor' })).toHaveFocus();
  });

  it('moves a row’s fields with it, not just its values', async () => {
    const user = userEvent.setup();
    renderEditor(SponsorsEditor, {
      ...sponsors,
      items: [
        { name: 'One', message: 'a' },
        { name: 'Two', message: 'b' },
      ],
    });
    // A half-typed logo address belongs to its sponsor, wherever that sponsor goes.
    const second = screen.getAllByRole('group', { name: 'Logo' })[1] as HTMLElement;
    await user.type(within(second).getByLabelText(/Image URL/), 'https://logos.example/tw');
    await user.click(screen.getByRole('button', { name: 'Move sponsor 2 up' }));
    const [first] = screen.getAllByRole('group', { name: 'Logo' });
    expect(within(first as HTMLElement).getByLabelText(/Image URL/)).toHaveValue(
      'https://logos.example/tw',
    );
    expect(screen.getAllByLabelText('Sponsor name')[0]).toHaveValue('Two');
  });
});

describe('NameListEditor', () => {
  it('shows the heading, intro and each name as a row', () => {
    renderEditor(
      NameListEditor,
      testBlock('name_list', { items: [{ name: 'Rosa Delgado', detail: 'Joined Nov. 2' }] }),
    );
    expect(screen.getByLabelText('Heading')).toHaveValue('Welcome, new members!');
    expect(screen.getByLabelText('Intro')).toHaveValue(
      'Please join us in welcoming the newest members of our community.',
    );
    expect(screen.getByLabelText('Name')).toHaveValue('Rosa Delgado');
    expect(screen.getByLabelText('Second line (optional)')).toHaveValue('Joined Nov. 2');
  });

  it('picks from the source with no cap, keeping names written by hand', async () => {
    const { latest } = renderEditor(
      NameListEditor,
      testBlock('name_list', { source: 'new_members', items: [{ name: 'Guest reader' }] }),
      { context: { sources: [TEST_SOURCES.members] } },
    );
    await userEvent.click(await screen.findByRole('checkbox', { name: 'Ken Ito' }));
    await userEvent.click(screen.getByRole('checkbox', { name: 'Rosa Delgado' }));
    expect(latest().items).toEqual([
      { ref: 'm1', name: 'Rosa Delgado', detail: 'Joined Nov. 2' },
      { ref: 'm2', name: 'Ken Ito', detail: 'Joined Nov. 9' },
      { name: 'Guest reader' },
    ]);
    expect(screen.getByText('Pick from New members (3)')).toBeInTheDocument();
  });
});

describe('PostListEditor', () => {
  it('shows each post with its label, title, summary and link', () => {
    renderEditor(
      PostListEditor,
      testBlock('post_list', {
        items: [
          { kicker: 'Lists', title: 'Winter reading', excerpt: 'Twelve books.', url: '/blog/w' },
        ],
      }),
    );
    expect(screen.getByLabelText('Label (optional)')).toHaveValue('Lists');
    expect(screen.getByLabelText('Title')).toHaveValue('Winter reading');
    expect(screen.getByLabelText('Summary')).toHaveValue('Twelve books.');
    expect(screen.getByLabelText('Link')).toHaveValue('/blog/w');
    expect(screen.getByText('Up to 3 posts, each with its title and summary.')).toBeInTheDocument();
  });

  it('stops adding at three posts', async () => {
    renderEditor(PostListEditor, testBlock('post_list'));
    const add = screen.getByRole('button', { name: 'Add post' });
    await userEvent.click(add);
    await userEvent.click(add);
    await userEvent.click(add);
    expect(add).toBeDisabled();
    expect(add).toHaveAccessibleDescription('A post list shows up to 3 posts.');
  });
});

describe('DatedListEditor', () => {
  it('shows the heading pair, the empty sentence and how lines render', () => {
    renderEditor(DatedListEditor, testBlock('dated_list'));
    expect(screen.getByLabelText('Heading')).toHaveValue('Around the community');
    expect(screen.getByLabelText('Subheading')).toHaveValue('Coming up');
    expect(screen.getByText('No lines yet.')).toBeInTheDocument();
    expect(
      screen.getByText(/Lines render as “Sept\. 5 · Farmers market \| Town square”\./),
    ).toBeInTheDocument();
  });

  it('adds a line and edits its date, text and sort date', async () => {
    const { latest } = renderEditor(DatedListEditor, testBlock('dated_list'));
    await userEvent.click(screen.getByRole('button', { name: 'Add line' }));
    await userEvent.type(screen.getByLabelText('Date'), 'Nov. 8');
    await userEvent.type(screen.getByLabelText('What’s happening'), 'Used book sale');
    const sortDate = screen.getByLabelText('Sort date (optional)');
    expect(sortDate).toHaveAttribute('type', 'date');
    await userEvent.type(sortDate, '2026-11-08');
    expect(latest().items).toEqual([
      { date: 'Nov. 8', text: 'Used book sale', sortDate: '2026-11-08' },
    ]);
  });

  it('puts a picked line in date order, as a refresh would', async () => {
    const calendar: DataSource<'dated_list'> = {
      id: 'calendar',
      label: 'Town calendar',
      blockType: 'dated_list',
      items: () => [{ ref: 'c1', date: 'Nov. 3', text: 'Craft fair', sortDate: '2026-11-03' }],
    };
    const { latest } = renderEditor(
      DatedListEditor,
      testBlock('dated_list', {
        source: 'calendar',
        items: [{ date: 'Nov. 8', text: 'Used book sale', sortDate: '2026-11-08' }],
      }),
      { context: { sources: [calendar] } },
    );
    await userEvent.click(await screen.findByRole('checkbox', { name: 'Craft fair' }));
    expect(latest().items.map((item) => item.text)).toEqual(['Craft fair', 'Used book sale']);
  });
});
