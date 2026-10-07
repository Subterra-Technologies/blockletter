import { deepFreeze } from './util';

/**
 * The phone layout. The email is a fixed table layout that Outlook on Windows reads as it always
 * has; every other client gets a card that shrinks to the screen, and below 620px these classes
 * turn side-by-side cells into full-width rows. Nothing here applies on a desktop screen.
 */

/**
 * Class names for the phone layout, which the `<style>` block in the head switches on below
 * 620px (360px for the `…Narrow` ones). Desktop clients and Outlook never apply them, so the
 * table layout they see is unchanged; a host block uses them through `RenderContext.classes`.
 */
export const RESPONSIVE_CLASSES = deepFreeze({
  /** On a section `<td>` with side padding: 32px sides become 20px. `section` adds it. */
  pad: 'bl-pad',
  /** On each cell of a row that should become a column of full-width rows. */
  stack: 'bl-stack',
  /** On a spacer cell between stacked cells: hidden once they stack. */
  gap: 'bl-gap',
  /** On a stacked cell that needs space below it. */
  space: 'bl-space',
  /** On an image in a stacked cell that should grow to the cell's width. */
  fill: 'bl-fill',
  /** `stack` and `space` from 360px down, for rows that read fine side by side until then. */
  stackNarrow: 'bl-stack-xs',
  spaceNarrow: 'bl-space-xs',
});

/**
 * The only CSS outside inline styles: phone rules behind media queries. Kept small and plain
 * (class selectors, no comments, every declaration terminated) because Gmail drops the whole
 * block over a single error.
 */
export const RESPONSIVE_STYLE =
  '<style>' +
  '@media only screen and (max-width:620px){' +
  '.bl-pad{padding-left:20px !important;padding-right:20px !important;}' +
  '.bl-stack{display:block !important;width:100% !important;max-width:100% !important;box-sizing:border-box !important;}' +
  '.bl-gap{display:none !important;}' +
  '.bl-space{padding-bottom:16px !important;}' +
  '.bl-stack .bl-fill{max-width:100% !important;}' +
  '}' +
  '@media only screen and (max-width:360px){' +
  '.bl-stack-xs{display:block !important;width:100% !important;max-width:100% !important;box-sizing:border-box !important;}' +
  '.bl-space-xs{padding-bottom:12px !important;}' +
  '}' +
  '</style>';
