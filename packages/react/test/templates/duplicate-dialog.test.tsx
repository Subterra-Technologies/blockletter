import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { IssuePeriod } from '@subterra-technologies/blockletter';
import { DuplicateIssueDialog, periodAfter } from '../../src/templates/duplicate-dialog';
import { renderInEditor } from '../helpers/render';

const SOURCE: IssuePeriod = { start: '2026-08-01', end: '2026-08-31', lookaheadEnd: '2026-10-12' };

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-09-30T12:00:00.000Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

function renderDialog(
  onDuplicate: (period: IssuePeriod) => void | Promise<void> = () => undefined,
  props: { name?: string; sourcePeriod?: IssuePeriod } = {
    name: 'August 2026',
    sourcePeriod: SOURCE,
  },
) {
  const duplicate = vi.fn(onDuplicate);
  const onOpenChange = vi.fn();
  renderInEditor(
    <DuplicateIssueDialog
      open
      onOpenChange={onOpenChange}
      timeZone="UTC"
      onDuplicate={duplicate}
      {...props}
    />,
  );
  return { duplicate, onOpenChange };
}

describe('periodAfter', () => {
  it('carries on from the day after the original ended, up to today', () => {
    expect(periodAfter('2026-08-31', '2026-09-30')).toEqual({
      start: '2026-09-01',
      end: '2026-09-30',
      lookaheadEnd: '2026-11-11',
    });
  });

  it('never starts after today, and covers the last thirty days without an original', () => {
    expect(periodAfter('2026-09-30', '2026-09-30').start).toBe('2026-09-30');
    expect(periodAfter(undefined, '2026-09-30').start).toBe('2026-08-31');
  });
});

describe('DuplicateIssueDialog', () => {
  it('names the issue, and opens on the dates after it', () => {
    renderDialog();
    expect(screen.getByRole('dialog', { name: 'Duplicate “August 2026”' })).toBeInTheDocument();
    expect(screen.getByLabelText('From')).toHaveValue('2026-09-01');
    expect(screen.getByLabelText('Up to')).toHaveValue('2026-09-30');
    expect(screen.getByLabelText('Look ahead for events until')).toHaveValue('2026-11-11');
  });

  it('copies into the dates on screen, then closes and says so', async () => {
    const { duplicate, onOpenChange } = renderDialog();
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-09-10' } });
    await userEvent.click(screen.getByRole('button', { name: 'Create copy' }));
    await waitFor(() =>
      expect(duplicate).toHaveBeenCalledWith({
        start: '2026-09-10',
        end: '2026-09-30',
        lookaheadEnd: '2026-11-11',
      }),
    );
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(await screen.findByText('Copied “August 2026”.')).toBeInTheDocument();
  });

  it('refuses a start after the end, by the field', async () => {
    const { duplicate } = renderDialog();
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-09-29' } });
    fireEvent.change(screen.getByLabelText('Up to'), { target: { value: '2026-09-20' } });
    await userEvent.click(screen.getByRole('button', { name: 'Create copy' }));
    expect(screen.getByLabelText('From')).toHaveAccessibleDescription(
      'The start date is after the end date.',
    );
    expect(screen.getByLabelText('From')).toHaveFocus();
    expect(duplicate).not.toHaveBeenCalled();
  });

  it('shows the host’s message when the copy fails, and stays open', async () => {
    const { onOpenChange } = renderDialog(() =>
      Promise.reject(new Error('Copies of archived issues are not allowed.')),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Create copy' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Copies of archived issues are not allowed.',
    );
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('has a general title without a name', () => {
    renderDialog(undefined, {});
    expect(screen.getByRole('dialog', { name: 'Duplicate this issue' })).toBeInTheDocument();
    expect(screen.getByLabelText('From')).toHaveValue('2026-08-31');
  });
});
