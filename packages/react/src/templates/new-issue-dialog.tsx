import { useLayoutEffect, useRef, useState, type FormEvent } from 'react';
import {
  PERIOD_PRESETS,
  applyPeriodPreset,
  periodErrors,
  suggestPeriod,
  type BlockBase,
  type IssuePeriod,
  type NewsletterTemplate,
  type PeriodPreset,
} from '@subterra-technologies/blockletter';
import { errorMessage } from '../lib/errors';
import { useReturnFocus } from '../lib/return-focus';
import { SelectField } from '../inspector/editor-fields';
import { IssuePeriodFields } from '../period/issue-period-fields';
import { todayInZone } from '../period/today';
import { Alert, AlertDescription } from '../ui/alert';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { useToasts } from '../ui/toast';
import { TemplatePicker, type TemplatePickerProps } from './template-picker';

export interface NewIssueRequest {
  templateId: string;
  period: IssuePeriod;
}

export interface NewIssueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The layouts to offer, the first chosen to begin with; `null` while they load. */
  templates: readonly NewsletterTemplate<BlockBase>[] | null;
  /** The organisation's IANA zone, which decides what "today" and "this month" mean. */
  timeZone?: string;
  /** Makes the issue (`assembleDocument` does the usual work). A rejection is shown here. */
  onCreate: (request: NewIssueRequest) => void | Promise<void>;
  onRenameTemplate?: TemplatePickerProps['onRename'];
  onDeleteTemplate?: TemplatePickerProps['onDelete'];
}

/**
 * "New issue": the dates it covers and a layout to start from. The period opens on this month
 * so far, looking six weeks ahead, and the named choices fill in the dates they mean; changing a
 * date by hand makes the period Custom. Nothing is created until the form is submitted, and the
 * dialog closes only once `onCreate` has finished.
 */
export function NewIssueDialog({
  open,
  onOpenChange,
  templates,
  timeZone,
  onCreate,
  onRenameTemplate,
  onDeleteTemplate,
}: NewIssueDialogProps) {
  const focus = useReturnFocus();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="bl:max-h-[calc(100dvh-2rem)] bl:gap-0 bl:overflow-y-auto bl:p-0 bl:sm:max-w-2xl"
        onOpenAutoFocus={focus.capture}
        onCloseAutoFocus={focus.restore}
      >
        <NewIssueForm
          templates={templates}
          timeZone={timeZone}
          onCreate={onCreate}
          onRenameTemplate={onRenameTemplate}
          onDeleteTemplate={onDeleteTemplate}
          onDone={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

/** Mounted afresh each time the dialog opens, so every opening starts from the suggestion. */
function NewIssueForm({
  templates,
  timeZone,
  onCreate,
  onRenameTemplate,
  onDeleteTemplate,
  onDone,
}: Omit<NewIssueDialogProps, 'open' | 'onOpenChange'> & { onDone: () => void }) {
  const { toast } = useToasts();
  const today = todayInZone(timeZone);
  const [preset, setPreset] = useState<PeriodPreset>('this-month');
  const [period, setPeriod] = useState<IssuePeriod>(() => suggestPeriod(today));
  const [chosenId, setChosenId] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const formRef = useRef<HTMLFormElement>(null);
  const focusInvalid = useRef(false);

  // The first template stands chosen until another is picked (or the picked one is deleted).
  const selected =
    templates?.find((template) => template.id === chosenId) ?? templates?.[0] ?? null;
  const errors = periodErrors(period, { today });
  const invalid = Object.keys(errors).length > 0;

  useLayoutEffect(() => {
    if (!focusInvalid.current) return;
    focusInvalid.current = false;
    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  });

  async function create(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (creating) return;
    setTouched(true);
    setCreateError('');
    if (invalid) {
      focusInvalid.current = true;
      return;
    }
    if (!selected) {
      setCreateError('Choose a layout to start from.');
      return;
    }
    setCreating(true);
    try {
      await onCreate({ templateId: selected.id, period });
      toast(`Issue started from “${selected.name}”.`);
      onDone();
    } catch (cause: unknown) {
      setCreateError(errorMessage(cause, 'The issue could not be created. Try again.'));
    } finally {
      setCreating(false);
    }
  }

  return (
    <form
      ref={formRef}
      noValidate
      onSubmit={(event) => void create(event)}
      className="bl:flex bl:min-w-0 bl:flex-col"
    >
      <DialogHeader className="bl:gap-1 bl:border-b bl:px-6 bl:py-4 bl:pr-12 bl:text-left">
        <DialogTitle className="bl:text-base">New issue</DialogTitle>
        <DialogDescription className="bl:text-[0.8125rem]">
          Pick the dates this issue covers and a layout to start from. Nothing is sent from here.
        </DialogDescription>
      </DialogHeader>
      <div className="bl:flex bl:min-w-0 bl:flex-col bl:gap-6 bl:px-6 bl:py-5">
        {/* The period by name; the dates below say what it means and can be changed. The
            look-ahead is not a choice here: how far forward to gather what is coming up is a
            different question from what the issue is about. */}
        <div className="bl:sm:max-w-56">
          <SelectField
            label="Period"
            value={preset}
            disabled={creating}
            options={PERIOD_PRESETS.map((option) => ({ value: option.id, label: option.label }))}
            onChange={(next) => {
              setPreset(next);
              setPeriod(applyPeriodPreset(next, period, today));
            }}
          />
        </div>

        <IssuePeriodFields
          value={period}
          errors={touched ? errors : {}}
          today={today}
          disabled={creating}
          onChange={(next) => {
            setPreset('custom');
            setPeriod(next);
          }}
        />

        <TemplatePicker
          templates={templates}
          value={selected?.id ?? null}
          onChange={setChosenId}
          onRename={onRenameTemplate}
          onDelete={onDeleteTemplate}
          disabled={creating}
        />

        {createError ? (
          <Alert variant="destructive">
            <AlertDescription>{createError}</AlertDescription>
          </Alert>
        ) : null}
      </div>
      <DialogFooter className="bl:border-t bl:px-6 bl:py-3">
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        {/* Not `disabled` while creating: a disabled button drops the focus it has. */}
        <Button
          type="submit"
          aria-disabled={creating || undefined}
          aria-busy={creating || undefined}
          className="bl:aria-disabled:opacity-50"
        >
          {creating ? 'Creating…' : 'Create issue'}
        </Button>
      </DialogFooter>
    </form>
  );
}
