import { useState } from 'react';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { ImageRef } from '@subterra-technologies/blockletter';
import {
  ImageField,
  MAX_IMAGE_BYTES,
  imageError,
  isHttpsUrl,
} from '../../src/inspector/image-field';
import { renderInEditor } from '../helpers/render';

const fileOf = (name: string, type: string, bytes: number) =>
  new File([new Uint8Array(bytes)], name, { type });

/** A host that stores files: resolves with where the file now lives. */
const uploader = (image: ImageRef = { url: 'https://cdn.example/logo.png', assetId: 'asset-1' }) =>
  vi.fn<(file: File) => Promise<ImageRef>>().mockResolvedValue(image);

function renderField(
  props: Partial<Parameters<typeof ImageField>[0]> = {},
  uploadImage?: (file: File) => Promise<ImageRef>,
) {
  const onChange = vi.fn();
  const view = renderInEditor(
    <ImageField label="Photo" value={undefined} onChange={onChange} {...props} />,
    { context: uploadImage ? { uploadImage } : {} },
  );
  return { ...view, onChange };
}

describe('ImageField', () => {
  it('shows the None placeholder with nothing chosen', () => {
    renderField();
    expect(screen.getByText('None')).toBeInTheDocument();
  });

  it('shows the Saved placeholder for an image the host resolves later', () => {
    renderField({ value: { url: '', assetId: 'asset-1' } });
    expect(screen.getByText('Saved')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove image' })).toBeInTheDocument();
  });

  it('shows the image as a thumbnail', () => {
    const { container } = renderField({ value: { url: 'https://files.example/a.jpg' } });
    // `alt=""`: the field's label already says what the picture is, so it is found by tag.
    expect(container.querySelector('img')).toHaveAttribute('src', 'https://files.example/a.jpg');
  });

  it('says so when the image cannot be loaded', () => {
    const { container } = renderField({ value: { url: 'https://files.example/missing.jpg' } });
    fireEvent.error(container.querySelector('img') as HTMLImageElement);
    expect(screen.getByText('Can’t load')).toBeInTheDocument();
    expect(screen.getByLabelText(/Image URL/)).toHaveAccessibleDescription(
      'The image at this address could not be loaded. Check the address.',
    );
  });

  it('hides Remove when disabled', () => {
    renderField({ value: { url: 'https://files.example/a.jpg' }, disabled: true });
    expect(screen.queryByRole('button', { name: 'Remove image' })).toBeNull();
    expect(screen.getByLabelText(/Image URL/)).toBeDisabled();
  });

  it('emits undefined when Remove image is pressed', async () => {
    const { onChange } = renderField({ value: { url: 'https://files.example/a.jpg' } });
    await userEvent.click(screen.getByRole('button', { name: 'Remove image' }));
    expect(onChange).toHaveBeenCalledWith(undefined);
  });

  describe('with an uploadImage in the editor context', () => {
    it('offers a file picker named by the field, with the types and size it takes', () => {
      renderField({}, uploader());
      const input = screen.getByLabelText(/^Photo/, { selector: 'input[type="file"]' });
      expect(input).toHaveAccessibleName('Photo Choose image');
      expect(input).toHaveAttribute('accept', 'image/jpeg,image/png,image/webp');
      expect(input).toHaveAccessibleDescription('JPEG, PNG or WebP up to 2 MB.');
      expect(screen.getByRole('group', { name: 'Photo' })).toBeInTheDocument();
    });

    it('rejects a file of the wrong type without uploading', async () => {
      const upload = uploader();
      const { onChange } = renderField({}, upload);
      const input = screen.getByLabelText(/Choose image/) as HTMLInputElement;
      // `userEvent.upload` honours `accept`; the field's own check is what is under test.
      fireEvent.change(input, { target: { files: [fileOf('a.gif', 'image/gif', 10)] } });
      expect(await screen.findByRole('alert')).toHaveTextContent('Use a JPEG, PNG, or WebP image.');
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(onChange).not.toHaveBeenCalled();
      expect(upload).not.toHaveBeenCalled();
    });

    it('rejects a file over 2 MB without uploading', async () => {
      const upload = uploader();
      const { onChange } = renderField({}, upload);
      fireEvent.change(screen.getByLabelText(/Choose image/), {
        target: { files: [fileOf('a.jpg', 'image/jpeg', 3 * 1024 * 1024)] },
      });
      expect(await screen.findByText('Images must be 2 MB or smaller.')).toBeInTheDocument();
      expect(onChange).not.toHaveBeenCalled();
      expect(upload).not.toHaveBeenCalled();
    });

    it('uploads a file and emits where it lives', async () => {
      const upload = uploader();
      const { onChange } = renderField({}, upload);
      const input = screen.getByLabelText(/Choose image/) as HTMLInputElement;
      const file = fileOf('logo.png', 'image/png', 10);
      await userEvent.upload(input, file);
      await waitFor(() =>
        expect(onChange).toHaveBeenCalledWith({
          url: 'https://cdn.example/logo.png',
          assetId: 'asset-1',
        }),
      );
      expect(upload).toHaveBeenCalledWith(file);
      expect(input.value).toBe('');
      expect(screen.getByText('Image uploaded.')).toBeInTheDocument();
    });

    it('says “Uploading…” while the upload runs, and disables the picker', async () => {
      let finish!: (image: ImageRef) => void;
      const upload = vi.fn(() => new Promise<ImageRef>((resolve) => (finish = resolve)));
      renderField({}, upload);
      const input = screen.getByLabelText(/Choose image/) as HTMLInputElement;
      await userEvent.upload(input, fileOf('logo.png', 'image/png', 10));
      expect(input).toBeDisabled();
      expect(input).toHaveAccessibleDescription('Uploading…');
      finish({ url: 'https://cdn.example/logo.png' });
      await waitFor(() => expect(input).toBeEnabled());
    });

    it('shows the host’s message when the upload fails', async () => {
      const upload = vi.fn().mockRejectedValue(new Error('The image upload failed (500).'));
      const { onChange } = renderField({}, upload);
      await userEvent.upload(
        screen.getByLabelText(/Choose image/),
        fileOf('logo.png', 'image/png', 10),
      );
      expect(await screen.findByRole('alert')).toHaveTextContent('The image upload failed (500).');
      expect(onChange).not.toHaveBeenCalled();
    });

    it('applies a slow upload to the block as it is when the upload finishes', async () => {
      // Typing elsewhere in the block while a photo uploads must survive the upload landing.
      let finish!: (image: ImageRef) => void;
      const upload = vi.fn(() => new Promise<ImageRef>((resolve) => (finish = resolve)));
      const saved = vi.fn();
      function Letter() {
        const [letter, setLetter] = useState<{ body: string; photo?: ImageRef }>({ body: '' });
        const change = (next: typeof letter) => {
          saved(next);
          setLetter(next);
        };
        return (
          <>
            <label>
              Letter
              <textarea
                value={letter.body}
                onChange={(event) => change({ ...letter, body: event.target.value })}
              />
            </label>
            <ImageField
              label="Photo"
              value={letter.photo}
              onChange={(photo) => change({ ...letter, photo })}
            />
          </>
        );
      }
      renderInEditor(<Letter />, { context: { uploadImage: upload } });
      await userEvent.upload(
        screen.getByLabelText(/Choose image/),
        fileOf('me.png', 'image/png', 10),
      );
      await userEvent.type(screen.getByLabelText('Letter'), 'Hello');
      finish({ url: 'https://cdn.example/me.png' });
      await waitFor(() =>
        expect(saved).toHaveBeenLastCalledWith({
          body: 'Hello',
          photo: { url: 'https://cdn.example/me.png' },
        }),
      );
    });
  });

  it('applies nothing once the field has gone, rather than an issue that has moved on', async () => {
    let finish!: (image: ImageRef) => void;
    const upload = vi.fn(() => new Promise<ImageRef>((resolve) => (finish = resolve)));
    const onChange = vi.fn();
    const { unmount } = renderInEditor(
      <ImageField label="Photo" value={undefined} onChange={onChange} />,
      { context: { uploadImage: upload } },
    );
    await userEvent.upload(
      screen.getByLabelText(/Choose image/),
      fileOf('me.png', 'image/png', 10),
    );
    unmount();
    finish({ url: 'https://cdn.example/me.png' });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(onChange).not.toHaveBeenCalled();
  });

  describe('by address', () => {
    it('is what the field’s label names when the host stores no files', () => {
      renderField();
      expect(screen.queryByLabelText(/Choose image/)).toBeNull();
      expect(screen.getByLabelText(/^Photo/, { selector: 'input' })).toHaveAccessibleName(
        'Photo Image URL',
      );
      expect(screen.getByRole('group', { name: 'Photo' })).toBeInTheDocument();
    });

    it('applies an https address when the field is left', async () => {
      const { onChange } = renderField();
      await userEvent.type(screen.getByLabelText(/Image URL/), 'https://photos.example/a.jpg');
      expect(onChange).not.toHaveBeenCalled();
      await userEvent.tab();
      expect(onChange).toHaveBeenCalledWith({ url: 'https://photos.example/a.jpg' });
    });

    it('applies it on Enter too', async () => {
      const { onChange } = renderField();
      await userEvent.type(
        screen.getByLabelText(/Image URL/),
        '  https://photos.example/b.jpg {Enter}',
      );
      expect(onChange).toHaveBeenCalledWith({ url: 'https://photos.example/b.jpg' });
    });

    it('refuses an address that is not https, and says why', async () => {
      const { onChange } = renderField();
      const url = screen.getByLabelText(/Image URL/);
      await userEvent.type(url, 'http://photos.example/a.jpg');
      await userEvent.tab();
      expect(onChange).not.toHaveBeenCalled();
      expect(url).toHaveAttribute('aria-invalid', 'true');
      expect(url).toHaveAccessibleDescription('Enter an image address that starts with https://.');
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Enter an image address that starts with https://.',
      );
    });

    it('shows the image’s own address, and removes the image when it is cleared', async () => {
      const { onChange } = renderField({ value: { url: 'https://photos.example/a.jpg' } });
      const url = screen.getByLabelText(/Image URL/);
      expect(url).toHaveValue('https://photos.example/a.jpg');
      await userEvent.clear(url);
      await userEvent.tab();
      expect(onChange).toHaveBeenCalledWith(undefined);
    });

    it('does not show an address nobody should read, such as a data: URL', async () => {
      const { onChange } = renderField({ value: { url: 'data:image/png;base64,iVBORw0KGgo=' } });
      const url = screen.getByLabelText(/Image URL/);
      expect(url).toHaveValue('');
      await userEvent.click(url);
      await userEvent.tab();
      expect(onChange).not.toHaveBeenCalled();
    });

    it('follows an image chosen elsewhere', () => {
      const { rerender } = renderInEditor(
        <ImageField label="Photo" value={undefined} onChange={vi.fn()} />,
      );
      rerender(
        <ImageField
          label="Photo"
          value={{ url: 'https://photos.example/c.jpg' }}
          onChange={vi.fn()}
        />,
      );
      expect(
        within(screen.getByRole('group', { name: 'Photo' })).getByLabelText(/Image URL/),
      ).toHaveValue('https://photos.example/c.jpg');
    });
  });
});

