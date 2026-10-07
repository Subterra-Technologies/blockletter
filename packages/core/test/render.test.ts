import { describe, expect, it } from 'vitest';
import {
  DEFAULT_BRAND,
  createDocument,
  renderEmail,
  type BrandKit,
  type BuiltInBlock,
  type RenderOptions,
} from '../src';
import { BASE_URL, PHOTO, PREFERENCES_URL, block, occurrences, render } from './helpers';

/** Ported from the source's `newsletters.spec.ts` (its pure groups), on Blockletter's shapes. */

describe('the footer the renderer guarantees', () => {
  it('renders a hidden footer visibly while preserving its custom content and input state', () => {
    const footer = block('footer', 'saved-footer', {
      hidden: true,
      address: '27 Fictional Lane',
      links: [{ label: 'Fixture resources', url: 'https://example.test/resources' }],
    });
    const { html, text } = render([footer]);

    expect(html).toContain('27 Fictional Lane');
    expect(html).toContain('Fixture resources');
    expect(html).toContain(`href="${PREFERENCES_URL}"`);
    expect(text).toContain(`Manage preferences: ${PREFERENCES_URL}`);
    expect(footer.hidden).toBe(true);
  });

  it('adds one default footer when the draft has none', () => {
    const { html, text } = render([block('text', 'body', { body: 'Keep my note.' })]);

    expect(html).toContain('Keep my note.');
    expect(occurrences(html, />Unsubscribe<\/a>/)).toBe(1);
    expect(occurrences(text, /^Unsubscribe: /m)).toBe(1);
  });

  it('keeps the last saved footer once at the end and preserves other block order', () => {
    const blocks: BuiltInBlock[] = [
      block('text', 'before', { body: 'Before the footer.' }),
      block('footer', 'duplicate-footer', { address: 'Duplicate fixture address' }),
      block('footer', 'original-footer', { address: 'Original fixture address' }),
      block('text', 'after', { body: 'After the footer.' }),
    ];
    const { html, text } = render(blocks);

    expect(html).not.toContain('Duplicate fixture address');
    expect(html).toContain('Original fixture address');
    expect(occurrences(html, />Manage preferences<\/a>/)).toBe(1);
    expect(occurrences(text, /^Manage preferences: /m)).toBe(1);
    const at = (snippet: string) => html.indexOf(snippet);
    expect(at('Before the footer.')).toBeGreaterThan(-1);
    expect(at('Before the footer.')).toBeLessThan(at('After the footer.'));
    expect(at('After the footer.')).toBeLessThan(at('Original fixture address'));
    expect(blocks.map((item) => item.id)).toEqual([
      'before',
      'duplicate-footer',
      'original-footer',
      'after',
    ]);
  });
});

