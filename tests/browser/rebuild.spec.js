import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const menu = [
  { name: 'Relaxing Oil', category: 'spa', prices: { 60: '€59.99', 90: '€74.99' } },
  { name: 'Foot', category: 'spa', prices: { 60: '€59.99', 90: '€74.99' } },
  { name: 'Head & Neck', category: 'spa', prices: { 60: '€59.99', 90: '€74.99' } },
  { name: 'Deep Tissue, Sports & Thai Combination', category: 'fitness', prices: { 60: '€64.99', 90: '€79.99' } },
  { name: 'Duo Relaxing Oil', category: 'duo', prices: { 60: '€119.99', 90: '€139.99' } },
  { name: 'Duo Sports & Oil', category: 'duo', prices: { 60: '€124.99', 90: '€144.99' } },
];

async function openView(page, view) {
  await page.locator(`#primary-nav [data-view="${view}"]`).click();
  await expect(page.locator(`#${view}`)).toBeVisible();
}

function serviceCard(page, name) {
  return page.locator('#service-grid .service-card').filter({
    has: page.getByRole('heading', { name, exact: true }),
  });
}

async function expectNoOverflow(page) {
  const sizes = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
    dialogs: [...document.querySelectorAll('dialog[open]')].map((dialog) => ({
      width: dialog.clientWidth,
      content: dialog.scrollWidth,
    })),
  }));
  expect(sizes.document).toBeLessThanOrEqual(sizes.viewport + 1);
  expect(sizes.body).toBeLessThanOrEqual(sizes.viewport + 1);
  for (const dialog of sizes.dialogs) {
    expect(dialog.content).toBeLessThanOrEqual(dialog.width + 1);
  }
}

test.describe('Compact site and treatment menu', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
  });

  for (const width of [320, 375, 390, 768, 1440]) {
    test(`five views and booking fit a ${width}px viewport`, async ({ page }) => {
      const browserErrors = [];
      page.on('pageerror', (error) => browserErrors.push(error.message));
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/');
      for (const view of ['home', 'treatments', 'showcase', 'visit', 'reviews']) {
        await openView(page, view);
        await expect(page.locator('.view:visible')).toHaveCount(1);
        await expectNoOverflow(page);
      }
      if (width < 768) {
        for (const link of await page.locator('#primary-nav [data-view]').all()) {
          const box = await link.boundingBox();
          expect(box.height).toBeGreaterThanOrEqual(44);
          expect(box.width).toBeGreaterThanOrEqual(44);
        }
      }
      await openView(page, 'treatments');
      await serviceCard(page, 'Relaxing Oil').locator('[data-book]').click();
      await expect(page.locator('#booking-dialog')).toBeVisible();
      await expectNoOverflow(page);
      await page.keyboard.press('Escape');
      await expect(page.locator('#booking-dialog')).not.toBeVisible();
      expect(browserErrors).toEqual([]);
    });
  }

  test('hash navigation, heading focus and browser history agree', async ({ page }) => {
    await page.goto('/#home');
    await openView(page, 'treatments');
    await expect(page).toHaveURL(/#treatments$/);
    await expect(page.locator('#treatments-title')).toBeFocused();
    await expect(page.locator('#primary-nav [data-view="treatments"]')).toHaveAttribute('aria-current', 'page');
    await openView(page, 'visit');
    await expect(page.locator('#visit-title')).toBeFocused();
    await page.goBack();
    await expect(page).toHaveURL(/#treatments$/);
    await expect(page.locator('#treatments')).toBeVisible();
    await expect(page.locator('#treatments-title')).toBeFocused();
    await page.reload();
    await expect(page.locator('#treatments')).toBeVisible();
    await expect(page.locator('.view:visible')).toHaveCount(1);
  });

  for (const duration of [60, 90]) {
    test(`all six ${duration}-minute menu prices match the approved record`, async ({ page }) => {
      await page.goto('/#treatments');
      await page.locator(`[data-duration="${duration}"]`).click();
      await expect(page.locator(`[data-duration="${duration}"]`)).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator('#service-grid .service-card')).toHaveCount(6);
      for (const service of menu) {
        const card = serviceCard(page, service.name);
        await expect(card).toBeVisible();
        await expect(card.locator('.service-price')).toContainText(service.prices[duration]);
        if (service.category === 'duo') await expect(card).toContainText(/two people|2 people|for two/i);
      }
    });
  }

  test('category filters retain the selected duration and only show matching treatments', async ({ page }) => {
    await page.goto('/#treatments');
    await page.locator('[data-duration="90"]').click();
    for (const category of ['spa', 'fitness', 'duo', 'all']) {
      await page.locator(`[data-filter="${category}"]`).click();
      await expect(page.locator(`[data-filter="${category}"]`)).toHaveAttribute('aria-pressed', 'true');
      const expected = menu.filter((service) => category === 'all' || service.category === category);
      await expect(page.locator('#service-grid .service-card:visible')).toHaveCount(expected.length);
      for (const service of expected) {
        await expect(serviceCard(page, service.name).locator('.service-price')).toContainText(service.prices[90]);
      }
    }
  });

  test('subscription options disclose missing setup without a checkout or activation', async ({ page }) => {
    await page.goto('/#treatments');
    const trigger = page.locator('[data-subscriptions]:visible').first();
    await trigger.click();
    const dialog = page.locator('#subscription-dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('Subscriptions are being prepared');
    await expect(dialog).toContainText(/prices|pricing/i);
    await expect(dialog).toContainText(/terms|cancellation|billing/i);
    await expect(dialog.getByRole('link', { name: /checkout|pay|subscribe now/i })).toHaveCount(0);
    await expect(dialog.getByRole('button', { name: /pay|activate|subscribe now/i })).toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(trigger).toBeFocused();
  });
});

