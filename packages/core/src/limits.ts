import type { BlockAlign, BlockFontSize, BlockPadding, SocialNetwork } from './types';

/**
 * The limits every document keeps, shared by validation, the editor's inline warnings and data
 * sources. They are what an email carries comfortably, not technical maximums: past 30 blocks or
 * four event tiles a newsletter stops being read, and Gmail starts clipping it.
 */
export const LIMITS = {
  maxBlocks: 30,
  maxTextLength: 5_000,
  eventTiles: 4,
  posts: 3,
  columns: [2, 3],
  stats: [2, 4],
  photos: [2, 6],
} as const;

/** The choices `BlockStyle` offers, in the order an appearance panel lists them. */
export const BLOCK_ALIGNMENTS: readonly BlockAlign[] = ['left', 'center', 'right'];
export const BLOCK_PADDINGS: readonly BlockPadding[] = ['none', 'tight', 'normal', 'loose'];
export const BLOCK_FONT_SIZES: readonly BlockFontSize[] = ['small', 'normal', 'large'];

/** Every network a social link may name. `website` is any other page, labelled by its host. */
export const SOCIAL_NETWORKS: readonly SocialNetwork[] = [
  'facebook',
  'instagram',
  'linkedin',
  'x',
  'youtube',
  'tiktok',
  'github',
  'website',
];

/** "5,000": a count for a message, the same in every locale the host runs in. */
export const formatCount = (value: number): string =>
  String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
