/**
 * Blockletter's React editor. Import the stylesheet once, anywhere in the host:
 *
 * ```ts
 * import '@subterra-technologies/blockletter-react/styles.css';
 * ```
 *
 * Most hosts need only `NewsletterEditor`. The parts it is made of are exported for a host that
 * lays the editor out itself (inside a `BlockletterRoot` and an `EditorProvider`, driven by
 * `useNewsletterEditor`), and the canvas and form pieces for a host's own blocks. The kit under
 * `ui/` (buttons, dialogs, selects) stays internal: it is the editor's, not a component library.
 */

// The editor
export {
  NewsletterEditor,
  type InspectorTab,
  type NewsletterEditorProps,
} from './editor/newsletter-editor';
export {
  useNewsletterEditor,
  type EditorMode,
  type NewsletterEditorApi,
  type UseNewsletterEditorOptions,
} from './editor/use-newsletter-editor';
export { BlockletterRoot, type BlockletterRootProps, type BlockletterTheme } from './root';
export {
  EditorProvider,
  useEditorContext,
  useEditorDefinition,
  type EditorContextValue,
  type EditorHistoryHandle,
} from './editor/context';

// Blocks: the registry and the plugin API
export { builtInEditorBlocks, defineEditorBlock } from './blocks';
export type {
  BlockCanvasProps,
  BlockComponent,
  BlockEditorProps,
  BlockIcon,
  EditorBlockDefinition,
} from './editor/types';
export { BUILT_IN_CANVASES, type BuiltInCanvases } from './canvas/blocks';
export { BUILT_IN_EDITORS, type BuiltInEditors } from './inspector/editors';
export { BUILT_IN_ICONS } from './palette/block-icons';

// The parts
export {
  NewsletterCanvas,
  type InsertTarget,
  type NewsletterCanvasHandle,
  type NewsletterCanvasProps,
} from './canvas/canvas';
export { CanvasToolbar, type CanvasToolbarProps } from './canvas/canvas-toolbar';
export { BlockPalette, type BlockPaletteProps } from './palette/block-palette';
export {
  BlockInspector,
  type BlockInspectorHandle,
  type BlockInspectorProps,
} from './inspector/block-inspector';
export { AppearancePanel, type AppearancePanelProps } from './appearance/appearance-panel';
export { ColorField, type ColorFieldProps, type ColorSwatch } from './appearance/color-field';
export { ImageField, type ImageFieldProps } from './inspector/image-field';
export { BrandKitEditor, type BrandKitEditorProps } from './brand/brand-kit-editor';
export { TemplatePicker, type TemplatePickerProps } from './templates/template-picker';
export {
  SaveTemplateDialog,
  type SaveTemplateDialogProps,
  type SaveTemplateRequest,
} from './templates/save-template-dialog';
export {
  NewIssueDialog,
  type NewIssueDialogProps,
  type NewIssueRequest,
} from './templates/new-issue-dialog';
export { DuplicateIssueDialog, type DuplicateIssueDialogProps } from './templates/duplicate-dialog';
export { IssuePeriodFields, type IssuePeriodFieldsProps } from './period/issue-period-fields';
export { PreviewPane, type PreviewPaneProps, type PreviewWidth } from './preview/preview-pane';

// For a host's own blocks: a canvas drawing in the email's look…
export {
  CanvasNote,
  CanvasSection,
  EmailButton,
  EmailImage,
  EmailLink,
  EmailParagraphs,
  bodyStyle,
  headingStyle,
  labelStyle,
  smallStyle,
} from './canvas/blocks/shared';
// …and an inspector form that matches the built-in ones.
export {
  AreaField,
  CheckField,
  ChoiceField,
  EditorFields,
  FieldPair,
  Hint,
  Note,
  SelectField,
  TextField,
  type Choice,
} from './inspector/editor-fields';
export { RichTextField, type RichTextFieldProps } from './rich-text/rich-text-field';

export { cn } from './lib/cn';
