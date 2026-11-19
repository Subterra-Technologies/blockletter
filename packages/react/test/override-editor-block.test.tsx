import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  createBlock,
  footerBlock,
  overrideBlock,
  type BlockBase,
  type FooterBlock,
  type OverrideRender,
} from '@subterra-technologies/blockletter';
import { builtInEditorBlocks, overrideEditorBlock } from '../src/blocks';
import { NewsletterCanvas } from '../src/canvas/canvas';
import type { EditorBlockDefinition } from '../src/editor/types';
import { renderInEditor } from './helpers/render';

const callout = builtInEditorBlocks.find((definition) => definition.type === 'callout')!;

describe('overrideEditorBlock', () => {
  it('keeps the icon, form and drawing when the email HTML stays the same', () => {
    const ours = overrideEditorBlock(callout, { label: 'Notice' });
    expect(ours.label).toBe('Notice');
    expect(ours.icon).toBe(callout.icon);
    expect(ours.Editor).toBe(callout.Editor);
    expect(ours.Canvas).toBe(callout.Canvas);
  });

  it('drops the drawing for a new render, so the canvas shows the new email HTML', () => {
    const ours = overrideEditorBlock(callout, {
      render: (block, ctx) => ctx.section(block, '<p>Drawn our way</p>'),
    });
    expect(ours.Canvas).toBeUndefined();
    expect(ours.Editor).toBe(callout.Editor);

    const block: BlockBase = { ...createBlock('callout'), id: 'c1' };
    const definitions: readonly EditorBlockDefinition[] = [...builtInEditorBlocks, ours];
    renderInEditor(<NewsletterCanvas blocks={[block]} />, { context: { definitions } });
    expect(screen.getByText('Drawn our way')).toBeInTheDocument();
  });

  it('keeps a drawing given with the new render', () => {
    const Canvas = () => null;
    const ours = overrideEditorBlock(callout, {
      render: (block, ctx) => ctx.section(block, ''),
      Canvas,
    });
    expect(ours.Canvas).toBe(Canvas);
  });
});

describe('the README’s example', () => {
  it('overrides the footer in the email and the editor alike', () => {
    const render: OverrideRender<FooterBlock> = (block, ctx, base) => {
      base(block, ctx); // the plain-text lines; its HTML is not used
      return ctx.section(block, `<p style="${ctx.smallStyle()}">${ctx.escape(ctx.brand.name)}</p>`);
    };
    const footer = overrideBlock(footerBlock, { render });
    const footerEditor = overrideEditorBlock(
      builtInEditorBlocks.find(
        (definition) => definition.type === 'footer',
      ) as EditorBlockDefinition<FooterBlock>,
      { render },
    );
    const definitions: readonly EditorBlockDefinition[] = [...builtInEditorBlocks, footerEditor];
    expect(footer.type).toBe('footer');
    expect(definitions.at(-1)?.Canvas).toBeUndefined();
  });
});
