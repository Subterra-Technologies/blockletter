import { defineBlock } from '../definition';
import { LIMITS } from '../limits';
import type { StatsBlock } from '../types';
import { blockValidator } from '../validate';
import { TABLE } from './shared';

const [MIN_STATS, MAX_STATS] = LIMITS.stats;

/** Two to four big numbers in the accent colour, each over a small label. */
export const statsBlock = defineBlock<StatsBlock>({
  type: 'stats',
  label: 'Numbers',
  description: 'Two to four big numbers with labels.',
  group: 'graphics',
  create: () => ({
    items: [
      { value: '120', label: 'Members' },
      { value: '12', label: 'Events this year' },
    ],
  }),
  validate: (block, path) =>
    blockValidator(block, path, 'stats').array(
      'items',
      {
        label: 'numbers',
        min: MIN_STATS,
        max: MAX_STATS,
        tooFew: `A numbers block needs ${MIN_STATS} to ${MAX_STATS} numbers.`,
        tooMany: `A numbers block needs ${MIN_STATS} to ${MAX_STATS} numbers.`,
      },
      (item) => {
        item.string('value', { label: 'number' }).string('label');
      },
    ).issues,
  issues: (block) =>
    block.items.length < MIN_STATS || block.items.length > MAX_STATS
      ? [`Use between ${MIN_STATS} and ${MAX_STATS} numbers.`]
      : [],
  summary: (block) =>
    block.items
      .map((item) => item.value.trim())
      .filter(Boolean)
      .join(' · '),
  render(block, ctx) {
    const items = block.items.slice(0, MAX_STATS);
    if (items.length === 0) return '';
    const width = Math.floor(100 / items.length);
    const cells = items
      .map((item) => {
        ctx.text(`${item.value} — ${item.label}`);
        return (
          `<td width="${width}%" align="center" valign="top" style="padding:6px 8px;">` +
          `<p style="margin:0;font-family:${ctx.fonts.heading};font-size:${ctx.px(38)}px;line-height:1.1;color:${ctx.palette.accentInk};">${ctx.escape(item.value)}</p>` +
          `<p style="margin:6px 0 0 0;font-family:${ctx.fonts.body};font-size:${ctx.px(12)}px;letter-spacing:1.5px;text-transform:uppercase;color:${ctx.palette.muted};">${ctx.escape(item.label)}</p>` +
          `</td>`
        );
      })
      .join('');
    ctx.text('');
    return ctx.section(block, `${TABLE}<tr>${cells}</tr></table>`, {
      background: ctx.palette.soft,
      padding: '24px 32px',
    });
  },
});
