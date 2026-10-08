import { defineBlock } from '../definition';
import { issuesFrom } from '../issues';
import { LIMITS } from '../limits';
import { formatShortDate, isIsoDate } from '../period';
import type { EventTilesBlock } from '../types';
import { blockValidator } from '../validate';
import { TABLE, joinNames, present } from './shared';

/** Up to four upcoming events as big day-of-month tiles on the ink band ("at a glance"). */
export const eventTilesBlock = defineBlock<EventTilesBlock>({
  type: 'event_tiles',
  label: 'Event tiles',
  description: 'Up to four upcoming events as big date tiles.',
  group: 'content',
  create: () => ({ heading: 'Upcoming events', items: [] }),
  validate: (block, path) =>
    blockValidator(block, path, 'event_tiles')
      .string('heading')
      .array(
        'items',
        {
          label: 'events',
          max: LIMITS.eventTiles,
          tooMany: `Pick up to ${LIMITS.eventTiles} events for the event tiles.`,
        },
        (item) => {
          item
            .string('title', { label: 'event title' })
            .isoDate('date', { label: 'event date' })
            .string('time', { optional: true })
            .string('location', { optional: true })
            .string('url', { optional: true, label: 'link' })
            .string('ref', { optional: true, label: 'source reference' });
        },
      ).issues,
  issues: issuesFrom((block) =>
    block.items.length > LIMITS.eventTiles
      ? [
          {
            code: 'too_many_events',
            message: `Choose at most ${LIMITS.eventTiles} events.`,
            values: { max: LIMITS.eventTiles },
          },
        ]
      : [],
  ),
  summary: (block) => joinNames(block.items.map((item) => item.title)) || block.heading,
  render(block, ctx) {
    const items = block.items.slice(0, LIMITS.eventTiles);
    if (items.length === 0) return '';
    const heading = block.heading.trim();
    if (heading) ctx.text(heading.toUpperCase());
    const width = Math.floor(100 / items.length);
    // Two tiles still fit side by side on a phone; three or four become rows.
    const stack = items.length > 2 ? ` class="${ctx.classes.stack}"` : '';
    const cells = items
      .map((item) => {
        // The date is already the organisation's own calendar date: no time-zone arithmetic.
        const day = isIsoDate(item.date) ? String(Number(item.date.slice(8, 10))) : '';
        const moment = [
          formatShortDate(item.date, ctx.labels.months),
          ...present(item.time, item.location),
        ]
          .filter(Boolean)
          .join(' · ');
        const href = item.url?.trim() ? ctx.url(item.url) : '';
        ctx.text(moment ? `${moment} — ${item.title}` : item.title, ...(href ? [href] : []));
        const title = href
          ? `<a href="${ctx.escape(href)}" style="color:${ctx.palette.bandText};text-decoration:none;">${ctx.escape(item.title)}</a>`
          : ctx.escape(item.title);
        return (
          `<td${stack} width="${width}%" valign="top" align="center" style="padding:8px 6px;">` +
          (day
            ? `<p style="margin:0;font-family:${ctx.fonts.heading};font-size:${ctx.px(56)}px;line-height:1;color:${ctx.palette.tileDay};">${day}</p>`
            : '') +
          `<p style="margin:10px 0 4px 0;font-family:${ctx.fonts.heading};font-size:${ctx.px(18)}px;line-height:1.3;color:${ctx.palette.bandText};">${title}</p>` +
          (moment
            ? `<p style="margin:0;font-family:${ctx.fonts.body};font-size:${ctx.px(13)}px;color:${ctx.palette.bandMuted};">${ctx.escape(moment)}</p>`
            : '') +
          `</td>`
        );
      })
      .join('');
    ctx.text('');
    return ctx.section(
      block,
      (heading ? ctx.heading(block.heading, { color: ctx.palette.bandText }) : '') +
        `${TABLE}<tr>${cells}</tr></table>`,
      { background: ctx.palette.band },
    );
  },
});
