// The document model: blocks, documents, periods, templates, brand kit, data sources.
export * from './types';

// Block definitions (the plugin API)
export {
  BLOCK_GROUPS,
  defineBlock,
  type BlockDefinition,
  type BlockGroup,
  type RenderContext,
  type SectionOptions,
} from './definition';
export {
  builtInBlocks,
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
  sortDatedItems,
} from './blocks';
export { getDefinition, paletteGroups, type PaletteGroup } from './registry';

// Blocks and documents
export {
  blockIssueDetails,
  blockIssues,
  blockLabel,
  blockSummary,
  isStructural,
  styleSummary,
} from './registry';
export type { BlockIssue } from './issues';
export { createBlock, createDocument, migrateDocument } from './document';
export { newBlockId } from './ids';
export {
  duplicateBlock,
  ensureFooter,
  insertBlock,
  moveBlock,
  removeBlock,
  toggleHidden,
  updateBlock,
} from './list';
export {
  BLOCK_ALIGNMENTS,
  BLOCK_FONT_SIZES,
  BLOCK_PADDINGS,
  LIMITS,
  SOCIAL_NETWORKS,
} from './limits';
export { assertValidDocument, validateDocument } from './validate-document';
export {
  BlockletterValidationError,
  ObjectValidator,
  blockValidator,
  validateObject,
  type ChoiceOptions,
  type ColorOptions,
  type FieldOptions,
  type ImageProblem,
  type ListOptions,
  type TextOptions,
  type ValidatorOptions,
} from './validate';

// Rendering
export {
  DEFAULT_LABELS,
  FONT_SCALE,
  PADDING_Y,
  renderBlock,
  renderEmail,
  type RenderedBlock,
  type RenderedEmail,
  type RenderLabels,
  type RenderOptions,
  type RenderWarning,
} from './render';
export { absoluteUrl, escapeHtml, splitParagraphs } from './html';
export { RESPONSIVE_CLASSES } from './responsive';

// Brand kit and palette
export {
  DEFAULT_BRAND,
  DEFAULT_PALETTE,
  FONT_STACKS,
  contrastRatio,
  fontStack,
  labelOn,
  readable,
  relativeLuminance,
  resolvePalette,
  validateBrandKit,
  type Palette,
} from './brand';
export { HEX_COLOR, isHexColor } from './validate';

// Rich text
export {
  htmlToText,
  inlineRichTextStyles,
  isSafeLinkHref,
  plainTextToHtml,
  sanitizeHtml,
} from './rich-text';

// Periods, tokens and templates
export {
  AP_MONTHS,
  DEFAULT_LOOKAHEAD_DAYS,
  MONTH_NAMES,
  PERIOD_ERROR_MESSAGES,
  PERIOD_PRESETS,
  addDays,
  applyPeriodPreset,
  compareIsoDates,
  coversDate,
  formatShortDate,
  isInLookahead,
  isIsoDate,
  monthLabel,
  monthPeriod,
  parseShortDate,
  periodErrorCodes,
  periodErrors,
  periodLabel,
  presetRange,
  suggestPeriod,
  todayIn,
  validatePeriod,
  type PeriodErrorCode,
  type PeriodErrorCodes,
  type PeriodErrors,
  type PeriodPreset,
  type PeriodRules,
} from './period';
export { fillBlockTokens, fillTokens, periodTokens } from './tokens';
export { BUILT_IN_TEMPLATES, applyTemplate, templateFromDocument } from './templates';

// Data sources
export { assembleDocument, refreshBlock, sourceFor, type AssembleOptions } from './sources';
