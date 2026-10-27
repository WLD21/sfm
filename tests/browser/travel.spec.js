import { test, expect } from '@playwright/test';

// Retain the existing massage regression suite in its original spa context.
// dual-experience.spec.js separately verifies the new default training journey.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('sfm-experience', 'spa'));
});
import { readFile } from 'node:fs/promises';

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#treatments');
  await page.locator('#service-grid [data-book]').first().click();
});

async function advance(page) {
  await page.locator('#booking-dialog .booking-next').click();
}

async function fillVisit(page, area = 'antwerp') {
  await page.locator('#booking-travel-area').selectOption(area);
  await page.locator('#booking-date').fill(await page.locator('#booking-date').getAttribute('min'));
  await page.locator('#booking-town').fill(area === 'antwerp' ? '2000 Antwerp' : 'Ghent');
}

async function fillContact(page) {
  await page.locator('#booking-name').fill('Mobile Visitor');
  await page.locator('#booking-email').fill('mobile-visitor@example.com');
  await advance(page);
  await expect(page.locator('#booking-title')).toHaveText('Review your request');
}

test('travel area is an explicit required choice, even when the town says Antwerp', async ({ page }) => {
  await advance(page);
  await page.locator('#booking-date').fill(await page.locator('#booking-date').getAttribute('min'));
  await page.locator('#booking-town').fill('2000 Antwerp');
  await expect(page.locator('#booking-travel-area')).toHaveValue('');
  await expect(page.locator('.booking-travel-fee')).toHaveText('Choose your travel area');
  await expect(page.locator('.booking-estimated-total')).toHaveText('€59.99 treatment; travel not estimated');
  await advance(page);
  await expect(page.locator('#booking-title')).toHaveText('Make it your visit');
  expect(await page.locator('#booking-travel-area').evaluate((field) => field.validity.valueMissing)).toBe(true);
  await page.locator('#booking-travel-area').selectOption('antwerp');
  await advance(page);
  await expect(page.locator('#booking-title')).toHaveText('A way to reach you');
});

test('mobile location and travel range follow duration edits and reach the exported request', async ({ page }) => {
  await advance(page);
  await fillVisit(page);
  await page.locator('#booking-location').selectOption('mobile');
  await page.locator('#booking-venue').fill('Example hotel');
  await page.locator('#booking-address').fill('Example Street 12, reception');
  await expect(page.locator('.booking-venue-confirmation')).not.toBeVisible();
  await expect(page.locator('.booking-travel-fee')).toHaveText('€9.99–€14.99 per visit (estimated)');
  await expect(page.locator('.booking-estimated-total')).toHaveText('€69.98–€74.98');
  await page.locator('.booking-back').click();
  await page.locator('#booking-duration').selectOption('90');
  await advance(page);
  await expect(page.locator('#booking-address')).toHaveValue('Example Street 12, reception');
  await expect(page.locator('.booking-estimated-total')).toHaveText('€84.98–€89.98');
  await advance(page);
  await fillContact(page);
  const review = page.locator('.booking-review');
  await expect(review).toContainText('Mobile massage at your requested location');
  await expect(review).toContainText('Within Antwerp');
  await expect(review).toContainText('€84.98–€89.98');
  await expect(review).toContainText('Example Street 12, reception');
  const downloadPromise = page.waitForEvent('download');
  await page.locator('.booking-download').click();
  const download = await downloadPromise;
  const text = await readFile(await download.path(), 'utf8');
  expect(text).toContain('Travel area: Within Antwerp');
  expect(text).toContain('Travel fee: €9.99–€14.99 per visit (estimated)');
  expect(text).toContain('Estimated total: €84.98–€89.98');
  expect(text).toContain('Requested address / location: Example Street 12, reception');
  expect(text).toContain('This request has not been sent. No appointment is reserved and no payment has been made.');
});

