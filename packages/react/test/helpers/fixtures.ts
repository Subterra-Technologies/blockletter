import {
  builtInBlocks,
  createBlock,
  createDocument,
  type BrandKit,
  type BuiltInBlock,
  type BuiltInBlockType,
  type DataSource,
  type NewsletterDocument,
  type NewsletterTemplate,
} from '@subterra-technologies/blockletter';

/**
 * Shared, fictional test data for the editor. Every block type appears, with content, so a
 * test can find any block's canvas drawing or editor by its text. The `.example` domain is
 * reserved for documentation, and nothing here names a real organisation.
 */

export const TEST_BRAND: BrandKit = {
  name: 'Harbor Lane Book Club',
  colors: { ink: '#1f2937', accent: '#0f766e', highlight: '#f59e0b', page: '#f5f5f4' },
  fonts: { heading: 'Georgia', body: 'Arial' },
  contact: {
    address: '12 Harbor Lane, Fairview',
    phone: '(555) 010-0199',
    email: 'hello@bookclub.example',
    website: 'https://bookclub.example',
  },
  social: [{ network: 'instagram', url: 'https://instagram.example/bookclub' }],
};

/** A block of `type` with stable id `<type>-1` and the definition's defaults. */
export function testBlock<T extends BuiltInBlockType>(
  type: T,
  overrides: Partial<Extract<BuiltInBlock, { type: T }>> = {},
): Extract<BuiltInBlock, { type: T }> {
  return { ...createBlock(type), id: `${type}-1`, ...overrides } as Extract<
    BuiltInBlock,
    { type: T }
  >;
}

/** One of every built-in block, in palette order, with recognisable content in the lists. */
export function everyBlock(): BuiltInBlock[] {
  return builtInBlocks.map((definition) => {
    const type = definition.type as BuiltInBlockType;
    switch (type) {
      case 'event_tiles':
        return testBlock('event_tiles', {
          source: 'events',
          items: [
            { ref: 'e1', title: 'Author reading night', date: '2026-11-05', time: '7:00 PM' },
            { ref: 'e2', title: 'Poetry swap', date: '2026-11-19' },
          ],
        });
      case 'sponsors':
        return testBlock('sponsors', {
          items: [{ name: 'Fairview Print Shop', message: 'Thanks for the bookmarks.' }],
        });
      case 'name_list':
        return testBlock('name_list', {
          items: [{ name: 'Rosa Delgado', detail: 'Joined Nov. 2' }],
        });
      case 'post_list':
        return testBlock('post_list', {
          items: [
            {
              title: 'Our winter reading list',
              excerpt: 'Twelve books for long nights.',
              url: '/blog/winter-list',
              kicker: 'Lists',
            },
          ],
        });
      case 'dated_list':
        return testBlock('dated_list', {
          items: [
            { date: 'Nov. 8', text: 'Used book sale | Town library', sortDate: '2026-11-08' },
          ],
        });
      default:
        return testBlock(type);
    }
  });
}

export function testDocument(blocks: BuiltInBlock[] = everyBlock()): NewsletterDocument {
  return createDocument({
    subject: 'November at the book club',
    preheader: 'Readings, a sale, and new members',
    period: { start: '2026-11-01', end: '2026-11-30', lookaheadEnd: '2027-01-11' },
    blocks,
  });
}

export const TEST_SOURCES = {
  events: {
    id: 'events',
    label: 'Club events',
    blockType: 'event_tiles',
    items: () => [
      { ref: 'e1', title: 'Author reading night', date: '2026-11-05', time: '7:00 PM' },
      { ref: 'e2', title: 'Poetry swap', date: '2026-11-19' },
      { ref: 'e3', title: 'Holiday book exchange', date: '2026-12-10', time: '6:00 PM' },
    ],
  } satisfies DataSource<'event_tiles'>,
  members: {
    id: 'new_members',
    label: 'New members',
    blockType: 'name_list',
    items: () => [
      { ref: 'm1', name: 'Rosa Delgado', detail: 'Joined Nov. 2' },
      { ref: 'm2', name: 'Ken Ito', detail: 'Joined Nov. 9' },
    ],
  } satisfies DataSource<'name_list'>,
};

export const TEST_TEMPLATES: NewsletterTemplate[] = [
  {
    id: 'saved-1',
    name: 'Reading night announcement',
    description: 'A banner, the details, and a button.',
    subject: 'Reading night: {{monthYear}}',
    preheader: '',
    blocks: [testBlock('banner'), testBlock('button'), testBlock('footer')],
  },
];
