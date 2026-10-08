import {
  useCallback,
  useEffect,
  useEffectEvent,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from 'react';
import { ArrowLeftIcon, BookmarkIcon, LockIcon, MoreHorizontalIcon } from 'lucide-react';
import {
  isStructural,
  periodErrors,
  sourceFor,
  type BlockBase,
  type BrandKit,
  type BuiltInBlock,
  type DataSource,
  type ImageRef,
  type IssuePeriod,
  type NewsletterDocument,
  type RenderOptions,
} from '@subterra-technologies/blockletter';
import { AppearancePanel } from '../appearance/appearance-panel';
import { builtInEditorBlocks } from '../blocks';
import { BrandKitEditor } from '../brand/brand-kit-editor';
import { NewsletterCanvas } from '../canvas/canvas';
import { BlockInspector, type BlockInspectorHandle } from '../inspector/block-inspector';
import { Hint } from '../inspector/editor-fields';
import { cn } from '../lib/cn';
import { BlockPalette } from '../palette/block-palette';
import { IssuePeriodFields } from '../period/issue-period-fields';
import { todayInZone } from '../period/today';
import { PreviewPane, type PreviewWidth } from '../preview/preview-pane';
import { BlockletterRoot, type BlockletterTheme } from '../root';
import { SaveTemplateDialog, type SaveTemplateRequest } from '../templates/save-template-dialog';
import { Button } from '../ui/button';
import { useConfirm } from '../ui/confirm';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Field, FieldLabel } from '../ui/field';
import { Input } from '../ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { EditorProvider, type EditorContextValue } from './context';
import { HistoryButtons, HistoryMenuItems } from './history-controls';
import { historyShortcut, keepsNativeUndo, type HistoryAction } from './history-shortcuts';
import type { EditorBlockDefinition } from './types';
import {
  useNewsletterEditor,
  type EditorMode,
  type NewsletterEditorApi,
} from './use-newsletter-editor';

export interface NewsletterEditorProps<B extends BlockBase = BuiltInBlock> {
  /**
   * The document, controlled: every edit comes back through `onChange`. Pass back what it hands
   * you (or a copy of it): a document it did not hand out, such as another issue, starts its undo
   * history over.
   */
  value: NewsletterDocument<B>;
  onChange: (value: NewsletterDocument<B>) => void;
  /** The brand kit the email is painted with. */
  brand: BrandKit;
  /** Saves an edited brand kit. Without it there is no Brand kit tab. A rejection shows in the form. */
  onBrandChange?: (brand: BrandKit) => void | Promise<void>;
  /** Default `builtInEditorBlocks`; add a host's own after them. Keep the list stable. */
  definitions?: readonly EditorBlockDefinition[];
  /** Where list blocks fill from: Refresh, the item pickers and Update period use them. */
  sources?: readonly DataSource[];
  /** Stores an image and says where it lives. Without it, image fields take an https address. */
  uploadImage?: (file: File) => Promise<ImageRef>;
  /** For the preview and for blocks drawn from their HTML. Keep the object stable. */
  renderOptions?: RenderOptions;
  /** Shows the issue without letting anything change. */
  readOnly?: boolean;
  /** Says why it is read-only ("This issue was sent on 3 September…"). */
  readOnlyReason?: ReactNode;
  /** The host's own actions (Save, Approve, Send…), shown in the editor's top bar. */
  toolbar?: ReactNode;
  /** Saves the layout as a template; adds "Save as template…" to the More menu. */
  onSaveAsTemplate?: (request: SaveTemplateRequest) => void | Promise<void>;
  theme?: BlockletterTheme;
  className?: string;
  /** Default `canvas`. */
  defaultMode?: EditorMode;
  /** The inspector tab shown first (default `block`); `brand` needs `onBrandChange`. */
  defaultTab?: InspectorTab;
  /** A block selected from the start, scrolled into view without taking the page's focus. */
  defaultSelectedId?: string;
  /**
   * Fits the editor to its container's height rather than growing with the issue: the top bar
   * stays put, each pane scrolls on its own, and the page does not. Give the container a height
   * (`calc(100dvh - 4rem)`, say, or a flex item's share). Below 64rem of its own width it shows one
   * pane at a time, switched from the top bar: Blocks, Canvas, Edit (the chosen block's form) and
   * Preview, with Undo and Redo in its More menu, since a phone's top bar has no room for them.
   */
  fill?: boolean;
}

/** The inspector's tabs: the selected block's content and look, the issue, the brand kit. */
export type InspectorTab = 'block' | 'appearance' | 'settings' | 'brand';

const NO_SOURCES: readonly DataSource[] = [];
const NO_OPTIONS: RenderOptions = {};

/**
 * The newsletter editor: a block palette, the issue drawn on its canvas (or previewed exactly as
 * it will arrive), and the selected block's content and appearance beside it, with the issue's
 * own settings and the brand kit a tab away. It holds no document of its own (`value` in,
 * `onChange` out), saves nothing and sends nothing: drafts, approval, recipients and delivery
 * are the host's, which adds its own actions through `toolbar`.
 *
 * Wide enough (64rem of its own width), it lays the three panes side by side, the palette and the
 * inspector staying in view as the page scrolls (set `--bl-sticky-top` on it for a fixed header
 * above); narrower, they stack, with nothing wider than the screen down to 320px. With `fill`, it
 * fits its container instead: see `fill`.
 *
 * Every change it makes to the document can be undone and redone, from Undo and Redo in its top
 * bar, or with Ctrl+Z (⌘Z) and Ctrl+Shift+Z (⇧⌘Z) or Ctrl+Y while the focus is anywhere in it.
 * The brand kit and templates live outside the document, and outside its history.
 */
