import {
  LIMITS,
  type BannerBlock,
  type ImageTextBlock,
  type PhotoGridBlock,
  type PhotoItem,
  type StatsBlock,
} from '@subterra-technologies/blockletter';
import type { BlockEditorProps } from '../../editor/types';
import { useEditorMessages } from '../../i18n/context';
import { blockEditor, withImage, withOptional } from '../editor-base';
import {
  AreaField,
  CheckField,
  ChoiceField,
  EditorFields,
  FieldPair,
  Note,
  TextField,
} from '../editor-fields';
import { ImageField } from '../image-field';
import { ItemList } from '../item-list';

/**
 * The graphic block editors: image + text, banner, photo grid and numbers. A field the email
 * leaves out when blank (a caption that is only spaces, an emptied optional link) is dropped from
 * the stored block too, because each input is read from the block it saves.
 */

const [MIN_PHOTOS, MAX_PHOTOS] = LIMITS.photos;
const [MIN_STATS, MAX_STATS] = LIMITS.stats;

// --- Image + text --------------------------------------------------------------------------------

export function ImageTextEditor({ block, onChange, readOnly }: BlockEditorProps<ImageTextBlock>) {
  const { fields, blocks } = useEditorMessages();
  const words = blocks.image_text;
  const { patch, commit } = blockEditor(block, onChange);
  return (
    <EditorFields readOnly={readOnly}>
      <ImageField
        label={fields.picture}
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
      <ChoiceField
        legend={words.side}
        value={block.imageSide}
        onChange={(imageSide) => patch({ imageSide })}
        options={[
          { value: 'left', label: words.left },
          { value: 'right', label: words.right },
        ]}
      />
      <TextField
        label={fields.heading}
        value={block.heading}
        onChange={(heading) => patch({ heading })}
      />
      <AreaField
        label={fields.text}
        rows={5}
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
    </EditorFields>
  );
}

// --- Banner --------------------------------------------------------------------------------------

export function BannerEditor({ block, onChange, readOnly }: BlockEditorProps<BannerBlock>) {
  const { fields, blocks } = useEditorMessages();
  const words = blocks.banner;
  const { patch, commit } = blockEditor(block, onChange);
  return (
    <EditorFields readOnly={readOnly}>
      <ImageField
        label={words.image}
        value={block.image}
        disabled={readOnly}
        onChange={(image) => commit(withImage(block, 'image', image))}
      />
      <TextField label={fields.altText} value={block.alt} onChange={(alt) => patch({ alt })} />
      <FieldPair>
        <TextField
          label={words.headline}
          value={block.heading ?? ''}
          onChange={(value) => commit(withOptional(block, 'heading', value))}
        />
        <TextField
          label={words.subheading}
          value={block.subheading ?? ''}
          onChange={(value) => commit(withOptional(block, 'subheading', value))}
        />
      </FieldPair>
      <FieldPair>
        <TextField
          label={words.buttonLabel}
          value={block.ctaLabel ?? ''}
          onChange={(value) => commit(withOptional(block, 'ctaLabel', value))}
        />
        <TextField
          label={words.buttonLink}
          placeholder={words.linkPlaceholder}
          value={block.ctaUrl ?? ''}
          onChange={(value) => commit(withOptional(block, 'ctaUrl', value))}
        />
      </FieldPair>
      <CheckField
        label={words.overlay}
        checked={block.overlay}
        onChange={(overlay) => patch({ overlay })}
      />
      <Note>{words.overlayNote}</Note>
    </EditorFields>
  );
}

// --- Photo grid ----------------------------------------------------------------------------------

/** `alt` always; the image and caption only when they carry something. */
function toPhoto(photo: PhotoItem): PhotoItem {
  const next: PhotoItem = { alt: photo.alt };
  if (photo.image) next.image = photo.image;
  if (photo.caption?.trim()) next.caption = photo.caption;
  return next;
}

export function PhotoGridEditor({ block, onChange, readOnly }: BlockEditorProps<PhotoGridBlock>) {
  const { fields, blocks } = useEditorMessages();
  const words = blocks.photo_grid;
  const { commit } = blockEditor(block, onChange);
  return (
    <EditorFields readOnly={readOnly}>
      <ItemList
        words={words.list}
        items={block.photos}
        min={MIN_PHOTOS}
        max={MAX_PHOTOS}
        onChange={(photos) => commit({ ...block, photos: photos.map(toPhoto) })}
        create={() => ({ alt: '' })}
        limitHint={words.list.limit(MAX_PHOTOS)}
        hint={words.hint}
        renderItem={(photo, update) => (
          <>
            <ImageField
              label={fields.picture}
              value={photo.image}
              disabled={readOnly}
              onChange={(image) => update({ image })}
            />
            <FieldPair>
              <TextField
                label={fields.altText}
                value={photo.alt}
                onChange={(alt) => update({ alt })}
              />
              <TextField
                label={fields.captionOptional}
                value={photo.caption ?? ''}
                onChange={(caption) => update({ caption })}
              />
            </FieldPair>
          </>
        )}
      />
    </EditorFields>
  );
}

// --- Numbers -------------------------------------------------------------------------------------

export function StatsEditor({ block, onChange, readOnly }: BlockEditorProps<StatsBlock>) {
  const { fields, blocks } = useEditorMessages();
  const words = blocks.stats;
  const { patch } = blockEditor(block, onChange);
  return (
    <EditorFields readOnly={readOnly}>
      <ItemList
        words={words.list}
        variant="line"
        items={block.items}
        min={MIN_STATS}
        max={MAX_STATS}
        onChange={(items) => patch({ items })}
        create={() => ({ value: '', label: '' })}
        limitHint={words.list.limit(MAX_STATS)}
        hint={words.hint}
        renderItem={(item, update) => (
          <>
            <TextField
              label={words.number}
              placeholder={words.numberPlaceholder}
              value={item.value}
              onChange={(value) => update({ value })}
            />
            <TextField
              label={fields.label}
              placeholder={words.statLabelPlaceholder}
              value={item.label}
              onChange={(label) => update({ label })}
            />
          </>
        )}
      />
    </EditorFields>
  );
}
