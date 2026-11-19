import {
  Fragment,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import {
  BoldIcon,
  ChevronDownIcon,
  ItalicIcon,
  LinkIcon,
  ListIcon,
  ListOrderedIcon,
  StrikethroughIcon,
  type LucideIcon,
} from 'lucide-react';
import { useEditorMessages } from '../i18n/context';
import { describedBy, Hint, TextField, useFieldsReadOnly } from '../inspector/editor-fields';
import { cn } from '../lib/cn';
import { textOf } from '../lib/text-of';
import { useCommandKey } from '../rich-text/platform';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Field, FieldError, FieldLabel } from '../ui/field';
import { Separator } from '../ui/separator';
import { Textarea } from '../ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { markdownLinkAddress } from './link-address';
import {
  insertLink,
  setLineFormat,
  toggleMark,
  type InlineMark,
  type LineFormat,
  type TextEdit,
} from './text-formatting';

export interface MarkdownFieldProps {
  /** The field's label; the toolbar is named after it ("Letter formatting"). */
  label: ReactNode;
  value: string;
  onChange: (value: string) => void;
  /** Made with `useId` when not given. */
  id?: string;
  /** Help of the field's own, shown before the line saying what the field understands. */
  help?: ReactNode;
  /** Shown under the field, linked to it, and marks it invalid. */
  error?: string;
  rows?: number;
  placeholder?: string;
  maxLength?: number;
}

type Command = InlineMark | 'link' | 'bullet' | 'numbered';

interface Tool {
  command: Command;
  Icon: LucideIcon;
  /** The letter of its shortcut, with Control (Command on Apple's systems). */
  key?: string;
  /** Starts a new group, after a divider. */
  group?: true;
}

const TOOLS: readonly Tool[] = [
  { command: 'bold', Icon: BoldIcon, key: 'B', group: true },
  { command: 'italic', Icon: ItalicIcon, key: 'I' },
  { command: 'strike', Icon: StrikethroughIcon },
  { command: 'link', Icon: LinkIcon, key: 'K', group: true },
  { command: 'bullet', Icon: ListIcon, group: true },
  { command: 'numbered', Icon: ListOrderedIcon },
];

const HEADINGS: readonly {
  format: LineFormat;
  word: 'large' | 'medium' | 'small' | 'normal';
  mark?: string;
  className: string;
}[] = [
  { format: 'h1', word: 'large', mark: '#', className: 'bl:font-serif bl:text-lg' },
  { format: 'h2', word: 'medium', mark: '##', className: 'bl:font-serif bl:text-base' },
  { format: 'h3', word: 'small', mark: '###', className: 'bl:text-sm bl:font-semibold' },
  { format: 'paragraph', word: 'normal', className: 'bl:text-sm' },
];

const TOOL_CLASS = cn(
  'bl:inline-flex bl:h-8 bl:min-w-8 bl:shrink-0 bl:items-center bl:justify-center bl:rounded-md bl:text-muted-foreground bl:outline-none bl:transition-colors',
  'bl:hover:bg-accent bl:hover:text-foreground bl:focus-visible:ring-[3px] bl:focus-visible:ring-ring/50',
  'bl:aria-expanded:bg-accent bl:aria-expanded:text-foreground',
  'bl:disabled:pointer-events-none bl:disabled:opacity-50',
  'bl:[&_svg]:size-4 bl:[&_svg]:shrink-0',
);

/** A shortcut's letter: the key's own on Latin layouts, its position on others. */
const shortcutLetter = (event: KeyboardEvent): string =>
  /^[a-z]$/i.test(event.key)
    ? event.key.toLowerCase()
    : /^Key[A-Z]$/.test(event.code)
      ? event.code.slice(3).toLowerCase()
      : '';

/**
 * Replaces the focused field's selection as if typed, so the browser's own undo can take it back.
 * False where the browser has no `insertText` command (and in tests), which then use `onChange`.
 */
function typeAsUser(page: Document, text: string): boolean {
  try {
    return (
      typeof page.execCommand === 'function' &&
      page.execCommand(text ? 'insertText' : 'delete', false, text)
    );
  } catch {
    return false;
  }
}

