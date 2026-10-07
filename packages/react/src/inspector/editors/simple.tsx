import { useId, useRef } from 'react';
import {
  htmlToText,
  sanitizeHtml,
  type CalloutBlock,
  type FooterBlock,
  type HeaderBlock,
  type TextBlock,
} from '@subterra-technologies/blockletter';
import { useEditorContext } from '../../editor/context';
import type { BlockEditorProps } from '../../editor/types';
import { focusAfterConfirm } from '../../lib/focus';
import { Button } from '../../ui/button';
import { useConfirm } from '../../ui/confirm';
import { blockEditor, withOptional } from '../editor-base';
import {
  AreaField,
  EditorFields,
  FieldPair,
  GroupLabel,
  Hint,
  Note,
  TextField,
} from '../editor-fields';
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
 * Plain text in a text area. A body stored as HTML (from a template or another editor) is shown
 * as it will read, cleaned the way the renderer cleans it, until it is converted: this editor
 * has no way to change formatting, and must not quietly drop it by editing the markup as text.
 */
export function TextEditor({ block, onChange, readOnly }: BlockEditorProps<TextBlock>) {
  const { commit } = blockEditor(block, onChange);
  const confirm = useConfirm();
  const id = useId();
  const labelId = `${id}-label`;
  const noteId = `${id}-note`;
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  async function convert(): Promise<void> {
    const ok = await confirm({
      title: 'Convert this text to plain text?',
      description: 'Its formatting (bold, italics, links and lists) is removed. The words stay.',
      confirmLabel: 'Convert to plain text',
    });
    if (!ok) return;
    const next: TextBlock = { ...block, body: htmlToText(block.body) };
    delete next.format;
    commit(next);
    focusAfterConfirm(() => bodyRef.current);
  }

  return (
    <EditorFields readOnly={readOnly}>
      <TextField
        label="Heading (optional)"
        value={block.heading ?? ''}
        onChange={(heading) => commit(withOptional(block, 'heading', heading))}
      />
      {block.format === 'html' ? (
        <div className="bl:flex bl:min-w-0 bl:flex-col bl:gap-2">
          <GroupLabel id={labelId}>Text</GroupLabel>
          <div
            role="group"
            aria-labelledby={labelId}
            aria-describedby={noteId}
            className="bl:max-h-80 bl:overflow-y-auto bl:rounded-md bl:border bl:bg-muted bl:px-3 bl:py-2 bl:text-sm bl:leading-relaxed bl:break-words bl:[&_a]:underline bl:[&_blockquote]:border-l-2 bl:[&_blockquote]:pl-3 bl:[&_h1]:font-semibold bl:[&_h2]:font-semibold bl:[&_h3]:font-semibold bl:[&_ol]:list-decimal bl:[&_ol]:pl-5 bl:[&_ul]:list-disc bl:[&_ul]:pl-5 bl:[&>*+*]:mt-2"
            // Cleaned by the same sanitiser the renderer uses: no scripts, handlers or unsafe links.
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(block.body) }}
          />
          <Hint id={noteId}>
            This text has formatting this editor can’t change. Convert it to plain text to edit it
            here.
          </Hint>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="bl:self-start"
            onClick={() => void convert()}
          >
            Convert to plain text
          </Button>
        </div>
      ) : (
        <AreaField
          label="Text"
          rows={6}
          help="Leave a blank line between paragraphs."
          value={block.body}
          textareaRef={bodyRef}
          onChange={(body) => commit({ ...block, body })}
        />
      )}
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
