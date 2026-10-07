import { describe, expect, it } from 'vitest';
import { readDeepLink } from './deep-link';

describe('readDeepLink', () => {
  it('reads every supported parameter', () => {
    expect(
      readDeepLink(
        '?org=makers-guild&view=preview&tab=brand&block=banner&new=1&theme=dark&render=text',
      ),
    ).toEqual({
      org: 'makers-guild',
      view: 'preview',
      tab: 'brand',
      block: 'banner',
      newIssue: true,
      theme: 'dark',
      render: 'text',
    });
  });

  it('ignores values it does not know rather than guessing', () => {
    expect(readDeepLink('?view=sideways&tab=nope&render=pdf&theme=sepia&new=yes')).toEqual({
      newIssue: false,
    });
  });

  it('is empty for a plain address', () => {
    expect(readDeepLink('')).toEqual({ newIssue: false });
  });
});
