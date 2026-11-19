import { defineBlock } from '../definition';
import { splitParagraphs } from '../html';
import { issuesFrom } from '../issues';
import { htmlToText, inlineRichTextStyles, resolveRichTextLinks, sanitizeHtml } from '../rich-text';
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
    // Links to the host's own pages ("/events") resolve against baseUrl like every other link.
    const html = rich ? resolveRichTextLinks(sanitizeHtml(block.body), ctx.url) : '';
    // Plain text is Markdown: text with none in it renders exactly as it always did.
    const markdown = rich ? null : ctx.markdown(block.body);
    ctx.text(...(markdown ? markdown.text : splitParagraphs(htmlToText(html))), '');
    // Rich text sits in a wrapper carrying the body font and colour, which its own tags lack.
    const body = rich
      ? `<div style="font-family:${ctx.fonts.body};font-size:${ctx.px(15)}px;line-height:1.55;color:${ctx.palette.text};">${inlineRichTextStyles(html, ctx.palette)}</div>`
      : (markdown?.html ?? '');
    return ctx.section(block, (heading ? ctx.heading(heading, { size: 20 }) : '') + body, {
      padding: '20px 32px',
    });
  },
});
