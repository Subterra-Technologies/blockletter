import type {
  BlockOfType,
  BuiltInBlock,
  BuiltInBlockType,
} from '@subterra-technologies/blockletter';
import type { BlockCanvasProps, BlockComponent } from '../../editor/types';
import { ArticleCanvas } from './article';
import { BannerCanvas } from './banner';
import { ButtonCanvas } from './button';
import { CalloutCanvas } from './callout';
import { ColumnsCanvas } from './columns';
import { DatedListCanvas } from './dated-list';
import { DividerCanvas } from './divider';
import { EventTilesCanvas } from './event-tiles';
import { FooterCanvas } from './footer';
import { HeaderCanvas } from './header';
import { ImageCanvas } from './image';
import { ImageTextCanvas } from './image-text';
import { LetterCanvas } from './letter';
import { NameListCanvas } from './name-list';
import { PhotoGridCanvas } from './photo-grid';
import { PostListCanvas } from './post-list';
import { QuoteCanvas } from './quote';
import { SpacerCanvas } from './spacer';
import { SponsorsCanvas } from './sponsors';
import { StatsCanvas } from './stats';
import { TextCanvas } from './text';

export {
  ArticleCanvas,
  BannerCanvas,
  ButtonCanvas,
  CalloutCanvas,
  ColumnsCanvas,
  DatedListCanvas,
  DividerCanvas,
  EventTilesCanvas,
  FooterCanvas,
  HeaderCanvas,
  ImageCanvas,
  ImageTextCanvas,
  LetterCanvas,
  NameListCanvas,
  PhotoGridCanvas,
  PostListCanvas,
  QuoteCanvas,
  SpacerCanvas,
  SponsorsCanvas,
  StatsCanvas,
  TextCanvas,
};

/** Each built-in block's canvas drawing, typed by the block it draws. */
export type BuiltInCanvases = {
  readonly [T in BuiltInBlockType]: BlockComponent<BlockCanvasProps<BlockOfType<BuiltInBlock, T>>>;
};

/**
 * How the canvas draws every block Blockletter ships. The registry pairs each with its core
 * definition, icon and editor; a host's own block brings its drawing the same way, or is drawn
 * from its email HTML.
 */
export const BUILT_IN_CANVASES: BuiltInCanvases = Object.freeze({
  header: HeaderCanvas,
  letter: LetterCanvas,
  event_tiles: EventTilesCanvas,
  sponsors: SponsorsCanvas,
  name_list: NameListCanvas,
  callout: CalloutCanvas,
  post_list: PostListCanvas,
  article: ArticleCanvas,
  dated_list: DatedListCanvas,
  text: TextCanvas,
  image: ImageCanvas,
  image_text: ImageTextCanvas,
  columns: ColumnsCanvas,
  banner: BannerCanvas,
  button: ButtonCanvas,
  divider: DividerCanvas,
  spacer: SpacerCanvas,
  quote: QuoteCanvas,
  stats: StatsCanvas,
  photo_grid: PhotoGridCanvas,
  footer: FooterCanvas,
});
