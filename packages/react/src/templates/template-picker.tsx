import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { PencilIcon, Trash2Icon } from 'lucide-react';
import type { BlockBase, NewsletterTemplate } from '@subterra-technologies/blockletter';
import { useEditorMessages } from '../i18n/context';
import { cn } from '../lib/cn';
import { errorMessage } from '../lib/errors';
import { focusAfterConfirm } from '../lib/focus';
import { Button } from '../ui/button';
import { useConfirm } from '../ui/confirm';
import { Field, FieldLabel } from '../ui/field';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Skeleton } from '../ui/skeleton';
import { StatusBadge } from '../ui/status-badge';
import { useToasts } from '../ui/toast';

/** Radix compares radio values as strings, and reserves the empty one: this is "Blank". */
const BLANK = 'blockletter:blank';

export const TEMPLATE_NAME_MAX = 80;
export const TEMPLATE_DESCRIPTION_MAX = 240;

export interface TemplatePickerProps {
  /** Built-in and saved templates, in the order to offer them; `null` while they load. */
  templates: readonly NewsletterTemplate<BlockBase>[] | null;
  /** The chosen template's id; `null` for Blank, or for nothing chosen yet. */
  value: string | null;
  onChange: (id: string | null) => void;
  /** Offered on saved (not built-in) templates when given. */
  onRename?: (id: string, name: string, description: string) => void | Promise<void>;
  /** Offered on saved (not built-in) templates when given; asks first. */
  onDelete?: (id: string) => void | Promise<void>;
  /** Adds a "Blank" card, chosen as `null`. */
  allowBlank?: boolean;
  disabled?: boolean;
  /** The group's name. Default: the messages' "Layout". */
  legend?: string;
}

/**
 * The layouts a new issue can start from, as cards. Each card is a radio (arrow keys move between
 * them) whose whole surface is the target. Saved templates can be renamed or deleted from their
 * card when the host allows it; built-in ones are read-only and say so.
 */
