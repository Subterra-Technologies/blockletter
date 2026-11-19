import { describe, expect, it } from 'vitest';
import {
  createDocument,
  defineBlock,
  renderBlock,
  renderEmail,
  builtInBlocks,
  type BlockBase,
  type BlockStyle,
  type BuiltInBlock,
} from '../src';
import { BASE_URL, block } from './helpers';

/**
 * Markdown typed or pasted into a free-text field reaches the email formatted, in the HTML and the
 * plain-text part, and nothing typed can add markup of its own. Every assertion reads the rendered
 * email, not what is stored.
 */

/** One block's rows, without the email around them. */
const rows = (item: BuiltInBlock): { html: string; text: string } =>
  renderBlock(item, { baseUrl: BASE_URL });

const textBlock = (body: string, style?: BlockStyle): BuiltInBlock =>
  block('text', 'md', { body, ...(style ? { style } : {}) });

/** What an AI assistant hands back when asked for a short event announcement, pasted as-is. */
const ASSISTANT_SAMPLE = [
  '# Winter Market on the Green',
  '',
  'Join us **Saturday, December 5** for the *best* local shopping of the year.',
  '',
  '## What to expect',
  '- Over **40** local stalls',
  '- Live music and hot cocoa',
  '* Carols from 2 to 4 PM',
  '',
  '### Getting there',
  '1. Park on Main Street',
  '2. A stall is ~~$40~~ **$30** for members',
  '3. See [our events page](/events) for the map',
  '',
  '> Best market in town!',
  '',
  '---',
  '',
  'Questions?<br>Call the office.',
  '<p>Thank <b>you</b> &amp; see you there, <i>neighbours</i>.</p>',
].join('\n');

describe('an AI assistant’s answer pasted into a text block', () => {
  const { html, text } = rows(textBlock(ASSISTANT_SAMPLE));

  it('shows no Markdown symbols in the email', () => {
    expect(html).not.toMatch(/\*\*|~~|>#|\[our events page\]/);
    expect(html).not.toContain('&lt;br&gt;');
    expect(html).not.toContain('&lt;p&gt;');
    expect(html).not.toContain('&lt;b&gt;');
  });

  it('draws headings in the heading font, largest first, under the block’s own <h2>', () => {
    expect(html).toMatch(
      /<h2 style="[^"]*font-family:Georgia[^"]*font-size:24px[^"]*">Winter Market on the Green<\/h2>/,
    );
    expect(html).toMatch(/<h3 style="[^"]*font-size:20px[^"]*">What to expect<\/h3>/);
    expect(html).toMatch(
      /<h4 style="[^"]*font-size:17px;[^"]*font-weight:bold;[^"]*">Getting there<\/h4>/,
    );
  });

  it('draws bold, italic and strikethrough', () => {
    expect(html).toContain('Join us <strong>Saturday, December 5</strong> for the <em>best</em>');
    expect(html).toContain(
      'A stall is <s style="text-decoration:line-through;">$40</s> <strong>$30</strong>',
    );
  });

  it('draws bullet and numbered lists', () => {
    expect(html).toMatch(
      /<ul style="[^"]*"><li style="[^"]*">Over <strong>40<\/strong> local stalls<\/li><li style="[^"]*">Live music and hot cocoa<\/li><li style="[^"]*">Carols from 2 to 4 PM<\/li><\/ul>/,
    );
    expect(html).toMatch(/<ol style="[^"]*"><li style="[^"]*">Park on Main Street<\/li>/);
  });

  it('makes the link absolute on the base URL, in the link colour', () => {
    expect(html).toMatch(
      /See <a href="https:\/\/example\.test\/events" style="color:#[0-9a-f]{6};text-decoration:underline;">our events page<\/a> for the map/,
    );
  });

  it('draws the quote beside the accent bar, and the divider', () => {
    expect(html).toMatch(
      /<blockquote style="[^"]*border-left:3px solid #[0-9a-f]{6};">Best market in town!<\/blockquote>/,
    );
    expect(html).toMatch(/<table role="presentation"[^>]*><tr><td height="1"/);
  });

  it('turns the pasted <br>, <p>, <b> and <i> into what they mean', () => {
    expect(html).toContain('Questions?<br>Call the office.');
    expect(html).toContain(
      'Thank <strong>you</strong> &amp;amp; see you there, <em>neighbours</em>.',
    );
  });

  it('writes a clean plain-text part', () => {
    expect(text).toContain(
      [
        'Winter Market on the Green',
        'Join us Saturday, December 5 for the best local shopping of the year.',
        'What to expect',
        '- Over 40 local stalls',
        '- Live music and hot cocoa',
        '- Carols from 2 to 4 PM',
        'Getting there',
        '1. Park on Main Street',
        '2. A stall is $40 $30 for members',
        '3. See our events page (https://example.test/events) for the map',
        '> Best market in town!',
        '---',
        'Questions?',
        'Call the office.',
        'Thank you &amp; see you there, neighbours.',
      ].join('\n'),
    );
    expect(text).not.toMatch(/\*\*|~~|<b>|<p>|<br>/);
  });
});

