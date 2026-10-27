import { test, expect } from '@playwright/test';

// Retain the existing massage regression suite in its original spa context.
// dual-experience.spec.js separately verifies the new default training journey.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('sfm-experience', 'spa'));
});

test.beforeEach(async ({ page }) => { await page.emulateMedia({ reducedMotion: 'reduce' }); });

test('finder stays compact until requested and shows approved menu choices at both durations', async ({ page }) => {
  await page.goto('/#treatments');
  const finder = page.locator('#treatment-finder');
  await expect(finder.locator('details')).not.toHaveAttribute('open');
  await expect(page.locator('#service-grid .service-card')).toHaveCount(6);
  await finder.locator('summary').click();
  await expect(finder.locator('.finder-results')).toBeHidden();
  await expect(page.locator('#finder-intent')).toHaveValue('');
  for (const [intent, ids, prices60, prices90] of [
    ['relax', ['relaxing-oil', 'head-neck'], ['€59.99', '€59.99'], ['€74.99', '€74.99']],
    ['active', ['deep-tissue'], ['€64.99'], ['€79.99']],
    ['together', ['duo-relaxing', 'duo-sports'], ['€119.99', '€124.99'], ['€139.99', '€144.99']],
  ]) {
    await page.locator('#finder-intent').selectOption(intent);
    for (const [duration, prices] of [['60', prices60], ['90', prices90]]) {
      await page.locator('#finder-duration').selectOption(duration);
      await expect(finder.locator('.finder-option')).toHaveCount(ids.length);
      for (const [index, id] of ids.entries()) {
        const option = finder.locator(`[data-finder-service="${id}"]`);
        await expect(option.locator('.finder-price')).toHaveText(prices[index]);
        await expect(option.locator('.finder-meta')).toContainText(`${duration} min`);
        if (intent === 'together') await expect(option).toContainText('total for two people');
      }
    }
  }
  await expect(finder).toContainText('Menu prices exclude travel.');
  await page.locator('#finder-intent').selectOption('');
  await expect(finder.locator('.finder-results')).toBeHidden();
  await expect(finder.locator('.finder-option')).toHaveCount(0);
});

test('finder carries its own selected duration into booking and returns to the full menu', async ({ page }) => {
  await page.goto('/#treatments');
  await page.locator('[data-filter="spa"]').click();
  await page.locator('#treatment-finder summary').click();
  await page.locator('#finder-intent').selectOption('active');
  await page.locator('#finder-duration').selectOption('90');
  await page.locator('#finder-travel-area').selectOption('antwerp');
  await expect(page.locator('.finder-travel-estimate')).toContainText('€89.98–€94.98');
  const choose = page.locator('[data-finder-service="deep-tissue"] .finder-choose');
  await choose.click();
  await expect(page.locator('#booking-dialog')).toBeVisible();
  await expect(page.locator('#booking-service')).toHaveValue('deep-tissue');
  await expect(page.locator('#booking-duration')).toHaveValue('90');
  await expect(page.locator('#booking-travel-area')).toHaveValue('antwerp');
  await expect(page.locator('#booking-dialog')).toContainText('€79.99');
  await page.keyboard.press('Escape');
  await expect(choose).toBeFocused();
  await page.locator('.finder-show-all').click();
  await expect(page.locator('#treatment-finder details')).not.toHaveAttribute('open');
  await expect(page.locator('[data-filter="all"]')).toBeFocused();
  await expect(page.locator('#service-grid .service-card')).toHaveCount(6);
  await page.locator('#treatment-finder summary').click();
  await expect(page.locator('#finder-intent')).toHaveValue('active');
  await expect(page.locator('#finder-duration')).toHaveValue('90');
  await expect(page.locator('#finder-travel-area')).toHaveValue('antwerp');
});

test('finder fits 320px and changing language keeps intent, duration and translated recommendations', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto('/?lang=fr#treatments');
  const finder = page.locator('#treatment-finder');
  await expect(finder.locator('summary')).toContainText('Aidez-moi à choisir');
  await finder.locator('summary').click();
  await page.locator('#finder-intent').selectOption('together');
  await page.locator('#finder-duration').selectOption('90');
  await page.locator('#finder-travel-area').selectOption('antwerp');
  await expect(finder.locator('.finder-price').first()).toContainText('139,99');
  await expect(finder.locator('.finder-travel-fee')).toContainText('déplacement');
  await expect(finder.locator('.finder-travel-estimate').first()).toContainText('149,98');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.locator('#site-language').selectOption('nl');
  await expect(finder.locator('summary')).toContainText('Help me kiezen');
  await expect(page.locator('#finder-intent')).toHaveValue('together');
  await expect(page.locator('#finder-duration')).toHaveValue('90');
  await expect(page.locator('#finder-travel-area')).toHaveValue('antwerp');
  await expect(finder.locator('.finder-travel-note')).toContainText('bevestigd');
  await expect(finder.locator('.finder-service-name').first()).not.toContainText('Duo Relaxing Oil');
  await expect(finder.locator('.finder-choose').first()).toHaveText('Kies deze massage');
  for (const control of await finder.locator('select, button').all()) {
    const box = await control.boundingBox();
    expect(box.height).toBeGreaterThanOrEqual(44);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.locator('#finder-travel-area').selectOption('outside');
  await expect(finder.locator('.finder-travel-estimate').first()).toContainText('offerte');
  await expect(finder.locator('.finder-travel-note')).toContainText('afstand');
});
