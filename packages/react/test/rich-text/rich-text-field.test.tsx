import { useState } from 'react';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { sanitizeHtml } from '@subterra-technologies/blockletter';
import { EditorFields } from '../../src/inspector/editor-fields';
import { RichTextField } from '../../src/rich-text/rich-text-field';
import { renderInEditor } from '../helpers/render';

/**
 * The field the way a block's editor holds it: controlled, every change fed back as `value`.
 * With `endStep`, it is inside an editor whose document history answers undo and redo.
 */
function renderField(initial: string, options: { readOnly?: boolean; endStep?: () => void } = {}) {
  const onChange = vi.fn<(html: string) => void>();
  function Host() {
    const [value, setValue] = useState(initial);
    return (
      <EditorFields readOnly={options.readOnly ?? false}>
        <RichTextField
          label="Text"
          value={value}
          onChange={(next) => {
            onChange(next);
            setValue(next);
          }}
        />
        <button type="button">Elsewhere</button>
      </EditorFields>
    );
  }
  const user = userEvent.setup();
  const { endStep } = options;
  const view = renderInEditor(<Host />, { context: endStep ? { history: { endStep } } : {} });
  const textbox = screen.getByRole('textbox', { name: 'Text' });
  const latest = (): string => {
    const call = onChange.mock.calls.at(-1);
    if (!call) throw new Error('onChange was never called');
    return call[0];
  };
  return { ...view, user, onChange, latest, textbox };
}

/** The text node holding `text`, inside `root`. */
function textNode(root: HTMLElement, text: string): Text {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (node.textContent?.includes(text)) return node as Text;
  }
  throw new Error(`No text node holds “${text}”`);
}

/** Focuses the text and selects `text` in it (or, with `caret`, puts the caret after it). */
function select(root: HTMLElement, text: string, options: { caret?: 'after' | 'before' } = {}) {
  act(() => root.focus());
  const node = textNode(root, text);
  const start = node.data.indexOf(text);
  const range = document.createRange();
  if (options.caret === 'after') range.setStart(node, start + text.length);
  else range.setStart(node, start);
  if (!options.caret) range.setEnd(node, start + text.length);
  const selection = document.getSelection();
  act(() => {
    selection?.removeAllRanges();
    selection?.addRange(range);
  });
}

const toolbar = () => screen.getByRole('toolbar', { name: 'Text formatting' });
const tool = (name: string) => within(toolbar()).getByRole('button', { name });

