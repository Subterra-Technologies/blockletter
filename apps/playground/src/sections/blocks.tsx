import { useMemo, useState } from 'react';
import {
  BLOCK_GROUPS,
  LIMITS,
  type BuiltInBlockType,
  type ListBlockType,
} from '@subterra-technologies/blockletter';
import { builtInEditorBlocks } from '@subterra-technologies/blockletter-react';
import { CodeBlock } from '../components/code-block';
import type { Playground } from '../use-playground';
import { BLOCK_SNIPPET } from './snippets';

/** The blocks a data source can fill: the list blocks. */
const DATA_BOUND = new Set<string>([
  'event_tiles',
  'sponsors',
  'name_list',
  'post_list',
  'dated_list',
] satisfies ListBlockType[]);

export function Blocks({ playground }: { playground: Playground }) {
  const [status, setStatus] = useState('');
  const blocks = playground.issue?.document.blocks ?? [];
  const full = blocks.length >= LIMITS.maxBlocks;

  const groups = useMemo(
    () =>
      BLOCK_GROUPS.map((group) => ({
        ...group,
        items: builtInEditorBlocks.filter((definition) => definition.group === group.id),
      })),
    [],
  );

  const add = (type: BuiltInBlockType, label: string) => {
    setStatus(
      playground.addBlock(type)
        ? `${label} added to the issue, just above its footer.`
        : `${label} could not be added: the issue already has one, or it is full.`,
    );
  };

  return (
    <section id="blocks" className="pg-section" aria-labelledby="blocks-heading">
      <div className="pg-shell pg-split">
        <div className="pg-prose">
          <h2 id="blocks-heading">Blocks</h2>
          <p>
            An issue is an ordered list of blocks. Blockletter ships 21 of them, and every one is a
            plain <code>BlockDefinition</code>: its fields and defaults, how to validate untrusted
            input, and the email HTML it renders. Nothing in the renderer or the editor switches on
            a built-in type, so a block of your own is registered exactly the same way.
          </p>
          <p>
            Add any of them to the issue open in the editor. The ones marked{' '}
            <em>fills from data</em> take their items from a data source.
          </p>
          <CodeBlock title="A block of your own" code={BLOCK_SNIPPET} />
        </div>

        <div className="pg-catalog">
          <p className="pg-status" role="status">
            {status}
            {status ? (
              <>
                {' '}
                <a href="#editor">See it in the editor</a>
              </>
            ) : null}
          </p>
          <div className="pg-catalog__groups">
            {groups.map((group) => (
              <div key={group.id} className="pg-catalog__group">
                <h3 id={`blocks-${group.id}`}>{group.label}</h3>
                <ul aria-labelledby={`blocks-${group.id}`}>
                  {group.items.map((definition) => {
                    const Icon = definition.icon;
                    const taken =
                      definition.structural === true &&
                      blocks.some((block) => block.type === definition.type);
                    return (
                      <li key={definition.type} className="pg-block">
                        <Icon aria-hidden="true" className="pg-block__icon" />
                        <div className="pg-block__text">
                          <p className="pg-block__name">
                            {definition.label}
                            {DATA_BOUND.has(definition.type) ? (
                              <span className="pg-tag">fills from data</span>
                            ) : null}
                          </p>
                          <p className="pg-block__description">{definition.description}</p>
                        </div>
                        <button
                          type="button"
                          className="pg-button pg-button--quiet"
                          disabled={!playground.issue || full || taken}
                          onClick={() => add(definition.type as BuiltInBlockType, definition.label)}
                        >
                          Add
                          <span className="pg-visually-hidden">
                            {' '}
                            {definition.label} to the issue
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
