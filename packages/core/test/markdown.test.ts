import { describe, expect, it } from 'vitest';
import {
  markdownToHtml,
  markdownToText,
  parseInline,
  parseMarkdown,
  sanitizeHtml,
  type InlineNode,
} from '../src';

/** The Markdown reader on its own: what it reads, and what it leaves as text. */

const text = (value: string): InlineNode => ({ kind: 'text', text: value });

describe('parseInline', () => {
  it('reads **bold** and __bold__', () => {
    expect(parseInline('a **b** c __d__')).toEqual([
      text('a '),
      { kind: 'bold', children: [text('b')] },
      text(' c '),
      { kind: 'bold', children: [text('d')] },
    ]);
  });

  it('reads *italic* and _italic_', () => {
    expect(parseInline('*a* and _b_')).toEqual([
      { kind: 'italic', children: [text('a')] },
      text(' and '),
      { kind: 'italic', children: [text('b')] },
    ]);
  });

  it('reads ~~strike~~', () => {
    expect(parseInline('was ~~$40~~ now')).toEqual([
      text('was '),
      { kind: 'strike', children: [text('$40')] },
      text(' now'),
    ]);
  });

  it('nests bold and italic, including ***both***', () => {
    expect(parseInline('**a *b* c**')).toEqual([
      {
        kind: 'bold',
        children: [text('a '), { kind: 'italic', children: [text('b')] }, text(' c')],
      },
    ]);
    expect(parseInline('***x***')).toEqual([
      { kind: 'bold', children: [{ kind: 'italic', children: [text('x')] }] },
    ]);
    expect(parseInline('*a **b** c*')).toEqual([
      {
        kind: 'italic',
        children: [text('a '), { kind: 'bold', children: [text('b')] }, text(' c')],
      },
    ]);
    expect(parseInline('_**x**_')).toEqual([
      { kind: 'italic', children: [{ kind: 'bold', children: [text('x')] }] },
    ]);
  });

  it('formats words next to punctuation', () => {
    expect(parseInline('(**a**), "*b*".')).toEqual([
      text('('),
      { kind: 'bold', children: [text('a')] },
      text('), "'),
      { kind: 'italic', children: [text('b')] },
      text('".'),
    ]);
  });

  it('reads [label](url) with formatting in the label', () => {
    expect(parseInline('see [**our** events](/events).')).toEqual([
      text('see '),
      {
        kind: 'link',
        url: '/events',
        children: [{ kind: 'bold', children: [text('our')] }, text(' events')],
      },
      text('.'),
    ]);
  });

  it('formats a whole link', () => {
    expect(parseInline('**[a](/b)**')).toEqual([
      { kind: 'bold', children: [{ kind: 'link', url: '/b', children: [text('a')] }] },
    ]);
  });

  it('keeps brackets that belong to the address, and those that close a sentence outside it', () => {
    expect(
      parseInline('see [the harbour](https://example.test/wiki/Harbour_(town)) today'),
    ).toEqual([
      text('see '),
      {
        kind: 'link',
        url: 'https://example.test/wiki/Harbour_(town)',
        children: [text('the harbour')],
      },
      text(' today'),
    ]);
    expect(parseInline('(see [map](/map))')).toEqual([
      text('(see '),
      { kind: 'link', url: '/map', children: [text('map')] },
      text(')'),
    ]);
    expect(parseInline('[bad](javascript:alert(1)) end')).toEqual([
      { kind: 'link', url: 'javascript:alert(1)', children: [text('bad')] },
      text(' end'),
    ]);
  });

  it('reads no link without a label, an address, or with a space in the address', () => {
    for (const plain of ['[](/x)', '[x]()', '[x](/a b)', '[x] (/a)', '[x\ny](/a)', '[x](/a']) {
      expect(parseInline(plain)).toEqual([text(plain)]);
    }
  });

  it('leaves sums, snake_case, file_name and loose marks alone', () => {
    for (const plain of [
      '2 * 3 * 4',
      '2*3*4',
      '2**3 and 4**2',
      'snake_case and file_name',
      'a_b_c',
      'price is 5 * 2',
      '** not bold **',
      'a lone * star',
      '~~ spaced ~~',
      '__ spaced __',
      '**** four ****',
      '~one~',
      'C:\\new\\file',
    ]) {
      expect(parseInline(plain)).toEqual([text(plain)]);
    }
  });

  it('keeps marks that never close as text', () => {
    expect(parseInline('**a *b')).toEqual([text('**a *b')]);
    expect(parseInline('a **b')).toEqual([text('a **b')]);
  });

  it('never formats across a line break', () => {
    expect(parseInline('**a\nb**')).toEqual([text('**a\nb**')]);
    expect(parseInline('*a*\n*b*')).toEqual([
      { kind: 'italic', children: [text('a')] },
      text('\n'),
      { kind: 'italic', children: [text('b')] },
    ]);
  });

  it('reads the bare pasted tags <b>, <strong>, <i>, <em>, in any case', () => {
    expect(parseInline('<b>a</b> <STRONG>b</STRONG> <i>c</i> <em>d</em>')).toEqual([
      { kind: 'bold', children: [text('a')] },
      text(' '),
      { kind: 'bold', children: [text('b')] },
      text(' '),
      { kind: 'italic', children: [text('c')] },
      text(' '),
      { kind: 'italic', children: [text('d')] },
    ]);
  });

  it('leaves every other tag, attributes and unclosed tags as text', () => {
    for (const raw of [
      '<b onclick="x">a</b>',
      '<img src=x onerror=alert(1)>',
      '<script>alert(1)</script>',
      '<a href="https://x">x</a>',
      '<b>never closed',
      '<b></b>',
      '<u>under</u>',
      '<br>',
    ]) {
      expect(parseInline(raw)).toEqual([text(raw)]);
    }
  });

  it('keeps newlines inside text', () => {
    expect(parseInline('a\nb')).toEqual([text('a\nb')]);
  });
});

