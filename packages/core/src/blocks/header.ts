import { defineBlock } from '../definition';
import { LOGO_SIZES, LOGO_WIDTHS } from '../limits';
import type { HeaderBlock } from '../types';
import { blockValidator } from '../validate';
import { present } from './shared';

/** Masthead: the brand kit's logo (or the organisation's name) over a "title · issue" strapline. */
export const headerBlock = defineBlock<HeaderBlock>({
  type: 'header',
  label: 'Header',
  description: 'Your logo over the newsletter title and the issue.',
  group: 'content',
  structural: true,
  create: () => ({ title: 'Newsletter', issueLabel: '{{monthYear}}', logoText: '' }),
  validate: (block, path) =>
    blockValidator(block, path, 'header')
      .string('title')
      .string('issueLabel', { label: 'issue label' })
      .string('logoText', { label: 'logo text' })
      .oneOf('logoSize', LOGO_SIZES, { optional: true, label: 'logo size' }).issues,
  summary: (block) => present(block.title, block.issueLabel).join(' · '),
  render(block, ctx) {
    // An email need not have an issue, or a strapline at all, so the separator is only drawn
    // between two things that exist: "· " on its own was showing under the logo.
    const strapline = present(block.title, block.issueLabel);
    // Blank logo text means the organisation's own name, so one brand kit edit renames every issue.
    const name = block.logoText.trim() || ctx.brand.name.trim();
    const logoUrl = ctx.image(ctx.brand.logo);
    if (!name && !logoUrl && strapline.length === 0) return '';
    ctx.text(
      ...(name ? [name.toUpperCase()] : []),
      ...(strapline.length ? [strapline.join(' · ')] : []),
      '',
    );
    const width = LOGO_WIDTHS[block.logoSize ?? 'medium'] ?? LOGO_WIDTHS.medium;
    const align = block.style?.align;
    const image = logoUrl
      ? `<img src="${ctx.escape(logoUrl)}" width="${width}" alt="${ctx.escape(name)}" style="display:block;width:100%;max-width:${width}px;height:auto;margin:0 0 10px 0;">`
      : '';
    // A block image ignores text-align, so a centred or right-aligned logo sits in a table of its
    // width inside a cell that aligns it: the cell's `align` for Outlook and browsers alike (a
    // table's own `align="right"` would float it beside the strapline), margins as well, and a
    // width that gives way on a screen narrower than the logo.
    const brandLine = image
      ? align === 'center' || align === 'right'
        ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;"><tr><td align="${align}">` +
          `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="${width}" style="width:${width}px;max-width:100%;margin:${align === 'center' ? '0 auto' : '0 0 0 auto'};"><tr><td>${image}</td></tr></table>` +
          `</td></tr></table>`
        : image
      : name
        ? `<p style="margin:0 0 6px 0;font-family:${ctx.fonts.heading};font-size:${ctx.px(26)}px;line-height:1.2;color:${ctx.palette.heading};">${ctx.escape(name)}</p>`
        : '';
    return ctx.section(
      block,
      brandLine +
        (strapline.length
          ? `<p style="margin:0;font-family:${ctx.fonts.body};font-size:${ctx.px(12)}px;letter-spacing:2px;text-transform:uppercase;color:${ctx.palette.accentInk};font-weight:bold;">${strapline.map((part) => ctx.escape(part)).join(' &middot; ')}</p>`
          : ''),
      { padding: '32px 32px 20px 32px' },
    );
  },
});
