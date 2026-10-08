import { describe, expect, it } from 'vitest';
import { plainTextToHtml, sanitizeHtml } from '@subterra-technologies/blockletter';
import {
  hasUnsupportedFormatting,
  isTidy,
  parseRichText,
  pointToDom,
  readRichText,
  readSelection,
  renderEditable,
  richTextToHtml,
  writeSelection,
} from '../../src/rich-text/dom';
import type { RichText } from '../../src/rich-text/model';

/** HTML from anywhere, as the field stores it once read. */
const stored = (html: string): string => richTextToHtml(parseRichText(html));

/** A box of the field's own markup, in the document so it can hold a selection. */
function editable(doc: RichText): HTMLDivElement {
  const element = document.createElement('div');
  element.innerHTML = renderEditable(doc);
  document.body.replaceChildren(element);
  return element;
}

describe('reading HTML from elsewhere', () => {
  it('keeps bold, italics, links and lists, under the tags the field stores', () => {
    expect(
      stored(
        '<p>Hello <b>all</b> and <i>welcome</i>, see <a href="https://example.test/a?x=1&amp;y=2">the agenda</a>.</p><ul><li>One</li><li>Two</li></ul><ol><li>Three</li></ol>',
      ),
    ).toBe(
      '<p>Hello <strong>all</strong> and <em>welcome</em>, see <a href="https://example.test/a?x=1&amp;y=2" rel="noopener" target="_blank">the agenda</a>.</p><ul><li>One</li><li>Two</li></ul><ol><li>Three</li></ol>',
    );
  });

  it('removes what is dangerous, through sanitizeHtml, keeping the words around it', () => {
    const html = stored(
      '<p onclick="steal()">Hi <a href="javascript:alert(1)">there</a></p><script>alert(1)</script><style>p{}</style><img src="https://example.test/x.png" onerror="alert(1)"><iframe src="https://example.test"></iframe>',
    );
    expect(html).toBe('<p>Hi there</p>');
  });

  it('reduces the rest to its words: headings become bold paragraphs, tables and quotes lines', () => {
    expect(
      stored(
        '<h2>Agenda</h2><blockquote><p>Said well.</p></blockquote><table><tr><td>Cell one</td><td><u>Cell</u> <span style="color:red">two</span></td></tr></table><pre>a\nb</pre><hr><p class="ql-align-center">Centred</p>',
      ),
    ).toBe(
      '<p><strong>Agenda</strong></p><p>Said well.</p><p>Cell one</p><p>Cell two</p><p>a<br>b</p><p>Centred</p>',
    );
  });

  it('reads Google Docs’ bold from its styles, not from the <b> it wraps everything in', () => {
    expect(
      stored(
        '<meta charset="utf-8"><b style="font-weight:normal;" id="docs-internal-guid-1"><p dir="ltr"><span style="font-weight:400;">Plain and </span><span style="font-weight:700;">bold</span><span style="font-style:italic;"> slanted</span></p></b>',
      ),
    ).toBe('<p>Plain and <strong>bold</strong><em> slanted</em></p>');
  });

  it('makes a list item’s paragraphs its lines, and a nested list’s items items of their own', () => {
    expect(
      stored(
        '<ul>\n  <li><p>One</p></li>\n  <li><p>Two</p><p>more</p>\n    <ol><li>Inner</li></ol>\n  </li>\n</ul>',
      ),
    ).toBe('<ul><li>One</li><li>Two<br>more</li></ul><ol><li>Inner</li></ol>');
  });

  it('collapses spaces as a browser lays them out, and keeps the spaces that are meant', () => {
    expect(stored('<p>\n   Lots   of\n space <b> here </b>  kept  </p>')).toBe(
      '<p>Lots of space <strong>here </strong> kept</p>',
    );
  });

  it('is empty for nothing but space and empty paragraphs', () => {
    expect(stored('')).toBe('');
    expect(stored('<p><br></p><p>  </p>')).toBe('');
  });
});

describe('the HTML the field stores', () => {
  it('keeps a blank line between paragraphs, and drops them at either end and in lists', () => {
    const doc: RichText = [
      { inlines: [] },
      { inlines: [{ text: 'One' }] },
      { inlines: [] },
      { inlines: [{ text: 'Two' }, { br: true }, { br: true }] },
      { list: 'ul', inlines: [] },
      { inlines: [] },
    ];
    expect(richTextToHtml(doc)).toBe('<p>One</p><p><br></p><p>Two</p>');
  });

  it('opens each tag once for a stretch that shares it, a link outermost', () => {
    const doc: RichText = [
      {
        inlines: [
          { text: 'a', href: 'https://example.test', bold: true },
          { text: 'b', href: 'https://example.test', bold: true, italic: true },
          { br: true },
          { text: 'c', href: 'https://example.test', bold: true },
          { text: 'd' },
        ],
      },
    ];
    expect(richTextToHtml(doc)).toBe(
      '<p><a href="https://example.test" rel="noopener" target="_blank"><strong>a<em>b</em><br>c</strong></a>d</p>',
    );
  });

  it('escapes text, so markup someone typed stays words', () => {
    expect(richTextToHtml([{ inlines: [{ text: 'Use <b> & "quotes"' }] }])).toBe(
      '<p>Use &lt;b&gt; &amp; &quot;quotes&quot;</p>',
    );
  });
});

