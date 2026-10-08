/**
 * Escaping and links for email HTML. Every user-supplied string the renderer writes passes
 * through `escapeHtml`, and every link through `absoluteUrl`: an email has no page for a
 * relative link to be relative to.
 */

export const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

type UrlKind = 'empty' | 'web' | 'protocol-relative' | 'mail' | 'unsafe' | 'host' | 'relative';

const urlKind = (url: string): UrlKind => {
  if (!url) return 'empty';
  if (url.startsWith('//')) return 'protocol-relative';
  if (/^https?:\/\//i.test(url)) return 'web';
  if (/^(mailto|tel):/i.test(url)) return 'mail';
  if (/^[a-z][a-z0-9+.-]*:/i.test(url)) return 'unsafe'; // javascript:, data:, vbscript:…
  if (/^[a-z0-9.-]+\.[a-z]{2,}(\/|$)/i.test(url)) return 'host';
  return 'relative';
};

/** `text` without the slashes at its end: a loop, as `/\/+$/` is quadratic on a long run of them. */
function withoutTrailingSlashes(text: string): string {
  let end = text.length;
  while (end > 0 && text.charAt(end - 1) === '/') end -= 1;
  return text.slice(0, end);
}

/**
 * The base a relative link resolves against: an absolute http(s) URL without a trailing slash
 * (a bare host gets https). Anything else is no base at all.
 */
export function normalizeBaseUrl(baseUrl: string | undefined): string {
  const trimmed = withoutTrailingSlashes((baseUrl ?? '').trim());
  switch (urlKind(trimmed)) {
    case 'web':
      return trimmed;
    case 'protocol-relative':
      return `https:${trimmed}`;
    case 'host':
      return `https://${trimmed}`;
    default:
      return '';
  }
}

/**
 * An absolute, safe address for a link. Web addresses and `mailto:`/`tel:` pass through; a bare
 * host ("example.org/events") gets https; a relative path ("/events") is resolved against
 * `baseUrl`, and left relative when there is none, rather than inventing a host. A blank or
 * unsafe address (`javascript:`, `data:`…) falls back to the base, or to `#`.
 */
export function absoluteUrl(url: string | undefined, baseUrl = ''): string {
  const base = normalizeBaseUrl(baseUrl);
  const trimmed = (url ?? '').trim();
  switch (urlKind(trimmed)) {
    case 'empty':
    case 'unsafe':
      return base || '#';
    case 'web':
    case 'mail':
      return trimmed;
    case 'protocol-relative':
      return `https:${trimmed}`;
    case 'host':
      return `https://${trimmed}`;
    case 'relative':
      if (!base) return trimmed;
      return trimmed.startsWith('/') ? `${base}${trimmed}` : `${base}/${trimmed}`;
  }
}

/** True for a link `absoluteUrl` can only resolve with a base URL. */
export const isRelativeUrl = (url: string | undefined): boolean =>
  urlKind((url ?? '').trim()) === 'relative';

/** "example.org/news" for `https://example.org/news/`: an address as a reader would say it. */
export const displayUrl = (url: string): string =>
  withoutTrailingSlashes(url.replace(/^https?:\/\//i, ''));

/** "example.org" for `https://www.example.org/about`. */
export function hostOf(url: string): string {
  const match = /^[a-z][a-z0-9+.-]*:\/\/([^/?#]+)/i.exec(url);
  return match?.[1] ? match[1].replace(/^www\./i, '') : displayUrl(url);
}

/** Blank-line-separated paragraphs of plain text, trimmed, empty ones dropped. */
export const splitParagraphs = (body: string): string[] =>
  body
    .split(/\r?\n\s*\r?\n/)
    .map((part) => part.trim())
    .filter(Boolean);

/** Byte length of a string as UTF-8, which is what Gmail's clipping threshold counts. */
export function utf8Length(value: string): number {
  let bytes = 0;
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0;
    bytes += code < 0x80 ? 1 : code < 0x800 ? 2 : code < 0x10000 ? 3 : 4;
  }
  return bytes;
}

/** The render warning for an image an email would carry without alt text. */
export const missingAltText = (label: string): string =>
  `An image in a "${label}" block has no alt text; add some so screen readers can describe it.`;
