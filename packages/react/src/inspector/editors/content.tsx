import type { ArticleBlock, ImageBlock, LetterBlock } from '@subterra-technologies/blockletter';
import type { BlockEditorProps } from '../../editor/types';
import { useEditorMessages } from '../../i18n/context';
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
  const { fields, blocks } = useEditorMessages();
  const words = blocks.letter;
  const { patch, commit } = blockEditor(block, onChange);
  return (
    <EditorFields readOnly={readOnly}>
      <TextField
        label={fields.heading}
        value={block.heading}
        onChange={(heading) => patch({ heading })}
      />
      <AreaField
        label={words.letter}
        rows={10}
        help={words.letterHelp}
        value={block.body}
        onChange={(body) => patch({ body })}
      />
      <TextField
        label={words.signature}
        value={block.signature}
        onChange={(signature) => patch({ signature })}
      />
      <ImageField
        label={words.photo}
        value={block.photo}
        disabled={readOnly}
        onChange={(photo) => commit(withImage(block, 'photo', photo))}
      />
    </EditorFields>
  );
}

// --- Article -------------------------------------------------------------------------------------

export function ArticleEditor({ block, onChange, readOnly }: BlockEditorProps<ArticleBlock>) {
  const { fields, blocks } = useEditorMessages();
  const words = blocks.article;
  const { patch, commit } = blockEditor(block, onChange);
  return (
    <EditorFields readOnly={readOnly}>
      <TextField
        label={words.kicker}
        help={words.kickerHelp}
        value={block.kicker}
        onChange={(kicker) => patch({ kicker })}
      />
      <TextField
        label={words.articleTitle}
        value={block.title}
        onChange={(title) => patch({ title })}
      />
      <AreaField
        label={words.article}
        rows={7}
        value={block.body}
        onChange={(body) => patch({ body })}
      />
      <FieldPair>
        <TextField
          label={fields.linkLabelOptional}
          value={block.linkLabel ?? ''}
          onChange={(value) => commit(withOptional(block, 'linkLabel', value))}
        />
        <TextField
          label={fields.linkOptional}
          placeholder={words.linkPlaceholder}
          value={block.linkUrl ?? ''}
          onChange={(value) => commit(withOptional(block, 'linkUrl', value))}
        />
      </FieldPair>
      <ImageField
        label={words.image}
        value={block.image}
        disabled={readOnly}
        onChange={(image) => commit(withImage(block, 'image', image))}
      />
    </EditorFields>
  );
}

// --- Image ---------------------------------------------------------------------------------------

export function ImageEditor({ block, onChange, readOnly }: BlockEditorProps<ImageBlock>) {
  const { fields, blocks } = useEditorMessages();
  const words = blocks.image;
  const { patch, commit } = blockEditor(block, onChange);
  return (
    <EditorFields readOnly={readOnly}>
      <ImageField
        label={words.image}
        value={block.image}
        disabled={readOnly}
        onChange={(image) => commit(withImage(block, 'image', image))}
      />
      <TextField
        label={fields.altText}
        help={fields.altTextHelp}
        value={block.alt}
        onChange={(alt) => patch({ alt })}
      />
      <TextField
        label={fields.captionOptional}
        value={block.caption ?? ''}
        onChange={(value) => commit(withOptional(block, 'caption', value))}
      />
      <TextField
        label={fields.linkOptional}
        placeholder={words.linkPlaceholder}
        value={block.linkUrl ?? ''}
        onChange={(value) => commit(withOptional(block, 'linkUrl', value))}
      />
    </EditorFields>
  );
}
