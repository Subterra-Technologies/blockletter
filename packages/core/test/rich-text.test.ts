import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PALETTE,
  htmlToText,
  inlineRichTextStyles,
  isSafeLinkHref,
  plainTextToHtml,
  resolvePalette,
  resolveRichTextLinks,
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
    // An image with no address it may load is dropped rather than left as an empty frame.
    expect(clean).not.toContain('<img');
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

  it('says which paths on the host’s own site rich text may link to', () => {
    const relative = (href: string) => isSafeLinkHref(href, { relative: true });
    expect(relative('/events')).toBe(true);
    expect(relative('news/2026?page=2&amp;sort=new')).toBe(true);
    expect(relative('https://example.test')).toBe(true);
    // Nothing that could carry a scheme or leave the site.
    expect(relative('jav&#x61;script:alert(1)')).toBe(false);
    expect(relative('javascript&colon;alert(1)')).toBe(false);
    expect(relative('java\tscript:alert(1)')).toBe(false);
    expect(relative('a:b')).toBe(false);
    expect(relative('//evil.test/x')).toBe(false);
    expect(relative('/\\evil.test')).toBe(false);
    expect(relative('#top')).toBe(false);
    expect(relative('/a b')).toBe(false);
  });

  it('keeps links to the host’s own pages for the renderer to resolve', () => {
    expect(sanitizeHtml('<p><a href="/events">Events</a> <a href="//evil.test">x</a></p>')).toBe(
      '<p><a href="/events" rel="noopener" target="_blank">Events</a> x</p>',
    );
    expect(
      resolveRichTextLinks(
        sanitizeHtml('<a href="/a?b=1&amp;c=2">t</a>'),
        (href) => `https://example.test${href}`,
      ),
    ).toBe('<a href="https://example.test/a?b=1&amp;c=2" rel="noopener" target="_blank">t</a>');
  });
});

