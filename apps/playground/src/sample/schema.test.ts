import {
  monthPeriod,
  suggestPeriod,
  validateBrandKit,
  validateDocument,
  type IssuePeriod,
} from '@subterra-technologies/blockletter';
import brandKitSchema from '@subterra-technologies/blockletter/schema/brand-kit.json';
import documentSchema from '@subterra-technologies/blockletter/schema/newsletter-document.json';
import Ajv, { type ValidateFunction } from 'ajv';
import { describe, expect, it } from 'vitest';
import { SAMPLE_ORGANIZATIONS } from './index';

const ajv = new Ajv({ allErrors: true });
const matchesDocument = ajv.compile(documentSchema);
const matchesBrandKit = ajv.compile(brandKitSchema);

/** Where and why the schema refuses `value`; empty when it accepts it. */
const schemaErrors = (matches: ValidateFunction, value: unknown): string[] =>
  matches(value)
    ? []
    : (matches.errors ?? []).map((error) => `${error.instancePath || '/'} ${error.message ?? ''}`);

/** A JSON round trip, as the playground's storage and the Document tab hand the issue over. */
const stored = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

/** The period the demo opens on, a whole month, and one that spans the new year. */
const PERIODS: IssuePeriod[] = [
  suggestPeriod('2026-10-08'),
  monthPeriod('2026-09'),
  { start: '2026-12-15', end: '2027-01-10', lookaheadEnd: '2027-02-28' },
];

describe.each(SAMPLE_ORGANIZATIONS)('the $label sample', (organization) => {
  it('starts issues the published document schema accepts, for any period', async () => {
    for (const period of PERIODS) {
      const issue = stored(await organization.starter(period));
      expect(schemaErrors(matchesDocument, issue), period.start).toEqual([]);
      expect(validateDocument(issue), period.start).toEqual([]);
    }
  });

  it('has a brand kit the published brand kit schema accepts', () => {
    const brand = stored(organization.brand);
    expect(schemaErrors(matchesBrandKit, brand)).toEqual([]);
    expect(validateBrandKit(brand)).toEqual([]);
  });
});