describe('what a writer types cannot add markup', () => {
  const cases: [string, RegExp][] = [
    ['**<script>alert(1)</script>**', /<script/i],
    ['[x](javascript:alert(1))', /javascript:/i],
    ['[x](data:text/html;base64,AAAA)', /data:text/i],
    ['[x](" onmouseover="alert(1))', /" onmouseover/i],
    ['<img src=x onerror=alert(1)>', /<img src=x/i],
    ['<p onclick="alert(1)">hi</p>', /<p onclick/i],
    ['<a href="https://evil.test">x</a>', /<a href="https:\/\/evil/i],
    ['<b onmouseover="x">y</b>', /<b onmouseover/i],
    ['# <script>x</script>', /<script/i],
    ['- <svg onload=alert(1)>', /<svg/i],
    ['> <iframe src=x>', /<iframe/i],
    ['<b><script>x</script></b>', /<script/i],
  ];

  it.each(cases)('escapes %s', (typed, forbidden) => {
    const { html, text } = rows(textBlock(typed));
    expect(html).not.toMatch(forbidden);
    expect(text).not.toMatch(/javascript:|data:text/i);
  });

  it('sends a javascript: link to the base URL instead', () => {
    expect(rows(textBlock('[x](javascript:alert(1))')).html).toContain(`<a href="${BASE_URL}" `);
  });

  it('keeps unknown tags visible as text, as before', () => {
    expect(rows(textBlock('<img src=x onerror=alert(1)> and <u>u</u>')).html).toContain(
      '&lt;img src=x onerror=alert(1)&gt; and &lt;u&gt;u&lt;/u&gt;',
    );
  });

  it('warns about a relative link when there is no base URL to resolve it', () => {
    const { warningDetails } = renderEmail(
      createDocument({ subject: 'S', blocks: [textBlock('See [events](/events).')] }),
    );
    expect(warningDetails.map((warning) => warning.code)).toContain('relative_link');
  });
});

describe('formatting follows the block’s Appearance', () => {
  const style: BlockStyle = {
    background: '#173e44',
    textColor: '#f7f2e8',
    align: 'center',
    fontSize: 'large',
  };
  const { html } = rows(textBlock('# Big\n\nA [link](/x) and **bold**\n\n- item\n\n> said', style));

  it('draws links, headings and lists in the block’s text colour', () => {
    expect(html).toMatch(
      /<a href="[^"]*" style="color:#f7f2e8;text-decoration:underline;">link<\/a>/,
    );
    expect(html).toMatch(/<h2 style="[^"]*color:#f7f2e8;[^"]*">Big<\/h2>/);
    expect(html).toMatch(/<ul style="[^"]*color:#f7f2e8;/);
    expect(html).toMatch(/<blockquote style="[^"]*color:#f7f2e8;/);
  });

  it('scales headings with the block’s size and keeps its alignment', () => {
    expect(html).toMatch(/<h2 style="[^"]*font-size:28px/);
    expect(html).toMatch(/^<tr><td[^>]*style="[^"]*text-align:center;/);
  });

  it('draws links without an Appearance in the brand’s link colour', () => {
    expect(rows(textBlock('A [link](/x)')).html).toMatch(
      /<a href="[^"]*" style="color:#[0-9a-f]{6};text-decoration:underline;">link<\/a>/,
    );
  });
});

