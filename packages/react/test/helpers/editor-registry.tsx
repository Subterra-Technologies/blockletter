import { useState, type ComponentType } from 'react';
import {
  builtInBlocks,
  type BlockBase,
  type BuiltInBlock,
  type BuiltInBlockType,
} from '@subterra-technologies/blockletter';
import { vi, type Mock } from 'vitest';
import type { EditorContextValue } from '../../src/editor/context';
import type { BlockEditorProps, BlockIcon, EditorBlockDefinition } from '../../src/editor/types';
import { BUILT_IN_EDITORS } from '../../src/inspector/editors';
import { renderInEditor } from './render';

/** Stands in for the palette's icons, which the inspector never draws. */
const StubIcon: BlockIcon = () => null;

/** The built-in blocks registered the way the editor registers them, each with its form. */
export const EDITOR_DEFINITIONS: readonly EditorBlockDefinition[] = builtInBlocks.map(
  (definition) => ({
    ...definition,
    icon: StubIcon,
    Editor: BUILT_IN_EDITORS[definition.type as BuiltInBlockType],
  }),
);

/** The block the last `onChange` call carried. */
export function lastBlock<B>(spy: Mock): B {
  const calls = spy.mock.calls;
  const call = calls[calls.length - 1];
  if (!call) throw new Error('onChange was never called');
  return call[0] as B;
}

/**
 * Renders a block editor the way the inspector drives it: controlled, so every change is fed
 * back as the next `block` and several keystrokes add up. `onChange` sees each emitted block.
 */
export function renderEditor<B extends BuiltInBlock | BlockBase>(
  Editor: ComponentType<BlockEditorProps<B>>,
  block: NoInfer<B>,
  options: { readOnly?: boolean; context?: Partial<EditorContextValue> } = {},
) {
  const onChange = vi.fn();
  function Host() {
    const [current, setCurrent] = useState(block);
    return (
      <Editor
        block={current}
        readOnly={options.readOnly ?? false}
        onChange={(next) => {
          onChange(next);
          setCurrent(next);
        }}
      />
    );
  }
  const view = renderInEditor(<Host />, { context: options.context ?? {} });
  return { ...view, onChange, latest: () => lastBlock<B>(onChange) };
}