test('switching outside Antwerp removes the estimated total and exports only a quote basis', async ({ page }) => {
  await advance(page);
  await fillVisit(page);
  await expect(page.locator('.booking-estimated-total')).toHaveText('€69.98–€74.98');
  await page.locator('#booking-travel-area').selectOption('outside');
  await page.locator('#booking-town').fill('Ghent');
  await expect(page.locator('.booking-total-label')).toHaveText('Price basis');
  await expect(page.locator('.booking-estimated-total')).toHaveText('€59.99 treatment + travel quote');
  await expect(page.locator('.booking-travel-fee')).toContainText('total travel distance');
  await advance(page);
  await fillContact(page);
  const review = page.locator('.booking-review');
  await expect(review).toContainText('Outside Antwerp');
  await expect(review).toContainText('€59.99 treatment + travel quote');
  await expect(review).not.toContainText('Estimated total');
  await expect(review).not.toContainText('€9.99');
  await expect(review).not.toContainText('€0.00');
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined }));
  await page.locator('.booking-copy').click();
  await expect(page.locator('#booking-request-text')).toBeVisible();
  await expect(page.locator('#booking-request-text')).toHaveValue(/Travel area: Outside Antwerp/);
  await expect(page.locator('#booking-request-text')).toHaveValue(/No travel fee or final total is set/);
});

test('duo treatment uses one provisional surcharge and discloses confirmation for two therapists', async ({ page }) => {
  await page.locator('#booking-service').selectOption('duo-relaxing');
  await advance(page);
  await fillVisit(page);
  await expect(page.locator('.booking-estimated-total')).toHaveText('€129.98–€134.98 for 2 people');
  await expect(page.locator('#booking-travel-note')).toContainText('once per visit');
  await expect(page.locator('#booking-travel-note')).toContainText('Travel for two therapists');
  await advance(page);
  await fillContact(page);
  await expect(page.locator('.booking-review')).toContainText('€129.98–€134.98 for 2 people');
  await expect(page.locator('.booking-review')).toContainText('Travel for two therapists');
});

test('venue approval remains required for gyms and spas while travel applies to every visit type', async ({ page }) => {
  await advance(page);
  await fillVisit(page);
  for (const location of ['gym', 'spa']) {
    await page.locator('#booking-location').selectOption(location);
    await expect(page.locator('.booking-venue-confirmation')).toBeVisible();
    await expect(page.locator('input[name="venueConfirmed"]')).toHaveAttribute('required', '');
    await advance(page);
    await expect(page.locator('#booking-title')).toHaveText('Make it your visit');
    await expect(page.locator('.booking-estimated-total')).toHaveText('€69.98–€74.98');
  }
  await page.locator('input[name="venueConfirmed"]').check();
  await page.locator('#booking-location').selectOption('home');
  await expect(page.locator('.booking-venue-confirmation')).not.toBeVisible();
  await expect(page.locator('input[name="venueConfirmed"]')).not.toBeChecked();
  await advance(page);
  await expect(page.locator('#booking-title')).toHaveText('A way to reach you');
});

test('closing clears location details, the travel choice and the exported request', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await advance(page);
  await fillVisit(page);
  await page.locator('#booking-location').selectOption('mobile');
  await page.locator('#booking-address').fill('Private address to clear');
  const sizes = await page.locator('#booking-dialog').evaluate((dialog) => ({ content: dialog.scrollWidth, width: dialog.clientWidth }));
  expect(sizes.content).toBeLessThanOrEqual(sizes.width + 1);
  await advance(page);
  await fillContact(page);
  await page.keyboard.press('Escape');
  await expect(page.locator('#booking-address')).toHaveValue('');
  await expect(page.locator('#booking-travel-area')).toHaveValue('');
  await expect(page.locator('#booking-request-text')).toHaveValue('');
  await expect(page.locator('.booking-review')).toBeEmpty();
  await page.locator('#service-grid [data-book]').first().click();
  await advance(page);
  await expect(page.locator('#booking-location')).toHaveValue('home');
  await expect(page.locator('.booking-travel-fee')).toHaveText('Choose your travel area');
  await expect(page.locator('.booking-estimated-total')).toHaveText('€59.99 treatment; travel not estimated');
});
