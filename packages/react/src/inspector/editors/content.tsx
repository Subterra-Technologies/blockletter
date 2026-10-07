import type { ArticleBlock, ImageBlock, LetterBlock } from '@subterra-technologies/blockletter';
import type { BlockEditorProps } from '../../editor/types';
import { blockEditor, withImage, withOptional } from '../editor-base';
import { AreaField, EditorFields, FieldPair, TextField } from '../editor-fields';
import { ImageField } from '../image-field';

/**
 * The long-form block editors that carry an image: a letter, a feature article and a standalone
 * image. Plain text areas, not a rich-text editor: the renderer turns blank lines into
 * paragraphs and nothing more.
 */

// --- Letter --------------------------------------------------------------------------------------

export function LetterEditor({ block, onChange, readOnly }: BlockEditorProps<LetterBlock>) {
  const { patch, commit } = blockEditor(block, onChange);
  return (
    <EditorFields readOnly={readOnly}>
      <TextField label="Heading" value={block.heading} onChange={(heading) => patch({ heading })} />
      <AreaField
        label="Letter"
        rows={10}
        help="Leave a blank line between paragraphs. An empty letter is left out of the email."
        value={block.body}
        onChange={(body) => patch({ body })}
      />
      <TextField
        label="Signature"
        value={block.signature}
        onChange={(signature) => patch({ signature })}
      />
      <ImageField
        label="Photo"
        value={block.photo}
        disabled={readOnly}
        onChange={(photo) => commit(withImage(block, 'photo', photo))}
      />
    </EditorFields>
  );
}

// --- Article -------------------------------------------------------------------------------------

export function ArticleEditor({ block, onChange, readOnly }: BlockEditorProps<ArticleBlock>) {
  const { patch, commit } = blockEditor(block, onChange);
  return (
    <EditorFields readOnly={readOnly}>
      <TextField
        label="Section heading"
        help="The small label above the title, such as “Tips and tools”."
        value={block.kicker}
        onChange={(kicker) => patch({ kicker })}
      />
      <TextField label="Article title" value={block.title} onChange={(title) => patch({ title })} />
      <AreaField label="Article" rows={7} value={block.body} onChange={(body) => patch({ body })} />
      <FieldPair>
        <TextField
          label="Link label (optional)"
          value={block.linkLabel ?? ''}
          onChange={(value) => commit(withOptional(block, 'linkLabel', value))}
        />
        <TextField
          label="Link (optional)"
          placeholder="/resources"
          value={block.linkUrl ?? ''}
          onChange={(value) => commit(withOptional(block, 'linkUrl', value))}
        />
      </FieldPair>
      <ImageField
        label="Article image"
        value={block.image}
        disabled={readOnly}
        onChange={(image) => commit(withImage(block, 'image', image))}
      />
    </EditorFields>
  );
}

// --- Image ---------------------------------------------------------------------------------------

export function ImageEditor({ block, onChange, readOnly }: BlockEditorProps<ImageBlock>) {
  const { patch, commit } = blockEditor(block, onChange);
  return (
    <EditorFields readOnly={readOnly}>
      <ImageField
        label="Image"
        value={block.image}
        disabled={readOnly}
        onChange={(image) => commit(withImage(block, 'image', image))}
      />
      <TextField
        label="Alt text"
        help="Describe the picture for readers who cannot see it."
        value={block.alt}
        onChange={(alt) => patch({ alt })}
      />
      <TextField
        label="Caption (optional)"
        value={block.caption ?? ''}
        onChange={(value) => commit(withOptional(block, 'caption', value))}
      />
      <TextField
        label="Link (optional)"
        placeholder="/gallery"
        value={block.linkUrl ?? ''}
        onChange={(value) => commit(withOptional(block, 'linkUrl', value))}
      />
    </EditorFields>
  );
}
