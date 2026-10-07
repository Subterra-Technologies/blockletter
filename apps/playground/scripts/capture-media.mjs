#!/usr/bin/env node
/**
 * Regenerates the README's screenshots and animations from the running playground.
 *
 *   npm run build -w apps/playground
 *   npx vite preview --port 4173            (in apps/playground)
 *   node apps/playground/scripts/capture-media.mjs
 *
 * Writes PNGs and GIFs to docs/media/. Every shot starts from a fresh browser profile, so the
 * demo shows its untouched sample issues. GIFs need ffmpeg on the PATH; without it the
 * recordings are kept as .webm.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, renameSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const BASE_URL = (process.env.BASE_URL ?? 'http://127.0.0.1:4173/').replace(/\/?$/, '/');
const OUT = fileURLToPath(new URL('../../../docs/media/', import.meta.url));
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();

/** The page scrolls smoothly for visitors; a capture must measure and shoot a settled page. */
const INSTANT_SCROLL = 'html { scroll-behavior: auto !important; }';

async function open(path, { width = 1440, height = 900, scale = 1.5 } = {}) {
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: scale,
  });
  const page = await context.newPage();
  await page.goto(new URL(path, BASE_URL).href);
  await page.addStyleTag({ content: INSTANT_SCROLL });
  return { context, page };
}

/**
 * Scrolls the editor to the top of the viewport (under the sticky section nav) and returns the
 * clip that frames it, so editor shots show the editor rather than the docs page around it.
 */
async function editorClip(page, maxHeight) {
  const box = await page.evaluate(() => {
    const editor = document.querySelector('.pg-editor > .bl-root');
    const nav = document.querySelector('.pg-nav');
    if (!editor) throw new Error('No editor on the page.');
    const navHeight = nav ? nav.getBoundingClientRect().height : 0;
    window.scrollTo({
      top: window.scrollY + editor.getBoundingClientRect().top - navHeight - 16,
      behavior: 'instant',
    });
    const rect = editor.getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, viewport: innerHeight };
  });
  await page.waitForTimeout(250);
  const pad = 12;
  return {
    x: Math.max(0, box.x - pad),
    y: Math.max(0, box.y - pad),
    width: box.width + pad * 2,
    height: Math.min(maxHeight, box.viewport - Math.max(0, box.y - pad)),
  };
}

/** Waits for the editor's canvas or preview, then for images and fonts to settle. */
async function settle(page) {
  await page.waitForSelector('main [role="tablist"], main iframe', { timeout: 20_000 });
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
}

/** A shot of the editor alone (`frame: 'editor'`) or of the viewport as a visitor sees it. */
async function shot(name, path, options = {}, act = async () => {}) {
  const { frame = 'editor', ...rest } = options;
  const { context, page } = await open(path, rest);
  await settle(page);
  await act(page);
  await page.waitForTimeout(300);
  const clip = frame === 'editor' ? await editorClip(page, rest.height ?? 900) : undefined;
  await page.screenshot({ path: join(OUT, name), ...(clip ? { clip } : {}) });
  await context.close();
  console.log(`  ${name}`);
}

console.log('Screenshots');

// The editor with a block selected: palette, canvas with the block toolbar, inspector.
await shot('editor.png', '?block=banner', { height: 1000, scale: 2 });

// The docs site as a visitor first meets it, and the social card for links to it (1200 x 630).
await shot('site.png', '', { height: 900, frame: 'page' });
await shot('og-image.png', '', { width: 1200, height: 630, scale: 1, frame: 'page' });

// The live Rendering section: the open issue's HTML, text, warnings and document.
await shot('rendering.png', '', { height: 900, frame: 'page' }, async (page) => {
  await page.locator('#rendering').evaluate((element) => element.scrollIntoView());
  await page.waitForTimeout(400);
});

// The email preview, desktop and phone widths.
await shot('preview-desktop.png', '?view=preview', { height: 1000 });
await shot('preview-phone.png', '?view=preview', { height: 1000 }, async (page) => {
  await page.getByRole('button', { name: 'Phone · 375px' }).click();
});

// A block filled from a data source, with its picker in the inspector.
await shot('data-sources.png', '?org=makers-guild&block=event_tiles', { height: 1000 });

// The brand kit.
await shot('brand-kit.png', '?tab=brand', { height: 1000 });

// Starting an issue from a template.
await shot(
  'new-issue.png',
  '?org=makers-guild&new=1',
  { height: 900, frame: 'page' },
  async (page) => {
    await page.getByRole('dialog', { name: 'New issue' }).waitFor();
  },
);

// The editor's dark palette (the email itself keeps its own colours).
await shot('dark.png', '?theme=dark&block=post_list', { height: 900 });

