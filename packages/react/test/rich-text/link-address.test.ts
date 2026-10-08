import { describe, expect, it } from 'vitest';
import { linkAddress } from '../../src/rich-text/link-address';

describe('linkAddress', () => {
  it('takes web and mail addresses as they are', () => {
    expect(linkAddress(' https://example.test/a?b=1 ')).toEqual({
      href: 'https://example.test/a?b=1',
    });
    expect(linkAddress('http://example.test')).toEqual({ href: 'http://example.test' });
    expect(linkAddress('mailto:office@example.test')).toEqual({
      href: 'mailto:office@example.test',
    });
  });

  it('adds the scheme people leave off a domain or an email address', () => {
    expect(linkAddress('www.example.test/events')).toEqual({
      href: 'https://www.example.test/events',
    });
    expect(linkAddress('office@example.test')).toEqual({ href: 'mailto:office@example.test' });
  });

  it('refuses anything a link in an email cannot safely be', () => {
    for (const address of [
      'javascript:alert(1)',
      'ftp://files.example.test',
      '/events',
      'https://',
      'https://exa mple.test',
      'not a link',
    ]) {
      expect(linkAddress(address), address).toEqual({
        error: 'Use a web address, such as https://example.org, or an email address.',
      });
    }
    expect(linkAddress('  ')).toEqual({ error: 'Enter the address to link to.' });
  });
});
