import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { useEditorContext } from '../editor/context';
import { describedBy, GroupLabel, Hint, useFieldsReadOnly } from '../inspector/editor-fields';
import { cn } from '../lib/cn';
import { Field, FieldError } from '../ui/field';
import {
  domMarksAt,
  hasUnsupportedFormatting,
  isTidy,
  parseRichText,
  readRichText,
  readSelection,
  renderEditable,
  richTextToHtml,
  writeSelection,
} from './dom';
import { FormattingToolbar, type FormattingCommand } from './formatting-toolbar';
import { createHistory, type Burst, type RichTextHistory, type Snapshot } from './history';
import { LinkForm } from './link-form';
import {
  NO_FORMATTING,
  activeFormatting,
  applyMarks,
  caretAfterChange,
  caretAt,
  clampSelection,
  clearFormatting,
  comparePoints,
  insertFragment,
  insertInlines,
  isCollapsed,
  liftListItem,
  linkAround,
  linkSelection,
  marksAt,
  runMarks,
  selectionRange,
  splitParagraph,
  textToRichText,
  toggleList,
  toggleMark,
  typedMarks,
  type ActiveFormatting,
  type Edit,
  type ListKind,
  type Mark,
  type Marks,
  type RichText,
  type TextPoint,
  type TextSelection,
} from './model';
import { useCommandKey } from './platform';

/*
 * How the field edits, and why.
 *
 * Two ways were weighed: a library (Lexical, Tiptap, or similar), or a small contentEditable
 * editor of our own. Measured with esbuild (minified, gzipped, React external), a setup that does
 * this much costs 121 KB with Tiptap, 86 KB with Lexical, 64 KB with bare ProseMirror and 51 to
 * 58 KB with Trix, Slate or Quill, against a budget of about 30 KB. Squire (18 KB) fits, but reads
 * `document` as it loads, which breaks a server render, and ships colours, fonts, alignment and
 * images that would all have to be switched off again.
 *
 * The browser's own editing commands (`execCommand`) were tried in Chromium and Firefox. Bold and
 * italic agree; lists and links do not: Chromium puts a list inside the `<p>` it came from,
 * Firefox nests one link inside another when a link is changed and leaves bare text behind when
 * a list is taken away, and once markup is repaired after a command, the browser's undo history
 * points at nodes that are gone.
 *
 * So the field leaves the browser what every engine does the same (typing, deleting, the caret,
 * spelling, input methods) and does the rest itself, as pure functions on a small document of
 * paragraphs and formatted runs (`model.ts`): bold, italics, links, lists, Enter and paste, and
 * undo where the editor's own history is not there to answer it (see `RichTextField`).
 * After each command it redraws its markup from that document, so what it stores is always the
 * same few tags `sanitizeHtml` leaves unchanged. It adds 11.2 KB to the package (minified and
 * gzipped, measured the same way) and no dependency, every command can be tested without a
 * browser, and the browser tests cover the typing.
 */

export interface RichTextFieldProps {
  label: ReactNode;
  /** HTML: what `onChange` gave last, or any other, which is read through `sanitizeHtml`. */
  value: string;
  /**
   * The text as HTML in `p`, `br`, `strong`, `em`, `a`, `ul`, `ol` and `li` only, which
   * `sanitizeHtml` leaves exactly as it is; '' when the text is empty. Called as it is edited.
   */
  onChange: (html: string) => void;
  /** Made with `useId` when not given. */
  id?: string;
  help?: ReactNode;
  /** Shown under the field, linked to it, and marks it invalid. */
  error?: string;
  /** How tall the box starts, in lines. */
  rows?: number;
  /** Shows the text without letting it change. A read-only `EditorFields` does the same. */
  disabled?: boolean;
}

/** Bold and italic chosen with nothing selected, for whatever is typed next at `at`. */
interface Pending {
  at: TextPoint;
  marks: Pick<Marks, 'bold' | 'italic'>;
}

