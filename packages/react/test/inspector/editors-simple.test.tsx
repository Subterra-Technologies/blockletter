import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { CalloutEditor, FooterEditor, HeaderEditor, TextEditor } from '../../src/inspector/editors';
import { renderEditor } from '../helpers/editor-registry';
import { TEST_BRAND, testBlock } from '../helpers/fixtures';

describe('HeaderEditor', () => {
  const header = testBlock('header', { title: 'Book club news', issueLabel: 'November 2026' });

  it('shows the three fields, with the brand name standing in for blank logo text', () => {
    renderEditor(HeaderEditor, header);
    expect(screen.getByLabelText('Title')).toHaveValue('Book club news');
    expect(screen.getByLabelText('Issue label')).toHaveValue('November 2026');
    const logo = screen.getByLabelText('Logo text');
    expect(logo).toHaveValue('');
    expect(logo).toHaveAttribute('placeholder', TEST_BRAND.name);
    expect(logo).toHaveAccessibleDescription(/Leave it blank to use the organisation’s name\./);
  });

  it('emits the merged block when a field changes', async () => {
    const { latest } = renderEditor(HeaderEditor, header);
    await userEvent.type(screen.getByLabelText('Title'), '!');
    expect(latest()).toEqual({ ...header, title: 'Book club news!' });
  });

  it('disables every field when read-only', () => {
    renderEditor(HeaderEditor, header, { readOnly: true });
    expect(screen.getByLabelText('Title')).toBeDisabled();
  });
});

describe('CalloutEditor', () => {
  const callout = testBlock('callout');

  it('shows the heading, the text and the two button fields', () => {
    renderEditor(CalloutEditor, callout);
    expect(screen.getByLabelText('Heading')).toHaveValue(callout.heading);
    expect(screen.getByLabelText('Text')).toHaveValue(callout.body);
    expect(screen.getByLabelText('Button label')).toHaveValue(callout.ctaLabel);
    expect(screen.getByLabelText('Button link')).toHaveAttribute('placeholder', '/contact');
  });

  it('emits the merged block when the button link changes', async () => {
    const { latest } = renderEditor(CalloutEditor, callout);
    await userEvent.type(screen.getByLabelText('Button link'), '/news');
    expect(latest()).toEqual({ ...callout, ctaUrl: '/news' });
  });
});

