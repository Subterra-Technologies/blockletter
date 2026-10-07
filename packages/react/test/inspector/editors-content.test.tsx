import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ArticleEditor, ImageEditor, LetterEditor } from '../../src/inspector/editors';
import { renderEditor } from '../helpers/editor-registry';
import { testBlock } from '../helpers/fixtures';

const LETTER = testBlock('letter', {
  heading: 'A note from the chair',
  body: 'Dear readers,\n\nThank you for a lovely year.',
  signature: 'Jo Park',
});

describe('LetterEditor', () => {
  it('shows the heading, letter and signature, with the paragraph helper', () => {
    renderEditor(LetterEditor, LETTER);
    expect(screen.getByLabelText('Heading')).toHaveValue(LETTER.heading);
    expect(screen.getByLabelText('Letter')).toHaveValue(LETTER.body);
    expect(screen.getByLabelText('Letter')).toHaveAccessibleDescription(
      'Leave a blank line between paragraphs. An empty letter is left out of the email.',
    );
    expect(screen.getByLabelText('Signature')).toHaveValue(LETTER.signature);
  });

  it('offers the photo, by upload when the host stores files', () => {
    renderEditor(LetterEditor, LETTER, { context: { uploadImage: vi.fn() } });
    const photo = screen.getByRole('group', { name: 'Photo' });
    expect(within(photo).getByLabelText(/Choose image/)).toHaveAttribute('type', 'file');
    expect(within(photo).getByLabelText('Image URL')).toBeInTheDocument();
  });

  it('emits the merged block when the letter changes', async () => {
    const { latest } = renderEditor(LetterEditor, LETTER);
    await userEvent.type(screen.getByLabelText('Letter'), '!!');
    expect(latest()).toEqual({ ...LETTER, body: `${LETTER.body}!!` });
  });

  it('shows the stored photo as a thumbnail, and drops it when removed', async () => {
    const { container, latest } = renderEditor(LetterEditor, {
      ...LETTER,
      photo: { url: 'https://files.example/portrait.png', assetId: 'portrait-1' },
    });
    // Decorative (`alt=""`): the field's label says what it is, so it is found by tag.
    expect(container.querySelector('img')).toHaveAttribute(
      'src',
      'https://files.example/portrait.png',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Remove image' }));
    expect(latest()).not.toHaveProperty('photo');
  });

  it('disables every field when read-only', () => {
    renderEditor(LetterEditor, LETTER, { readOnly: true });
    expect(screen.getByLabelText('Heading')).toBeDisabled();
    expect(screen.getByLabelText('Letter')).toBeDisabled();
    expect(screen.getByLabelText(/Image URL/)).toBeDisabled();
  });
});

describe('ArticleEditor', () => {
  it('shows the section heading, the article and the optional link pair', () => {
    renderEditor(ArticleEditor, testBlock('article'));
    expect(screen.getByLabelText('Section heading')).toHaveValue('Tips and tools');
    expect(screen.getByLabelText('Article title')).toHaveValue('One practical idea for this month');
    expect(screen.getByLabelText('Article')).toHaveValue(testBlock('article').body);
    expect(screen.getByLabelText('Link label (optional)')).toHaveValue('');
    expect(screen.getByLabelText('Link (optional)')).toHaveAttribute('placeholder', '/resources');
    expect(screen.getByRole('group', { name: 'Article image' })).toBeInTheDocument();
  });

  it('stores the kicker the section heading edits', async () => {
    const { latest } = renderEditor(ArticleEditor, testBlock('article', { kicker: '' }));
    await userEvent.type(screen.getByLabelText('Section heading'), 'Toolbox');
    expect(latest().kicker).toBe('Toolbox');
  });

  it('keeps a typed optional link and drops it again when cleared', async () => {
    const { latest } = renderEditor(ArticleEditor, testBlock('article', { linkUrl: '/resources' }));
    await userEvent.clear(screen.getByLabelText('Link (optional)'));
    expect(latest()).not.toHaveProperty('linkUrl');
    await userEvent.type(screen.getByLabelText('Link (optional)'), '/guides');
    expect(latest().linkUrl).toBe('/guides');
  });
});

describe('ImageEditor', () => {
  it('shows the image, the alt text with its helper, the caption and the link', () => {
    renderEditor(ImageEditor, testBlock('image'));
    expect(screen.getByRole('group', { name: 'Image' })).toBeInTheDocument();
    expect(screen.getByLabelText('Alt text')).toHaveAccessibleDescription(
      'Describe the picture for readers who cannot see it.',
    );
    expect(screen.getByLabelText('Caption (optional)')).toHaveValue('');
    expect(screen.getByLabelText('Link (optional)')).toHaveValue('');
  });

  it('emits the merged block when the alt text changes', async () => {
    const { latest } = renderEditor(ImageEditor, testBlock('image'));
    await userEvent.type(screen.getByLabelText('Alt text'), 'A reading room');
    expect(latest().alt).toBe('A reading room');
  });

  it('takes an image by its address', async () => {
    const { latest } = renderEditor(ImageEditor, testBlock('image'));
    await userEvent.type(
      screen.getByLabelText(/Image URL/),
      'https://photos.example/reading-room.jpg',
    );
    await userEvent.tab();
    expect(latest().image).toEqual({ url: 'https://photos.example/reading-room.jpg' });
  });

  it('drops an emptied caption rather than storing an empty string', async () => {
    const { latest } = renderEditor(ImageEditor, testBlock('image', { caption: 'Spring' }));
    await userEvent.clear(screen.getByLabelText('Caption (optional)'));
    expect(latest()).not.toHaveProperty('caption');
  });
});
