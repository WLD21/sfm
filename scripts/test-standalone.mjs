import { chromium, expect } from '@playwright/test';
import { readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const input = process.argv[2] ? path.resolve(process.argv[2]) : path.join(root, 'OPEN-WEBSITE.html');
const html = await readFile(input, 'utf8');
const browser = await chromium.launch({
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
});

try {
  // The cloud browser disallows file: navigation. Render the exact document in
  // an offline, originless page instead: no dev server, HTTP assets or modules.
  const context = await browser.newContext({ offline: true, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors = [];
  const networkRequests = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => {
    if (/^https?:/.test(request.url())) networkRequests.push(request.url());
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.setContent(html);
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('#home-title')).toHaveCSS('font-family', /Lora/);
  await expect(page.locator('#home-title')).toHaveCSS('font-weight', '700');
  await expect(page.locator('body')).toHaveCSS('color', 'rgb(52, 45, 37)');
  await expect(page.locator('#home-title em')).toHaveCSS('color', 'rgb(121, 84, 33)');
  expect(await page.evaluate(() => document.fonts.check('700 48px "Lora"'))).toBe(true);
  await expect(page.locator('.hero-actions .button')).toHaveCSS('font-family', /Outfit/);
  expect(await page.evaluate(() => document.fonts.check('600 15px "Outfit"'))).toBe(true);
  await expect(page.locator('script[src], link[rel="stylesheet"]')).toHaveCount(0);
  await expect(page.locator('script[type="module"]')).toHaveCount(0);

  for (const view of ['home', 'treatments', 'showcase', 'visit', 'reviews']) {
    await page.locator(`#primary-nav [data-view="${view}"]`).click();
    await expect(page.locator(`#${view}`)).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.locator('#primary-nav [data-view="showcase"]').click();
  const photos = page.locator('.gallery-card img');
  await expect(photos).toHaveCount(6);
  for (const photo of await photos.all()) {
    await photo.scrollIntoViewIfNeeded();
    await expect(photo).toHaveAttribute('src', /^data:image\/jpeg;base64,/);
    await expect.poll(() => photo.evaluate((image) => image.complete && image.naturalWidth > 0)).toBe(true);
  }
  await page.locator('.gallery-card[data-gallery="5"]').click();
  await expect(page.locator('#gallery-image')).toHaveAttribute('src', /^data:image\/jpeg;base64,/);
  await expect(page.locator('#gallery-image')).toHaveJSProperty('naturalWidth', 720);
  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('#gallery-image')).toHaveJSProperty('naturalWidth', 853);
  await page.keyboard.press('Escape');

  await page.locator('#primary-nav [data-view="treatments"]').click();
  await page.locator('#treatment-finder summary').click();
  await page.locator('#finder-intent').selectOption('active');
  await page.locator('#finder-duration').selectOption('90');
  await page.locator('#finder-travel-area').selectOption('antwerp');
  await expect(page.locator('.finder-travel-estimate')).toContainText('€89.98–€94.98');
  await page.locator('.finder-choose').click();
  await expect(page.locator('#booking-service')).toHaveValue('deep-tissue');
  await expect(page.locator('#booking-duration')).toHaveValue('90');
  await expect(page.locator('#booking-travel-area')).toHaveValue('antwerp');
  await page.keyboard.press('Escape');
  await page.locator('.finder-show-all').click();
  await page.locator('[data-duration="90"]').click();
  const duo = page.locator('[data-service-id="duo-sports"]');
  await expect(duo.locator('.service-price')).toHaveText('€144.99');
  await duo.locator('[data-book]').click();
  await page.locator('.booking-next').click();
  const today = await page.locator('#booking-date').getAttribute('min');
  await page.locator('#booking-date').fill(today);
  await page.locator('#booking-town').fill('Antwerp');
  await page.locator('#booking-travel-area').selectOption('antwerp');
  await page.locator('.booking-next').click();
  await page.locator('#booking-name').fill('Standalone Test');
  await page.locator('#booking-email').fill('standalone-test@example.invalid');
  await page.locator('.booking-next').click();
  await expect(page.locator('.booking-review')).toContainText('€144.99');
  await expect(page.locator('.booking-review')).toContainText('€154.98–€159.98');
  await expect(page.locator('.booking-notice')).toContainText('Nothing has been sent, reserved or paid.');
  const downloadPromise = page.waitForEvent('download');
  await page.locator('.booking-download').click();
  const requestFile = await downloadPromise;
  const text = await readFile(await requestFile.path(), 'utf8');
  expect(text).toContain('Duo Sports & Oil');
  expect(text).toContain('€144.99');
  expect(text).toContain('This request has not been sent.');
  await page.keyboard.press('Escape');
  await page.locator('#subscriptions [data-subscriptions]').click();
  await expect(page.locator('#subscription-dialog')).toContainText('Subscriptions are being prepared');
  await expect(page.locator('#subscription-dialog a[href^="https"]')).toHaveCount(0);
  await page.keyboard.press('Escape');

  await page.locator('#primary-nav [data-view="reviews"]').click();
  await expect(page.locator('#review-form input[name="rating"]:checked')).toHaveCount(0);
  await page.getByRole('radio', { name: '5 stars', exact: true }).check();
  await page.locator('#review-display-name').fill('Offline visitor');
  await page.locator('#review-experience').fill('A calm and thoughtful visit at my chosen location.');
  await page.getByRole('radio', { name: 'Phone', exact: true }).check();
  await page.locator('#review-phone').fill('+32 470 12 34 56');
  await page.getByRole('button', { name: 'Prepare review' }).click();
  await expect(page.locator('#review-prepared')).toBeVisible();
  await expect(page.locator('.review-preview-card')).toContainText('5 / 5 stars');
  await expect(page.locator('.review-preview-card')).not.toContainText('+32');
  await expect(page.locator('.review-send')).toBeHidden();
  const reviewDownloadPromise = page.waitForEvent('download');
  await page.locator('.review-download').click();
  const reviewFile = await reviewDownloadPromise;
  const privateReview = await readFile(await reviewFile.path(), 'utf8');
  expect(privateReview).toContain('Phone: +32 470 12 34 56');
  expect(privateReview).toContain('does not send or publish a review');
  await page.locator('#primary-nav [data-view="home"]').click();
  await expect(page.locator('#home')).toBeVisible();
  await expect(page.locator('#review-phone')).toHaveValue('');
  await expect(page.locator('#review-private-text')).toHaveValue('');
  for (const [language, heading] of [['fr', 'Prenez une pause.'], ['nl', 'Haal even adem.']]) {
    await page.locator('#site-language').selectOption(language);
    await expect(page.locator('html')).toHaveAttribute('lang', language);
    await expect(page.locator('#home-title')).toContainText(heading);
    await page.locator('.hero-actions [data-book]').click();
    await expect(page.locator('#booking-language')).toHaveValue(language);
    await page.locator('.booking-next').click();
    await page.locator('#booking-travel-area').selectOption('antwerp');
    await expect(page.locator('.booking-estimated-total')).toContainText('84,98');
    await expect(page.locator('.booking-estimated-total')).toContainText('89,98');
    await page.keyboard.press('Escape');
  }
  await page.locator('#site-language').selectOption('en');
  await page.locator('#primary-nav [data-view="visit"]').click();
  await page.locator('.visit-guide summary').click();
  await page.locator('.training-note [data-gallery]').click();
  await expect(page.locator('#gallery-image')).toHaveAttribute('src', /^data:image\/jpeg;base64,/);
  await expect(page.locator('#gallery-caption')).toContainText('4 / 6');
  await page.keyboard.press('Escape');
  await page.locator('[data-privacy]').click();
  await expect(page.locator('#privacy-dialog')).toContainText('Your details stay with you');
  await expect(page.locator('body')).toHaveCSS('overflow', 'hidden');
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-privacy]')).toBeFocused();
  await page.locator('#primary-nav [data-view="home"]').click();
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await mkdir(path.join(root, '.cache/standalone'), { recursive: true });
  await page.screenshot({ path: path.join(root, '.cache/standalone/offline-mobile.png'), fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: path.join(root, '.cache/standalone/offline-desktop.png'), fullPage: true });
  expect(errors).toEqual([]);
  expect(networkRequests).toEqual([]);

  const animated = await browser.newContext({
    offline: true,
    reducedMotion: 'no-preference',
    viewport: { width: 1100, height: 720 },
  });
  const introPage = await animated.newPage();
  introPage.on('pageerror', (error) => errors.push(error.message));
  introPage.on('request', (request) => {
    if (/^https?:/.test(request.url())) networkRequests.push(request.url());
  });
  await introPage.setContent(html);
  await expect(introPage.locator('#intro-dialog')).toBeVisible();
  await expect(introPage.locator('#intro-dialog')).not.toBeVisible({ timeout: 3000 });
  await expect(introPage.locator('#home-title')).toBeVisible();

  // The direct-open download must contain ScrollTrigger as well as the intro.
  await introPage.locator('#primary-nav [data-view="showcase"]').click();
  const lastAnimatedCard = introPage.locator('.gallery-card[data-scroll-reveal]').last();
  await expect.poll(() => lastAnimatedCard.evaluate((card) => Number(getComputedStyle(card).opacity))).toBeLessThan(0.5);
  const animatedPhoto = introPage.locator('#showcase img[data-parallax]').first();
  await expect.poll(() => animatedPhoto.evaluate((photo) => getComputedStyle(photo).transform)).not.toBe('none');
  const translateY = () => animatedPhoto.evaluate((photo) => {
    const transform = getComputedStyle(photo).transform;
    return transform === 'none' ? 0 : new DOMMatrixReadOnly(transform).m42;
  });
  const beforeScroll = await translateY();
  await introPage.evaluate(() => window.scrollBy({ top: 350, behavior: 'instant' }));
  await expect.poll(() => introPage.evaluate(() => window.scrollY)).toBeGreaterThan(300);
  await expect.poll(async () => Math.abs((await translateY()) - beforeScroll)).toBeGreaterThan(0.5);
  await lastAnimatedCard.evaluate((card) => card.scrollIntoView({ behavior: 'instant', block: 'center' }));
  await expect.poll(() => lastAnimatedCard.evaluate((card) => Number(getComputedStyle(card).opacity))).toBeGreaterThan(0.98);
  await introPage.locator('#replay-intro').click();
  await expect(introPage.locator('#intro-dialog')).toBeVisible();
  await introPage.locator('#skip-intro').click();
  await expect(introPage.locator('#intro-dialog')).not.toBeVisible();
  await introPage.emulateMedia({ reducedMotion: 'reduce' });
  for (const card of await introPage.locator('.gallery-card').all()) {
    await expect(card).toHaveCSS('opacity', '1');
  }
  await expect(animatedPhoto).toHaveCSS('transform', 'none');
  expect(errors).toEqual([]);
  expect(networkRequests).toEqual([]);
  await animated.close();

  const noScript = await browser.newContext({ offline: true, javaScriptEnabled: false });
  const noScriptPage = await noScript.newPage();
  await noScriptPage.setContent(html);
  await expect(noScriptPage.locator('body')).toHaveCSS('color', 'rgb(52, 45, 37)');
  await expect(noScriptPage.locator('#home-title')).toBeVisible();
  await expect(noScriptPage.locator('.hero-photo img')).toHaveJSProperty('naturalWidth', 853);
  await noScript.close();
  await context.close();
  console.log('PASS: offline standalone styles, fonts, six photos, five views, gallery, EUR prices, travel estimates, private review download, request download and subscription safeguards.');
  console.log('PASS: French/Dutch switching and travel pricing offline; embedded GSAP intro, replay, scroll reveals, photo parallax and live reduced-motion preference.');
  console.log('PASS: offline treatment finder carries duration/travel into booking; preparation guide, original training record and privacy dialog work.');
  console.log('PASS: design remains visible with JavaScript disabled. No external requests or page errors.');
} finally {
  await browser.close();
}
