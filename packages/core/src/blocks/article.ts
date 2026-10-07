import { defineBlock } from '../definition';
import { splitParagraphs } from '../html';
import type { ArticleBlock } from '../types';
import { blockValidator } from '../validate';
import { TABLE, missingAlt, tooLong } from './shared';

/** A feature article: kicker, title and body beside an image, with an optional link. */
export const articleBlock = defineBlock<ArticleBlock>({
  type: 'article',
  label: 'Article',
  description: 'A short feature article with an image beside it.',
  group: 'content',
  create: () => ({
    kicker: 'Tips and tools',
    title: 'One practical idea for this month',
    body: 'Share something your readers can use straight away: a tip, a how-to or a useful resource. Two or three short paragraphs is plenty.',
  }),
  validate: (block, path) =>
    blockValidator(block, path, 'article')
      .string('kicker', { label: 'label' })
      .string('title')
      .string('body', { label: 'article' })
      .image('image', { optional: true })
      .string('linkLabel', { optional: true, label: 'link text' })
      .string('linkUrl', { optional: true, label: 'link' }).issues,
  issues: (block) => [
    ...tooLong('article', block.body),
    ...(missingAlt(block.image, block.title)
      ? ['Add a title: it describes the image for screen readers.']
      : []),
  ],
  summary: (block) => block.title.trim() || block.kicker,
  render(block, ctx) {
    const kicker = block.kicker.trim();
    const title = block.title.trim();
    const imageUrl = ctx.image(block.image);
    if (!kicker && !title && !block.body.trim() && !imageUrl) return '';
    ctx.text(
      ...(kicker ? [kicker.toUpperCase()] : []),
      ...(title ? [block.title] : []),
      ...splitParagraphs(block.body),
    );
    const link = ctx.optionalLink(block.linkLabel, block.linkUrl);
    if (link.text) ctx.text(link.text);
    ctx.text('');
    // Without a photo the kicker itself fills the image's place, as a label tile on the band.
    const image = imageUrl
      ? `<img src="${ctx.escape(imageUrl)}" width="160" alt="${ctx.escape(title)}" style="display:block;width:100%;max-width:160px;height:auto;border-radius:8px;">`
      : kicker
        ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="160" style="width:160px;"><tr><td align="center" valign="middle" width="160" height="120" style="width:160px;height:120px;background:${ctx.palette.band};border-radius:8px;font-family:${ctx.fonts.heading};font-size:${ctx.px(14)}px;letter-spacing:1px;color:${ctx.palette.bandText};">${ctx.escape(kicker.toUpperCase())}</td></tr></table>`
        : '';
    return ctx.section(
      block,
      (kicker
        ? `<p style="margin:0 0 8px 0;font-family:${ctx.fonts.body};font-size:${ctx.px(12)}px;letter-spacing:2px;text-transform:uppercase;color:${ctx.palette.accentInk};font-weight:bold;">${ctx.escape(kicker)}</p>`
        : '') +
        `${TABLE}<tr>` +
        (image
          ? `<td class="${ctx.classes.stack} ${ctx.classes.space}" width="160" valign="top" style="width:160px;padding-right:20px;">${image}</td>`
          : '') +
        `<td${image ? ` class="${ctx.classes.stack}"` : ''} valign="top">${title ? ctx.heading(title, { size: 20 }) : ''}${ctx.paragraphs(block.body)}${link.html}</td>` +
        `</tr></table>`,
    );
  },
});
