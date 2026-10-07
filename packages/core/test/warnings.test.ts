import { describe, expect, it } from 'vitest';
import {
  BUILT_IN_TEMPLATES,
  absoluteUrl,
  applyTemplate,
  createDocument,
  renderEmail,
  validateDocument,
  type BrandKit,
  type BuiltInBlock,
  type NewsletterDocument,
  type RenderOptions,
} from '../src';
import { PHOTO, UNSUBSCRIBE_URL, block, occurrences } from './helpers';

const send = (blocks: BuiltInBlock[], options: RenderOptions = {}, preheader = '') =>
  renderEmail(createDocument({ subject: 'S', preheader, blocks }), {
    baseUrl: 'https://example.test',
    unsubscribeUrl: UNSUBSCRIBE_URL,
    ...options,
  });

const ALT_WARNING = (label: string) =>
  `An image in a "${label}" block has no alt text; add some so screen readers can describe it.`;

describe('warnings', () => {
  it('says when there is no unsubscribe link, and only then', () => {
    expect(send([], { unsubscribeUrl: undefined }).warnings).toEqual([
      "There is no unsubscribe link: pass unsubscribeUrl (an address or your email service's merge tag) so every recipient can opt out.",
    ]);
    expect(send([]).warnings).toEqual([]);
  });

  it('notes every kind of image sent without alt text', () => {
    const logo = { url: 'https://files.example.test/logo.png' };
    const { warnings } = send([
      block('image', 'i', { image: PHOTO, alt: '' }),
      block('sponsors', 's', { items: [{ name: ' ', message: 'Thanks', logo }] }),
      block('banner', 'b', { image: PHOTO, alt: '', overlay: true }),
      block('photo_grid', 'g', {
        photos: [
          { image: PHOTO, alt: '' },
          { image: PHOTO, alt: 'Fine' },
        ],
      }),
      block('letter', 'l', { body: 'Hello.', signature: '', photo: PHOTO }),
    ]);
    expect(warnings).toEqual([
      ALT_WARNING('Image'),
      ALT_WARNING('Sponsors'),
      ALT_WARNING('Banner'),
      ALT_WARNING('Photo grid'),
      ALT_WARNING('Letter'),
    ]);
  });

  it('does not count a placeholder, or an image with a description', () => {
    const { warnings } = send([
      block('image', 'i', { alt: '' }),
      block('image', 'j', { image: PHOTO, alt: 'A quiet street' }),
      block('sponsors', 's', { items: [{ name: 'Oak and Iron', message: 'Thanks', logo: PHOTO }] }),
    ]);
    expect(warnings).toEqual([]);
  });

  it('notes relative links once when there is no base URL, and leaves them relative', () => {
    const { html, warnings } = send(
      [block('button', 'a', { url: '/events' }), block('button', 'b', { url: 'join' })],
      { baseUrl: undefined },
    );
    expect(html).toContain('href="/events"');
    expect(html).toContain('href="join"');
    expect(warnings).toEqual([
      'Some links are relative (such as "/events") and there is no baseUrl to resolve them against, so they will not work in an inbox.',
    ]);
  });

  it('says when an email is large enough for Gmail to clip', () => {
    const long = 'A sentence about the harbour that goes on for a while. '.repeat(80);
    const blocks = Array.from({ length: 30 }, (_, index) =>
      block('text', `t${index}`, { body: long }),
    );
    const { html, warnings } = send(blocks);
    expect(html.length).toBeGreaterThan(102 * 1024);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatch(
      /^Gmail clips messages larger than about 102 KB, and this one is \d+ KB/,
    );
  });

  it('never repeats a warning', () => {
    const { warnings } = send(
      [
        block('image', 'a', { image: PHOTO, alt: '' }),
        block('image', 'b', { image: PHOTO, alt: '' }),
      ],
      { baseUrl: undefined, unsubscribeUrl: undefined },
    );
    expect(new Set(warnings).size).toBe(warnings.length);
    expect(warnings).toHaveLength(2);
  });
});

