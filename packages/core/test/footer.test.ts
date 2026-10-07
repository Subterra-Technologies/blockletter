import { describe, expect, it } from 'vitest';
import {
  DEFAULT_BRAND,
  createDocument,
  renderEmail,
  type BrandKit,
  type BuiltInBlock,
  type RenderOptions,
} from '../src';
import { block, occurrences } from './helpers';

const brand: BrandKit = {
  ...DEFAULT_BRAND,
  name: 'Riverside Choir',
  contact: {
    address: '4 Brand Way, Springfield',
    phone: '(555) 010-0144',
    email: 'hello@riverside.example',
    website: 'https://www.riverside.example/',
  },
  social: [
    { network: 'facebook', url: 'https://facebook.example/riverside' },
    { network: 'instagram', url: 'https://instagram.example/riverside' },
  ],
};

const renderFooter = (footer: BuiltInBlock, options: RenderOptions = {}) =>
  renderEmail(createDocument({ subject: 'S', blocks: [footer] }), { brand, ...options });

describe('footer contact details', () => {
  it('falls back to the brand kit for blank fields and an empty social list', () => {
    const { html, text } = renderFooter(block('footer', 'f'));
    expect(html).toContain('4 Brand Way, Springfield');
    expect(html).toContain('(555) 010-0144');
    expect(html).toContain('href="mailto:hello@riverside.example"');
    expect(html).toContain('>Facebook</a>');
    expect(html).toContain('>Instagram</a>');
    expect(text).toContain('(555) 010-0144 · hello@riverside.example');
    expect(text).toContain('Facebook: https://facebook.example/riverside');
  });

  it("keeps the block's own values over the brand kit's", () => {
    const { html } = renderFooter(
      block('footer', 'f', {
        address: '1 Own Street',
        phone: '(555) 010-0101',
        email: 'own@riverside.example',
        social: [{ network: 'youtube', url: 'https://video.example/riverside' }],
      }),
    );
    expect(html).toContain('1 Own Street');
    expect(html).not.toContain('4 Brand Way');
    expect(html).toContain('own@riverside.example');
    expect(html).toContain('>YouTube</a>');
    expect(html).not.toContain('>Facebook</a>');
  });

  it("opens with the brand kit's name, never anyone else's", () => {
    const { html, text } = renderFooter(block('footer', 'f'));
    expect(html).toMatch(/<p style="margin:0 0 6px 0;[^"]*">Riverside Choir<\/p>/);
    expect(text).toContain('RIVERSIDE CHOIR');
    const unnamed = renderFooter(block('footer', 'f'), { brand: { ...brand, name: '' } });
    expect(unnamed.html).not.toContain('Riverside Choir');
  });

  it('labels social links by network, and a website link by its host', () => {
    const { html } = renderFooter(
      block('footer', 'f', {
        social: [
          { network: 'facebook', url: 'https://social.example/a' },
          { network: 'instagram', url: 'https://social.example/b' },
          { network: 'linkedin', url: 'https://social.example/c' },
          { network: 'x', url: 'https://social.example/d' },
          { network: 'youtube', url: 'https://social.example/e' },
          { network: 'tiktok', url: 'https://social.example/f' },
          { network: 'github', url: 'https://social.example/g' },
          { network: 'website', url: 'https://www.choir-friends.example/about' },
        ],
      }),
    );
    for (const label of ['Facebook', 'Instagram', 'LinkedIn', 'X', 'YouTube', 'TikTok', 'GitHub']) {
      expect(html).toContain(`>${label}</a>`);
    }
    expect(html).toContain('>choir-friends.example</a>');
  });

  it('leaves out contact lines that have nothing in them', () => {
    const { html } = renderFooter(block('footer', 'f'), {
      brand: { ...DEFAULT_BRAND, name: 'Riverside Choir' },
    });
    expect(html).not.toContain('mailto:');
    expect(occurrences(html, /<p style="margin:0;font-family/g)).toBe(1); // the compliance line
  });
});

describe('the preference and unsubscribe links', () => {
  it('inserts an email service merge tag verbatim, in the HTML and the text', () => {
    const { html, text } = renderFooter(block('footer', 'f'), {
      baseUrl: 'https://riverside.example',
      unsubscribeUrl: '{{{RESEND_UNSUBSCRIBE_URL}}}',
      preferencesUrl: '*|UPDATE_PROFILE|*',
    });
    expect(html).toContain('<a href="{{{RESEND_UNSUBSCRIBE_URL}}}"');
    expect(html).toContain('<a href="*|UPDATE_PROFILE|*"');
    expect(text).toContain('Unsubscribe: {{{RESEND_UNSUBSCRIBE_URL}}}');
    expect(text).toContain('Manage preferences: *|UPDATE_PROFILE|*');
  });

  it('never resolves them as links: only attribute-escaped', () => {
    const { html, text } = renderFooter(block('footer', 'f'), {
      baseUrl: 'https://riverside.example',
      unsubscribeUrl: '/u?id=1&list="all"',
    });
    expect(html).toContain('href="/u?id=1&amp;list=&quot;all&quot;"');
    expect(html).not.toContain('https://riverside.example/u');
    expect(text).toContain('Unsubscribe: /u?id=1&list="all"');
  });

  it('appends them after the compliance text, without matching words inside it', () => {
    const { html } = renderFooter(
      block('footer', 'f', {
        complianceText: 'Manage preferences or Unsubscribe whenever you like.',
      }),
      {
        preferencesUrl: 'https://riverside.example/p',
        unsubscribeUrl: 'https://riverside.example/u',
      },
    );
    expect(html).toContain(
      'Manage preferences or Unsubscribe whenever you like. <a href="https://riverside.example/p" style="color:#e7e5e4;text-decoration:underline;">Manage preferences</a> &middot; <a href="https://riverside.example/u" style="color:#e7e5e4;text-decoration:underline;">Unsubscribe</a>',
    );
    expect(occurrences(html, /<a [^>]*>Unsubscribe<\/a>/g)).toBe(1);
  });

  it('shows only the links it was given', () => {
    const { html } = renderFooter(block('footer', 'f'), {
      unsubscribeUrl: 'https://riverside.example/u',
    });
    expect(html).toContain('>Unsubscribe</a>');
    expect(html).not.toContain('Manage preferences');
    const none = renderFooter(block('footer', 'f'));
    expect(none.html).not.toContain('Unsubscribe');
  });
});

describe('the line under the card', () => {
  const below = (options: RenderOptions, kit: BrandKit = { ...DEFAULT_BRAND }) =>
    renderEmail(createDocument({ subject: 'S', blocks: [] }), { brand: kit, ...options });
  const line = (html: string) => /<p style="margin:16px 0 0 0;[^"]*">(.*)<\/p>/.exec(html)?.[1];

  it('joins the issue, the website and the credit when all exist', () => {
    const { html, text } = below(
      {
        issueLabel: 'September 2026 issue',
        poweredBy: { label: 'Blockletter', url: 'https://blockletter.example' },
      },
      brand,
    );
    expect(line(html)).toBe(
      'September 2026 issue &middot; <a href="https://www.riverside.example/" style="color:#57534e;">www.riverside.example</a> &middot; Powered by <a href="https://blockletter.example" style="color:#57534e;">Blockletter</a>',
    );
    expect(
      text.endsWith(
        'September 2026 issue · https://www.riverside.example/ · Powered by Blockletter: https://blockletter.example',
      ),
    ).toBe(true);
  });

  it('shows each part on its own', () => {
    expect(line(below({ issueLabel: 'Spring issue' }).html)).toBe('Spring issue');
    expect(
      line(
        below(
          {},
          { ...DEFAULT_BRAND, contact: { ...DEFAULT_BRAND.contact, website: 'riverside.example' } },
        ).html,
      ),
    ).toBe('<a href="https://riverside.example" style="color:#57534e;">riverside.example</a>');
    expect(line(below({ poweredBy: { label: 'Blockletter', url: '' } }).html)).toBe(
      'Powered by Blockletter',
    );
  });

  it('is left out entirely when there is nothing to say', () => {
    const { html, text } = below({});
    expect(line(html)).toBeUndefined();
    expect(text).not.toContain('Powered by');
  });

  it('writes no site and no credit of its own', () => {
    const { html } = below({});
    expect(html).not.toMatch(/https?:\/\/(?!www\.w3\.org)/);
  });
});
