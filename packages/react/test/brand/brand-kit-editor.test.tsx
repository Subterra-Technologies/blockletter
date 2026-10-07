import { useState } from 'react';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { BrandKit, ImageRef } from '@subterra-technologies/blockletter';
import { BrandKitEditor } from '../../src/brand/brand-kit-editor';
import type { EditorContextValue } from '../../src/editor/context';
import { TEST_BRAND } from '../helpers/fixtures';
import { renderInEditor } from '../helpers/render';

const fileOf = (name: string, type: string, bytes: number) =>
  new File([new Uint8Array(bytes)], name, { type });

/** The editor over a host that keeps the saved kit, as `NewsletterEditor` will. */
function renderKit(
  options: {
    value?: BrandKit;
    onSave?: (brand: BrandKit) => void | Promise<void>;
    readOnly?: boolean;
    context?: Partial<EditorContextValue>;
  } = {},
) {
  const onSave = vi.fn(options.onSave ?? (() => undefined));
  function Host() {
    const [brand, setBrand] = useState(options.value ?? TEST_BRAND);
    return (
      <BrandKitEditor
        value={brand}
        readOnly={options.readOnly}
        onSave={async (next) => {
          await onSave(next);
          setBrand(next);
        }}
      />
    );
  }
  const view = renderInEditor(<Host />, { context: options.context ?? {} });
  return { ...view, onSave };
}