describe('TextEditor', () => {
  it('labels the heading optional and describes the body with the paragraph helper', () => {
    renderEditor(TextEditor, testBlock('text'));
    expect(screen.getByLabelText('Heading (optional)')).toHaveValue('');
    expect(screen.getByLabelText('Text')).toHaveAccessibleDescription(
      'Leave a blank line between paragraphs.',
    );
  });

  it('keeps a typed heading and drops it again when it is cleared', async () => {
    const { latest } = renderEditor(TextEditor, testBlock('text', { heading: 'Notes' }));
    await userEvent.clear(screen.getByLabelText('Heading (optional)'));
    expect(latest()).not.toHaveProperty('heading');
  });

  it('shows formatted text as it reads, cleaned, rather than as markup to edit', () => {
    renderEditor(
      TextEditor,
      testBlock('text', {
        format: 'html',
        body: '<p>Hello <strong>readers</strong></p><script>alert(1)</script><a href="javascript:alert(1)">x</a>',
      }),
    );
    expect(screen.queryByRole('textbox', { name: 'Text' })).toBeNull();
    const preview = screen.getByRole('group', { name: 'Text' });
    expect(within(preview).getByText('readers').tagName).toBe('STRONG');
    expect(preview.querySelector('script')).toBeNull();
    expect(preview.innerHTML).not.toContain('javascript:');
    expect(preview).toHaveAccessibleDescription(
      'This text has formatting this editor can’t change. Convert it to plain text to edit it here.',
    );
  });

  it('converts formatted text to plain text once asked, and puts focus in it', async () => {
    const user = userEvent.setup();
    const { latest } = renderEditor(
      TextEditor,
      testBlock('text', {
        format: 'html',
        body: '<p>Hello <strong>readers</strong>.</p><p>See you soon.</p>',
      }),
    );
    await user.click(screen.getByRole('button', { name: 'Convert to plain text' }));
    const dialog = await screen.findByRole('alertdialog', {
      name: 'Convert this text to plain text?',
    });
    await user.click(within(dialog).getByRole('button', { name: 'Convert to plain text' }));

    expect(latest()).not.toHaveProperty('format');
    expect(latest().body).toBe('Hello readers.\n\nSee you soon.');
    const body = await screen.findByRole('textbox', { name: 'Text' });
    await waitFor(() => expect(body).toHaveFocus());
  });

  it('leaves formatted text alone when the conversion is cancelled', async () => {
    const user = userEvent.setup();
    const { onChange } = renderEditor(
      TextEditor,
      testBlock('text', { format: 'html', body: '<p>Hi</p>' }),
    );
    await user.click(screen.getByRole('button', { name: 'Convert to plain text' }));
    await user.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Cancel' }),
    );
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('FooterEditor', () => {
  const footer = testBlock('footer');

  it('shows the contact fields, each blank one naming the brand kit value it falls back to', () => {
    renderEditor(FooterEditor, footer);
    expect(screen.getByLabelText('Mailing address')).toHaveAttribute(
      'placeholder',
      `Uses the brand kit: ${TEST_BRAND.contact.address}`,
    );
    expect(screen.getByLabelText('Phone')).toHaveAttribute(
      'placeholder',
      `Uses the brand kit: ${TEST_BRAND.contact.phone}`,
    );
    expect(screen.getByLabelText('Email')).toHaveAttribute(
      'placeholder',
      `Uses the brand kit: ${TEST_BRAND.contact.email}`,
    );
    expect(
      screen.getByText(
        'Blank contact fields use the brand kit’s, so one brand kit change updates every issue.',
      ),
    ).toBeInTheDocument();
  });

  it('says the brand kit’s social links are used while the footer has none', () => {
    renderEditor(FooterEditor, footer);
    expect(screen.getByText('None here, so the brand kit’s link is used.')).toBeInTheDocument();
  });

  it('adds a social link row: a network and its address', async () => {
    const user = userEvent.setup();
    const { latest } = renderEditor(FooterEditor, footer);
    await user.click(screen.getByRole('button', { name: 'Add social link' }));
    expect(latest().social).toEqual([{ network: 'facebook', url: '' }]);

    const network = screen.getByRole('combobox', { name: 'Network' });
    expect(network).toHaveFocus();
    await user.click(network);
    await user.click(
      within(await screen.findByRole('listbox')).getByRole('option', { name: 'Instagram' }),
    );
    await user.type(
      screen.getByRole('textbox', { name: 'Link' }),
      'https://instagram.example/club',
    );
    expect(latest().social).toEqual([
      { network: 'instagram', url: 'https://instagram.example/club' },
    ]);
  });

  it('removes a social link', async () => {
    const { latest } = renderEditor(FooterEditor, {
      ...footer,
      social: [
        { network: 'facebook', url: 'https://facebook.example/club' },
        { network: 'x', url: 'https://x.example/club' },
      ],
    });
    await userEvent.click(screen.getByRole('button', { name: 'Remove social link 1' }));
    expect(latest().social).toEqual([{ network: 'x', url: 'https://x.example/club' }]);
  });

  it('shows the empty sentence when there are no footer links, and adds one at the root path', async () => {
    const { latest } = renderEditor(FooterEditor, footer);
    expect(screen.getByText('No footer links yet.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Add link' }));
    expect(latest().links).toEqual([{ label: '', url: '/' }]);
  });

  it('shows one labelled row per link and removes the one that is clicked', async () => {
    const { latest } = renderEditor(FooterEditor, {
      ...footer,
      links: [
        { label: 'Events', url: '/events' },
        { label: 'Directory', url: '/directory' },
      ],
    });
    expect(screen.getAllByLabelText('Label')).toHaveLength(2);
    await userEvent.click(screen.getByRole('button', { name: 'Remove link 1' }));
    expect(latest().links).toEqual([{ label: 'Directory', url: '/directory' }]);
  });

  it('emits the merged block when a link label changes', async () => {
    const { latest } = renderEditor(FooterEditor, {
      ...footer,
      links: [{ label: 'Events', url: '/events' }],
    });
    await userEvent.type(screen.getByLabelText('Label'), 'X');
    expect(latest().links[0]?.label).toBe('EventsX');
  });

  it('edits the compliance text, which the opt-out links follow', async () => {
    const { latest } = renderEditor(FooterEditor, footer);
    const compliance = screen.getByLabelText('Compliance text');
    expect(compliance).toHaveValue(footer.complianceText);
    expect(compliance).toHaveAccessibleDescription(
      'Why readers get this email. The preference and unsubscribe links follow it.',
    );
    await userEvent.clear(compliance);
    await userEvent.type(compliance, 'You joined the book club.');
    expect(latest().complianceText).toBe('You joined the book club.');
  });
});
