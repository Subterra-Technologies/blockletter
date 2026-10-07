import { useId, useImperativeHandle, useRef, type ReactNode, type Ref } from 'react';
import { CircleAlertIcon, LockIcon } from 'lucide-react';
import {
  blockIssues,
  blockLabel,
  sourceFor,
  type BlockBase,
} from '@subterra-technologies/blockletter';
import { useEditorContext, useEditorDefinition } from '../editor/context';
import { StatusBadge } from '../ui/status-badge';

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
  const heading = useRef<HTMLHeadingElement>(null);
  const autoId = useId();
  const locked = readOnly ?? context.readOnly;
  // Name, warnings and form all come from the one definition the editor resolved, so a host
  // that overrides a built-in type never sees one block's form under another's name.
  const issues = definition ? blockIssues(block, [definition]) : [];
  const source = sourceFor(block, context.sources);

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
          {definition?.label ?? blockLabel(block.type, context.definitions)}
        </h2>
        {block.hidden || source ? (
          <div className="bl:flex bl:flex-wrap bl:gap-1.5">
            {block.hidden ? <StatusBadge tone="neutral">Hidden from email</StatusBadge> : null}
            {source ? <StatusBadge tone="info">Filled from {source.label}</StatusBadge> : null}
          </div>
        ) : null}
      </div>
      {locked ? (
        <p
          role="note"
          className="bl:flex bl:items-start bl:gap-2 bl:rounded-md bl:bg-muted bl:px-3 bl:py-2 bl:text-[0.8125rem] bl:text-muted-foreground"
        >
          <LockIcon aria-hidden="true" className="bl:mt-0.5 bl:size-4 bl:shrink-0" />
          <span>
            {readOnlyReason ?? 'This issue is read-only, so its content can’t be changed.'}
          </span>
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
          There is no editor for “{block.type}” blocks, so this block’s content can’t be changed
          here. It is kept as it is.
        </p>
      )}
    </div>
  );
}
