import { defineBlock } from '../definition';
import { splitParagraphs } from '../html';
import type { CalloutBlock } from '../types';
import { blockValidator } from '../validate';
import { firstWords } from './shared';

/** A short heading, a paragraph and a button: "Have news to share?". */
export const calloutBlock = defineBlock<CalloutBlock>({
  type: 'callout',
  label: 'Callout',
  description: 'A short heading, a sentence or two and a button.',
  group: 'content',
  // No link yet: the button appears once one is added, rather than pointing anywhere by default.
  create: () => ({
    heading: 'Have news to share?',
    body: 'Opening a new location, celebrating an anniversary or hiring? Send us your news and we will share it in a future issue.',
    ctaLabel: 'Share your news',
    ctaUrl: '',
  }),
  validate: (block, path) =>
    blockValidator(block, path, 'callout')
      .string('heading')
      .string('body')
      .string('ctaLabel', { label: 'button label' })
      .string('ctaUrl', { label: 'button link' }).issues,
  issues: (block) => {
    const label = block.ctaLabel.trim();
    const url = block.ctaUrl.trim();
    if (label && !url) return ['Add a link so the button appears.'];
    if (url && !label) return ['Give the button a label.'];
    return [];
  },
  summary: (block) => block.heading.trim() || firstWords(block.body),
  render(block, ctx) {
    const heading = block.heading.trim();
    const label = block.ctaLabel.trim();
    const hasButton = Boolean(label && block.ctaUrl.trim());
    if (!heading && !block.body.trim() && !hasButton) return '';
    ctx.text(
      ...(heading ? [heading.toUpperCase()] : []),
      ...splitParagraphs(block.body),
      ...(hasButton ? [`${label}: ${ctx.url(block.ctaUrl)}`] : []),
      '',
    );
    return ctx.section(
      block,
      (heading ? ctx.heading(block.heading, { size: 20 }) : '') +
        ctx.paragraphs(block.body) +
        (hasButton ? ctx.button(label, block.ctaUrl) : ''),
      { padding: '20px 32px' },
    );
  },
});
