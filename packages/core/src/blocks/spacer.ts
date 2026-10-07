import { defineBlock } from '../definition';
import type { SpacerBlock } from '../types';
import { blockValidator } from '../validate';
import { TABLE } from './shared';

const SPACER_HEIGHT: Record<SpacerBlock['size'], number> = { small: 12, medium: 28, large: 56 };

/** Empty breathing room. */
export const spacerBlock = defineBlock<SpacerBlock>({
  type: 'spacer',
  label: 'Spacer',
  description: 'Empty breathing room, small to large.',
  group: 'layout',
  create: () => ({ size: 'medium' }),
  validate: (block, path) =>
    blockValidator(block, path, 'spacer').oneOf('size', ['small', 'medium', 'large']).issues,
  summary: (block) => block.size,
  render(block, ctx) {
    const height = SPACER_HEIGHT[block.size] ?? SPACER_HEIGHT.medium;
    return ctx.section(
      block,
      `${TABLE}<tr><td height="${height}" style="height:${height}px;font-size:0;line-height:0;">&nbsp;</td></tr></table>`,
      { padding: '0 32px' },
    );
  },
});
