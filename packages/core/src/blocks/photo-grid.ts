import { defineBlock } from '../definition';
import { LIMITS } from '../limits';
import type { PhotoGridBlock } from '../types';
import { blockValidator } from '../validate';
import { TABLE, gapCell, missingAlt, plural } from './shared';

const [MIN_PHOTOS, MAX_PHOTOS] = LIMITS.photos;

/** Two to six captioned photos, three to a row when they divide by three, else two. */
export const photoGridBlock = defineBlock<PhotoGridBlock>({
  type: 'photo_grid',
  label: 'Photo grid',
  description: 'Two to six captioned photos in a grid.',
  group: 'graphics',
  create: () => ({
    photos: [
      { alt: 'Photo one', caption: '' },
      { alt: 'Photo two', caption: '' },
    ],
  }),
  validate: (block, path) =>
    blockValidator(block, path, 'photo_grid').array(
      'photos',
      {
        min: MIN_PHOTOS,
        max: MAX_PHOTOS,
        tooFew: `A photo grid needs ${MIN_PHOTOS} to ${MAX_PHOTOS} photos.`,
        tooMany: `A photo grid needs ${MIN_PHOTOS} to ${MAX_PHOTOS} photos.`,
      },
      (photo) => {
        photo
          .image('image', { optional: true })
          .string('alt', { label: 'alt text' })
          .string('caption', { optional: true });
      },
    ).issues,
  issues: (block) => [
    ...(block.photos.length < MIN_PHOTOS || block.photos.length > MAX_PHOTOS
      ? [`Use between ${MIN_PHOTOS} and ${MAX_PHOTOS} photos.`]
      : []),
    ...(block.photos.some((photo) => missingAlt(photo.image, photo.alt))
      ? ['Add alt text to every photo.']
      : []),
  ],
  summary: (block) => plural(block.photos.length, 'photo'),
  render(block, ctx) {
    const photos = block.photos.slice(0, MAX_PHOTOS);
    if (photos.length === 0) return '';
    const perRow = photos.length % 3 === 0 ? 3 : 2;
    const cellPx = Math.floor((ctx.width.inner - (perRow - 1) * 12) / perRow);
    const rows: string[] = [];
    for (let index = 0; index < photos.length; index += perRow) {
      const slice = photos.slice(index, index + perRow);
      const cells = slice
        .map((photo, position) => {
          const alt = photo.alt.trim();
          const caption = photo.caption?.trim() ?? '';
          ctx.text(
            `${alt ? `[${ctx.labels.image}: ${alt}]` : `[${ctx.labels.image}]`}${caption ? ` ${caption}` : ''}`,
          );
          return (
            `<td width="${Math.floor(100 / perRow)}%" valign="top" style="padding:0 0 12px 0;">` +
            ctx.imageOrPlaceholder(photo.image, photo.alt, cellPx, 110) +
            (caption
              ? `<p style="${ctx.smallStyle()}margin-top:6px;">${ctx.escape(caption)}</p>`
              : '') +
            `</td>${position < slice.length - 1 ? gapCell(12) : ''}`
          );
        })
        .join('');
      rows.push(`<tr>${cells}</tr>`);
    }
    ctx.text('');
    return ctx.section(block, `${TABLE}${rows.join('')}</table>`, { padding: '16px 32px' });
  },
});
