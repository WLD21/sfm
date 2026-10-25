import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

async function enterReview(page, { rating = 5, contactType = 'email', contact = 'visitor@example.com', experience = 'A calm and welcoming treatment. I felt relaxed afterwards.' } = {}) {
  await page.getByRole('radio', { name: `${rating} ${rating === 1 ? 'star' : 'stars'}`, exact: true }).check();
  await page.getByLabel('Display name', { exact: true }).fill('Test visitor');
  await page.getByLabel('Tell us about your experience', { exact: true }).fill(experience);
  await page.locator(`input[name="contactType"][value="${contactType}"]`).check();
  await page.locator(`#review-${contactType}`).fill(contact);
}

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

test('review preparation requires an explicit rating, experience and valid contact', async ({ page }) => {
  await page.goto('/#reviews');
  await expect(page.locator('[name="rating"]:checked')).toHaveCount(0);
  await page.getByRole('button', { name: 'Prepare review' }).click();
  await expect(page.locator('#review-prepared')).toBeHidden();
  await expect(page.getByRole('radio', { name: '1 star', exact: true })).toBeFocused();
  await enterReview(page);
  await page.locator('#review-experience').fill('   ');
  await page.getByRole('button', { name: 'Prepare review' }).click();
  await expect(page.locator('#review-prepared')).toBeHidden();
  await expect(page.locator('#review-experience')).toBeFocused();
  await page.locator('#review-experience').fill('A welcoming experience.');
  await page.locator('#review-email').fill('not-an-address');
  await page.getByRole('button', { name: 'Prepare review' }).click();
  await expect(page.locator('#review-prepared')).toBeHidden();
  await expect(page.locator('#review-email')).toBeFocused();
  await page.locator('#review-email').fill('visitor@example.com');
  await page.getByRole('button', { name: 'Prepare review' }).click();
  await expect(page.locator('#review-prepared')).toBeVisible();
  await expect(page.locator('#review-preview-title')).toBeFocused();
  await expect(page.locator('.review-preview-card')).toContainText('5 / 5 stars');
  await expect(page.locator('.review-preview-card')).not.toContainText('visitor@example.com');
  await expect(page.locator('.review-preview-contact')).toContainText('visitor@example.com');
  await expect(page.locator('.review-preview-notice')).toContainText('Nothing has been sent or published');
});

test('a lower rating and phone contact produce a private, unsent download without storage or requests', async ({ page }) => {
  const writeRequests = [];
  page.on('request', (request) => { if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method())) writeRequests.push(request.url()); });
  await page.goto('/#reviews');
  await enterReview(page, { rating: 2, contactType: 'phone', contact: '+32 471 23 45 67' });
  await expect(page.locator('#review-email')).toBeDisabled();
  await page.getByRole('button', { name: 'Prepare review' }).click();
  await expect(page.locator('.review-preview-card')).toContainText('2 / 5 stars');
  await expect(page.locator('.review-preview-card')).not.toContainText('+32');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save review as TXT' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('supreme-private-review.txt');
  const text = await readFile(await download.path(), 'utf8');
  expect(text).toContain('Rating: 2 / 5 stars');
  expect(text).toContain('PRIVATE CONTACT — do not include in a public review');
  expect(text).toContain('Phone: +32 471 23 45 67');
  expect(text).toContain('does not send or publish a review');
  const stored = await page.evaluate(() => JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage } }));
  expect(stored).not.toContain('Test visitor');
  expect(stored).not.toContain('471');
  expect(writeRequests).toEqual([]);
});

test('edits invalidate a prepared review and switching contact or leaving the section clears private data', async ({ page }) => {
  await page.goto('/#reviews');
  await enterReview(page);
  await page.getByRole('button', { name: 'Prepare review' }).click();
  await page.locator('#review-experience').fill('Changed review before sending.');
  await expect(page.locator('#review-prepared')).toBeHidden();
  await expect(page.locator('.review-send')).not.toHaveAttribute('href');
  await expect(page.locator('#review-private-text')).toHaveValue('');
  await page.locator('[name="contactType"][value="phone"]').check();
  await expect(page.locator('#review-email')).toHaveValue('');
  await page.locator('#review-phone').fill('123');
  await page.getByRole('button', { name: 'Prepare review' }).click();
  await expect(page.locator('#review-prepared')).toBeHidden();
  await expect(page.locator('#review-phone')).toBeFocused();
  await page.locator('#review-phone').fill('+32 471 23 45 67');
  await page.getByRole('button', { name: 'Prepare review' }).click();
  await page.locator('#primary-nav [data-view="home"]').click();
  await page.locator('#primary-nav [data-view="reviews"]').click();
  await expect(page.locator('#review-display-name')).toHaveValue('');
  await expect(page.locator('#review-experience')).toHaveValue('');
  await expect(page.locator('#review-phone')).toHaveValue('');
  await expect(page.locator('[name="rating"]:checked')).toHaveCount(0);
  await expect(page.locator('#review-prepared')).toBeHidden();
  await enterReview(page);
  await page.getByRole('button', { name: 'Prepare review' }).click();
  await page.getByRole('button', { name: 'Clear review' }).click();
  await expect(page.locator('#review-email')).toHaveValue('');
  await expect(page.locator('#review-prepared')).toBeHidden();
  await expect(page.locator('.review-preview-contact')).toHaveText('');
});

test('review text is rendered safely and clipboard failure exposes a private copy on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: async () => { throw new Error('Test clipboard denial'); } }, configurable: true });
  });
  await page.goto('/#reviews');
  for (const radio of await page.locator('[name="rating"]').all()) {
    const box = await radio.boundingBox();
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
  }
  const experience = '<img src=x onerror="window.reviewInjected=true"> ' + 'A'.repeat(200);
  await enterReview(page, { experience });
  await page.getByRole('button', { name: 'Prepare review' }).click();
  await expect(page.locator('.review-preview-experience')).toHaveText(experience);
  await expect(page.locator('.review-preview-card img')).toHaveCount(0);
  expect(await page.evaluate(() => window.reviewInjected)).toBeUndefined();
  await page.getByRole('button', { name: 'Copy private review' }).click();
  await expect(page.locator('#review-private-text')).toBeVisible();
  await expect(page.locator('#review-private-text')).toHaveValue(/PRIVATE CONTACT[\s\S]*visitor@example.com/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});

test('email handoff appears only for a configured recipient and stays an unsent draft', async ({ page }) => {
  await page.route('**/src/site.config.js*', async (route) => {
    const response = await route.fetch();
    const body = (await response.text()).replace(/recipientEmail:\s*(['"]).*?\1/, "recipientEmail: 'reviews@example.com'");
    await route.fulfill({ response, body });
  });
  await page.goto('/#reviews');
  await enterReview(page, { experience: 'Thank you & see you again? A wonderful visit.' });
  await page.getByRole('button', { name: 'Prepare review' }).click();
  const link = page.getByRole('link', { name: 'Open email to send' });
  await expect(link).toBeVisible();
  const url = new URL(await link.getAttribute('href'));
  expect(decodeURIComponent(url.pathname)).toBe('reviews@example.com');
  expect([...url.searchParams.keys()]).toEqual(['subject', 'body']);
  expect(url.searchParams.get('body')).toContain('Thank you & see you again?');
  expect(url.searchParams.get('body')).toContain('PRIVATE CONTACT');
  await expect(page.locator('.review-handoff-note')).toContainText('You still need to send the message there');
  await expect(page.locator('.review-preview-notice')).toContainText('Nothing has been sent or published');
});
