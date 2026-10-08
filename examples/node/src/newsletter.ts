/**
 * This month's issue, assembled from a built-in template and `data/events.json`, rendered, and
 * written to `out/`. With `--send`, and RESEND_API_KEY, FROM and TO set, it is also sent through
 * Resend; otherwise this is a dry run.
 *
 *   npm start      # dry run: out/issue.html, out/issue.txt and out/issue.json
 *   npm run send   # the same, then send it, reading .env if there is one
 */
import { mkdir, writeFile } from 'node:fs/promises';
import {
  assembleDocument,
  BUILT_IN_TEMPLATES,
  periodLabel,
  renderEmail,
  suggestPeriod,
  todayIn,
  type EventTilesBlock,
  type NewsletterDocument,
} from '@subterra-technologies/blockletter';
import { BRAND, SITE_URL, TIME_ZONE } from './brand.ts';
import { eventsSource } from './events-source.ts';
import { sendWithResend } from './resend.ts';

const LETTER = `The workshop is warm again, and the sharpening station finally has its new stones.

Thank you to everyone who returned a borrowed tool early this month so a neighbour could use it. Bring a friend to one of the sessions below: everything is free for members.`;

const template = BUILT_IN_TEMPLATES.find((item) => item.id === 'monthly-newsletter');
if (!template) throw new Error('The monthly newsletter template is missing.');

// This month so far, looking six weeks ahead for events: where the editor starts a new issue too.
const period = suggestPeriod(todayIn(TIME_ZONE));
const assembled = await assembleDocument(template, {
  period,
  brand: BRAND,
  sources: [eventsSource],
});

// A person usually writes the letter in the editor. A document is plain data, though, so code can
// fill any block too, including what a template cannot know, such as where readers send news.
const issue: NewsletterDocument = {
  ...assembled,
  blocks: assembled.blocks.map((block) => {
    if (block.type === 'letter' && !block.body) {
      return { ...block, body: LETTER, signature: 'Robin, for the volunteers' };
    }
    if (block.type === 'callout' && !block.ctaUrl) {
      return { ...block, ctaUrl: `mailto:${BRAND.contact.email}` };
    }
    return block;
  }),
};

// Every reader needs a way to stop receiving the newsletter. The renderer puts this link in the
// footer, and warns when there is none.
const unsubscribeUrl = process.env.UNSUBSCRIBE_URL || undefined;
const { html, text, warnings } = renderEmail(issue, {
  brand: BRAND,
  baseUrl: SITE_URL,
  unsubscribeUrl,
});

const out = new URL('../out/', import.meta.url);
await mkdir(out, { recursive: true });
await Promise.all([
  writeFile(new URL('issue.html', out), html),
  writeFile(new URL('issue.txt', out), text),
  writeFile(new URL('issue.json', out), `${JSON.stringify(issue, null, 2)}\n`),
]);

const tiles = issue.blocks.find((block): block is EventTilesBlock => block.type === 'event_tiles');
const events = tiles && !tiles.hidden ? tiles.items.length : 0;
console.log(`Assembled "${issue.subject}" for ${periodLabel(period)}.`);
console.log(
  events > 0
    ? `Upcoming events: ${events}, from data/events.json.`
    : `No events in data/events.json fall between ${period.end} and ${period.lookaheadEnd}, so the event tiles are left out.`,
);
console.log(
  `Wrote out/issue.html (${(html.length / 1024).toFixed(1)} KB), out/issue.txt and out/issue.json.`,
);

if (warnings.length > 0) {
  console.log('\nBefore sending, the renderer says:');
  for (const warning of warnings) console.log(`  - ${warning}`);
}
if (!unsubscribeUrl) {
  console.log(
    "\nA real newsletter needs an unsubscribe link: renderEmail's `unsubscribeUrl` puts it in the " +
      "footer (each reader's own link, or your provider's merge tag). Set UNSUBSCRIBE_URL to try it.",
  );
}

const { RESEND_API_KEY, FROM, TO } = process.env;
if (!process.argv.includes('--send')) {
  console.log('\nDry run: nothing was sent. `npm run send` sends it through Resend.');
} else if (!RESEND_API_KEY || !FROM || !TO) {
  const missing = Object.entries({ RESEND_API_KEY, FROM, TO })
    .filter(([, value]) => !value)
    .map(([name]) => name);
  const names = new Intl.ListFormat('en', { type: 'conjunction' }).format(missing);
  console.log(`\nDry run: sending needs ${names} set (see .env.example). Nothing was sent.`);
} else {
  try {
    // Every address in TO gets this same message. A real newsletter sends one per reader, each
    // with that reader's own unsubscribe link (Resend's batch endpoint takes 100 at a time).
    const id = await sendWithResend(RESEND_API_KEY, {
      from: FROM,
      to: TO.split(',').map((address) => address.trim()),
      subject: issue.subject,
      html,
      text,
      // The one-click unsubscribe mail apps show beside the sender.
      ...(unsubscribeUrl ? { headers: { 'List-Unsubscribe': `<${unsubscribeUrl}>` } } : {}),
    });
    console.log(`\nSent to ${TO} through Resend (email ${id}).`);
  } catch (error) {
    console.error(`\n${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
