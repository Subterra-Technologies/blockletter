import { defineBlock } from '../definition';
import { issuesFrom } from '../issues';
import type { QuoteBlock } from '../types';
import { blockValidator } from '../validate';
import { TABLE, tooLong } from './shared';

/** One pull quote in large italic type beside an accent rule, with an attribution. */
export const quoteBlock = defineBlock<QuoteBlock>({
  type: 'quote',
  label: 'Quote',
  description: 'One pull quote in large type, with an attribution.',
  group: 'graphics',
  create: () => ({ quote: 'A few words worth repeating, in large type.', attribution: '' }),
  validate: (block, path) =>
    blockValidator(block, path, 'quote').string('quote').string('attribution', { optional: true })
      .issues,
  issues: issuesFrom((block) => tooLong('quote', block.quote)),
  summary: (block) => block.quote,
  render(block, ctx) {
    const quote = block.quote.trim();
    if (!quote) return '';
    const attribution = block.attribution?.trim() ?? '';
    ctx.text(`“${quote}”`, ...(attribution ? [`— ${attribution}`] : []), '');
    return ctx.section(
      block,
      `${TABLE}<tr>` +
        `<td width="4" style="width:4px;background:${ctx.palette.accent};font-size:0;line-height:0;">&nbsp;</td>` +
        `<td style="padding:0 0 0 18px;">` +
        `<p style="margin:0;font-family:${ctx.fonts.heading};font-size:${ctx.px(21)}px;line-height:1.45;font-style:italic;color:${ctx.palette.heading};">&ldquo;${ctx.escape(quote)}&rdquo;</p>` +
        (attribution
          ? `<p style="${ctx.smallStyle()}margin-top:10px;">&mdash; ${ctx.escape(attribution)}</p>`
          : '') +
        `</td></tr></table>`,
      { background: ctx.palette.soft },
    );
  },
});
