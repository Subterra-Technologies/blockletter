import { describe, expect, it } from 'vitest';
import { renderBlock, type BlockStyle, type BuiltInBlock, type RenderOptions } from '../src';
import {
  BASE_URL,
  PHOTO,
  PREFERENCES_URL,
  SAMPLES,
  UNSUBSCRIBE_URL,
  block,
  render,
} from './helpers';

/**
 * Text written with no Markdown in it must reach the inbox exactly as it did before the renderer
 * learned Markdown: the same bytes in the HTML and in the plain-text part, for every built-in
 * block, plain and with an Appearance of its own.
 *
 * The snapshot beside this file was written by the renderer as it stood before Markdown support,
 * and is never regenerated to make this pass. A change it catches is a change to every issue
 * already written.
 */

/** A body as people write one: lines, blank lines, quotes, ampersands, sums and names. */
const BODY =
  'Dear readers,\nthank you for a great year & a busy autumn.\n\n' +
  'We met 2 * 3 * 4 times (that is 24) at Sam\'s, and "the_big_room" was full.\n' +
  'Tickets < $10 & children > 5 go free; ask file_name owners at snake_case@example.test.\r\n\r\n' +
  '   An indented line stays as it was.   \n  So does this one.\n\n\n\nThe last paragraph, after many blank lines.';

/** A short field with a line break and spaces at its end, as a thank-you note often has. */
const SHORT = 'Thank you to Oak & Iron Works for the spring fair!  \nAnd for the "tea" tent.  ';

const STYLED: BlockStyle = {
  background: '#173e44',
  textColor: '#f7f2e8',
  align: 'center',
  fontSize: 'large',
};

/** Every built-in block, with its sample content and free text written as above. */
const BLOCKS: BuiltInBlock[] = [
  ...Object.entries(SAMPLES).map(([type, sample]) =>
    block(type as BuiltInBlock['type'], `sample-${type}`, sample.overrides),
  ),
  block('letter', 'letter', { heading: 'A note', body: BODY, signature: 'Robin, editor' }),
  block('letter', 'letter-photo', { body: BODY, signature: 'Robin', photo: PHOTO, style: STYLED }),
  block('text', 'text', { heading: 'Opening hours', body: BODY }),
  block('text', 'text-bare', { body: 'One line only.' }),
  block('text', 'text-styled', { body: 'Light on dark.\nSecond line.', style: STYLED }),
  block('text', 'text-plain-format', { body: BODY, format: 'plain' }),
  block('text', 'text-rich', {
    body: '<p>Rich <strong>text</strong> and <a href="https://example.test/x">a link</a>.</p>',
    format: 'html',
  }),
  block('callout', 'callout', { body: BODY, ctaLabel: 'Write to us', ctaUrl: '/write' }),
  block('callout', 'callout-styled', { body: 'Send it our way.', style: STYLED }),
  block('article', 'article', { body: BODY, linkLabel: 'More', linkUrl: '/more' }),
  block('article', 'article-photo', { body: BODY, image: PHOTO, style: STYLED }),
  block('image_text', 'image-text', {
    image: PHOTO,
    alt: 'Ribbon cutting',
    heading: 'Ribbon cutting',
    body: 'Two or three sentences about the photo.\n\nA second paragraph.',
    imageSide: 'right',
  }),
  block('image_text', 'image-text-styled', { body: BODY, style: STYLED }),
  block('columns', 'columns', {
    columns: [
      { heading: 'First column', body: 'A sentence or two.\nWith a second line.' },
      { heading: 'Second column', body: 'A sentence or two.\n\nAnd another paragraph.' },
      { body: BODY, linkLabel: 'Read on', linkUrl: '/read' },
    ],
  }),
  block('columns', 'columns-styled', {
    columns: [{ body: 'Left & right.' }, { body: 'Right & left.' }],
    style: STYLED,
  }),
  block('quote', 'quote', {
    quote: '  What our readers say about the society.\nIt is "the" place.  ',
    attribution: 'A reader',
  }),
  block('quote', 'quote-styled', { quote: 'Short & sweet.', style: STYLED }),
  block('sponsors', 'sponsors', {
    items: [
      { name: 'Oak & Iron Works', message: SHORT, url: '/sponsors/oak' },
      { name: 'Harbor Lane Bakery', message: 'Line one\nline two of a thank-you.' },
      { name: 'Quiet Press', message: '' },
    ],
  }),
  block('sponsors', 'sponsors-styled', {
    items: [{ name: 'Quiet Press', message: 'With thanks.' }],
    style: STYLED,
  }),
  block('name_list', 'name-list', {
    intro: '  Please welcome our newest members & friends.\nAll of them.  ',
    items: [{ name: 'Harbor Lane Bakery', detail: 'Bakery' }],
  }),
  block('name_list', 'name-list-styled', {
    intro: 'Say hello.',
    items: [{ name: 'Quiet Press' }],
    style: STYLED,
  }),
];

const OPTIONS: RenderOptions = {
  baseUrl: BASE_URL,
  unsubscribeUrl: UNSUBSCRIBE_URL,
  preferencesUrl: PREFERENCES_URL,
};

describe('text with no Markdown in it', () => {
  it.each(BLOCKS.map((item) => [item.id, item] as const))(
    'renders the %s block as before Markdown support',
    (_, item) => {
      const { html, text } = renderBlock(item, OPTIONS);
      expect({ html, text }).toMatchSnapshot();
    },
  );

  it('renders the whole email as before Markdown support', () => {
    const { html, text } = render(BLOCKS);
    expect(html).toMatchSnapshot();
    expect(text).toMatchSnapshot();
  });
});

/** The snapshot file stores every line ending as `\n`, so carriage returns are checked here. */
describe('a Windows line break inside a paragraph', () => {
  it('is a <br> in the HTML and stays \\r\\n in the plain text, as before', () => {
    for (const item of [
      block('letter', 'crlf-letter', { body: 'First line\r\nsecond line', signature: '' }),
      block('callout', 'crlf-callout', { body: 'First line\r\nsecond line' }),
      block('text', 'crlf-text', { body: 'First line\r\nsecond line' }),
    ]) {
      const { html, text } = renderBlock(item, OPTIONS);
      expect(html).toContain('First line<br>second line');
      expect(text).toContain('First line\r\nsecond line');
    }
  });

  it('stays as typed in a short field, as before', () => {
    const { html, text } = renderBlock(
      block('sponsors', 'crlf-sponsors', {
        items: [{ name: 'Quiet Press', message: 'First line\r\nsecond line' }],
      }),
      OPTIONS,
    );
    expect(html).toContain('First line\r\nsecond line</p>');
    expect(text).toContain('First line\r\nsecond line');
  });
});
