import {
  LIMITS,
  type BannerBlock,
  type ImageTextBlock,
  type PhotoGridBlock,
  type PhotoItem,
  type StatsBlock,
} from '@subterra-technologies/blockletter';
import type { BlockEditorProps } from '../../editor/types';
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
  const { patch, commit } = blockEditor(block, onChange);
  return (
    <EditorFields readOnly={readOnly}>
      <ImageField
        label="Picture"
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
      <ChoiceField
        legend="Picture side"
        value={block.imageSide}
        onChange={(imageSide) => patch({ imageSide })}
        options={[
          { value: 'left', label: 'Left' },
          { value: 'right', label: 'Right' },
        ]}
      />
      <TextField label="Heading" value={block.heading} onChange={(heading) => patch({ heading })} />
      <AreaField label="Text" rows={5} value={block.body} onChange={(body) => patch({ body })} />
      <FieldPair>
        <TextField
          label="Link label (optional)"
          value={block.linkLabel ?? ''}
          onChange={(value) => commit(withOptional(block, 'linkLabel', value))}
        />
        <TextField
          label="Link (optional)"
          placeholder="/events"
          value={block.linkUrl ?? ''}
          onChange={(value) => commit(withOptional(block, 'linkUrl', value))}
        />
      </FieldPair>
    </EditorFields>
  );
}

// --- Banner --------------------------------------------------------------------------------------

export function BannerEditor({ block, onChange, readOnly }: BlockEditorProps<BannerBlock>) {
  const { patch, commit } = blockEditor(block, onChange);
  return (
    <EditorFields readOnly={readOnly}>
      <ImageField
        label="Banner image"
        value={block.image}
        disabled={readOnly}
        onChange={(image) => commit(withImage(block, 'image', image))}
      />
      <TextField label="Alt text" value={block.alt} onChange={(alt) => patch({ alt })} />
      <FieldPair>
        <TextField
          label="Headline (optional)"
          value={block.heading ?? ''}
          onChange={(value) => commit(withOptional(block, 'heading', value))}
        />
        <TextField
          label="Subheading (optional)"
          value={block.subheading ?? ''}
          onChange={(value) => commit(withOptional(block, 'subheading', value))}
        />
      </FieldPair>
      <FieldPair>
        <TextField
          label="Button label (optional)"
          value={block.ctaLabel ?? ''}
          onChange={(value) => commit(withOptional(block, 'ctaLabel', value))}
        />
        <TextField
          label="Button link (optional)"
          placeholder="/events"
          value={block.ctaUrl ?? ''}
          onChange={(value) => commit(withOptional(block, 'ctaUrl', value))}
        />
      </FieldPair>
      <CheckField
        label="Place the headline over the image"
        checked={block.overlay}
        onChange={(overlay) => patch({ overlay })}
      />
      <Note>
        Overlay text needs a darker picture to stay readable. Turn it off to put the headline
        underneath instead.
      </Note>
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
  const { commit } = blockEditor(block, onChange);
  return (
    <EditorFields readOnly={readOnly}>
      <ItemList
        label="Photos"
        noun="photo"
        items={block.photos}
        min={MIN_PHOTOS}
        max={MAX_PHOTOS}
        onChange={(photos) => commit({ ...block, photos: photos.map(toPhoto) })}
        create={() => ({ alt: '' })}
        addLabel="Add photo"
        limitHint={`A photo grid holds up to ${MAX_PHOTOS} photos.`}
        hint="Two to six photos: three to a row when they divide by three, otherwise two."
        renderItem={(photo, update) => (
          <>
            <ImageField
              label="Picture"
              value={photo.image}
              disabled={readOnly}
              onChange={(image) => update({ image })}
            />
            <FieldPair>
              <TextField label="Alt text" value={photo.alt} onChange={(alt) => update({ alt })} />
              <TextField
                label="Caption (optional)"
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
  const { patch } = blockEditor(block, onChange);
  return (
    <EditorFields readOnly={readOnly}>
      <ItemList
        label="Numbers"
        noun="number"
        variant="line"
        items={block.items}
        min={MIN_STATS}
        max={MAX_STATS}
        onChange={(items) => patch({ items })}
        create={() => ({ value: '', label: '' })}
        addLabel="Add number"
        limitHint={`A numbers block holds up to ${MAX_STATS} numbers.`}
        hint="Two to four numbers, side by side in the email."
        renderItem={(item, update) => (
          <>
            <TextField
              label="Number"
              placeholder="120"
              value={item.value}
              onChange={(value) => update({ value })}
            />
            <TextField
              label="Label"
              placeholder="Members"
              value={item.label}
              onChange={(label) => update({ label })}
            />
          </>
        )}
      />
    </EditorFields>
  );
}
