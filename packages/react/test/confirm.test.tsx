import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BlockletterRoot } from '../src';
import { useConfirm } from '../src/ui/confirm';

function DeleteTemplate({ onAnswer }: { onAnswer: (answer: boolean) => void }) {
  const confirm = useConfirm();
  return (
    <button
      type="button"
      onClick={async () => {
        onAnswer(
          await confirm({
            title: 'Delete the "Monthly digest" template?',
            description: 'Issues already made from it keep their content.',
            confirmLabel: 'Delete template',
            destructive: true,
          }),
        );
      }}
    >
      Delete
    </button>
  );
}

function renderInRoot() {
  const onAnswer = vi.fn();
  render(
    <BlockletterRoot>
      <DeleteTemplate onAnswer={onAnswer} />
    </BlockletterRoot>,
  );
  return { onAnswer, ask: screen.getByRole('button', { name: 'Delete' }) };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useConfirm inside a BlockletterRoot', () => {
  it('asks in an alert dialog in the root’s container, and answers yes', async () => {
    const user = userEvent.setup();
    const { onAnswer, ask } = renderInRoot();

    await user.click(ask);
    const dialog = await screen.findByRole('alertdialog', {
      name: 'Delete the "Monthly digest" template?',
    });
    expect(dialog).toHaveAccessibleDescription('Issues already made from it keep their content.');
    expect(dialog.closest('[data-bl-portal]')?.parentElement).toBe(ask.closest('.bl-root'));

    const action = within(dialog).getByRole('button', { name: 'Delete template' });
    expect(action).toHaveAttribute('data-variant', 'destructive');
    await user.click(action);

    await waitFor(() => expect(onAnswer).toHaveBeenCalledWith(true));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('answers no on Cancel, after handing focus back to the control that asked', async () => {
    const user = userEvent.setup();
    const { onAnswer, ask } = renderInRoot();

    await user.click(ask);
    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(onAnswer).toHaveBeenCalledWith(false));
    expect(onAnswer).toHaveBeenCalledTimes(1);
    expect(ask).toHaveFocus();
  });

  it('answers no on Escape', async () => {
    const user = userEvent.setup();
    const { onAnswer } = renderInRoot();

    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await screen.findByRole('alertdialog');
    await user.keyboard('{Escape}');

    await waitFor(() => expect(onAnswer).toHaveBeenCalledWith(false));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('never calls window.confirm while a provider is there to ask', async () => {
    const user = userEvent.setup();
    const native = vi.spyOn(window, 'confirm');
    renderInRoot();

    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await screen.findByRole('alertdialog');
    expect(native).not.toHaveBeenCalled();
  });
});

describe('useConfirm outside a BlockletterRoot', () => {
  it.each([true, false])('falls back to window.confirm, answering %s', async (answer) => {
    const user = userEvent.setup();
    const native = vi.spyOn(window, 'confirm').mockReturnValue(answer);
    const onAnswer = vi.fn();
    render(<DeleteTemplate onAnswer={onAnswer} />);

    await user.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(onAnswer).toHaveBeenCalledWith(answer));
    expect(native).toHaveBeenCalledWith('Delete the "Monthly digest" template?');
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });
});
