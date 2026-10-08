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

/** The document's undo history, as the fields inside the editor see it. */
export interface EditorHistoryHandle {
  /**
   * Closes the newest step, so the next change is a step of its own: a field calls it around a
   * command of its own (bold, a list) that should undo apart from the typing either side of it.
   */
  endStep: () => void;
}

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
  /**
   * Set where the document's undo history answers undo and redo for every field: inside
   * `NewsletterEditor`, which takes their keys, the browser's own Undo and Redo, and its top
   * bar's buttons. A field with an undo of its own (`RichTextField`) leaves all of that to the
   * document's history while this is set, and keeps its own without it. A host laying out the
   * parts itself sets it (`{ endStep }` from `useNewsletterEditor`) once it sends those keys to
   * the document's `undo` and `redo` too.
   */
  history?: EditorHistoryHandle;
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
