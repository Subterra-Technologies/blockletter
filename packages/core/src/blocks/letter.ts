import { defineBlock } from '../definition';
import { splitParagraphs } from '../html';
import type { LetterBlock } from '../types';
import { blockValidator } from '../validate';
import { TABLE, firstWords, missingAlt, tooLong } from './shared';

/** A personal note with an optional round portrait and a signature. */
export const letterBlock = defineBlock<LetterBlock>({
  type: 'letter',
  label: 'Letter',
  description: 'A personal note with a photo and a signature.',
  group: 'content',
  // An empty body renders nothing, so a letter nobody wrote never goes out.
  create: () => ({ heading: 'A note from us', body: '', signature: 'The team' }),
  validate: (block, path) =>
    blockValidator(block, path, 'letter')
      .string('heading')
      .string('body', { label: 'letter' })
      .string('signature')
      .image('photo', { optional: true }).issues,
  issues: (block) => [
    ...tooLong('letter', block.body),
    ...(missingAlt(block.photo, block.signature)
      ? ['Add a signature: it describes the photo for screen readers.']
      : []),
  ],
  summary: (block) => block.heading.trim() || firstWords(block.body),
  render(block, ctx) {
    if (!block.body.trim()) return '';
    const heading = block.heading.trim();
    const signature = block.signature.trim();
    const photoUrl = ctx.image(block.photo);
    ctx.text(
      ...(heading ? [heading.toUpperCase()] : []),
      ...splitParagraphs(block.body),
      ...(signature ? [signature] : []),
      '',
    );
    const photo = photoUrl
      ? `<td class="${ctx.classes.stackNarrow} ${ctx.classes.spaceNarrow}" width="88" valign="top" style="width:88px;padding-right:20px;"><img src="${ctx.escape(photoUrl)}" width="88" height="88" alt="${ctx.escape(signature)}" style="display:block;width:88px;height:88px;border-radius:44px;object-fit:cover;"></td>`
      : '';
    return ctx.section(
      block,
      (heading ? ctx.heading(block.heading) : '') +
        `${TABLE}<tr>${photo}<td${photo ? ` class="${ctx.classes.stackNarrow}"` : ''} valign="top">` +
        ctx.paragraphs(block.body) +
        (signature
          ? `<p style="${ctx.bodyStyle()}font-style:italic;">${ctx.escape(signature)}</p>`
          : '') +
        `</td></tr></table>`,
    );
  },
});