describe('annotation for previews', () => {
  const blocks = () => [
    block('text', 'internal-text-7f3a', { body: 'Welcome to the society.' }),
    block('quote', 'internal-quote-9c1d', { quote: 'A fine town to do business in.' }),
  ];

  it('sends recipients nothing that only the editor uses', () => {
    const { html, text } = send(blocks());
    expect(html).toContain('Welcome to the society.');
    expect(html).not.toContain('data-block-id');
    expect(html).not.toContain('internal-text-7f3a');
    expect(text).not.toContain('internal-');
  });

  it('marks each block row with its id when asked', () => {
    const { html } = send(blocks(), { annotate: true });
    expect(html).toContain('<tr><td data-block-id="internal-text-7f3a" style="');
    expect(html).toContain('<tr><td data-block-id="internal-quote-9c1d" style="');
    expect(html).toContain('data-block-id="required-footer"');
  });

  it('keeps Outlook attributes after the annotation', () => {
    const { html } = send(
      [block('banner', 'hero', { image: PHOTO, alt: 'Crowd', overlay: true })],
      {
        annotate: true,
      },
    );
    expect(html).toContain(`<tr><td data-block-id="hero" background="${PHOTO.url}" style="`);
    expect(html).toContain(`background-image:url(&#39;${PHOTO.url}&#39;);background-size:cover;`);
  });
});

describe('the preheader', () => {
  it('always renders when there is one, hidden from view', () => {
    const { html } = send([], {}, 'What is coming up this month');
    expect(html).toMatch(
      /<span style="display:none !important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;max-height:0;max-width:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;">What is coming up this month(&nbsp;&zwnj;){40}<\/span>/,
    );
  });

  it('is left out when blank', () => {
    expect(send([], {}, '   ').html).not.toContain('mso-hide:all');
  });
});

describe('absoluteUrl', () => {
  it('resolves relative paths against the base', () => {
    expect(absoluteUrl('/events', 'https://example.test/')).toBe('https://example.test/events');
    expect(absoluteUrl('events', 'https://example.test')).toBe('https://example.test/events');
    expect(absoluteUrl('#top', 'https://example.test')).toBe('https://example.test/#top');
    expect(absoluteUrl('/a', 'example.test')).toBe('https://example.test/a');
  });

  it('leaves relative paths relative without a base, rather than inventing a host', () => {
    expect(absoluteUrl('/events', '')).toBe('/events');
    expect(absoluteUrl('/events')).toBe('/events');
    expect(absoluteUrl('/events', 'not a url')).toBe('/events');
  });

  it('keeps web, mail and phone links, and gives bare hosts https', () => {
    expect(absoluteUrl('https://x.example/a?b=1')).toBe('https://x.example/a?b=1');
    expect(absoluteUrl('mailto:hi@x.example')).toBe('mailto:hi@x.example');
    expect(absoluteUrl('tel:+15550100')).toBe('tel:+15550100');
    expect(absoluteUrl('x.example/path')).toBe('https://x.example/path');
    expect(absoluteUrl('//cdn.example/a.png')).toBe('https://cdn.example/a.png');
  });

  it('replaces unsafe schemes and blanks with the base, or a harmless #', () => {
    expect(absoluteUrl('javascript:alert(1)', 'https://example.test')).toBe('https://example.test');
    expect(absoluteUrl(' data:text/html,hi ')).toBe('#');
    expect(absoluteUrl('vbscript:x')).toBe('#');
    expect(absoluteUrl('')).toBe('#');
    expect(absoluteUrl(undefined, 'https://example.test')).toBe('https://example.test');
  });
});