describe('parseMarkdown', () => {
  it('keeps plain text as the paragraphs it always was', () => {
    expect(parseMarkdown('One\ntwo\n\n  Three  \n\n\n\nFour')).toEqual([
      { kind: 'paragraph', text: 'One\ntwo' },
      { kind: 'paragraph', text: 'Three' },
      { kind: 'paragraph', text: 'Four' },
    ]);
    expect(parseMarkdown('   \n\n')).toEqual([]);
  });

  it('keeps a line indented four spaces or more as text', () => {
    expect(parseMarkdown('Lines:\n    - not a list\n    # not a heading')).toEqual([
      { kind: 'paragraph', text: 'Lines:\n    - not a list\n    # not a heading' },
    ]);
  });

  it('reads headings, #### and deeper as small', () => {
    expect(parseMarkdown('# A\n## B\n### C\n#### D ##\n#hashtag\n####### seven')).toEqual([
      { kind: 'heading', level: 1, text: 'A' },
      { kind: 'heading', level: 2, text: 'B' },
      { kind: 'heading', level: 3, text: 'C' },
      { kind: 'heading', level: 3, text: 'D' },
      { kind: 'paragraph', text: '#hashtag\n####### seven' },
    ]);
    expect(parseMarkdown('# C#')).toEqual([{ kind: 'heading', level: 1, text: 'C#' }]);
  });

  it('reads bullet lists written with -, * or •', () => {
    expect(parseMarkdown('- a\n* b\n• c')).toEqual([
      { kind: 'list', ordered: false, start: 1, items: ['a', 'b', 'c'] },
    ]);
  });

  it('reads numbered lists written with 1. or 1)', () => {
    expect(parseMarkdown('3. a\n4) b')).toEqual([
      { kind: 'list', ordered: true, start: 3, items: ['a', 'b'] },
    ]);
    expect(parseMarkdown('2026. A good year')).toEqual([
      { kind: 'paragraph', text: '2026. A good year' },
    ]);
  });

  it('starts a new list when bullets turn into numbers', () => {
    expect(parseMarkdown('- a\n1. b')).toEqual([
      { kind: 'list', ordered: false, start: 1, items: ['a'] },
      { kind: 'list', ordered: true, start: 1, items: ['b'] },
    ]);
  });

  it('reads quotes and divider lines', () => {
    expect(parseMarkdown('> one\n> two\n---\nafter\n* * *\n___')).toEqual([
      { kind: 'quote', text: 'one\ntwo' },
      { kind: 'divider' },
      { kind: 'paragraph', text: 'after' },
      { kind: 'divider' },
      { kind: 'divider' },
    ]);
  });

  it('turns pasted <br> and <p> into line breaks and paragraphs', () => {
    expect(parseMarkdown('<p>First<br>line<BR/>two</p><p>Second</p>')).toEqual([
      { kind: 'paragraph', text: 'First\nline\ntwo' },
      { kind: 'paragraph', text: 'Second' },
    ]);
  });

  it('leaves a <p> with attributes as text', () => {
    expect(parseMarkdown('<p onclick="x">Hi</p>')).toEqual([
      { kind: 'paragraph', text: '<p onclick="x">Hi' },
    ]);
  });

  it('starts a list after a paragraph line without a blank line', () => {
    expect(parseMarkdown('Bring:\n- chairs\n- cups')).toEqual([
      { kind: 'paragraph', text: 'Bring:' },
      { kind: 'list', ordered: false, start: 1, items: ['chairs', 'cups'] },
    ]);
  });

  it('reads Windows line breaks, keeping them in a paragraph as typed', () => {
    expect(parseMarkdown('# A\r\n- b\r\n- c\r\n\r\nd\r\ne')).toEqual([
      { kind: 'heading', level: 1, text: 'A' },
      { kind: 'list', ordered: false, start: 1, items: ['b', 'c'] },
      { kind: 'paragraph', text: 'd\r\ne' },
    ]);
  });
});

