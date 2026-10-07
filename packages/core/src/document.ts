import { builtInBlocks } from './blocks';
import type { BlockDefinition } from './definition';
import { newBlockId } from './ids';
import { getDefinition } from './registry';
import type {
  BlockBase,
  BlockOfType,
  BuiltInBlock,
  BuiltInBlockType,
  NewsletterDocument,
} from './types';
import { isRecord } from './validate';

/** A fresh, visible block of `type`, with its definition's default fields and a new id. */
export function createBlock<T extends BuiltInBlockType>(
  type: T,
  definitions?: readonly BlockDefinition[],
): BlockOfType<BuiltInBlock, T>;
export function createBlock<B extends BlockBase = BlockBase>(
  type: string,
  definitions?: readonly BlockDefinition[],
): B;
export function createBlock(
  type: string,
  definitions: readonly BlockDefinition[] = builtInBlocks,
): BlockBase {
  const definition = getDefinition(type, definitions);
  if (!definition) throw new Error(`There is no "${type}" block definition.`);
  return { ...definition.create(), id: newBlockId(type), type, hidden: false };
}

/** A version 1 document: blank subject, preheader and blocks unless `init` says otherwise. */
export function createDocument<B extends BlockBase = BuiltInBlock>(
  init: Partial<NewsletterDocument<B>> = {},
): NewsletterDocument<B> {
  return { subject: '', preheader: '', ...init, blocks: [...(init.blocks ?? [])], version: 1 };
}

/**
 * Reads a stored document, upgrading an older format to the current one. Version 1 is the
 * current format and comes back as it is; this checks only enough shape to know which version
 * it holds — `validateDocument` is the full check. Anything else throws.
 */
export function migrateDocument<B extends BlockBase = BuiltInBlock>(
  input: unknown,
): NewsletterDocument<B> {
  if (!isRecord(input) || !('version' in input)) {
    throw new TypeError('This is not a Blockletter document: it has no format version.');
  }
  // Future migrations go here, oldest first, each upgrading one version to the next, e.g.
  //   if (document.version === 1) document = fromVersion1(document);
  // so a version 1 document read by a later Blockletter arrives in that version's shape.
  if (input.version !== 1) {
    throw new Error(
      `Unsupported Blockletter document version ${JSON.stringify(input.version)}: this version of Blockletter reads version 1.`,
    );
  }
  if (!Array.isArray(input.blocks)) {
    throw new TypeError('This is not a Blockletter document: its blocks are not a list.');
  }
  return input as unknown as NewsletterDocument<B>;
}