describe('BrandKitEditor', () => {
  it('starts from the saved kit', () => {
    renderKit();
    expect(screen.getByRole('heading', { level: 2, name: 'Brand kit' })).toBeInTheDocument();
    expect(screen.getByLabelText('Organisation name')).toHaveValue(TEST_BRAND.name);
    expect(screen.getByLabelText('Address')).toHaveValue(TEST_BRAND.contact.address);
    expect(screen.getByLabelText('Phone')).toHaveValue(TEST_BRAND.contact.phone);
    expect(screen.getByLabelText('Email')).toHaveValue(TEST_BRAND.contact.email);
    expect(screen.getByLabelText('Website')).toHaveValue(TEST_BRAND.contact.website);
    expect(screen.getByLabelText('Ink hex value')).toHaveValue(TEST_BRAND.colors.ink);
    expect(screen.getByRole('combobox', { name: 'Heading font' })).toHaveTextContent('Georgia');
    expect(screen.getByText('None')).toBeInTheDocument();
  });

  it('shows no contrast warning for a readable kit, and has nothing to save', () => {
    renderKit();
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByRole('button', { name: 'Save brand kit' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Discard changes' })).toBeNull();
  });

  it('warns when ink and page are too close in contrast', async () => {
    renderKit();
    const ink = screen.getByLabelText('Ink hex value');
    await userEvent.clear(ink);
    await userEvent.type(ink, 'f8f3e9');
    await userEvent.tab();
    expect(ink).toHaveValue('#f8f3e9');
    expect(screen.getByRole('status')).toHaveTextContent(
      'Ink on page is 1.0:1, below the 4.5:1 minimum for body text. Pick a darker ink or a lighter page.',
    );
  });

  it('warns when no button label reads on the accent', async () => {
    renderKit();
    fireEvent.change(screen.getByLabelText('Accent colour picker'), {
      target: { value: '#7a7a7a' },
    });
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Button labels on the accent colour are 4.4:1, below the 4.5:1 minimum. Try a darker or lighter accent.',
    );
  });

  it('keeps the colour in use when a hex code cannot be read, and says why', async () => {
    renderKit();
    const page = screen.getByLabelText('Page hex value');
    await userEvent.clear(page);
    await userEvent.type(page, '#12');
    await userEvent.tab();
    expect(page).toHaveValue(TEST_BRAND.colors.page);
    expect(page).toHaveAccessibleDescription(
      `Behind the email, and the soft section background. “#12” is not a six-digit hex colour such as #1f2937, so the page colour stays ${TEST_BRAND.colors.page}.`,
    );
    expect(screen.getByRole('button', { name: 'Save brand kit' })).toBeDisabled();
  });

  it('saves the edited kit when asked, and says so', async () => {
    const { onSave } = renderKit();
    await userEvent.clear(screen.getByLabelText('Phone'));
    await userEvent.type(screen.getByLabelText('Phone'), '(555) 010-0123');
    await userEvent.click(screen.getByRole('button', { name: 'Save brand kit' }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave).toHaveBeenCalledWith({
      ...TEST_BRAND,
      contact: { ...TEST_BRAND.contact, phone: '(555) 010-0123' },
    });
    expect(await screen.findByText('Brand kit saved.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save brand kit' })).toBeDisabled();
    // Save has nothing left to do; focus does not fall to the page.
    expect(screen.getByRole('heading', { level: 2, name: 'Brand kit' })).toHaveFocus();
  });

  it('sets the heading font from its own control, showing each font in its face', async () => {
    const user = userEvent.setup();
    const { onSave } = renderKit();
    await user.click(screen.getByRole('combobox', { name: 'Heading font' }));
    const verdana = within(await screen.findByRole('listbox')).getByRole('option', {
      name: 'Verdana',
    });
    expect(verdana.querySelector('span[style]')).toHaveStyle({
      fontFamily: 'Verdana, Geneva, sans-serif',
    });
    await user.click(verdana);
    await user.click(screen.getByRole('button', { name: 'Save brand kit' }));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0]?.[0].fonts).toEqual({ heading: 'Verdana', body: 'Arial' });
  });

  it('discards unsaved changes', async () => {
    const { onSave } = renderKit();
    await userEvent.clear(screen.getByLabelText('Phone'));
    await userEvent.type(screen.getByLabelText('Phone'), '555');
    await userEvent.click(screen.getByRole('button', { name: 'Discard changes' }));
    expect(screen.getByLabelText('Phone')).toHaveValue(TEST_BRAND.contact.phone);
    expect(onSave).not.toHaveBeenCalled();
  });

  it('shows the host’s own message when saving fails, and keeps the edit', async () => {
    renderKit({
      onSave: () => Promise.reject(new Error('Brand kits are read-only on the free plan.')),
    });
    await userEvent.type(screen.getByLabelText('Address'), ', Suite 2');
    await userEvent.click(screen.getByRole('button', { name: 'Save brand kit' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Brand kits are read-only on the free plan.',
    );
    expect(screen.getByLabelText('Address')).toHaveValue(`${TEST_BRAND.contact.address}, Suite 2`);
  });

  it('checks the kit before saving: each problem by its field, the first one focused', async () => {
    const { onSave } = renderKit();
    await userEvent.clear(screen.getByLabelText('Organisation name'));
    await userEvent.clear(screen.getByLabelText('Email'));
    await userEvent.type(screen.getByLabelText('Email'), 'hello@');
    await userEvent.click(screen.getByRole('button', { name: 'Save brand kit' }));

    const name = screen.getByLabelText('Organisation name');
    expect(name).toHaveAttribute('aria-invalid', 'true');
    expect(name).toHaveAccessibleDescription(
      'The footer’s first line, and the header’s text when there is no logo. Enter the organisation name.',
    );
    expect(name).toHaveFocus();
    expect(screen.getByLabelText('Email')).toHaveAccessibleDescription(
      'Enter a valid email address.',
    );
    expect(onSave).not.toHaveBeenCalled();

    // Fixed, the message goes as soon as the field is right.
    await userEvent.type(name, 'Harbor Lane Readers');
    expect(name).not.toHaveAttribute('aria-invalid');
  });

  it('edits social links as rows, and needs an address on each before saving', async () => {
    const user = userEvent.setup();
    const { onSave } = renderKit();
    const social = screen.getByRole('list', { name: 'Social links' });
    expect(within(social).getAllByRole('listitem')).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: 'Add social link' }));
    await user.click(screen.getByRole('button', { name: 'Save brand kit' }));
    const links = screen.getAllByRole('textbox', { name: 'Link' });
    expect(links[1]).toHaveAccessibleDescription('Add the link.');
    expect(onSave).not.toHaveBeenCalled();

    await user.type(links[1] as HTMLElement, 'https://facebook.example/club');
    await user.click(screen.getByRole('button', { name: 'Save brand kit' }));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0]?.[0].social).toEqual([
      ...TEST_BRAND.social,
      { network: 'facebook', url: 'https://facebook.example/club' },
    ]);
  });

  it('takes a logo by its address, saved with the rest of the kit', async () => {
    const { onSave } = renderKit();
    const logo = screen.getByRole('group', { name: 'Logo' });
    await userEvent.type(within(logo).getByLabelText(/Image URL/), 'https://cdn.example/logo.png');
    await userEvent.tab();
    expect(onSave).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Save brand kit' }));
    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith({
        ...TEST_BRAND,
        logo: { url: 'https://cdn.example/logo.png' },
      }),
    );
  });

  it('uploads a logo through the host, then saves it with the kit', async () => {
    const uploadImage = vi
      .fn<(file: File) => Promise<ImageRef>>()
      .mockResolvedValue({ url: 'https://cdn.example/uploaded.png', assetId: 'logo-1' });
    const { onSave } = renderKit({ context: { uploadImage } });
    await userEvent.upload(
      screen.getByLabelText(/Choose image/),
      fileOf('logo.png', 'image/png', 10),
    );
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Save brand kit' })).toBeEnabled(),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Save brand kit' }));
    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith({
        ...TEST_BRAND,
        logo: { url: 'https://cdn.example/uploaded.png', assetId: 'logo-1' },
      }),
    );
  });

  it('rejects a wrong-type logo without uploading it', async () => {
    const uploadImage = vi.fn();
    renderKit({ context: { uploadImage } });
    fireEvent.change(screen.getByLabelText(/Choose image/), {
      target: { files: [fileOf('logo.gif', 'image/gif', 10)] },
    });
    expect(await screen.findByText('Use a JPEG, PNG, or WebP image.')).toBeInTheDocument();
    expect(uploadImage).not.toHaveBeenCalled();
  });

  it('offers Replace and Remove once a logo exists, and removes it', async () => {
    const { onSave } = renderKit({
      value: { ...TEST_BRAND, logo: { url: 'https://cdn.example/logo.png' } },
      context: { uploadImage: vi.fn() },
    });
    expect(screen.getByLabelText(/Replace image/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Remove image' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save brand kit' }));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith(TEST_BRAND));
  });

  it('follows the saved kit while nothing is edited here', () => {
    const { rerender } = renderInEditor(<BrandKitEditor value={TEST_BRAND} onSave={vi.fn()} />);
    rerender(<BrandKitEditor value={{ ...TEST_BRAND, name: 'Harbor Readers' }} onSave={vi.fn()} />);
    expect(screen.getByLabelText('Organisation name')).toHaveValue('Harbor Readers');
  });

  it('shows everything and changes nothing when read-only', () => {
    renderKit({ readOnly: true });
    expect(screen.getByLabelText('Organisation name')).toBeDisabled();
    expect(screen.getByLabelText('Ink hex value')).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Save brand kit' })).toBeNull();
  });
});
