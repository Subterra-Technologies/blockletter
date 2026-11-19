import { defineBlock } from '../definition';
import { issuesFrom } from '../issues';
import { htmlToText } from '../rich-text';
import type { TextBlock } from '../types';
import { blockValidator } from '../validate';
import { firstWords, plainWords, tooLong } from './shared';

const words = (block: TextBlock): string =>
  block.format === 'html' ? htmlToText(block.body) : plainWords(block.body);

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
  issues: issuesFrom((block) => tooLong('text', block.body)),
  summary: (block) => block.heading?.trim() || firstWords(words(block)),
  render(block, ctx) {
    const heading = block.heading?.trim() ?? '';
    if (!block.body.trim() && !heading) return '';
    if (heading) ctx.text(heading.toUpperCase());
    // Said by the block, not inferred from its contents: plain text that mentions "<b>" is text.
    const rich = block.format === 'html';
    // Plain text is Markdown: text with none in it renders exactly as it always did.
    const body = rich ? ctx.richText(block.body) : ctx.markdown(block.body);
    ctx.text(...body.text, '');
    return ctx.section(block, (heading ? ctx.heading(heading, { size: 20 }) : '') + body.html, {
      padding: '20px 32px',
    });
  },
});