/** The link form's subject: the text it links, and the address already there. */
interface LinkDraft {
  selection: TextSelection;
  href: string;
  editing: boolean;
  needsText: boolean;
}

const START: TextSelection = caretAt({ paragraph: 0, offset: 0 });

const sameMarks = (a: Marks, b: Marks): boolean =>
  a.bold === b.bold && a.italic === b.italic && (a.href ?? '') === (b.href ?? '');

/** A shortcut's letter: the key's own on Latin layouts, its position on others. */
const shortcutLetter = (event: KeyboardEvent): string =>
  /^[a-z]$/i.test(event.key)
    ? event.key.toLowerCase()
    : /^Key[A-Z]$/.test(event.code)
      ? event.code.slice(3).toLowerCase()
      : '';

const hasWords = (doc: RichText): boolean => doc.some((paragraph) => paragraph.inlines.length);

/**
 * A labelled text box for formatted writing: bold, italics, links, and bulleted and numbered
 * lists, from a toolbar or the keyboard (Ctrl or ⌘ with B, I and K). Pasted text keeps those and
 * loses everything else.
 *
 * Undo is one history for the whole issue. Inside `NewsletterEditor` (where the editor context's
 * `history` is set), Ctrl or ⌘ with Z and Y, the browser's own Undo and the top bar's buttons are
 * all the document's: the field leaves them alone, its typing joins into steps as any field's
 * does, and its commands (bold, a list, a link, a paste) are steps of their own. When an undo
 * changes its text, the caret goes where the change was. Used anywhere else, the field keeps a
 * history of its own, with the same keys.
 *
 * It is controlled like `AreaField`, in HTML: whatever `value` holds is shown through
 * `sanitizeHtml`, and nothing is emitted until the text is actually edited, so a value that is
 * only looked at is never rewritten. Formatting it cannot keep (headings, images, colours) is
 * pointed out beside it, because editing removes it.
 */
