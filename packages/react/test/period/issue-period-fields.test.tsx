import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { periodErrors, type IssuePeriod } from '@subterra-technologies/blockletter';
import { IssuePeriodFields } from '../../src/period/issue-period-fields';

/** The same rules the core applies, shown beside the dates before anything is submitted. */
const TODAY = '2026-09-28';
const PERIOD: IssuePeriod = { start: '2026-09-01', end: '2026-09-28', lookaheadEnd: '2026-11-09' };

/** The fields over a controlled period, showing the core's errors for it, as a dialog does. */
function renderFields(initial: IssuePeriod = PERIOD, options: { disabled?: boolean } = {}) {
  const onChange = vi.fn();
  function Host() {
    const [period, setPeriod] = useState(initial);
    return (
      <IssuePeriodFields
        value={period}
        errors={periodErrors(period, { today: TODAY })}
        today={TODAY}
        disabled={options.disabled}
        onChange={(next) => {
          onChange(next);
          setPeriod(next);
        }}
      />
    );
  }
  render(<Host />);
  return { onChange };
}

const date = (name: string) => screen.getByLabelText(name) as HTMLInputElement;

describe('IssuePeriodFields', () => {
  it('asks for the covered dates in a group, and the look-ahead apart from it', () => {
    renderFields();
    const group = screen.getByRole('group', { name: 'What this issue covers' });
    expect(group).toHaveAccessibleDescription(
      'News, new members and other updates come from these dates. An issue can only cover up to today.',
    );
    for (const name of ['From', 'Up to', 'Look ahead for events until']) {
      expect(date(name)).toHaveAttribute('type', 'date');
    }
    expect(date('From')).toHaveValue('2026-09-01');
    expect(date('Up to')).toHaveAttribute('max', TODAY);
    expect(date('Look ahead for events until')).toHaveAttribute('min', '2026-09-28');
    expect(date('Look ahead for events until')).toHaveAccessibleDescription(
      'What is still to come, for lists of upcoming events.',
    );
  });

  it('is happy with a period ending today and looking ahead past it', () => {
    renderFields();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('accepts a period deliberately ended before today', () => {
    renderFields({ ...PERIOD, end: '2026-09-15' });
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('says an issue cannot cover the future', () => {
    renderFields({ ...PERIOD, end: '2026-09-29' });
    expect(date('Up to')).toHaveAttribute('aria-invalid', 'true');
    expect(date('Up to')).toHaveAccessibleDescription(/up to today/i);
  });

  it('says when the start is after the end', () => {
    renderFields({ ...PERIOD, start: '2026-09-30', end: '2026-09-20' });
    expect(date('From')).toHaveAccessibleDescription('The start date is after the end date.');
  });

  it('says when the look-ahead stops before the covered period does', () => {
    renderFields({ ...PERIOD, lookaheadEnd: '2026-09-01' });
    expect(date('Look ahead for events until')).toHaveAccessibleDescription(
      /after the period this issue covers/i,
    );
  });

  it('names each missing date', () => {
    renderFields({ start: '', end: '', lookaheadEnd: '' });
    expect(date('From')).toHaveAccessibleDescription(/starts from/i);
    expect(date('Up to')).toHaveAccessibleDescription(/covers up to/i);
    expect(date('Look ahead for events until')).toHaveAccessibleDescription(/how far ahead/i);
  });

  it('emits the next period as a date changes', () => {
    const { onChange } = renderFields();
    fireEvent.change(date('From'), { target: { value: '2026-09-07' } });
    expect(onChange).toHaveBeenLastCalledWith({ ...PERIOD, start: '2026-09-07' });
  });

  it('drops the look-ahead when it is cleared, which a period may do without', () => {
    const { onChange } = renderFields();
    fireEvent.change(date('Look ahead for events until'), { target: { value: '' } });
    expect(onChange).toHaveBeenLastCalledWith({ start: PERIOD.start, end: PERIOD.end });
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('disables every date while disabled', () => {
    renderFields(PERIOD, { disabled: true });
    expect(date('From')).toBeDisabled();
    expect(date('Up to')).toBeDisabled();
    expect(date('Look ahead for events until')).toBeDisabled();
  });

  it('leaves the dates open without a today', () => {
    render(<IssuePeriodFields value={PERIOD} onChange={vi.fn()} />);
    expect(date('Up to')).not.toHaveAttribute('max');
    expect(
      screen.getByRole('group', { name: 'What this issue covers' }),
    ).toHaveAccessibleDescription('News, new members and other updates come from these dates.');
  });
});
