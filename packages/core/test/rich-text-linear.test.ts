import { describe, expect, it } from 'vitest';
import { htmlToText, inlineRichTextStyles, sanitizeHtml } from '../src';
import { displayUrl, normalizeBaseUrl } from '../src/html';

/**
 * Inputs shaped to make a careless regular expression take quadratic time: a construct opened
 * thousands of times and never closed, or a long run a pattern scans and then gives up on. Rich
 * text comes from strangers (a paste, an imported document), and the renderer may run on a server,
 * so each of these must finish in about linear time. The old patterns took seconds to minutes on
 * them; the bound leaves room for a slow CI machine without letting a quadratic one through.
 */
const BOUND_MS = 1500;
const N = 40_000;

function timed<T>(run: () => T): { result: T; ms: number } {
  const start = performance.now();
  const result = run();
  return { result, ms: performance.now() - start };
}

describe('rich text on hostile input', () => {
  it.each([
    ['comments left open', '<!--'.repeat(N)],
    ['declarations left open', '<!x'.repeat(N)],
    ['blocked tags left open', '<script'.repeat(N)],
    ['blocked elements never closed', '<style>'.repeat(N)],
    ['blocked elements before one closing tag', `${'<script x '.repeat(N)}</script>`],
    ['tags left open', '<b '.repeat(N)],
    ['links never closed', '<a href="https://example.test">'.repeat(N)],
    ['a long run of spaces in a tag', `<p${' '.repeat(N * 4)}x>`],
  ])('sanitises %s in linear time', (_, html) => {
    const { ms } = timed(() => sanitizeHtml(html));
    expect(ms).toBeLessThan(BOUND_MS);
  });

  it.each([
    ['lists never closed', '<ol>'.repeat(N)],
    ['list tags before one closing tag', `${'<ol '.repeat(N)}</ol>`],
    ['links before one closing tag', `${'<a '.repeat(N)}</a>`],
    ['a long run of trailing spaces', `<p>text${' '.repeat(N * 4)}x</p>`],
  ])('reads %s as plain text in linear time', (_, html) => {
    const { ms } = timed(() => htmlToText(html));
    expect(ms).toBeLessThan(BOUND_MS);
  });

  it('inlines styles on tags left open in linear time', () => {
    const { ms } = timed(() => inlineRichTextStyles('<p '.repeat(N)));
    expect(ms).toBeLessThan(BOUND_MS);
  });

  it('trims a long run of trailing slashes from an address in linear time', () => {
    const address = `https://example.test${'/'.repeat(N * 4)}x`;
    expect(timed(() => normalizeBaseUrl(address)).ms).toBeLessThan(BOUND_MS);
    expect(timed(() => displayUrl(address)).ms).toBeLessThan(BOUND_MS);
  });
});

describe('rich text constructs left open', () => {
  it('drops a comment left open, with everything after it, as a browser does', () => {
    expect(sanitizeHtml('<p>kept</p><!-- open <p>hidden</p>')).toBe('<p>kept</p>');
  });

  it('drops a tag left open at the end, keeping the text before it', () => {
    expect(sanitizeHtml('<p>kept</p><script src="https://x.test"')).toBe('<p>kept</p>');
  });

  it('removes a blocked element with its content when it is closed, and only the tag when not', () => {
    expect(sanitizeHtml('<p>a</p><style>p{}</style><p>b</p>')).toBe('<p>a</p><p>b</p>');
    expect(sanitizeHtml('<p>a</p><embed src="https://x.test"><p>b</p>')).toBe('<p>a</p><p>b</p>');
    expect(sanitizeHtml('<p>a</p><script>x</script><script><p>b</p>')).toBe('<p>a</p><p>b</p>');
  });

  it('pairs each link with its own closing tag, and leaves one with no closing tag alone', () => {
    expect(sanitizeHtml('<a href="https://a.test">a</a> <a href="https://b.test">b')).toBe(
      '<a href="https://a.test" rel="noopener" target="_blank">a</a> <a href="https://b.test">b',
    );
  });
});