describe('sanitizeHtml against hostile input', () => {
  /** Ported from the source's hardening of its own sanitiser. */
  const hostile: Record<string, string> = {
    'a slash before the handler': '<p>Packet</p><img src="https://x.test/a.png" /onerror="x()">',
    'no separator after a quoted value':
      '<p>Agenda</p><img src="https://x.test/a.png"onerror="x()">',
    'a slash after the tag name': '<svg/onload=alert(1)>',
    'a slash on a kept tag': '<p/onclick="alert(1)">text</p>',
    'a handler after a quoted href': '<a href="https://ok.test/"onclick="alert(1)">t</a>',
    'a slash after a quoted href': '<a href="https://ok.test/"/onmouseover="alert(1)">t</a>',
    'an unquoted value': '<img src=x onerror=alert(1)>',
    'an unquoted value with a slash': '<img src=x/onerror=alert(1)>',
    'a backtick value': '<p onclick=`alert(1)`>t</p>',
    'an upper-case handler': '<P ONCLICK="alert(1)">t</P>',
    'a newline before the handler': '<img src="x"\nonerror="alert(1)">',
    'a tab before the handler': '<img\tsrc="x"\tonerror="alert(1)">',
    'a form feed before the handler': '<img\fsrc="x"\fonerror="alert(1)">',
    'a handler with no value': '<p onclick>t</p>',
    'a greater-than inside a quoted value': '<img alt=">" src="x" onerror="alert(1)">',
    'a greater-than inside an href':
      '<a href="https://ok.test/ style=\'x onmouseover=alert(1) y\'>">t</a>',
    'a quoted href carrying a style': '<a href=\'https://ok.test/" style="x\' >t</a>',
    'a style with an expression': '<p style="width:expression(alert(1))">t</p>',
    'a style with a script url': '<p style="background:url(javascript:alert(1))">t</p>',
    'a style that pins itself over the page':
      '<span style="color: red; position: fixed; top: 0; left: 0; width: 100vw">t</span>',
    'a style hidden in character references': '<p style="position&#58;fixed">t</p>',
    'a class from the page around it': '<p class="fixed inset-0 z-50">t</p>',
    'a script element': '<script>alert(1)</script>',
    'an upper-case script element': '<SCRIPT SRC=//evil.test/x.js></SCRIPT>',
    'a split script element': '<scr<script>ipt>alert(1)</scr</script>ipt>',
    'a script with a slash': '<script/src="x">alert(1)</script>',
    'frames, objects, embeds and forms':
      '<iframe src="x"></iframe><object data="x"></object><embed src="x"><form action="x"><input></form>',
    'svg and math':
      '<svg><script>alert(1)</script></svg><math><mi xlink:href="javascript:alert(1)">x</mi></math>',
    'a meta refresh and a base':
      '<meta http-equiv="refresh" content="0;url=javascript:alert(1)"><base href="https://evil.test/">',
    'an image with a script address': '<img src="javascript:alert(1)">',
    'an image with a data address': '<img src="data:text/html;base64,AAAA">',
    'a comment': '<!--><img src=x onerror=alert(1)>-->',
    'an unterminated comment': '<p>ok</p><!-- <img src=x onerror=alert(1)>',
    'an unterminated tag': '<p>ok</p><img src=x onerror=alert(1)',
    'an unterminated quote': '<p>ok</p><img src="x onerror=alert(1)>',
    'noscript and template':
      '<noscript><p title="</noscript><img src=x onerror=alert(1)>"></noscript><template><img src=x onerror=alert(1)></template>',
    'textarea and title':
      '<title><img src=x onerror=alert(1)></title><textarea><img src=x onerror=alert(1)></textarea>',
    'an unquoted href swallowing the next attribute':
      '<a href=https://ok.test/ onclick=alert(1)>t</a>',
  };

  /** Every tag in the output, with the attributes it kept. */
  const tags = (html: string) => [...html.matchAll(/<\/?([a-z0-9]+)([^>]*)>/gi)];

  it.each(Object.entries(hostile))('leaves nothing that can run or escape for %s', (_, dirty) => {
    for (const styles of ['formatting', 'email'] as const) {
      const clean = sanitizeHtml(dirty, { styles });
      for (const [, name, attributes] of tags(clean)) {
        expect(name).not.toMatch(/^(script|svg|math|iframe|object|embed|form|meta|base|input)$/i);
        expect(attributes).not.toMatch(
          /\son[a-z]+\s*=|javascript:|expression\(|position:\s*fixed/i,
        );
      }
      // Stable: cleaning the output again changes nothing, so a second pass cannot undo the first.
      expect(sanitizeHtml(clean, { styles })).toBe(clean);
      expect(inlineRichTextStyles(clean)).not.toMatch(
        /<[^>]*\son[a-z]+\s*=|javascript:|expression\(/i,
      );
    }
  });

  it('keeps only the styles formatting uses, as they were written', () => {
    expect(
      sanitizeHtml(
        '<p style="color: #c00; background-color: rgb(255, 240, 0); text-align: center; font-weight: 700; position: fixed; margin: 0 -9999px; background: url(https://x.test/a.png)">t</p>',
      ),
    ).toBe(
      '<p style="color: #c00;background-color: rgb(255, 240, 0);text-align: center;font-weight: 700">t</p>',
    );
    expect(sanitizeHtml('<p style="position:fixed">t</p>')).toBe('<p>t</p>');
  });

  it('keeps only alignment and indent classes from formatting', () => {
    expect(sanitizeHtml('<p class="ql-align-center fixed inset-0 ql-indent-2">t</p>')).toBe(
      '<p class="ql-align-center ql-indent-2">t</p>',
    );
    expect(sanitizeHtml('<p class="fixed">t</p>')).toBe('<p>t</p>');
  });

  it('keeps the layout the renderer wrote in email mode, without what can run', () => {
    const rendered =
      '<td class="bl-stack" width="50%" style="padding:0 0 12px 0;background-image:url(&#39;https://x.test/a.png?w=1&amp;h=2&#39;);font-family:Georgia, \'Times New Roman\', serif;mso-line-height-rule:exactly">x</td>';
    expect(sanitizeHtml(rendered, { styles: 'email' })).toBe(
      '<td class="bl-stack" width="50%" style="padding:0 0 12px 0;background-image:url(&#39;https://x.test/a.png?w=1&amp;h=2&#39;);font-family:Georgia, &#39;Times New Roman&#39;, serif;mso-line-height-rule:exactly">x</td>',
    );
    expect(
      sanitizeHtml(
        '<td style="padding:4px;background:url(javascript:alert(1));width:expression(alert(1));behavior:url(x.htc);position:fixed;color:re\\64">x</td>',
        { styles: 'email' },
      ),
    ).toBe('<td style="padding:4px">x</td>');
  });

  it('shows rich-text images from https addresses only, with a plain size', () => {
    expect(sanitizeHtml('<img src="http://x.test/a.png" alt="a">')).toBe('');
    expect(sanitizeHtml('<img src="//x.test/a.png" alt="a">')).toBe('');
    expect(sanitizeHtml('<img src="https://x.test/a.png" alt="a" width="200px" height="80">')).toBe(
      '<img src="https://x.test/a.png" alt="a" height="80">',
    );
    // The renderer's own images may still be http, as RenderContext.image allows.
    expect(sanitizeHtml('<img src="http://x.test/a.png" alt="a">', { styles: 'email' })).toBe(
      '<img src="http://x.test/a.png" alt="a">',
    );
  });

  it('closes a link left open and drops a closing tag with no link', () => {
    expect(sanitizeHtml('<p><a href="https://a.test">open')).toBe(
      '<p><a href="https://a.test" rel="noopener" target="_blank">open</a>',
    );
    expect(sanitizeHtml('<p>one</a> two</p>')).toBe('<p>one two</p>');
    expect(
      sanitizeHtml('<p><a href="javascript:x">one</a> and <a href="https://a.test">two</a></p>'),
    ).toBe('<p>one and <a href="https://a.test" rel="noopener" target="_blank">two</a></p>');
  });

  it('escapes every character that could end a value, so a later pass reads tags right', () => {
    const clean = sanitizeHtml('<p title="a > b \' c">t</p>');
    expect(clean).toBe('<p title="a &gt; b &#39; c">t</p>');
    expect(inlineRichTextStyles(clean)).toBe(
      '<p title="a &gt; b &#39; c" style="margin:0 0 12px;line-height:1.55">t</p>',
    );
  });

  it('keeps attribute values only in the form each attribute takes', () => {
    expect(
      sanitizeHtml(
        '<ol start="3" type="a" dir="rtl"><li>x</li></ol><table><tr><td colspan="2" align="center" width="50%">y</td><td colspan="2;x" align="middle;">z</td></tr></table>',
      ),
    ).toBe(
      '<ol start="3" type="a" dir="rtl"><li>x</li></ol><table><tr><td colspan="2" align="center" width="50%">y</td><td>z</td></tr></table>',
    );
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

  it('makes HTML the sanitiser leaves as it is', () => {
    // The rich-text field converts a plain body with this the first time it is edited.
    for (const text of ['Plain.', 'Hi <all>,\n\nLine one\nLine two', 'Fish & "chips"\n\n\nMore']) {
      const html = plainTextToHtml(text);
      expect(sanitizeHtml(html)).toBe(html);
    }
  });
});

describe('the rich-text field’s tags', () => {
  it('pass through sanitizeHtml unchanged, links written the way it writes them', () => {
    // What the editor's rich-text field stores; it relies on this to round-trip.
    const html =
      '<p>A <strong>bold</strong>, <em>slanted</em> and <a href="https://example.test/a?x=1&amp;y=2" rel="noopener" target="_blank"><strong>linked</strong></a> line<br>and another.</p><p><br></p><ul><li>One</li></ul><ol><li><a href="mailto:office@example.test" rel="noopener" target="_blank">Two</a></li></ol><p>&lt;b&gt; &amp; &quot;quotes&quot;</p>';
    expect(sanitizeHtml(html)).toBe(html);
  });
});
