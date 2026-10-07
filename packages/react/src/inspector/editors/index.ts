import type { BuiltInBlock, BuiltInBlockType } from '@subterra-technologies/blockletter';
import type { BlockComponent, BlockEditorProps } from '../../editor/types';
import { ArticleEditor, ImageEditor, LetterEditor } from './content';
import { BannerEditor, ImageTextEditor, PhotoGridEditor, StatsEditor } from './graphics';
import { ButtonEditor, ColumnsEditor, DividerEditor, QuoteEditor, SpacerEditor } from './layout';
import {
  DatedListEditor,
  EventTilesEditor,
  NameListEditor,
  PostListEditor,
  SponsorsEditor,
} from './lists';
import { CalloutEditor, FooterEditor, HeaderEditor, TextEditor } from './simple';

export { ArticleEditor, ImageEditor, LetterEditor } from './content';
export { BannerEditor, ImageTextEditor, PhotoGridEditor, StatsEditor } from './graphics';
export { ButtonEditor, ColumnsEditor, DividerEditor, QuoteEditor, SpacerEditor } from './layout';
export {
  DatedListEditor,
  EventTilesEditor,
  NameListEditor,
  PostListEditor,
  SponsorsEditor,
} from './lists';
export { CalloutEditor, FooterEditor, HeaderEditor, TextEditor } from './simple';

/** The inspector form for each built-in block type, typed to that type's block. */
export type BuiltInEditors = {
  readonly [T in BuiltInBlockType]: BlockComponent<
    BlockEditorProps<Extract<BuiltInBlock, { type: T }>>
  >;
};

/**
 * Every built-in block's editor, by type. A registry pairs each core definition with its entry
 * here (plus an icon) to make the editor's `EditorBlockDefinition`s; nothing dispatches on these
 * types directly. A type missing here fails to compile, so a new built-in block cannot ship
 * without its form.
 */
export const BUILT_IN_EDITORS: BuiltInEditors = {
  header: HeaderEditor,
  letter: LetterEditor,
  event_tiles: EventTilesEditor,
  sponsors: SponsorsEditor,
  name_list: NameListEditor,
  callout: CalloutEditor,
  post_list: PostListEditor,
  article: ArticleEditor,
  dated_list: DatedListEditor,
  text: TextEditor,
  image: ImageEditor,
  image_text: ImageTextEditor,
  columns: ColumnsEditor,
  banner: BannerEditor,
  button: ButtonEditor,
  divider: DividerEditor,
  spacer: SpacerEditor,
  quote: QuoteEditor,
  stats: StatsEditor,
  photo_grid: PhotoGridEditor,
  footer: FooterEditor,
};
