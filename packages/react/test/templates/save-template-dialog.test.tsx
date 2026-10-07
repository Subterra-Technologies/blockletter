import { useState } from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
  SaveTemplateDialog,
  type SaveTemplateRequest,
} from '../../src/templates/save-template-dialog';
import { renderInEditor } from '../helpers/render';

/** A host with a button that opens the dialog, as a menu item would. */
function renderDialog(
  options: {
    onSave?: (request: SaveTemplateRequest) => void | Promise<void>;
    suggestedName?: string;
    open?: boolean;
  } = {},
) {
  const onSave = vi.fn(options.onSave ?? (() => undefined));
  const onOpenChange = vi.fn();
  function Host() {
    const [open, setOpen] = useState(options.open ?? true);
    return (
      <>
        <button type="button" onClick={() => setOpen(true)}>
          Save as template…
        </button>
        <SaveTemplateDialog
          open={open}
          onOpenChange={(next) => {
            onOpenChange(next);
            setOpen(next);
          }}
          onSave={onSave}
          suggestedName={options.suggestedName}
        />
      </>
    );
  }
  renderInEditor(<Host />);
  return { onSave, onOpenChange };
}

describe('SaveTemplateDialog', () => {
  it('renders nothing while closed', () => {
    renderDialog({ open: false });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('opens with the suggested name, ready to type over', async () => {
    renderDialog({ suggestedName: 'November issue layout' });
    const name = await screen.findByLabelText('Template name');
    expect(name).toHaveValue('November issue layout');
    await waitFor(() => expect(name).toHaveFocus());
    expect((name as HTMLInputElement).selectionStart).toBe(0);
    expect((name as HTMLInputElement).selectionEnd).toBe('November issue layout'.length);
    expect(name).toHaveAttribute('maxlength', '80');
    expect(screen.getByLabelText('Description')).toHaveAttribute('maxlength', '240');
  });

  it('will not save without a name', async () => {
    const { onSave } = renderDialog();
    await userEvent.click(await screen.findByRole('button', { name: 'Save template' }));
    const name = screen.getByLabelText('Template name');
    expect(screen.getByRole('alert')).toHaveTextContent('Give the template a name.');
    expect(name).toHaveAttribute('aria-invalid', 'true');
    expect(name).toHaveAccessibleDescription('Give the template a name.');
    expect(name).toHaveFocus();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('saves the trimmed name and description, closes and says so', async () => {
    const { onSave, onOpenChange } = renderDialog({ suggestedName: 'Event announcement' });
    await userEvent.type(await screen.findByLabelText('Description'), '  Banner and a button  ');
    await userEvent.click(screen.getByRole('button', { name: 'Save template' }));
    expect(onSave).toHaveBeenCalledWith({
      name: 'Event announcement',
      description: 'Banner and a button',
    });
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(
      await screen.findByText('Template saved. It is offered when you start the next issue.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('says “Saving…” while the host saves, without dropping focus', async () => {
    let finish!: () => void;
    renderDialog({
      suggestedName: 'Layout',
      onSave: () => new Promise<void>((resolve) => (finish = resolve)),
    });
    await userEvent.click(await screen.findByRole('button', { name: 'Save template' }));
    const busy = screen.getByRole('button', { name: 'Saving…' });
    expect(busy).toHaveAttribute('aria-disabled', 'true');
    expect(busy).toHaveAttribute('aria-busy', 'true');
    expect(busy).toHaveFocus();
    finish();
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('shows the host’s message when saving fails, and stays open', async () => {
    renderDialog({
      suggestedName: 'Layout',
      onSave: () => Promise.reject(new Error('A template with that name already exists.')),
    });
    await userEvent.click(await screen.findByRole('button', { name: 'Save template' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'A template with that name already exists.',
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('closes on Cancel without saving', async () => {
    const { onSave, onOpenChange } = renderDialog();
    await userEvent.click(await screen.findByRole('button', { name: 'Cancel' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onSave).not.toHaveBeenCalled();
  });

  it('closes on Escape and gives focus back to what opened it', async () => {
    renderDialog({ open: false, suggestedName: 'Layout' });
    const opener = screen.getByRole('button', { name: 'Save as template…' });
    await userEvent.click(opener);
    expect(await screen.findByRole('dialog', { name: 'Save as template' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText('Template name')).toHaveFocus());

    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await waitFor(() => expect(opener).toHaveFocus());
  });

  it('starts afresh on each opening', async () => {
    renderDialog({ open: false, suggestedName: 'Layout' });
    await userEvent.click(screen.getByRole('button', { name: 'Save as template…' }));
    await userEvent.type(await screen.findByLabelText('Description'), 'Draft words');
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save as template…' }));
    expect(await screen.findByLabelText('Description')).toHaveValue('');
    expect(screen.getByLabelText('Template name')).toHaveValue('Layout');
  });
});
