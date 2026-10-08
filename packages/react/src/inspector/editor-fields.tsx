import {
  createContext,
  useContext,
  useId,
  type ChangeEvent,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
} from 'react';
import { PlusIcon, UploadIcon } from 'lucide-react';
import { cn } from '../lib/cn';
import { Button, buttonVariants } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { Field, FieldDescription, FieldError, FieldLabel } from '../ui/field';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';

/**
 * The few shapes every block editor is built from: a labelled text field, a text area, a pair
 * of fields side by side, a choice, a checkbox, a select, a note and an Add button.
 *
 * The inspector root declares `@container/inspector`, so a pair sits side by side only when the
 * panel itself is wide enough, whatever the viewport. Every field makes its own id, so two
 * editors on one page never share one.
 */

const FieldsReadOnly = createContext(false);

/**
 * Whether the `EditorFields` around a control is read-only. The fieldset disables form controls
 * by itself; a control it cannot reach, such as the rich-text field's editable text, asks here.
 */
export const useFieldsReadOnly = (): boolean => useContext(FieldsReadOnly);

/** The editor body. A read-only issue disables every control in it at once. */
export function EditorFields({ readOnly, children }: { readOnly: boolean; children: ReactNode }) {
  return (
    <fieldset disabled={readOnly} className="bl:flex bl:min-w-0 bl:flex-col bl:gap-4">
      <FieldsReadOnly value={readOnly}>{children}</FieldsReadOnly>
    </fieldset>
  );
}

/** Two fields side by side when the inspector is wide enough, stacked otherwise. */
export function FieldPair({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('bl:grid bl:gap-4 bl:@xs/inspector:grid-cols-2', className)}>{children}</div>
  );
}

/** Helper text under a field. */
export function Hint({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <FieldDescription id={id} className="bl:text-[0.8125rem]">
      {children}
    </FieldDescription>
  );
}

/** A short explanatory line that belongs to no single field. */
export function Note({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <p id={id} className="bl:text-[0.8125rem] bl:text-muted-foreground">
      {children}
    </p>
  );
}

/** A heading for a group of fields inside one editor; `id` is what the group points at. */
export function GroupLabel({ id, children }: { id: string; children: ReactNode }) {
  return (
    <span id={id} className="bl:text-sm bl:leading-snug bl:font-medium">
      {children}
    </span>
  );
}

/** `aria-describedby` for a control: its help, then its error, whichever exist. */
export function describedBy(...ids: (string | false | null | undefined)[]): string | undefined {
  const list = ids.filter(Boolean).join(' ');
  return list || undefined;
}

interface TextFieldProps {
  label: ReactNode;
  value: string;
  onChange: (value: string) => void;
  /** Made with `useId` when not given. */
  id?: string;
  help?: ReactNode;
  /** Shown under the field, linked to it, and marks it invalid. */
  error?: string;
  placeholder?: string;
  type?: 'text' | 'email' | 'url' | 'tel' | 'date';
  maxLength?: number;
  max?: string;
  min?: string;
  inputMode?: 'text' | 'email' | 'url' | 'tel' | 'numeric';
  autoComplete?: string;
  spellCheck?: boolean;
  className?: string;
  inputClassName?: string;
  inputRef?: Ref<HTMLInputElement>;
  onBlur?: () => void;
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
}

export function TextField({
  label,
  value,
  onChange,
  id,
  help,
  error,
  placeholder,
  type = 'text',
  maxLength,
  max,
  min,
  inputMode,
  autoComplete,
  spellCheck,
  className,
  inputClassName,
  inputRef,
  onBlur,
  onKeyDown,
}: TextFieldProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const helpId = `${fieldId}-help`;
  const errorId = `${fieldId}-error`;
  return (
    <Field className={cn('bl:gap-2', className)} data-invalid={error ? 'true' : undefined}>
      <FieldLabel htmlFor={fieldId}>{label}</FieldLabel>
      <Input
        ref={inputRef}
        id={fieldId}
        type={type}
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        max={max}
        min={min}
        inputMode={inputMode}
        autoComplete={autoComplete}
        spellCheck={spellCheck}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(help ? helpId : null, error ? errorId : null)}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        className={inputClassName}
      />
      {help ? <Hint id={helpId}>{help}</Hint> : null}
      {error ? <FieldError id={errorId}>{error}</FieldError> : null}
    </Field>
  );
}

export function AreaField({
  label,
  value,
  onChange,
  id,
  help,
  error,
  rows = 4,
  placeholder,
  maxLength,
  textareaRef,
}: Pick<
  TextFieldProps,
  'label' | 'value' | 'onChange' | 'id' | 'help' | 'error' | 'placeholder' | 'maxLength'
> & { rows?: number; textareaRef?: Ref<HTMLTextAreaElement> }) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const helpId = `${fieldId}-help`;
  const errorId = `${fieldId}-error`;
  return (
    <Field className="bl:gap-2" data-invalid={error ? 'true' : undefined}>
      <FieldLabel htmlFor={fieldId}>{label}</FieldLabel>
      <Textarea
        ref={textareaRef}
        id={fieldId}
        rows={rows}
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(help ? helpId : null, error ? errorId : null)}
        onChange={(event) => onChange(event.target.value)}
        className="bl:max-h-[32rem]"
        style={{ minHeight: `${Math.max(2, rows) * 1.5 + 1}rem` }}
      />
      {help ? <Hint id={helpId}>{help}</Hint> : null}
      {error ? <FieldError id={errorId}>{error}</FieldError> : null}
    </Field>
  );
}

