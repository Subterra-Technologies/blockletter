import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, onTestFinished, vi } from 'vitest';
import {
  createDocument,
  defineBlock,
  renderEmail,
  type BlockBase,
  type NewsletterDocument,
} from '@subterra-technologies/blockletter';
import type { EditorBlockDefinition } from '../../src/editor/types';
import { PreviewPane } from '../../src/preview/preview-pane';
import { EDITOR_DEFINITIONS } from '../helpers/editor-registry';
import { TEST_BRAND, testBlock, testDocument } from '../helpers/fixtures';
import { renderInEditor } from '../helpers/render';

/**
 * The width toggle, the subject and preheader line, the sandbox attributes (a security boundary,
 * kept exactly), the warnings, and that what it shows is the core renderer's email.
 */

const DOCUMENT = testDocument([
  testBlock('header', { title: 'Book club news', issueLabel: 'November 2026' }),
  testBlock('text', { heading: 'Hello', body: 'Twelve books for long nights.' }),
  testBlock('footer'),
]);

const frame = () => screen.getByTitle('Email preview') as HTMLIFrameElement;

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('PreviewPane', () => {
  it('shows the email in an iframe with the exact sandbox attributes', () => {
    renderInEditor(<PreviewPane document={DOCUMENT} />, {
      context: { definitions: EDITOR_DEFINITIONS },
    });
    expect(frame().tagName).toBe('IFRAME');
    expect(frame()).toHaveAttribute('sandbox', '');
    expect(frame()).toHaveAttribute('referrerpolicy', 'no-referrer');
  });

  it('renders in the browser with the editor’s brand, definitions and render options', () => {
    const renderOptions = {
      baseUrl: 'https://bookclub.example',
      unsubscribeUrl: '{{unsubscribe}}',
    };
    renderInEditor(<PreviewPane document={DOCUMENT} />, {
      context: { definitions: EDITOR_DEFINITIONS, renderOptions },
    });
    const expected = renderEmail(DOCUMENT, {
      ...renderOptions,
      brand: TEST_BRAND,
      definitions: EDITOR_DEFINITIONS,
    }).html;
    expect(frame()).toHaveAttribute('srcdoc', expected);
    expect(expected).toContain('Twelve books for long nights.');
    expect(expected).toContain(TEST_BRAND.contact.address);
  });

  it('renders a host’s own block through its definition', () => {
    interface ShoutBlock extends BlockBase<'shout'> {
      text: string;
    }
    const shout = {
      ...defineBlock<ShoutBlock>({
        type: 'shout',
        label: 'Shout',
        description: 'A line in capitals.',
        group: 'extras',
        create: () => ({ text: '' }),
        validate: () => [],
        render: (block, ctx) =>
          ctx.section(block, `<p>${ctx.escape(block.text.toUpperCase())}</p>`),
      }),
      icon: () => null,
      Editor: () => null,
    } as unknown as EditorBlockDefinition;
    const doc = createDocument<BlockBase>({
      subject: 'Shouting',
      blocks: [{ id: 'shout-1', type: 'shout', hidden: false, text: 'quiet please' } as BlockBase],
    });
    renderInEditor(<PreviewPane document={doc} />, {
      context: { definitions: [...EDITOR_DEFINITIONS, shout] },
    });
    expect(frame().getAttribute('srcdoc')).toContain('QUIET PLEASE');
  });

  it('renders the built-in blocks when it sits outside an editor', () => {
    renderInEditor(<PreviewPane document={DOCUMENT} />);
    expect(frame().getAttribute('srcdoc')).toContain('Twelve books for long nights.');
  });

  it('shows the subject and preheader, and says when there is no subject yet', () => {
    const { rerender } = renderInEditor(
      <PreviewPane document={{ ...DOCUMENT, subject: '', preheader: '' }} />,
    );
    expect(screen.getByText('No subject yet')).toBeInTheDocument();
    rerender(<PreviewPane document={DOCUMENT} />);
    expect(screen.getByText(DOCUMENT.subject)).toBeInTheDocument();
    expect(screen.getByText(DOCUMENT.preheader)).toBeInTheDocument();
  });

  it('follows the document as it changes', () => {
    const { rerender } = renderInEditor(<PreviewPane document={DOCUMENT} />);
    const changed: NewsletterDocument = {
      ...DOCUMENT,
      blocks: DOCUMENT.blocks.map((block) =>
        block.type === 'text' ? { ...block, body: 'A brand new paragraph.' } : block,
      ),
    };
    rerender(<PreviewPane document={changed} />);
    expect(frame().getAttribute('srcdoc')).toContain('A brand new paragraph.');
  });

  it('starts at phone width when asked to', () => {
    renderInEditor(<PreviewPane document={DOCUMENT} defaultWidth="phone" />);
    expect(screen.getByRole('button', { name: 'Phone · 375px' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(frame()).toHaveStyle({ width: '375px' });
  });

  it('toggles between the desktop and phone widths', async () => {
    renderInEditor(<PreviewPane document={DOCUMENT} />);
    const desktop = screen.getByRole('button', { name: 'Desktop · 600px' });
    const phone = screen.getByRole('button', { name: 'Phone · 375px' });
    expect(screen.getByRole('group', { name: 'Preview width' })).toBeInTheDocument();
    expect(desktop).toHaveAttribute('aria-pressed', 'true');
    expect(phone).toHaveAttribute('aria-pressed', 'false');
    expect(frame()).toHaveStyle({ width: '600px' });

    await userEvent.click(phone);
    expect(phone).toHaveAttribute('aria-pressed', 'true');
    expect(desktop).toHaveAttribute('aria-pressed', 'false');
    expect(frame()).toHaveStyle({ width: '375px' });
  });

  it('lists what to check before sending, folded until opened', async () => {
    renderInEditor(<PreviewPane document={DOCUMENT} />, {
      context: { definitions: EDITOR_DEFINITIONS },
    });
    const { warnings } = renderEmail(DOCUMENT, { brand: TEST_BRAND });
    expect(warnings.length).toBeGreaterThan(0);
    const summary = screen.getByText(
      warnings.length === 1 ? '1 thing to check' : `${warnings.length} things to check`,
    );
    const details = summary.closest('details') as HTMLDetailsElement;
    expect(details.open).toBe(false);
    await userEvent.click(summary);
    expect(details.open).toBe(true);
    expect(screen.getByText(/There is no unsubscribe link/)).toBeVisible();
  });

  it('lists nothing once the email has no problems', () => {
    const doc = testDocument([testBlock('text', { body: 'Hello.' }), testBlock('footer')]);
    renderInEditor(<PreviewPane document={doc} />, {
      context: {
        definitions: EDITOR_DEFINITIONS,
        renderOptions: { unsubscribeUrl: '{{unsubscribe}}', baseUrl: 'https://bookclub.example' },
      },
    });
    expect(screen.queryByText(/to check$/)).toBeNull();
  });

  it('opens the email in a new tab from a Blob address that cannot run scripts, then lets it go', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout'] });
    const blobs: Blob[] = [];
    const createObjectURL = vi.fn((blob: Blob) => {
      blobs.push(blob);
      return 'blob:https://editor.example/preview-1';
    });
    const revokeObjectURL = vi.fn();
    // jsdom has no Blob URLs of its own, so they are stood in for, and put back after.
    const original = { createObjectURL: URL.createObjectURL, revokeObjectURL: URL.revokeObjectURL };
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    onTestFinished(() => {
      Object.assign(URL, original);
    });
    const open = vi.spyOn(window, 'open').mockReturnValue(null);

    renderInEditor(<PreviewPane document={DOCUMENT} />);
    screen.getByRole('button', { name: 'Open in new tab' }).click();

    expect(open).toHaveBeenCalledWith(
      'blob:https://editor.example/preview-1',
      '_blank',
      'noopener',
    );
    const html = await (blobs[0] as Blob).text();
    expect(html).toContain('Twelve books for long nights.');
    expect(html).toMatch(
      /<head[^>]*><meta http-equiv="Content-Security-Policy" content="script-src 'none'/,
    );
    // `noopener` returns no window, so the address is kept until the tab has surely read it.
    expect(revokeObjectURL).not.toHaveBeenCalled();
    vi.advanceTimersByTime(60_000);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:https://editor.example/preview-1');
  });
});
