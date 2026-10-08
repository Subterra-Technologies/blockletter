import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * The demo as a visitor meets it: the built site, a fresh browser profile per test, and the
 * untouched sample issues. Each check is something the README promises.
 */

const WIDTHS = [1440, 768, 390, 320] as const;

/** Opens the demo and waits for the editor: its canvas, or its preview when the link asks. */
async function openDemo(page: Page, path = '/') {
  await page.goto(path);
  await expect(
    page.getByRole('tablist', { name: 'Canvas' }).or(page.getByRole('region', { name: 'Preview' })),
  ).toBeVisible();
}

/** The editor's Preview: a button beside Canvas when wide, one of its pane tabs when narrow. */
const previewControl = (page: Page) =>
  page
    .getByRole('button', { name: 'Preview', exact: true })
    .or(page.getByRole('tab', { name: 'Preview', exact: true }));

async function expectNoSidewaysScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, 'the page scrolls sideways').toBeLessThanOrEqual(0);
}

async function expectAccessible(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    // The preview is a sandboxed frame axe cannot enter; the email inside it is checked by the
    // renderer's own contrast rules.
    .exclude('iframe')
    .analyze();
  expect(results.violations.map((violation) => `${violation.id}: ${violation.help}`)).toEqual([]);
}

/** Selects `words` in a text box, the way a double-click or a drag would. */
async function selectWords(box: Locator, words: string) {
  await box.evaluate((root, words) => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const start = node.textContent?.indexOf(words) ?? -1;
      if (start < 0) continue;
      const range = document.createRange();
      range.setStart(node, start);
      range.setEnd(node, start + words.length);
      getSelection()?.removeAllRanges();
      getSelection()?.addRange(range);
      return;
    }
    throw new Error(`No text holds “${words}”`);
  }, words);
}

/** Focuses a text box and puts the caret at the very end of its text. */
async function caretAtEnd(box: Locator) {
  await box.focus();
  await box.evaluate((root) => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let last: Node | null = null;
    for (let node = walker.nextNode(); node; node = walker.nextNode()) last = node;
    if (last) getSelection()?.collapse(last, last.textContent?.length ?? 0);
  });
}

/** The Field Notes text block's form: beside the canvas when wide, its Edit pane when narrow. */
async function openTextBlock(page: Page) {
  await openDemo(page, '/?block=text');
  const edit = page.getByRole('tab', { name: 'Edit', exact: true });
  if (await edit.isVisible()) await edit.click();
  const text = page.getByRole('textbox', { name: 'Text', exact: true });
  await expect(text).toBeVisible();
  return { text, tools: page.getByRole('toolbar', { name: 'Text formatting' }) };
}

for (const width of WIDTHS) {
  test(`is accessible and fits the screen at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await openDemo(page);
    await expectNoSidewaysScroll(page);
    await expectAccessible(page);

    await previewControl(page).click();
    await expect(page.getByRole('region', { name: 'Preview' }).locator('iframe')).toBeVisible();
    await expectNoSidewaysScroll(page);
    await expectAccessible(page);

    await page.getByRole('link', { name: 'Docs', exact: true }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/assemble themselves/);
    await expectNoSidewaysScroll(page);
    await expectAccessible(page);
  });
}

for (const [width, height] of [
  [1440, 900],
  [1280, 720],
  [390, 844],
] as const) {
  test(`fills a ${width}x${height} screen without scrolling the page`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await openDemo(page);
    const fit = await page.evaluate(() => {
      const editor = document.querySelector('#workspace > .bl-root')?.getBoundingClientRect();
      return {
        overflow: document.documentElement.scrollHeight - document.documentElement.clientHeight,
        bottom: editor?.bottom ?? Infinity,
      };
    });
    expect(fit.overflow, 'the page scrolls').toBeLessThanOrEqual(0);
    expect(fit.bottom).toBeLessThanOrEqual(height);
  });
}

for (const width of WIDTHS) {
  test(`keeps the text formatting tools accessible and on the screen at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const { text, tools } = await openTextBlock(page);
    await text.click();
    await selectWords(text, 'patterns');
    await tools.getByRole('button', { name: 'Link' }).click();
    await expect(page.getByRole('group', { name: 'Add a link' })).toBeVisible();
    await expectNoSidewaysScroll(page);
    await expectAccessible(page);
  });
}

