import { act, screen, within } from '@testing-library/react';
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
  const body = () => screen.getByRole('textbox', { name: 'Text' });

  it('labels the heading optional and gives the body a formatting toolbar', () => {
    renderEditor(TextEditor, testBlock('text'));
    expect(screen.getByLabelText('Heading (optional)')).toHaveValue('');
    expect(body()).toHaveAttribute('aria-multiline', 'true');
    expect(screen.getByRole('toolbar', { name: 'Text formatting' })).toBeInTheDocument();
  });

  it('keeps a typed heading and drops it again when it is cleared', async () => {
    const { latest } = renderEditor(TextEditor, testBlock('text', { heading: 'Notes' }));
    await userEvent.clear(screen.getByLabelText('Heading (optional)'));
    expect(latest()).not.toHaveProperty('heading');
  });

  it('shows a plain body as its paragraphs, and leaves it plain while it is only looked at', async () => {
    const user = userEvent.setup();
    const { onChange } = renderEditor(
      TextEditor,
      testBlock('text', { body: 'Use <b> for bold.\n\nSecond paragraph.' }),
    );
    const paragraphs = body().querySelectorAll('p');
    expect([...paragraphs].map((paragraph) => paragraph.textContent)).toEqual([
      'Use <b> for bold.',
      'Second paragraph.',
    ]);
    expect(body().querySelector('b')).toBeNull();
    await user.click(body());
    await user.click(screen.getByRole('button', { name: 'Bold' }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('turns a plain body into HTML the first time it is edited', async () => {
    const user = userEvent.setup();
    const block = testBlock('text', { body: 'Doors open at eight.\n\nBring a friend.' });
    const { latest } = renderEditor(TextEditor, block);
    act(() => body().focus());
    const second = body().querySelectorAll('p')[1]?.firstChild;
    if (!second) throw new Error('The second paragraph has text');
    act(() => {
      document.getSelection()?.setBaseAndExtent(second, 0, second, 5);
    });
    await user.click(screen.getByRole('button', { name: 'Bold' }));
    expect(latest()).toEqual({
      ...block,
      format: 'html',
      body: '<p>Doors open at eight.</p><p><strong>Bring</strong> a friend.</p>',
    });
  });

  it('edits a body stored as HTML in place, cleaned the way the renderer cleans it', async () => {
    const user = userEvent.setup();
    const { latest } = renderEditor(
      TextEditor,
      testBlock('text', {
        format: 'html',
        body: '<p>Hello <strong>readers</strong></p><script>alert(1)</script><p><a href="javascript:alert(1)">x</a></p>',
      }),
    );
    expect(within(body()).getByText('readers').tagName).toBe('STRONG');
    expect(body().querySelector('script')).toBeNull();
    expect(body().innerHTML).not.toContain('javascript:');
    await user.click(body());
    await user.keyboard('!');
    expect(latest().format).toBe('html');
    expect(latest().body).toContain('<strong>readers</strong>');
    expect(latest().body).not.toContain('script');
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
