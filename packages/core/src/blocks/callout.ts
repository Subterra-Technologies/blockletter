import { defineBlock } from '../definition';
import { field } from '../fields';
import { issuesFrom } from '../issues';
import { MISSING_BUTTON_LABEL, firstWords, plainWords } from './shared';

/**
 * A short heading, a paragraph and a button: "Have news to share?". Declared by its fields, the
 * first built-in to be; `CalloutBlock` in `types.ts` stays the type the JSON Schema is made from,
 * and a test holds the two to the same shape.
 */
export const calloutBlock = defineBlock({
  type: 'callout',
  label: 'Callout',
  description: 'A short heading, a sentence or two and a button.',
  group: 'content',
  fields: {
    heading: field.text({ default: 'Have news to share?' }),
    body: field.markdown({
      default:
        'Opening a new location, celebrating an anniversary or hiring? Send us your news and we will share it in a future issue.',
    }),
    ctaLabel: field.text({ label: 'Button label', default: 'Share your news' }),
    // No link yet: the button appears once one is added, rather than pointing anywhere by default.
    ctaUrl: field.url({ label: 'Button link' }),
  },
  issues: issuesFrom((block) => {
    const label = block.ctaLabel.trim();
    const url = block.ctaUrl.trim();
    if (label && !url) {
      return [{ code: 'missing_callout_link', message: 'Add a link so the button appears.' }];
    }
    if (url && !label) return [MISSING_BUTTON_LABEL];
    return [];
  }),
  summary: (block) => block.heading.trim() || firstWords(plainWords(block.body)),
  render(block, ctx) {
    const heading = block.heading.trim();
    const label = block.ctaLabel.trim();
    const hasButton = Boolean(label && block.ctaUrl.trim());
    if (!heading && !block.body.trim() && !hasButton) return '';
    const body = ctx.markdown(block.body);
    ctx.text(
      ...(heading ? [heading.toUpperCase()] : []),
      ...body.text,
      ...(hasButton ? [`${label}: ${ctx.url(block.ctaUrl)}`] : []),
      '',
    );
    return ctx.section(
      block,
      (heading ? ctx.heading(block.heading, { size: 20 }) : '') +
        body.html +
        (hasButton ? ctx.button(label, block.ctaUrl) : ''),
      { padding: '20px 32px' },
    );
  },
});
