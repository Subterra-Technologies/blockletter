import { defineBlock } from '../definition';
import { issuesFrom } from '../issues';
import type { ButtonBlock } from '../types';
import { blockValidator } from '../validate';
import { MISSING_BUTTON_LABEL } from './shared';

/** One centred button, solid or outlined. */
export const buttonBlock = defineBlock<ButtonBlock>({
  type: 'button',
  label: 'Button',
  description: 'A solid or outline button with a link.',
  group: 'layout',
  create: () => ({ label: 'Learn more', url: '/', variant: 'solid' }),
  validate: (block, path) =>
    blockValidator(block, path, 'button')
      .string('label', { required: 'Give the button a label.' })
      .string('url', { required: 'Give the button a link.', label: 'link' })
      .oneOf('variant', ['solid', 'outline'], { label: 'button style' }).issues,
  issues: issuesFrom((block) => [
    ...(block.label.trim() ? [] : [MISSING_BUTTON_LABEL]),
    ...(block.url.trim()
      ? []
      : [{ code: 'missing_button_link', message: 'Give the button a link.' }]),
  ]),
  summary: (block) => block.label,
  render(block, ctx) {
    if (!block.label.trim()) return '';
    ctx.text(`${block.label}: ${ctx.url(block.url)}`, '');
    return ctx.section(
      block,
      `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto;"><tr><td align="center">${ctx.button(block.label, block.url, block.variant)}</td></tr></table>`,
      { padding: '12px 32px 20px 32px' },
    );
  },
});