/**
 * A free-text field with a formatting toolbar above it: a heading menu, bold, italic,
 * strikethrough, a link and two kinds of list. The text stays plain text with Markdown in it, as
 * stored; the buttons only write the marks a person could type, and the email, its plain-text
 * part and the canvas draw them (core's `parseMarkdown`). Ctrl+B, I and K (⌘ on Apple's systems)
 * work in the text.
 *
 * The toolbar is one tab stop, its buttons reached with the arrow keys, Home and End (the ARIA
 * toolbar pattern). A button acts on the selection in the text and puts the focus back there.
 * Edits go in as typing (`insertText`), so the browser's undo takes them back as it does typing.
 */
export function MarkdownField({
  label,
  value,
  onChange,
  id,
  help,
  error,
  rows = 4,
  placeholder,
  maxLength,
}: MarkdownFieldProps) {
  const locked = useFieldsReadOnly();
  const { markdown } = useEditorMessages();
  const autoId = useId();
  const fieldId = id ?? autoId;
  const helpId = `${fieldId}-help`;
  const errorId = `${fieldId}-error`;
  const linkFormId = `${fieldId}-link`;
  const commandKey = useCommandKey();

  const textarea = useRef<HTMLTextAreaElement>(null);
  /** The selection to restore once an edit made through `onChange` comes back as `value`. */
  const pending = useRef<TextEdit | null>(null);
  /** Where the link goes, kept while the focus is in the link form. */
  const linkAt = useRef<{ start: number; end: number }>({ start: 0, end: 0 });
  const [linkText, setLinkText] = useState<string | null>(null);

  useLayoutEffect(() => {
    const field = textarea.current;
    const edit = pending.current;
    if (!field || !edit || field.value !== edit.value) return;
    pending.current = null;
    field.setSelectionRange(edit.start, edit.end);
  }, [value]);

  /** The field's text and selection as they are now. */
  const current = (): TextEdit | null => {
    const field = textarea.current;
    return field
      ? { value: field.value, start: field.selectionStart, end: field.selectionEnd }
      : null;
  };

  /**
   * Makes an edit: only the stretch that changed is replaced, as typing, where the browser can;
   * otherwise through `onChange`, putting the selection back once the new value arrives.
   */
  const apply = (edit: TextEdit): void => {
    const field = textarea.current;
    if (!field) return;
    field.focus();
    if (edit.value !== field.value) {
      const before = field.value;
      let head = 0;
      while (head < before.length && head < edit.value.length && before[head] === edit.value[head])
        head += 1;
      let tail = 0;
      while (
        tail < before.length - head &&
        tail < edit.value.length - head &&
        before[before.length - 1 - tail] === edit.value[edit.value.length - 1 - tail]
      )
        tail += 1;
      field.setSelectionRange(head, before.length - tail);
      const typed = typeAsUser(
        field.ownerDocument,
        edit.value.slice(head, edit.value.length - tail),
      );
      if (!typed || field.value !== edit.value) {
        pending.current = edit;
        onChange(edit.value);
        return;
      }
    }
    field.setSelectionRange(edit.start, edit.end);
  };

  const mark = (kind: InlineMark): void => {
    const now = current();
    if (now) apply(toggleMark(now.value, now.start, now.end, kind));
  };
  const line = (format: LineFormat): void => {
    const now = current();
    if (now) apply(setLineFormat(now.value, now.start, now.end, format));
  };
  const openLink = (): void => {
    const now = current();
    if (!now) return;
    linkAt.current = { start: now.start, end: now.end };
    setLinkText(now.value.slice(now.start, now.end).trim());
  };
  const closeLink = (): void => {
    setLinkText(null);
    const field = textarea.current;
    field?.focus();
    field?.setSelectionRange(linkAt.current.start, linkAt.current.end);
  };
  const addLink = (text: string, href: string): void => {
    setLinkText(null);
    const field = textarea.current;
    if (!field) return;
    const { start, end } = linkAt.current;
    apply(insertLink(field.value, start, end, text, href));
  };

  const command = (name: Command): void => {
    if (name === 'link') {
      if (linkText === null) openLink();
      else closeLink();
    } else if (name === 'bullet' || name === 'numbered') line(name);
    else mark(name);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (event.nativeEvent.isComposing || event.altKey || event.shiftKey) return;
    if (!(commandKey ? event.metaKey : event.ctrlKey)) return;
    const letter = shortcutLetter(event);
    if (letter === 'b' || letter === 'i') {
      event.preventDefault();
      mark(letter === 'b' ? 'bold' : 'italic');
    } else if (letter === 'k') {
      event.preventDefault();
      openLink();
    }
  };

  return (
    <Field className="bl:gap-2" data-invalid={error ? 'true' : undefined}>
      <FieldLabel htmlFor={fieldId}>{label}</FieldLabel>
      {locked ? null : (
        <Toolbar
          field={textOf(label)}
          controls={fieldId}
          linkOpen={linkText !== null}
          linkFormId={linkFormId}
          commandKey={commandKey}
          onCommand={command}
          onHeading={line}
          onMenuClosed={() => textarea.current?.focus()}
        />
      )}
      {linkText !== null && !locked ? (
        <MarkdownLinkForm id={linkFormId} text={linkText} onApply={addLink} onCancel={closeLink} />
      ) : null}
      <Textarea
        ref={textarea}
        id={fieldId}
        rows={rows}
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(helpId, error ? errorId : null)}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
        className="bl:max-h-[32rem]"
        style={{ minHeight: `${Math.max(2, rows) * 1.5 + 1}rem` }}
      />
      <Hint id={helpId}>
        {help ? <>{help} </> : null}
        {markdown.hint}
      </Hint>
      {error ? <FieldError id={errorId}>{error}</FieldError> : null}
    </Field>
  );
}