describe('the sanitise round trip', () => {
  const samples = [
    '<p>Plain.</p>',
    '<p>Hello <strong>all</strong>, <em>welcome</em> to <a href="https://example.test/a?x=1&amp;y=2">the agenda</a>.</p>',
    '<ul><li>One</li><li><strong>Two</strong><br>more</li></ul><p><br></p><ol><li>Three</li></ol>',
    '<p><a href="mailto:office@example.test"><em>Write</em> to us</a> &lt;now&gt; &amp; "soon"</p>',
    '<h1>Big</h1><table><tr><td>x</td></tr></table><img src="https://example.test/a.png">',
    '<p onclick="x()">On</p><script>alert(1)</script><a href="javascript:x()">no</a>',
    '<b style="font-weight:normal"><span style="font-weight:700">Docs</span></b>',
    plainTextToHtml('Hi <all>,\n\nLine one\nLine two'),
  ];

  it('stores HTML that sanitizeHtml leaves exactly as it is', () => {
    for (const sample of samples) {
      const html = stored(sample);
      expect(sanitizeHtml(html), sample).toBe(html);
    }
  });

  it('stores what it reads back unchanged', () => {
    for (const sample of samples) {
      const html = stored(sample);
      expect(stored(html), sample).toBe(html);
    }
  });
});

describe('plain text converted for the field', () => {
  it('reads plainTextToHtml’s paragraphs and line breaks back exactly', () => {
    const bodies = [
      'Join us Friday at nine.',
      'Hi <all>,\n\nLine one\nLine two',
      'Prices & "deals": 10% off\n\n\n\nSecond paragraph.',
      'Café, naïve, 日本語',
    ];
    for (const body of bodies) {
      const html = plainTextToHtml(body);
      expect(stored(html), body).toBe(html);
    }
  });

  it('settles spacing the email would not show anyway', () => {
    expect(stored(plainTextToHtml('  indented\nline  '))).toBe('<p>indented<br>line</p>');
  });
});