/** A checkbox with its label beside it. */
export function CheckField({
  label,
  checked,
  onChange,
  id,
  disabled,
}: {
  label: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  id?: string;
  disabled?: boolean;
}) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <div className="bl:flex bl:items-start bl:gap-2.5">
      <Checkbox
        id={fieldId}
        checked={checked}
        disabled={disabled}
        onCheckedChange={(next) => onChange(next === true)}
        className="bl:mt-0.5"
      />
      <Label htmlFor={fieldId} className="bl:leading-snug bl:font-normal">
        {label}
      </Label>
    </div>
  );
}

export interface Choice<T extends string> {
  value: T;
  label: string;
  hint?: string;
}

/** A small set of named choices, as radio buttons in a row. Arrow keys move between them. */
export function ChoiceField<T extends string>({
  legend,
  value,
  options,
  onChange,
}: {
  legend: string;
  value: T;
  options: readonly Choice<T>[];
  onChange: (value: T) => void;
}) {
  const id = useId();
  const legendId = `${id}-legend`;
  return (
    <div className="bl:flex bl:flex-col bl:gap-2">
      <GroupLabel id={legendId}>{legend}</GroupLabel>
      <RadioGroup
        aria-labelledby={legendId}
        value={value}
        onValueChange={(next) => {
          const choice = options.find((option) => option.value === next);
          if (choice) onChange(choice.value);
        }}
        className="bl:flex bl:flex-wrap bl:gap-x-5 bl:gap-y-2"
      >
        {options.map((option) => {
          const optionId = `${id}-${option.value}`;
          return (
            <div key={option.value} className="bl:flex bl:items-start bl:gap-2">
              <RadioGroupItem
                id={optionId}
                value={option.value}
                className="bl:mt-0.5"
                aria-describedby={option.hint ? `${optionId}-hint` : undefined}
              />
              <span className="bl:flex bl:flex-col">
                <Label htmlFor={optionId} className="bl:leading-snug bl:font-normal">
                  {option.label}
                </Label>
                {option.hint ? (
                  <span id={`${optionId}-hint`} className="bl:text-xs bl:text-muted-foreground">
                    {option.hint}
                  </span>
                ) : null}
              </span>
            </div>
          );
        })}
      </RadioGroup>
    </div>
  );
}

/** A labelled select of named options. */
export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
  id,
  help,
  error,
  disabled,
  className,
}: {
  label: ReactNode;
  value: T;
  options: readonly { value: T; label: ReactNode }[];
  onChange: (value: T) => void;
  id?: string;
  help?: ReactNode;
  error?: string;
  disabled?: boolean;
  className?: string;
}) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const helpId = `${fieldId}-help`;
  const errorId = `${fieldId}-error`;
  return (
    <Field className={cn('bl:gap-2', className)} data-invalid={error ? 'true' : undefined}>
      <FieldLabel htmlFor={fieldId}>{label}</FieldLabel>
      <Select
        value={value}
        disabled={disabled}
        onValueChange={(next) => {
          const option = options.find((candidate) => candidate.value === next);
          if (option) onChange(option.value);
        }}
      >
        <SelectTrigger
          id={fieldId}
          className="bl:w-full"
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(help ? helpId : null, error ? errorId : null)}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {help ? <Hint id={helpId}>{help}</Hint> : null}
      {error ? <FieldError id={errorId}>{error}</FieldError> : null}
    </Field>
  );
}

export function AddButton({
  label,
  disabled,
  onClick,
  describedById,
  buttonRef,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  /** The hint that says why it is disabled, when it is. */
  describedById?: string;
  buttonRef?: Ref<HTMLButtonElement>;
}) {
  return (
    <Button
      ref={buttonRef}
      type="button"
      variant="outline"
      size="sm"
      disabled={disabled}
      aria-describedby={describedById}
      onClick={onClick}
      className="bl:self-start"
    >
      <PlusIcon aria-hidden="true" />
      {label}
    </Button>
  );
}

/**
 * A file input drawn as an outline button. The native control stays in the page, focusable and
 * labelled; it is only drawn as the button beside it, so the browser's "No file chosen" text
 * never squeezes into a narrow panel.
 */
export function ImageFileInput({
  id,
  label,
  accept,
  disabled,
  invalid,
  describedBy: description,
  onChange,
}: {
  id: string;
  label: string;
  accept: string;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <span className="bl:relative bl:inline-flex">
      <input
        id={id}
        type="file"
        accept={accept}
        disabled={disabled}
        aria-describedby={description}
        aria-invalid={invalid || undefined}
        onChange={onChange}
        className="bl:peer bl:sr-only"
      />
      <label
        htmlFor={id}
        className={cn(
          buttonVariants({ variant: 'outline', size: 'sm' }),
          'bl:cursor-pointer bl:peer-focus-visible:border-ring bl:peer-focus-visible:ring-[3px] bl:peer-focus-visible:ring-ring/50',
          'bl:peer-disabled:pointer-events-none bl:peer-disabled:opacity-50',
        )}
      >
        <UploadIcon aria-hidden="true" />
        {label}
      </label>
    </span>
  );
}
