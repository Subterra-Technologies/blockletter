import { builtInBlocks } from './blocks';
import type { BlockDefinition } from './definition';
import { LIMITS } from './limits';
import { periodErrors } from './period';
import { getDefinition } from './registry';
import type {
  BlockBase,
  BuiltInBlock,
  IssuePeriod,
  NewsletterDocument,
  ValidationIssue,
} from './types';
import { BlockletterValidationError, isRecord, joinPath, validateObject } from './validate';

/**
 * Every problem with an untrusted document, in the order a person would read them: the format
 * version, subject and preheader, the period, the block list, then each block as its own
 * definition checks it. An empty array means the document is valid.
 */
export function validateDocument(
  doc: unknown,
  definitions: readonly BlockDefinition[] = builtInBlocks,
): ValidationIssue[] {
  if (!isRecord(doc)) {
    return [{ code: 'invalid_document', message: 'This is not a newsletter document.' }];
  }
  const check = validateObject(doc);
  if (doc.version !== 1) {
    check.add(
      'unsupported_version',
      'This newsletter was saved in a format this version of Blockletter cannot read.',
      'version',
    );
  }
  check
    .string('subject', { max: LIMITS.maxTextLength })
    .string('preheader', { max: LIMITS.maxTextLength, label: 'preview text' });

  if (doc.period !== undefined) {
    if (!isRecord(doc.period)) {
      check.add('invalid_period', 'The period is not in a format Blockletter can read.', 'period');
    } else {
      const errors = periodErrors(doc.period as unknown as IssuePeriod);
      for (const key of ['start', 'end', 'lookaheadEnd'] as const) {
        const message = errors[key];
        if (message) check.add('invalid_period', message, `period/${key}`);
      }
    }
  }

  const blocks = doc.blocks;
  if (!Array.isArray(blocks)) {
    return check.add('invalid_type', 'The blocks should be a list.', 'blocks').issues;
  }
  if (blocks.length > LIMITS.maxBlocks) {
    check.add(
      'too_many_blocks',
      `Keep the newsletter to ${LIMITS.maxBlocks} blocks or fewer.`,
      'blocks',
      { max: LIMITS.maxBlocks },
    );
  }
  const ids = new Set<string>();
  blocks.forEach((block: unknown, index) => {
    const path = joinPath('blocks', index);
    const id = isRecord(block) && typeof block.id === 'string' ? block.id : '';
    if (id.trim()) {
      if (ids.has(id)) {
        check.issues.push({
          code: 'duplicate_block_id',
          message: 'Block ids must be unique.',
          blockId: id,
          path: `${path}/id`,
        });
      }
      ids.add(id);
    }
    const type = isRecord(block) ? block.type : undefined;
    if (typeof type !== 'string') {
      check.addAt(path, 'invalid_type', 'This block has no type Blockletter can read.');
      return;
    }
    const definition = getDefinition(type, definitions);
    if (!definition) {
      check.issues.push({
        code: 'unknown_block_type',
        message: `"${type}" is not a block this newsletter knows how to show.`,
        ...(id ? { blockId: id } : {}),
        path: `${path}/type`,
      });
      return;
    }
    check.issues.push(...definition.validate(block, path));
  });
  return check.issues;
}

/** Throws a `BlockletterValidationError` listing every problem unless the document is valid. */
export function assertValidDocument<B extends BlockBase = BuiltInBlock>(
  doc: unknown,
  definitions?: readonly BlockDefinition[],
): asserts doc is NewsletterDocument<B> {
  const issues = validateDocument(doc, definitions);
  if (issues.length > 0) throw new BlockletterValidationError(issues);
}
