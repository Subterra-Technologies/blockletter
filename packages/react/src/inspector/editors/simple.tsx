import {
  plainTextToHtml,
  type CalloutBlock,
  type FooterBlock,
  type HeaderBlock,
  type TextBlock,
} from '@subterra-technologies/blockletter';
import { useEditorContext } from '../../editor/context';
import type { BlockEditorProps } from '../../editor/types';
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
  const { patch } = blockEditor(block, onChange);
  return (
    <EditorFields readOnly={readOnly}>
      <FieldPair>
        <TextField label="Title" value={block.title} onChange={(title) => patch({ title })} />
        <TextField
          label="Issue label"
          placeholder="September 2026"
          value={block.issueLabel}
          onChange={(issueLabel) => patch({ issueLabel })}
        />
      </FieldPair>
      <TextField
        label="Logo text"
        placeholder={brand.name}
        value={block.logoText}
        onChange={(logoText) => patch({ logoText })}
        help="Shown above the title when the brand kit has no logo, and read out as the logo’s description when it has one. Leave it blank to use the organisation’s name."
      />
    </EditorFields>
  );
}

// --- Callout -------------------------------------------------------------------------------------

export function CalloutEditor({ block, onChange, readOnly }: BlockEditorProps<CalloutBlock>) {
  const { patch } = blockEditor(block, onChange);
  return (
    <EditorFields readOnly={readOnly}>
      <TextField label="Heading" value={block.heading} onChange={(heading) => patch({ heading })} />
      <AreaField label="Text" rows={3} value={block.body} onChange={(body) => patch({ body })} />
      <FieldPair>
        <TextField
          label="Button label"
          value={block.ctaLabel}
          onChange={(ctaLabel) => patch({ ctaLabel })}
        />
        <TextField
          label="Button link"
          placeholder="/contact"
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
  const { commit } = blockEditor(block, onChange);
  const body = block.format === 'html' ? block.body : plainTextToHtml(block.body);
  return (
    <EditorFields readOnly={readOnly}>
      <TextField
        label="Heading (optional)"
        value={block.heading ?? ''}
        onChange={(heading) => commit(withOptional(block, 'heading', heading))}
      />
      <RichTextField
        label="Text"
        rows={6}
        value={body}
        onChange={(html) => commit({ ...block, body: html, format: 'html' })}
      />
    </EditorFields>
  );
}

// --- Footer --------------------------------------------------------------------------------------

/** "Uses the brand kit: …" for a blank contact field, so the fallback is visible where it applies. */
const brandPlaceholder = (value: string | undefined): string | undefined =>
  value?.trim() ? `Uses the brand kit: ${value.trim()}` : undefined;

export function FooterEditor({ block, onChange, readOnly }: BlockEditorProps<FooterBlock>) {
  const { brand } = useEditorContext();
  const { patch } = blockEditor(block, onChange);
  const brandSocial = brand.social?.length ?? 0;

  return (
    <EditorFields readOnly={readOnly}>
      <Note>
        Blank contact fields use the brand kit’s, so one brand kit change updates every issue.
      </Note>
      <TextField
        label="Mailing address"
        placeholder={brandPlaceholder(brand.contact?.address)}
        value={block.address}
        onChange={(address) => patch({ address })}
      />
      <FieldPair>
        <TextField
          label="Phone"
          type="tel"
          placeholder={brandPlaceholder(brand.contact?.phone)}
          value={block.phone}
          onChange={(phone) => patch({ phone })}
        />
        <TextField
          label="Email"
          type="email"
          placeholder={brandPlaceholder(brand.contact?.email)}
          value={block.email}
          onChange={(email) => patch({ email })}
        />
      </FieldPair>
      <SocialLinksField
        links={block.social}
        onChange={(social) => patch({ social })}
        empty={
          brandSocial > 0
            ? `None here, so the brand kit’s ${brandSocial === 1 ? 'link is' : `${brandSocial} links are`} used.`
            : 'No social links yet.'
        }
      />
      <ItemList
        label="Footer links"
        noun="link"
        variant="line"
        items={block.links}
        onChange={(links) => patch({ links })}
        create={() => ({ label: '', url: '/' })}
        addLabel="Add link"
        empty="No footer links yet."
        renderItem={(link, update) => (
          <>
            <TextField label="Label" value={link.label} onChange={(label) => update({ label })} />
            <TextField label="Link" value={link.url} onChange={(url) => update({ url })} />
          </>
        )}
      />
      <AreaField
        label="Compliance text"
        rows={3}
        value={block.complianceText}
        onChange={(complianceText) => patch({ complianceText })}
        help="Why readers get this email. The preference and unsubscribe links follow it."
      />
    </EditorFields>
  );
}