test('bolds a word in a text block with Ctrl+B', async ({ page }) => {
  const { text, tools } = await openTextBlock(page);
  await text.click();
  await selectWords(text, 'patterns');
  await page.keyboard.press('ControlOrMeta+B');
  await expect(tools.getByRole('button', { name: 'Bold' })).toHaveAttribute('aria-pressed', 'true');
  await previewControl(page).click();
  await expect(page.locator('iframe')).toHaveAttribute('srcdoc', /<strong>patterns<\/strong>/);
});

test('adds a link and a bulleted list from the formatting toolbar', async ({ page }) => {
  const { text, tools } = await openTextBlock(page);
  await text.click();
  await selectWords(text, 'custom builds');
  await tools.getByRole('button', { name: 'Link' }).click();
  const form = page.getByRole('group', { name: 'Add a link' });
  await form.getByRole('textbox', { name: 'Link address' }).fill('https://example.org/builds');
  await form.getByRole('button', { name: 'Add link' }).click();
  await expect(form).toBeHidden();
  await expect(text).toBeFocused();
  await expect(tools.getByRole('button', { name: 'Edit link' })).toBeVisible();

  const bulleted = tools.getByRole('button', { name: 'Bulleted list' });
  await bulleted.click();
  await expect(bulleted).toHaveAttribute('aria-pressed', 'true');
  // The canvas draws the list with its bullets, as the email does, despite the editor's reset.
  const drawing = page.locator('[data-block-id]').filter({ hasText: 'Each one born' });
  await expect(drawing.locator('ul')).toHaveCSS('list-style-type', 'disc');

  await previewControl(page).click();
  const frame = page.locator('iframe');
  await expect(frame).toHaveAttribute(
    'srcdoc',
    /<a href="https:\/\/example\.org\/builds" rel="noopener" target="_blank"[^>]*>custom builds<\/a>/,
  );
  await expect(frame).toHaveAttribute('srcdoc', /<ul[^>]*><li[^>]*>Each one born/);
});

test('formats text from the keyboard alone', async ({ page }) => {
  const { text, tools } = await openTextBlock(page);
  // Focused rather than clicked, the caret starts at the beginning of the text.
  await text.focus();
  for (let step = 0; step < 4; step += 1) await page.keyboard.press('Shift+ArrowRight');
  await page.keyboard.press('ControlOrMeta+K');
  const address = page.getByRole('textbox', { name: 'Link address' });
  await expect(address).toBeFocused();
  await address.fill('example.org');
  await address.press('Enter');
  await expect(text).toBeFocused();

  // Into the toolbar, a single tab stop, and along it with the arrow keys.
  await page.keyboard.press('Shift+Tab');
  await expect(tools.getByRole('button', { name: 'Bold' })).toBeFocused();
  for (let step = 0; step < 3; step += 1) await page.keyboard.press('ArrowRight');
  const bulleted = tools.getByRole('button', { name: 'Bulleted list' });
  await expect(bulleted).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(bulleted).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Tab');
  await expect(text).toBeFocused();
  // Back in the text, the selection is where it was left.
  expect(await page.evaluate(() => getSelection()?.toString())).toBe('Each');

  await previewControl(page).click();
  const frame = page.locator('iframe');
  await expect(frame).toHaveAttribute(
    'srcdoc',
    /<ul[^>]*><li[^>]*><a href="https:\/\/example\.org" rel="noopener" target="_blank"[^>]*>Each<\/a>/,
  );
});

test('undoes typing in formatted text a burst at a time, from the keys and the top bar', async ({
  page,
}) => {
  const { text } = await openTextBlock(page);
  await caretAtEnd(text);
  await page.keyboard.type(' First words.');
  // Typing joins one undo step until it pauses for longer than a second.
  await page.waitForTimeout(1_200);
  await page.keyboard.type(' Second words.');
  await expect(text).toHaveText(/custom builds\. First words\. Second words\.$/);

  // One press takes back exactly the last burst, and leaves the caret where it came out.
  await page.keyboard.press('ControlOrMeta+z');
  await expect(text).toHaveText(/custom builds\. First words\.$/);
  await expect(text).toBeFocused();
  const caret = await page.evaluate(() => {
    const selection = getSelection();
    return selection?.anchorNode?.textContent?.slice(0, selection.anchorOffset);
  });
  expect(caret).toMatch(/First words\.$/);

  // The top bar's Undo and Redo walk the same history.
  const undo = page.getByRole('button', { name: 'Undo', exact: true });
  const redo = page.getByRole('button', { name: 'Redo', exact: true });
  await undo.click();
  await expect(text).toHaveText(/custom builds\.$/);
  await redo.click();
  await expect(text).toHaveText(/custom builds\. First words\.$/);
  await redo.click();
  await expect(text).toHaveText(/custom builds\. First words\. Second words\.$/);
  await expect(redo).toBeDisabled();

  // A selection put in the text from outside (a script, assistive technology) takes the focus
  // there with it, and is the one formatted, not the caret the field last had.
  await selectWords(text, 'patterns');
  await page.keyboard.press('ControlOrMeta+B');
  await expect(text.locator('strong')).toHaveText('patterns');
});