describe('images', () => {
  it('reads addresses through resolveImageUrl, falling back to the stored url', () => {
    const { html } = send(
      [
        block('image', 'a', { image: { url: '', assetId: 'asset-1' }, alt: 'Resolved' }),
        block('image', 'b', { image: { url: 'https://files.example.test/b.jpg' }, alt: 'Stored' }),
      ],
      {
        resolveImageUrl: (image) =>
          image.assetId ? `https://cdn.example.test/${image.assetId}.jpg` : undefined,
      },
    );
    expect(html).toContain('src="https://cdn.example.test/asset-1.jpg"');
    expect(html).toContain('src="https://files.example.test/b.jpg"');
  });

  it('treats an address that is not http(s) or a local preview as no image at all', () => {
    const { html, warnings } = send([
      block('image', 'a', { image: { url: 'data:text/html;base64,PHNjcmlwdD4=' }, alt: 'Data' }),
      block('image', 'b', { image: { url: 'javascript:alert(1)' }, alt: 'Script' }),
      block('image', 'e', { image: { url: 'data:image/svg+xml;base64,PHN2Zz4=' }, alt: 'Svg' }),
      block('image', 'c', { image: { url: '/uploads/c.png' }, alt: 'Relative' }),
      block('banner', 'd', {
        image: { url: 'ftp://files.example.test/d.png' },
        alt: 'Ftp',
        overlay: true,
      }),
    ]);
    expect(html).not.toContain('<img');
    expect(html).not.toContain('data:');
    expect(html).not.toContain('javascript:');
    expect(html).not.toContain('background="');
    // The placeholders say what belongs there.
    expect(html).toContain('>Data</td>');
    expect(html).toContain('>Svg</td>');
    expect(html).toContain('>Relative</td>');
    expect(warnings).toEqual([]);
  });

  it('shows an upload an editor has not stored yet, and warns it cannot be sent', () => {
    const png = 'data:image/png;base64,iVBORw0KGgo=';
    const blob = 'blob:https://editor.example/0b4f6a7e-2c1d-4d5e-9f00-1a2b3c4d5e6f';
    const { html, warnings } = send([
      block('image', 'a', { image: { url: png }, alt: 'Fresh upload' }),
      block('image_text', 'b', { image: { url: blob }, alt: 'Another upload' }),
      block('banner', 'c', {
        image: { url: 'data:image/webp;base64,UklGRg==' },
        alt: 'Hero',
        overlay: true,
      }),
      block('photo_grid', 'd', {
        photos: [
          { image: { url: 'data:image/JPEG;base64,/9j/4AAQ' }, alt: 'One' },
          { image: { url: 'data:image/gif;base64,R0lGODlh' }, alt: 'Two' },
        ],
      }),
    ]);
    expect(html).toContain(`src="${png}"`);
    expect(html).toContain(`src="${blob}"`);
    expect(html).toContain('background="data:image/webp;base64,UklGRg=="');
    expect(html).toContain('src="data:image/JPEG;base64,/9j/4AAQ"');
    expect(html).toContain('src="data:image/gif;base64,R0lGODlh"');
    expect(warnings).toEqual([
      'An image is only stored in this browser (blob:/data: URL); email clients cannot load it. Upload it somewhere public before sending.',
    ]);
  });

  it('uses the brand kit logo in the header, through the same rules', () => {
    const logo = { url: 'https://files.example.test/logo.png' };
    const header = [block('header', 'h', { logoText: 'Riverside Choir' })];
    expect(send(header, { brand: brandWith(logo) }).html).toContain(
      'src="https://files.example.test/logo.png" width="240" alt="Riverside Choir"',
    );
    expect(send(header, { brand: brandWith({ url: 'http:/broken' }) }).html).not.toContain('<img');
  });
});