// Phones: the canvas, and the email preview at phone width (scrolled past the palette).
await shot(
  'mobile-canvas.png',
  '?block=banner',
  { width: 390, height: 844, scale: 2, frame: 'page' },
  async (page) => {
    await page
      .getByRole('tablist', { name: 'Canvas' })
      .evaluate((element) => element.scrollIntoView({ block: 'start' }));
  },
);
await shot(
  'mobile-preview.png',
  '?view=preview',
  { width: 390, height: 844, scale: 2, frame: 'page' },
  async (page) => {
    await page
      .getByRole('region', { name: 'Preview' })
      .evaluate((element) => element.scrollIntoView({ block: 'start' }));
  },
);

// The email exactly as an inbox receives it.
{
  const { context, page } = await open('?render=email', {
    width: 680,
    height: 1400,
    scale: 1.5,
    hideIntro: false,
  });
  await page.waitForSelector('text=Applied AI.');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: join(OUT, 'email.png'), fullPage: true });
  await context.close();
  console.log('  email.png');
}

console.log('Animations');

/**
 * Records `act` and converts it to a GIF. The recording starts when the page is created, so
 * the blank first moments are trimmed using the time `act` begins.
 */
async function record(name, path, act, { width = 1280, height = 760 } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'blockletter-video-'));
  const context = await browser.newContext({
    viewport: { width, height },
    recordVideo: { dir, size: { width, height } },
  });
  const started = Date.now();
  const page = await context.newPage();
  await page.goto(new URL(path, BASE_URL).href);
  await page.addStyleTag({ content: INSTANT_SCROLL });
  await settle(page);
  await editorClip(page, height);
  const trim = (Date.now() - started) / 1000;
  await act(page);
  await page.waitForTimeout(800);
  await context.close();
  const video = readdirSync(dir).find((file) => file.endsWith('.webm'));
  if (!video) throw new Error(`No recording was saved for ${name}.`);
  const source = join(dir, video);
  try {
    execFileSync(
      'ffmpeg',
      [
        '-y',
        '-loglevel',
        'error',
        '-ss',
        trim.toFixed(2),
        '-i',
        source,
        '-vf',
        'fps=10,scale=960:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=96:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle',
        join(OUT, `${name}.gif`),
      ],
      { stdio: 'inherit' },
    );
    console.log(`  ${name}.gif`);
  } catch {
    renameSync(source, join(OUT, `${name}.webm`));
    console.log(`  ${name}.webm (ffmpeg unavailable)`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const pause = (page, ms) => page.waitForTimeout(ms);

// Building an issue: add a block, write in it, move it from the keyboard, preview it.
await record('editing', '', async (page) => {
  await pause(page, 900);
  await page
    .getByRole('region', { name: 'Block palette' })
    .getByRole('button', { name: 'Quote' })
    .click();
  await pause(page, 900);
  const quote = page.getByRole('textbox', { name: 'Quote', exact: true });
  await quote.fill('');
  await quote.pressSequentially('Every block here was added, edited and moved in a few seconds.', {
    delay: 22,
  });
  await page.getByRole('textbox', { name: 'Who said it (optional)' }).fill('The Blockletter demo');
  await pause(page, 600);
  const tab = page.getByRole('tab', { name: /^Quote/ }).last();
  await tab.focus();
  for (let step = 0; step < 4; step += 1) {
    await page.keyboard.press('Alt+ArrowUp');
    await pause(page, 450);
  }
  await pause(page, 600);
  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  await pause(page, 1800);
  await page.getByRole('button', { name: 'Phone · 375px' }).click();
  await pause(page, 1800);
  await page.getByRole('button', { name: 'Canvas', exact: true }).click();
  await pause(page, 900);
});

// An issue that fills itself: start one from a template, then pick which events it shows.
await record('assembling', '?org=makers-guild', async (page) => {
  await pause(page, 800);
  await page.getByRole('button', { name: 'New issue' }).click();
  const dialog = page.getByRole('dialog', { name: 'New issue' });
  await dialog.waitFor();
  await pause(page, 900);
  await dialog.getByRole('combobox', { name: 'Period' }).click();
  await pause(page, 500);
  await page.getByRole('option', { name: 'Last month' }).click();
  await pause(page, 1000);
  await page.getByRole('button', { name: 'Create issue' }).click();
  await page.getByRole('dialog', { name: 'New issue' }).waitFor({ state: 'hidden' });
  await pause(page, 1400);
  await page.getByRole('tab', { name: /^Event tiles/ }).click();
  await pause(page, 1200);
  const picker = page.getByRole('region', { name: 'Inspector' });
  await picker.getByRole('checkbox', { name: 'Repair Café' }).click();
  await pause(page, 900);
  await picker.getByRole('checkbox', { name: 'Winter Craft Fair' }).click();
  await pause(page, 1400);
});

await browser.close();
console.log(`Written to ${OUT}`);
