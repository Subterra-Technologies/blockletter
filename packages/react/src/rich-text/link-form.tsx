import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useEditorMessages } from '../i18n/context';
import { TextField } from '../inspector/editor-fields';
import { Button } from '../ui/button';
import { linkAddress } from './link-address';

export interface LinkFormProps {
  id: string;
  /** The selection is already a link: its address is filled in, and it can be removed. */
  editing: boolean;
  /** Nothing is selected, so the form asks for the words to link as well. */
  needsText: boolean;
  href: string;
  onApply: (href: string, text: string) => void;
  onRemove: () => void;
  onCancel: () => void;
}

/**
 * Adds, changes or removes a link, under the formatting toolbar rather than in a prompt or a
 * popover, so it works the same at any width and reads in order. The address is checked with
 * `isSafeLinkHref` before anything changes; Enter in a field applies, and Escape (or Cancel)
 * closes the form and puts the focus back in the text.
 *
 * Not a `<form>`: the editor may sit inside a host's own form, which a nested one would break.
 */
export function LinkForm({
  id,
  editing,
  needsText,
  href,
  onApply,
  onRemove,
  onCancel,
}: LinkFormProps) {
  const m = useEditorMessages();
  const words = m.formatting;
  const titleId = `${id}-title`;
  const [address, setAddress] = useState(href);
  const [text, setText] = useState('');
  const [error, setError] = useState<string>();
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    input.current?.focus();
  }, []);

  function apply(): void {
    const result = linkAddress(address, m);
    if ('error' in result) {
      setError(result.error);
      input.current?.focus();
      return;
    }
    onApply(result.href, text);
  }

  const applyOnEnter = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    apply();
  };

  return (
    // A draft until it is applied, so undo while typing an address is the browser's.
    <div
      id={id}
      role="group"
      aria-labelledby={titleId}
      data-bl-draft=""
      // Escape closes the form, not the pane around it: the editor's one-pane layout leaves its
      // Edit pane on an Escape nothing has handled, and capture comes first.
      onKeyDownCapture={(event) => {
        if (event.key !== 'Escape') return;
        event.preventDefault();
        onCancel();
      }}
      className="bl:flex bl:min-w-0 bl:flex-col bl:gap-3 bl:rounded-md bl:border bl:bg-background bl:p-3 bl:shadow-xs"
    >
      <p id={titleId} className="bl:text-sm bl:font-medium">
        {editing ? words.editLink : words.addLink}
      </p>
      <TextField
        label={words.address}
        type="url"
        placeholder={m.common.webAddress}
        autoComplete="url"
        spellCheck={false}
        value={address}
        error={error}
        inputRef={input}
        onKeyDown={applyOnEnter}
        onChange={(next) => {
          setAddress(next);
          setError(undefined);
        }}
      />
      {needsText ? (
        <TextField
          label={words.textToShow}
          help={words.textToShowHelp}
          value={text}
          onKeyDown={applyOnEnter}
          onChange={setText}
        />
      ) : null}
      <div className="bl:flex bl:flex-wrap bl:gap-2">
        <Button type="button" size="sm" onClick={apply}>
          {editing ? words.update : words.apply}
        </Button>
        {editing ? (
          <Button type="button" size="sm" variant="outline" onClick={onRemove}>
            {words.removeLink}
          </Button>
        ) : null}
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          {m.common.cancel}
        </Button>
      </div>
    </div>
  );
}
