import { useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import {
  createDocument,
  type BlockBase,
  type NewsletterDocument,
} from '@subterra-technologies/blockletter';
// The public entry, the way a host imports the editor.
import { NewsletterEditor, type NewsletterEditorProps } from '../../src';
import { TEST_BRAND, TEST_SOURCES, testBlock } from './fixtures';

export const HEADER = testBlock('header', {
  title: 'Book club news',
  issueLabel: 'September 2026',
});
export const TEXT = testBlock('text', { body: 'Join us Friday at nine.' });
export const DIVIDER = testBlock('divider');
export const EVENTS = testBlock('event_tiles', { source: 'events', items: [] });
export const FOOTER = testBlock('footer');

/** A month already over, so the period can be changed: an issue covers up to today. */
export const SEPTEMBER = { start: '2026-09-01', end: '2026-09-30', lookaheadEnd: '2026-11-10' };

export const issue = (blocks: BlockBase[]): NewsletterDocument<BlockBase> =>
  createDocument<BlockBase>({
    subject: 'September at the book club',
    preheader: 'Readings and a sale',
    period: SEPTEMBER,
    blocks,
  });

type HostProps = Partial<Omit<NewsletterEditorProps<BlockBase>, 'value' | 'onChange'>>;

/** The editor over a document the host keeps in state, every edit seen by `onChange`. */
export function renderEditor(initial: NewsletterDocument<BlockBase>, props: HostProps = {}) {
  const onChange = vi.fn<(next: NewsletterDocument<BlockBase>) => void>();
  function Host() {
    const [value, setValue] = useState(initial);
    return (
      <NewsletterEditor<BlockBase>
        value={value}
        onChange={(next) => {
          onChange(next);
          setValue(next);
        }}
        brand={TEST_BRAND}
        sources={[TEST_SOURCES.events]}
        {...props}
      />
    );
  }
  const user = userEvent.setup();
  const view = render(<Host />);
  const latest = (): NewsletterDocument<BlockBase> => {
    const call = onChange.mock.calls.at(-1);
    if (!call) throw new Error('onChange was never called');
    return call[0];
  };
  const types = () => latest().blocks.map((block) => block.type);
  return { ...view, user, onChange, latest, types };
}

export const canvas = () => within(screen.getByRole('tablist', { name: 'Canvas' }));
export const blockTab = (name: string) => canvas().getByRole('tab', { name });