describe('the field’s own markup', () => {
  it('gives an empty paragraph, and one ending in a line break, a placeholder to stand on', () => {
    expect(renderEditable([{ inlines: [] }])).toBe('<p><br></p>');
    expect(renderEditable([{ inlines: [{ text: 'a' }, { br: true }] }])).toBe('<p>a<br><br></p>');
  });

  it('reads back as the document it was drawn from', () => {
    const doc: RichText = [
      { inlines: [] },
      { inlines: [{ text: 'a', bold: true }, { br: true }] },
      { list: 'ol', inlines: [{ text: 'b', href: 'https://example.test' }] },
      { list: 'ol', inlines: [{ text: 'c', italic: true }] },
    ];
    expect(readRichText(editable(doc), { tidy: false }).doc).toEqual(doc);
  });

  it('maps every place in the document to the DOM and back', () => {
    const doc: RichText = [
      { inlines: [{ text: 'ab' }, { text: 'cd', bold: true }, { br: true }, { text: 'e' }] },
      { inlines: [] },
      { list: 'ul', inlines: [{ text: 'f' }, { br: true }] },
    ];
    const element = editable(doc);
    const places = [
      ...[0, 1, 2, 3, 4, 5, 6].map((offset) => ({ paragraph: 0, offset })),
      { paragraph: 1, offset: 0 },
      { paragraph: 2, offset: 0 },
      { paragraph: 2, offset: 1 },
      { paragraph: 2, offset: 2 },
    ];
    for (const place of places) {
      writeSelection(element, { anchor: place, focus: place });
      expect(readSelection(element).selection?.anchor, JSON.stringify(place)).toEqual(place);
    }
  });

  it('puts a caret between two runs at the end of the first, so typing carries it on', () => {
    const element = editable([{ inlines: [{ text: 'ab', bold: true }, { text: 'cd' }] }]);
    const point = pointToDom(element, { paragraph: 0, offset: 2 });
    expect(point.node.textContent).toBe('ab');
    expect(point.offset).toBe(2);
  });

  it('reads a selection backwards as it was made', () => {
    const element = editable([{ inlines: [{ text: 'abcdef' }] }]);
    writeSelection(element, {
      anchor: { paragraph: 0, offset: 5 },
      focus: { paragraph: 0, offset: 1 },
    });
    expect(readSelection(element).selection).toEqual({
      anchor: { paragraph: 0, offset: 5 },
      focus: { paragraph: 0, offset: 1 },
    });
  });

  it('reads markup a browser left behind, and the caret in it', () => {
    // Firefox, after Select all and Delete, then typing: bare text and a <br> in the box.
    const element = document.createElement('div');
    element.innerHTML = 'x<br>';
    document.body.replaceChildren(element);
    const text = element.firstChild as Text;
    const read = readRichText(element, { tidy: false }, [{ node: text, offset: 1 }]);
    expect(read.doc).toEqual([{ inlines: [{ text: 'x' }] }]);
    expect(read.points[0]).toEqual({ paragraph: 0, offset: 1 });
    expect(isTidy(element)).toBe(false);
  });

  it('reads a newline in its text as the line break it shows as', () => {
    const element = document.createElement('div');
    element.innerHTML = '<p>one\ntwo</p>';
    document.body.replaceChildren(element);
    const text = element.querySelector('p')?.firstChild as Text;
    const read = readRichText(element, { tidy: false }, [{ node: text, offset: 5 }]);
    expect(read.doc).toEqual([{ inlines: [{ text: 'one' }, { br: true }, { text: 'two' }] }]);
    expect(read.points[0]).toEqual({ paragraph: 0, offset: 5 });
    expect(isTidy(element)).toBe(false);
  });

  it('knows its own shape from what a browser left', () => {
    const tidy = (html: string) => {
      const element = document.createElement('div');
      element.innerHTML = html;
      return isTidy(element);
    };
    expect(tidy('<p>Hello <strong>bold</strong> <a href="https://example.test">x</a></p>')).toBe(
      true,
    );
    expect(tidy('<ul><li>One</li></ul><p><br></p>')).toBe(true);
    expect(tidy('<p>Firefox keeps a trailing break<br></p>')).toBe(true);
    expect(tidy('<p><b>Chromium’s bold</b></p>')).toBe(false);
    expect(tidy('<p><span style="font-size: 15px">merged</span></p>')).toBe(false);
    expect(tidy('<div>a div</div>')).toBe(false);
    expect(tidy('<p></p>')).toBe(false);
    expect(tidy('')).toBe(false);
  });

  it('knows the shapes browsers build that markup could not say', () => {
    // Built node by node, as the editing commands do: the HTML parser would undo the nesting.
    const box = document.createElement('div');
    const paragraph = box.appendChild(document.createElement('p'));
    const list = paragraph.appendChild(document.createElement('ul'));
    list.appendChild(document.createElement('li')).textContent = 'Chromium’s list in a paragraph';
    expect(isTidy(box)).toBe(false);

    const links = document.createElement('div');
    const outer = links
      .appendChild(document.createElement('p'))
      .appendChild(document.createElement('a'));
    outer.href = 'https://example.test/old';
    const inner = outer.appendChild(document.createElement('a'));
    inner.href = 'https://example.test/new';
    inner.textContent = 'Firefox’s link in a link';
    expect(isTidy(links)).toBe(false);
    expect(readRichText(links, { tidy: false }).doc).toEqual([
      { inlines: [{ text: 'Firefox’s link in a link', href: 'https://example.test/new' }] },
    ]);
  });
});

describe('hasUnsupportedFormatting', () => {
  it('spots formatting the field cannot keep', () => {
    expect(hasUnsupportedFormatting('<h2>Agenda</h2>')).toBe(true);
    expect(hasUnsupportedFormatting('<p><img src="https://example.test/a.png"></p>')).toBe(true);
    expect(hasUnsupportedFormatting('<p style="color:red">Red</p>')).toBe(true);
    expect(hasUnsupportedFormatting('<p class="ql-align-center">Centred</p>')).toBe(true);
    expect(hasUnsupportedFormatting('<ol start="3"><li>Third</li></ol>')).toBe(true);
  });

  it('passes what the field keeps, and plain text', () => {
    expect(
      hasUnsupportedFormatting(
        '<p><b>a</b> <em>b</em> <a href="https://example.test">c</a><br></p><ul><li>d</li></ul>',
      ),
    ).toBe(false);
    expect(hasUnsupportedFormatting(plainTextToHtml('One\n\nTwo'))).toBe(false);
    expect(hasUnsupportedFormatting('')).toBe(false);
  });
});
