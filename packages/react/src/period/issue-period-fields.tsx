import { useId, type Ref } from 'react';
import type { IssuePeriod, PeriodErrors } from '@subterra-technologies/blockletter';
import { useEditorMessages } from '../i18n/context';
import { describedBy } from '../inspector/editor-fields';
import { Field, FieldError, FieldLabel } from '../ui/field';
import { Input } from '../ui/input';

export interface IssuePeriodFieldsProps {
  value: IssuePeriod;
  /**
   * From core `periodErrors`, or worded from its `periodErrorCodes`; pass `{}` until the form has
   * been submitted once.
   */
  errors?: PeriodErrors;
  /** The last date an issue may cover (`todayIn(timeZone)`). Absent: any date. */
  today?: string;
  disabled?: boolean;
  /** The first field, for a dialog that wants to put focus there. */
  startRef?: Ref<HTMLInputElement>;
  onChange: (next: IssuePeriod) => void;
}

/**
 * The period an issue is about: the dates it covers, and how far past them to look for what is
 * coming up. Every place that starts an issue (New issue, Duplicate) asks for it here, so they
 * never drift apart in wording or in what they allow.
 *
 * Native date inputs: the browser's own picker is the most accessible one there is, and the value
 * is already the `YYYY-MM-DD` a period holds, with no time zone to slip a day. "Up to" is capped at
 * `today` when one is given: there is no news from the future.
 */
export function IssuePeriodFields({
  value,
  errors = {},
  today,
  disabled = false,
  startRef,
  onChange,
}: IssuePeriodFieldsProps) {
  const words = useEditorMessages().period;
  const id = useId();
  const startId = `${id}-start`;
  const endId = `${id}-end`;
  const lookaheadId = `${id}-lookahead`;
  const coversHelpId = `${id}-covers-help`;
  const lookaheadHelpId = `${id}-lookahead-help`;

  return (
    <div className="bl:flex bl:min-w-0 bl:flex-col bl:gap-4">
      <fieldset
        disabled={disabled}
        aria-describedby={coversHelpId}
        className="bl:flex bl:min-w-0 bl:flex-col bl:gap-3"
      >
        <legend className="bl:mb-3 bl:text-sm bl:font-medium">{words.legend}</legend>
        <div className="bl:grid bl:gap-3 bl:sm:grid-cols-2">
          <Field className="bl:gap-2" data-invalid={errors.start ? 'true' : undefined}>
            <FieldLabel htmlFor={startId} className="bl:font-normal">
              {words.from}
            </FieldLabel>
            <Input
              ref={startRef}
              id={startId}
              type="date"
              value={value.start}
              max={today}
              aria-invalid={errors.start ? true : undefined}
              aria-describedby={describedBy(errors.start ? `${startId}-error` : null)}
              onChange={(event) => onChange({ ...value, start: event.target.value })}
            />
            {errors.start ? <FieldError id={`${startId}-error`}>{errors.start}</FieldError> : null}
          </Field>
          <Field className="bl:gap-2" data-invalid={errors.end ? 'true' : undefined}>
            <FieldLabel htmlFor={endId} className="bl:font-normal">
              {words.upTo}
            </FieldLabel>
            <Input
              id={endId}
              type="date"
              value={value.end}
              max={today}
              aria-invalid={errors.end ? true : undefined}
              aria-describedby={describedBy(errors.end ? `${endId}-error` : null)}
              onChange={(event) => onChange({ ...value, end: event.target.value })}
            />
            {errors.end ? <FieldError id={`${endId}-error`}>{errors.end}</FieldError> : null}
          </Field>
        </div>
        <p id={coversHelpId} className="bl:text-[0.8125rem] bl:text-muted-foreground">
          {words.coversHelp(Boolean(today))}
        </p>
      </fieldset>

      <Field className="bl:gap-2" data-invalid={errors.lookaheadEnd ? 'true' : undefined}>
        <FieldLabel htmlFor={lookaheadId}>{words.lookahead}</FieldLabel>
        <Input
          id={lookaheadId}
          type="date"
          value={value.lookaheadEnd ?? ''}
          min={value.end || undefined}
          disabled={disabled}
          className="bl:sm:max-w-56"
          aria-invalid={errors.lookaheadEnd ? true : undefined}
          aria-describedby={describedBy(
            lookaheadHelpId,
            errors.lookaheadEnd ? `${lookaheadId}-error` : null,
          )}
          onChange={(event) => {
            // Cleared: no look-ahead, which a period may do without.
            const lookaheadEnd = event.target.value;
            const next: IssuePeriod = { ...value, lookaheadEnd };
            if (!lookaheadEnd) delete next.lookaheadEnd;
            onChange(next);
          }}
        />
        <p id={lookaheadHelpId} className="bl:text-[0.8125rem] bl:text-muted-foreground">
          {words.lookaheadHelp}
        </p>
        {errors.lookaheadEnd ? (
          <FieldError id={`${lookaheadId}-error`}>{errors.lookaheadEnd}</FieldError>
        ) : null}
      </Field>
    </div>
  );
}