describe('size', () => {
  it('renders a fully populated monthly issue well under the clipping threshold', () => {
    const doc = fullMonthlyIssue();
    expect(validateDocument(doc)).toEqual([]);
    const { html, warnings } = renderEmail(doc, {
      baseUrl: 'https://example.test',
      unsubscribeUrl: UNSUBSCRIBE_URL,
      preferencesUrl: 'https://example.test/preferences',
      issueLabel: 'September 2026 issue',
      poweredBy: { label: 'Blockletter', url: 'https://blockletter.example' },
    });
    expect(warnings).toEqual([]);
    expect(html.length).toBeLessThan(60 * 1024);
    // Every block made it in.
    const annotated = renderEmail(doc, { baseUrl: 'https://example.test', annotate: true }).html;
    expect(occurrences(annotated, /data-block-id="/g)).toBe(doc.blocks.length);
  });
});

function brandWith(logo: { url: string }): BrandKit {
  return {
    name: 'Riverside Choir',
    logo,
    colors: { ink: '#1f2937', accent: '#0f766e', highlight: '#f59e0b', page: '#f5f5f4' },
    fonts: { heading: 'Georgia', body: 'Arial' },
    contact: { address: '', phone: '', email: '', website: '' },
    social: [],
  };
}

/** The monthly template with every block filled to its limits, as a busy month would. */
function fullMonthlyIssue(): NewsletterDocument {
  const template = BUILT_IN_TEMPLATES.find((candidate) => candidate.id === 'monthly-newsletter');
  if (!template) throw new Error('The monthly template is missing.');
  const doc = applyTemplate(template, {
    period: { start: '2026-09-01', end: '2026-09-30', lookaheadEnd: '2026-11-10' },
  });
  const paragraph =
    'It has been a full month: the autumn fair drew a record crowd, the library extended its hours, and forty volunteers planted trees along the river path. ';
  const blocks = doc.blocks.map((item): BuiltInBlock => {
    switch (item.type) {
      case 'letter':
        return { ...item, body: `${paragraph.repeat(3)}\n\n${paragraph.repeat(2)}`, photo: PHOTO };
      case 'event_tiles':
        return {
          ...item,
          hidden: false,
          items: Array.from({ length: 4 }, (_, index) => ({
            title: `Community event ${index + 1}`,
            date: `2026-10-${String(index * 7 + 3).padStart(2, '0')}`,
            time: '6:30 PM',
            location: 'Town hall',
            url: `/events/${index + 1}`,
            ref: `event-${index + 1}`,
          })),
        };
      case 'sponsors':
        return {
          ...item,
          hidden: false,
          items: Array.from({ length: 6 }, (_, index) => ({
            name: `Sponsor business ${index + 1}`,
            message: `Thank you to Sponsor business ${index + 1} for supporting the autumn fair!`,
            ...(index % 2 === 0 ? { logo: PHOTO } : {}),
            ref: `sponsor-${index + 1}`,
          })),
        };
      case 'name_list':
        return {
          ...item,
          hidden: false,
          items: Array.from({ length: 12 }, (_, index) => ({
            name: `New member ${index + 1}`,
            detail: 'Retail · Joined Sept. 12',
            ref: `member-${index + 1}`,
          })),
        };
      case 'post_list':
        return {
          ...item,
          hidden: false,
          items: Array.from({ length: 3 }, (_, index) => ({
            title: `News story ${index + 1}`,
            excerpt: paragraph,
            url: `/news/${index + 1}`,
            kicker: 'News',
            ref: `post-${index + 1}`,
          })),
        };
      case 'article':
        return {
          ...item,
          body: `${paragraph}\n\n${paragraph}`,
          image: PHOTO,
          linkLabel: 'Read the guide',
          linkUrl: '/guide',
        };
      case 'dated_list':
        return {
          ...item,
          items: Array.from({ length: 15 }, (_, index) => ({
            date: `Oct. ${index + 1}`,
            text: `Community happening number ${index + 1} | Market square`,
            sortDate: `2026-10-${String(index + 1).padStart(2, '0')}`,
          })),
        };
      case 'callout':
        return { ...item, ctaUrl: '/share' };
      case 'footer':
        return {
          ...item,
          address: '12 Example Road, Springfield',
          phone: '(555) 010-0100',
          email: 'hello@example.test',
          social: [
            { network: 'facebook', url: 'https://facebook.example/x' },
            { network: 'instagram', url: 'https://instagram.example/x' },
          ],
          links: [
            { label: 'Website', url: '/' },
            { label: 'Events', url: '/events' },
            { label: 'Contact', url: '/contact' },
          ],
        };
      default:
        return item;
    }
  });
  return { ...doc, blocks };
}
