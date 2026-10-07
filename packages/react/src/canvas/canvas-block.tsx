import { Component, memo, useMemo, type ReactNode } from 'react';
import {
  readable,
  renderBlock,
  sanitizeHtml,
  type BlockBase,
} from '@subterra-technologies/blockletter';
import type { EditorBlockDefinition } from '../editor/types';
import { canvasProps, type CanvasTheme } from './canvas-theme';
import { CanvasSection, CanvasNote } from './blocks/shared';

export interface CanvasBlockProps {
  block: BlockBase;
  /** Undefined when nothing defines the block's type. */
  definition: EditorBlockDefinition | undefined;
  /** Every definition in play, for drawing a block from its email HTML. */
  definitions: readonly EditorBlockDefinition[];
  theme: CanvasTheme;
}

/**
 * One block, drawn the way the email draws it: by its definition's `Canvas`; for a block that has
 * none (a host's own), from its email HTML; for a type nothing defines, as a placeholder that
 * says so. Memoised, so choosing or moving one block redraws none of the others.
 */
export const CanvasBlock = memo(function CanvasBlock({
  block,
  definition,
  definitions,
  theme,
}: CanvasBlockProps) {
  if (!definition) {
    return (
      <Note theme={theme}>
        Unknown block “{block.type}”. Nothing defines it, so the email leaves it out.
      </Note>
    );
  }
  const Drawing = definition.Canvas;
  return (
    <DrawingBoundary block={block} label={definition.label} theme={theme}>
      {Drawing ? (
        <Drawing {...canvasProps(block, theme)} />
      ) : (
        <HtmlBlock block={block} definitions={definitions} theme={theme} />
      )}
    </DrawingBoundary>
  );
});

/**
 * A block with no drawing of its own, shown as its email HTML in the card's table. The HTML goes
 * through core's sanitiser first, because a host's `render` may pass through text it never
 * escaped, and this is the editor's page, not a sandboxed preview. It is `inert`: its links and
 * buttons are pictures of the email, not places to tab to or click.
 */
function HtmlBlock({
  block,
  definitions,
  theme,
}: {
  block: BlockBase;
  definitions: readonly EditorBlockDefinition[];
  theme: CanvasTheme;
}) {
  const html = useMemo(() => {
    try {
      const options = { ...theme.options, brand: theme.brand, definitions, annotate: false };
      return sanitizeHtml(renderBlock(block, options).html);
    } catch {
      return null;
    }
  }, [block, definitions, theme]);

  if (html === null) {
    return <Note theme={theme}>This block could not be drawn. The preview shows its email.</Note>;
  }
  if (!html.trim()) {
    const canvas = canvasProps(block, theme);
    return (
      <CanvasSection canvas={canvas} background={theme.palette.card}>
        <CanvasNote canvas={canvas} background={theme.palette.card}>
          Nothing to show yet. The block stays out of the email until it has content.
        </CanvasNote>
      </CanvasSection>
    );
  }
  return (
    <div inert className="bl:[&_td]:p-0 bl:[&_td]:align-top">
      <table
        role="presentation"
        cellPadding={0}
        cellSpacing={0}
        style={{ width: '100%', borderCollapse: 'collapse' }}
      >
        <tbody dangerouslySetInnerHTML={{ __html: html }} />
      </table>
    </div>
  );
}

/** A dashed, italic line on the card: what stands in for a block that cannot be drawn. */
function Note({ theme, children }: { theme: CanvasTheme; children: ReactNode }) {
  const { palette, fonts } = theme;
  return (
    <div style={{ padding: '20px 32px', backgroundColor: palette.card }}>
      <p
        style={{
          margin: 0,
          padding: '14px 16px',
          border: `1px dashed ${palette.border}`,
          borderRadius: '8px',
          fontFamily: fonts.body,
          fontSize: '13px',
          lineHeight: 1.5,
          fontStyle: 'italic',
          color: readable(palette.muted, palette.card),
        }}
      >
        {children}
      </p>
    </div>
  );
}

interface BoundaryProps {
  block: BlockBase;
  label: string;
  theme: CanvasTheme;
  children: ReactNode;
}

interface BoundaryState {
  block: BlockBase;
  failed: boolean;
}

/**
 * Keeps one block's drawing from taking the whole canvas down: a host's `Canvas` that throws is
 * replaced by a note, and tried again once the block changes.
 */
class DrawingBoundary extends Component<BoundaryProps, BoundaryState> {
  override state: BoundaryState = { block: this.props.block, failed: false };

  static getDerivedStateFromError(): Partial<BoundaryState> {
    return { failed: true };
  }

  static getDerivedStateFromProps(
    props: BoundaryProps,
    state: BoundaryState,
  ): Partial<BoundaryState> | null {
    return props.block === state.block ? null : { block: props.block, failed: false };
  }

  override render() {
    if (!this.state.failed) return this.props.children;
    return (
      <Note theme={this.props.theme}>
        The {this.props.label} block could not be drawn. The preview shows its email.
      </Note>
    );
  }
}
