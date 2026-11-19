import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BriefcaseIcon } from 'lucide-react';
import { describe, expect, expectTypeOf, it } from 'vitest';
import {
  builtInBlocks,
  createDocument,
  defineBlock,
  field,
  renderEmail,
  validateDocument,
  type BlockOf,
} from '@subterra-technologies/blockletter';
import { builtInEditorBlocks, defineEditorBlock } from '../src/blocks';
import { renderEditor } from './helpers/editor-registry';

// The README's "Add your own block" example, as written there.
const jobBlock = defineBlock({
  type: 'job',
  label: 'Job opening',
  description: 'A role you are hiring for, with an apply button.',
  group: 'content',
  fields: {
    title: field.text({ default: 'Full stack developer', max: 120 }),
    location: field.text({ default: 'Remote' }),
    summary: field.markdown({ help: 'Two or three sentences about the role.' }),
    url: field.url({ label: 'Apply link', default: '/careers' }),
  },
  render(block, ctx) {
    const summary = ctx.markdown(block.summary);
    ctx.text(
      block.title.toUpperCase(),
      block.location,
      ...summary.text,
      `Apply: ${ctx.url(block.url)}`,
      '',
    );
    return ctx.section(
      block,
      ctx.html`
        ${ctx.heading(block.title, { size: 20 })}
        <p style="${ctx.smallStyle()}">${block.location}</p>
        ${summary}
        ${ctx.button('Apply', block.url)}
      `,
    );
  },
});

type JobBlock = BlockOf<typeof jobBlock>;

const jobEditorBlock = defineEditorBlock({ ...jobBlock, icon: BriefcaseIcon });

describe('the README’s own-block example', () => {
  const job: JobBlock = { ...jobBlock.create(), id: 'j1', type: 'job', hidden: false };

  it('types, validates and renders the block', () => {
    expectTypeOf<JobBlock['summary']>().toEqualTypeOf<string>();
    const doc = createDocument({
      subject: 'Hiring',
      blocks: [{ ...job, summary: 'We **ship**.' }],
    });
    const definitions = [...builtInBlocks, jobBlock];
    expect(validateDocument(doc, definitions)).toEqual([]);
    const email = renderEmail(doc, { definitions, baseUrl: 'https://example.test' });
    expect(email.html).toContain('<strong>ship</strong>');
    expect(email.html).toMatch(/<\/h2><p style="[^"]*">Remote<\/p><p/);
    expect(email.text).toContain('Apply: https://example.test/careers');
  });

  it('gets its form from its fields', async () => {
    expect([...builtInEditorBlocks, jobEditorBlock].at(-1)?.icon).toBe(BriefcaseIcon);
    const { latest } = renderEditor(jobEditorBlock.Editor, job);
    expect(screen.getByLabelText('Summary')).toHaveAccessibleDescription(
      /Two or three sentences about the role\./,
    );
    await userEvent.type(screen.getByLabelText('Location'), ' (UK)');
    expect(latest().location).toBe('Remote (UK)');
  });
});