export function NewsletterEditor<B extends BlockBase = BuiltInBlock>({
  value,
  onChange,
  brand,
  onBrandChange,
  definitions = builtInEditorBlocks,
  sources = NO_SOURCES,
  uploadImage,
  renderOptions = NO_OPTIONS,
  readOnly = false,
  readOnlyReason,
  toolbar,
  onSaveAsTemplate,
  theme,
  className,
  defaultMode = 'canvas',
  defaultTab = 'block',
  defaultSelectedId,
  fill = false,
}: NewsletterEditorProps<B>) {
  const context = useMemo<Partial<EditorContextValue>>(
    () => ({
      definitions,
      sources,
      brand,
      readOnly,
      renderOptions,
      uploadImage,
      period: value.period,
    }),
    [definitions, sources, brand, readOnly, renderOptions, uploadImage, value.period],
  );

  return (
    <BlockletterRoot
      theme={theme}
      className={cn(
        'bl:@container/editor bl:flex bl:min-w-0 bl:flex-col bl:rounded-xl bl:border bl:bg-background bl:text-foreground',
        fill && 'bl:relative bl:h-full bl:min-h-0 bl:overflow-hidden',
        className,
      )}
    >
      <EditorProvider value={context}>
        <Workspace<B>
          value={value}
          onChange={onChange}
          brand={brand}
          onBrandChange={onBrandChange}
          definitions={definitions}
          sources={sources}
          readOnly={readOnly}
          readOnlyReason={readOnlyReason}
          toolbar={toolbar}
          onSaveAsTemplate={onSaveAsTemplate}
          defaultMode={defaultMode}
          defaultTab={defaultTab}
          defaultSelectedId={defaultSelectedId}
          fill={fill}
        />
      </EditorProvider>
    </BlockletterRoot>
  );
}

/** The tabs about the selected block, which a pick on the canvas keeps open. */
const BLOCK_TABS: readonly InspectorTab[] = ['block', 'appearance'];
/** Compact enough for all four inspector tabs on one row, even at 320px. */
const TAB = 'bl:px-1 bl:text-[0.8125rem]';

const blockWord = (count: number): string => (count === 1 ? '1 block' : `${count} blocks`);

/** The room the desktop preview needs unscaled: the 600px email and its stage's padding. */
const DESKTOP_PREVIEW_ROOM = 632;

/** Narrower than this many rem (the `@5xl` container width), fill shows one pane at a time. */
const WIDE_LAYOUT_REM = 64;

/**
 * The panes a narrow fill layout shows one at a time. The canvas pane shows the canvas or the
 * preview, as the editor's `mode` says.
 */
type Pane = 'blocks' | 'canvas' | 'edit';
/** The narrow fill layout's tabs: one per pane, and Preview, the canvas pane in preview mode. */
type PaneTab = Pane | 'preview';
const PANE_LABELS: Readonly<Record<PaneTab, string>> = {
  blocks: 'Blocks',
  canvas: 'Canvas',
  edit: 'Edit',
  preview: 'Preview',
};

/**
 * How the panes are laid out: with the page (`flow`, the default: the canvas as tall as the issue,
 * the side panes sticky), or filling the editor's own height, side by side (`columns`) or one at a
 * time (`single`).
 */
type Layout = 'flow' | 'columns' | 'single';

/** Where an undo or redo began (`elsewhere`: the top bar, the palette…), for the focus after it. */
type HistoryOrigin = 'canvas' | 'inspector' | 'elsewhere';

interface WorkspaceProps<B extends BlockBase> {
  value: NewsletterDocument<B>;
  onChange: (value: NewsletterDocument<B>) => void;
  brand: BrandKit;
  onBrandChange: ((brand: BrandKit) => void | Promise<void>) | undefined;
  definitions: readonly EditorBlockDefinition[];
  sources: readonly DataSource[];
  readOnly: boolean;
  readOnlyReason: ReactNode;
  toolbar: ReactNode;
  onSaveAsTemplate: ((request: SaveTemplateRequest) => void | Promise<void>) | undefined;
  defaultMode: EditorMode;
  defaultTab: InspectorTab;
  defaultSelectedId: string | undefined;
  fill: boolean;
}