test.describe('Accessible short introduction', () => {
  test('the intro can be skipped and dismissed with Escape, and appears once per session', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/');
    const intro = page.locator('#intro-dialog');
    await expect(intro).toBeVisible();
    await page.locator('#skip-intro').click();
    await expect(intro).not.toBeVisible();
    await page.reload();
    await expect(intro).not.toBeVisible();
    await page.evaluate(() => sessionStorage.clear());
    await page.reload();
    await expect(intro).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(intro).not.toBeVisible();
  });

  test('reduced motion bypasses the intro and keeps the site usable', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await expect(page.locator('#intro-dialog')).not.toBeVisible();
    await openView(page, 'treatments');
    await expect(page.locator('#service-grid .service-card')).toHaveCount(6);
  });

  test('the animated intro automatically finishes without interaction', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/');
    await expect(page.locator('#intro-dialog')).not.toBeVisible({ timeout: 3000 });
    await expect(page.locator('#home-title')).toBeVisible();
    await openView(page, 'treatments');
  });

  test('the intro finishes within 2.5 seconds even when GSAP cannot load', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.route(/gsap/i, (route) => route.abort());
    await page.goto('/');
    await expect(page.locator('#intro-dialog')).not.toBeVisible({ timeout: 3000 });
    await openView(page, 'treatments');
    await expect(page.locator('#service-grid .service-card')).toHaveCount(6);
  });
});

async function startRequest(page, { name = 'Relaxing Oil', duration = 60 } = {}) {
  await page.goto('/#treatments');
  await page.locator(`[data-duration="${duration}"]`).click();
  const trigger = serviceCard(page, name).locator('[data-book]');
  await trigger.click();
  await expect(page.locator('#booking-dialog')).toBeVisible();
  await expect(page.locator('#booking-title')).toHaveText('Choose your treatment');
  return trigger;
}

async function nextBookingStep(page) {
  await page.locator('#booking-dialog .booking-next').click();
}

async function completeVisit(page) {
  const today = await page.locator('#booking-date').getAttribute('min');
  await page.locator('#booking-date').fill(today);
  await page.locator('#booking-time').selectOption('Afternoon');
  await page.locator('#booking-town').fill('2000 Antwerp');
  await page.locator('#booking-travel-area').selectOption('antwerp');
  await nextBookingStep(page);
  await expect(page.locator('#booking-title')).toHaveText('A way to reach you');
}