export function RichTextField({
  label,
  value,
  onChange,
  id,
  help,
  error,
  rows = 6,
  disabled = false,
}: RichTextFieldProps) {
  const locked = useFieldsReadOnly() || disabled;
  /** The document's history, which answers undo and redo instead, inside `NewsletterEditor`. */
  const { history: documentHistory } = useEditorContext();
  const autoId = useId();
  const fieldId = id ?? autoId;
  const labelId = `${fieldId}-label`;
  const helpId = `${fieldId}-help`;
  const errorId = `${fieldId}-error`;
  const noteId = `${fieldId}-note`;
  const linkFormId = `${fieldId}-link`;
  const commandKey = useCommandKey();
  const unsupported = useMemo(() => hasUnsupportedFormatting(value), [value]);
  const [formatting, setFormatting] = useState<ActiveFormatting>(NO_FORMATTING);
  const [draft, setDraft] = useState<LinkDraft | null>(null);

  const root = useRef<HTMLDivElement>(null);
  /** The HTML the text box holds: the `value` it last showed, or what it last emitted. */
  const shown = useRef<string | null>(null);
  /** The selection, kept while the focus is on the toolbar or in the link form. */
  const selection = useRef<TextSelection | null>(null);
  const pending = useRef<Pending | null>(null);
  const composing = useRef(false);
  /** Where an input method's text starts, and the marks chosen for it before it began. */
  const composition = useRef<{ start: TextPoint; marks: Pending['marks'] } | null>(null);
  /** The focus is arriving from a pointer, which puts the caret where it pressed. */
  const pointer = useRef(false);
  /** The field's own history, used only where the document's is not there to answer. */
  const historyRef = useRef<RichTextHistory | null>(null);
  const ownHistory = (): RichTextHistory => (historyRef.current ??= createHistory());
  /** Remembers the text before the browser changes it, in the field's own history. */
  const record = (before: Snapshot, burst?: Burst): void => {
    if (!documentHistory) ownHistory().record(() => before, burst);
  };

  // A `value` from outside (an undo, the host's own change) replaces the text, and the caret
  // goes where it changed, as the browser's own undo leaves it: not back to the start.
  useLayoutEffect(() => {
    const element = root.current;
    if (!element || value === shown.current) return;
    const replacing = shown.current !== null;
    shown.current = value;
    const before = replacing ? readRichText(element, { tidy: false }).doc : undefined;
    const doc = parseRichText(value);
    element.innerHTML = renderEditable(doc);
    historyRef.current?.clear();
    pending.current = null;
    if (!before) return;
    const changed = caretAfterChange(before, doc);
    const at = changed ? caretAt(changed) : clampSelection(doc, selection.current ?? START);
    selection.current = at;
    if (element.ownerDocument.activeElement === element) writeSelection(element, at);
  }, [value]);

  /** The text as the DOM holds it, and the selection: the live one while it has the focus. */
  function current(): Snapshot | undefined {
    const element = root.current;
    if (!element) return undefined;
    const read = readSelection(element);
    const focused = element.ownerDocument.activeElement === element;
    const kept = (focused ? read.selection : undefined) ?? selection.current ?? START;
    return { doc: read.doc, selection: clampSelection(read.doc, kept) };
  }

  function refresh(doc: RichText, at: TextSelection): void {
    setFormatting(activeFormatting(doc, at, pendingAt(at)));
  }

  /**
   * The marks chosen for the next keystroke, while the caret is still where they were chosen.
   * The selection's own events arrive late, so a caret that has moved since is checked here too.
   */
  function pendingAt(at: TextSelection): Pending['marks'] | undefined {
    const kept = pending.current;
    if (kept && isCollapsed(at) && comparePoints(at.anchor, kept.at) === 0) return kept.marks;
    pending.current = null;
    return undefined;
  }

  /**
   * Draws `doc`, and puts the selection in it: in the DOM's too, but only while the text has the
   * focus. Chromium and Firefox both move the focus to editable text a selection is put in, which
   * would pull a keyboard user off the toolbar button they just pressed.
   */
  function show(doc: RichText, at: TextSelection, focus = false): void {
    const element = root.current;
    if (!element) return;
    selection.current = at;
    element.innerHTML = renderEditable(doc);
    if (focus) element.focus({ preventScroll: true });
    if (element.ownerDocument.activeElement === element) writeSelection(element, at);
    refresh(doc, at);
  }

  function emit(doc: RichText): void {
    const html = richTextToHtml(doc);
    if (html === shown.current) return;
    shown.current = html;
    onChange(html);
  }

  /**
   * A change the field makes itself, drawn and handed on. `typing` marks one that is part of
   * typing (a letter, Enter), which joins the keystrokes around it into one step; anything else
   * is a command, a step of its own. Inside the editor, the document's history keeps the steps:
   * a command closes the step before it and its own, so neither joins the typing either side.
   */
  function change(
    edit: (doc: RichText, at: TextSelection) => Edit,
    options: { focus?: boolean; typing?: Burst } = {},
  ): Edit | undefined {
    if (locked) return undefined;
    const before = current();
    if (!before) return undefined;
    const after = edit(before.doc, before.selection);
    record(before, options.typing);
    show(after.doc, after.selection, options.focus);
    const command = !options.typing;
    if (command) documentHistory?.endStep();
    emit(after.doc);
    if (command) documentHistory?.endStep();
    return after;
  }

  /** After the browser's own editing: redrawn if it left markup the field does not draw. */
  function sync(): void {
    const element = root.current;
    if (!element || composing.current) return;
    const read = readSelection(element);
    if (!isTidy(element)) {
      element.innerHTML = renderEditable(read.doc);
      if (read.selection && element.ownerDocument.activeElement === element) {
        writeSelection(element, read.selection);
      }
    }
    if (read.selection) selection.current = read.selection;
    emit(read.doc);
    if (read.selection) refresh(read.doc, read.selection);
  }

  function toggle(mark: Mark): void {
    const before = current();
    if (!before || locked) return;
    if (isCollapsed(before.selection)) {
      // Nothing selected: the mark is for whatever is typed next, as in a word processor.
      const base = pendingAt(before.selection) ?? marksAt(before.doc, before.selection.anchor);
      const marks = { bold: base.bold, italic: base.italic, [mark]: !base[mark] };
      pending.current = { at: before.selection.anchor, marks };
      selection.current = before.selection;
      refresh(before.doc, before.selection);
      return;
    }
    change((doc, at) => ({ doc: toggleMark(doc, at, mark), selection: at }));
  }

  function list(kind: ListKind): void {
    change((doc, at) => ({ doc: toggleList(doc, at, kind), selection: at }));
  }

  function clear(): void {
    pending.current = null;
    change((doc, at) => ({ doc: clearFormatting(doc, at), selection: at }));
  }

  /** Enter and Shift+Enter. The new line carries on bold and italics, as a word processor's does. */
  function breakLine(kind: 'paragraph' | 'line'): void {
    const before = current();
    if (!before) return;
    const [start] = selectionRange(before.selection);
    const carried = pendingAt(before.selection) ?? marksAt(before.doc, start);
    pending.current = null;
    const after = change(
      (doc, at) =>
        kind === 'paragraph' ? splitParagraph(doc, at) : insertInlines(doc, at, [{ br: true }]),
      { typing: 'insert' },
    );
    if (after && (carried.bold || carried.italic)) {
      pending.current = {
        at: after.selection.anchor,
        marks: { bold: carried.bold, italic: carried.italic },
      };
      refresh(after.doc, after.selection);
    }
  }

  /**
   * A keystroke. The browser types it when the text around the caret already has the formatting
   * it should take; otherwise (a mark chosen for it, the end of a link, typing over a selection)
   * the field puts it in itself.
   */
  function typeText(event: InputEvent): void {
    const element = root.current;
    const text = event.data ?? '';
    // Only typing into the field while it has the focus is the field's to answer.
    if (!element || !text || element.ownerDocument.activeElement !== element) return;
    const before = current();
    if (!before) return;
    const chosen = pendingAt(before.selection);
    const marks = chosen
      ? { ...marksAt(before.doc, before.selection.anchor), ...chosen }
      : typedMarks(before.doc, before.selection);
    const caret = element.ownerDocument.getSelection();
    const browser =
      isCollapsed(before.selection) && caret?.anchorNode
        ? domMarksAt(element, { node: caret.anchorNode, offset: caret.anchorOffset })
        : undefined;
    if (browser && sameMarks(browser, marks)) {
      record(before, 'insert');
      return;
    }
    event.preventDefault();
    pending.current = null;
    change((doc, at) => insertInlines(doc, at, [{ text, ...runMarks(marks) }]), {
      typing: 'insert',
    });
  }

  /** A paste or a drop: HTML through `sanitizeHtml` into the field's few tags, else plain text. */
  function insertData(data: DataTransfer | null, at?: TextSelection): void {
    const before = current();
    if (!data || !before || locked) return;
    const target = at ?? before.selection;
    let fragment = parseRichText(data.getData('text/html'));
    if (!hasWords(fragment)) {
      fragment = textToRichText(data.getData('text/plain'), typedMarks(before.doc, target));
    }
    if (!hasWords(fragment)) return;
    change((doc) => insertFragment(doc, clampSelection(doc, target), fragment), { focus: true });
  }

  /** Undo or redo in the field's own history, where the document's is not there to answer. */
  function step(direction: 'undo' | 'redo'): void {
    const before = current();
    if (!before || locked || documentHistory) return;
    const next = direction === 'undo' ? ownHistory().undo(before) : ownHistory().redo(before);
    if (!next) return;
    pending.current = null;
    show(next.doc, clampSelection(next.doc, next.selection), true);
    emit(next.doc);
  }

  function openLink(): void {
    const before = current();
    if (!before || locked) return;
    const link = linkAround(before.doc, before.selection);
    selection.current = before.selection;
    setDraft(
      link
        ? {
            selection: { anchor: link.start, focus: link.end },
            href: link.href,
            editing: true,
            needsText: false,
          }
        : {
            selection: before.selection,
            href: '',
            editing: false,
            needsText: isCollapsed(before.selection),
          },
    );
  }

  function applyLink(href: string, text: string): void {
    const subject = draft;
    setDraft(null);
    if (!subject) return;
    change(
      (doc) => {
        const at = clampSelection(doc, subject.selection);
        if (!subject.needsText) return { doc: linkSelection(doc, at, href), selection: at };
        const [start] = selectionRange(at);
        const { bold, italic } = marksAt(doc, start);
        const words = text.trim() || href.replace(/^mailto:/i, '');
        const edit = insertInlines(doc, at, [{ text: words, ...runMarks({ bold, italic, href }) }]);
        return { doc: edit.doc, selection: { anchor: start, focus: edit.selection.focus } };
      },
      { focus: true },
    );
  }

  function removeLink(): void {
    const subject = draft;
    setDraft(null);
    if (!subject) return;
    change(
      (doc) => {
        const at = clampSelection(doc, subject.selection);
        return { doc: linkSelection(doc, at, undefined), selection: at };
      },
      { focus: true },
    );
  }

  function closeLink(): void {
    setDraft(null);
    // The focus handler puts back the selection the form was opened on.
    root.current?.focus({ preventScroll: true });
  }

  function command(name: FormattingCommand): void {
    if (name === 'bold' || name === 'italic') toggle(name);
    else if (name === 'ul' || name === 'ol') list(name);
    else if (name === 'clear') clear();
    else if (draft) closeLink();
    else openLink();
  }

  /** What the browser is about to do to the text: the field's own commands are taken over. */
  function beforeInput(event: InputEvent): void {
    if (locked) {
      event.preventDefault();
      return;
    }
    const kind = event.inputType;
    const take = (run: () => void) => {
      event.preventDefault();
      run();
    };
    switch (kind) {
      // Inside the editor, the browser's own Undo and Redo go on to the document's history.
      case 'historyUndo':
        return documentHistory ? undefined : take(() => step('undo'));
      case 'historyRedo':
        return documentHistory ? undefined : take(() => step('redo'));
      case 'insertParagraph':
        return take(() => breakLine('paragraph'));
      case 'insertLineBreak':
        return take(() => breakLine('line'));
      case 'formatBold':
        return take(() => toggle('bold'));
      case 'formatItalic':
        return take(() => toggle('italic'));
      case 'formatRemove':
        return take(clear);
      case 'insertUnorderedList':
        return take(() => list('ul'));
      case 'insertOrderedList':
        return take(() => list('ol'));
      case 'insertFromPaste':
      case 'insertFromPasteAsQuotation':
        return take(() => insertData(event.dataTransfer));
      case 'insertFromDrop':
        return take(() => insertData(event.dataTransfer, dropPoint(event)));
      case 'insertText':
        return typeText(event);
      case 'insertCompositionText':
        return;
      case 'deleteContentBackward': {
        // Backspace at the start of a list item takes the item out of its list, as in a word
        // processor, rather than joining it to the item above.
        const before = current();
        const at = before?.selection.anchor;
        if (
          before &&
          at &&
          isCollapsed(before.selection) &&
          at.offset === 0 &&
          before.doc[at.paragraph]?.list
        ) {
          return take(() =>
            change((doc, selected) => ({ doc: liftListItem(doc, at), selection: selected }), {
              typing: 'delete',
            }),
          );
        }
        if (before) record(before, 'delete');
        return;
      }
      default: {
        // Formatting the field does not offer (underline, colours, alignment) never goes in.
        if (kind.startsWith('format') || kind === 'insertHorizontalRule' || kind === 'insertLink') {
          event.preventDefault();
          return;
        }
        const before = current();
        if (before) record(before, kind.startsWith('delete') ? 'delete' : undefined);
      }
    }
  }

  /** Where a drop lands in the document. */
  function dropPoint(event: InputEvent): TextSelection | undefined {
    const element = root.current;
    const range = event.getTargetRanges()[0];
    if (!element || !range) return undefined;
    const read = readRichText(element, { tidy: false }, [
      { node: range.startContainer, offset: range.startOffset },
    ]);
    const point = read.points[0];
    return point ? caretAt(point) : undefined;
  }

  function selectionChange(): void {
    const element = root.current;
    if (!element || composing.current || element.ownerDocument.activeElement !== element) return;
    const read = readSelection(element);
    if (!read.selection) return;
    selection.current = read.selection;
    refresh(read.doc, read.selection);
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    if (locked || event.nativeEvent.isComposing) return;
    const modifier = commandKey ? event.metaKey : event.ctrlKey;
    if (!modifier || event.altKey) return;
    const letter = shortcutLetter(event);
    if (letter === 'z' || (letter === 'y' && !commandKey)) {
      // Inside the editor these are the document's: left to bubble up to it, unhandled here.
      if (documentHistory) return;
      event.preventDefault();
      step(letter === 'z' && !event.shiftKey ? 'undo' : 'redo');
    } else if (event.shiftKey) {
      return;
    } else if (letter === 'b' || letter === 'i') {
      event.preventDefault();
      toggle(letter === 'b' ? 'bold' : 'italic');
    } else if (letter === 'k') {
      event.preventDefault();
      openLink();
    } else if (letter === 'u') {
      // No underline: in an email, underlined words read as a link.
      event.preventDefault();
    }
  }

  function onFocus(): void {
    const element = root.current;
    if (!element) return;
    setDraft(null);
    const kept = selection.current;
    // Back from the toolbar, the caret goes back where it was: a redraw meanwhile leaves the DOM's
    // selection on the box itself, and a Tab leaves none. A caret already in the text was put there
    // on purpose, by a pointer, a script or assistive technology, and stays.
    const live = element.ownerDocument.getSelection();
    const placed =
      live?.anchorNode && live.anchorNode !== element && element.contains(live.anchorNode);
    if (!pointer.current && kept && !placed) {
      const { doc } = readSelection(element);
      const at = clampSelection(doc, kept);
      writeSelection(element, at);
      refresh(doc, at);
    }
    pointer.current = false;
  }

  // The browser's `beforeinput` (which says what an edit is) and the document's `selectionchange`
  // reach the latest handlers through this.
  const handlers = useRef({ beforeInput, selectionChange });
  useLayoutEffect(() => {
    handlers.current = { beforeInput, selectionChange };
  });
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const page = element.ownerDocument;
    const onBeforeInput = (event: InputEvent) => handlers.current.beforeInput(event);
    const onSelectionChange = () => handlers.current.selectionChange();
    element.addEventListener('beforeinput', onBeforeInput);
    page.addEventListener('selectionchange', onSelectionChange);
    return () => {
      element.removeEventListener('beforeinput', onBeforeInput);
      page.removeEventListener('selectionchange', onSelectionChange);
    };
  }, []);

  return (
    <Field className="bl:gap-2" data-invalid={error ? 'true' : undefined}>
      <GroupLabel id={labelId}>{label}</GroupLabel>
      {locked ? null : (
        <FormattingToolbar
          labelId={labelId}
          controls={fieldId}
          formatting={formatting}
          linkOpen={draft !== null}
          linkFormId={linkFormId}
          commandKey={commandKey}
          onCommand={command}
        />
      )}
      {draft ? (
        <LinkForm
          id={linkFormId}
          editing={draft.editing}
          needsText={draft.needsText}
          href={draft.href}
          onApply={applyLink}
          onRemove={removeLink}
          onCancel={closeLink}
        />
      ) : null}
      <div
        ref={root}
        id={fieldId}
        role="textbox"
        aria-multiline="true"
        aria-labelledby={labelId}
        aria-describedby={describedBy(
          unsupported && noteId,
          help ? helpId : null,
          error ? errorId : null,
        )}
        aria-invalid={error ? true : undefined}
        aria-disabled={locked || undefined}
        contentEditable={!locked}
        suppressContentEditableWarning
        spellCheck
        tabIndex={locked ? -1 : 0}
        onKeyDown={onKeyDown}
        onInput={sync}
        onPaste={(event) => {
          event.preventDefault();
          insertData(event.clipboardData);
        }}
        onPointerDown={() => {
          pointer.current = true;
        }}
        onFocus={onFocus}
        onBlur={() => {
          historyRef.current?.seal();
          pointer.current = false;
        }}
        onCompositionStart={() => {
          composing.current = true;
          const before = current();
          // An input method's text cannot be put in by the field, so a mark chosen for it is
          // laid over it once it is done.
          const chosen = before && pendingAt(before.selection);
          composition.current =
            before && chosen ? { start: selectionRange(before.selection)[0], marks: chosen } : null;
          pending.current = null;
          if (before) record(before, 'insert');
        }}
        onCompositionEnd={() => {
          composing.current = false;
          sync();
          const composed = composition.current;
          composition.current = null;
          if (composed) {
            change(
              (doc, at) => ({
                doc: applyMarks(doc, { anchor: composed.start, focus: at.focus }, composed.marks),
                selection: at,
              }),
              { typing: 'insert' },
            );
          }
        }}
        className={cn(
          'bl:max-h-[32rem] bl:w-full bl:min-w-0 bl:overflow-y-auto bl:rounded-md bl:border bl:border-input bl:bg-transparent bl:px-3 bl:py-2 bl:text-base bl:leading-relaxed bl:break-words bl:shadow-xs bl:transition-[color,box-shadow] bl:outline-none bl:md:text-sm',
          // Spaces show as typed, so the text in the DOM is the document's, character for
          // character: collapsed, a space at the end of a line vanishes and takes the caret
          // with it. What the field stores still collapses them, as the email will.
          'bl:whitespace-pre-wrap',
          'bl:focus-visible:border-ring bl:focus-visible:ring-[3px] bl:focus-visible:ring-ring/50',
          'bl:aria-invalid:border-destructive bl:aria-invalid:ring-destructive/20 bl:dark:bg-input/30 bl:dark:aria-invalid:ring-destructive/40',
          'bl:aria-disabled:cursor-not-allowed bl:aria-disabled:opacity-50',
          // The text's own formatting, which the scoped reset takes off lists and paragraphs.
          'bl:[&_ol]:mb-2 bl:[&_ol]:list-decimal bl:[&_ol]:pl-6 bl:[&_p]:mb-2 bl:[&_ul]:mb-2 bl:[&_ul]:list-disc bl:[&_ul]:pl-6 bl:[&_li]:mb-1 bl:[&>:last-child]:mb-0',
          'bl:[&_a]:text-info bl:[&_a]:underline bl:[&_a]:underline-offset-2',
        )}
        style={{ minHeight: `${Math.max(2, rows) * 1.5 + 1}rem` }}
      />
      {unsupported ? (
        <Hint id={noteId}>
          This text has formatting the editor can’t keep, such as headings, images or colours.
          Editing it removes that; bold, italics, links and lists stay.
        </Hint>
      ) : null}
      {help ? <Hint id={helpId}>{help}</Hint> : null}
      {error ? <FieldError id={errorId}>{error}</FieldError> : null}
    </Field>
  );
}
