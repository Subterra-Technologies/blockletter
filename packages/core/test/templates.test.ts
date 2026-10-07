import { describe, expect, it } from 'vitest';
import {
  BUILT_IN_TEMPLATES,
  DEFAULT_BRAND,
  applyTemplate,
  createBlock,
  fillBlockTokens,
  fillTokens,
  periodTokens,
  templateFromDocument,
  validateDocument,
  type BrandKit,
  type BuiltInBlock,
  type HeaderBlock,
  type IssuePeriod,
  type NewsletterTemplate,
} from '../src';

const SEPTEMBER: IssuePeriod = {
  start: '2026-09-01',
  end: '2026-09-30',
  lookaheadEnd: '2026-11-10',
};
const brand: BrandKit = { ...DEFAULT_BRAND, name: 'Riverside Choir' };

const template = (id: string): NewsletterTemplate => {
  const found = BUILT_IN_TEMPLATES.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`No template ${id}`);
  return found;
};

const header = (blocks: BuiltInBlock[]): HeaderBlock | undefined =>
  blocks.find((item): item is HeaderBlock => item.type === 'header');

describe('built-in templates', () => {
  it('ships four, with stable ids, read-only', () => {
    expect(BUILT_IN_TEMPLATES.map((item) => item.id)).toEqual([
      'monthly-newsletter',
      'event-announcement',
      'spotlight',
      'simple-update',
    ]);
    for (const item of BUILT_IN_TEMPLATES) {
      expect(item.builtIn).toBe(true);
      expect(item.name.trim()).toBeTruthy();
      expect(item.description.trim()).toBeTruthy();
      expect(Object.isFrozen(item.blocks)).toBe(true);
      expect(item.blocks.at(-1)?.type).toBe('footer');
    }
  });

  it('each becomes a valid document', () => {
    for (const item of BUILT_IN_TEMPLATES) {
      expect(validateDocument(applyTemplate(item, { period: SEPTEMBER, brand })), item.id).toEqual(
        [],
      );
    }
  });

  it('wires the monthly issue to the conventional data sources', () => {
    const sourced = template('monthly-newsletter').blocks.flatMap((item) =>
      item.source ? [[item.type, item.source]] : [],
    );
    expect(sourced).toEqual([
      ['event_tiles', 'events'],
      ['sponsors', 'sponsors'],
      ['name_list', 'new_members'],
      ['post_list', 'posts'],
      ['dated_list', 'calendar'],
    ]);
  });
});

describe('applyTemplate', () => {
  it('fills the tokens from the period and the brand kit', () => {
    const doc = applyTemplate(template('monthly-newsletter'), { period: SEPTEMBER, brand });
    expect(doc.version).toBe(1);
    expect(doc.subject).toBe('Riverside Choir · September 2026 newsletter');
    expect(doc.preheader).toBe('News, events and updates from Riverside Choir.');
    expect(doc.period).toEqual(SEPTEMBER);
    expect(header(doc.blocks)?.issueLabel).toBe('September 2026');
  });

  it('fills tokens inside block fields too', () => {
    const doc = applyTemplate(template('event-announcement'), { period: SEPTEMBER, brand });
    expect(doc.blocks[0]).toMatchObject({ type: 'banner', subheading: 'September 2026' });
  });

  it('gives every block a fresh id and leaves the template as it was', () => {
    const source = template('spotlight');
    const before = JSON.stringify(source);
    const first = applyTemplate(source, { period: SEPTEMBER });
    const second = applyTemplate(source, { period: SEPTEMBER });
    const ids = first.blocks.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.some((id) => source.blocks.some((item) => item.id === id))).toBe(false);
    expect(second.blocks.map((item) => item.id)).not.toEqual(ids);
    expect(JSON.stringify(source)).toBe(before);
    first.blocks[0] = { ...first.blocks[0]!, hidden: true };
    expect(source.blocks[0]?.hidden).toBe(false);
  });

  it('leaves month tokens as written when there is no period, and names the default brand', () => {
    const doc = applyTemplate(template('monthly-newsletter'));
    expect(doc.subject).toBe('Your Organization · {{monthYear}} newsletter');
    expect(doc.period).toBeUndefined();
    expect(header(doc.blocks)?.issueLabel).toBe('{{monthYear}}');
  });
});

