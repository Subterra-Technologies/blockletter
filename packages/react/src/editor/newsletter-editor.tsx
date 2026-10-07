import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { BookmarkIcon, LockIcon, MoreHorizontalIcon } from 'lucide-react';
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
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Field, FieldLabel } from '../ui/field';
import { Input } from '../ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { EditorProvider, type EditorContextValue } from './context';
import type { EditorBlockDefinition } from './types';
import {
  useNewsletterEditor,
  type EditorMode,
  type NewsletterEditorApi,
} from './use-newsletter-editor';

export interface NewsletterEditorProps<B extends BlockBase = BuiltInBlock> {
  /** The document, controlled: every edit comes back through `onChange`. */
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
 * above); narrower, they stack, with nothing wider than the screen down to 320px.
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
  const { document, selected, insertTarget, mode, canvasRef } = editor;
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
  const canvasColumn = useRef<HTMLDivElement>(null);
  const inspectorColumn = useRef<HTMLElement>(null);
  /** Focus to move once the render it waits for is done: the inspector, or the palette. */
  const pendingFocus = useRef<'inspector' | 'palette' | null>(null);

  useEffect(() => {
    const target = pendingFocus.current;
    if (!target) return;
    if (target === 'palette') {
      pendingFocus.current = null;
      window.document.getElementById(paletteHeadingId)?.focus();
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
   * inspector is further down the page.
   */
  function pick(id: string, options?: { reveal?: boolean }): void {
    editor.select(id);
    if (options?.reveal === false) return;
    setTab((current) => (BLOCK_TABS.includes(current) ? current : 'block'));
    if (inspectorBeside()) pendingFocus.current = 'inspector';
  }

  /**
   * Canvas or Preview. A preview opened where the desktop email would have to shrink to fit (a
   * phone) starts on the phone width, which is readable there.
   */
  function changeMode(next: EditorMode): void {
    if (next === 'preview') {
      const room = canvasColumn.current?.getBoundingClientRect().width ?? 0;
      setPreviewWidth(room > 0 && room < DESKTOP_PREVIEW_ROOM ? 'phone' : 'desktop');
    }
    editor.setMode(next);
  }

  /** Insert above / below: the palette now places its choice at the line, so focus goes there. */
  function requestInsert(target: { index: number; label: string }): void {
    editor.requestInsert(target);
    pendingFocus.current = 'palette';
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
  }

  const count = document.blocks.length;
  const selectedRefreshing = selected && editor.refreshing.has(selected.id) ? selected.id : null;

  return (
    <>
      <div className="bl:flex bl:flex-wrap bl:items-center bl:gap-x-3 bl:gap-y-2 bl:border-b bl:px-3 bl:py-2">
        <ModeSwitch mode={mode} onChange={changeMode} />
        <div className="bl:ml-auto bl:flex bl:min-w-0 bl:flex-wrap bl:items-center bl:gap-2">
          {toolbar}
          {onSaveAsTemplate ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" size="icon-sm" aria-label="More">
                  <MoreHorizontalIcon aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bl:w-52">
                <DropdownMenuItem onSelect={() => setSavingTemplate(true)}>
                  <BookmarkIcon aria-hidden="true" />
                  Save as template…
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      </div>
      {readOnly ? (
        <p
          role="note"
          className="bl:flex bl:items-start bl:gap-2 bl:border-b bl:bg-muted bl:px-4 bl:py-2 bl:text-[0.8125rem] bl:text-muted-foreground"
        >
          <LockIcon aria-hidden="true" className="bl:mt-0.5 bl:size-4 bl:shrink-0" />
          <span>
            {readOnlyReason ?? 'This issue is read-only, so nothing in it can be changed.'}
          </span>
        </p>
      ) : null}

      <div
        className={cn(
          'bl:grid bl:min-w-0 bl:flex-1',
          readOnly
            ? 'bl:@5xl/editor:grid-cols-[minmax(0,1fr)_21rem]'
            : 'bl:@5xl/editor:grid-cols-[13rem_minmax(0,1fr)_21rem]',
        )}
      >
        {readOnly ? null : (
          <section
            aria-label="Block palette"
            className={cn(
              'bl:min-w-0 bl:border-b bl:px-2 bl:py-4',
              'bl:@5xl/editor:sticky bl:@5xl/editor:top-[var(--bl-sticky-top,0px)] bl:@5xl/editor:max-h-[calc(100dvh-var(--bl-sticky-top,0px))] bl:@5xl/editor:self-start bl:@5xl/editor:overflow-y-auto bl:@5xl/editor:border-b-0',
            )}
          >
            <BlockPalette
              headingId={paletteHeadingId}
              blocks={document.blocks}
              countLabel={`${count} of ${editor.maxBlocks} blocks`}
              insertLabel={insertTarget?.label ?? null}
              disabled={editor.full}
              draggable={mode === 'canvas'}
              onAdd={add}
              onCancelInsert={editor.cancelInsert}
              onDragStart={(type) => canvasRef.current?.paletteDragStart(type)}
              onDragEnd={() => canvasRef.current?.endDrag()}
            />
          </section>
        )}

        {/* The dividers between the panes are the canvas column's: it runs the full height, while
            the side panes stop where their content does. */}
        <div
          ref={canvasColumn}
          className={cn(
            'bl:flex bl:min-w-0 bl:flex-col',
            readOnly ? 'bl:@5xl/editor:border-r' : 'bl:@5xl/editor:border-x',
          )}
        >
          {mode === 'canvas' ? (
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
              onCancelInsert={editor.cancelInsert}
              onToggleHidden={editor.toggleHidden}
              onRefresh={(id) => void editor.refresh(id)}
              onRemove={(id) => void editor.remove(id)}
              onDuplicate={editor.duplicate}
            />
          ) : (
            <section
              aria-labelledby={previewHeadingId}
              className="bl:flex bl:min-w-0 bl:flex-1 bl:flex-col"
            >
              <h2 id={previewHeadingId} className="bl:sr-only">
                Preview
              </h2>
              <PreviewPane document={document} defaultWidth={previewWidth} />
            </section>
          )}
        </div>

        <section
          ref={inspectorColumn}
          id={inspectorId}
          aria-label="Inspector"
          className={cn(
            'bl:min-w-0 bl:border-t bl:p-3 bl:@md/editor:p-4',
            'bl:@5xl/editor:sticky bl:@5xl/editor:top-[var(--bl-sticky-top,0px)] bl:@5xl/editor:max-h-[calc(100dvh-var(--bl-sticky-top,0px))] bl:@5xl/editor:self-start bl:@5xl/editor:overflow-y-auto bl:@5xl/editor:border-t-0',
          )}
        >
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
    </>
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
