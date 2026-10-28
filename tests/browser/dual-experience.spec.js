import { test, expect } from './safe-test.js';
import { readFile } from 'node:fs/promises';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('sfm-intro-seen', '1'));
});

test('training is the default and both worlds remain accessible at phone and desktop widths', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/?lang=en');
    await page.locator('[data-experience-choice="gym"]').click();
    await expect(page.locator('#gym-home-title')).toHaveCount(1);
    await expect(page.locator('#gym-home-title')).toBeVisible();
    await expect(page.locator('#gym-home-title')).toContainText('Build strength.');
    await expect(page.locator('.gym-scene')).toBeVisible();
    await expect(page.locator('[data-spa-content]')).toBeHidden();
    await expect(page.locator('.header-book')).toContainText('Plan my training');
    await page.locator('[data-experience-choice="spa"]').click();
    await expect(page.locator('#home-title')).toBeVisible();
    await expect(page.locator('.spa-scene')).toBeVisible();
    await expect(page.locator('[data-gym-content]')).toBeHidden();
    await expect(page.locator('.header-book')).toContainText('Request a massage');
    await page.locator('[data-experience-choice="gym"]').click();
    await page.locator('[data-view="training"]').click();
    await expect(page.locator('#training-title')).toBeFocused();
    await expect(page.locator('.training-program')).toHaveCount(3);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.locator('[data-experience-choice="spa"]').click();
    await expect(page).toHaveURL(/#home$/);
    await expect(page.locator('#home-title')).toBeVisible();
    await page.locator('[data-experience-choice="gym"]').click();
    await page.locator('[data-view="home"]').click();
    await expect(page.locator('#gym-home-title')).toBeFocused();
  }
  expect(errors).toEqual([]);
});

test('the whole site fades when switching, restores visible surfaces and remembers the selected experience', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/?lang=en');
  await page.evaluate(() => {
    window.__fadeSamples = [];
    const header = document.querySelector('.site-header');
    const until = performance.now() + 1400;
    const sample = () => {
      window.__fadeSamples.push(Number(getComputedStyle(header).opacity));
      if (performance.now() < until) requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
  await page.locator('[data-experience-choice="spa"]').click();
  await expect.poll(() => page.evaluate(() => Math.min(...window.__fadeSamples))).toBeLessThan(.96);
  await expect(page.locator('body')).toHaveAttribute('data-experience', 'spa');
  await expect(page.locator('[data-experience-choice="spa"]')).toBeEnabled();
  for (const selector of ['.site-header', '.site-main', '.site-footer']) await expect(page.locator(selector)).toHaveCSS('opacity', '1');
  await page.reload();
  await expect(page.locator('body')).toHaveAttribute('data-experience', 'spa');
  await expect(page.locator('#home-title')).toBeVisible();
});


test('a failed GSAP request leaves the switch and both scenes usable', async ({ page }) => {
  await page.route(/gsap/i, route => route.abort());
  await page.goto('/?lang=en');
  await page.locator('[data-experience-choice="spa"]').click();
  await expect(page.locator('body')).toHaveAttribute('data-experience', 'spa');
  await expect(page.locator('[data-experience-choice="spa"]')).toBeEnabled();
  await expect(page.locator('.site-main')).toHaveCSS('opacity', '1');
  await expect(page.locator('.spa-scene')).toBeVisible();
  await page.locator('.header-book').click();
  await expect(page.locator('#booking-dialog')).toBeVisible();
});

test('training enquiry validates, exports safely and clears personal data on close', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?lang=en#training');
  await page.locator('.training-program').nth(1).getByRole('button').click();
  const dialog = page.locator('#training-request-dialog');
  await expect(dialog).toBeVisible();
  await expect(page.locator('#training-goal')).toHaveValue('fitness');
  await dialog.locator('[type="submit"]').click();
  await expect(page.locator('#training-name')).toBeFocused();
  await page.locator('#training-name').fill('<img src=x onerror=alert(1)>');
  await page.locator('#training-email').fill('visitor@example.invalid');
  await page.locator('#training-town').fill('Antwerpen');
  await page.locator('#training-notes').fill('I would like to work on consistency.');
  await dialog.locator('[type="submit"]').click();
  await expect(page.locator('.training-review')).toContainText('<img src=x onerror=alert(1)>');
  await expect(page.locator('.training-review img')).toHaveCount(0);
  await expect(page.locator('.training-unsent')).toContainText('has not been sent');
  const downloadEvent = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Save enquiry', exact: true }).click();
  const download = await downloadEvent;
  const text = await readFile(await download.path(), 'utf8');
  expect(text).toContain('Fitness & conditioning');
  expect(text).toContain('visitor@example.invalid');
  expect(text).toContain('No session is reserved');
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await page.locator('.training-program').first().getByRole('button').click();
  await expect(page.locator('#training-name')).toHaveValue('');
});

test('French and Dutch translate training, theme controls and enquiries while closed forms clear entered text', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?lang=fr');
  await expect(page.locator('#gym-home-title')).toContainText('Gagnez en force.');
  await expect(page.locator('[data-experience-choice="gym"]')).toContainText('Coaching & fitness');
  await page.locator('.header-book').click();
  await page.locator('#training-name').fill('Visitor');
  await page.keyboard.press('Escape');
  await page.locator('#site-language').selectOption('nl');
  await expect(page.locator('#gym-home-title')).toContainText('Bouw kracht op.');
  await page.locator('.header-book').click();
  await expect(page.locator('#training-request-title')).toContainText('training bespreken');
  await expect(page.locator('#training-name')).toHaveValue('');
});
