import { defineBlock } from '../definition';
import type { NameListBlock } from '../types';
import { blockValidator } from '../validate';
import { TABLE, joinNames } from './shared';

/** A numbered list of names with an optional second line each, e.g. welcoming new members. */
export const nameListBlock = defineBlock<NameListBlock>({
  type: 'name_list',
  label: 'Name list',
  description: 'A numbered list of names, such as new members.',
  group: 'content',
  create: () => ({
    heading: 'Welcome, new members!',
    intro: 'Please join us in welcoming the newest members of our community.',
    items: [],
  }),
  validate: (block, path) =>
    blockValidator(block, path, 'name_list')
      .string('heading')
      .string('intro')
      .array('items', { label: 'names' }, (item) => {
        item
          .string('name')
          .string('detail', { optional: true, label: 'second line' })
          .string('url', { optional: true, label: 'link' })
          .string('ref', { optional: true, label: 'source reference' });
      }).issues,
  summary: (block) => joinNames(block.items.map((item) => item.name)) || block.heading,
  render(block, ctx) {
    if (block.items.length === 0) return '';
    const heading = block.heading.trim();
    const intro = block.intro.trim();
    if (heading) ctx.text(heading.toUpperCase());
    if (intro) ctx.text(block.intro);
    const rows = block.items
      .map((item, index) => {
        const detail = item.detail?.trim() ?? '';
        const href = item.url?.trim() ? ctx.url(item.url) : '';
        ctx.text(
          `${index + 1}. ${item.name}${detail ? ` — ${detail}` : ''}`,
          ...(href ? [href] : []),
        );
        const name = href
          ? `<a href="${ctx.escape(href)}" style="color:${ctx.palette.text};text-decoration:none;">${ctx.escape(item.name)}</a>`
          : ctx.escape(item.name);
        return (
          `<tr><td width="36" valign="top" style="width:36px;padding:8px 0;font-family:${ctx.fonts.heading};font-size:${ctx.px(22)}px;color:${ctx.palette.accentInk};">${index + 1}.</td>` +
          `<td valign="top" style="padding:8px 0;border-bottom:1px solid ${ctx.palette.border};">` +
          `<p style="margin:0;font-family:${ctx.fonts.body};font-size:${ctx.px(16)}px;font-weight:bold;color:${ctx.palette.text};">${name}</p>` +
          (detail ? `<p style="${ctx.smallStyle()}">${ctx.escape(detail)}</p>` : '') +
          `</td></tr>`
        );
      })
      .join('');
    ctx.text('');
    return ctx.section(
      block,
      (heading ? ctx.heading(block.heading) : '') +
        (intro ? `<p style="${ctx.bodyStyle()}">${ctx.escape(block.intro)}</p>` : '') +
        `${TABLE}${rows}</table>`,
      { background: ctx.palette.soft },
    );
  },
});
