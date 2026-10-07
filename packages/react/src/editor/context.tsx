import { createContext, useContext, type ReactNode } from 'react';
import {
  DEFAULT_BRAND,
  getDefinition,
  type BrandKit,
  type DataSource,
  type ImageRef,
  type IssuePeriod,
  type RenderOptions,
} from '@subterra-technologies/blockletter';
import type { EditorBlockDefinition } from './types';

/**
 * What every part of the editor may need from the host, provided once by `NewsletterEditor`
 * (or by a host composing the parts itself). Each part reads only what it uses; a part rendered
 * with no provider gets the permissive defaults below rather than an error.
 */
export interface EditorContextValue {
  /** Every block the editor knows, built-ins first. */
  definitions: readonly EditorBlockDefinition[];
  /** Data sources the host registered; list blocks naming one get Refresh and a picker. */
  sources: readonly DataSource[];
  /** Stores a file and returns where it lives. Absent: image fields take a URL instead. */
  uploadImage?: (file: File) => Promise<ImageRef>;
  brand: BrandKit;
  /** The issue's dates, handed to data sources. */
  period?: IssuePeriod;
  readOnly: boolean;
  /** Passed to the core renderer for the preview and for blocks drawn from their HTML. */
  renderOptions: RenderOptions;
}

const DEFAULTS: EditorContextValue = {
  definitions: [],
  sources: [],
  brand: DEFAULT_BRAND,
  readOnly: false,
  renderOptions: {},
};

const EditorContext = createContext<EditorContextValue>(DEFAULTS);

export function EditorProvider({
  value,
  children,
}: {
  value: Partial<EditorContextValue>;
  children: ReactNode;
}) {
  const parent = useContext(EditorContext);
  return (
    <EditorContext.Provider value={{ ...parent, ...value }}>{children}</EditorContext.Provider>
  );
}

export function useEditorContext(): EditorContextValue {
  return useContext(EditorContext);
}

/**
 * The definition for `type` among `definitions`. A later definition of the same type replaces an
 * earlier one, exactly as core's `getDefinition` (and so the renderer) decides, which is how a host
 * overrides a built-in block by appending its own.
 */
export function editorDefinition(
  type: string,
  definitions: readonly EditorBlockDefinition[],
): EditorBlockDefinition | undefined {
  // Safe: core returns one of the definitions it was given.
  return getDefinition(type, definitions) as EditorBlockDefinition | undefined;
}

/** The definition for a block type, if the editor knows it. */
export function useEditorDefinition(type: string): EditorBlockDefinition | undefined {
  return editorDefinition(type, useEditorContext().definitions);
}
