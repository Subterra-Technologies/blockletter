import { defineBlock } from '../definition';
import { splitParagraphs } from '../html';
import { issuesFrom } from '../issues';
import { LIMITS } from '../limits';
import type { ColumnsBlock } from '../types';
import { blockValidator } from '../validate';
import { ALT_TEXT_ISSUE, TABLE, gapCell, missingAlt, plural, tooLong } from './shared';

const [MIN_COLUMNS, MAX_COLUMNS] = LIMITS.columns;

/** Two or three side-by-side cards, each with an optional image, heading and link. */
export const columnsBlock = defineBlock<ColumnsBlock>({
  type: 'columns',
  label: 'Columns',
  description: 'Two or three side-by-side cards.',
  group: 'layout',
  create: () => ({
    columns: [
      { heading: 'First column', body: 'A sentence or two.' },
      { heading: 'Second column', body: 'A sentence or two.' },
    ],
  }),
  validate: (block, path) =>
    blockValidator(block, path, 'columns').array(
      'columns',
      {
        min: MIN_COLUMNS,
        max: MAX_COLUMNS,
        tooFew: `A columns block needs ${MIN_COLUMNS} or ${MAX_COLUMNS} columns.`,
        tooMany: `A columns block needs ${MIN_COLUMNS} or ${MAX_COLUMNS} columns.`,
      },
      (column) => {
        column
          .string('heading', { optional: true })
          .string('body', { label: 'column text' })
          .image('image', { optional: true })
          .string('alt', { optional: true, label: 'alt text' })
          .string('linkLabel', { optional: true, label: 'link text' })
          .string('linkUrl', { optional: true, label: 'link' });
      },
    ).issues,
  issues: issuesFrom((block) => [
    ...(block.columns.length < MIN_COLUMNS || block.columns.length > MAX_COLUMNS
      ? [
          {
            code: 'column_count',
            message: `Use ${MIN_COLUMNS} or ${MAX_COLUMNS} columns.`,
            values: { min: MIN_COLUMNS, max: MAX_COLUMNS },
          },
        ]
      : []),
    ...block.columns.flatMap((column) => tooLong('column_text', column.body)),
    ...(block.columns.some((column) => missingAlt(column.image, column.alt))
      ? [ALT_TEXT_ISSUE]
      : []),
  ]),
  summary: (block) => plural(block.columns.length, 'column'),
  render(block, ctx) {
    const columns = block.columns.slice(0, MAX_COLUMNS);
    if (columns.length === 0) return '';
    const count = columns.length;
    const width = Math.floor(100 / count);
    const columnPx = Math.floor((ctx.width.inner - (count - 1) * 16) / count);
    const cells = columns
      .map((column, index) => {
        const link = ctx.optionalLink(column.linkLabel, column.linkUrl);
        const heading = column.heading?.trim() ?? '';
        if (heading) ctx.text(column.heading ?? '');
        ctx.text(...splitParagraphs(column.body));
        if (link.text) ctx.text(link.text);
        const image = column.image
          ? ctx.imageOrPlaceholder(column.image, column.alt ?? '', columnPx, 110, { fill: true })
          : '';
        const last = index === count - 1;
        const stack = last ? ctx.classes.stack : `${ctx.classes.stack} ${ctx.classes.space}`;
        return (
          `<td class="${stack}" width="${width}%" valign="top" style="padding:0;">` +
          (image ? `<div style="margin:0 0 10px 0;">${image}</div>` : '') +
          (heading
            ? `<p style="margin:0 0 6px 0;font-family:${ctx.fonts.heading};font-size:${ctx.px(18)}px;line-height:1.3;color:${ctx.palette.heading};">${ctx.escape(column.heading ?? '')}</p>`
            : '') +
          ctx.paragraphs(column.body, `${ctx.bodyStyle()}margin:0 0 8px 0;`) +
          link.html +
          `</td>${last ? '' : gapCell(ctx, 16)}`
        );
      })
      .join('');
    ctx.text('');
    return ctx.section(block, `${TABLE}<tr>${cells}</tr></table>`);
  },
});
