import { describe, expect, it } from 'vitest';
import { markdownToHtml, markdownToText, parseInline, parseMarkdown, renderBlock } from '../src';
import { block } from './helpers';

/**
 * Inputs shaped to make a careless reader take quadratic time: a mark, bracket or tag opened
 * thousands of times and never closed, or a long run a pattern scans and then gives up on. Free
 * text comes from strangers (a paste, an assistant's answer, an imported document), and the
 * renderer may run on a server, so each must finish in about linear time. A quadratic reader takes
 * many seconds on these; the bound leaves room for a slow CI machine without letting one through.
 */
const BOUND_MS = 1500;
const N = 40_000;

function timed(run: () => unknown): number {
  const start = performance.now();
  run();
  return performance.now() - start;
}

const HOSTILE: [string, string][] = [
  ['bold marks never closed', '**a '.repeat(N)],
  ['italic marks never closed', '*a '.repeat(N)],
  ['underscores never closed', '_a '.repeat(N)],
  ['strikethrough never closed', '~~a '.repeat(N)],
  ['closing marks with nothing open', 'a** '.repeat(N)],
  ['openers of one mark before closers of another', `${'_a '.repeat(N)}${'a* '.repeat(N)}`],
  ['a long run of stars', '*'.repeat(N * 4)],
  ['a long run of underscores', '_'.repeat(N * 4)],
  ['a long run of tildes', '~'.repeat(N * 4)],
  ['stars and underscores, alternating', '*_'.repeat(N * 2)],
  ['marks nested as deep as they go', `${'*a _'.repeat(N)}x${'_ a*'.repeat(N)}`],
  ['marks wedged between marks', `${'*_'.repeat(N)}x${'_*'.repeat(N)}`],
  ['bold and italic nested as deep as they go', `${'**a *'.repeat(N)}x${'* a**'.repeat(N)}`],
  ['link labels never closed', '['.repeat(N * 4)],
  ['link labels with no address', '[a]'.repeat(N)],
  ['link addresses never closed', '[a]('.repeat(N)],
  ['link addresses of open brackets', `[a](${'('.repeat(N * 4)}`],
  ['brackets never closed', '('.repeat(N * 4)],
  ['a long address before a space', `[a](${'x'.repeat(N * 4)} )`],
  ['links inside link labels', `${'[a'.repeat(N)}](b)`],
  ['tags never closed', '<b>'.repeat(N)],
  ['tags of every kind never closed', '<b><i><em><strong>'.repeat(N / 4)],
  ['closing tags of another kind', `${'<b>'.repeat(N)}${'</i>'.repeat(N)}`],
  ['openings of a closing tag', '</'.repeat(N * 2)],
  ['pasted breaks with long spaces', `<br${' '.repeat(N * 4)}x`],
  ['a long run of hashes', '#'.repeat(N * 4)],
  ['a heading with a long run of spaces', `# a${' '.repeat(N * 4)}b`],
  ['a heading with a long closing run', `# a ${'#'.repeat(N * 4)} b`],
  ['a long run of quote marks', '>'.repeat(N * 4)],
  ['many quoted lines', '> a\n'.repeat(N)],
  ['a long run of backslashes', '\\'.repeat(N * 4)],
  ['backslashes before marks', '\\*'.repeat(N * 2)],
  ['a long run of spaces between lines', `a\n${' '.repeat(N * 4)}b`],
  ['blank lines of spaces', '\n \t '.repeat(N)],
  ['carriage returns', `a\n${'\r'.repeat(N * 4)}x`],
  ['bullet markers', '- '.repeat(N * 2)],
  ['numbered markers', '1. '.repeat(N)],
  ['divider marks with a stray letter', `${'- '.repeat(N * 2)}x`],
  ['many short lines', 'a\n'.repeat(N * 2)],
];

describe('Markdown on hostile input', () => {
  it.each(HOSTILE)('reads %s in linear time', (_, input) => {
    expect(timed(() => parseInline(input))).toBeLessThan(BOUND_MS);
    expect(timed(() => parseMarkdown(input))).toBeLessThan(BOUND_MS);
  });

  it.each(HOSTILE)('renders %s in linear time', (_, input) => {
    expect(timed(() => renderBlock(block('text', 'hostile', { body: input })))).toBeLessThan(
      BOUND_MS,
    );
    expect(timed(() => markdownToHtml(input))).toBeLessThan(BOUND_MS);
    expect(timed(() => markdownToText(input))).toBeLessThan(BOUND_MS);
  });

  it('draws formatting nested past a few levels as its text, keeping every word', () => {
    const deep = `${'*a _'.repeat(N / 2)}x${'_ a*'.repeat(N / 2)}`;
    const { text } = renderBlock(block('text', 'deep', { body: deep }));
    expect(text).toBe(`${'a '.repeat(N / 2)}x${' a'.repeat(N / 2)}`);
    let depth = 0;
    let nodes = parseInline(deep);
    for (;;) {
      const nested = nodes.find((node) => node.kind !== 'text');
      if (!nested || !('children' in nested)) break;
      nodes = nested.children;
      depth += 1;
    }
    expect(depth).toBe(8);
  });
});