test.describe('Honest appointment request flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
  });

  test('missing, past and beyond-one-year dates cannot advance the request', async ({ page }) => {
    await startRequest(page);
    await nextBookingStep(page);
    const date = page.locator('#booking-date');
    await page.locator('#booking-town').fill('Antwerp');
    await nextBookingStep(page);
    await expect(page.locator('#booking-title')).toHaveText('Make it your visit');
    expect(await date.evaluate((input) => input.validity.valid)).toBe(false);
    const invalidDates = await date.evaluate((input) => {
      const shift = (value, days) => {
        const date = new Date(`${value}T12:00:00`);
        date.setDate(date.getDate() + days);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      };
      return [shift(input.min, -1), shift(input.max, 1)];
    });
    for (const value of invalidDates) {
      await date.fill(value);
      await nextBookingStep(page);
      await expect(page.locator('#booking-title')).toHaveText('Make it your visit');
      expect(await date.evaluate((input) => input.validity.valid)).toBe(false);
      expect(await date.evaluate((input) => input.validationMessage)).not.toBe('');
    }
    await completeVisit(page);
  });

  test('venue confirmation and a valid contact email are required', async ({ page }) => {
    await startRequest(page);
    await nextBookingStep(page);
    await page.locator('#booking-location').selectOption('gym');
    await expect(page.locator('.booking-venue-confirmation')).toBeVisible();
    await page.locator('#booking-date').fill(await page.locator('#booking-date').getAttribute('min'));
    await page.locator('#booking-town').fill('2000 Antwerp');
  await page.locator('#booking-travel-area').selectOption('antwerp');
    await nextBookingStep(page);
    await expect(page.locator('#booking-title')).toHaveText('Make it your visit');
    await page.locator('input[name="venueConfirmed"]').check();
    await nextBookingStep(page);
    await expect(page.locator('#booking-title')).toHaveText('A way to reach you');
    await page.locator('#booking-name').fill('   ');
    await page.locator('#booking-email').fill('visitor@example.com');
    await nextBookingStep(page);
    expect(await page.locator('#booking-name').evaluate((input) => input.validity.valid)).toBe(false);
    await page.locator('#booking-name').fill('A Visitor');
    await page.locator('#booking-email').fill('not-an-email');
    await nextBookingStep(page);
    await expect(page.locator('#booking-title')).toHaveText('A way to reach you');
    expect(await page.locator('#booking-email').evaluate((input) => input.validity.typeMismatch)).toBe(true);
    await page.locator('#booking-email').fill('visitor@example.com');
    await nextBookingStep(page);
    await expect(page.locator('#booking-title')).toHaveText('Review your request');
    await expect(page.locator('.booking-review')).toContainText('At a gym — access and price to confirm');
  });

  test('mobile review safely renders entered text and downloads an unsent request', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 740 });
    const submissions = [];
    page.on('request', (request) => {
      if (request.method() !== 'GET') submissions.push(`${request.method()} ${request.url()}`);
    });
    await startRequest(page, { name: 'Duo Sports & Oil', duration: 90 });
    await expect(page.locator('#booking-duration')).toHaveValue('90');
    await expect(page.locator('.booking-price')).toHaveText('€144.99');
    await expect(page.locator('.booking-people')).toContainText('2 people');
    await expectNoOverflow(page);
    await nextBookingStep(page);
    await expectNoOverflow(page);
    await completeVisit(page);
    await expectNoOverflow(page);
    for (const field of await page.locator('#booking-dialog input:visible, #booking-dialog select:visible').all()) {
      expect(await field.evaluate((input) => parseFloat(getComputedStyle(input).fontSize))).toBeGreaterThanOrEqual(16);
    }
    const enteredName = '<img src=x onerror="window.__sfmXssExecuted=true">';
    await page.locator('#booking-name').fill(enteredName);
    await page.locator('#booking-email').fill('visitor@example.com');
    await nextBookingStep(page);
    await expect(page.locator('#booking-title')).toHaveText('Review your request');
    await expectNoOverflow(page);
    await expect(page.locator('.booking-review')).toContainText(enteredName);
    await expect(page.locator('.booking-review img')).toHaveCount(0);
    expect(await page.evaluate(() => window.__sfmXssExecuted)).toBeUndefined();
    await expect(page.locator('.booking-notice')).toContainText('Nothing has been sent, reserved or paid.');
    await expect(page.locator('.booking-review')).toContainText('€144.99 total for 2 people · 2 therapists');
    await expect(page.locator('.booking-contact')).toHaveAttribute('href', 'https://supremefitnessmassage.com/home');
    await expect(page.locator('.booking-contact')).toHaveAttribute('rel', /noopener/);
    const downloadEvent = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Save as TXT', exact: true }).click();
    const download = await downloadEvent;
    expect(download.suggestedFilename()).toBe('supreme-appointment-request.txt');
    const text = await readFile(await download.path(), 'utf8');
    expect(text).toContain('Treatment: Duo Sports & Oil');
    expect(text).toContain('Duration: 90 minutes');
    expect(text).toContain('Menu price: €144.99 total for 2 people · 2 therapists');
    expect(text).toContain(`Name: ${enteredName}`);
    expect(text).toContain('Email: visitor@example.com');
    expect(text).toContain('This request has not been sent. No appointment is reserved and no payment has been made.');
    expect(text).toContain('Contact: https://supremefitnessmassage.com/home');
    await expect(page.locator('.booking-status')).toContainText('Your request has not been sent');
    expect(submissions).toEqual([]);
  });

  test('clipboard rejection exposes a usable manual copy fallback', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText: () => Promise.reject(new Error('Clipboard permission denied')) },
      });
    });
    await startRequest(page);
    await nextBookingStep(page);
    await completeVisit(page);
    await page.locator('#booking-name').fill('A Visitor');
    await page.locator('#booking-email').fill('visitor@example.com');
    await nextBookingStep(page);
    await page.getByRole('button', { name: 'Copy request', exact: true }).click();
    const fallback = page.locator('#booking-request-text');
    await expect(fallback).toBeVisible();
    await expect(fallback).toBeFocused();
    await expect(fallback).toHaveValue(/This request has not been sent/);
    await expect(page.locator('.booking-status')).toContainText('Automatic copying is unavailable');
    expect(await fallback.evaluate((input) => input.selectionEnd - input.selectionStart)).toBeGreaterThan(100);
  });

  test('Escape restores the opener and closing clears personal information', async ({ page }) => {
    const trigger = await startRequest(page);
    await nextBookingStep(page);
    await completeVisit(page);
    await page.locator('#booking-name').fill('Private Visitor');
    await page.locator('#booking-email').fill('private@example.com');
    await page.keyboard.press('Escape');
    await expect(page.locator('#booking-dialog')).not.toBeVisible();
    await expect(trigger).toBeFocused();
    expect(await page.locator('#booking-name').inputValue()).toBe('');
    expect(await page.locator('#booking-email').inputValue()).toBe('');
    await trigger.click();
    await expect(page.locator('#booking-title')).toHaveText('Choose your treatment');
    await nextBookingStep(page);
    await expect(page.locator('#booking-town')).toHaveValue('');
  });
});

