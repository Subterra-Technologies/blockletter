import { defineBlock } from '../definition';
import { splitParagraphs } from '../html';
import { htmlToText, inlineRichTextStyles, sanitizeHtml } from '../rich-text';
import type { TextBlock } from '../types';
import { blockValidator } from '../validate';
import { firstWords, tooLong } from './shared';

const words = (block: TextBlock): string =>
  block.format === 'html' ? htmlToText(block.body) : block.body;

/** A heading and a few paragraphs: plain text, or rich HTML when the block says so. */
export const textBlock = defineBlock<TextBlock>({
  type: 'text',
  label: 'Text',
  description: 'A heading and a few paragraphs.',
  group: 'content',
  create: () => ({ heading: '', body: '' }),
  validate: (block, path) =>
    blockValidator(block, path, 'text')
      .string('heading', { optional: true })
      .string('body', { label: 'text' })
      .oneOf('format', ['plain', 'html'], { optional: true }).issues,
  issues: (block) => tooLong('text', block.body),
  summary: (block) => block.heading?.trim() || firstWords(words(block)),
  render(block, ctx) {
    const heading = block.heading?.trim() ?? '';
    if (!block.body.trim() && !heading) return '';
    if (heading) ctx.text(heading.toUpperCase());
    // Said by the block, not inferred from its contents: plain text that mentions "<b>" is text.
    const rich = block.format === 'html';
    ctx.text(...splitParagraphs(words(block)), '');
    // Rich text sits in a wrapper carrying the body font and colour, which its own tags lack.
    const body = rich
      ? `<div style="font-family:${ctx.fonts.body};font-size:${ctx.px(15)}px;line-height:1.55;color:${ctx.palette.text};">${inlineRichTextStyles(sanitizeHtml(block.body), ctx.palette)}</div>`
      : ctx.paragraphs(block.body);
    return ctx.section(block, (heading ? ctx.heading(heading, { size: 20 }) : '') + body, {
      padding: '20px 32px',
    });
  },
});