/** Everything inside the root, where the confirmation and the toasts are within reach. */
function Workspace<B extends BlockBase>({
  value,
  onChange,
  brand,
  onBrandChange,
  definitions,
  sources,
  readOnly,
  readOnlyReason,
  toolbar,
  onSaveAsTemplate,
  defaultMode,
  defaultTab,
  defaultSelectedId,
  fill,
}: WorkspaceProps<B>) {
  const editor = useNewsletterEditor<B>({
    value,
    onChange,
    definitions,
    sources,
    brand,
    readOnly,
    defaultMode,
    defaultSelectedId,
  });
  const { document, selected, insertTarget, mode, canvasRef, canUndo, canRedo } = editor;
  const ids = useId();
  const paletteHeadingId = `${ids}-palette`;
  const inspectorId = `${ids}-inspector`;
  const appearanceHeadingId = `${ids}-appearance`;
  const previewHeadingId = `${ids}-preview`;
  const [chosenTab, setTab] = useState<InspectorTab>(defaultTab);
  // The Brand kit tab is there only while the host can save a brand kit.
  const tab = chosenTab === 'brand' && !onBrandChange ? 'block' : chosenTab;
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [previewWidth, setPreviewWidth] = useState<PreviewWidth>('desktop');
  const inspectorRef = useRef<BlockInspectorHandle | null>(null);
  /** Everything the editor draws (overlays aside), where undo and redo are asked for. */
  const workspace = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const canvasColumn = useRef<HTMLDivElement>(null);
  const inspectorColumn = useRef<HTMLElement>(null);
  /** Undo in the top bar, or the More menu that holds it: the last place focus can go after one. */
  const historyControl = useRef<HTMLButtonElement>(null);
  /**
   * Focus to move once the render it waits for is done: the inspector, the palette, or the chosen
   * block on the canvas.
   */
  const pendingFocus = useRef<'inspector' | 'palette' | 'block' | null>(null);
  /** An undo or redo waiting to render, and where it began, which says where the focus goes. */
  const historyFocus = useRef<HistoryOrigin | null>(null);

  const narrow = useNarrow(body, fill);
  const layout: Layout = !fill ? 'flow' : narrow ? 'single' : 'columns';
  const single = layout === 'single';
  // An issue-wide tab asked for (a deep link to the brand kit) opens on Edit, where it is.
  const [chosenPane, setPane] = useState<Pane>(() =>
    defaultTab === 'settings' || (defaultTab === 'brand' && onBrandChange) ? 'edit' : 'canvas',
  );
  // There is nothing to add while the issue is read-only, so no Blocks pane.
  const pane: Pane = readOnly && chosenPane === 'blocks' ? 'canvas' : chosenPane;
  const paneTabs: readonly PaneTab[] = readOnly
    ? ['canvas', 'edit', 'preview']
    : ['blocks', 'canvas', 'edit', 'preview'];
  // Preview is the canvas pane showing the preview: `mode` stays the one record of which, so the
  // preview survives a resize to the side-by-side layout and back.
  const activeTab: PaneTab = pane === 'canvas' && mode === 'preview' ? 'preview' : pane;
  const paneTabId = (which: PaneTab) => `${ids}-pane-${which}`;
  const panePanelId = (which: PaneTab) =>
    which === 'edit' ? inspectorId : `${ids}-panel-${which === 'preview' ? 'canvas' : which}`;
  /**
   * The attributes that make a pane a tab panel, in the single layout only. The canvas pane is
   * Canvas's panel and Preview's: it is labelled by whichever of the two is selected.
   */
  const panel = (which: Pane) =>
    single
      ? {
          role: 'tabpanel',
          id: panePanelId(which),
          'aria-labelledby': paneTabId(
            which === 'canvas' && mode === 'preview' ? 'preview' : which,
          ),
          hidden: pane !== which,
        }
      : {};

  /**
   * Where the focus goes once an undo or redo has rendered. Begun on the canvas, it follows the
   * block the change was made to, as it follows a block moved with Alt and an arrow. Begun
   * anywhere else, it stays put, unless the change took away the element that had it (a block it
   * deleted, a form it swapped for another block's): then it goes to the chosen block's form or
   * the block itself, whichever is nearer where it was and on show, and failing both, to Undo.
   */
  function focusAfterHistory(origin: HistoryOrigin): void {
    const active = window.document.activeElement;
    const lost = !active || active === window.document.body;
    if (origin !== 'canvas' && !lost) return;
    const toCanvas = (): boolean => {
      const canvas = canvasRef.current;
      const id = editor.selectedId ?? document.blocks[0]?.id;
      if (!canvas || !id || (single && pane !== 'canvas')) return false;
      canvas.focusBlock(id);
      return true;
    };
    const toForm = (): boolean => {
      if (!selected || !BLOCK_TABS.includes(tab) || (single && pane !== 'edit')) return false;
      if (tab === 'appearance') {
        window.document.getElementById(appearanceHeadingId)?.focus({ preventScroll: true });
      } else {
        inspectorRef.current?.focusHeading();
      }
      return true;
    };
    const placed = origin === 'inspector' ? toForm() || toCanvas() : toCanvas() || toForm();
    if (!placed) historyControl.current?.focus();
  }

  useEffect(() => {
    const origin = historyFocus.current;
    if (origin) {
      historyFocus.current = null;
      focusAfterHistory(origin);
    }
  });

  useEffect(() => {
    const target = pendingFocus.current;
    if (!target) return;
    if (target === 'palette') {
      pendingFocus.current = null;
      window.document.getElementById(paletteHeadingId)?.focus();
    } else if (target === 'block') {
      pendingFocus.current = null;
      // The chosen block, or where there is none to go back to (none chosen, or the pane is
      // showing the preview), the Canvas tab.
      const canvas = canvasRef.current;
      if (canvas && editor.selectedId) canvas.focusBlock(editor.selectedId);
      else window.document.getElementById(paneTabId('canvas'))?.focus();
    } else if (tab === 'appearance') {
      pendingFocus.current = null;
      window.document.getElementById(appearanceHeadingId)?.focus({ preventScroll: true });
    } else if (inspectorRef.current) {
      pendingFocus.current = null;
      inspectorRef.current.focusHeading();
    }
    // Otherwise the Block tab is opening: its panel mounts a render later, and takes the focus
    // as it does (`attachInspector`).
  });

  /** The block form as it mounts, focused when a pick opened its tab. */
  const attachInspector = useCallback((handle: BlockInspectorHandle | null) => {
    inspectorRef.current = handle;
    if (handle && pendingFocus.current === 'inspector') {
      pendingFocus.current = null;
      handle.focusHeading();
    }
  }, []);

  /** The inspector sits beside the canvas (the wide layout), not below it. */
  const inspectorBeside = (): boolean => {
    const canvas = canvasColumn.current?.getBoundingClientRect();
    const inspector = inspectorColumn.current?.getBoundingClientRect();
    return Boolean(canvas && inspector && inspector.left >= canvas.right - 1);
  };

  /**
   * A pick (a click, Enter) brings the block's form forward: a block tab opens, and where the
   * inspector is beside the canvas, focus moves to its heading so the keyboard lands in its fields.
   * A block chosen by moving it keeps focus where it was. Stacked, focus stays on the canvas: the
   * inspector is further down the page, or (one pane at a time) a tap on Edit away.
   */
  function pick(id: string, options?: { reveal?: boolean }): void {
    editor.select(id);
    if (options?.reveal === false) return;
    setTab((current) => (BLOCK_TABS.includes(current) ? current : 'block'));
    if (!single && inspectorBeside()) pendingFocus.current = 'inspector';
  }

  /** One pane at a time: the block's Edit button brings its form up, focused on its heading. */
  function edit(id: string): void {
    editor.select(id);
    setTab((current) => (BLOCK_TABS.includes(current) ? current : 'block'));
    setPane('edit');
    pendingFocus.current = 'inspector';
  }

  /**
   * Back from the Edit pane (its button, or Escape) to the block that was being edited: to the
   * canvas, as the button says, even when the pane was showing the preview before.
   */
  const { setMode } = editor;
  const backToCanvas = useCallback(() => {
    setPane('canvas');
    setMode('canvas');
    pendingFocus.current = 'block';
  }, [setMode]);

  // Escape leaves the Edit pane. Listened for on the pane's own element, so an Escape that closes
  // a menu or a dialog (which portal elsewhere, and mark the key handled) is not taken for it.
  useEffect(() => {
    const element = inspectorColumn.current;
    if (!single || !element) return;
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      event.preventDefault();
      backToCanvas();
    };
    element.addEventListener('keydown', onKeyDown);
    return () => element.removeEventListener('keydown', onKeyDown);
  }, [single, backToCanvas]);

  /**
   * Canvas or Preview. A preview opened where the desktop email would have to shrink to fit (a
   * phone) starts on the phone width, which is readable there.
   */
  function changeMode(next: EditorMode): void {
    if (next === 'preview') {
      // A canvas pane not on show (the preview chosen from another pane) has no width; it will
      // take the whole width of the body when it shows.
      const room =
        canvasColumn.current?.getBoundingClientRect().width ||
        body.current?.getBoundingClientRect().width ||
        0;
      setPreviewWidth(room > 0 && room < DESKTOP_PREVIEW_ROOM ? 'phone' : 'desktop');
    }
    setMode(next);
  }

  /** A tab of the narrow fill layout: Canvas and Preview are the canvas pane in either mode. */
  function showTab(next: PaneTab): void {
    if (next === 'canvas' || next === 'preview') {
      setPane('canvas');
      changeMode(next);
    } else {
      setPane(next);
    }
  }

  /** Insert above / below: the palette now places its choice at the line, so focus goes there. */
  function requestInsert(target: { index: number; label: string }): void {
    editor.requestInsert(target);
    if (single) setPane('blocks');
    pendingFocus.current = 'palette';
  }

  /** An insertion given up (Cancel, Escape): one pane at a time, back to the canvas it was for. */
  function cancelInsert(): void {
    editor.cancelInsert();
    if (!single) return;
    setPane('canvas');
    if (!editor.selectedId) pendingFocus.current = 'block';
  }

  /** The palette's choice: at the insertion point, a structural block at the top, else the end. */
  function add(type: string): void {
    const index = insertTarget
      ? insertTarget.index
      : isStructural({ type }, definitions)
        ? 0
        : undefined;
    const canvas = canvasRef.current;
    if (!canvas) editor.insert(type, index);
    else if (index === undefined) canvas.addAtEnd(type);
    else canvas.insertAt(type, index);
    // One pane at a time, the new block is shown where it landed, chosen and focused.
    if (single) setPane('canvas');
  }

  /** Undo or redo from the top bar or the keyboard; `from` is the element it began in. */
  function runHistory(action: HistoryAction, from: Element | null): void {
    if (!(action === 'undo' ? canUndo : canRedo)) return;
    historyFocus.current =
      from && mode === 'canvas' && canvasColumn.current?.contains(from)
        ? 'canvas'
        : from && inspectorColumn.current?.contains(from)
          ? 'inspector'
          : 'elsewhere';
    if (action === 'undo') editor.undo();
    else editor.redo();
  }

  /**
   * The element an undo or redo was asked for in, when it is the editor's to answer. Only its own
   * UI's: the page around it never reaches here, and the host's toolbar and the editor's overlays
   * (dialogs, menus) keep theirs, as does a field holding a draft (`keepsNativeUndo`), where the
   * browser undoes the typing. Anywhere else, a text field included, it is the editor's: the same
   * Undo as the button, so the keys never mean two different things.
   */
  function historyTarget(target: EventTarget | null): Element | null {
    if (readOnly || !(target instanceof Element)) return null;
    if (target.closest('[data-bl-toolbar], [data-bl-portal]') || keepsNativeUndo(target)) {
      return null;
    }
    return target;
  }

  /** Ctrl+Z (⌘Z) undoes; Ctrl+Shift+Z (⇧⌘Z) and Ctrl+Y redo. */
  function onHistoryKey(event: KeyboardEvent<HTMLDivElement>): void {
    const action = historyShortcut(event.nativeEvent);
    const target = historyTarget(event.target);
    if (!action || !target || event.nativeEvent.defaultPrevented) return;
    event.preventDefault();
    runHistory(action, target);
  }

  /**
   * The browser's own Undo and Redo, chosen from a context menu or the Edit menu, or a phone's
   * undo gesture, rather than typed: they reach a field as `beforeinput`, and in the editor's
   * fields they are its history's too. A browser that will not let it be stopped keeps it.
   */
  const onBrowserHistory = useEffectEvent((event: InputEvent) => {
    const action =
      event.inputType === 'historyUndo'
        ? 'undo'
        : event.inputType === 'historyRedo'
          ? 'redo'
          : null;
    const target = historyTarget(event.target);
    if (!action || !target || !event.cancelable || event.defaultPrevented) return;
    event.preventDefault();
    runHistory(action, target);
  });
  useEffect(() => {
    const element = workspace.current;
    if (!element) return;
    const listener = (event: InputEvent) => onBrowserHistory(event);
    element.addEventListener('beforeinput', listener);
    return () => element.removeEventListener('beforeinput', listener);
  }, []);

  const count = document.blocks.length;
  const selectedRefreshing = selected && editor.refreshing.has(selected.id) ? selected.id : null;
  const modeSwitch = <ModeSwitch mode={mode} onChange={changeMode} />;
  // One pane at a time, the top bar has no room for Undo and Redo beside the pane tabs and More
  // (a 336px editor on a 360px phone leaves 30px), so they are the first items in More.
  const historyInMenu = single && !readOnly;
  const historyButtons =
    readOnly || single ? null : (
      <HistoryButtons
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={() => runHistory('undo', null)}
        onRedo={() => runHistory('redo', null)}
        undoRef={historyControl}
      />
    );
  const moreMenu =
    historyInMenu || onSaveAsTemplate ? (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            ref={historyInMenu ? historyControl : undefined}
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="More"
          >
            <MoreHorizontalIcon aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bl:w-52">
          {historyInMenu ? (
            <HistoryMenuItems
              canUndo={canUndo}
              canRedo={canRedo}
              onUndo={editor.undo}
              onRedo={editor.redo}
            />
          ) : null}
          {historyInMenu && onSaveAsTemplate ? <DropdownMenuSeparator /> : null}
          {onSaveAsTemplate ? (
            <DropdownMenuItem onSelect={() => setSavingTemplate(true)}>
              <BookmarkIcon aria-hidden="true" />
              Save as template…
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    ) : null;

  const canvas = (
    <NewsletterCanvas
      ref={canvasRef}
      blocks={document.blocks}
      selectedId={editor.selectedId}
      readOnly={readOnly}
      refreshingId={selectedRefreshing}
      editorPanelId={inspectorId}
      maxBlocks={editor.maxBlocks}
      insertIndex={insertTarget?.index ?? null}
      onPick={pick}
      onReorder={({ from, to }) => editor.move(from, to)}
      onInsert={({ type, index }) => editor.insert(type, index)}
      onRequestInsert={requestInsert}
      onCancelInsert={cancelInsert}
      onToggleHidden={editor.toggleHidden}
      onRefresh={(id) => void editor.refresh(id)}
      onRemove={editor.remove}
      onDuplicate={editor.duplicate}
      {...(single ? { onEdit: edit } : {})}
    />
  );

  const inspectorTabs = (
    <Tabs value={tab} onValueChange={(next) => setTab(next as InspectorTab)}>
      {/* Four tabs fit one row of the inspector at 13px; a larger text setting wraps them, and
          the list grows to hold the second row. */}
      <TabsList className="bl:w-full bl:flex-wrap bl:group-data-[orientation=horizontal]/tabs:h-auto">
        <TabsTrigger value="block" className={TAB}>
          Block
        </TabsTrigger>
        <TabsTrigger value="appearance" className={TAB}>
          Appearance
        </TabsTrigger>
        <TabsTrigger value="settings" className={TAB}>
          Settings
        </TabsTrigger>
        {onBrandChange ? (
          <TabsTrigger value="brand" className={TAB}>
            Brand kit
          </TabsTrigger>
        ) : null}
      </TabsList>

      <TabsContent value="block" className="bl:min-w-0 bl:pt-2">
        {selected ? (
          <BlockInspector
            ref={attachInspector}
            block={selected}
            readOnly={readOnly}
            readOnlyReason={readOnlyReason}
            onChange={editor.update}
          />
        ) : (
          <EmptyPanel>Choose a block on the canvas to edit what it says.</EmptyPanel>
        )}
      </TabsContent>

      <TabsContent value="appearance" className="bl:min-w-0 bl:pt-2">
        {selected ? (
          <AppearancePanel
            block={selected}
            readOnly={readOnly}
            headingId={appearanceHeadingId}
            onChange={editor.update}
          />
        ) : (
          <EmptyPanel>Choose a block on the canvas to change how it looks.</EmptyPanel>
        )}
      </TabsContent>

      <TabsContent value="settings" className="bl:min-w-0 bl:pt-2">
        <SettingsPanel editor={editor} sources={sources} readOnly={readOnly} />
      </TabsContent>

      {onBrandChange ? (
        <TabsContent value="brand" className="bl:min-w-0 bl:pt-2">
          <BrandKitEditor value={brand} onSave={onBrandChange} readOnly={readOnly} />
        </TabsContent>
      ) : null}
    </Tabs>
  );

  return (
    // Undo and redo's keys, from anywhere inside the editor (`onHistoryKey`): the controls inside
    // are the interactive elements, and this only listens to keys bubbling up from them. Laid out
    // as if it were not there, so the editor's root lays out the bar and the panes itself.
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div ref={workspace} className="bl:contents" onKeyDown={onHistoryKey}>
      <div className="bl:flex bl:shrink-0 bl:flex-wrap bl:items-center bl:gap-x-3 bl:gap-y-2 bl:border-b bl:px-3 bl:py-2">
        {/* One pane at a time, the top bar switches panes, Preview among them, and the editor's
            own menu (Undo and Redo first) comes straight after the switch: the host's actions
            wrap after it, rather than leaving it behind. */}
        {single ? (
          <>
            <PaneSwitch
              tabs={paneTabs}
              active={activeTab}
              onChange={showTab}
              tabId={paneTabId}
              panelId={panePanelId}
            />
            {moreMenu}
          </>
        ) : (
          <>
            {modeSwitch}
            {historyButtons}
          </>
        )}
        <div className="bl:ml-auto bl:flex bl:min-w-0 bl:flex-wrap bl:items-center bl:gap-2">
          {/* The host's own controls, which keep their own keys: an undo typed in a host's field
              is the host's. */}
          {toolbar ? (
            <div data-bl-toolbar="" className="bl:contents">
              {toolbar}
            </div>
          ) : null}
          {single ? null : moreMenu}
        </div>
      </div>
      {readOnly ? (
        <p
          role="note"
          className="bl:flex bl:shrink-0 bl:items-start bl:gap-2 bl:border-b bl:bg-muted bl:px-4 bl:py-2 bl:text-[0.8125rem] bl:text-muted-foreground"
        >
          <LockIcon aria-hidden="true" className="bl:mt-0.5 bl:size-4 bl:shrink-0" />
          <span>
            {readOnlyReason ?? 'This issue is read-only, so nothing in it can be changed.'}
          </span>
        </p>
      ) : null}

      <div
        ref={body}
        className={cn(
          layout === 'flow' &&
            cn(
              'bl:grid bl:min-w-0 bl:flex-1',
              readOnly
                ? 'bl:@5xl/editor:grid-cols-[minmax(0,1fr)_21rem]'
                : 'bl:@5xl/editor:grid-cols-[13rem_minmax(0,1fr)_21rem]',
            ),
          // Side by side in the editor's own height: one row that fills it, and panes that scroll.
          // Every pane that scrolls is positioned, so the visually hidden text inside it (which is
          // absolutely positioned) scrolls and clips with it instead of stretching the host page.
          layout === 'columns' &&
            cn(
              'bl:grid bl:min-h-0 bl:min-w-0 bl:flex-1 bl:grid-rows-[minmax(0,1fr)]',
              readOnly
                ? 'bl:grid-cols-[minmax(0,1fr)_21rem]'
                : 'bl:grid-cols-[13rem_minmax(0,1fr)_21rem]',
            ),
          single && 'bl:flex bl:min-h-0 bl:min-w-0 bl:flex-1 bl:flex-col',
        )}
      >
        {readOnly ? null : (
          <section
            {...(single ? panel('blocks') : { 'aria-label': 'Block palette' })}
            className={cn(
              'bl:min-w-0 bl:px-2 bl:py-4',
              layout === 'flow' &&
                'bl:border-b bl:@5xl/editor:sticky bl:@5xl/editor:top-[var(--bl-sticky-top,0px)] bl:@5xl/editor:max-h-[calc(100dvh-var(--bl-sticky-top,0px))] bl:@5xl/editor:self-start bl:@5xl/editor:overflow-y-auto bl:@5xl/editor:border-b-0',
              layout !== 'flow' && 'bl:relative bl:min-h-0 bl:overflow-y-auto',
              single && 'bl:flex-1',
            )}
          >
            <BlockPalette
              headingId={paletteHeadingId}
              blocks={document.blocks}
              countLabel={`${count} of ${editor.maxBlocks} blocks`}
              insertLabel={insertTarget?.label ?? null}
              disabled={editor.full}
              // Dragging needs the canvas beside the palette.
              draggable={mode === 'canvas' && !single}
              onAdd={add}
              onCancelInsert={cancelInsert}
              onDragStart={(type) => canvasRef.current?.paletteDragStart(type)}
              onDragEnd={() => canvasRef.current?.endDrag()}
            />
          </section>
        )}

        {/* The dividers between the panes are the canvas column's: it runs the full height, while
            the side panes stop where their content does. */}
        <div
          ref={canvasColumn}
          {...panel('canvas')}
          className={cn(
            'bl:flex bl:min-w-0 bl:flex-col',
            layout === 'flow' && (readOnly ? 'bl:@5xl/editor:border-r' : 'bl:@5xl/editor:border-x'),
            layout === 'columns' && cn('bl:min-h-0', readOnly ? 'bl:border-r' : 'bl:border-x'),
            single && 'bl:min-h-0 bl:flex-1',
          )}
        >
          {mode === 'canvas' ? (
            layout === 'flow' ? (
              canvas
            ) : (
              <div className="bl:relative bl:flex bl:min-h-0 bl:flex-1 bl:flex-col bl:overflow-y-auto">
                {canvas}
              </div>
            )
          ) : (
            <section
              aria-labelledby={previewHeadingId}
              className={cn(
                'bl:flex bl:min-w-0 bl:flex-1 bl:flex-col',
                layout !== 'flow' && 'bl:relative bl:min-h-0 bl:overflow-y-auto',
              )}
            >
              <h2 id={previewHeadingId} className="bl:sr-only">
                Preview
              </h2>
              <PreviewPane
                document={document}
                defaultWidth={previewWidth}
                fill={layout !== 'flow'}
              />
            </section>
          )}
        </div>

        <section
          ref={inspectorColumn}
          {...(single ? panel('edit') : { id: inspectorId, 'aria-label': 'Inspector' })}
          className={cn(
            'bl:min-w-0',
            layout === 'flow' &&
              'bl:border-t bl:p-3 bl:@md/editor:p-4 bl:@5xl/editor:sticky bl:@5xl/editor:top-[var(--bl-sticky-top,0px)] bl:@5xl/editor:max-h-[calc(100dvh-var(--bl-sticky-top,0px))] bl:@5xl/editor:self-start bl:@5xl/editor:overflow-y-auto bl:@5xl/editor:border-t-0',
            layout === 'columns' &&
              'bl:relative bl:min-h-0 bl:overflow-y-auto bl:p-3 bl:@md/editor:p-4',
            single && 'bl:flex bl:min-h-0 bl:flex-1 bl:flex-col',
          )}
        >
          {single ? (
            <>
              <div className="bl:flex bl:shrink-0 bl:items-center bl:border-b bl:px-2 bl:py-1.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-keyshortcuts="Escape"
                  onClick={backToCanvas}
                >
                  <ArrowLeftIcon aria-hidden="true" />
                  Back to canvas
                </Button>
              </div>
              <div className="bl:relative bl:min-h-0 bl:flex-1 bl:overflow-y-auto bl:p-3 bl:@md/editor:p-4">
                {inspectorTabs}
              </div>
            </>
          ) : (
            inspectorTabs
          )}
        </section>
      </div>

      {onSaveAsTemplate ? (
        <SaveTemplateDialog
          open={savingTemplate}
          onOpenChange={setSavingTemplate}
          suggestedName={`${document.subject.trim() || 'Newsletter'} layout`}
          onSave={onSaveAsTemplate}
        />
      ) : null}
    </div>
  );
}

/**
 * Whether `element` is narrower than the wide layout (`WIDE_LAYOUT_REM`), while `enabled`. Measured
 * before the first paint and again whenever it is resized. Until there is a width to go by (no
 * layout yet, or none at all, as in a test runner), it is the wide layout.
 */
function useNarrow(element: RefObject<HTMLElement | null>, enabled: boolean): boolean {
  const [narrow, setNarrow] = useState(false);
  useLayoutEffect(() => {
    const node = element.current;
    if (!enabled || !node) return;
    const measure = (width: number) => {
      if (width <= 0) return;
      const rem = parseFloat(getComputedStyle(node.ownerDocument.documentElement).fontSize) || 16;
      setNarrow(width < WIDE_LAYOUT_REM * rem);
    };
    measure(node.getBoundingClientRect().width);
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver((entries) => measure(entries[0]?.contentRect.width ?? 0));
    observer.observe(node);
    return () => observer.disconnect();
  }, [element, enabled]);
  return enabled && narrow;
}

/**
 * The panes of a narrow fill layout, as tabs: one shows at a time. Arrow keys move along them
 * (and show each), Home and End go to the ends, and only the shown one is a Tab stop. Four of
 * them and the More button fit one row of a 336px editor.
 */
function PaneSwitch({
  tabs,
  active,
  onChange,
  tabId,
  panelId,
}: {
  tabs: readonly PaneTab[];
  active: PaneTab;
  onChange: (tab: PaneTab) => void;
  tabId: (tab: PaneTab) => string;
  panelId: (tab: PaneTab) => string;
}) {
  const buttons = useRef(new Map<PaneTab, HTMLButtonElement>());

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number): void {
    const last = tabs.length - 1;
    const to =
      event.key === 'ArrowRight'
        ? index === last
          ? 0
          : index + 1
        : event.key === 'ArrowLeft'
          ? index === 0
            ? last
            : index - 1
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? last
              : -1;
    const next = tabs[to];
    if (!next) return;
    event.preventDefault();
    onChange(next);
    buttons.current.get(next)?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label="Editor panes"
      className="bl:inline-flex bl:h-8 bl:items-center bl:rounded-lg bl:bg-muted bl:p-[3px]"
    >
      {tabs.map((tab, index) => (
        <button
          key={tab}
          ref={(node) => {
            if (node) buttons.current.set(tab, node);
            else buttons.current.delete(tab);
          }}
          type="button"
          role="tab"
          id={tabId(tab)}
          aria-controls={panelId(tab)}
          aria-selected={active === tab}
          tabIndex={active === tab ? 0 : -1}
          onClick={() => onChange(tab)}
          onKeyDown={(event) => onKeyDown(event, index)}
          className={cn(
            'bl:inline-flex bl:h-full bl:items-center bl:rounded-md bl:px-2 bl:text-[0.8125rem] bl:font-medium bl:whitespace-nowrap bl:text-foreground/65 bl:outline-none bl:transition-colors',
            'bl:hover:text-foreground bl:focus-visible:ring-[3px] bl:focus-visible:ring-ring/50',
            'bl:aria-selected:bg-background bl:aria-selected:text-foreground bl:aria-selected:shadow-sm',
          )}
        >
          {PANE_LABELS[tab]}
        </button>
      ))}
    </div>
  );
}