describe('every free-text field reads Markdown', () => {
  const md = 'Hello **there** [site](/x)';
  const expectFormatted = (item: BuiltInBlock): void => {
    const { html, text } = rows(item);
    expect(html).toContain('Hello <strong>there</strong> <a href="https://example.test/x"');
    expect(text).toContain('Hello there site (https://example.test/x)');
  };

  it('text', () => expectFormatted(textBlock(md)));
  it('text with format plain', () =>
    expectFormatted(block('text', 't', { body: md, format: 'plain' })));
  it('letter', () => expectFormatted(block('letter', 'l', { body: md })));
  it('callout', () => expectFormatted(block('callout', 'c', { body: md })));
  it('article', () => expectFormatted(block('article', 'a', { body: md })));
  it('image and text', () => expectFormatted(block('image_text', 'i', { body: md })));
  it('columns', () =>
    expectFormatted(block('columns', 'c', { columns: [{ body: md }, { body: 'plain' }] })));
  it('name list introduction', () =>
    expectFormatted(block('name_list', 'n', { intro: md, items: [{ name: 'Quiet Press' }] })));
  it('sponsor thank-you note', () =>
    expectFormatted(block('sponsors', 's', { items: [{ name: 'Quiet Press', message: md }] })));

  it('pull quote, keeping its quotation marks', () => {
    const { html, text } = rows(block('quote', 'q', { quote: md }));
    expect(html).toContain('&ldquo;Hello <strong>there</strong> <a href="https://example.test/x"');
    expect(text).toContain('“Hello there site (https://example.test/x)”');
  });

  it('a pull quote with a list draws the list, without quotation marks', () => {
    const { html, text } = rows(block('quote', 'q', { quote: '- one\n- two' }));
    expect(html).toMatch(/<ul style="[^"]*"><li style="[^"]*">one<\/li>/);
    expect(html).not.toContain('&ldquo;');
    expect(text).toContain('- one\n- two');
  });

  it('a short field with a pasted <br> breaks the line', () => {
    const { html, text } = rows(
      block('sponsors', 's', { items: [{ name: 'Quiet Press', message: 'One<br>two' }] }),
    );
    expect(html).toContain('One<br>two</p>');
    expect(text).toContain('One\ntwo');
  });

  it('leaves a rich (format html) text block to the sanitiser, reading no Markdown in it', () => {
    const { html } = rows(block('text', 'r', { body: '<p>**not markdown**</p>', format: 'html' }));
    expect(html).toContain('**not markdown**');
  });

  it('reads no Markdown in single-line labels such as a heading or a caption', () => {
    const { html } = rows(block('image', 'i', { caption: '**caption**', alt: 'A' }));
    expect(html).toContain('**caption**');
    expect(rows(block('letter', 'l', { heading: '**Hi**', body: 'x' })).html).toContain('**Hi**');
  });
});

describe('one-line summaries', () => {
  it('drop the Markdown', () => {
    for (const item of [
      block('letter', 'l', { heading: '', body: '# **Hello** [there](/x)' }),
      block('callout', 'c', { heading: '', body: '**Hello** there' }),
      block('text', 't', { body: '- **Hello** there' }),
      block('quote', 'q', { quote: '*Hello* there' }),
    ]) {
      const definition = builtInBlocks.find((candidate) => candidate.type === item.type);
      expect(definition?.summary?.(item as never)).toBe('Hello there');
    }
  });
});

describe('a host’s own block', () => {
  interface NoteBlock extends BlockBase<'note'> {
    body: string;
    caption: string;
  }
  const noteBlock = defineBlock<NoteBlock>({
    type: 'note',
    label: 'Note',
    description: 'A note.',
    group: 'content',
    create: () => ({ body: '', caption: '' }),
    validate: () => [],
    render(note, ctx) {
      const body = ctx.markdown(note.body);
      const caption = ctx.inlineMarkdown(note.caption);
      ctx.text(...body.text, caption.text, '');
      return ctx.section(note, `${body.html}<p style="${ctx.smallStyle()}">${caption.html}</p>`);
    },
  });

  it('draws Markdown with ctx.markdown and ctx.inlineMarkdown, as the built-ins do', () => {
    const note: NoteBlock = {
      id: 'n',
      type: 'note',
      hidden: false,
      body: '## Title\n\n**Bold** and [a link](/x)',
      caption: 'A *small* [credit](/c)',
    };
    const rendered = renderBlock(note, { definitions: [noteBlock], baseUrl: BASE_URL });
    expect(rendered.html).toMatch(/<h3 style="[^"]*">Title<\/h3>/);
    expect(rendered.html).toContain('<strong>Bold</strong> and <a href="https://example.test/x"');
    expect(rendered.html).toContain('A <em>small</em> <a href="https://example.test/c"');
    expect(rendered.text).toBe(
      'Title\nBold and a link (https://example.test/x)\nA small credit (https://example.test/c)',
    );
  });
});
