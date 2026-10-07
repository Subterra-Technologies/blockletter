import type { ReactElement } from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { EditorProvider, type EditorContextValue } from '../../src/editor/context';
import { BlockletterRoot } from '../../src/root';
import { TEST_BRAND } from './fixtures';

/**
 * Renders a part the way the editor mounts it: inside a `BlockletterRoot` (portals, confirm,
 * toasts, tooltips) and an `EditorProvider` carrying the test brand plus anything `context`
 * overrides — definitions, sources, an `uploadImage` mock, `readOnly`.
 */
export function renderInEditor(
  ui: ReactElement,
  options: { context?: Partial<EditorContextValue> } & Omit<RenderOptions, 'wrapper'> = {},
) {
  const { context = {}, ...rest } = options;
  return render(ui, {
    ...rest,
    wrapper: ({ children }) => (
      <BlockletterRoot>
        <EditorProvider value={{ brand: TEST_BRAND, ...context }}>{children}</EditorProvider>
      </BlockletterRoot>
    ),
  });
}