/** Canvas or Preview: two toggle buttons in a labelled group. */
function ModeSwitch({
  mode,
  onChange,
}: {
  mode: EditorMode;
  onChange: (mode: EditorMode) => void;
}) {
  const option = (value: EditorMode, label: string) => (
    <button
      type="button"
      aria-pressed={mode === value}
      onClick={() => onChange(value)}
      className={cn(
        'bl:inline-flex bl:h-full bl:items-center bl:rounded-md bl:px-3 bl:text-[0.8125rem] bl:font-medium bl:whitespace-nowrap bl:text-foreground/65 bl:outline-none bl:transition-colors',
        'bl:hover:text-foreground bl:focus-visible:ring-[3px] bl:focus-visible:ring-ring/50',
        'bl:aria-pressed:bg-background bl:aria-pressed:text-foreground bl:aria-pressed:shadow-sm',
      )}
    >
      {label}
    </button>
  );
  return (
    <div
      role="group"
      aria-label="View"
      className="bl:inline-flex bl:h-8 bl:items-center bl:rounded-lg bl:bg-muted bl:p-[3px]"
    >
      {option('canvas', 'Canvas')}
      {option('preview', 'Preview')}
    </div>
  );
}

function EmptyPanel({ children }: { children: ReactNode }) {
  return <p className="bl:py-2 bl:text-sm bl:text-muted-foreground">{children}</p>;
}