interface ToolbarProps {
  field: string;
  controls: string;
  linkOpen: boolean;
  linkFormId: string;
  commandKey: boolean;
  onCommand: (command: Command) => void;
  onHeading: (format: LineFormat) => void;
  onMenuClosed: () => void;
}

function Toolbar({
  field,
  controls,
  linkOpen,
  linkFormId,
  commandKey,
  onCommand,
  onHeading,
  onMenuClosed,
}: ToolbarProps) {
  const { formatting, markdown, common } = useEditorMessages();
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  /** A heading was chosen, so the menu hands the focus to the text rather than to its button. */
  const chosen = useRef(false);
  const [stop, setStop] = useState(0);
  const nameId = `${controls}-tools`;
  const count = TOOLS.length + 1;

  const labelOf = (command: Command): string =>
    ({
      bold: formatting.bold,
      italic: formatting.italic,
      strike: markdown.strikethrough,
      link: formatting.link,
      bullet: formatting.bulletedList,
      numbered: formatting.numberedList,
    })[command];

  function move(event: KeyboardEvent<HTMLButtonElement>, index: number): void {
    const last = count - 1;
    const next =
      event.key === 'ArrowRight'
        ? index === last
          ? 0
          : index + 1
        : event.key === 'ArrowLeft'
          ? index === 0
            ? last
            : index - 1
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? last
              : undefined;
    if (next === undefined) return;
    event.preventDefault();
    setStop(next);
    buttons.current[next]?.focus();
  }

  return (
    // Its own provider, with a short delay, so tooltips do not flash while the pointer crosses.
    <TooltipProvider delayDuration={300}>
      <div
        role="toolbar"
        aria-labelledby={nameId}
        aria-controls={controls}
        className="bl:flex bl:flex-wrap bl:items-center bl:gap-0.5"
      >
        <span id={nameId} hidden>
          {formatting.toolbar(field)}
        </span>
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <button
                  ref={(node) => {
                    buttons.current[0] = node;
                  }}
                  type="button"
                  tabIndex={stop === 0 ? 0 : -1}
                  onFocus={() => setStop(0)}
                  onKeyDown={(event) => move(event, 0)}
                  // Keeps the text's selection: the menu acts on the lines it touches.
                  onMouseDown={(event) => event.preventDefault()}
                  className={cn(
                    TOOL_CLASS,
                    'bl:gap-1 bl:px-2 bl:text-[0.8125rem] bl:font-medium bl:text-foreground',
                  )}
                >
                  {markdown.heading}
                  <ChevronDownIcon aria-hidden="true" className="bl:size-3!" />
                </button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={6}>
              {markdown.headingTip}
            </TooltipContent>
          </Tooltip>
          <DropdownMenuContent
            align="start"
            // Closes at once: the choice is already made in the text behind it.
            className="bl:min-w-44 bl:data-[state=closed]:animate-none!"
            onCloseAutoFocus={(event) => {
              if (!chosen.current) return;
              chosen.current = false;
              event.preventDefault();
              onMenuClosed();
            }}
          >
            {HEADINGS.map((heading) => (
              <DropdownMenuItem
                key={heading.format}
                onSelect={() => {
                  chosen.current = true;
                  onHeading(heading.format);
                }}
                className="bl:justify-between bl:gap-4"
              >
                <span className={heading.className}>{markdown[heading.word]}</span>
                {heading.mark ? (
                  <span aria-hidden="true" className="bl:text-xs bl:text-muted-foreground">
                    {heading.mark}
                  </span>
                ) : null}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        {TOOLS.map((tool, offset) => {
          const index = offset + 1;
          const label = labelOf(tool.command);
          const key = tool.key ? common.shortcut({ key: tool.key, apple: commandKey }) : undefined;
          const link = tool.command === 'link';
          return (
            <Fragment key={tool.command}>
              {tool.group ? (
                <Separator
                  orientation="vertical"
                  className="bl:mx-1 bl:data-[orientation=vertical]:h-5"
                />
              ) : null}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    ref={(node) => {
                      buttons.current[index] = node;
                    }}
                    type="button"
                    tabIndex={index === stop ? 0 : -1}
                    onFocus={() => setStop(index)}
                    onKeyDown={(event) => move(event, index)}
                    aria-label={label}
                    aria-keyshortcuts={
                      tool.key ? `${commandKey ? 'Meta' : 'Control'}+${tool.key}` : undefined
                    }
                    aria-expanded={link ? linkOpen : undefined}
                    aria-controls={link && linkOpen ? linkFormId : undefined}
                    // A press with the pointer leaves the selection in the text, where it acts.
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      setStop(index);
                      onCommand(tool.command);
                    }}
                    className={TOOL_CLASS}
                  >
                    <tool.Icon aria-hidden="true" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" sideOffset={6}>
                  {key ? formatting.tip(label, key) : label}
                </TooltipContent>
              </Tooltip>
            </Fragment>
          );
        })}
      </div>
    </TooltipProvider>
  );
}

/**
 * The words to link and where they lead, under the toolbar rather than in a prompt or a floating
 * popover, so it works the same at any width and reads in order, as the rich-text field's does.
 * The address may be a path on the host's site. Enter applies; Escape or Cancel closes it and puts
 * the focus back in the text. Not a `<form>`: the editor may sit inside a host's own form.
 */
function MarkdownLinkForm({
  id,
  text: initialText,
  onApply,
  onCancel,
}: {
  id: string;
  text: string;
  onApply: (text: string, href: string) => void;
  onCancel: () => void;
}) {
  const messages = useEditorMessages();
  const { formatting, markdown, common } = messages;
  const titleId = `${id}-title`;
  const [text, setText] = useState(initialText);
  const [address, setAddress] = useState('');
  const [error, setError] = useState<string>();
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    input.current?.focus();
  }, []);

  function apply(): void {
    const result = markdownLinkAddress(address, messages);
    if ('error' in result) {
      setError(result.error);
      input.current?.focus();
      return;
    }
    onApply(text, result.href);
  }

  const applyOnEnter = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    apply();
  };

  return (
    // A draft until it is applied, so undo while typing in it is the browser's.
    <div
      id={id}
      role="group"
      aria-labelledby={titleId}
      data-bl-draft=""
      // Escape closes the form, not the pane around it: capture comes first.
      onKeyDownCapture={(event) => {
        if (event.key !== 'Escape') return;
        event.preventDefault();
        onCancel();
      }}
      className="bl:flex bl:min-w-0 bl:flex-col bl:gap-3 bl:rounded-md bl:border bl:bg-background bl:p-3 bl:shadow-xs"
    >
      <p id={titleId} className="bl:text-sm bl:font-medium">
        {formatting.addLink}
      </p>
      <TextField
        label={markdown.linkText}
        value={text}
        onKeyDown={applyOnEnter}
        onChange={setText}
      />
      <TextField
        label={markdown.linkAddress}
        placeholder={markdown.linkPlaceholder}
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
      <div className="bl:flex bl:flex-wrap bl:gap-2">
        <Button type="button" size="sm" onClick={apply}>
          {formatting.apply}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          {common.cancel}
        </Button>
      </div>
    </div>
  );
}