describe('tokens', () => {
  it('name the month a period ends in, and the period itself', () => {
    expect(periodTokens({ start: '2026-08-20', end: '2026-09-15' }, brand)).toEqual({
      org: 'Riverside Choir',
      month: 'September',
      monthYear: 'September 2026',
      year: '2026',
      period: 'Aug 20 – Sep 15, 2026',
    });
    expect(periodTokens()).toEqual({ org: 'Your Organization' });
  });

  it("fill only the tokens they know, leaving an email service's merge tags alone", () => {
    const tokens = periodTokens(SEPTEMBER, brand);
    expect(fillTokens('{{ month }} at {{org}}: {{period}}', tokens)).toBe(
      'September at Riverside Choir: September 2026',
    );
    expect(
      fillTokens('Hi {{first_name}}, {{{RESEND_UNSUBSCRIBE_URL}}} {{constructor}}', tokens),
    ).toBe('Hi {{first_name}}, {{{RESEND_UNSUBSCRIBE_URL}}} {{constructor}}');
  });

  it('fill a fresh block, nested items included, without touching its id or type', () => {
    const fresh = createBlock('header');
    const filled = fillBlockTokens(fresh, periodTokens(SEPTEMBER));
    expect(filled).toEqual({ ...fresh, issueLabel: 'September 2026' });
    expect(fresh.issueLabel).toBe('{{monthYear}}');
    const columns = fillBlockTokens(
      { ...createBlock('columns'), columns: [{ body: 'In {{month}}' }, { body: '{{year}}' }] },
      periodTokens(SEPTEMBER),
    );
    expect(columns.columns.map((column) => column.body)).toEqual(['In September', '2026']);
  });
});

describe('templateFromDocument', () => {
  it('turns the period back into tokens in the subject, preheader and header', () => {
    const doc = applyTemplate(template('monthly-newsletter'), { period: SEPTEMBER, brand });
    const saved = templateFromDocument(
      { ...doc, preheader: 'What happened in September, and what is next.' },
      { id: 'mine', name: 'Our monthly', description: 'The way we do it.' },
    );
    expect(saved).toMatchObject({
      id: 'mine',
      name: 'Our monthly',
      description: 'The way we do it.',
    });
    expect(saved.builtIn).toBeUndefined();
    expect(saved.subject).toBe('Riverside Choir · {{monthYear}} newsletter');
    expect(saved.preheader).toBe('What happened in {{month}}, and what is next.');
    expect(header(saved.blocks)?.issueLabel).toBe('{{monthYear}}');
  });

  it('uses {{period}} for a period that is not a whole month, and whole words only', () => {
    const fortnight: IssuePeriod = { start: '2026-09-01', end: '2026-09-15' };
    const saved = templateFromDocument(
      {
        version: 1,
        subject: 'Sep 1–15, 2026 at a glance, Septembers past',
        preheader: 'September notes',
        period: fortnight,
        blocks: [],
      },
      { id: 't', name: 'T', description: '' },
    );
    expect(saved.subject).toBe('{{period}} at a glance, Septembers past');
    expect(saved.preheader).toBe('{{month}} notes');
  });

  it('gives fresh ids and drops what a source filled, keeping what was written by hand', () => {
    const doc = applyTemplate(template('monthly-newsletter'), { period: SEPTEMBER });
    const blocks = doc.blocks.map((item): BuiltInBlock =>
      item.type === 'dated_list'
        ? {
            ...item,
            items: [
              { date: 'Oct. 2', text: 'From the calendar', sortDate: '2026-10-02', ref: 'cal-1' },
              { date: 'Every Saturday', text: 'Written by hand' },
            ],
          }
        : item,
    );
    const saved = templateFromDocument({ ...doc, blocks }, { id: 't', name: 'T', description: '' });
    const datedList = saved.blocks.find((item) => item.type === 'dated_list');
    expect(datedList).toMatchObject({ items: [{ text: 'Written by hand' }] });
    expect(saved.blocks.map((item) => item.id)).not.toEqual(blocks.map((item) => item.id));
    expect(
      (blocks.find((item) => item.type === 'dated_list') as { items: unknown[] }).items,
    ).toHaveLength(2);
  });

  it('round-trips into a later month', () => {
    const september = applyTemplate(template('monthly-newsletter'), { period: SEPTEMBER, brand });
    const saved = templateFromDocument(september, { id: 't', name: 'T', description: '' });
    const october = applyTemplate(saved, {
      period: { start: '2026-10-01', end: '2026-10-31' },
      brand,
    });
    expect(october.subject).toBe('Riverside Choir · October 2026 newsletter');
    expect(header(october.blocks)?.issueLabel).toBe('October 2026');
  });
});
