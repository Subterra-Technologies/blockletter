import { useState } from 'react';
import { CheckIcon, XIcon } from 'lucide-react';
import { isHexColor, labelOn } from '@subterra-technologies/blockletter';
import { useEditorMessages } from '../i18n/context';
import { cn } from '../lib/cn';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Hint } from '../inspector/editor-fields';

/** One brand-kit swatch offered next to the colour picker. */
export interface ColorSwatch {
  label: string;
  value: string;
}

export interface ColorFieldProps {
  label: string;
  /** Id of the native colour input; the hex box and the help line derive theirs from it. */
  controlId: string;
  /** The override, or `undefined` while the default applies. */
  value?: string;
  /** The colour in effect while nothing is overridden; seeds the picker. */
  fallback?: string;
  /** What the default is, for "Uses …" ("the brand kit's text colour"); default "the default". */
  fallbackLabel?: string;
  /** Replaces the override / default sentence, for a caller editing a value rather than an override. */
  help?: string;
  swatches?: readonly ColorSwatch[];
  disabled?: boolean;
  /** Emits a six-digit hex colour, or `undefined` when the override is cleared. */
  onValueChange: (value: string | undefined) => void;
}

/**
 * A colour control: brand-kit swatches, the browser's own colour picker and a hex box, plus a
 * reset that clears the override so the default applies again. No picker library.
 *
 * The hex box commits on blur, not on every keystroke, so a half-typed code is never applied.
 * Its draft follows `value` when that changes elsewhere (a swatch, a reset).
 */
export function ColorField({
  label,
  controlId,
  value,
  fallback = '#ffffff',
  fallbackLabel,
  help = '',
  swatches = [],
  disabled = false,
  onValueChange,
}: ColorFieldProps) {
  const words = useEditorMessages().colors;
  const [hexDraft, setHexDraft] = useState(value ?? '');
  const [seen, setSeen] = useState(value);
  if (value !== seen) {
    setSeen(value);
    setHexDraft(value ?? '');
  }

  const normalized = value?.toLowerCase() ?? '';

  function pick(candidate: string): void {
    if (isHexColor(candidate)) onValueChange(candidate);
  }

  function commitHex(): void {
    const raw = hexDraft.trim();
    if (!raw) {
      onValueChange(undefined);
      return;
    }
    const hex = raw.startsWith('#') ? raw : `#${raw}`;
    if (isHexColor(hex)) onValueChange(hex);
  }

  return (
    <div className="bl:flex bl:min-w-0 bl:flex-col bl:gap-2">
      <span id={`${controlId}-label`} className="bl:text-sm bl:leading-snug bl:font-medium">
        {label}
      </span>
      {swatches.length ? (
        <div
          role="group"
          aria-labelledby={`${controlId}-label`}
          className="bl:flex bl:flex-wrap bl:gap-1.5"
        >
          {swatches.map((swatch) => {
            const chosen = normalized === swatch.value.toLowerCase();
            return (
              <button
                key={`${swatch.label}-${swatch.value}`}
                type="button"
                aria-pressed={chosen}
                disabled={disabled}
                title={words.swatch(swatch.label, swatch.value)}
                onClick={() => pick(swatch.value)}
                className={cn(
                  'bl:flex bl:size-6 bl:items-center bl:justify-center bl:rounded-md bl:shadow-[inset_0_0_0_1px_rgba(0,0,0,0.15)] bl:outline-none bl:transition-shadow',
                  'bl:focus-visible:ring-[3px] bl:focus-visible:ring-ring/50 bl:disabled:opacity-50',
                  chosen && 'bl:ring-2 bl:ring-primary bl:ring-offset-1',
                )}
                style={{ backgroundColor: swatch.value }}
              >
                <span className="bl:sr-only">{words.swatch(swatch.label, swatch.value)}</span>
                {chosen ? (
                  <CheckIcon
                    aria-hidden="true"
                    className="bl:size-3.5"
                    style={{ color: labelOn(swatch.value, '#0a0a0a') }}
                  />
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
      <div className="bl:flex bl:items-center bl:gap-1.5">
        <input
          id={controlId}
          type="color"
          value={value ?? fallback}
          disabled={disabled}
          aria-label={words.picker(label)}
          onChange={(event) => pick(event.target.value)}
          className="bl:h-9 bl:w-10 bl:shrink-0 bl:cursor-pointer bl:rounded-md bl:border bl:border-input bl:bg-transparent bl:p-1 bl:outline-none bl:focus-visible:ring-[3px] bl:focus-visible:ring-ring/50 bl:disabled:cursor-not-allowed bl:disabled:opacity-50"
        />
        {/* A draft until it commits, so undo while typing it is the browser's. */}
        <Input
          type="text"
          spellCheck={false}
          id={`${controlId}-hex`}
          value={hexDraft}
          data-bl-draft=""
          disabled={disabled}
          aria-label={words.hex(label)}
          aria-describedby={`${controlId}-help`}
          placeholder={words.hexPlaceholder}
          onChange={(event) => setHexDraft(event.target.value)}
          onBlur={commitHex}
          className="bl:min-w-0 bl:font-mono bl:text-[0.8125rem]"
        />
        {value ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={disabled}
            aria-label={words.reset(label)}
            onClick={() => onValueChange(undefined)}
            className="bl:shrink-0"
          >
            <XIcon aria-hidden="true" />
          </Button>
        ) : null}
      </div>
      <Hint id={`${controlId}-help`}>
        {help ? help : value ? words.overrides : words.uses(fallbackLabel ?? words.defaultFallback)}
      </Hint>
    </div>
  );
}
