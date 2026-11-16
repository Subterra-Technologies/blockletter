import {
  builtInBlocks,
  overrideBlock,
  type BlockBase,
  type BlockOverrides,
  type BuiltInBlockType,
} from '@subterra-technologies/blockletter';
import { BUILT_IN_CANVASES } from './canvas/blocks';
import { defineEditorBlock, type EditorBlockDefinition } from './editor/types';
import { BUILT_IN_EDITORS } from './inspector/editors';
import { BUILT_IN_ICONS } from './palette/block-icons';

export { defineEditorBlock };

/**
 * Every block Blockletter ships, as the editor registers it: the core definition (how the block
 * starts, validates and renders) with its palette icon, its inspector form and its canvas drawing.
 * In core's palette order.
 *
 * A host adds its own blocks after these, `[...builtInEditorBlocks, myBlock]`, and passes the same
 * list (the core part of each is all it needs) to the renderer. A later definition of a type
 * replaces an earlier one, so a host can also restyle or re-edit a built-in block.
 */
export const builtInEditorBlocks: readonly EditorBlockDefinition[] = Object.freeze(
  builtInBlocks.map((definition) => {
    const type = definition.type as BuiltInBlockType;
    return Object.freeze({
      ...definition,
      icon: BUILT_IN_ICONS[type],
      Editor: BUILT_IN_EDITORS[type],
      Canvas: BUILT_IN_CANVASES[type],
    });
  }),
);

/** What `overrideEditorBlock` may replace: `overrideBlock`'s parts, and the icon, form and drawing. */
export type EditorBlockOverrides<B extends BlockBase> = BlockOverrides<B> &
  Partial<Pick<EditorBlockDefinition<B>, 'icon' | 'Editor' | 'Canvas'>>;

/**
 * An editor block definition with some of its parts replaced, as `overrideBlock` does for the core
 * part. A new `render` without a new `Canvas` drops the original drawing, so the canvas draws the
 * block from its new email HTML and shows what will be sent; give a `Canvas` to draw it yourself.
 * Pass the core part of the result (or the result itself) to the renderer as well.
 */
export function overrideEditorBlock<B extends BlockBase>(
  definition: EditorBlockDefinition<B>,
  overrides: EditorBlockOverrides<B>,
): EditorBlockDefinition<B> {
  const { icon, Editor, Canvas, ...core } = overrides;
  return {
    ...definition,
    ...overrideBlock(definition, core),
    icon: icon ?? definition.icon,
    Editor: Editor ?? definition.Editor,
    Canvas: 'Canvas' in overrides ? Canvas : overrides.render ? undefined : definition.Canvas,
  };
}