/**
 * The issue's own settings: the subject and the preview line an inbox shows, and, for an issue
 * with dates, the period it covers. A new period is its own act ("Update period"), because it
 * refreshes every block a data source fills for the new dates.
 */
function SettingsPanel<B extends BlockBase>({
  editor,
  sources,
  readOnly,
}: {
  editor: NewsletterEditorApi<B>;
  sources: readonly DataSource[];
  readOnly: boolean;
}) {
  const { document } = editor;
  const confirm = useConfirm();
  const ids = useId();
  const [draft, setDraft] = useState<IssuePeriod | null>(null);
  const [updating, setUpdating] = useState(false);
  // The same rule New issue and Duplicate apply: an issue covers up to today, no further.
  const [today] = useState(() => todayInZone(undefined));
  const errors = draft ? periodErrors(draft, { today }) : {};
  const invalid = Object.keys(errors).length > 0;
  const sourced = document.blocks.filter((block) => sourceFor(block, sources)).length;

  async function applyPeriod(): Promise<void> {
    if (!draft || invalid || readOnly) return;
    if (
      sourced > 0 &&
      !(await confirm({
        title: `Refresh ${blockWord(sourced)} for the new dates?`,
        description:
          'Blocks filled from your data are read again for these dates, and what they list changes to match. Everything else in the issue stays as it is.',
        confirmLabel: 'Update period',
      }))
    ) {
      return;
    }
    setUpdating(true);
    try {
      await editor.updatePeriod(draft);
      setDraft(null);
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div className="bl:flex bl:min-w-0 bl:flex-col bl:gap-5">
      <h2 className="bl:text-[0.9375rem] bl:font-semibold bl:text-foreground">Settings</h2>
      <fieldset disabled={readOnly} className="bl:flex bl:min-w-0 bl:flex-col bl:gap-4">
        <Field className="bl:gap-2">
          <FieldLabel htmlFor={`${ids}-subject`}>Subject</FieldLabel>
          <Input
            id={`${ids}-subject`}
            value={document.subject}
            aria-describedby={`${ids}-subject-help`}
            onChange={(event) => editor.setSubject(event.target.value)}
          />
          <Hint id={`${ids}-subject-help`}>What an inbox shows first.</Hint>
        </Field>
        <Field className="bl:gap-2">
          <FieldLabel htmlFor={`${ids}-preheader`}>Preview line</FieldLabel>
          <Input
            id={`${ids}-preheader`}
            value={document.preheader}
            aria-describedby={`${ids}-preheader-help`}
            onChange={(event) => editor.setPreheader(event.target.value)}
          />
          <Hint id={`${ids}-preheader-help`}>The line an inbox shows under the subject.</Hint>
        </Field>
      </fieldset>

      {document.period ? (
        <div className="bl:flex bl:min-w-0 bl:flex-col bl:gap-3">
          <IssuePeriodFields
            value={draft ?? document.period}
            errors={errors}
            today={today}
            disabled={readOnly || updating}
            onChange={setDraft}
          />
          <div className="bl:flex bl:flex-col bl:gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="bl:self-start"
              disabled={readOnly || updating || !draft || invalid}
              aria-busy={updating || undefined}
              aria-describedby={`${ids}-period-help`}
              onClick={() => void applyPeriod()}
            >
              {updating ? 'Updating…' : 'Update period'}
            </Button>
            <p id={`${ids}-period-help`} className="bl:text-[0.8125rem] bl:text-muted-foreground">
              {sourced > 0
                ? `This refreshes the ${blockWord(sourced)} filled from your data for the dates above. Everything else stays as it is.`
                : 'No block here is filled from your data, so only the dates change.'}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
