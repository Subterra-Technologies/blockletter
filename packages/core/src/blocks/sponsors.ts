import { labelOn } from '../brand';
import { defineBlock, type RenderContext } from '../definition';
import type { SponsorsBlock } from '../types';
import { blockValidator } from '../validate';
import { TABLE, joinNames, missingAlt } from './shared';

const firstCharacter = (value: string): string => Array.from(value.trim())[0] ?? '';

/** "Oak & Iron Works" → "OI": up to two initials, skipping the small words. */
const initialsOf = (name: string): string =>
  name
    .split(/\s+/)
    .filter((word) => word && !['and', '&', 'of', 'the'].includes(word.toLowerCase()))
    .slice(0, 2)
    .map((word) => firstCharacter(word).toUpperCase())
    .join('');

/** What a logo-less sponsor's tile shows: initials, else the first letter, else a dot. */
const tileText = (name: string): string =>
  initialsOf(name) || firstCharacter(name).toUpperCase() || '•';

const tile = (ctx: RenderContext, text: string, size: number, background: string): string =>
  `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="${size}" style="width:${size}px;"><tr>` +
  `<td align="center" valign="middle" width="${size}" height="${size}" style="width:${size}px;height:${size}px;background:${background};border-radius:8px;font-family:${ctx.fonts.heading};font-size:${Math.round(size / 2.6)}px;color:${labelOn(background)};">${ctx.escape(text)}</td>` +
  `</tr></table>`;

/** Logo-and-message rows thanking sponsors or partners. */
export const sponsorsBlock = defineBlock<SponsorsBlock>({
  type: 'sponsors',
  label: 'Sponsors',
  description: 'A logo and a thank-you note for each sponsor.',
  group: 'content',
  create: () => ({ heading: 'Thank you to our sponsors', items: [] }),
  validate: (block, path) =>
    blockValidator(block, path, 'sponsors')
      .string('heading')
      .array('items', { label: 'sponsors' }, (item) => {
        item
          .string('name', { label: 'sponsor name' })
          .string('message')
          .image('logo', { optional: true })
          .string('url', { optional: true, label: 'link' })
          .string('ref', { optional: true, label: 'source reference' });
      }).issues,
  issues: (block) =>
    block.items.some((item) => missingAlt(item.logo, item.name))
      ? ['Name every sponsor: the name describes their logo for screen readers.']
      : [],
  summary: (block) => joinNames(block.items.map((item) => item.name)) || block.heading,
  render(block, ctx) {
    if (block.items.length === 0) return '';
    const heading = block.heading.trim();
    if (heading) ctx.text(heading.toUpperCase());
    const rows = block.items
      .map((item, index) => {
        const href = item.url?.trim() ? ctx.url(item.url) : '';
        ctx.text(
          ...(item.name.trim() ? [item.name] : []),
          ...(item.message.trim() ? [item.message] : []),
          ...(href ? [href] : []),
        );
        const logoUrl = ctx.image(item.logo);
        const logo = logoUrl
          ? `<img src="${ctx.escape(logoUrl)}" width="96" alt="${ctx.escape(item.name)}" style="display:block;width:96px;max-height:96px;object-fit:contain;">`
          : tile(
              ctx,
              tileText(item.name),
              96,
              index % 2 === 0 ? ctx.palette.accent : ctx.palette.band,
            );
        const name = href
          ? `<a href="${ctx.escape(href)}" style="color:${ctx.palette.heading};text-decoration:none;">${ctx.escape(item.name)}</a>`
          : ctx.escape(item.name);
        return (
          `<tr><td class="${ctx.classes.stackNarrow}" width="96" valign="top" style="width:96px;padding:10px 20px 10px 0;">${logo}</td>` +
          `<td class="${ctx.classes.stackNarrow}" valign="middle" style="padding:10px 0;">` +
          `<p style="margin:0 0 4px 0;font-family:${ctx.fonts.heading};font-size:${ctx.px(18)}px;color:${ctx.palette.heading};">${name}</p>` +
          `<p style="${ctx.bodyStyle()}margin:0;">${ctx.escape(item.message)}</p>` +
          `</td></tr>`
        );
      })
      .join('');
    ctx.text('');
    return ctx.section(
      block,
      (heading ? ctx.heading(block.heading) : '') + `${TABLE}${rows}</table>`,
    );
  },
});
