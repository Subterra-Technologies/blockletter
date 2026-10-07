import { useState } from 'react';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BUILT_IN_TEMPLATES, type NewsletterTemplate } from '@subterra-technologies/blockletter';
import {
  NewIssueDialog,
  type NewIssueDialogProps,
  type NewIssueRequest,
} from '../../src/templates/new-issue-dialog';
import { TEST_TEMPLATES } from '../helpers/fixtures';
import { renderInEditor } from '../helpers/render';

/**
 * Starting an issue: which period it opens on, what the named periods mean, and that the layout
 * and dates on screen are what the host is asked to create.
 */

const TEMPLATES: NewsletterTemplate[] = [...BUILT_IN_TEMPLATES, ...TEST_TEMPLATES];

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-09-30T12:00:00.000Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

function renderDialog(props: Partial<NewIssueDialogProps> & { startOpen?: boolean } = {}) {
  const onCreate = vi.fn<(request: NewIssueRequest) => void | Promise<void>>(
    props.onCreate ?? (() => undefined),
  );
  const onOpenChange = vi.fn();
  function Host() {
    const [open, setOpen] = useState(props.startOpen ?? true);
    return (
      <>
        <button type="button" onClick={() => setOpen(true)}>
          New issue
        </button>
        <NewIssueDialog
          open={open}
          onOpenChange={(next) => {
            onOpenChange(next);
            setOpen(next);
          }}
          templates={props.templates === undefined ? TEMPLATES : props.templates}
          timeZone={props.timeZone ?? 'UTC'}
          onCreate={onCreate}
          onRenameTemplate={props.onRenameTemplate}
          onDeleteTemplate={props.onDeleteTemplate}
        />
      </>
    );
  }
  renderInEditor(<Host />);
  return { onCreate, onOpenChange };
}

const field = (name: string) => screen.getByLabelText(name) as HTMLInputElement;