describe('RichTextField', () => {
  it('is a labelled, multiline text box under a named formatting toolbar', () => {
    const { textbox } = renderField('<p>Join us <strong>Friday</strong>.</p>');
    expect(textbox).toHaveAttribute('aria-multiline', 'true');
    expect(textbox).toHaveAttribute('contenteditable', 'true');
    expect(within(textbox).getByText('Friday').tagName).toBe('STRONG');
    expect(toolbar()).toHaveAttribute('aria-controls', textbox.id);
    expect(
      within(toolbar())
        .getAllByRole('button')
        .map((button) => button.getAttribute('aria-label')),
    ).toEqual(['Bold', 'Italic', 'Link', 'Bulleted list', 'Numbered list', 'Clear formatting']);
    expect(tool('Bold')).toHaveAttribute('aria-pressed', 'false');
    expect(tool('Bold')).toHaveAttribute('aria-keyshortcuts', 'Control+B');
    expect(tool('Link')).not.toHaveAttribute('aria-pressed');
    expect(tool('Link')).toHaveAttribute('aria-expanded', 'false');
  });

  it('shows what a selection has with aria-pressed', async () => {
    const { textbox } = renderField('<ul><li>Join us <strong>Friday</strong></li></ul>');
    select(textbox, 'Friday');
    await waitFor(() => expect(tool('Bold')).toHaveAttribute('aria-pressed', 'true'));
    expect(tool('Bulleted list')).toHaveAttribute('aria-pressed', 'true');
    expect(tool('Numbered list')).toHaveAttribute('aria-pressed', 'false');
    select(textbox, 'Join');
    await waitFor(() => expect(tool('Bold')).toHaveAttribute('aria-pressed', 'false'));
  });

  it('bolds and italicises the selection from the toolbar, keeping the focus in the text', async () => {
    const { user, textbox, latest } = renderField('<p>Join us Friday at nine.</p>');
    select(textbox, 'Friday');
    await user.click(tool('Bold'));
    expect(latest()).toBe('<p>Join us <strong>Friday</strong> at nine.</p>');
    expect(tool('Bold')).toHaveAttribute('aria-pressed', 'true');
    expect(textbox).toHaveFocus();
    await user.click(tool('Italic'));
    expect(latest()).toBe('<p>Join us <strong><em>Friday</em></strong> at nine.</p>');
    await user.click(tool('Bold'));
    expect(latest()).toBe('<p>Join us <em>Friday</em> at nine.</p>');
  });

  it('takes Ctrl+B and Ctrl+I, and keeps underline out', async () => {
    const { user, textbox, latest, onChange } = renderField('<p>Join us Friday.</p>');
    select(textbox, 'Friday');
    await user.keyboard('{Control>}b{/Control}');
    expect(latest()).toBe('<p>Join us <strong>Friday</strong>.</p>');
    await user.keyboard('{Control>}i{/Control}');
    expect(latest()).toBe('<p>Join us <strong><em>Friday</em></strong>.</p>');
    const calls = onChange.mock.calls.length;
    await user.keyboard('{Control>}u{/Control}');
    expect(onChange).toHaveBeenCalledTimes(calls);
  });

  it('types, and with nothing selected, keeps a chosen mark for what is typed next', async () => {
    const { user, textbox, latest } = renderField('<p>Join us</p>');
    select(textbox, 'us', { caret: 'after' });
    await user.keyboard(' on');
    expect(latest()).toBe('<p>Join us on</p>');
    await user.keyboard('{Control>}b{/Control}');
    expect(tool('Bold')).toHaveAttribute('aria-pressed', 'true');
    await user.keyboard(' Friday');
    expect(latest()).toBe('<p>Join us on<strong> Friday</strong></p>');
  });

  it('lays a mark chosen before an input method began over the text it composed', async () => {
    const { user, textbox, latest } = renderField('<p>Hello</p>');
    select(textbox, 'Hello', { caret: 'after' });
    await user.keyboard('{Control>}b{/Control}');
    fireEvent.compositionStart(textbox);
    const node = textNode(textbox, 'Hello');
    act(() => {
      node.appendData('語');
      document.getSelection()?.collapse(node, node.length);
    });
    fireEvent.input(textbox);
    fireEvent.compositionEnd(textbox);
    expect(latest()).toBe('<p>Hello<strong>語</strong></p>');
  });

  it('makes paragraphs with Enter, line breaks with Shift+Enter, and carries bold onto them', async () => {
    const { user, textbox, latest } = renderField('<p>One <strong>two</strong></p>');
    select(textbox, 'two', { caret: 'after' });
    await user.keyboard('{Enter}three');
    expect(latest()).toBe('<p>One <strong>two</strong></p><p><strong>three</strong></p>');
    await user.keyboard('{Shift>}{Enter}{/Shift}four');
    expect(latest()).toBe('<p>One <strong>two</strong></p><p><strong>three<br>four</strong></p>');
  });

  it('makes bulleted and numbered lists, switches between them and takes them away', async () => {
    const { user, textbox, latest } = renderField('<p>Welcome</p><p>Budget</p>');
    act(() => textbox.focus());
    const selection = document.getSelection();
    act(() => {
      selection?.setBaseAndExtent(textNode(textbox, 'Welcome'), 0, textNode(textbox, 'Budget'), 3);
    });
    await user.click(tool('Bulleted list'));
    expect(latest()).toBe('<ul><li>Welcome</li><li>Budget</li></ul>');
    expect(tool('Bulleted list')).toHaveAttribute('aria-pressed', 'true');
    await user.click(tool('Numbered list'));
    expect(latest()).toBe('<ol><li>Welcome</li><li>Budget</li></ol>');
    await user.click(tool('Numbered list'));
    expect(latest()).toBe('<p>Welcome</p><p>Budget</p>');
  });

  it('ends a list with Enter on an empty item, or Backspace at the start of one', async () => {
    const { user, textbox, latest } = renderField('<ul><li>One</li><li>Two</li></ul>');
    select(textbox, 'Two', { caret: 'after' });
    await user.keyboard('{Enter}{Enter}After');
    expect(latest()).toBe('<ul><li>One</li><li>Two</li></ul><p>After</p>');
    select(textbox, 'Two', { caret: 'before' });
    await user.keyboard('{Backspace}');
    expect(latest()).toBe('<ul><li>One</li></ul><p>Two</p><p>After</p>');
  });

  it('clears bold, italics and links from the selection', async () => {
    const { user, textbox, latest } = renderField(
      '<p><strong>Bold</strong> and <a href="https://example.test">linked</a></p>',
    );
    act(() => textbox.focus());
    act(() => {
      document
        .getSelection()
        ?.setBaseAndExtent(textNode(textbox, 'Bold'), 0, textNode(textbox, 'linked'), 6);
    });
    await user.click(tool('Clear formatting'));
    expect(latest()).toBe('<p>Bold and linked</p>');
  });

  it('adds a link through a small form, checking the address first', async () => {
    const { user, textbox, latest, onChange } = renderField('<p>See the agenda.</p>');
    select(textbox, 'agenda');
    await user.click(tool('Link'));
    const form = screen.getByRole('group', { name: 'Add a link' });
    expect(tool('Link')).toHaveAttribute('aria-expanded', 'true');
    expect(tool('Link')).toHaveAttribute('aria-controls', form.id);
    const address = within(form).getByRole('textbox', { name: 'Link address' });
    expect(address).toHaveFocus();
    expect(within(form).queryByRole('textbox', { name: 'Text to show' })).toBeNull();

    await user.type(address, 'javascript:alert(1){Enter}');
    expect(within(form).getByRole('alert')).toHaveTextContent(
      'Use a web address, such as https://example.org, or an email address.',
    );
    expect(address).toHaveAttribute('aria-invalid', 'true');
    expect(onChange).not.toHaveBeenCalled();

    await user.clear(address);
    await user.type(address, 'www.example.test/agenda');
    await user.click(within(form).getByRole('button', { name: 'Add link' }));
    expect(latest()).toBe(
      '<p>See the <a href="https://www.example.test/agenda" rel="noopener" target="_blank">agenda</a>.</p>',
    );
    expect(screen.queryByRole('group', { name: 'Add a link' })).toBeNull();
    expect(textbox).toHaveFocus();
  });

  it('edits and removes a link from a caret inside it, opened with Ctrl+K', async () => {
    const { user, textbox, latest } = renderField(
      '<p>See <a href="https://example.test/old">the agenda</a>.</p>',
    );
    select(textbox, 'agenda', { caret: 'before' });
    await waitFor(() => expect(tool('Edit link')).toBeInTheDocument());
    await user.keyboard('{Control>}k{/Control}');
    const form = screen.getByRole('group', { name: 'Edit link' });
    const address = within(form).getByRole('textbox', { name: 'Link address' });
    expect(address).toHaveValue('https://example.test/old');
    await user.clear(address);
    await user.type(address, 'https://example.test/new{Enter}');
    expect(latest()).toBe(
      '<p>See <a href="https://example.test/new" rel="noopener" target="_blank">the agenda</a>.</p>',
    );

    await user.keyboard('{Control>}k{/Control}');
    await user.click(
      within(screen.getByRole('group', { name: 'Edit link' })).getByRole('button', {
        name: 'Remove link',
      }),
    );
    expect(latest()).toBe('<p>See the agenda.</p>');
  });

  it('asks for the words to link when nothing is selected', async () => {
    const { user, textbox, latest } = renderField('<p>Write to .</p>');
    select(textbox, 'to ', { caret: 'after' });
    await user.keyboard('{Control>}k{/Control}');
    const form = screen.getByRole('group', { name: 'Add a link' });
    await user.type(
      within(form).getByRole('textbox', { name: 'Link address' }),
      'office@example.test',
    );
    const words = within(form).getByRole('textbox', { name: 'Text to show' });
    expect(words).toHaveAccessibleDescription('Leave it blank to show the address.');
    await user.type(words, 'the office{Enter}');
    expect(latest()).toBe(
      '<p>Write to <a href="mailto:office@example.test" rel="noopener" target="_blank">the office</a>.</p>',
    );
  });

  it('shows the address when no words are given for a link', async () => {
    const { user, textbox, latest } = renderField('<p>Write to .</p>');
    select(textbox, 'to ', { caret: 'after' });
    await user.keyboard('{Control>}k{/Control}');
    await user.type(
      screen.getByRole('textbox', { name: 'Link address' }),
      'office@example.test{Enter}',
    );
    expect(latest()).toBe(
      '<p>Write to <a href="mailto:office@example.test" rel="noopener" target="_blank">office@example.test</a>.</p>',
    );
  });

  it('closes the link form with Escape, changing nothing, and goes back to the text', async () => {
    const { user, textbox, onChange } = renderField('<p>See the agenda.</p>');
    select(textbox, 'agenda');
    await user.click(tool('Link'));
    const escape = vi.fn();
    document.addEventListener('keydown', (event) => escape(event.defaultPrevented), { once: true });
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('group', { name: 'Add a link' })).toBeNull();
    // Marked handled, so the one-pane layout does not take it for leaving the Edit pane.
    expect(escape).toHaveBeenCalledWith(true);
    expect(textbox).toHaveFocus();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('reduces pasted HTML to its own tags, through sanitizeHtml', () => {
    const { textbox, latest } = renderField('<p>Before after</p>');
    select(textbox, 'Before', { caret: 'after' });
    fireEvent.paste(textbox, {
      clipboardData: {
        getData: (kind: string) =>
          kind === 'text/html'
            ? '<meta charset="utf-8"><h2 style="color:red">Big</h2><p onclick="x()">A <span style="font-weight:700">bold</span> <u>word</u><img src="https://example.test/x.png"><script>alert(1)</script></p>'
            : 'Big A bold word',
      },
    });
    const html = latest();
    expect(html).toBe('<p>Before<strong>Big</strong></p><p>A <strong>bold</strong> word after</p>');
    expect(sanitizeHtml(html)).toBe(html);
  });

  it('pastes plain text as paragraphs and line breaks', () => {
    const { textbox, latest } = renderField('<p>Start</p>');
    select(textbox, 'Start', { caret: 'after' });
    fireEvent.paste(textbox, {
      clipboardData: {
        getData: (kind: string) => (kind === 'text/plain' ? ' one\ntwo\n\nthree' : ''),
      },
    });
    expect(latest()).toBe('<p>Start one<br>two</p><p>three</p>');
  });

  it('undoes and redoes its own steps', async () => {
    const { user, textbox, latest } = renderField('<p>Join us Friday.</p>');
    select(textbox, 'Friday');
    await user.keyboard('{Control>}b{/Control}');
    await user.click(tool('Bulleted list'));
    expect(latest()).toBe('<ul><li>Join us <strong>Friday</strong>.</li></ul>');
    await user.keyboard('{Control>}z{/Control}');
    expect(latest()).toBe('<p>Join us <strong>Friday</strong>.</p>');
    await user.keyboard('{Control>}z{/Control}');
    expect(latest()).toBe('<p>Join us Friday.</p>');
    await user.keyboard('{Control>}{Shift>}z{/Shift}{/Control}');
    expect(latest()).toBe('<p>Join us <strong>Friday</strong>.</p>');
    await user.keyboard('{Control>}y{/Control}');
    expect(latest()).toBe('<ul><li>Join us <strong>Friday</strong>.</li></ul>');
  });

  it('leaves undo and redo to the document’s history inside the editor', async () => {
    const endStep = vi.fn();
    const { user, textbox, onChange, latest } = renderField('<p>Join us Friday.</p>', {
      endStep,
    });
    select(textbox, 'Friday.', { caret: 'after' });
    await user.keyboard(' Soon');
    // Typing joins whatever step the document's history is making.
    expect(latest()).toBe('<p>Join us Friday. Soon</p>');
    expect(endStep).not.toHaveBeenCalled();

    select(textbox, 'Friday');
    await user.keyboard('{Control>}b{/Control}');
    // A command closes the step before it and its own, around the one change it hands on.
    expect(endStep).toHaveBeenCalledTimes(2);
    expect(latest()).toBe('<p>Join us <strong>Friday</strong>. Soon</p>');

    const calls = onChange.mock.calls.length;
    // The keys and the browser's own Undo go on, unhandled, to the editor around the field.
    expect(fireEvent.keyDown(textbox, { key: 'z', ctrlKey: true })).toBe(true);
    expect(fireEvent.keyDown(textbox, { key: 'y', ctrlKey: true })).toBe(true);
    const browserUndo = new InputEvent('beforeinput', {
      inputType: 'historyUndo',
      bubbles: true,
      cancelable: true,
    });
    expect(textbox.dispatchEvent(browserUndo)).toBe(true);
    expect(onChange).toHaveBeenCalledTimes(calls);
  });

  it('keeps an undo of its own when it is used alone', () => {
    const { textbox } = renderField('<p>Join us Friday.</p>');
    act(() => textbox.focus());
    expect(fireEvent.keyDown(textbox, { key: 'z', ctrlKey: true })).toBe(false);
  });

  it('puts the caret where an outside change was, not back at the start', () => {
    let replace: (value: string) => void = () => undefined;
    function Host() {
      const [value, setValue] = useState('<p>Join us Friday at nine sharp.</p>');
      replace = setValue;
      return <RichTextField label="Text" value={value} onChange={setValue} />;
    }
    renderInEditor(<Host />);
    const textbox = screen.getByRole('textbox', { name: 'Text' });
    select(textbox, 'nine', { caret: 'after' });
    // An undo taking " sharp" back out, as the editor's history would hand it in.
    act(() => replace('<p>Join us Friday at nine.</p>'));
    expect(textbox).toHaveTextContent('Join us Friday at nine.');
    expect(document.getSelection()?.anchorOffset).toBe(22);
    // And formatting: the caret goes after the words whose bold came back.
    act(() => replace('<p>Join us <strong>Friday</strong> at nine.</p>'));
    const caret = document.getSelection();
    expect(caret?.anchorNode?.textContent).toBe('Friday');
    expect(caret?.anchorOffset).toBe(6);
  });

  it('moves through the toolbar with the arrow keys, Home and End, as one tab stop', async () => {
    const { user, textbox } = renderField('<p>Text</p>');
    act(() => screen.getByRole('button', { name: 'Elsewhere' }).focus());
    await user.tab({ shift: true });
    expect(textbox).toHaveFocus();
    await user.tab({ shift: true });
    expect(tool('Bold')).toHaveFocus();
    await user.keyboard('{ArrowRight}');
    expect(tool('Italic')).toHaveFocus();
    await user.keyboard('{End}');
    expect(tool('Clear formatting')).toHaveFocus();
    await user.keyboard('{ArrowRight}');
    expect(tool('Bold')).toHaveFocus();
    await user.keyboard('{ArrowLeft}');
    expect(tool('Clear formatting')).toHaveFocus();
    await user.keyboard('{Home}');
    expect(tool('Bold')).toHaveFocus();
    expect(
      within(toolbar())
        .getAllByRole('button')
        .filter((button) => button.tabIndex === 0),
    ).toEqual([tool('Bold')]);
  });

  it('formats from the keyboard with the focus on the toolbar, then gives the selection back', async () => {
    const { user, textbox, latest } = renderField('<p>Join us Friday.</p>');
    select(textbox, 'Friday');
    await user.tab({ shift: true });
    expect(tool('Bold')).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(latest()).toBe('<p>Join us <strong>Friday</strong>.</p>');
    expect(tool('Bold')).toHaveFocus();
    expect(tool('Bold')).toHaveAttribute('aria-pressed', 'true');
    await user.tab();
    expect(textbox).toHaveFocus();
    expect(document.getSelection()?.toString()).toBe('Friday');
  });

  it('emits nothing for text that is only looked at', async () => {
    const { user, textbox, onChange } = renderField('<p>Hello <b>there</b></p>');
    select(textbox, 'there');
    await user.click(tool('Link'));
    await user.keyboard('{Escape}');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('shows a new value from outside in place of its own', () => {
    function Host() {
      const [value, setValue] = useState('<p>First</p>');
      return (
        <>
          <RichTextField label="Text" value={value} onChange={setValue} />
          <button type="button" onClick={() => setValue('<p><em>Second</em></p>')}>
            Replace
          </button>
        </>
      );
    }
    renderInEditor(<Host />);
    fireEvent.click(screen.getByRole('button', { name: 'Replace' }));
    expect(within(screen.getByRole('textbox', { name: 'Text' })).getByText('Second').tagName).toBe(
      'EM',
    );
  });

  it('says when its value has formatting editing would remove', () => {
    const { textbox } = renderField('<h2>Agenda</h2><p style="color:red">Red</p>');
    expect(textbox).toHaveAccessibleDescription(
      'This text has formatting the editor can’t keep, such as headings, images or colours. Editing it removes that; bold, italics, links and lists stay.',
    );
  });

  it('cannot be changed inside a read-only EditorFields, and has no toolbar there', () => {
    const { textbox } = renderField('<p>Fixed</p>', { readOnly: true });
    expect(textbox).toHaveAttribute('contenteditable', 'false');
    expect(textbox).toHaveAttribute('aria-disabled', 'true');
    expect(screen.queryByRole('toolbar')).toBeNull();
  });
});
