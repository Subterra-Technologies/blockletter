import { isSafeLinkHref } from '@subterra-technologies/blockletter';

const INVALID = 'Use a web address, such as https://example.org, or an email address.';

/** A scheme with something after it: `https://` alone links nowhere. */
const COMPLETE = /^(?:https?:\/\/[^/?#]+|mailto:[^@]+@.+)/i;
const BARE_EMAIL = /^[^@/:]+@[^@/:]+\.[^@/:]+$/;
const BARE_DOMAIN = /^[a-z0-9-]+(?:\.[a-z0-9-]+)+(?::\d+)?(?:[/?#].*)?$/i;

/**
 * What the link form makes of an address someone typed: a link `isSafeLinkHref` accepts, or the
 * reason it cannot be one. A bare email address gets `mailto:` and a bare domain
 * (`www.example.org`) gets `https://`, the two ways people most often leave the scheme off.
 */
export function linkAddress(input: string): { href: string } | { error: string } {
  const value = input.trim();
  if (!value) return { error: 'Enter the address to link to.' };
  if (/\s/.test(value)) return { error: INVALID };
  const href = BARE_EMAIL.test(value)
    ? `mailto:${value}`
    : BARE_DOMAIN.test(value)
      ? `https://${value}`
      : value;
  return isSafeLinkHref(href) && COMPLETE.test(href) ? { href } : { error: INVALID };
}