describe('NewIssueDialog', () => {
  it('opens on this month so far, looking six weeks ahead', async () => {
    const user = userEvent.setup();
    renderDialog();
    expect(screen.getByRole('dialog', { name: 'New issue' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Period' })).toHaveTextContent('This month');
    expect(field('From')).toHaveValue('2026-09-01');
    expect(field('Up to')).toHaveValue('2026-09-30');
    expect(field('Look ahead for events until')).toHaveValue('2026-11-11');
    expect(field('From')).toHaveAttribute('type', 'date');
    expect(field('Up to')).toHaveAttribute('max', '2026-09-30');

    await user.click(screen.getByRole('combobox', { name: 'Period' }));
    expect((await screen.findAllByRole('option')).map((option) => option.textContent)).toEqual([
      'This month',
      'Last month',
      'Custom',
    ]);
  });

  it('fills the dates from a named period, leaving the look-ahead alone', async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.click(screen.getByRole('combobox', { name: 'Period' }));
    await user.click(await screen.findByRole('option', { name: 'Last month' }));
    expect(field('From')).toHaveValue('2026-08-01');
    expect(field('Up to')).toHaveValue('2026-08-31');
    // The look-ahead answers a different question and is nobody's preset.
    expect(field('Look ahead for events until')).toHaveValue('2026-11-11');
  });

  it('calls the period Custom once a date is set by hand', () => {
    renderDialog();
    fireEvent.change(field('From'), { target: { value: '2026-07-04' } });
    expect(screen.getByRole('combobox', { name: 'Period' })).toHaveTextContent('Custom');
    expect(field('From')).toHaveValue('2026-07-04');
  });

  it('starts from the first layout unless another is chosen', async () => {
    const { onCreate } = renderDialog();
    expect(screen.getByRole('radio', { name: 'Monthly newsletter' })).toBeChecked();
    await userEvent.click(screen.getByRole('button', { name: 'Create issue' }));
    await waitFor(() =>
      expect(onCreate).toHaveBeenCalledWith({
        templateId: 'monthly-newsletter',
        period: { start: '2026-09-01', end: '2026-09-30', lookaheadEnd: '2026-11-11' },
      }),
    );
  });

  it('creates the issue from the layout and dates on screen, then closes and says so', async () => {
    const user = userEvent.setup();
    const { onCreate, onOpenChange } = renderDialog();
    await user.click(screen.getByRole('combobox', { name: 'Period' }));
    await user.click(await screen.findByRole('option', { name: 'Last month' }));
    await user.click(screen.getByRole('radio', { name: 'Reading night announcement' }));
    await user.click(screen.getByRole('button', { name: 'Create issue' }));

    await waitFor(() =>
      expect(onCreate).toHaveBeenCalledWith({
        templateId: 'saved-1',
        period: { start: '2026-08-01', end: '2026-08-31', lookaheadEnd: '2026-11-11' },
      }),
    );
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(
      await screen.findByText('Issue started from “Reading night announcement”.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('refuses a period that reaches past today, and puts focus on the date to fix', async () => {
    const { onCreate } = renderDialog();
    fireEvent.change(field('Up to'), { target: { value: '2026-10-05' } });
    await userEvent.click(screen.getByRole('button', { name: 'Create issue' }));
    const end = field('Up to');
    expect(end).toHaveAttribute('aria-invalid', 'true');
    expect(end).toHaveAccessibleDescription(
      'An issue can only cover up to today — there is no news from the future yet.',
    );
    expect(end).toHaveFocus();
    expect(onCreate).not.toHaveBeenCalled();
  });

  it('says “Creating…” while the host works, and shows its message when it fails', async () => {
    let fail!: (reason: unknown) => void;
    const { onOpenChange } = renderDialog({
      onCreate: () => new Promise<void>((_, reject) => (fail = reject)),
    });
    await userEvent.click(screen.getByRole('button', { name: 'Create issue' }));
    const busy = screen.getByRole('button', { name: 'Creating…' });
    expect(busy).toHaveAttribute('aria-disabled', 'true');
    fail(new Error('This organisation has reached its issue limit.'));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This organisation has reached its issue limit.',
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('reads “today” in the organisation’s own time zone', () => {
    // 02:00 on October 1 in UTC is still September 30 in Los Angeles.
    vi.setSystemTime(new Date('2026-10-01T02:00:00.000Z'));
    renderDialog({ timeZone: 'America/Los_Angeles' });
    expect(field('From')).toHaveValue('2026-09-01');
    expect(field('Up to')).toHaveValue('2026-09-30');
  });

  it('waits for the layouts, and will not start without one', async () => {
    const { onCreate } = renderDialog({ templates: null });
    expect(screen.getByRole('status')).toHaveTextContent('Loading templates…');
    await userEvent.click(screen.getByRole('button', { name: 'Create issue' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Choose a layout to start from.');
    expect(onCreate).not.toHaveBeenCalled();
  });

  it('lets saved layouts be renamed from here when the host allows it', async () => {
    const onRenameTemplate = vi.fn();
    renderDialog({ onRenameTemplate });
    const saved = screen.getByRole('radio', { name: 'Reading night announcement' });
    const card = saved.closest('[data-template]') as HTMLElement;
    await userEvent.click(within(card).getByRole('button', { name: /^Rename/ }));
    await userEvent.type(screen.getByLabelText('Template name'), ' (short){Enter}');
    expect(onRenameTemplate).toHaveBeenCalledWith(
      'saved-1',
      'Reading night announcement (short)',
      'A banner, the details, and a button.',
    );
    // Enter saved the name; it did not create an issue.
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('gives focus back to what opened it when it closes', async () => {
    renderDialog({ startOpen: false });
    const opener = screen.getByRole('button', { name: 'New issue' });
    await userEvent.click(opener);
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await waitFor(() => expect(opener).toHaveFocus());
  });
});
