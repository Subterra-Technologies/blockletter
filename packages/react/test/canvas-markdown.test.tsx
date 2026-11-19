import type { ComponentType } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  renderBlock,
  type BlockBase,
  type BuiltInBlock,
  type BuiltInBlockType,
} from '@subterra-technologies/blockletter';
import { EmailInlineMarkdown, EmailMarkdown } from '../src';
import { BUILT_IN_CANVASES } from '../src/canvas/blocks';
import { canvasProps, canvasTheme } from '../src/canvas/canvas-theme';
import type { BlockCanvasProps } from '../src/editor/types';
import { TEST_BRAND, testBlock } from './helpers/fixtures';

/** Markdown in free-text fields, drawn on the canvas as the email draws it. */

function draw(block: BlockBase) {
  const Drawing = BUILT_IN_CANVASES[block.type as BuiltInBlockType] as ComponentType<
    BlockCanvasProps<BlockBase>
  >;
  return render(<Drawing {...canvasProps(block, canvasTheme(TEST_BRAND))} />);
}

const SAMPLE = [
  '# Winter Market',
  'Join us **Saturday** for the *best* shopping.',
  '- Over **40** stalls',
  '- Live music',
  '1. Park on Main Street',
  '2. A stall is ~~$40~~ $30',
  '> Best market in town!',
  '---',
  'See [events](/events).<br>Call us.',
].join('\n');

describe('a text block written in Markdown', () => {
  it('draws an assistant’s answer with no symbols left', () => {
    const { container } = draw(testBlock('text', { body: SAMPLE }));
    expect(container.textContent).not.toMatch(/\*\*|~~|#|<br>|\[events\]/);
    expect(screen.getByText('Winter Market')).toHaveStyle({ fontSize: '24px' });
    expect(container.querySelector('strong')?.textContent).toBe('Saturday');
    expect(container.querySelector('em')?.textContent).toBe('best');
    expect(container.querySelectorAll('ul li')).toHaveLength(2);
    expect(container.querySelectorAll('ol li')).toHaveLength(2);
    expect(container.querySelector('ul')).toHaveStyle({ listStyleType: 'disc' });
    expect(container.querySelector('s')?.textContent).toBe('$40');
    expect(container.querySelector('blockquote')?.textContent).toBe('Best market in town!');
    expect(container.textContent).toContain('See events.');
  });

  it('holds no links, headings or markup of its own: a link is a span that looks like one', () => {
    const { container } = draw(testBlock('text', { body: SAMPLE }));
    expect(container.querySelector('a, h1, h2, h3, h4, h5, h6, br')).toBeNull();
    expect(screen.getByText('events')).toHaveStyle({ textDecoration: 'underline' });
  });

  it('draws links in the block’s own text colour when it has one', () => {
    const { container } = draw(
      testBlock('text', {
        body: 'A [link](/x)',
        style: { background: '#173e44', textColor: '#f7f2e8' },
      }),
    );
    const link = [...container.querySelectorAll('span')].find((el) => el.textContent === 'link');
    expect(link).toHaveStyle({ color: '#f7f2e8', textDecoration: 'underline' });
  });

  it('keeps unknown tags as visible text, and reads a bare pasted <b>', () => {
    const { container } = draw(
      testBlock('text', { body: '<img src=x onerror=alert(1)> <b>ok</b> <script>x</script>' }),
    );
    expect(container.querySelector('img, script')).toBeNull();
    expect(container.textContent).toContain('<img src=x onerror=alert(1)>');
    expect(container.textContent).toContain('<script>x</script>');
    expect(container.querySelector('strong')?.textContent).toBe('ok');
  });
});

describe('every free-text field draws Markdown', () => {
  const md = 'Hello **there**';
  const cases: [string, BuiltInBlock][] = [
    ['letter', testBlock('letter', { body: md })],
    ['callout', testBlock('callout', { body: md })],
    ['article', testBlock('article', { body: md })],
    ['image and text', testBlock('image_text', { body: md })],
    ['columns', testBlock('columns', { columns: [{ body: md }, { body: 'plain' }] })],
    ['sponsor note', testBlock('sponsors', { items: [{ name: 'Quiet Press', message: md }] })],
    ['name list intro', testBlock('name_list', { intro: md, items: [{ name: 'Quiet Press' }] })],
    ['pull quote', testBlock('quote', { quote: md })],
  ];

  it.each(cases)('%s', (_, block) => {
    const { container } = draw(block);
    expect(container.querySelector('strong')?.textContent).toBe('there');
    expect(container.textContent).not.toContain('**');
  });

  it('keeps a pull quote’s quotation marks, and drops them for a list', () => {
    const { container, unmount } = draw(testBlock('quote', { quote: 'The *best* market' }));
    expect(container.querySelector('em')?.textContent).toBe('best');
    expect(container.textContent).toContain('“The best market”');
    unmount();
    const list = draw(testBlock('quote', { quote: '- one\n- two' }));
    expect(list.container.querySelectorAll('li')).toHaveLength(2);
    expect(list.container.textContent).not.toContain('“');
  });
});

describe('the canvas and the email agree', () => {
  /** What a reader sees, in order: every character but the spaces, which layout supplies. */
  const words = (text: string): string => text.replace(/[“”]/g, '').replace(/\s+/g, '');

  it.each([
    ['text', testBlock('text', { heading: '', body: SAMPLE })],
    ['letter', testBlock('letter', { heading: '', body: SAMPLE, signature: '' })],
    ['quote', testBlock('quote', { quote: 'A *quiet* [word](/w)' })],
  ])('draws the %s block’s words as the email shows them', (_, block) => {
    const { container } = draw(block);
    const email = renderBlock(block).html.replace(/<[^>]+>/g, ' ');
    const decoded = new DOMParser().parseFromString(email, 'text/html').body.textContent ?? '';
    expect(words(container.textContent ?? '')).toBe(words(decoded));
  });
});

describe('the drawing parts a host’s block can use', () => {
  it('draw a body and a run as the renderer’s ctx.markdown and ctx.inlineMarkdown do', () => {
    const block = testBlock('text');
    const props = canvasProps(block, canvasTheme(TEST_BRAND));
    const { container } = render(
      <div>
        <EmailMarkdown canvas={props} body={'## Title\n\n- **one**'} />
        <p>
          <EmailInlineMarkdown canvas={props} text="A *small* [credit](/c)" />
        </p>
      </div>,
    );
    expect(screen.getByText('Title')).toHaveStyle({ fontSize: '20px' });
    expect(container.querySelector('li strong')?.textContent).toBe('one');
    expect(container.querySelector('p em')?.textContent).toBe('small');
    expect(screen.getByText('credit')).toHaveStyle({ textDecoration: 'underline' });
  });
});
