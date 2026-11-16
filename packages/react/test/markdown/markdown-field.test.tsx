import { useState } from 'react';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { EditorFields, MarkdownField, enMessages } from '../../src';
import { markdownLinkAddress } from '../../src/markdown/link-address';
import { renderInEditor } from '../helpers/render';

const HINT = enMessages.markdown.hint;

function Harness({
  initial = '',
  help,
  readOnly = false,
}: {
  initial?: string;
  help?: string;
  readOnly?: boolean;
}) {
  const [value, setValue] = useState(initial);
  return (
    <EditorFields readOnly={readOnly}>
      <MarkdownField label="Text" value={value} onChange={setValue} help={help} />
      <output data-testid="stored">{value}</output>
    </EditorFields>
  );
}

const setup = (initial = '', options: { help?: string; readOnly?: boolean } = {}) => {
  const user = userEvent.setup();
  renderInEditor(<Harness initial={initial} {...options} />);
  const field = screen.getByLabelText('Text', { selector: 'textarea' }) as HTMLTextAreaElement;
  const stored = () => screen.getByTestId('stored').textContent;
  const select = (from: number, to: number) => {
    field.focus();
    field.setSelectionRange(from, to);
  };
  return { user, field, stored, select };
};

const button = (name: string | RegExp) => screen.getByRole('button', { name });

