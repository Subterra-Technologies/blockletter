import {
  addDays,
  formatShortDate,
  type BrandKit,
  type DataSource,
  type IssuePeriod,
} from '@subterra-technologies/blockletter';

/**
 * A fictional organisation whose data sources exercise every list block: upcoming events,
 * sponsors, new members, blog posts and a community calendar. The `.example` domain is reserved
 * for documentation (RFC 2606) and 555-01xx numbers for fiction.
 *
 * Each source answers "what belongs in this issue?" for the period it is given, so assembling an
 * issue for a different month gives different, believable content.
 */

export const MAKERS_GUILD_BRAND: BrandKit = {
  name: 'Cedar & Pine Makers Guild',
  colors: {
    ink: '#23302b',
    accent: '#a2482d',
    highlight: '#e3b448',
    page: '#f6f1e7',
  },
  fonts: { heading: 'Georgia', body: 'Arial' },
  contact: {
    address: '210 Workbench Lane, Fairview',
    phone: '(555) 010-0142',
    email: 'hello@makersguild.example',
    website: 'https://makersguild.example',
  },
  social: [
    { network: 'instagram', url: 'https://instagram.example/makersguild' },
    { network: 'facebook', url: 'https://facebook.example/makersguild' },
  ],
};

export const MAKERS_GUILD_SITE_URL = 'https://makersguild.example';

/** Days after the period's end treated as "coming up" when the period names no look-ahead. */
const DEFAULT_LOOKAHEAD_DAYS = 42;

const windowAfter = (period: IssuePeriod): { from: string; until: string } => ({
  from: addDays(period.end, 1),
  until: period.lookaheadEnd ?? addDays(period.end, DEFAULT_LOOKAHEAD_DAYS),
});

const EVENTS = [
  {
    ref: 'ev-woodturning',
    title: 'Intro to Woodturning',
    offset: 4,
    time: '10:00 AM',
    place: 'Main Shop',
  },
  {
    ref: 'ev-open-studio',
    title: 'Open Studio Night',
    offset: 9,
    time: '6:30 PM',
    place: 'Studio B',
  },
  {
    ref: 'ev-repair-cafe',
    title: 'Repair Café',
    offset: 15,
    time: '1:00 PM',
    place: 'Community Room',
  },
  {
    ref: 'ev-laser-safety',
    title: 'Laser Cutter Safety Class',
    offset: 20,
    time: '7:00 PM',
    place: 'Fab Lab',
  },
  {
    ref: 'ev-craft-fair',
    title: 'Winter Craft Fair',
    offset: 27,
    time: '9:00 AM',
    place: 'Town Green',
  },
] as const;

const MEMBERS = [
  { ref: 'm-okafor', name: 'Ada Okafor', craft: 'Ceramics', offset: 2 },
  { ref: 'm-lindqvist', name: 'Marcus Lindqvist', craft: 'Metalwork', offset: 6 },
  { ref: 'm-raman', name: 'Priya Raman', craft: 'Textiles', offset: 11 },
  { ref: 'm-herrera', name: 'Tomás Herrera', craft: 'Woodworking', offset: 17 },
  { ref: 'm-cho', name: 'Hannah Cho', craft: 'Electronics', offset: 23 },
] as const;

const HAPPENINGS = [
  { ref: 'c-market', text: 'Farmers market | Riverside Park', offset: 1 },
  { ref: 'c-library', text: 'Library maker hour | Fairview Library', offset: 5 },
  { ref: 'c-robotics', text: 'High school robotics demo | Fairview High', offset: 12 },
  { ref: 'c-open-mic', text: 'Open mic night | The Lantern', offset: 18 },
  { ref: 'c-quilt', text: 'Quilt show | Grange Hall', offset: 25 },
] as const;

export const MAKERS_GUILD_SOURCES = [
  {
    id: 'events',
    label: 'Guild events',
    blockType: 'event_tiles',
    items: ({ period }) => {
      if (!period) return [];
      const { from, until } = windowAfter(period);
      return EVENTS.map((event) => ({
        ref: event.ref,
        title: event.title,
        date: addDays(from, event.offset),
        time: event.time,
        location: event.place,
        url: `/events/${event.ref}`,
      })).filter((event) => event.date <= until);
    },
  } satisfies DataSource<'event_tiles'>,
  {
    id: 'sponsors',
    label: 'Guild sponsors',
    blockType: 'sponsors',
    items: () => [
      {
        ref: 'sp-northside',
        name: 'Northside Hardware',
        message: 'Thank you to Northside Hardware for stocking our tool library this season.',
        url: 'https://northside-hardware.example',
      },
      {
        ref: 'sp-lantern',
        name: 'Lantern Coffee Roasters',
        message: 'Thank you to Lantern Coffee Roasters for keeping Open Studio Night caffeinated.',
      },
      {
        ref: 'sp-ridgeway',
        name: 'Ridgeway Lumber Co.',
        message: 'Thank you to Ridgeway Lumber Co. for the hardwood in our beginner classes.',
      },
    ],
  } satisfies DataSource<'sponsors'>,
  {
    id: 'new_members',
    label: 'New members',
    blockType: 'name_list',
    items: ({ period }) => {
      if (!period) return [];
      return MEMBERS.map((member) => ({ ...member, joined: addDays(period.start, member.offset) }))
        .filter((member) => member.joined <= period.end)
        .map((member) => ({
          ref: member.ref,
          name: member.name,
          detail: `${member.craft} · Joined ${formatShortDate(member.joined)}`,
        }));
    },
  } satisfies DataSource<'name_list'>,
  {
    id: 'posts',
    label: 'Guild blog',
    blockType: 'post_list',
    items: () => [
      {
        ref: 'p-cnc',
        kicker: 'Shop news',
        title: 'Meet the new CNC router',
        excerpt:
          'It cuts plywood, acrylic and aluminium, and the first training sessions are open.',
        url: '/blog/meet-the-new-cnc-router',
      },
      {
        ref: 'p-winter-projects',
        kicker: 'How-to',
        title: 'Five beginner projects for winter',
        excerpt: 'Cutting boards, a simple stool and three more projects to finish in a weekend.',
        url: '/blog/five-beginner-projects',
      },
      {
        ref: 'p-repair-crew',
        kicker: 'Spotlight',
        title: 'Volunteer spotlight: the Repair Café crew',
        excerpt: 'Forty-two toasters, nine bicycles and one very old radio, fixed in an afternoon.',
        url: '/blog/repair-cafe-crew',
      },
    ],
  } satisfies DataSource<'post_list'>,
  {
    id: 'calendar',
    label: 'Community calendar',
    blockType: 'dated_list',
    items: ({ period }) => {
      if (!period) return [];
      const { from, until } = windowAfter(period);
      return HAPPENINGS.map((item) => ({ ...item, date: addDays(from, item.offset) }))
        .filter((item) => item.date <= until)
        .map((item) => ({
          ref: item.ref,
          date: formatShortDate(item.date),
          sortDate: item.date,
          text: item.text,
        }));
    },
  } satisfies DataSource<'dated_list'>,
] as const;
