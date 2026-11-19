import { useId, useImperativeHandle, useRef, type ReactNode, type Ref } from 'react';
import { CircleAlertIcon, LockIcon } from 'lucide-react';
import { blockIssueDetails, sourceFor, type BlockBase } from '@subterra-technologies/blockletter';
import { useEditorContext, useEditorDefinition } from '../editor/context';
import { blockName, definitionText } from '../i18n/blocks';
import { useEditorMessages } from '../i18n/context';
import { blockIssueText } from '../i18n/core-words';
import { StatusBadge } from '../ui/status-badge';
import { SelectField } from './editor-fields';

/** The "Fill from" choice for no source: a select's options cannot have an empty value. */
const BY_HAND = 'blockletter:by-hand';

/** What the editor calls once a block is picked, so keyboard users land in its fields. */
export interface BlockInspectorHandle {
  focusHeading: () => void;
}

export interface BlockInspectorProps {
  block: BlockBase;
  /** The whole next block; called only when something actually changed. */
  onChange: (block: BlockBase) => void;
  /** Disables every field. Defaults to the editor context's `readOnly`. */
  readOnly?: boolean;
  /** Replaces the read-only note, e.g. "This issue was sent, so…". */
  readOnlyReason?: ReactNode;
  /** The heading's id, for a panel the host labels with it. */
  headingId?: string;
  ref?: Ref<BlockInspectorHandle>;
}

/**
 * The content fields for the selected block: its name, whether it is hidden or filled from a
 * data source, anything worth fixing before it goes out, and the form its definition provides.
 * How the block looks is the Appearance panel's job.
 *
 * The form comes from the block's `EditorBlockDefinition.Editor`, exactly as a host's own blocks
 * get theirs: nothing here knows the built-in types. It is keyed by the block's id, so moving to
 * another block of the same type starts its form afresh rather than carrying over a half-typed
 * address or a row's place.
 *
 * The heading is focusable (`tabindex="-1"`) so the editor can move focus here when a block is
 * chosen on the canvas. The root is the `inspector` container its paired fields respond to.
 */
export function BlockInspector({
  block,
  onChange,
  readOnly,
  readOnlyReason,
  headingId,
  ref,
}: BlockInspectorProps) {
  const context = useEditorContext();
  const definition = useEditorDefinition(block.type);
  const m = useEditorMessages();
  const heading = useRef<HTMLHeadingElement>(null);
  const autoId = useId();
  const locked = readOnly ?? context.readOnly;
  // Name, warnings and form all come from the one definition the editor resolved, so a host
  // that overrides a built-in type never sees one block's form under another's name. A built-in
  // block's warnings come with codes, which word them in the editor's language.
  const issues = definition
    ? blockIssueDetails(block, [definition]).map((issue) => blockIssueText(issue, m))
    : [];
  const source = sourceFor(block, context.sources);
  // The host's sources that can fill this type of block: a list block can take one on here.
  const fillers = context.sources.filter((item) => item.blockType === block.type);
  const fillFrom = (id: string) => {
    const { source: _previous, ...rest } = block;
    onChange(id === BY_HAND ? rest : { ...rest, source: id });
  };

  // `preventScroll`: the canvas has already brought the chosen block into view, and focusing a
  // heading at the top of a long panel must not throw the reader back up the page.
  useImperativeHandle(
    ref,
    () => ({ focusHeading: () => heading.current?.focus({ preventScroll: true }) }),
    [],
  );

  const Editor = definition?.Editor;

  return (
    <div className="bl:@container/inspector bl:flex bl:min-w-0 bl:flex-col bl:gap-4">
      <div className="bl:flex bl:flex-col bl:gap-2">
        <h2
          ref={heading}
          id={headingId ?? autoId}
          tabIndex={-1}
          className="bl:text-[0.9375rem] bl:font-semibold bl:text-foreground bl:outline-none bl:focus-visible:underline bl:focus-visible:underline-offset-4"
        >
          {definition
            ? definitionText(definition, m).label
            : blockName(block.type, context.definitions, m)}
        </h2>
        {block.hidden || source ? (
          <div className="bl:flex bl:flex-wrap bl:gap-1.5">
            {block.hidden ? <StatusBadge tone="neutral">{m.common.hidden}</StatusBadge> : null}
            {source ? (
              <StatusBadge tone="info">{m.inspector.filledFrom(source.label)}</StatusBadge>
            ) : null}
          </div>
        ) : null}
      </div>
      {locked ? (
        <p
          role="note"
          className="bl:flex bl:items-start bl:gap-2 bl:rounded-md bl:bg-muted bl:px-3 bl:py-2 bl:text-[0.8125rem] bl:text-muted-foreground"
        >
          <LockIcon aria-hidden="true" className="bl:mt-0.5 bl:size-4 bl:shrink-0" />
          <span>{readOnlyReason ?? m.inspector.readOnly}</span>
        </p>
      ) : null}
      {issues.length ? (
        // The alert wraps the list: a list given the alert role stops being a list.
        <div
          role="alert"
          className="bl:rounded-md bl:border bl:border-warning/30 bl:bg-warning-soft bl:px-3 bl:py-2 bl:text-[0.8125rem] bl:text-warning"
        >
          <ul className="bl:flex bl:flex-col bl:gap-1">
            {issues.map((issue, index) => (
              <li key={index} className="bl:flex bl:items-start bl:gap-2">
                <CircleAlertIcon aria-hidden="true" className="bl:mt-0.5 bl:size-4 bl:shrink-0" />
                {issue}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {fillers.length > 0 && !locked ? (
        <SelectField
          label={m.inspector.fillFrom}
          help={source ? m.inspector.fillFromHelp : undefined}
          value={source?.id ?? BY_HAND}
          onChange={fillFrom}
          options={[
            { value: BY_HAND, label: m.inspector.fillFromNone },
            ...fillers.map((item) => ({ value: item.id, label: item.label })),
          ]}
        />
      ) : null}
      {Editor ? (
        <Editor
          key={block.id}
          block={block}
          readOnly={locked}
          onChange={(next) => {
            if (!locked) onChange(next);
          }}
        />
      ) : (
        <p
          role="note"
          className="bl:rounded-md bl:border bl:border-dashed bl:px-3 bl:py-2 bl:text-[0.8125rem] bl:text-muted-foreground"
        >
          {m.inspector.noEditor(block.type)}
        </p>
      )}
    </div>
  );
}
