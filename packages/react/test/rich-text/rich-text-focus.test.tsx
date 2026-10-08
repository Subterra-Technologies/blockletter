import { act, fireEvent, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RichTextField } from '../../src/rich-text/rich-text-field';
import { renderInEditor } from '../helpers/render';

/**
 * Where the caret is when the text takes the focus. No user-event here: it moves the selection
 * onto whatever gains focus. (jsdom's own focus does too, so a caret put in the text before the
 * focus arrives, which the field keeps, is checked in the browser tests instead.)
 */

function setup() {
  renderInEditor(
    <RichTextField
      label="Text"
      value="<p>Join us Friday at nine.</p>"
      onChange={() => undefined}
    />,
  );
  const textbox = screen.getByRole('textbox', { name: 'Text' });
  const bold = within(screen.getByRole('toolbar', { name: 'Text formatting' })).getByRole(
    'button',
    { name: 'Bold' },
  );
  const text = () => textbox.querySelector('p')?.firstChild as Text;
  const select = (from: number, to: number) =>
    act(() => document.getSelection()?.setBaseAndExtent(text(), from, text(), to));
  return { textbox, bold, select };
}

describe('the rich-text field taking the focus', () => {
  it('puts the caret back after a redraw from the toolbar while the focus was there', () => {
    const { textbox, bold, select } = setup();
    act(() => textbox.focus());
    select(8, 14);
    fireEvent(document, new Event('selectionchange'));
    act(() => bold.focus());
    fireEvent.click(bold);
    // The redraw took the DOM's selection off the text; the field still knows where it was.
    expect(document.getSelection()?.toString()).toBe('');
    act(() => textbox.focus());
    expect(document.getSelection()?.toString()).toBe('Friday');
    expect(within(textbox).getByText('Friday').tagName).toBe('STRONG');
  });
});