describe('imageError', () => {
  it('accepts JPEG, PNG and WebP', () => {
    expect(imageError(fileOf('a.jpg', 'image/jpeg', 10))).toBeUndefined();
    expect(imageError(fileOf('a.png', 'image/png', 10))).toBeUndefined();
    expect(imageError(fileOf('a.webp', 'image/webp', 10))).toBeUndefined();
  });

  it('rejects anything else in a sentence a person can act on', () => {
    expect(imageError(fileOf('a.gif', 'image/gif', 10))).toBe('Use a JPEG, PNG, or WebP image.');
  });

  it('rejects an oversized file with the limit in the message', () => {
    expect(imageError(fileOf('a.png', 'image/png', MAX_IMAGE_BYTES + 1))).toBe(
      'Images must be 2 MB or smaller.',
    );
    expect(imageError(fileOf('a.png', 'image/png', 2 * 1024 * 1024), 1024 * 1024)).toBe(
      'Images must be 1 MB or smaller.',
    );
  });
});

describe('isHttpsUrl', () => {
  it('takes only absolute https addresses', () => {
    expect(isHttpsUrl('https://photos.example/a.jpg')).toBe(true);
    expect(isHttpsUrl('http://photos.example/a.jpg')).toBe(false);
    expect(isHttpsUrl('/images/a.jpg')).toBe(false);
    expect(isHttpsUrl('https://photos.example/a b.jpg')).toBe(false);
    expect(isHttpsUrl('javascript:alert(1)')).toBe(false);
  });
});