export function TemplatePicker({
  templates,
  value,
  onChange,
  onRename,
  onDelete,
  allowBlank = false,
  disabled = false,
  legend,
}: TemplatePickerProps) {
  const { toast } = useToasts();
  const m = useEditorMessages();
  const words = m.templates;
  const confirm = useConfirm();
  const id = useId();
  const legendId = `${id}-legend`;
  const groupRef = useRef<HTMLDivElement>(null);

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');
  const [draftDescription, setDraftDescription] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const cardId = (templateId: string) => `${id}-card-${templateId}`;
  /** A card's own control, found by data attribute: a template id may hold any character. */
  const control = (templateId: string, name: string): HTMLElement | null => {
    const card = Array.from(
      groupRef.current?.querySelectorAll<HTMLElement>('[data-template]') ?? [],
    ).find((element) => element.dataset.template === templateId);
    return card?.querySelector<HTMLElement>(`[data-template-control="${name}"]`) ?? null;
  };

  // Focus follows the rename form: into its name field when it opens, back to Rename after.
  const pendingFocus = useRef<{ templateId: string; control: 'name' | 'rename' } | null>(null);
  useLayoutEffect(() => {
    const pending = pendingFocus.current;
    if (!pending) return;
    pendingFocus.current = null;
    control(pending.templateId, pending.control)?.focus();
  });

  function startRename(template: NewsletterTemplate<BlockBase>): void {
    setRenamingId(template.id);
    setDraftName(template.name);
    setDraftDescription(template.description);
    setError('');
    pendingFocus.current = { templateId: template.id, control: 'name' };
  }

  function stopRename(templateId: string): void {
    setRenamingId(null);
    setError('');
    pendingFocus.current = { templateId, control: 'rename' };
  }

  async function run(templateId: string, work: () => Promise<void>): Promise<boolean> {
    setBusyId(templateId);
    setError('');
    try {
      await work();
      return true;
    } catch (cause: unknown) {
      setError(errorMessage(cause, words.failed));
      return false;
    } finally {
      setBusyId(null);
    }
  }

  async function confirmRename(template: NewsletterTemplate<BlockBase>): Promise<void> {
    if (!onRename) return;
    const name = draftName.trim();
    if (!name) {
      setError(words.nameRequired);
      control(template.id, 'name')?.focus();
      return;
    }
    const done = await run(template.id, async () => {
      await onRename(template.id, name, draftDescription.trim());
      toast(m.toasts.templateRenamed(name));
    });
    if (done) stopRename(template.id);
  }

  /** The picker sits inside a form that starts an issue: Enter saves the name, nothing more. */
  function saveOnEnter(
    event: KeyboardEvent<HTMLInputElement>,
    template: NewsletterTemplate<BlockBase>,
  ): void {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    void confirmRename(template);
  }

  async function remove(template: NewsletterTemplate<BlockBase>): Promise<void> {
    if (!onDelete) return;
    const ok = await confirm({
      title: words.confirmDeleteTitle(template.name),
      description: words.confirmDeleteDescription,
      confirmLabel: words.confirmDelete,
      destructive: true,
    });
    if (!ok) return;
    const done = await run(template.id, async () => {
      await onDelete(template.id);
      if (value === template.id) onChange(null);
      toast(m.toasts.templateDeleted(template.name));
    });
    // The card has gone with its Delete button; the choice it belonged to takes focus.
    if (done) {
      focusAfterConfirm(
        () =>
          groupRef.current?.querySelector<HTMLElement>('[role="radio"][data-state="checked"]') ??
          groupRef.current?.querySelector<HTMLElement>('[role="radio"]'),
      );
    }
  }

  const list = templates ?? [];
  const selected = value === null ? (allowBlank ? BLANK : '') : value;

  return (
    <fieldset disabled={disabled} className="bl:flex bl:min-w-0 bl:flex-col">
      <legend id={legendId} className="bl:mb-2 bl:text-sm bl:font-medium">
        {legend ?? words.legend}
      </legend>
      {templates === null ? (
        <div className="bl:flex bl:flex-col bl:gap-3">
          <p role="status" className="bl:text-[0.8125rem] bl:text-muted-foreground">
            {words.loading}
          </p>
          <div aria-hidden="true" className="bl:grid bl:gap-3 bl:sm:grid-cols-2">
            <Skeleton className="bl:h-24 bl:rounded-lg" />
            <Skeleton className="bl:h-24 bl:rounded-lg" />
          </div>
        </div>
      ) : (
        <div ref={groupRef} className="bl:flex bl:flex-col bl:gap-3">
          <RadioGroup
            aria-labelledby={legendId}
            value={selected}
            onValueChange={(next) => onChange(next === BLANK ? null : next)}
            className="bl:grid bl:gap-3 bl:sm:grid-cols-2"
          >
            {allowBlank ? (
              <TemplateCard
                id={cardId(BLANK)}
                value={BLANK}
                name={words.blank}
                description={words.blankDescription}
                meta={words.noBlocks}
                builtInLabel={words.builtIn}
              />
            ) : null}
            {list.map((template) => {
              const editable = !template.builtIn && Boolean(onRename || onDelete);
              const busy = busyId === template.id;
              const count = template.blocks.length;
              return (
                <TemplateCard
                  key={template.id}
                  id={cardId(template.id)}
                  value={template.id}
                  name={template.name}
                  description={template.description}
                  meta={words.blocks(count)}
                  builtIn={template.builtIn}
                  builtInLabel={words.builtIn}
                  busy={busy}
                >
                  {editable && renamingId === template.id ? (
                    <div className="bl:relative bl:z-10 bl:flex bl:flex-col bl:gap-3 bl:border-t bl:pt-3">
                      <Field className="bl:gap-1.5">
                        <FieldLabel htmlFor={`${cardId(template.id)}-rename-name`}>
                          {words.name}
                        </FieldLabel>
                        <Input
                          id={`${cardId(template.id)}-rename-name`}
                          data-template-control="name"
                          required
                          maxLength={TEMPLATE_NAME_MAX}
                          value={draftName}
                          aria-invalid={error && !draftName.trim() ? true : undefined}
                          aria-describedby={
                            error ? `${cardId(template.id)}-rename-error` : undefined
                          }
                          onChange={(event) => setDraftName(event.target.value)}
                          onKeyDown={(event) => saveOnEnter(event, template)}
                        />
                      </Field>
                      <Field className="bl:gap-1.5">
                        <FieldLabel htmlFor={`${cardId(template.id)}-rename-description`}>
                          {words.description}
                        </FieldLabel>
                        <Input
                          id={`${cardId(template.id)}-rename-description`}
                          maxLength={TEMPLATE_DESCRIPTION_MAX}
                          value={draftDescription}
                          onChange={(event) => setDraftDescription(event.target.value)}
                          onKeyDown={(event) => saveOnEnter(event, template)}
                        />
                      </Field>
                      {error ? (
                        <p
                          id={`${cardId(template.id)}-rename-error`}
                          role="alert"
                          className="bl:text-[0.8125rem] bl:text-destructive"
                        >
                          {error}
                        </p>
                      ) : null}
                      <div className="bl:flex bl:justify-end bl:gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => stopRename(template.id)}
                        >
                          {m.common.cancel}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          disabled={busy}
                          aria-busy={busy || undefined}
                          onClick={() => void confirmRename(template)}
                        >
                          {busy ? m.common.saving : m.common.save}
                        </Button>
                      </div>
                    </div>
                  ) : editable ? (
                    <div className="bl:relative bl:z-10 bl:flex bl:gap-1 bl:self-end">
                      {onRename ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="xs"
                          data-template-control="rename"
                          aria-label={words.renameNamed(template.name)}
                          disabled={busy}
                          onClick={() => startRename(template)}
                        >
                          <PencilIcon aria-hidden="true" />
                          {words.rename}
                        </Button>
                      ) : null}
                      {onDelete ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="xs"
                          data-template-control="delete"
                          className="bl:text-destructive bl:hover:bg-destructive/10 bl:hover:text-destructive"
                          aria-label={words.deleteNamed(template.name)}
                          disabled={busy}
                          onClick={() => void remove(template)}
                        >
                          <Trash2Icon aria-hidden="true" />
                          {words.delete}
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                </TemplateCard>
              );
            })}
          </RadioGroup>
          {list.length === 0 ? (
            <p className="bl:text-[0.8125rem] bl:text-muted-foreground">{words.none}</p>
          ) : null}
          {error && !renamingId ? (
            <p role="alert" className="bl:text-[0.8125rem] bl:text-destructive">
              {error}
            </p>
          ) : null}
        </div>
      )}
    </fieldset>
  );
}

function TemplateCard({
  id,
  value,
  name,
  description,
  meta,
  builtIn = false,
  builtInLabel,
  busy = false,
  children,
}: {
  id: string;
  value: string;
  name: string;
  description: string;
  meta: string;
  builtIn?: boolean;
  /** The badge a built-in template carries. */
  builtInLabel: string;
  busy?: boolean;
  children?: ReactNode;
}) {
  return (
    <div
      data-template={value}
      className={cn(
        'bl:relative bl:flex bl:min-w-0 bl:flex-col bl:gap-2 bl:rounded-lg bl:border bl:p-3 bl:transition-colors',
        'bl:hover:bg-muted/40 bl:has-[[data-state=checked]]:border-primary bl:has-[[data-state=checked]]:bg-primary/[0.03] bl:has-[[data-state=checked]]:ring-1 bl:has-[[data-state=checked]]:ring-primary',
        'bl:has-[:focus-visible]:ring-[3px] bl:has-[:focus-visible]:ring-ring/50',
        busy && 'bl:opacity-60',
      )}
    >
      <div className="bl:flex bl:min-w-0 bl:items-start bl:gap-3">
        <RadioGroupItem
          id={id}
          value={value}
          aria-describedby={`${id}-description`}
          className="bl:mt-0.5"
        />
        <div className="bl:flex bl:min-w-0 bl:flex-1 bl:flex-col bl:gap-1">
          <div className="bl:flex bl:min-w-0 bl:flex-wrap bl:items-center bl:gap-2">
            {/* The label stretches over the card, so a click anywhere on it chooses it. */}
            <Label
              htmlFor={id}
              className="bl:cursor-pointer bl:leading-5 bl:after:absolute bl:after:inset-0 bl:after:rounded-lg"
            >
              {name}
            </Label>
            {builtIn ? <StatusBadge tone="neutral">{builtInLabel}</StatusBadge> : null}
          </div>
          <p id={`${id}-description`} className="bl:flex bl:flex-col bl:gap-1">
            {description ? (
              <span className="bl:text-[0.8125rem] bl:text-muted-foreground">{description}</span>
            ) : null}
            {/* Laid out as lines, read as one description: the space keeps the two apart. */}{' '}
            <span className="bl:text-xs bl:text-muted-foreground bl:tabular-nums">{meta}</span>
          </p>
        </div>
      </div>
      {children}
    </div>
  );
}