test('goes to the docs and back with the editor as it was left', async ({ page }) => {
  await openDemo(page);
  await page
    .getByRole('region', { name: 'Block palette' })
    .getByRole('button', { name: 'Quote' })
    .click();
  const inspector = page.getByRole('region', { name: 'Inspector' });
  await expect(inspector.getByRole('heading', { name: 'Quote' })).toBeVisible();

  await page.getByRole('link', { name: 'Docs', exact: true }).click();
  await expect(page).toHaveURL(/#docs$/);
  await expect(page.getByRole('link', { name: 'Docs', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await expect(inspector).toBeHidden();

  await page.goBack();
  await expect(inspector.getByRole('heading', { name: 'Quote' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Editor', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );
});

test('deletes a block, undoes it and redoes it', async ({ page }) => {
  await openDemo(page);
  const quote = page.getByRole('tablist', { name: 'Canvas' }).getByRole('tab', { name: 'Quote' });
  await expect(page.getByRole('button', { name: 'Undo' })).toBeDisabled();
  await quote.click();
  await page.getByRole('button', { name: 'Delete Quote' }).click();

  // Nothing to confirm: the block goes at once, and its toast offers it back.
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
  await expect(quote).toHaveCount(0);
  const toast = page.getByRole('status').filter({ hasText: 'Quote deleted.' });
  await expect(toast).toBeVisible();
  await expectAccessible(page);

  await toast.getByRole('button', { name: 'Undo' }).click();
  await expect(quote).toHaveCount(1);
  await expect(quote).toHaveAttribute('aria-selected', 'true');
  await expect(quote).toBeFocused();
  await expect(page.getByText('Undid: deleted the Quote block.')).toBeVisible();

  await page.getByRole('button', { name: 'Redo' }).click();
  await expect(quote).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Redo' })).toBeDisabled();

  // The keys do the same, wherever the focus is in the editor.
  await page.keyboard.press('ControlOrMeta+z');
  await expect(quote).toHaveCount(1);
  await page.keyboard.press('ControlOrMeta+Shift+z');
  await expect(quote).toHaveCount(0);
});

test('undoes and redoes from the More menu on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openDemo(page);
  const quote = page.getByRole('tablist', { name: 'Canvas' }).getByRole('tab', { name: 'Quote' });
  await quote.click();
  await page.getByRole('button', { name: 'Delete Quote' }).click();
  await expect(quote).toHaveCount(0);

  const more = page.getByRole('button', { name: 'More' });
  await more.click();
  await page.getByRole('menuitem', { name: 'Undo' }).click();
  await expect(quote).toHaveCount(1);
  // The menu closes and hands the focus back to More.
  await expect(more).toBeFocused();
  await more.click();
  await expect(page.getByRole('menuitem', { name: 'Redo' })).toBeEnabled();
  await expectAccessible(page);
  await page.getByRole('menuitem', { name: 'Redo' }).click();
  await expect(quote).toHaveCount(0);
  await expectNoSidewaysScroll(page);
});

test('opens the docs at the section its address names', async ({ page }) => {
  await page.goto('/#rendering');
  const heading = page.getByRole('heading', { name: 'Rendering', level: 2 });
  await expect(heading).toBeInViewport();
  await expect(page.getByRole('navigation', { name: 'On this page' })).toBeVisible();
});

test('picks the sample from a sheet on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openDemo(page);
  // The email tools stay one tap away beside the sample button.
  await expect(page.getByRole('button', { name: 'Download .html' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Copy HTML' })).toBeVisible();

  const toggle = page.getByRole('button', { name: /^Sample/ });
  await toggle.click();
  const sheet = page.getByRole('dialog', { name: 'Sample data' });
  await expect(sheet).toBeVisible();
  // Modal, so the editor behind it is out of reach until it closes; Escape closes it.
  expect(await sheet.evaluate((element) => element.matches(':modal'))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(sheet).toBeHidden();
  await expect(toggle).toBeFocused();

  await toggle.click();
  await sheet.getByRole('combobox', { name: 'Sample organization' }).selectOption('makers-guild');
  await sheet.getByRole('button', { name: 'Done' }).click();
  await expect(sheet).toBeHidden();
  await expect(
    page.getByRole('tablist', { name: 'Canvas' }).getByRole('tab', { name: /^Event tiles/ }),
  ).toBeVisible();
});

test('opens on the Subterra issue', async ({ page }) => {
  await openDemo(page);
  await expect(page.getByRole('combobox', { name: 'Sample organization' })).toHaveValue('subterra');
  const canvas = page.getByRole('tablist', { name: 'Canvas' });
  await expect(canvas.getByRole('tab', { name: 'Banner' })).toBeVisible();
  await expect(canvas.getByRole('tab', { name: /^Post list/ })).toBeVisible();
});

test('adds a block from the palette and edits it in the inspector', async ({ page }) => {
  await openDemo(page);
  await page
    .getByRole('region', { name: 'Block palette' })
    .getByRole('button', { name: 'Quote' })
    .click();
  const inspector = page.getByRole('region', { name: 'Inspector' });
  await expect(inspector.getByRole('heading', { name: 'Quote' })).toBeVisible();
  const quote = inspector.getByRole('textbox', { name: 'Quote', exact: true });
  await quote.fill('Added in the end-to-end test.');
  await previewControl(page).click();
  await expect(page.locator('iframe')).toHaveAttribute('srcdoc', /Added in the end-to-end test\./);
});

test('shows the email in a sandboxed preview', async ({ page }) => {
  await openDemo(page, '/?view=preview');
  const frame = page.getByRole('region', { name: 'Preview' }).locator('iframe');
  await expect(frame).toHaveAttribute('sandbox', '');
  await expect(frame).toHaveAttribute('srcdoc', /Applied AI\./);
});

test('fills a list block from a data source and lets the editor pick items', async ({ page }) => {
  await openDemo(page, '/?org=makers-guild&block=event_tiles');
  const inspector = page.getByRole('region', { name: 'Inspector' });
  await expect(inspector.getByText('Filled from Guild events')).toBeVisible();
  const first = inspector.getByRole('checkbox', { name: 'Intro to Woodturning' });
  await expect(first).toBeChecked();
  await first.click();
  await expect(first).not.toBeChecked();
});

test('starts a new issue from a template', async ({ page }) => {
  await openDemo(page);
  const issues = page.getByRole('combobox', { name: 'Issue' });
  const before = await issues.locator('option').count();
  await page.getByRole('button', { name: 'New issue' }).click();
  const dialog = page.getByRole('dialog', { name: 'New issue' });
  // The whole card is the radio's label, as a pointer user meets it.
  await dialog.locator('label', { hasText: 'Simple update' }).click();
  await expect(dialog.getByRole('radio', { name: 'Simple update' })).toBeChecked();
  await dialog.getByRole('button', { name: 'Create issue' }).click();
  await expect(dialog).toBeHidden();
  await expect(issues.locator('option')).toHaveCount(before + 1);
});

test('keeps changes in the browser across a reload', async ({ page }) => {
  await openDemo(page);
  await page.getByRole('tab', { name: 'Settings' }).click();
  const subject = page.getByRole('textbox', { name: 'Subject' });
  await subject.fill('Field Notes · kept across a reload');
  await subject.blur();
  await page.reload();
  await expect(page.getByRole('combobox', { name: 'Issue' })).toContainText(
    'Field Notes · kept across a reload',
  );
});

test('downloads the email as HTML', async ({ page }) => {
  await openDemo(page);
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download .html' }).click();
  expect((await download).suggestedFilename()).toMatch(/^field-notes-.+\.html$/);
});

test('serves the email and its plain text on their own', async ({ page }) => {
  await page.goto('/?render=email');
  await expect(page.getByText('Applied AI.')).toBeVisible();
  await expect(page).toHaveTitle(/^Field Notes/);

  await page.goto('/?render=text');
  await expect(page.locator('pre')).toContainText('APPLIED AI.');
});
