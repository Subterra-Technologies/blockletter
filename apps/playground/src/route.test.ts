import { describe, expect, it } from 'vitest';
import { DOC_SECTIONS, routeFor } from './route';

describe('routeFor', () => {
  it('opens the editor on a plain address, #editor, or anything it does not know', () => {
    expect(routeFor('')).toEqual({ view: 'editor' });
    expect(routeFor('#editor')).toEqual({ view: 'editor' });
    expect(routeFor('#workspace')).toEqual({ view: 'editor' });
    expect(routeFor('#try-it')).toEqual({ view: 'editor' });
  });

  it('opens the docs where the reader left them on #docs', () => {
    expect(routeFor('#docs')).toEqual({ view: 'docs' });
  });

  it('opens the docs at each section its fragment names', () => {
    for (const section of DOC_SECTIONS) {
      expect(routeFor(`#${section.id}`)).toEqual({ view: 'docs', section: section.id });
    }
  });

  it('reads an escaped fragment, and survives a malformed one', () => {
    expect(routeFor('#%64ocs')).toEqual({ view: 'docs' });
    expect(routeFor('#%E0%A4%A')).toEqual({ view: 'editor' });
  });
});
