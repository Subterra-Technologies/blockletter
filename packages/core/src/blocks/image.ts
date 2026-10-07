import { defineBlock } from '../definition';
import type { ImageBlock } from '../types';
import { blockValidator } from '../validate';
import { ALT_TEXT_ISSUE, TABLE, missingAlt } from './shared';

/** A full-width picture with alt text, an optional caption and an optional link. */
export const imageBlock = defineBlock<ImageBlock>({
  type: 'image',
  label: 'Image',
  description: 'A full-width picture with alt text.',
  group: 'graphics',
  create: () => ({ alt: '', caption: '' }),
  validate: (block, path) =>
    blockValidator(block, path, 'image')
      .image('image', { optional: true })
      .string('alt', { label: 'alt text' })
      .string('caption', { optional: true })
      .string('linkUrl', { optional: true, label: 'link' }).issues,
  issues: (block) => (missingAlt(block.image, block.alt) ? [ALT_TEXT_ISSUE] : []),
  summary: (block) => block.caption?.trim() || block.alt,
  render(block, ctx) {
    const url = ctx.image(block.image);
    const alt = block.alt.trim();
    const caption = block.caption?.trim() ?? '';
    const width = ctx.width.inner;
    const href = url && block.linkUrl?.trim() ? ctx.url(block.linkUrl) : '';
    ctx.text(alt ? `[${ctx.labels.image}: ${alt}]` : `[${ctx.labels.image}]`);
    if (caption) ctx.text(block.caption ?? '');
    if (href) ctx.text(href);
    ctx.text('');
    const picture = url
      ? `<img src="${ctx.escape(url)}" width="${width}" alt="${ctx.escape(block.alt)}" style="display:block;width:100%;max-width:${width}px;height:auto;border-radius:8px;">`
      : `${TABLE}<tr><td align="center" style="padding:36px 16px;background:${ctx.palette.soft};border:1px dashed ${ctx.palette.border};border-radius:8px;font-family:${ctx.fonts.body};font-size:${ctx.px(13)}px;color:${ctx.palette.muted};">${ctx.escape(alt || ctx.labels.image)}</td></tr></table>`;
    return ctx.section(
      block,
      (href
        ? `<a href="${ctx.escape(href)}" style="text-decoration:none;">${picture}</a>`
        : picture) +
        (caption
          ? `<p style="${ctx.smallStyle()}margin-top:8px;text-align:center;">${ctx.escape(block.caption ?? '')}</p>`
          : ''),
      { padding: '12px 32px' },
    );
  },
});
