import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ColorField, type ColorSwatch } from '../src/appearance/color-field';

const SWATCHES: ColorSwatch[] = [
  { label: 'Page', value: '#f5f5f4' },
  { label: 'Ink', value: '#1f2937' },
];

describe('ColorField', () => {
  it('says what applies when no value is set', () => {
    render(
      <ColorField
        label="Background"
        controlId="bg"
        fallbackLabel="the block's own background"
        onValueChange={vi.fn()}
      />,
    );
    expect(screen.getByText("Uses the block's own background.")).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Reset background/ })).toBeNull();
  });

  it('describes the hex box with that sentence', () => {
    render(<ColorField label="Background" controlId="bg" onValueChange={vi.fn()} />);
    expect(screen.getByLabelText('Background hex value')).toHaveAccessibleDescription(
      'Uses the default.',
    );
  });

  it('shows the override sentence and a reset button once a value is set', () => {
    render(
      <ColorField label="Background" controlId="bg" value="#123456" onValueChange={vi.fn()} />,
    );
    expect(
      screen.getByText('Overrides the default. Six-digit hex, like #1f2937.'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Reset background to the default' }),
    ).toBeInTheDocument();
  });

  it('prefers the caller’s help text over the override and default sentences', () => {
    render(
      <ColorField
        label="Ink"
        controlId="ink"
        value="#123456"
        help="Headings, bands and the footer."
        onValueChange={vi.fn()}
      />,
    );
    expect(screen.getByText('Headings, bands and the footer.')).toBeInTheDocument();
  });

  it('picks a swatch and marks the chosen one', async () => {
    const onValueChange = vi.fn();
    render(
      <ColorField
        label="Background"
        controlId="bg"
        value="#F5F5F4"
        swatches={SWATCHES}
        onValueChange={onValueChange}
      />,
    );
    expect(screen.getByRole('group', { name: 'Background' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Page #f5f5f4' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Ink #1f2937' }));
    expect(onValueChange).toHaveBeenCalledWith('#1f2937');
  });

  it('commits a valid hex value on blur, adding a leading #', async () => {
    const onValueChange = vi.fn();
    render(<ColorField label="Background" controlId="bg" onValueChange={onValueChange} />);
    await userEvent.type(screen.getByLabelText('Background hex value'), '1f2937');
    expect(onValueChange).not.toHaveBeenCalled();
    await userEvent.tab();
    expect(onValueChange).toHaveBeenCalledWith('#1f2937');
  });

  it('does not commit an invalid hex value on blur', async () => {
    const onValueChange = vi.fn();
    render(<ColorField label="Background" controlId="bg" onValueChange={onValueChange} />);
    await userEvent.type(screen.getByLabelText('Background hex value'), 'not-a-colour');
    await userEvent.tab();
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('clears the override when the hex box is emptied on blur', async () => {
    const onValueChange = vi.fn();
    render(
      <ColorField
        label="Background"
        controlId="bg"
        value="#123456"
        onValueChange={onValueChange}
      />,
    );
    await userEvent.clear(screen.getByLabelText('Background hex value'));
    await userEvent.tab();
    expect(onValueChange).toHaveBeenCalledWith(undefined);
  });

  it('clears the override when the reset button is clicked', async () => {
    const onValueChange = vi.fn();
    render(
      <ColorField
        label="Background"
        controlId="bg"
        value="#123456"
        onValueChange={onValueChange}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Reset background to the default' }));
    expect(onValueChange).toHaveBeenCalledWith(undefined);
  });

  it('follows a value changed elsewhere in its hex box', () => {
    const { rerender } = render(
      <ColorField label="Background" controlId="bg" value="#123456" onValueChange={vi.fn()} />,
    );
    rerender(
      <ColorField label="Background" controlId="bg" value="#abcdef" onValueChange={vi.fn()} />,
    );
    expect(screen.getByLabelText('Background hex value')).toHaveValue('#abcdef');
  });

  it('emits a hex value from the native colour picker', () => {
    const onValueChange = vi.fn();
    render(<ColorField label="Background" controlId="bg" onValueChange={onValueChange} />);
    // jsdom normalises an <input type="color">, so the value is set the way a browser picker
    // reports it rather than typed.
    fireEvent.change(screen.getByLabelText('Background colour picker'), {
      target: { value: '#abcdef' },
    });
    expect(onValueChange).toHaveBeenCalledWith('#abcdef');
  });

  it('disables every control when disabled', () => {
    render(
      <ColorField
        label="Background"
        controlId="bg"
        value="#123456"
        swatches={SWATCHES}
        disabled
        onValueChange={vi.fn()}
      />,
    );
    expect(screen.getByLabelText('Background colour picker')).toBeDisabled();
    expect(screen.getByLabelText('Background hex value')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Reset background to the default' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Page #f5f5f4' })).toBeDisabled();
  });
});
