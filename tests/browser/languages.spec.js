import { test, expect } from './safe-test.js';

// Retain the existing massage regression suite in its original spa context.
// dual-experience.spec.js separately verifies the new default training journey.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('sfm-experience', 'spa'));
});
import { readFile } from 'node:fs/promises';

test.beforeEach(async ({ page }) => { await page.emulateMedia({ reducedMotion: 'reduce' }); });

for (const [language, heading, service, area, unsent] of [
  ['fr', 'Prenez une pause.', 'Massage relaxant à l’huile', 'À Anvers', 'Cette demande n’a pas été envoyée.'],
  ['nl', 'Haal even adem.', 'Ontspannende oliemassage', 'Binnen Antwerpen', 'Deze aanvraag is niet verzonden.'],
]) {
  test(`${language}: all views fit mobile and selected language survives navigation and reload`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 900 });
    await page.goto(`/?lang=${language}`);
    await expect(page.locator('html')).toHaveAttribute('lang', language);
    await expect(page.locator('#home-title')).toContainText(heading);
    for (const view of ['home', 'treatments', 'showcase', 'visit', 'reviews']) {
      await page.locator(`#primary-nav [data-view="${view}"]`).click();
      await expect(page.locator(`#${view}`)).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    }
    await page.reload();
    await expect(page.locator('#site-language')).toHaveValue(language);
    await page.goto('/'); // Stored preference also works without a URL parameter.
    await expect(page.locator('html')).toHaveAttribute('lang', language);
    await page.locator('#site-language').selectOption('en');
    await expect(page.locator('#home-title')).toContainText('Take a breath.');
  });

  test(`${language}: booking labels, validation, travel prices and TXT are translated without changing entered details`, async ({ page }) => {
    await page.goto(`/?lang=${language}#treatments`);
    await expect(page.locator('[data-service-id="relaxing-oil"] h3')).toHaveText(service);
    await page.locator('[data-service-id="relaxing-oil"] [data-book]').click();
    await page.locator('.booking-next').click();
    await page.locator('.booking-next').click();
    const dateMessage = await page.locator('#booking-date').evaluate(input => input.validationMessage);
    expect(dateMessage).toMatch(language === 'fr' ? /Choisissez/ : /Kies/);
    await page.locator('#booking-travel-area').selectOption('antwerp');
    await expect(page.locator('.booking-estimated-total')).toContainText('69,98');
    await expect(page.locator('.booking-estimated-total')).toContainText('74,98');
    await page.locator('#booking-date').fill(await page.locator('#booking-date').getAttribute('min'));
    await page.locator('#booking-time').selectOption('Afternoon'); // Stable values, translated labels.
    await page.locator('#booking-town').fill('Antwerpen');
    await page.locator('#booking-address').fill('Home'); // A catalogue key entered by a person must stay unchanged.
    await page.locator('.booking-next').click();
    await page.locator('#booking-name').fill('Home');
    await page.locator('#booking-email').fill('visitor@example.com');
    await page.locator('.booking-next').click();
    await expect(page.locator('.booking-review')).toContainText(area);
    await expect(page.locator('.booking-review')).toContainText('Home');
    const downloadEvent = page.waitForEvent('download');
    await page.locator('.booking-download').click();
    const download = await downloadEvent;
    const body = await readFile(await download.path(), 'utf8');
    expect(body).toContain(service);
    expect(body).toContain(unsent);
    expect(body).toContain('Home');
    expect(body).not.toContain('This request has not been sent.');
    // Change language from inside the open dialog without losing selections or PII.
    await page.locator('#booking-language').selectOption('en');
    await expect(page.locator('#booking-name')).toHaveValue('Home');
    await expect(page.locator('#booking-travel-area')).toHaveValue('antwerp');
    await expect(page.locator('#booking-title')).toHaveText('Review your request');
    await expect(page.locator('.booking-review')).toContainText('Afternoon');
  });
}

test('switching French to Dutch preserves written reviews, regenerates private exports and translates errors', async ({ page }) => {
  await page.goto('/?lang=fr#reviews');
  await page.locator('#review-form button[type="submit"]').click();
  expect(await page.locator('[name="rating"]').first().evaluate(input => input.validationMessage)).toContain('étoiles');
  await page.getByRole('radio', { name: '5 étoiles', exact: true }).check();
  await page.locator('#review-display-name').fill('Home');
  await page.locator('#review-experience').fill('Choose treatment');
  await page.locator('#review-email').fill('visitor@example.com');
  await page.locator('#review-form button[type="submit"]').click();
  await page.locator('#site-language').selectOption('nl');
  await expect(page.locator('#review-prepared')).toBeVisible();
  await expect(page.locator('.review-preview-rating')).toContainText('5 / 5 sterren');
  await expect(page.locator('.review-preview-name')).toHaveText('Home');
  await expect(page.locator('.review-preview-experience')).toHaveText('Choose treatment');
  await expect(page.locator('.review-preview-card')).not.toContainText('visitor@example.com');
  const downloadEvent = page.waitForEvent('download');
  await page.locator('.review-download').click();
  const download = await downloadEvent;
  const body = await readFile(await download.path(), 'utf8');
  expect(body).toContain('PRIVÉCONTACT');
  expect(body).toContain('Choose treatment');
  expect(body).toContain('verstuurt');
  await page.reload();
  await expect(page.locator('#review-email')).toHaveValue('');
  await expect(page.locator('#site-language')).toHaveValue('nl');
});
