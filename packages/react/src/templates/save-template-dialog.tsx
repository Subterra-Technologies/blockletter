import { useId, useRef, useState, type FormEvent } from 'react';
import { useEditorMessages } from '../i18n/context';
import { errorMessage } from '../lib/errors';
import { useReturnFocus } from '../lib/return-focus';
import { Hint } from '../inspector/editor-fields';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Field, FieldError, FieldLabel } from '../ui/field';
import { Input } from '../ui/input';
import { useToasts } from '../ui/toast';
import { TEMPLATE_DESCRIPTION_MAX, TEMPLATE_NAME_MAX } from './template-picker';

export interface SaveTemplateRequest {
  name: string;
  description: string;
}

export interface SaveTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Saves the template (`templateFromDocument` makes one). A rejection is shown in the dialog. */
  onSave: (request: SaveTemplateRequest) => void | Promise<void>;
  /** Seeds the name each time the dialog opens, selected so it can be typed over. */
  suggestedName?: string;
}

/**
 * "Save as template": a name and a one-line description for the current issue's layout. The
 * dialog waits for `onSave`, says "Saving…" meanwhile, closes and confirms when it is done, and
 * stays open with the host's own message when it is not.
 *
 * It is usually opened from a menu rather than a trigger of its own, so it remembers what had
 * focus when it opened and gives focus back there when it closes.
 */
export function SaveTemplateDialog({
  open,
  onOpenChange,
  onSave,
  suggestedName = '',
}: SaveTemplateDialogProps) {
  const { toast } = useToasts();
  const m = useEditorMessages();
  const words = m.dialogs.saveTemplate;
  const id = useId();
  const nameId = `${id}-name`;
  const descriptionId = `${id}-description`;
  const nameRef = useRef<HTMLInputElement>(null);
  const focus = useReturnFocus();

  const [name, setName] = useState(suggestedName);
  const [description, setDescription] = useState('');
  const [nameError, setNameError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  // Seeded afresh on each opening, during render rather than in an effect.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setName(suggestedName);
      setDescription('');
      setNameError('');
      setSaveError('');
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (saving) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError(words.nameRequired);
      nameRef.current?.focus();
      return;
    }
    setNameError('');
    setSaveError('');
    setSaving(true);
    try {
      await onSave({ name: trimmed, description: description.trim() });
      onOpenChange(false);
      toast(m.toasts.templateSaved);
    } catch (cause: unknown) {
      setSaveError(errorMessage(cause, words.failed));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="bl:sm:max-w-md"
        onOpenAutoFocus={(event) => {
          focus.capture();
          event.preventDefault();
          nameRef.current?.focus();
          nameRef.current?.select();
        }}
        onCloseAutoFocus={focus.restore}
      >
        <form
          noValidate
          className="bl:flex bl:flex-col bl:gap-5"
          onSubmit={(event) => void submit(event)}
        >
          <DialogHeader className="bl:text-left">
            <DialogTitle className="bl:text-base">{words.title}</DialogTitle>
            <DialogDescription className="bl:text-[0.8125rem]">
              {words.description}
            </DialogDescription>
          </DialogHeader>
          <Field className="bl:gap-2" data-invalid={nameError ? 'true' : undefined}>
            <FieldLabel htmlFor={nameId}>{words.name}</FieldLabel>
            <Input
              ref={nameRef}
              id={nameId}
              value={name}
              maxLength={TEMPLATE_NAME_MAX}
              required
              placeholder={words.namePlaceholder}
              aria-invalid={nameError ? true : undefined}
              aria-describedby={nameError ? `${nameId}-error` : undefined}
              onChange={(event) => setName(event.target.value)}
            />
            {nameError ? <FieldError id={`${nameId}-error`}>{nameError}</FieldError> : null}
          </Field>
          <Field className="bl:gap-2">
            <FieldLabel htmlFor={descriptionId}>{words.descriptionLabel}</FieldLabel>
            <Input
              id={descriptionId}
              value={description}
              maxLength={TEMPLATE_DESCRIPTION_MAX}
              aria-describedby={`${descriptionId}-help`}
              placeholder={words.descriptionPlaceholder}
              onChange={(event) => setDescription(event.target.value)}
            />
            <Hint id={`${descriptionId}-help`}>{words.descriptionHint}</Hint>
          </Field>
          {saveError ? <FieldError>{saveError}</FieldError> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {m.common.cancel}
            </Button>
            {/* Not `disabled` while saving: a disabled button drops the focus it has. */}
            <Button
              type="submit"
              aria-disabled={saving || undefined}
              aria-busy={saving || undefined}
              className="bl:aria-disabled:opacity-50"
            >
              {saving ? m.common.saving : words.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
