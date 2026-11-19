import type { ComponentType } from 'react';
import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { BuiltInBlock } from '@subterra-technologies/blockletter';
import { enMessages } from '../../src';
import type { BlockEditorProps } from '../../src/editor/types';
import {
  ArticleEditor,
  CalloutEditor,
  ColumnsEditor,
  ImageTextEditor,
  LetterEditor,
  NameListEditor,
  PostListEditor,
  QuoteEditor,
  SponsorsEditor,
  TextEditor,
} from '../../src/inspector/editors';
import { renderEditor } from '../helpers/editor-registry';
import { testBlock } from '../helpers/fixtures';

/** Every free-text field the email reads Markdown in is written in a `MarkdownField`. */

const { blocks, fields } = enMessages;

type Case = [
  name: string,
  Editor: ComponentType<BlockEditorProps<BuiltInBlock>>,
  block: BuiltInBlock,
  label: string,
  field: (block: BuiltInBlock) => string,
];

const editor = <B extends BuiltInBlock>(Editor: ComponentType<BlockEditorProps<B>>) =>
  Editor as unknown as ComponentType<BlockEditorProps<BuiltInBlock>>;

const CASES: Case[] = [
  [
    'letter',
    editor(LetterEditor),
    testBlock('letter', { body: 'Dear readers' }),
    blocks.letter.letter,
    (block) => (block as Extract<BuiltInBlock, { type: 'letter' }>).body,
  ],
  [
    'article',
    editor(ArticleEditor),
    testBlock('article', { body: 'Dear readers' }),
    blocks.article.article,
    (block) => (block as Extract<BuiltInBlock, { type: 'article' }>).body,
  ],
  [
    'callout',
    editor(CalloutEditor),
    testBlock('callout', { body: 'Dear readers' }),
    fields.text,
    (block) => (block as Extract<BuiltInBlock, { type: 'callout' }>).body,
  ],
  [
    'image and text',
    editor(ImageTextEditor),
    testBlock('image_text', { body: 'Dear readers' }),
    fields.text,
    (block) => (block as Extract<BuiltInBlock, { type: 'image_text' }>).body,
  ],
  [
    'pull quote',
    editor(QuoteEditor),
    testBlock('quote', { quote: 'Dear readers' }),
    blocks.quote.quote,
    (block) => (block as Extract<BuiltInBlock, { type: 'quote' }>).quote,
  ],
  [
    'name list introduction',
    editor(NameListEditor),
    testBlock('name_list', { intro: 'Dear readers' }),
    blocks.name_list.intro,
    (block) => (block as Extract<BuiltInBlock, { type: 'name_list' }>).intro,
  ],
  [
    'sponsor thank-you',
    editor(SponsorsEditor),
    testBlock('sponsors', { items: [{ name: 'Quiet Press', message: 'Dear readers' }] }),
    blocks.sponsors.message,
    (block) => (block as Extract<BuiltInBlock, { type: 'sponsors' }>).items[0]?.message ?? '',
  ],
  [
    'column',
    editor(ColumnsEditor),
    testBlock('columns', { columns: [{ body: 'Dear readers' }, { body: 'Second' }] }),
    fields.text,
    (block) => (block as Extract<BuiltInBlock, { type: 'columns' }>).columns[0]?.body ?? '',
  ],
];

describe('the built-in editors', () => {
  it.each(CASES)(
    'write the %s in a field with a formatting toolbar',
    async (_, Editor, block, label, field) => {
      const user = userEvent.setup();
      const { latest } = renderEditor(Editor, block);
      const toolbar = screen.getAllByRole('toolbar', { name: `${label} formatting` })[0]!;
      const text = screen.getAllByLabelText(label, { selector: 'textarea' })[0]!;
      expect(document.getElementById(`${text.id}-help`)).toHaveTextContent(
        enMessages.markdown.hint,
      );
      act(() => {
        text.focus();
        (text as HTMLTextAreaElement).setSelectionRange(5, 12);
      });
      await user.click(within(toolbar).getByRole('button', { name: 'Bold' }));
      expect(field(latest())).toBe('Dear **readers**');
    },
  );

  it('leave a post’s excerpt, which comes from a feed and is drawn as text, a plain text area', () => {
    renderEditor(
      editor(PostListEditor),
      testBlock('post_list', { items: [{ title: 'News', excerpt: 'Short', url: '/news' }] }),
    );
    expect(screen.getByLabelText(blocks.post_list.excerpt)).toHaveValue('Short');
    expect(screen.queryByRole('toolbar')).toBeNull();
  });
});

describe('a text block whose plain body holds Markdown', () => {
  const body = () => screen.getByRole('textbox', { name: 'Text' });

  it('shows the formatting the email gives it in the rich-text field', () => {
    renderEditor(
      TextEditor,
      testBlock('text', {
        body: 'Hello **readers**, see [the list](https://example.org).\n\n- one',
      }),
    );
    expect(body().querySelector('strong')?.textContent).toBe('readers');
    expect(body().querySelector('a')?.getAttribute('href')).toBe('https://example.org');
    expect(body().querySelectorAll('li')).toHaveLength(1);
    expect(body().textContent).not.toContain('**');
  });

  it('keeps that formatting when it first becomes HTML', async () => {
    const user = userEvent.setup();
    const block = testBlock('text', { body: 'Hello **readers**.\n\nBring a friend.' });
    const { latest } = renderEditor(TextEditor, block);
    act(() => body().focus());
    const second = body().querySelectorAll('p')[1]?.firstChild;
    if (!second) throw new Error('The second paragraph has text');
    act(() => {
      document.getSelection()?.setBaseAndExtent(second, 0, second, 5);
    });
    await user.click(screen.getByRole('button', { name: 'Italic' }));
    expect(latest()).toEqual({
      ...block,
      format: 'html',
      body: '<p>Hello <strong>readers</strong>.</p><p><em>Bring</em> a friend.</p>',
    });
  });

  it('warns that a heading is formatting the rich-text field cannot keep', () => {
    renderEditor(TextEditor, testBlock('text', { body: '## Agenda\n\nItems' }));
    expect(screen.getByText(enMessages.formatting.unsupported)).toBeInTheDocument();
  });
});
