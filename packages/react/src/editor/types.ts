import type { ReactNode } from 'react';
import type {
  BlockBase,
  BlockDefinition,
  BrandKit,
  FieldMap,
  ImageRef,
  Palette,
  RenderLabels,
  RenderOptions,
} from '@subterra-technologies/blockletter';
import { createFieldsEditor, type FieldEditors } from '../inspector/fields-form';

/** What every block's inspector form receives. */
export interface BlockEditorProps<B extends BlockBase = BlockBase> {
  block: B;
  /**
   * The whole next block. Editors call it only when something actually changed. A method, so a
   * form for one block type still fits a list of definitions for any block (see `BlockComponent`).
   */
  onChange(block: B): void;
  /** Fields render disabled; nothing may emit. */
  readOnly: boolean;
}

/**
 * What a block's canvas drawing receives: the email's look for this block, so the canvas reads
 * like the email without being the email's HTML. The same values the renderer hands a block's
 * `render` in its `RenderContext`, so a drawing and its email cannot drift apart.
 */
export interface BlockCanvasProps<B extends BlockBase = BlockBase> {
  block: B;
  /** The brand's palette with this block's `style.textColor` applied, as the renderer paints it. */
  palette: Palette;
  /** CSS font stacks for the email's headings and body. */
  fonts: { heading: string; body: string };
  brand: BrandKit;
  /** A font size in px, scaled by the block's `style.fontSize` (the renderer's `px`). */
  px: (size: number) => number;
  /**
   * The address the renderer gives an image (`resolveImageUrl`, else its `url`): an http(s) one,
   * or a `blob:` / base64 `data:image` upload not stored yet, which a preview can show but no
   * inbox can. Undefined otherwise, because the email shows its placeholder then too.
   */
  image: (ref: ImageRef | undefined) => string | undefined;
  /** The words the renderer writes itself ("Read more", month names…), in the host's language. */
  labels: RenderLabels;
  /** The render options in effect, for a drawing that needs more (the footer's opt-out links). */
  options: Readonly<RenderOptions>;
}

/**
 * A function component a definition supplies for its own block type. Its props are compared
 * bivariantly (React's own trick for its event handlers), so a definition for one type, which the
 * editor only ever renders with blocks of that type, still fits a list of definitions for any
 * block, and a registry needs no casts.
 */
export type BlockComponent<P> = { bivarianceHack(props: P): ReactNode }['bivarianceHack'];

/** Lucide icons fit; so does any component that takes a class name. */
export type BlockIcon = BlockComponent<{ className?: string; 'aria-hidden'?: boolean | 'true' }>;

/**
 * A core `BlockDefinition` plus the editor's UI for it. Built-in blocks are registered this way
 * too; a host adds its own with `defineEditorBlock`.
 */
export interface EditorBlockDefinition<B extends BlockBase = BlockBase> extends BlockDefinition<B> {
  icon: BlockIcon;
  /** The Block tab's form for this type. */
  Editor: BlockComponent<BlockEditorProps<B>>;
  /** How the canvas draws it. Absent: the canvas shows the block's own email HTML. */
  Canvas?: BlockComponent<BlockCanvasProps<B>>;
}

/**
 * A block declared with fields (see core's `defineBlock`) plus its icon, for `defineEditorBlock`:
 * its form can be left to the editor, which builds one from the fields.
 */
export type FieldEditorBlockInput<B extends BlockBase> = BlockDefinition<B> & {
  readonly fields: FieldMap;
  icon: BlockIcon;
  /** A form of your own instead of the one built from the fields. */
  Editor?: BlockComponent<BlockEditorProps<B>>;
  Canvas?: BlockComponent<BlockCanvasProps<B>>;
  /**
   * Controls of your own in the built form, by field key (`speakers.photo` for a list item's
   * field): one for each field of your own kind (`field.custom`), or to replace any other.
   */
  fieldEditors?: FieldEditors;
};

/**
 * Declares an editor block, keeping a host block's types checked end to end. A block declared with
 * fields needs only its icon: `defineEditorBlock({ ...jobBlock, icon: BriefcaseIcon })` builds its
 * form from the fields, and the canvas draws its email HTML.
 */
export function defineEditorBlock<B extends BlockBase>(
  definition: EditorBlockDefinition<B>,
): EditorBlockDefinition<B>;
export function defineEditorBlock<B extends BlockBase>(
  definition: FieldEditorBlockInput<B>,
): EditorBlockDefinition<B>;
export function defineEditorBlock<B extends BlockBase>(
  definition: EditorBlockDefinition<B> | FieldEditorBlockInput<B>,
): EditorBlockDefinition<B> {
  if (!('fieldEditors' in definition) && definition.Editor) {
    return definition as EditorBlockDefinition<B>;
  }
  const { fieldEditors, ...rest } = definition as FieldEditorBlockInput<B>;
  if (rest.Editor) return rest as EditorBlockDefinition<B>;
  if (!rest.fields) {
    throw new Error(`The "${rest.type}" block needs an Editor, or fields to build one from.`);
  }
  return { ...rest, Editor: createFieldsEditor<B>(rest.fields, fieldEditors) };
}