describe('MarkdownField', () => {
  it('is a labelled text area with a named toolbar of labelled buttons', () => {
    const { field } = setup();
    const toolbar = screen.getByRole('toolbar', { name: 'Text formatting' });
    expect(toolbar).toHaveAttribute('aria-controls', field.id);
    for (const name of [
      'Bold',
      'Italic',
      'Strikethrough',
      'Link',
      'Bulleted list',
      'Numbered list',
    ]) {
      expect(within(toolbar).getByRole('button', { name })).toBeInTheDocument();
    }
    expect(within(toolbar).getByRole('button', { name: 'Heading' })).toHaveAttribute(
      'aria-haspopup',
      'menu',
    );
    expect(within(toolbar).getByRole('button', { name: 'Bold' })).toHaveAttribute(
      'aria-keyshortcuts',
      'Control+B',
    );
    expect(within(toolbar).queryByRole('button', { name: /colou?r|underline/i })).toBeNull();
  });

  it('says what it understands, after any help of the field’s own', () => {
    const { field } = setup('', { help: 'Leave a blank line between paragraphs.' });
    expect(field).toHaveAccessibleDescription(`Leave a blank line between paragraphs. ${HINT}`);
    expect(HINT).toMatch(/buttons/);
    expect(HINT).toMatch(/\*\*bold\*\*/);
    expect(HINT).toMatch(/Appearance/);
  });

  it('wraps the selection in bold, and unwraps it on a second press', async () => {
    const { user, stored, select, field } = setup('Join us Saturday');
    select(8, 16);
    await user.click(button('Bold'));
    expect(stored()).toBe('Join us **Saturday**');
    expect([field.selectionStart, field.selectionEnd]).toEqual([10, 18]);
    expect(field).toHaveFocus();
    await user.click(button('Bold'));
    expect(stored()).toBe('Join us Saturday');
  });

  it('wraps in italic and strikethrough too', async () => {
    const { user, stored, select } = setup('was $40');
    select(4, 7);
    await user.click(button('Strikethrough'));
    expect(stored()).toBe('was ~~$40~~');
    await user.click(button('Italic'));
    expect(stored()).toBe('was ~~*$40*~~');
  });

  it('answers Ctrl+B, Ctrl+I and Ctrl+K, and leaves Shift and Alt alone', async () => {
    const { user, stored, select } = setup('one two');
    select(0, 3);
    await user.keyboard('{Control>}b{/Control}');
    expect(stored()).toBe('**one** two');
    await user.keyboard('{Control>}i{/Control}');
    expect(stored()).toBe('***one*** two');
    await user.keyboard('{Control>}{Shift>}b{/Shift}{/Control}');
    expect(stored()).toBe('***one*** two');
    await user.keyboard('{Control>}k{/Control}');
    expect(screen.getByRole('group', { name: 'Add a link' })).toBeInTheDocument();
  });

  it('makes lists of the selected lines and takes them away again', async () => {
    const { user, stored, select } = setup('one\ntwo');
    select(0, 7);
    await user.click(button('Bulleted list'));
    expect(stored()).toBe('- one\n- two');
    await user.click(button('Numbered list'));
    expect(stored()).toBe('1. one\n2. two');
    await user.click(button('Numbered list'));
    expect(stored()).toBe('one\ntwo');
  });

  it('sets a heading on the current line from the Heading menu', async () => {
    const { user, stored, select, field } = setup('Intro\nTitle');
    select(8, 8);
    await user.click(button('Heading'));
    await user.click(await screen.findByRole('menuitem', { name: /Medium heading/ }));
    expect(stored()).toBe('Intro\n## Title');
    expect(field).toHaveFocus();
    await user.click(button('Heading'));
    await user.click(await screen.findByRole('menuitem', { name: /Normal text/ }));
    expect(stored()).toBe('Intro\nTitle');
  });

  it('adds a link from the link form, with the selection as its text', async () => {
    const { user, stored, select, field } = setup('See our events page');
    select(4, 19);
    await user.click(button('Link'));
    expect(button('Link')).toHaveAttribute('aria-expanded', 'true');
    const form = screen.getByRole('group', { name: 'Add a link' });
    expect(within(form).getByLabelText('Text')).toHaveValue('our events page');
    expect(within(form).getByLabelText('Link to')).toHaveFocus();
    await user.keyboard('/events{Enter}');
    expect(stored()).toBe('See [our events page](/events)');
    expect(screen.queryByRole('group', { name: 'Add a link' })).toBeNull();
    expect(field).toHaveFocus();
    expect(field.selectionStart).toBe(stored()?.length);
  });

  it('refuses an address that is not a link, and says why', async () => {
    const { user, stored, select } = setup('Hello');
    select(0, 5);
    await user.click(button('Link'));
    const form = screen.getByRole('group', { name: 'Add a link' });
    await user.type(within(form).getByLabelText('Link to'), 'javascript:alert(1)');
    await user.click(within(form).getByRole('button', { name: 'Add link' }));
    expect(within(form).getByLabelText('Link to')).toHaveAccessibleDescription(
      enMessages.markdown.invalidAddress,
    );
    expect(stored()).toBe('Hello');
  });

  it('closes the link form with Escape or Cancel, leaving the text alone', async () => {
    const { user, stored, select, field } = setup('Hello');
    select(0, 5);
    await user.click(button('Link'));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('group', { name: 'Add a link' })).toBeNull();
    expect(field).toHaveFocus();
    expect([field.selectionStart, field.selectionEnd]).toEqual([0, 5]);
    await user.click(button('Link'));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('group', { name: 'Add a link' })).toBeNull();
    expect(stored()).toBe('Hello');
  });

  it('is one tab stop, its buttons reached with the arrow keys, and works from the keyboard', async () => {
    const { user, stored, select } = setup('word');
    select(0, 4);
    await user.tab({ shift: true });
    expect(button('Heading')).toHaveFocus();
    await user.keyboard('{End}');
    expect(button('Numbered list')).toHaveFocus();
    await user.keyboard('{ArrowRight}');
    expect(button('Heading')).toHaveFocus();
    await user.keyboard('{ArrowLeft}{ArrowLeft}');
    expect(button('Bulleted list')).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(stored()).toBe('- word');
    // The toolbar remembers where it was left.
    await user.tab({ shift: true });
    expect(button('Bulleted list')).toHaveFocus();
  });

  it('opens the heading menu from the keyboard', async () => {
    const { user, stored, select } = setup('Title');
    select(0, 0);
    await user.tab({ shift: true });
    await user.keyboard('{Enter}');
    const large = await screen.findByRole('menuitem', { name: /Large heading/ });
    expect(large).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(stored()).toBe('# Title');
  });

  it('keeps typing as it was', async () => {
    const { user, stored, field } = setup();
    await user.type(field, 'Line one{Enter}{Enter}Line two');
    expect(stored()).toBe('Line one\n\nLine two');
  });

  it('has no toolbar while the issue is read-only', () => {
    const { field } = setup('Hello', { readOnly: true });
    expect(field).toBeDisabled();
    expect(screen.queryByRole('toolbar')).toBeNull();
  });
});

describe('markdownLinkAddress', () => {
  it('takes a web or email address, completing a bare one, or a path on the site', () => {
    expect(markdownLinkAddress('https://example.org/a')).toEqual({
      href: 'https://example.org/a',
    });
    expect(markdownLinkAddress(' www.example.org ')).toEqual({ href: 'https://www.example.org' });
    expect(markdownLinkAddress('office@example.org')).toEqual({
      href: 'mailto:office@example.org',
    });
    expect(markdownLinkAddress('/events?month=10')).toEqual({ href: '/events?month=10' });
    expect(markdownLinkAddress('#top')).toEqual({ href: '#top' });
  });

  it('refuses a missing, unsafe or unfinished address', () => {
    expect(markdownLinkAddress('  ')).toEqual({ error: enMessages.formatting.missingAddress });
    for (const bad of [
      'javascript:alert(1)',
      'data:text/html,x',
      '//evil.test',
      'https://',
      'a b',
    ]) {
      expect(markdownLinkAddress(bad)).toEqual({ error: enMessages.markdown.invalidAddress });
    }
  });
});