describe('block appearance', () => {
  it('renders every style field', () => {
    const { html } = render([
      block('text', 'styled-text', {
        heading: 'Styled heading',
        body: 'Styled body copy.',
        style: {
          background: '#123456',
          textColor: '#fedcba',
          align: 'center',
          paddingY: 'loose',
          fontSize: 'large',
          fullWidth: true,
          divider: true,
        },
      }),
      block('quote', 'plain-quote', { quote: 'No style at all.' }),
    ]);
    expect(html).toContain('Styled heading');
    expect(html).toContain('No style at all.');
    expect(html).toContain('background:#123456');
    expect(html).toContain('#fedcba');
    expect(html).toContain('text-align:center');
    // `loose` padding top and bottom; `fullWidth` removes the side padding.
    expect(html).toContain('padding:48px 0 48px 0');
    expect(html).toContain('border-bottom:1px solid');
    // `large` scales the 20px section heading to 23px.
    expect(html).toContain('font-size:23px');
  });

  it('turns a block style into its row padding, background and alignment', () => {
    const { html } = render([
      block('text', 't', {
        body: 'Tight and wide.',
        style: { paddingY: 'tight', fullWidth: true, align: 'right' },
      }),
    ]);
    expect(html).toContain('style="padding:12px 0 12px 0;background:#ffffff;text-align:right;"');
  });

  it('ignores colours that are not six-digit hex, and alignments it does not know', () => {
    const { html } = render([
      block('text', 'bad-colour', {
        body: 'Body copy.',
        style: {
          background: 'red',
          textColor: 'javascript:alert(1)',
          align: 'expression(alert(1))',
        } as unknown as BuiltInBlock['style'],
      }),
    ]);
    expect(html).not.toContain('background:red');
    expect(html).not.toContain('javascript:alert(1)');
    expect(html).not.toContain('expression(');
  });

  it('renders the graphic and layout blocks with email-safe markup', () => {
    const { html, text } = render([
      block('image_text', 'b-image-text', {
        image: PHOTO,
        alt: 'Ribbon cutting',
        heading: 'Image beside text',
        body: 'Body beside the photo.',
        imageSide: 'right',
        linkLabel: 'Read more',
        linkUrl: '/news',
      }),
      block('columns', 'b-columns', {
        columns: [
          { heading: 'Column one', body: 'First column body.' },
          { heading: 'Column two', body: 'Second column body.', image: PHOTO, alt: 'Two' },
          { heading: 'Column three', body: 'Third column body.' },
        ],
      }),
      block('banner', 'b-banner', {
        alt: 'Festival crowd',
        heading: 'Save the date',
        subheading: 'March 2027',
        ctaLabel: 'See the details',
        ctaUrl: '/events',
        overlay: true,
      }),
      block('button', 'b-button', { label: 'Register now', url: '/events', variant: 'outline' }),
      block('divider', 'b-divider', { thickness: 'thick' }),
      block('spacer', 'b-spacer', { size: 'large' }),
      block('quote', 'b-quote', {
        quote: 'Joining opened doors for us.',
        attribution: 'Owner, a local workshop',
      }),
      block('stats', 'b-stats', {
        items: [
          { value: '148', label: 'Members' },
          { value: '12', label: 'Events' },
        ],
      }),
      block('photo_grid', 'b-photo-grid', {
        photos: [
          { image: PHOTO, alt: 'Photo one', caption: 'Ribbon cutting' },
          { alt: 'Photo two' },
        ],
      }),
    ]);
    // The two blocks without words: a thick rule and a large gap.
    expect(html).toContain('height:4px;background:');
    expect(html).toContain('height:56px');
    expect(html).toContain('Image beside text');
    expect(html).toContain('Column one');
    expect(html).toContain('Column three');
    expect(html).toContain('Save the date');
    expect(html).toContain('Register now');
    expect(html).toContain('Joining opened doors for us.');
    expect(html).toContain('>148</p>');
    expect(html).toContain('Ribbon cutting');
    expect(html).toContain('src="https://files.example.test/photo.jpg"');
    // Placeholder tiles carry the alt text when no image is set.
    expect(html).toContain('Photo two');
    // Email-safe: tables, no external stylesheets, absolute links.
    expect(html).toContain('role="presentation"');
    expect(html).not.toContain('<link');
    // One small style block, in the head, for the phone layout; everything else is inline.
    expect(occurrences(html, /<style>/g)).toBe(1);
    expect(html.indexOf('<style>')).toBeLessThan(html.indexOf('</head>'));
    expect(html).toContain('href="https://example.test/events"');
    expect(html).toContain('href="https://example.test/news"');
    expect(html).not.toMatch(/href="\//);
    expect(text).toContain('Register now: https://example.test/events');
    expect(text).toContain('148 — Members');
  });

  it('keeps hidden blocks out of both the HTML and the plain text', () => {
    const { html, text } = render([
      block('quote', 'shown', { quote: 'Visible quote.' }),
      block('quote', 'hidden-one', { quote: 'Hidden quote.', hidden: true }),
      block('stats', 'hidden-two', {
        hidden: true,
        items: [
          { value: '999', label: 'Hidden number' },
          { value: '1', label: 'Also hidden' },
        ],
      }),
    ]);
    expect(html).toContain('Visible quote.');
    expect(html).not.toContain('Hidden quote.');
    expect(html).not.toContain('Hidden number');
    expect(text).not.toContain('Hidden quote.');
    expect(text).not.toContain('Hidden number');
  });
});

describe('escaping', () => {
  const evil = '<script>alert(1)</script>';

  it('escapes markup in every block that shows text', () => {
    const { html, text } = render([
      block('header', 'e-header', { title: evil, issueLabel: evil, logoText: evil }),
      block('letter', 'e-letter', { heading: evil, body: evil, signature: evil }),
      block('text', 'e-text', { heading: evil, body: evil }),
      block('event_tiles', 'e-tiles', {
        heading: evil,
        items: [{ title: evil, date: '2026-10-03', time: evil, location: evil, url: '/x' }],
      }),
      block('name_list', 'e-names', {
        heading: evil,
        intro: evil,
        items: [{ name: evil, detail: evil }],
      }),
      block('sponsors', 'e-sponsors', { heading: evil, items: [{ name: evil, message: evil }] }),
      block('post_list', 'e-posts', {
        heading: evil,
        items: [{ title: evil, excerpt: evil, url: '/x', kicker: evil }],
      }),
      block('article', 'e-article', { kicker: evil, title: evil, body: evil }),
      block('dated_list', 'e-dated', {
        heading: evil,
        subheading: evil,
        items: [{ date: evil, text: evil }],
      }),
      block('callout', 'e-callout', { heading: evil, body: evil, ctaLabel: evil, ctaUrl: '/x' }),
      block('quote', 'e-quote', { quote: evil, attribution: evil }),
      block('banner', 'e-banner', { alt: evil, heading: evil, subheading: evil }),
      block('image_text', 'e-image-text', { alt: evil, heading: evil, body: evil }),
      block('columns', 'e-columns', { columns: [{ body: evil }, { heading: evil, body: evil }] }),
      block('button', 'e-button', { label: evil, url: '/events' }),
      block('stats', 'e-stats', {
        items: [
          { value: evil, label: evil },
          { value: '2', label: 'Two' },
        ],
      }),
      block('photo_grid', 'e-photo-grid', {
        photos: [{ alt: evil, caption: evil }, { alt: 'Two' }],
      }),
      block('image', 'e-image', { alt: evil, caption: evil }),
      block('footer', 'e-footer', { address: evil, phone: evil, complianceText: evil }),
    ]);
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('</script>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    // Plain text is not HTML: it carries the words as written.
    expect(text).toContain(evil);
  });

  it('escapes the subject in the title and the preheader', () => {
    const { html } = renderEmail(
      createDocument({ subject: '<b>Hi</b>', preheader: '"Quoted" & <em>' }),
    );
    expect(html).toContain('<title>&lt;b&gt;Hi&lt;/b&gt;</title>');
    expect(html).toContain('&quot;Quoted&quot; &amp; &lt;em&gt;');
  });
});

describe('brand kit rendering', () => {
  const brand: BrandKit = {
    name: 'Northfield Arts Society',
    logo: { url: 'https://files.example.test/brand-logo.png' },
    colors: { ink: '#101820', accent: '#8a1c3b', highlight: '#c9a227', page: '#fbf8f3' },
    fonts: { heading: 'Verdana', body: 'Trebuchet MS' },
    contact: {
      address: '9 Brand Street, Springfield',
      phone: '(555) 010-0199',
      email: 'hello@northfield.example',
      website: 'https://northfield.example',
    },
    social: [{ network: 'facebook', url: 'https://facebook.example/northfield' }],
  };

  const blocks: BuiltInBlock[] = [
    block('header', 'brand-header', { issueLabel: 'March 2027' }),
    block('event_tiles', 'brand-tiles', {
      items: [{ title: 'Members evening', date: '2027-03-18', time: '6:30 PM' }],
    }),
    block('footer', 'brand-footer'),
  ];

  it('applies brand colours, fonts, logo and footer contacts over the defaults', () => {
    const plain = render(blocks);
    const branded = render(blocks, { brand });
    // Without a brand kit the neutral default palette and name show.
    expect(plain.html).toContain(DEFAULT_BRAND.colors.page);
    expect(plain.html).toContain(DEFAULT_BRAND.colors.accent);
    expect(plain.html).toContain(DEFAULT_BRAND.name);

    expect(branded.html).toContain('#101820');
    expect(branded.html).toContain('#8a1c3b');
    expect(branded.html).toContain('#c9a227');
    expect(branded.html).toContain('#fbf8f3');
    expect(branded.html).not.toContain(DEFAULT_BRAND.colors.accent);
    expect(branded.html).toContain('Verdana');
    expect(branded.html).toContain("'Trebuchet MS'");
    // The logo image replaces the wordmark line in the header, with the name as its alt text.
    expect(branded.html).toContain(
      'src="https://files.example.test/brand-logo.png" width="240" alt="Northfield Arts Society"',
    );
    expect(branded.html).toContain('9 Brand Street, Springfield');
    expect(branded.html).toContain('hello@northfield.example');
    expect(branded.html).toContain('>Facebook</a>');
    expect(branded.html).toContain('>northfield.example</a>');
    expect(branded.text).toContain('NORTHFIELD ARTS SOCIETY');
  });
});

describe('the line under the card', () => {
  const plain = (options: RenderOptions = {}) =>
    renderEmail(createDocument({ subject: 'Moved', blocks: [] }), {
      unsubscribeUrl: 'https://example.test/u',
      ...options,
    });

  it('leaves the line out when there is nothing to put on it', () => {
    // A plain email is the same blocks without an issue behind them: no "issue", no credit.
    const { html } = plain();
    expect(html).not.toMatch(/\bissue\b/i);
    expect(html).not.toContain('Powered by');
    expect(html).not.toContain('margin:16px 0 0 0');
  });

  it('says which issue it is when asked', () => {
    expect(plain({ issueLabel: 'September 2026 issue' }).html).toContain('September 2026 issue');
  });
});

describe('a text block holding rich writing', () => {
  const rich = (body: string) =>
    renderEmail(
      createDocument({ subject: 'Note', blocks: [block('text', 'b1', { body, format: 'html' })] }),
    );

  it('keeps the formatting that was written, rather than printing the markup', () => {
    const { html } = rich('<p>Noon at the <strong>fire station</strong>.</p>');
    expect(html).toContain('<strong>fire station</strong>');
    expect(html).not.toContain('&lt;strong&gt;');
  });

  it('keeps a list a list', () => {
    // The inliner adds the margins email clients need, so the tag carries a style.
    expect(rich('<ul><li>Bring a guest</li><li>Lunch is provided</li></ul>').html).toMatch(
      /<li[^>]*>Bring a guest<\/li>/,
    );
  });

  it('still treats plain writing as paragraphs', () => {
    // No `format: 'html'`, so blank lines separate paragraphs and markup is escaped.
    const { html } = renderEmail(
      createDocument({
        subject: 'Note',
        blocks: [block('text', 'b1', { body: 'First paragraph.\n\nSecond <b>paragraph</b>.' })],
      }),
    );
    expect(html).toContain('First paragraph.</p>');
    expect(html).toContain('Second &lt;b&gt;paragraph&lt;/b&gt;.');
    expect(html).not.toContain('<p>First paragraph.\n\nSecond');
  });

  it('strips anything dangerous', () => {
    expect(rich('<p>Hello</p><script>alert(1)</script>').html).not.toContain('<script');
  });

  it('reads as plain words in the text version', () => {
    const { text } = rich('<p>Noon at the <strong>fire station</strong>.</p>');
    expect(text).toContain('Noon at the fire station.');
    expect(text).not.toContain('<strong>');
  });

  it('gives its links the palette link colour', () => {
    const { html } = rich('<p><a href="https://example.test">Site</a></p>');
    expect(html).toContain(
      `<a href="https://example.test" rel="noopener" target="_blank" style="color:${DEFAULT_BRAND.colors.ink};text-decoration:underline">Site</a>`,
    );
  });
});

describe('a header with nothing to say', () => {
  const headerWith = (title: string, issueLabel: string) =>
    renderEmail(
      createDocument({
        subject: 'x',
        blocks: [block('header', 'h', { title, issueLabel, logoText: 'Northfield Arts Society' })],
      }),
    );

  it('prints no stray separator when a message has neither title nor issue', () => {
    const { html, text } = headerWith('', '');
    expect(html).not.toMatch(/<p\b[^>]*>\s*&middot;\s*<\/p>/);
    expect(text).not.toMatch(/^\s*·\s*$/m);
  });

  it('still joins a title and an issue when both are there', () => {
    expect(headerWith('Monthly Newsletter', 'September 2026').html).toContain(
      'Monthly Newsletter &middot; September 2026',
    );
  });

  it('prints just the title when there is no issue', () => {
    const { html } = headerWith('Society news', '');
    expect(html).toContain('Society news');
    expect(html).not.toMatch(/Society news\s*&middot;/);
  });

  it("falls back to the brand kit's name when the logo text is blank", () => {
    const { html, text } = renderEmail(
      createDocument({ subject: 'x', blocks: [block('header', 'h', { logoText: '' })] }),
      { brand: { ...DEFAULT_BRAND, name: 'Riverside Choir' } },
    );
    expect(html).toContain('>Riverside Choir</p>');
    expect(text).toContain('RIVERSIDE CHOIR');
  });
});

describe('the document around the blocks', () => {
  it('writes the meta tags and table skeleton email clients rely on', () => {
    const { html } = render([]);
    expect(html.startsWith('<!DOCTYPE html>\n<html lang="en"')).toBe(true);
    expect(html).toContain('<meta name="x-apple-disable-message-reformatting">');
    expect(html).toContain('<meta name="color-scheme" content="light">');
    expect(html).toContain('<meta http-equiv="X-UA-Compatible" content="IE=edge">');
    // Fluid up to 600px, with a fixed 600px ghost table for Outlook.
    expect(html).toContain(
      '<!--[if mso]><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" align="center"><tr><td><![endif]-->\n<div style="max-width:600px;margin:0 auto;">\n<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;',
    );
  });

  it('sets the language when asked', () => {
    expect(render([], { lang: 'fr' }).html).toContain('<html lang="fr"');
  });

  it('starts the plain text with the subject and the preheader', () => {
    const { text } = render([block('text', 't', { body: 'Body.' })]);
    expect(text.startsWith('September news\n\nPreview text here\n\n')).toBe(true);
  });

  it('writes its own words in the language it is given', () => {
    const { html, text } = render(
      [
        block('post_list', 'p', {
          items: [{ title: 'Nouvelles', excerpt: 'Un extrait.', url: '/n' }],
        }),
      ],
      { labels: { readMore: 'Lire la suite', unsubscribe: 'Se désabonner' } },
    );
    expect(html).toContain('>Lire la suite</a>');
    expect(html).toContain('>Se désabonner</a>');
    expect(text).toContain(`Se désabonner: `);
    // Labels left out stay English.
    expect(html).toContain('>Manage preferences</a>');
  });

  it('uses the base URL for relative links', () => {
    const { html } = render([block('button', 'b', { url: '/join' })]);
    expect(html).toContain(`href="${BASE_URL}/join"`);
  });
});
