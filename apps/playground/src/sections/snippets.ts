/** The code the docs show. Each one is written against the real API, not a sketch of it. */

export const EDITOR_SNIPPET = `
import { NewsletterEditor } from '@subterra-technologies/blockletter-react';
import '@subterra-technologies/blockletter-react/styles.css';

export function IssueEditor({ issue, brand, onSave }) {
  const [doc, setDoc] = useState(issue);
  return (
    <NewsletterEditor
      fill // take the container's height, each pane scrolling on its own
      value={doc}
      onChange={setDoc}
      brand={brand}
      sources={[eventsSource, postsSource]}
      uploadImage={uploadToYourStorage} // (file) => Promise<{ url }>
      toolbar={<button onClick={() => onSave(doc)}>Save draft</button>}
    />
  );
}
`;

export const BLOCK_SNIPPET = `
import { blockValidator, defineBlock } from '@subterra-technologies/blockletter';

export const jobBlock = defineBlock<JobBlock>({
  type: 'job',
  label: 'Job opening',
  description: 'A role you are hiring for, with an apply button.',
  group: 'content',
  create: () => ({ title: 'Full stack developer', url: '/careers' }),
  validate: (block, path) =>
    blockValidator(block, path, 'job').string('title').string('url').issues,
  render(block, ctx) {
    ctx.text(block.title, \`Apply: \${ctx.url(block.url)}\`, '');
    return ctx.section(block, ctx.heading(block.title) + ctx.button('Apply', block.url));
  },
});
`;

export const SOURCE_SNIPPET = `
import type { DataSource } from '@subterra-technologies/blockletter';

export const eventsSource: DataSource<'event_tiles'> = {
  id: 'events',
  label: 'Our events',
  blockType: 'event_tiles',
  async items({ period }) {
    const events = await db.events.upcoming({ after: period?.end });
    return events.map((event) => ({
      ref: event.id, // so a refresh knows which items came from you
      title: event.title,
      date: event.date, // 'YYYY-MM-DD'
      time: event.startsAt,
      url: \`/events/\${event.slug}\`,
    }));
  },
};
`;

export const RENDER_SNIPPET = `
import { renderEmail } from '@subterra-technologies/blockletter';

const { html, text, warnings } = renderEmail(issue, {
  brand,
  baseUrl: 'https://example.org', // relative links resolve against this
  unsubscribeUrl: '{{unsubscribe_url}}', // inserted verbatim: your provider's merge tag
});

if (warnings.length) console.warn(warnings);
await yourEmailProvider.send({ from, to, subject: issue.subject, html, text });
`;