describe('markdownToText', () => {
  it('drops the symbols cleanly', () => {
    expect(
      markdownToText(
        '# Title\n\nSome **bold** [link](/x).\n\n- one\n- two\n\n1. first\n2. second\n\n> said\n\n---\n\nEnd',
      ),
    ).toBe(
      [
        'Title',
        'Some bold link (/x).',
        '- one',
        '- two',
        '1. first',
        '2. second',
        '> said',
        '---',
        'End',
      ].join('\n'),
    );
  });

  it('writes a link whose label is its address once, and an unsafe address as #', () => {
    expect(markdownToText('[https://example.test](https://example.test)')).toBe(
      'https://example.test',
    );
    expect(markdownToText('[x](javascript:alert(1))')).toBe('x (#)');
  });
});

describe('markdownToHtml', () => {
  it('writes the plain semantic HTML a rich-text body holds', () => {
    expect(
      markdownToHtml(
        '## Hi\n\nA **b** *c* ~~d~~ [e](https://example.test/e)\nnext\n\n3. x\n4. y\n\n- z\n\n> q\n\n---',
      ),
    ).toBe(
      '<h3>Hi</h3><p>A <strong>b</strong> <em>c</em> <s>d</s> <a href="https://example.test/e">e</a><br>next</p>' +
        '<ol start="3"><li>x</li><li>y</li></ol><ul><li>z</li></ul><blockquote>q</blockquote><hr>',
    );
  });

  it('is plain text as paragraphs when there is no Markdown, escaped', () => {
    expect(markdownToHtml('One & two\nthree\n\n<u>four</u>')).toBe(
      '<p>One &amp; two<br>three</p><p>&lt;u&gt;four&lt;/u&gt;</p>',
    );
  });

  it('writes nothing the sanitiser would change or a link it would follow anywhere unsafe', () => {
    const html = markdownToHtml('[x](javascript:alert(1)) **<script>y</script>**');
    expect(html).toBe('<p><a href="#">x</a> <strong>&lt;script&gt;y&lt;/script&gt;</strong></p>');
    expect(sanitizeHtml(html)).not.toMatch(/javascript|<script/i);
  });
});
