import { defineBlock } from '../definition';
import type { DividerBlock } from '../types';
import { blockValidator } from '../validate';
import { TABLE } from './shared';

/** A hairline in the border colour, or a thick rule in the accent. */
export const dividerBlock = defineBlock<DividerBlock>({
  type: 'divider',
  label: 'Divider',
  description: 'A hairline or thick rule between sections.',
  group: 'layout',
  create: () => ({ thickness: 'hairline' }),
  validate: (block, path) =>
    blockValidator(block, path, 'divider').oneOf('thickness', ['hairline', 'thick']).issues,
  summary: (block) => block.thickness,
  render(block, ctx) {
    const thick = block.thickness === 'thick';
    const height = thick ? 4 : 1;
    ctx.text('---', '');
    return ctx.section(
      block,
      `${TABLE}<tr><td height="${height}" style="height:${height}px;background:${thick ? ctx.palette.accent : ctx.palette.border};font-size:0;line-height:0;">&nbsp;</td></tr></table>`,
      { padding: '12px 32px' },
    );
  },
});
