import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PALETTE,
  htmlToText,
  inlineRichTextStyles,
  isSafeLinkHref,
  plainTextToHtml,
  resolvePalette,
  sanitizeHtml,
  DEFAULT_BRAND,
} from '../src';

/** Ported from the pure part of the source's `composed.spec.ts`. */

describe('htmlToText', () => {
  it('derives readable plain text from rich text', () => {
    const html =
      '<h2>Agenda</h2><p>Hello <strong>everyone</strong>,<br>see the <a href="https://example.test/a">agenda</a>.</p><ul><li>Welcome</li><li>Budget &amp; dues</li></ul><ol><li>Vote</li><li>Adjourn</li></ol><p><br></p><p>Thanks!</p>';
    expect(htmlToText(html)).toBe(
      'Agenda\n\nHello everyone,\nsee the agenda (https://example.test/a).\n\n- Welcome\n- Budget & dues\n\n1. Vote\n2. Adjourn\n\nThanks!',
    );
  });

  it('treats an empty editor as empty text', () => {
    expect(htmlToText('<p><br></p>')).toBe('');
    expect(htmlToText('')).toBe('');
  });

  it('decodes numeric entities, and survives ones that are not characters', () => {
    expect(htmlToText('<p>&#233;t&#xE9; &#99999999;</p>')).toBe('été �');
  });
});

describe('sanitizeHtml', () => {
  it('strips scripts, event handlers and script URLs', () => {
    const dirty =
      '<p onclick="steal()">Hi</p><script>alert(1)</script><a href="javascript:evil()">x</a><img src="data:text/html;base64,AAAA">';
    const clean = sanitizeHtml(dirty);
    expect(clean).not.toContain('<script');
    expect(clean).not.toContain('onclick');
    expect(clean).not.toContain('javascript:');
    expect(clean).not.toContain('data:');
    expect(clean).toContain('<p>Hi</p>');
  });

  it('keeps links with https, http and mailto addresses, with rel="noopener" only', () => {
    const html =
      '<p>See <a href="https://example.test/a?x=1&amp;y=2" rel="noopener noreferrer" target="_blank" class="x" onclick="steal()">the agenda</a>, <a href="http://example.test">plain</a> or <a href="mailto:office@example.test">write to us</a>.</p>';
    expect(sanitizeHtml(html)).toBe(
      '<p>See <a href="https://example.test/a?x=1&amp;y=2" rel="noopener" target="_blank">the agenda</a>, <a href="http://example.test" rel="noopener" target="_blank">plain</a> or <a href="mailto:office@example.test" rel="noopener" target="_blank">write to us</a>.</p>',
    );
  });

  it('unwraps links whose address is not a web page or mail address, keeping the text', () => {
    expect(sanitizeHtml('<p><a href="javascript:evil()">x</a> <a href="#">y</a></p>')).toBe(
      '<p>x y</p>',
    );
    expect(sanitizeHtml('<p><a href="ftp://files.example.test">files</a></p>')).toBe(
      '<p>files</p>',
    );
    expect(sanitizeHtml('<p><a>no address</a></p>')).toBe('<p>no address</p>');
    expect(sanitizeHtml('<p><a href="jav&#x61;script:alert(1)">x</a></p>')).toBe('<p>x</p>');
  });

  it('does not let a removal reassemble what it removed', () => {
    const clean = sanitizeHtml('<scr<script></script>ipt>alert(1)</scr<script></script>ipt>');
    expect(clean).not.toMatch(/<script/i);
  });

  it('drops handlers however the attribute is separated, and tags writing does not use', () => {
    const clean = sanitizeHtml(
      '<img/onerror=alert(1) src=x><svg onload=alert(1)><circle/></svg><iframe src="https://x.example"></iframe><!-- note --><custom-tag>kept text</custom-tag><p style="color:red" data-x="1">Fine</p>',
    );
    expect(clean).not.toMatch(/onerror|onload|<svg|<iframe|<!--|custom-tag|data-x/i);
    expect(clean).toContain('kept text');
    expect(clean).toContain('<p style="color:red">Fine</p>');
    expect(clean).toContain('<img>');
  });

  it('keeps images with web addresses and the attributes formatting needs', () => {
    expect(
      sanitizeHtml(
        '<p class="ql-align-center"><img src="https://files.example.test/a.png" alt="A chart" width="200"></p>',
      ),
    ).toBe(
      '<p class="ql-align-center"><img src="https://files.example.test/a.png" alt="A chart" width="200"></p>',
    );
  });

  it('says which link addresses rich text may use', () => {
    expect(isSafeLinkHref(' https://example.test ')).toBe(true);
    expect(isSafeLinkHref('mailto:a@example.test')).toBe(true);
    expect(isSafeLinkHref('/relative')).toBe(false);
    expect(isSafeLinkHref('javascript:alert(1)')).toBe(false);
  });
});

describe('inlineRichTextStyles', () => {
  it('inlines alignment and indent classes and adds block defaults, keeping own styles', () => {
    const html =
      '<p class="ql-align-center">Centered</p><p class="ql-indent-2" style="color: rgb(230, 0, 0);">Red</p><span>plain</span><span class="ql-size-large">big</span>';
    const inlined = inlineRichTextStyles(html);
    expect(inlined).toContain(
      '<p style="margin:0 0 12px;line-height:1.55;text-align:center">Centered</p>',
    );
    expect(inlined).toContain(
      '<p style="margin:0 0 12px;line-height:1.55;padding-left:6em;color: rgb(230, 0, 0)">Red</p>',
    );
    expect(inlined).toContain('<span>plain</span>');
    expect(inlined).toContain('<span>big</span>');
    expect(inlined).not.toContain('class=');
  });

  it("colours links and quotes from the palette, the default brand's when none is given", () => {
    const html = '<p><a href="https://example.test">Site</a></p><blockquote>Said.</blockquote>';
    expect(inlineRichTextStyles(sanitizeHtml(html))).toContain(
      `<a href="https://example.test" rel="noopener" target="_blank" style="color:${DEFAULT_PALETTE.link};text-decoration:underline">Site</a>`,
    );
    const palette = resolvePalette({
      ...DEFAULT_BRAND,
      colors: { ...DEFAULT_BRAND.colors, ink: '#3b0764' },
    });
    const branded = inlineRichTextStyles(html, palette);
    expect(branded).toContain('style="color:#3b0764;text-decoration:underline"');
    expect(branded).toContain(
      `<blockquote style="margin:0 0 12px;padding-left:14px;border-left:4px solid ${palette.border};color:${palette.muted}">`,
    );
  });
});

describe('plainTextToHtml', () => {
  it('turns plain text into escaped paragraphs', () => {
    expect(plainTextToHtml('Hi <all>,\n\nLine one\nLine two')).toBe(
      '<p>Hi &lt;all&gt;,</p><p>Line one<br>Line two</p>',
    );
  });
});
