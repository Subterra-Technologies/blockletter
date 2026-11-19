import type { CSSProperties, ReactNode } from 'react';
import {
  MARKDOWN_HEADING_SIZES,
  isHexColor,
  parseInline,
  parseMarkdown,
  type InlineNode,
  type MarkdownBlock,
} from '@subterra-technologies/blockletter';
import { bodyStyle, type Canvas } from './shared';

/**
 * A free-text field's Markdown drawn on the canvas as the renderer draws it in the email
 * (`RenderContext.markdown`), from the same tree core reads (`parseMarkdown`), with the same
 * sizes and colours. React escapes every run; nothing is set as HTML. As everywhere on the canvas,
 * a link is a span that looks like one and a heading a paragraph in a heading's style: the drawing
 * sits inside the block's tab, the one control there.
 */

/** Links take the block's own text colour when it has one, as in the email. */
const linkColor = (canvas: Canvas): string => {
  const own = canvas.block.style?.textColor;
  return isHexColor(own) ? own : canvas.palette.link;
};

function Inline({ canvas, nodes }: { canvas: Canvas; nodes: readonly InlineNode[] }): ReactNode {
  return nodes.map((node, index) => {
    switch (node.kind) {
      case 'text':
        return node.text;
      case 'bold':
        return (
          <strong key={index}>
            <Inline canvas={canvas} nodes={node.children} />
          </strong>
        );
      case 'italic':
        return (
          <em key={index}>
            <Inline canvas={canvas} nodes={node.children} />
          </em>
        );
      case 'strike':
        return (
          <s key={index} style={{ textDecoration: 'line-through' }}>
            <Inline canvas={canvas} nodes={node.children} />
          </s>
        );
      case 'link':
        return (
          <span key={index} style={{ color: linkColor(canvas), textDecoration: 'underline' }}>
            <Inline canvas={canvas} nodes={node.children} />
          </span>
        );
    }
  });
}

const inline = (canvas: Canvas, text: string): ReactNode => (
  <Inline canvas={canvas} nodes={parseInline(text)} />
);

/** One run of text with its inline Markdown drawn, as `RenderContext.inlineMarkdown` draws it. */
export function EmailInlineMarkdown({ canvas, text }: { canvas: Canvas; text: string }) {
  return inline(canvas, text);
}

function Block({
  canvas,
  block,
  style,
}: {
  canvas: Canvas;
  block: MarkdownBlock;
  style: CSSProperties;
}) {
  const { palette, fonts, px } = canvas;
  switch (block.kind) {
    case 'paragraph':
      return <p style={style}>{inline(canvas, block.text)}</p>;
    case 'heading':
      return (
        <p
          style={{
            margin: '0 0 10px 0',
            fontFamily: fonts.heading,
            fontSize: px(MARKDOWN_HEADING_SIZES[block.level]),
            lineHeight: 1.25,
            fontWeight: block.level === 3 ? 'bold' : 'normal',
            color: palette.heading,
          }}
        >
          {inline(canvas, block.text)}
        </p>
      );
    case 'list': {
      const List = block.ordered ? 'ol' : 'ul';
      return (
        <List
          start={block.ordered && block.start !== 1 ? block.start : undefined}
          // The editor's reset takes list markers off; the email's lists keep theirs.
          style={{
            ...style,
            padding: '0 0 0 24px',
            listStyleType: block.ordered ? 'decimal' : 'disc',
          }}
        >
          {block.items.map((item, index) => (
            <li key={index} style={{ margin: '0 0 4px 0' }}>
              {inline(canvas, item)}
            </li>
          ))}
        </List>
      );
    }
    case 'quote':
      return (
        <blockquote
          style={{ ...style, padding: '0 0 0 14px', borderLeft: `3px solid ${palette.accent}` }}
        >
          {inline(canvas, block.text)}
        </blockquote>
      );
    case 'divider':
      return (
        <div
          aria-hidden="true"
          style={{ height: '1px', margin: '4px 0 16px 0', backgroundColor: palette.border }}
        />
      );
  }
}

/**
 * A body (a letter, an article, a column…) with its Markdown drawn, as `RenderContext.markdown`
 * draws it: paragraphs in `style` (default `bodyStyle`), headings, lists, quotes and dividers in
 * the block's colours and size.
 */
export function EmailMarkdown({
  canvas,
  body,
  style,
}: {
  canvas: Canvas;
  body: string;
  style?: CSSProperties;
}) {
  const paragraph = style ?? bodyStyle(canvas);
  return (
    <>
      {parseMarkdown(body).map((block, index) => (
        <Block key={index} canvas={canvas} block={block} style={paragraph} />
      ))}
    </>
  );
}

/**
 * A short field drawn as one paragraph of its own (a pull quote, a thank-you note, a list's
 * introduction): one `<p>` between `before` and `after` while it is plain or inline-formatted
 * text, drawn as a body, in `bodyStyle`, once it holds more.
 */
export function ShortMarkdown({
  canvas,
  source,
  style,
  bodyStyle: blockStyle = style,
  before,
  after,
}: {
  canvas: Canvas;
  source: string;
  style: CSSProperties;
  bodyStyle?: CSSProperties;
  before?: ReactNode;
  after?: ReactNode;
}) {
  const blocks = parseMarkdown(source);
  const only = blocks.length === 1 && blocks[0]?.kind === 'paragraph' ? blocks[0] : undefined;
  if (blocks.length > 0 && !only) {
    return <EmailMarkdown canvas={canvas} body={source} style={blockStyle} />;
  }
  // As typed, unless reading a pasted <br> or <p> changed it.
  const text = only && only.text !== source.trim() ? only.text : source;
  return (
    <p style={style}>
      {before}
      {inline(canvas, text)}
      {after}
    </p>
  );
}
