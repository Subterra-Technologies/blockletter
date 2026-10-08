import type { BrandKit, NewsletterDocument, NewsletterTemplate } from '../src/types';

/**
 * The types `scripts/schema.ts` generates JSON Schemas from. ts-json-schema-generator starts only
 * from a type without type parameters, and a document and a template are generic over their
 * blocks, so these name them with the built-in ones. The brand kit is aliased too, so every
 * schema starts the same way.
 */
export type DocumentSchemaRoot = NewsletterDocument;
export type TemplateSchemaRoot = NewsletterTemplate;
export type BrandKitSchemaRoot = BrandKit;
