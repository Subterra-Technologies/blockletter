import brandKitSchema from '@subterra-technologies/blockletter/schema/brand-kit.json';
import documentSchema from '@subterra-technologies/blockletter/schema/newsletter-document.json';
import templateSchema from '@subterra-technologies/blockletter/schema/newsletter-template.json';
import Ajv, { type ValidateFunction } from 'ajv';
import { describe, expect, it } from 'vitest';
import { TEST_BRAND, TEST_TEMPLATES, testDocument } from './helpers/fixtures';

const ajv = new Ajv({ allErrors: true });

/** Where and why the schema refuses `value`, after a JSON round trip; empty when it accepts it. */
const schemaErrors = (matches: ValidateFunction, value: unknown): string[] =>
  matches(JSON.parse(JSON.stringify(value)))
    ? []
    : (matches.errors ?? []).map((error) => `${error.instancePath || '/'} ${error.message ?? ''}`);

describe('the editor test fixtures', () => {
  it('are a document, templates and a brand kit the published JSON Schemas accept', () => {
    expect(schemaErrors(ajv.compile(documentSchema), testDocument())).toEqual([]);
    const matchesTemplate = ajv.compile(templateSchema);
    for (const template of TEST_TEMPLATES) {
      expect(schemaErrors(matchesTemplate, template), template.id).toEqual([]);
    }
    expect(schemaErrors(ajv.compile(brandKitSchema), TEST_BRAND)).toEqual([]);
  });
});
