import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import {
  BannerEditor,
  ImageTextEditor,
  PhotoGridEditor,
  StatsEditor,
} from '../../src/inspector/editors';
import { renderEditor } from '../helpers/editor-registry';
import { testBlock } from '../helpers/fixtures';

describe('ImageTextEditor', () => {
  const block = testBlock('image_text');

  it('shows the picture, alt help, side choice, heading, text and the optional link pair', () => {
    renderEditor(ImageTextEditor, block);
    expect(screen.getByRole('group', { name: 'Picture' })).toBeInTheDocument();
    expect(screen.getByLabelText('Alt text')).toHaveAccessibleDescription(
      'Describe the picture for readers who cannot see it.',
    );
    expect(screen.getByRole('radiogroup', { name: 'Picture side' })).toBeInTheDocument();
    expect(screen.getByLabelText('Left')).toBeChecked();
    expect(screen.getByLabelText('Heading')).toHaveValue('A short headline');
    expect(screen.getByLabelText('Text')).toHaveValue(block.body);
    expect(screen.getByLabelText('Link (optional)')).toHaveAttribute('placeholder', '/events');
  });

  it('emits the chosen picture side, by click or arrow key', async () => {
    const user = userEvent.setup();
    const { latest } = renderEditor(ImageTextEditor, block);
    await user.click(screen.getByLabelText('Right'));
    expect(latest().imageSide).toBe('right');
    await user.keyboard('{ArrowLeft>}');
    expect(latest().imageSide).toBe('left');
  });

  it('drops an emptied optional link rather than storing an empty string', async () => {
    const { latest } = renderEditor(ImageTextEditor, { ...block, linkUrl: '/e' });
    await userEvent.clear(screen.getByLabelText('Link (optional)'));
    expect(latest()).not.toHaveProperty('linkUrl');
  });

  it('shows the stored picture as a thumbnail', () => {
    const { container } = renderEditor(ImageTextEditor, {
      ...block,
      image: { url: 'https://files.example/pic.png' },
    });
    expect(container.querySelector('img')).toHaveAttribute('src', 'https://files.example/pic.png');
  });

  it('disables every field when read-only', () => {
    renderEditor(ImageTextEditor, block, { readOnly: true });
    expect(screen.getByLabelText('Heading')).toBeDisabled();
    expect(screen.getByLabelText('Right')).toBeDisabled();
  });
});

describe('BannerEditor', () => {
  const block = testBlock('banner');

  it('shows the image, the optional headline and button pairs, and the overlay toggle', () => {
    renderEditor(BannerEditor, block);
    expect(screen.getByRole('group', { name: 'Banner image' })).toBeInTheDocument();
    expect(screen.getByLabelText('Alt text')).toHaveValue('');
    expect(screen.getByLabelText('Headline (optional)')).toHaveValue('Save the date');
    expect(screen.getByLabelText('Subheading (optional)')).toBeInTheDocument();
    expect(screen.getByLabelText('Button label (optional)')).toBeInTheDocument();
    expect(screen.getByLabelText('Button link (optional)')).toHaveAttribute(
      'placeholder',
      '/events',
    );
    expect(screen.getByLabelText('Place the headline over the image')).toBeChecked();
    expect(
      screen.getByText(
        'Overlay text needs a darker picture to stay readable. Turn it off to put the headline underneath instead.',
      ),
    ).toBeInTheDocument();
  });

  it('emits the overlay toggle', async () => {
    const { latest } = renderEditor(BannerEditor, block);
    await userEvent.click(screen.getByLabelText('Place the headline over the image'));
    expect(latest().overlay).toBe(false);
  });
});

describe('PhotoGridEditor', () => {
  const block = testBlock('photo_grid');

  it('shows one card per photo, with the two-to-six helper', () => {
    renderEditor(PhotoGridEditor, block);
    expect(screen.getByRole('list', { name: 'Photos' })).toBeInTheDocument();
    expect(screen.getByText('Photo 1')).toBeInTheDocument();
    expect(screen.getByText('Photo 2')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Two to six photos: three to a row when they divide by three, otherwise two.',
      ),
    ).toBeInTheDocument();
  });

  it('keeps the minimum of two photos: Remove is disabled at two', () => {
    renderEditor(PhotoGridEditor, block);
    expect(screen.getByRole('button', { name: 'Remove photo 1' })).toBeDisabled();
  });

  it('adds a photo and puts focus in it', async () => {
    const { latest } = renderEditor(PhotoGridEditor, block);
    await userEvent.click(screen.getByRole('button', { name: 'Add photo' }));
    // Blank captions are dropped on the way out, the new photo's included.
    expect(latest().photos).toEqual([{ alt: 'Photo one' }, { alt: 'Photo two' }, { alt: '' }]);
    expect(screen.getAllByLabelText(/Image URL/)[2]).toHaveFocus();
  });

  it('removes a photo once above the minimum', async () => {
    const three = { ...block, photos: [{ alt: 'a' }, { alt: 'b' }, { alt: 'c' }] };
    const { latest } = renderEditor(PhotoGridEditor, three);
    await userEvent.click(screen.getByRole('button', { name: 'Remove photo 2' }));
    expect(latest().photos.map((photo) => photo.alt)).toEqual(['a', 'c']);
  });

  it('stops adding at six photos, and says why', () => {
    const six = {
      ...block,
      photos: Array.from({ length: 6 }, (_, index) => ({ alt: `Photo ${index}` })),
    };
    renderEditor(PhotoGridEditor, six);
    const add = screen.getByRole('button', { name: 'Add photo' });
    expect(add).toBeDisabled();
    expect(add).toHaveAccessibleDescription('A photo grid holds up to 6 photos.');
  });

  it('edits one row without touching the others, and drops a blank caption', async () => {
    const { latest } = renderEditor(PhotoGridEditor, {
      ...block,
      photos: [{ alt: 'One', caption: 'Spring' }, { alt: '' }],
    });
    await userEvent.type(screen.getAllByLabelText('Alt text')[1] as HTMLElement, 'B');
    await userEvent.clear(screen.getAllByLabelText('Caption (optional)')[0] as HTMLElement);
    expect(latest().photos).toEqual([{ alt: 'One' }, { alt: 'B' }]);
  });
});

describe('StatsEditor', () => {
  const block = testBlock('stats');

  it('shows the number rows with their placeholders and the helper', () => {
    renderEditor(StatsEditor, block);
    expect(screen.getByRole('list', { name: 'Numbers' })).toBeInTheDocument();
    expect(screen.getAllByLabelText('Number')[0]).toHaveAttribute('placeholder', '120');
    expect(screen.getAllByLabelText('Label')[0]).toHaveAttribute('placeholder', 'Members');
    expect(screen.getByText('Two to four numbers, side by side in the email.')).toBeInTheDocument();
  });

  it('adds numbers and stops at four', async () => {
    const { latest } = renderEditor(StatsEditor, block);
    await userEvent.click(screen.getByRole('button', { name: 'Add number' }));
    await userEvent.click(screen.getByRole('button', { name: 'Add number' }));
    expect(latest().items).toHaveLength(4);
    expect(screen.getByRole('button', { name: 'Add number' })).toBeDisabled();
  });

  it('disables Remove at the minimum of two', () => {
    renderEditor(StatsEditor, block);
    expect(screen.getByRole('button', { name: 'Remove number 1' })).toBeDisabled();
  });
});
