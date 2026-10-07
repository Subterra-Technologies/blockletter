import { defineBlock } from '../definition';
import { missingAltText } from '../html';
import type { BannerBlock } from '../types';
import { blockValidator } from '../validate';
import { ALT_TEXT_ISSUE, missingAlt } from './shared';

const LABEL = 'Banner';

/** A hero image with a headline over it (or under it), falling back to the ink band in Outlook. */
export const bannerBlock = defineBlock<BannerBlock>({
  type: 'banner',
  label: LABEL,
  description: 'A wide hero image with a headline over or under it.',
  group: 'graphics',
  create: () => ({ alt: '', heading: 'Save the date', subheading: '', overlay: true }),
  validate: (block, path) =>
    blockValidator(block, path, 'banner')
      .image('image', { optional: true })
      .string('alt', { label: 'alt text' })
      .string('heading', { optional: true })
      .string('subheading', { optional: true })
      .string('ctaLabel', { optional: true, label: 'button label' })
      .string('ctaUrl', { optional: true, label: 'button link' })
      .boolean('overlay', { label: 'text over the image' }).issues,
  issues: (block) => (missingAlt(block.image, block.alt) ? [ALT_TEXT_ISSUE] : []),
  summary: (block) => block.heading?.trim() || block.alt,
  render(block, ctx) {
    const url = ctx.image(block.image);
    const heading = block.heading?.trim() ?? '';
    const subheading = block.subheading?.trim() ?? '';
    const alt = block.alt.trim();
    const ctaLabel = block.ctaLabel?.trim() ?? '';
    const ctaUrl = block.ctaUrl?.trim() ?? '';
    if (heading) ctx.text(heading.toUpperCase());
    if (subheading) ctx.text(subheading);
    if (alt) ctx.text(`[${ctx.labels.image}: ${alt}]`);
    const cta =
      ctaLabel && ctaUrl
        ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:12px auto 0 auto;"><tr><td align="center">${ctx.button(ctaLabel, ctaUrl)}</td></tr></table>`
        : '';
    if (cta) ctx.text(`${ctaLabel}: ${ctx.url(ctaUrl)}`);
    ctx.text('');

    const overlayText = (color: string, mutedColor: string): string =>
      (heading
        ? `<p style="margin:0;font-family:${ctx.fonts.heading};font-size:${ctx.px(30)}px;line-height:1.2;color:${color};">${ctx.escape(heading)}</p>`
        : '') +
      (subheading
        ? `<p style="margin:8px 0 0 0;font-family:${ctx.fonts.body};font-size:${ctx.px(15)}px;line-height:1.5;color:${mutedColor};">${ctx.escape(subheading)}</p>`
        : '') +
      cta;

    if (url && block.overlay) {
      // A background image carries no alt attribute, so the warning cannot come from the HTML.
      if (!alt) ctx.warn(missingAltText(LABEL));
      // Outlook ignores CSS background images, so the ink band shows through instead.
      return ctx.section(
        block,
        `<div style="text-align:center;">${overlayText(ctx.palette.bandText, ctx.palette.bandMuted)}</div>`,
        {
          background: ctx.palette.band,
          padding: '52px 32px',
          attributes: `background="${ctx.escape(url)}"`,
          style: `background-image:url(&#39;${ctx.escape(url)}&#39;);background-size:cover;background-position:center;`,
        },
      );
    }
    if (url) {
      const width = ctx.width.inner;
      return ctx.section(
        block,
        `<img src="${ctx.escape(url)}" width="${width}" alt="${ctx.escape(block.alt)}" style="display:block;width:100%;max-width:${width}px;height:auto;border-radius:8px;">` +
          (heading || subheading || cta
            ? `<div style="text-align:center;margin-top:14px;">${overlayText(ctx.palette.heading, ctx.palette.muted)}</div>`
            : ''),
        { padding: '16px 32px' },
      );
    }
    return ctx.section(
      block,
      `<div style="text-align:center;">${overlayText(ctx.palette.bandText, ctx.palette.bandMuted)}</div>`,
      { background: ctx.palette.band, padding: '44px 32px' },
    );
  },
});
