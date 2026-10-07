import type { BlockDefinition } from '../definition';
import { articleBlock } from './article';
import { bannerBlock } from './banner';
import { buttonBlock } from './button';
import { calloutBlock } from './callout';
import { columnsBlock } from './columns';
import { datedListBlock } from './dated-list';
import { dividerBlock } from './divider';
import { eventTilesBlock } from './event-tiles';
import { footerBlock } from './footer';
import { headerBlock } from './header';
import { imageBlock } from './image';
import { imageTextBlock } from './image-text';
import { letterBlock } from './letter';
import { nameListBlock } from './name-list';
import { photoGridBlock } from './photo-grid';
import { postListBlock } from './post-list';
import { quoteBlock } from './quote';
import { sponsorsBlock } from './sponsors';
import { spacerBlock } from './spacer';
import { statsBlock } from './stats';
import { textBlock } from './text';

export {
  articleBlock,
  bannerBlock,
  buttonBlock,
  calloutBlock,
  columnsBlock,
  datedListBlock,
  dividerBlock,
  eventTilesBlock,
  footerBlock,
  headerBlock,
  imageBlock,
  imageTextBlock,
  letterBlock,
  nameListBlock,
  photoGridBlock,
  postListBlock,
  quoteBlock,
  spacerBlock,
  sponsorsBlock,
  statsBlock,
  textBlock,
};
export { sortDatedItems } from './dated-list';

/**
 * Every block Blockletter ships, in palette order: content from the masthead down to the footer,
 * then layout, then graphics. A host passes `[...builtInBlocks, ...its own]` to the renderer and
 * the editor; a later definition of the same type replaces the built-in one.
 */
export const builtInBlocks: readonly BlockDefinition[] = Object.freeze([
  // Content
  headerBlock,
  letterBlock,
  textBlock,
  eventTilesBlock,
  nameListBlock,
  sponsorsBlock,
  postListBlock,
  articleBlock,
  datedListBlock,
  calloutBlock,
  footerBlock,
  // Layout
  columnsBlock,
  imageTextBlock,
  buttonBlock,
  dividerBlock,
  spacerBlock,
  // Graphics
  bannerBlock,
  imageBlock,
  photoGridBlock,
  quoteBlock,
  statsBlock,
]);
