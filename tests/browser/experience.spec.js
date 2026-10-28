import { test, expect } from './safe-test.js';

// Retain the existing massage regression suite in its original spa context.
// dual-experience.spec.js separately verifies the new default training journey.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('sfm-experience', 'spa'));
});

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

test('skip navigation preserves the current view and mobile reviews keep disclosures and focused fields visible', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?lang=fr#treatments');
  await page.locator('.skip-link').focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#treatments$/);
  await expect(page.locator('#treatments')).toBeVisible();
  await expect(page.locator('#main')).toBeFocused();

  await page.locator('#primary-nav [data-view="reviews"]').click();
  const availability = page.locator('.review-availability');
  await expect(availability).toContainText('L’envoi d’avis n’est pas encore disponible.');
  await expect(availability).toBeVisible();
  const noteBox = await availability.boundingBox();
  const formBox = await page.locator('#review-form').boundingBox();
  expect(noteBox.y + noteBox.height).toBeLessThanOrEqual(formBox.y + 1);
  await expect(page.locator('.mobile-booking-bar')).toBeHidden();

  // Follow the real keyboard route through the form, including the textarea
  // previously covered by the fixed appointment action.
  await page.locator('[name="rating"]').first().focus();
  const reached = [];
  for (let step = 0; step < 10 && !reached.includes('review-email'); step += 1) {
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => {
      const element = document.activeElement;
      if (!element.matches('#review-form input:not([type="radio"]), #review-form textarea')) return null;
      const rect = element.getBoundingClientRect();
      const atCenter = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
      return { id: element.id, top: rect.top, bottom: rect.bottom, viewport: innerHeight, covered: atCenter !== element };
    });
    if (!focused) continue;
    reached.push(focused.id);
    expect(focused.top).toBeGreaterThanOrEqual(0);
    expect(focused.bottom).toBeLessThanOrEqual(focused.viewport + 1);
    expect(focused.covered).toBe(false);
  }
  expect(reached).toEqual(expect.arrayContaining(['review-display-name', 'review-experience', 'review-email']));
  await page.locator('#primary-nav [data-view="home"]').click();
  await expect(page.locator('.mobile-booking-bar')).toBeVisible();
});

test('the visit guide opens in French and Dutch and links to the original training certificate', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto('/?lang=fr#visit');
  const guide = page.locator('.visit-guide');
  await expect(guide.locator('summary')).toContainText('Avant votre visite');
  await expect(guide.locator('.visit-guide-content')).toBeHidden();
  await guide.locator('summary').click();
  await expect(guide.getByRole('heading', { name: 'Votre espace, prêt pour la visite' })).toBeVisible();
  await expect(guide).toContainText('Vous pouvez demander un ajustement ou une pause à tout moment.');
  await expect(guide.locator('.training-note')).toContainText('30 heures de formation en massage');

  const certificate = guide.locator('.training-note [data-gallery="3"]');
  await certificate.click();
  await expect(page.locator('#gallery-dialog')).toBeVisible();
  await expect(page.locator('#gallery-image')).toHaveAttribute('src', '/images/training-certificate.jpg');
  await expect.poll(() => page.locator('#gallery-image').evaluate(image => image.complete && image.naturalWidth > 0)).toBe(true);
  await page.keyboard.press('Escape');
  await expect(page.locator('#gallery-dialog')).toBeHidden();
  await expect(certificate).toBeFocused();

  await page.locator('#site-language').selectOption('nl');
  await expect(guide.locator('summary')).toContainText('Voor je bezoek');
  await expect(guide.getByRole('heading', { name: 'Comfort op jouw tempo' })).toBeVisible();
  await expect(guide).toContainText('Je kunt op elk moment om een aanpassing of pauze vragen.');
  await expect(certificate).toHaveText('Bekijk het opleidingscertificaat');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});

test('translated privacy information locks background scrolling and Escape restores the visitor’s place', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const [language, title, explanation] of [
    ['fr', 'Confidentialité sur ce site', 'Vos données restent avec vous'],
    ['nl', 'Privacy op deze website', 'Je gegevens blijven bij jou'],
  ]) {
    await page.goto(`/?lang=${language}#home`);
    const trigger = page.locator('[data-privacy]');
    await trigger.scrollIntoViewIfNeeded();
    const previousScroll = await page.evaluate(() => scrollY);
    await trigger.click();
    const dialog = page.getByRole('dialog', { name: title, exact: true });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading', { name: explanation, exact: true })).toBeVisible();
    await expect(page.locator('body')).toHaveCSS('overflow', 'hidden');
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
    await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden');
    await expect.poll(async () => Math.abs(await page.evaluate(() => scrollY) - previousScroll)).toBeLessThanOrEqual(1);
  }
});

test('Belgian browser language initializes the site while explicit and saved choices take precedence', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, locale: 'nl-BE', reducedMotion: 'reduce' });
  try {
    const page = await context.newPage();
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'nl');
    await expect(page.locator('#gym-home-title')).toContainText('Bouw kracht op.');

    await page.goto('/?lang=en');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('#gym-home-title')).toContainText('Build strength.');

    await page.locator('#site-language').selectOption('fr');
    await page.goto('/#visit');
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
    await expect(page.locator('#site-language')).toHaveValue('fr');
    await expect(page.locator('.visit-guide summary')).toContainText('Avant votre visite');
  } finally {
    await context.close();
  }
});
