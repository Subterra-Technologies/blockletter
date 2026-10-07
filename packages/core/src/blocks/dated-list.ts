import { defineBlock } from '../definition';
import { isIsoDate } from '../period';
import type { DatedItem, DatedListBlock } from '../types';
import { blockValidator } from '../validate';
import { TABLE } from './shared';

/**
 * Dated items in calendar order: those with a `sortDate` by that date, then those without one
 * ("Every Saturday") in the order they were written. Stable, so equal dates keep their order.
 */
export function sortDatedItems<T extends DatedItem>(items: readonly T[]): T[] {
  const dated: { item: T; date: string }[] = [];
  const undated: T[] = [];
  for (const item of items) {
    if (isIsoDate(item.sortDate)) dated.push({ item, date: item.sortDate });
    else undated.push(item);
  }
  dated.sort((left, right) => (left.date < right.date ? -1 : left.date > right.date ? 1 : 0));
  return [...dated.map(({ item }) => item), ...undated];
}

/** "Sept. 5 · Farmers market | Town square" lines: a community calendar. */
export const datedListBlock = defineBlock<DatedListBlock>({
  type: 'dated_list',
  label: 'Dated list',
  description: 'Dated lines for a community calendar.',
  group: 'content',
  create: () => ({ heading: 'Around the community', subheading: 'Coming up', items: [] }),
  validate: (block, path) =>
    blockValidator(block, path, 'dated_list')
      .string('heading')
      .string('subheading')
      .array('items', { label: 'lines' }, (item) => {
        item
          .string('date')
          .string('text')
          .isoDate('sortDate', { optional: true, label: 'sort date' })
          .string('ref', { optional: true, label: 'source reference' });
      }).issues,
  summary: (block) => block.heading.trim() || block.subheading,
  render(block, ctx) {
    const entries = sortDatedItems(block.items)
      .map((item) => ({ date: item.date.trim(), text: item.text.trim() }))
      .filter((entry) => entry.date || entry.text);
    if (entries.length === 0) return '';
    const heading = block.heading.trim();
    const subheading = block.subheading.trim();
    if (heading) ctx.text(heading.toUpperCase());
    if (subheading) ctx.text(block.subheading);
    const lines = entries
      .map((entry) => {
        ctx.text(entry.date ? `${entry.date} · ${entry.text}` : entry.text);
        return (
          `<tr><td style="padding:5px 0;font-family:${ctx.fonts.body};font-size:${ctx.px(15)}px;line-height:1.5;color:${ctx.palette.text};">` +
          (entry.date ? `<strong>${ctx.escape(entry.date)}</strong> &middot; ` : '') +
          ctx.escape(entry.text) +
          `</td></tr>`
        );
      })
      .join('');
    ctx.text('');
    return ctx.section(
      block,
      (heading ? ctx.heading(block.heading) : '') +
        (subheading
          ? `<p style="margin:-6px 0 12px 0;font-family:${ctx.fonts.heading};font-size:${ctx.px(16)}px;font-style:italic;color:${ctx.palette.muted};">${ctx.escape(block.subheading)}</p>`
          : '') +
        `${TABLE}${lines}</table>`,
      { background: ctx.palette.soft },
    );
  },
});
