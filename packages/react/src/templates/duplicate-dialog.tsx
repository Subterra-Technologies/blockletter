import { useLayoutEffect, useRef, useState, type FormEvent } from 'react';
import {
  DEFAULT_LOOKAHEAD_DAYS,
  addDays,
  periodErrors,
  type IssuePeriod,
} from '@subterra-technologies/blockletter';
import { errorMessage } from '../lib/errors';
import { useReturnFocus } from '../lib/return-focus';
import { IssuePeriodFields } from '../period/issue-period-fields';
import { todayInZone } from '../period/today';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { FieldError } from '../ui/field';
import { useToasts } from '../ui/toast';

/**
 * Where a copy's period starts: the day after the original's ended, up to today, looking six
 * weeks ahead. Without an original period it covers the last thirty days.
 */
export function periodAfter(end: string | undefined, today: string): IssuePeriod {
  const start = end ? addDays(end, 1) : addDays(today, -30);
  return {
    start: start > today ? today : start,
    end: today,
    lookaheadEnd: addDays(today, DEFAULT_LOOKAHEAD_DAYS),
  };
}

export interface DuplicateIssueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The period of the issue being copied; the copy starts the day after it ended. */
  sourcePeriod?: IssuePeriod;
  /** What the issue is called, for the title: Duplicate “September 2026”. */
  name?: string;
  /** The organisation's IANA zone, which decides what "today" means. */
  timeZone?: string;
  /** Makes the copy. A rejection is shown in the dialog, in the error's own words. */
  onDuplicate: (period: IssuePeriod) => void | Promise<void>;
}

/**
 * Duplicate an issue into another period. The copy keeps the layout and settings; the host
 * decides what else carries over (refreshing its data sources for the new dates, say).
 */
export function DuplicateIssueDialog({
  open,
  onOpenChange,
  sourcePeriod,
  name,
  timeZone,
  onDuplicate,
}: DuplicateIssueDialogProps) {
  const focus = useReturnFocus();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="bl:max-h-[calc(100dvh-2rem)] bl:overflow-y-auto bl:sm:max-w-md"
        onOpenAutoFocus={focus.capture}
        onCloseAutoFocus={focus.restore}
      >
        <DuplicateForm
          sourceEnd={sourcePeriod?.end}
          name={name}
          timeZone={timeZone}
          onDuplicate={onDuplicate}
          onDone={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

/** Mounted afresh each time the dialog opens, so every opening starts from the suggestion. */
function DuplicateForm({
  sourceEnd,
  name,
  timeZone,
  onDuplicate,
  onDone,
}: {
  sourceEnd: string | undefined;
  name: string | undefined;
  timeZone: string | undefined;
  onDuplicate: (period: IssuePeriod) => void | Promise<void>;
  onDone: () => void;
}) {
  const { toast } = useToasts();
  const today = todayInZone(timeZone);
  const [period, setPeriod] = useState<IssuePeriod>(() => periodAfter(sourceEnd, today));
  const [seed, setSeed] = useState(sourceEnd);
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const focusInvalid = useRef(false);

  // Another issue to copy while open: start again from its dates.
  if (sourceEnd !== seed) {
    setSeed(sourceEnd);
    setPeriod(periodAfter(sourceEnd, today));
    setTouched(false);
    setError('');
  }

  const errors = periodErrors(period, { today });

  useLayoutEffect(() => {
    if (!focusInvalid.current) return;
    focusInvalid.current = false;
    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  });

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (pending) return;
    setTouched(true);
    setError('');
    if (Object.keys(errors).length > 0) {
      focusInvalid.current = true;
      return;
    }
    setPending(true);
    try {
      await onDuplicate(period);
      toast(name ? `Copied “${name}”.` : 'Issue copied.');
      onDone();
    } catch (cause: unknown) {
      setError(errorMessage(cause, 'The copy could not be made. Try again.'));
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      ref={formRef}
      noValidate
      onSubmit={(event) => void submit(event)}
      className="bl:flex bl:flex-col bl:gap-5"
    >
      <DialogHeader className="bl:text-left">
        <DialogTitle className="bl:pr-6 bl:text-base">
          {name ? `Duplicate “${name}”` : 'Duplicate this issue'}
        </DialogTitle>
        <DialogDescription className="bl:text-[0.8125rem]">
          The copy keeps this issue’s layout and settings, and covers the dates you choose.
        </DialogDescription>
      </DialogHeader>
      <IssuePeriodFields
        value={period}
        errors={touched ? errors : {}}
        today={today}
        disabled={pending}
        onChange={setPeriod}
      />
      {error ? <FieldError>{error}</FieldError> : null}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        {/* Not `disabled` while copying: a disabled button drops the focus it has. */}
        <Button
          type="submit"
          aria-disabled={pending || undefined}
          aria-busy={pending || undefined}
          className="bl:aria-disabled:opacity-50"
        >
          {pending ? 'Copying…' : 'Create copy'}
        </Button>
      </DialogFooter>
    </form>
  );
}
