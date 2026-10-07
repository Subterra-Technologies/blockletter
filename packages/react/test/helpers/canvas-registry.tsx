import {
  builtInBlocks,
  defineBlock,
  type BlockBase,
  type BuiltInBlockType,
} from '@subterra-technologies/blockletter';
import { PuzzleIcon } from 'lucide-react';
import { BUILT_IN_CANVASES } from '../../src/canvas/blocks';
import { defineEditorBlock, type EditorBlockDefinition } from '../../src/editor/types';
import { BUILT_IN_ICONS } from '../../src/palette/block-icons';

/** Stands in for the block editors, which the inspector provides. */
function StubEditor() {
  return null;
}

/**
 * The built-in blocks registered the way the editor will register them: the core definition, its
 * icon and its canvas drawing, with a stub where the block's form goes.
 */
export const CANVAS_DEFINITIONS: readonly EditorBlockDefinition[] = builtInBlocks.map(
  (definition) => {
    const type = definition.type as BuiltInBlockType;
    return {
      ...definition,
      icon: BUILT_IN_ICONS[type],
      Editor: StubEditor,
      Canvas: BUILT_IN_CANVASES[type],
    };
  },
);

/** A host's own block: no canvas drawing, so the canvas shows its email HTML. */
export interface ShoutBlock extends BlockBase<'shout'> {
  text: string;
}

export const SHOUT_DEFINITION: EditorBlockDefinition = defineEditorBlock<ShoutBlock>({
  ...defineBlock<ShoutBlock>({
    type: 'shout',
    label: 'Shout',
    description: 'A short line in capitals.',
    group: 'extras',
    create: () => ({ text: 'Hello' }),
    validate: () => [],
    render: (block, ctx) =>
      block.text.trim()
        ? ctx.section(
            block,
            `<p style="margin:0;font-family:${ctx.fonts.heading};color:${ctx.palette.heading};">${ctx.escape(block.text.toUpperCase())}</p>` +
              `<a href="https://example.org/shout" style="color:${ctx.palette.link};">Read the shout</a>` +
              // What a careless host block might pass through; the canvas must not run it.
              `<img src="x" alt="" onerror="window.__shouted = true">`,
          )
        : '',
  }),
  icon: PuzzleIcon,
  Editor: StubEditor,
});

export const shout = (text = 'Hello there'): ShoutBlock => ({
  id: 'shout-1',
  type: 'shout',
  hidden: false,
  text,
});