test.describe('Original photographs and full-image gallery', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
  });

  test('all six approved photographs decode at their original dimensions @release-assets', async ({ page }) => {
    await page.goto('/#showcase');
    const images = page.locator('.gallery-grid [data-gallery] img');
    await expect(images).toHaveCount(6);
    const originals = [
      { filename: 'treatment-menu.jpg', width: 720, height: 1280 },
      { filename: 'massage-session.jpg', width: 1080, height: 609 },
      { filename: 'supreme-treatment.jpg', width: 853, height: 1280 },
      { filename: 'training-certificate.jpg', width: 960, height: 1280 },
      { filename: 'supreme-poster.jpg', width: 853, height: 1280 },
      { filename: 'personal-care.jpg', width: 1080, height: 608 },
    ];
    for (const { filename, width, height } of originals) {
      const image = page.locator(`.gallery-grid img[src$="/${filename}"]`);
      await image.scrollIntoViewIfNeeded();
      await expect(image).toBeVisible();
      const decoded = await image.evaluate(async (image) => {
        await image.decode();
        return { width: image.naturalWidth, height: image.naturalHeight };
      });
      expect(decoded, `Approved photograph ${filename}`).toEqual({ width, height });
      expect(await image.getAttribute('alt')).toBeTruthy();
    }
  });

  test('lightbox preserves whole images, supports arrows and restores keyboard focus', async ({ page }) => {
    await page.goto('/#showcase');
    const trigger = page.locator('.gallery-grid [data-gallery="0"]');
    await trigger.click();
    const dialog = page.locator('#gallery-dialog');
    const image = page.locator('#gallery-image');
    await expect(dialog).toBeVisible();
    await expect(image).toHaveAttribute('src', /supreme-treatment\.jpg/);
    await expect(image).toHaveCSS('object-fit', 'contain');
    await expect(page.locator('#gallery-caption')).not.toBeEmpty();
    await page.keyboard.press('ArrowRight');
    await expect(image).toHaveAttribute('src', /massage-session\.jpg/);
    await page.locator('#gallery-next').click();
    await expect(image).toHaveAttribute('src', /personal-care\.jpg/);
    await page.locator('#gallery-prev').click();
    await expect(image).toHaveAttribute('src', /massage-session\.jpg/);
    await page.keyboard.press('ArrowLeft');
    await expect(image).toHaveAttribute('src', /supreme-treatment\.jpg/);
    await page.keyboard.press('ArrowLeft');
    await expect(image).toHaveAttribute('src', /treatment-menu\.jpg/);
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(trigger).toBeFocused();
  });
});
