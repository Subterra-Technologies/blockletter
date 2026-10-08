import {
  plainTextToHtml,
  type CalloutBlock,
  type FooterBlock,
  type HeaderBlock,
  type TextBlock,
} from '@subterra-technologies/blockletter';
import { useEditorContext } from '../../editor/context';
import type { BlockEditorProps } from '../../editor/types';
import { useEditorMessages } from '../../i18n/context';
import { RichTextField } from '../../rich-text/rich-text-field';
import { blockEditor, withOptional } from '../editor-base';
import { AreaField, EditorFields, FieldPair, Note, TextField } from '../editor-fields';
import { ItemList } from '../item-list';
import { SocialLinksField } from '../social-links-field';

/**
 * The block editors with no images and no lists of their own making: header, callout, text and
 * footer. Each field reads straight off the `block` prop and emits through `blockEditor`.
 */

// --- Header --------------------------------------------------------------------------------------

export function HeaderEditor({ block, onChange, readOnly }: BlockEditorProps<HeaderBlock>) {
  const { brand } = useEditorContext();
  const { fields, blocks } = useEditorMessages();
  const words = blocks.header;
  const { patch } = blockEditor(block, onChange);
  return (
    <EditorFields readOnly={readOnly}>
      <FieldPair>
        <TextField
          label={fields.title}
          value={block.title}
          onChange={(title) => patch({ title })}
        />
        <TextField
          label={words.issueLabel}
          placeholder={words.issueLabelPlaceholder}
          value={block.issueLabel}
          onChange={(issueLabel) => patch({ issueLabel })}
        />
      </FieldPair>
      <TextField
        label={words.logoText}
        placeholder={brand.name}
        value={block.logoText}
        onChange={(logoText) => patch({ logoText })}
        help={words.logoTextHelp}
      />
    </EditorFields>
  );
}

// --- Callout -------------------------------------------------------------------------------------

export function CalloutEditor({ block, onChange, readOnly }: BlockEditorProps<CalloutBlock>) {
  const { fields, blocks } = useEditorMessages();
  const { patch } = blockEditor(block, onChange);
  return (
    <EditorFields readOnly={readOnly}>
      <TextField
        label={fields.heading}
        value={block.heading}
        onChange={(heading) => patch({ heading })}
      />
      <AreaField
        label={fields.text}
        rows={3}
        value={block.body}
        onChange={(body) => patch({ body })}
      />
      <FieldPair>
        <TextField
          label={fields.buttonLabel}
          value={block.ctaLabel}
          onChange={(ctaLabel) => patch({ ctaLabel })}
        />
        <TextField
          label={fields.buttonLink}
          placeholder={blocks.callout.linkPlaceholder}
          value={block.ctaUrl}
          onChange={(ctaUrl) => patch({ ctaUrl })}
        />
      </FieldPair>
    </EditorFields>
  );
}

// --- Text ----------------------------------------------------------------------------------------

/**
 * The heading, and the body in a rich-text field. A body stored as plain text is shown as the
 * paragraphs it renders as, and becomes HTML (`plainTextToHtml`, then `format: 'html'`) only the
 * first time it is edited here, so an issue nobody edits renders exactly as it did.
 */
export function TextEditor({ block, onChange, readOnly }: BlockEditorProps<TextBlock>) {
  const { fields } = useEditorMessages();
  const { commit } = blockEditor(block, onChange);
  const body = block.format === 'html' ? block.body : plainTextToHtml(block.body);
  return (
    <EditorFields readOnly={readOnly}>
      <TextField
        label={fields.headingOptional}
        value={block.heading ?? ''}
        onChange={(heading) => commit(withOptional(block, 'heading', heading))}
      />
      <RichTextField
        label={fields.text}
        rows={6}
        value={body}
        onChange={(html) => commit({ ...block, body: html, format: 'html' })}
      />
    </EditorFields>
  );
}

// --- Footer --------------------------------------------------------------------------------------

export function FooterEditor({ block, onChange, readOnly }: BlockEditorProps<FooterBlock>) {
  const { brand } = useEditorContext();
  const { fields, socialLinks, blocks } = useEditorMessages();
  const words = blocks.footer;
  const { patch } = blockEditor(block, onChange);
  const brandSocial = brand.social?.length ?? 0;
  /** "Uses the brand kit: …" for a blank contact field, so the fallback shows where it applies. */
  const brandPlaceholder = (value: string | undefined): string | undefined =>
    value?.trim() ? words.fromBrand(value.trim()) : undefined;

  return (
    <EditorFields readOnly={readOnly}>
      <Note>{words.note}</Note>
      <TextField
        label={words.address}
        placeholder={brandPlaceholder(brand.contact?.address)}
        value={block.address}
        onChange={(address) => patch({ address })}
      />
      <FieldPair>
        <TextField
          label={words.phone}
          type="tel"
          placeholder={brandPlaceholder(brand.contact?.phone)}
          value={block.phone}
          onChange={(phone) => patch({ phone })}
        />
        <TextField
          label={words.email}
          type="email"
          placeholder={brandPlaceholder(brand.contact?.email)}
          value={block.email}
          onChange={(email) => patch({ email })}
        />
      </FieldPair>
      <SocialLinksField
        links={block.social}
        onChange={(social) => patch({ social })}
        empty={brandSocial > 0 ? words.brandSocial(brandSocial) : socialLinks.none}
      />
      <ItemList
        words={words.links}
        variant="line"
        items={block.links}
        onChange={(links) => patch({ links })}
        create={() => ({ label: '', url: '/' })}
        empty={words.links.empty}
        renderItem={(link, update) => (
          <>
            <TextField
              label={fields.label}
              value={link.label}
              onChange={(label) => update({ label })}
            />
            <TextField label={fields.link} value={link.url} onChange={(url) => update({ url })} />
          </>
        )}
      />
      <AreaField
        label={words.compliance}
        rows={3}
        value={block.complianceText}
        onChange={(complianceText) => patch({ complianceText })}
        help={words.complianceHelp}
      />
    </EditorFields>
  );
}
