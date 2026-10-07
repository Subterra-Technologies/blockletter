import type { ComponentProps } from 'react';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { BlockBase } from '@subterra-technologies/blockletter';
import { AppearancePanel } from '../src/appearance/appearance-panel';
import { CANVAS_DEFINITIONS } from './helpers/canvas-registry';
import { TEST_BRAND, testBlock } from './helpers/fixtures';
import { renderInEditor } from './helpers/render';

/** Opens a kit Select and chooses the option with this visible name. */
async function chooseByName(trigger: HTMLElement, name: string): Promise<void> {
  await userEvent.click(trigger);
  const listbox = await screen.findByRole('listbox');
  await userEvent.click(within(listbox).getByRole('option', { name }));
}

const LETTER = testBlock('letter', { body: 'Autumn is our busiest season.' });

function renderPanel(
  props: Partial<ComponentProps<typeof AppearancePanel>> = {},
  context: { readOnly?: boolean } = {},
) {
  const onChange = vi.fn<(block: BlockBase) => void>();
  renderInEditor(<AppearancePanel block={LETTER} onChange={onChange} {...props} />, {
    context: { definitions: CANVAS_DEFINITIONS, ...context },
  });
  return { onChange, next: () => onChange.mock.calls.at(-1)?.[0] };
}

describe('AppearancePanel', () => {
  it('heads the panel with the block and says it follows the brand kit until changed', () => {
    renderPanel();
    expect(screen.getByRole('heading', { name: 'Letter' })).toBeInTheDocument();
    expect(screen.getByText('Brand defaults')).toBeInTheDocument();
    expect(
      screen.getByText(
        "Styling for this block only. Leave a field alone to keep the brand kit's styling.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Reset appearance/ })).toBeNull();
  });

  it('summarises an existing style override and offers to reset it', () => {
    renderPanel({ block: { ...LETTER, style: { align: 'center', divider: true } } });
    expect(screen.getByText('center · divider')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Reset appearance/ })).toBeInTheDocument();
  });

  it('removes the style entirely on Reset appearance', async () => {
    const { next } = renderPanel({ block: { ...LETTER, style: { align: 'center' } } });
    await userEvent.click(screen.getByRole('button', { name: /Reset appearance/ }));
    expect(next()).not.toHaveProperty('style');
    expect(next()).toMatchObject({ id: LETTER.id, body: LETTER.body });
  });

  it('sets the alignment when a non-left value is chosen', async () => {
    const { next } = renderPanel();
    await chooseByName(screen.getByRole('combobox', { name: 'Alignment' }), 'Centre');
    expect(next()?.style).toEqual({ align: 'center' });
  });

  it('clears the override when the alignment goes back to left', async () => {
    const { next } = renderPanel({ block: { ...LETTER, style: { align: 'center' } } });
    await chooseByName(screen.getByRole('combobox', { name: 'Alignment' }), 'Left');
    expect(next()).not.toHaveProperty('style');
  });

  it('keeps the other overrides when one is cleared', async () => {
    const { next } = renderPanel({
      block: { ...LETTER, style: { align: 'center', paddingY: 'loose' } },
    });
    await chooseByName(screen.getByRole('combobox', { name: 'Vertical padding' }), 'Normal');
    expect(next()?.style).toEqual({ align: 'center' });
  });

  it('toggles the edge-to-edge band and the hairline', async () => {
    const { onChange } = renderPanel();
    await userEvent.click(screen.getByRole('checkbox', { name: 'Edge-to-edge band' }));
    expect(onChange.mock.calls[0]?.[0].style).toEqual({ fullWidth: true });
    await userEvent.click(screen.getByRole('checkbox', { name: 'Hairline under the block' }));
    expect(onChange.mock.calls[1]?.[0].style).toEqual({ divider: true });
  });

  it('sets a background from the brand kit’s swatches', async () => {
    const { next } = renderPanel();
    const [background] = screen.getAllByRole('button', {
      name: `Accent ${TEST_BRAND.colors.accent}`,
    });
    await userEvent.click(background!);
    expect(next()?.style).toEqual({ background: TEST_BRAND.colors.accent });
  });

  it('offers the brand kit’s colours to both colour fields', () => {
    renderPanel();
    expect(
      screen.getAllByRole('button', { name: `Accent ${TEST_BRAND.colors.accent}` }),
    ).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: 'White #ffffff' })).toHaveLength(2);
  });

  it('disables every control while read-only, by prop or by the editor', () => {
    const { onChange } = renderPanel({ readOnly: true });
    expect(screen.getByRole('combobox', { name: 'Alignment' })).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: 'Edge-to-edge band' })).toBeDisabled();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('follows the editor’s read-only state when not told otherwise', () => {
    renderPanel({}, { readOnly: true });
    expect(screen.getByRole('combobox', { name: 'Text size' })).toBeDisabled();
  });
});
