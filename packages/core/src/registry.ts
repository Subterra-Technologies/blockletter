import { builtInBlocks } from './blocks';
import { BLOCK_GROUPS, type BlockDefinition, type BlockGroup } from './definition';
import type { BlockBase, BlockStyle } from './types';

/**
 * Looking definitions up, and what the editor says about a block. Every function takes the
 * definitions in play (default `builtInBlocks`), so a host's own blocks are described exactly
 * like the built-in ones.
 */

/**
 * The definition for `type`. A later definition of the same type replaces an earlier one, so a
 * host can override a built-in block by appending its own.
 */
export function getDefinition(
  type: string,
  definitions: readonly BlockDefinition[] = builtInBlocks,
): BlockDefinition | undefined {
  for (let index = definitions.length - 1; index >= 0; index -= 1) {
    const definition = definitions[index];
    if (definition?.type === type) return definition;
  }
  return undefined;
}

/** "Event tiles" for `event_tiles`; the type itself when nothing defines it. */
export const blockLabel = (
  type: string,
  definitions: readonly BlockDefinition[] = builtInBlocks,
): string => getDefinition(type, definitions)?.label ?? type;

/**
 * One line for a block list: its label plus whatever text it carries — "Button · Learn more" —
 * clipped to 60 characters. Never throws, and needs no renderer.
 */
export function blockSummary(
  block: BlockBase,
  definitions: readonly BlockDefinition[] = builtInBlocks,
): string {
  const definition = getDefinition(block.type, definitions);
  const label = definition?.label ?? block.type;
  const detail = (definition?.summary?.(block) ?? '').replace(/\s+/g, ' ').trim();
  if (!detail) return label;
  return `${label} · ${detail.length > 60 ? `${detail.slice(0, 57)}…` : detail}`;
}

/** Soft warnings for the selected block ("Add alt text…"). Empty when it is fine. */
export const blockIssues = (
  block: BlockBase,
  definitions: readonly BlockDefinition[] = builtInBlocks,
): string[] => getDefinition(block.type, definitions)?.issues?.(block) ?? [];

/** Header and footer: at most one each, and the editor will not delete them. */
export const isStructural = (
  block: Pick<BlockBase, 'type'>,
  definitions: readonly BlockDefinition[] = builtInBlocks,
): boolean => getDefinition(block.type, definitions)?.structural === true;

export interface PaletteGroup {
  id: BlockGroup;
  label: string;
  items: BlockDefinition[];
}

const groupLabel = (id: string): string => {
  const words = id.replace(/[-_]+/g, ' ').trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

/**
 * The palette: definitions grouped Content, Layout, Graphics (then any group of a host's own), in
 * the order given, one per type, empty groups left out. Structural blocks are included; an editor
 * that already has a header or footer decides whether to offer another.
 */
export function paletteGroups(
  definitions: readonly BlockDefinition[] = builtInBlocks,
): PaletteGroup[] {
  const byType = new Map<string, BlockDefinition>();
  for (const definition of definitions) byType.set(definition.type, definition);
  const groups: PaletteGroup[] = BLOCK_GROUPS.map((group) => ({ ...group, items: [] }));
  for (const definition of byType.values()) {
    let group = groups.find((candidate) => candidate.id === definition.group);
    if (!group) {
      group = { id: definition.group, label: groupLabel(definition.group), items: [] };
      groups.push(group);
    }
    group.items.push(definition);
  }
  return groups.filter((group) => group.items.length > 0);
}

/** A block's appearance overrides in a line, for an appearance panel's header. */
export function styleSummary(style: BlockStyle | undefined): string {
  const parts: string[] = [];
  if (style?.background) parts.push(`background ${style.background}`);
  if (style?.textColor) parts.push(`text ${style.textColor}`);
  if (style?.align && style.align !== 'left') parts.push(style.align);
  if (style?.paddingY && style.paddingY !== 'normal') parts.push(`${style.paddingY} padding`);
  if (style?.fontSize && style.fontSize !== 'normal') parts.push(`${style.fontSize} text`);
  if (style?.fullWidth) parts.push('full width');
  if (style?.divider) parts.push('divider');
  return parts.length ? parts.join(' · ') : 'Brand defaults';
}
