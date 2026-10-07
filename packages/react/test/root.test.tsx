import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BlockletterRoot } from '../src';

function rootOf(element: HTMLElement): HTMLElement {
  const root = element.closest<HTMLElement>('.bl-root');
  if (!root) throw new Error('Not inside a .bl-root');
  return root;
}

describe('BlockletterRoot', () => {
  it('renders the .bl-root its stylesheet keys off, around its children', () => {
    render(
      <BlockletterRoot>
        <p>Editor</p>
      </BlockletterRoot>,
    );
    const root = rootOf(screen.getByText('Editor'));
    expect(root.tagName).toBe('DIV');
    expect(root).not.toHaveAttribute('data-theme');
  });

  it.each(['light', 'dark'] as const)('marks an explicit %s theme', (theme) => {
    render(
      <BlockletterRoot theme={theme}>
        <p>Editor</p>
      </BlockletterRoot>,
    );
    expect(rootOf(screen.getByText('Editor'))).toHaveAttribute('data-theme', theme);
  });

  it('keeps the host’s class and attributes', () => {
    render(
      <BlockletterRoot className="host-frame bl:h-full" id="newsletter" aria-label="Newsletter">
        <p>Editor</p>
      </BlockletterRoot>,
    );
    const root = rootOf(screen.getByText('Editor'));
    expect(root).toHaveClass('bl-root', 'host-frame', 'bl:h-full');
    expect(root).toHaveAttribute('id', 'newsletter');
    expect(root).toHaveAttribute('aria-label', 'Newsletter');
  });

  it('ends with the empty container its overlays portal into', () => {
    render(
      <BlockletterRoot>
        <p>Editor</p>
      </BlockletterRoot>,
    );
    const root = rootOf(screen.getByText('Editor'));
    const container = root.lastElementChild;
    expect(container).toHaveAttribute('data-bl-portal');
    expect(container).toBeEmptyDOMElement();
    expect(root.querySelectorAll('[data-bl-portal]')).toHaveLength(1);
  });
});
