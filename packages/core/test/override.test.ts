import { describe, expect, it } from 'vitest';
import {
  builtInBlocks,
  calloutBlock,
  createDocument,
  overrideBlock,
  renderEmail,
  type CalloutBlock,
} from '../src';
import { block } from './helpers';

const callout = (): CalloutBlock =>
  block('callout', 'c', { heading: 'Doors open', body: 'At seven.', ctaLabel: '', ctaUrl: '' });

describe('overrideBlock', () => {
  it('replaces the parts it is given and keeps the type and the rest', () => {
    const ours = overrideBlock(calloutBlock, { label: 'Notice', description: 'Ours.' });
    expect(ours.type).toBe('callout');
    expect(ours.label).toBe('Notice');
    expect(ours.create).toBe(calloutBlock.create);
    expect(ours.validate).toBe(calloutBlock.validate);
    expect(ours.render).toBe(calloutBlock.render);
  });

  it('hands a new render the original, for its plain text, and replaces the HTML', () => {
    const ours = overrideBlock(calloutBlock, {
      render(item, ctx, base) {
        base(item, ctx); // its plain-text lines; its HTML is not used
        return ctx.section(item, `<p>${ctx.escape(item.heading.toUpperCase())}</p>`);
      },
    });
    const { html, text } = renderEmail(createDocument({ subject: 'S', blocks: [callout()] }), {
      definitions: [...builtInBlocks, ours],
      unsubscribeUrl: 'https://example.test/u',
    });
    expect(html).toContain('<p>DOORS OPEN</p>');
    expect(html).not.toContain('At seven.');
    expect(text).toContain('At seven.');
  });
});
