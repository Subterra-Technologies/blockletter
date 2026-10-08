import { defineBlock } from '../definition';
import { splitParagraphs } from '../html';
import { issuesFrom } from '../issues';
import type { ImageTextBlock } from '../types';
import { blockValidator } from '../validate';
import { ALT_TEXT_ISSUE, TABLE, firstWords, gapCell, missingAlt, tooLong } from './shared';

const IMAGE_WIDTH = 220;

/** A picture beside a short story, on either side, with an optional link. */
export const imageTextBlock = defineBlock<ImageTextBlock>({
  type: 'image_text',
  label: 'Image + text',
  description: 'A picture beside a short story, with an optional link.',
  group: 'layout',
  create: () => ({
    alt: '',
    heading: 'A short headline',
    body: 'Two or three sentences about the photo beside this text.',
    imageSide: 'left',
  }),
  validate: (block, path) =>
    blockValidator(block, path, 'image_text')
      .image('image', { optional: true })
      .string('alt', { label: 'alt text' })
      .string('heading')
      .string('body', { label: 'text' })
      .oneOf('imageSide', ['left', 'right'], { label: 'image side' })
      .string('linkLabel', { optional: true, label: 'link text' })
      .string('linkUrl', { optional: true, label: 'link' }).issues,
  issues: issuesFrom((block) => [
    ...tooLong('text', block.body),
    ...(missingAlt(block.image, block.alt) ? [ALT_TEXT_ISSUE] : []),
  ]),
  summary: (block) => block.heading.trim() || firstWords(block.body) || block.alt,
  render(block, ctx) {
    const image = ctx.imageOrPlaceholder(block.image, block.alt, IMAGE_WIDTH, 160, { fill: true });
    const link = ctx.optionalLink(block.linkLabel, block.linkUrl);
    const heading = block.heading.trim();
    if (heading) ctx.text(heading.toUpperCase());
    if (block.alt.trim()) ctx.text(`[${ctx.labels.image}: ${block.alt.trim()}]`);
    ctx.text(...splitParagraphs(block.body));
    if (link.text) ctx.text(link.text);
    ctx.text('');
    // On a phone the two cells stack in source order, with room under the first.
    const first = `${ctx.classes.stack} ${ctx.classes.space}`;
    const second = ctx.classes.stack;
    const imageCell = (stack: string): string =>
      `<td class="${stack}" width="${IMAGE_WIDTH}" valign="top" style="width:${IMAGE_WIDTH}px;">${image}</td>`;
    const textCell = (stack: string): string =>
      `<td class="${stack}" valign="top">` +
      (heading ? ctx.heading(block.heading, { size: 20 }) : '') +
      ctx.paragraphs(block.body) +
      link.html +
      `</td>`;
    const cells =
      block.imageSide === 'right'
        ? `${textCell(first)}${gapCell(ctx, 20)}${imageCell(second)}`
        : `${imageCell(first)}${gapCell(ctx, 20)}${textCell(second)}`;
    return ctx.section(block, `${TABLE}<tr>${cells}</tr></table>`);
  },
});
