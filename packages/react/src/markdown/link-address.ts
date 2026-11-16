import { englishMessages } from '../i18n/context';
import type { BoundMessages } from '../i18n/resolve';
import { linkAddress } from '../rich-text/link-address';

/** A path on the host's own site (`/events`, `#top`, `?page=2`), which the renderer resolves. */
const RELATIVE = /^(?:\/(?!\/)|#|\?)\S*$/;

/**
 * What the Markdown link form makes of an address someone typed: what the rich-text link form
 * accepts (a web or email address, with a bare domain or email address completed), or a path on
 * the host's site, which the email resolves against its `baseUrl`. Anything else, such as a
 * `javascript:` address, is refused with the reason.
 */
export function markdownLinkAddress(
  input: string,
  messages: BoundMessages = englishMessages,
): { href: string } | { error: string } {
  const value = input.trim();
  if (RELATIVE.test(value)) return { href: value };
  const result = linkAddress(value, messages);
  return 'error' in result && value ? { error: messages.markdown.invalidAddress } : result;
}
