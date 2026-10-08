import { useId, useState } from 'react';
import { isHexColor } from '@subterra-technologies/blockletter';
import { useEditorMessages } from '../i18n/context';
import { describedBy, Hint } from '../inspector/editor-fields';
import { FieldError } from '../ui/field';
import { Input } from '../ui/input';

/**
 * One brand colour: the browser's own colour picker beside a hex box, and what the colour is for.
 * No picker library.
 *
 * The hex box applies on leaving it (or Enter), never half typed. A code it cannot read is not
 * applied: the box goes back to the colour in use and says why, so what the box shows is always
 * what will be saved. Emptying it restores the default colour.
 */
export function BrandColorField({
  label,
  hint,
  value,
  fallback,
  error,
  onChange,
}: {
  label: string;
  hint: string;
  value: string;
  /** What an emptied box restores. */
  fallback: string;
  /** A problem validation found with the stored colour. */
  error?: string;
  onChange: (value: string) => void;
}) {
  const words = useEditorMessages().colors;
  const id = useId();
  const labelId = `${id}-label`;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  const [draft, setDraft] = useState(value);
  const [seen, setSeen] = useState(value);
  const [rejected, setRejected] = useState('');
  if (value !== seen) {
    setSeen(value);
    setDraft(value);
    setRejected('');
  }

  function commit(): void {
    const raw = draft.trim();
    if (!raw) {
      setRejected('');
      setDraft(fallback);
      if (fallback !== value) onChange(fallback);
      return;
    }
    const hex = (raw.startsWith('#') ? raw : `#${raw}`).toLowerCase();
    if (isHexColor(hex)) {
      setRejected('');
      setDraft(hex);
      if (hex !== value) onChange(hex);
      return;
    }
    setRejected(words.rejected(raw, label, value));
    setDraft(value);
  }

  const message = rejected || error;

  return (
    <div role="group" aria-labelledby={labelId} className="bl:flex bl:min-w-0 bl:flex-col bl:gap-2">
      <span id={labelId} className="bl:text-sm bl:leading-snug bl:font-medium">
        {label}
      </span>
      <div className="bl:flex bl:items-center bl:gap-1.5">
        <input
          type="color"
          value={isHexColor(value) ? value.toLowerCase() : fallback}
          aria-label={words.picker(label)}
          aria-describedby={hintId}
          onChange={(event) => onChange(event.target.value)}
          className="bl:h-9 bl:w-10 bl:shrink-0 bl:cursor-pointer bl:rounded-md bl:border bl:border-input bl:bg-transparent bl:p-1 bl:outline-none bl:focus-visible:ring-[3px] bl:focus-visible:ring-ring/50 bl:disabled:cursor-not-allowed bl:disabled:opacity-50"
        />
        <Input
          type="text"
          spellCheck={false}
          autoComplete="off"
          value={draft}
          aria-label={words.hex(label)}
          aria-invalid={message ? true : undefined}
          aria-describedby={describedBy(hintId, message ? errorId : null)}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            // Inside the brand kit form: Enter applies the colour, it does not save the kit.
            if (event.key === 'Enter') {
              event.preventDefault();
              commit();
            }
          }}
          className="bl:min-w-0 bl:font-mono bl:text-[0.8125rem]"
        />
      </div>
      <Hint id={hintId}>{hint}</Hint>
      {message ? <FieldError id={errorId}>{message}</FieldError> : null}
    </div>
  );
}
