import {
  builtInBlocks,
  getDefinition,
  type BlockBase,
  type BlockDefinition,
  type BuiltInBlockType,
} from '@subterra-technologies/blockletter';
import type { BoundMessages } from './resolve';

/**
 * What the editor calls a block. A built-in block is named from the messages, so it is named in
 * the editor's language; a host's own block brings its own name. A host that gives a built-in
 * type a `label` (or `description`) of its own in its definition keeps it: only the words core
 * wrote are translated.
 */

const BUILT_IN = new Map<string, BlockDefinition>(
  builtInBlocks.map((definition) => [definition.type, definition]),
);

type BlockWords = BoundMessages['blocks'][BuiltInBlockType];

/** The messages' words for a built-in type, with the core definition they translate. */
function builtInWords(
  type: string,
  messages: BoundMessages,
): { core: BlockDefinition; words: BlockWords } | undefined {
  const core = BUILT_IN.get(type);
  return core ? { core, words: messages.blocks[type as BuiltInBlockType] } : undefined;
}

/** A definition's name and description, as the editor shows them. */
export function definitionText(
  definition: Pick<BlockDefinition, 'type' | 'label' | 'description'>,
  messages: BoundMessages,
): { label: string; description: string } {
  const builtIn = builtInWords(definition.type, messages);
  return {
    label:
      builtIn && definition.label === builtIn.core.label ? builtIn.words.label : definition.label,
    description:
      builtIn && definition.description === builtIn.core.description
        ? builtIn.words.description
        : definition.description,
  };
}

/** The name of a block type among `definitions`; the type itself when nothing defines it. */
export function blockName(
  type: string,
  definitions: readonly BlockDefinition[],
  messages: BoundMessages,
): string {
  const definition = getDefinition(type, definitions);
  return definition ? definitionText(definition, messages).label : type;
}

/**
 * A block's tooltip on the canvas: its name, then the text it carries (clipped to 60 characters,
 * as core's `blockSummary` clips it). A built-in block whose summary is words of core's own (a
 * column count, a divider's thickness) has them from the messages instead.
 */
export function blockTitle(
  block: BlockBase,
  definitions: readonly BlockDefinition[],
  messages: BoundMessages,
): string {
  const definition = getDefinition(block.type, definitions);
  const builtIn = builtInWords(block.type, messages);
  // A few blocks' words carry a summary of their own; the rest have none.
  const words = builtIn?.words as { summary?: unknown } | undefined;
  const own =
    typeof words?.summary === 'function' && definition?.summary === builtIn?.core.summary
      ? // Safe: the summary for this block's own type.
        (words.summary as (block: BlockBase) => string)
      : undefined;
  const detail = (own ? own(block) : (definition?.summary?.(block) ?? ''))
    .replace(/\s+/g, ' ')
    .trim();
  const name = definition ? definitionText(definition, messages).label : block.type;
  return messages.canvas.blockTitle(name, detail.length > 60 ? `${detail.slice(0, 57)}…` : detail);
}
