import {
  createBlock,
  createDocument,
  renderEmail,
  type BlockOfType,
  type BuiltInBlock,
  type BuiltInBlockType,
  type ImageRef,
  type NewsletterDocument,
  type RenderOptions,
} from '../src';

/** Fictional fixtures shared by the test files. */

export const BASE_URL = 'https://example.test';
export const PHOTO: ImageRef = { url: 'https://files.example.test/photo.jpg' };
export const UNSUBSCRIBE_URL = 'https://example.test/unsubscribe/abc';
export const PREFERENCES_URL = 'https://example.test/preferences/abc';

/** A built-in block's defaults with a predictable id, so a test can say which block it means. */
export function block<T extends BuiltInBlockType>(
  type: T,
  id: string,
  overrides: Partial<BlockOfType<BuiltInBlock, T>> = {},
): BlockOfType<BuiltInBlock, T> {
  return { ...createBlock(type), id, ...overrides } as BlockOfType<BuiltInBlock, T>;
}

export const documentOf = (
  blocks: BuiltInBlock[],
  init: Partial<NewsletterDocument> = {},
): NewsletterDocument =>
  createDocument({ subject: 'September news', preheader: 'Preview text here', blocks, ...init });

/** Renders blocks with a base URL and both opt-out links, as a host sending for real would. */
export const render = (blocks: BuiltInBlock[], options: RenderOptions = {}) =>
  renderEmail(documentOf(blocks), {
    baseUrl: BASE_URL,
    unsubscribeUrl: UNSUBSCRIBE_URL,
    preferencesUrl: PREFERENCES_URL,
    ...options,
  });

/** How many times `pattern` occurs in `text`. */
export const occurrences = (text: string, pattern: RegExp): number =>
  text.match(
    new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`),
  )?.length ?? 0;

/**
 * For every built-in type: content that makes it render, and words both the HTML and the plain
 * text must then contain (compared case-insensitively, since headings are upper-cased in text).
 */
export const SAMPLES: {
  [T in BuiltInBlockType]: { overrides: Partial<BlockOfType<BuiltInBlock, T>>; words: string[] };
} = {
  header: {
    overrides: {
      title: 'Harbour Notes',
      issueLabel: 'Autumn 2026',
      logoText: 'Northfield Arts Society',
    },
    words: ['Harbour Notes', 'Autumn 2026', 'Northfield Arts Society'],
  },
  letter: {
    overrides: {
      heading: 'A note from the editor',
      body: 'Thank you for a wonderful summer.\n\nSee you at the fair.',
      signature: 'Robin, editor',
    },
    words: ['A note from the editor', 'wonderful summer', 'See you at the fair', 'Robin, editor'],
  },
  text: {
    overrides: { heading: 'Opening hours', body: 'We open at nine on weekdays.' },
    words: ['Opening hours', 'We open at nine on weekdays.'],
  },
  event_tiles: {
    overrides: {
      heading: 'Coming up',
      items: [
        { title: 'Autumn fair', date: '2026-10-03', time: '10:00 AM', location: 'Town green' },
      ],
    },
    words: ['Coming up', 'Autumn fair', 'Oct. 3', '10:00 AM', 'Town green'],
  },
  name_list: {
    overrides: {
      heading: 'Say hello',
      items: [{ name: 'Harbor Lane Bakery', detail: 'Bakery, joined Sept. 3' }],
    },
    words: ['Say hello', 'Harbor Lane Bakery', 'Bakery, joined Sept. 3'],
  },
  sponsors: {
    overrides: {
      heading: 'With thanks',
      items: [{ name: 'Oak and Iron Works', message: 'Thank you for supporting the autumn fair!' }],
    },
    words: ['With thanks', 'Oak and Iron Works', 'supporting the autumn fair'],
  },
  post_list: {
    overrides: {
      heading: 'Latest news',
      items: [
        {
          title: 'New library hours',
          excerpt: 'The reading room now opens on Sundays.',
          url: '/news/library-hours',
          kicker: 'Announcement',
        },
      ],
    },
    words: ['Latest news', 'New library hours', 'opens on Sundays', 'Announcement'],
  },
  article: {
    overrides: {
      kicker: 'Tips',
      title: 'Three ways to save energy',
      body: 'Turn the heating down.',
    },
    words: ['Tips', 'Three ways to save energy', 'Turn the heating down.'],
  },
  dated_list: {
    overrides: {
      heading: 'Around town',
      subheading: 'Coming up',
      items: [{ date: 'Sept. 5', text: 'Farmers market at the square', sortDate: '2026-09-05' }],
    },
    words: ['Around town', 'Coming up', 'Sept. 5', 'Farmers market at the square'],
  },
  callout: {
    overrides: {
      heading: 'Have news to share?',
      body: 'Send it our way.',
      ctaLabel: 'Share your news',
      ctaUrl: '/share',
    },
    words: ['Have news to share?', 'Send it our way.', 'Share your news'],
  },
  footer: {
    overrides: {
      address: '12 Example Road, Springfield',
      complianceText: 'You joined our list at the spring fair.',
    },
    words: ['12 Example Road, Springfield', 'You joined our list at the spring fair.'],
  },
  columns: {
    overrides: {
      columns: [
        { heading: 'Volunteer', body: 'Give an hour a month.' },
        { heading: 'Donate', body: 'Every gift helps.' },
      ],
    },
    words: ['Volunteer', 'Give an hour a month.', 'Donate', 'Every gift helps.'],
  },
  image_text: {
    overrides: {
      image: PHOTO,
      alt: 'Volunteers planting trees',
      heading: 'Green streets',
      body: 'Forty new trees went in this spring.',
    },
    words: ['Volunteers planting trees', 'Green streets', 'Forty new trees'],
  },
  button: {
    overrides: { label: 'Register now', url: '/register' },
    words: ['Register now'],
  },
  divider: { overrides: { thickness: 'thick' }, words: [] },
  spacer: { overrides: { size: 'large' }, words: [] },
  banner: {
    overrides: {
      image: PHOTO,
      alt: 'The town green',
      heading: 'Save the date',
      subheading: 'October 3',
      overlay: false,
    },
    words: ['Save the date', 'October 3', 'The town green'],
  },
  image: {
    overrides: { image: PHOTO, alt: 'The harbour at dawn', caption: 'Photo by a reader' },
    words: ['The harbour at dawn', 'Photo by a reader'],
  },
  photo_grid: {
    overrides: {
      photos: [
        { image: PHOTO, alt: 'Market stalls', caption: 'Morning' },
        { alt: 'The crowd at noon' },
      ],
    },
    words: ['Market stalls', 'Morning', 'The crowd at noon'],
  },
  quote: {
    overrides: { quote: 'Volunteering here changed my year.', attribution: 'A reader' },
    words: ['Volunteering here changed my year.', 'A reader'],
  },
  stats: {
    overrides: {
      items: [
        { value: '42', label: 'Volunteers' },
        { value: '7', label: 'Parks' },
      ],
    },
    words: ['42', 'Volunteers', '7', 'Parks'],
  },
};
