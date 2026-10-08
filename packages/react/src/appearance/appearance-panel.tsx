import { useId } from 'react';
import { RotateCcwIcon } from 'lucide-react';
import {
  BLOCK_ALIGNMENTS,
  BLOCK_FONT_SIZES,
  BLOCK_PADDINGS,
  isHexColor,
  resolvePalette,
  type BlockBase,
  type BlockStyle,
} from '@subterra-technologies/blockletter';
import { useEditorContext } from '../editor/context';
import { blockName } from '../i18n/blocks';
import { useEditorMessages } from '../i18n/context';
import { styleSummaryText } from '../i18n/core-words';
import { Button } from '../ui/button';
import { Field, FieldLabel } from '../ui/field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { ColorField, type ColorSwatch } from './color-field';
import { CheckField, FieldPair, Note } from '../inspector/editor-fields';

export interface AppearancePanelProps<B extends BlockBase = BlockBase> {
  block: B;
  /** The whole next block, its `style` changed; the key is removed once nothing is overridden. */
  onChange: (block: B) => void;
  /** Every control disabled. Defaults to the editor's own `readOnly`. */
  readOnly?: boolean;
  /** Id of the panel's heading, which an editor may focus when the panel opens. */
  headingId?: string;
}

type ChoiceKey = 'align' | 'paddingY' | 'fontSize';

/**
 * How one block looks: background and text colour (the brand kit's swatches plus the browser's
 * picker), alignment, spacing, text size, an edge-to-edge band and a hairline under it. Every
 * field is an override; clearing it hands the block back to the brand kit and the block's own
 * defaults.
 */
export function AppearancePanel<B extends BlockBase>({
  block,
  onChange,
  readOnly,
  headingId,
}: AppearancePanelProps<B>) {
  const editor = useEditorContext();
  const { brand, definitions } = editor;
  const m = useEditorMessages();
  const words = m.appearance;
  const locked = readOnly ?? editor.readOnly;
  const ids = useId();
  const heading = headingId ?? `${ids}-heading`;
  const style: BlockStyle = block.style ?? {};
  const hasStyle = Object.keys(style).length > 0;
  const palette = resolvePalette(brand);
  const swatches: ColorSwatch[] = [
    { label: words.swatches.page, value: brand.colors?.page },
    { label: words.swatches.ink, value: brand.colors?.ink },
    { label: words.swatches.accent, value: brand.colors?.accent },
    { label: words.swatches.highlight, value: brand.colors?.highlight },
    { label: words.swatches.white, value: '#ffffff' },
  ].filter((swatch): swatch is ColorSwatch => isHexColor(swatch.value));

  /** The block with `nextStyle`, or without a `style` key at all once it is empty. */
  function withStyle(nextStyle: BlockStyle): B {
    const { style: _previous, ...rest } = block;
    return (Object.keys(nextStyle).length ? { ...rest, style: nextStyle } : rest) as B;
  }

  /** Merges style fields; an `undefined` value removes that override. */
  function patch(changes: BlockStyle): void {
    const nextStyle: BlockStyle = { ...style, ...changes };
    for (const key of Object.keys(changes) as (keyof BlockStyle)[]) {
      if (changes[key] === undefined) delete nextStyle[key];
    }
    onChange(withStyle(nextStyle));
  }

  const choice = <K extends ChoiceKey>(
    key: K,
    label: string,
    options: readonly NonNullable<BlockStyle[K]>[],
    fallback: NonNullable<BlockStyle[K]>,
    names: Readonly<Record<NonNullable<BlockStyle[K]>, string>>,
  ) => {
    const id = `${ids}-${key}`;
    return (
      <Field className="bl:gap-2">
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        <Select
          value={style[key] ?? fallback}
          disabled={locked}
          onValueChange={(chosen) =>
            patch({ [key]: chosen === fallback ? undefined : chosen } as BlockStyle)
          }
        >
          <SelectTrigger id={id} className="bl:w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option} value={option}>
                {names[option]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
    );
  };

  return (
    <div className="bl:flex bl:min-w-0 bl:flex-col bl:gap-5">
      <div className="bl:flex bl:flex-col bl:gap-1">
        <div className="bl:flex bl:items-start bl:justify-between bl:gap-3">
          <h2
            id={heading}
            tabIndex={-1}
            className="bl:text-[0.9375rem] bl:font-semibold bl:text-foreground bl:outline-none"
          >
            {blockName(block.type, definitions, m)}
          </h2>
          {hasStyle && !locked ? (
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={() => onChange(withStyle({}))}
              className="bl:-mt-0.5"
            >
              <RotateCcwIcon aria-hidden="true" />
              {words.reset}
            </Button>
          ) : null}
        </div>
        <p className="bl:text-xs bl:text-muted-foreground">{styleSummaryText(block.style, m)}</p>
        <Note>{words.note}</Note>
      </div>
      <fieldset
        disabled={locked}
        aria-labelledby={heading}
        className="bl:flex bl:min-w-0 bl:flex-col bl:gap-5"
      >
        <ColorField
          label={words.background}
          controlId={`${ids}-background`}
          value={style.background}
          fallback={palette.card}
          fallbackLabel={words.backgroundDefault}
          swatches={swatches}
          disabled={locked}
          onValueChange={(value) => patch({ background: value })}
        />
        <ColorField
          label={words.textColor}
          controlId={`${ids}-text`}
          value={style.textColor}
          fallback={palette.text}
          fallbackLabel={words.textColorDefault}
          swatches={swatches}
          disabled={locked}
          onValueChange={(value) => patch({ textColor: value })}
        />
        {choice('align', words.align, BLOCK_ALIGNMENTS, 'left', words.alignments)}
        <FieldPair>
          {choice('paddingY', words.padding, BLOCK_PADDINGS, 'normal', words.paddings)}
          {choice('fontSize', words.fontSize, BLOCK_FONT_SIZES, 'normal', words.fontSizes)}
        </FieldPair>
        <div className="bl:flex bl:flex-col bl:gap-3">
          <CheckField
            id={`${ids}-full-width`}
            label={words.fullWidth}
            checked={style.fullWidth === true}
            disabled={locked}
            onChange={(checked) => patch({ fullWidth: checked || undefined })}
          />
          <CheckField
            id={`${ids}-divider`}
            label={words.divider}
            checked={style.divider === true}
            disabled={locked}
            onChange={(checked) => patch({ divider: checked || undefined })}
          />
        </div>
      </fieldset>
    </div>
  );
}
