import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

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
