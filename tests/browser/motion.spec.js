import { test, expect } from '@playwright/test';

// Retain the existing massage regression suite in its original spa context.
// dual-experience.spec.js separately verifies the new default training journey.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('sfm-experience', 'spa'));
});

async function openAnimatedShowcase(page) {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 1100, height: 720 });
  await page.addInitScript(() => sessionStorage.setItem('sfm-intro-seen', '1'));
  await page.goto('/#showcase');
  await expect(page.locator('#showcase')).toBeVisible();
}

async function opacity(locator) {
  return locator.evaluate((element) => Number(getComputedStyle(element).opacity));
}

async function imageTranslation(locator) {
  return locator.evaluate((element) => {
    const transform = getComputedStyle(element).transform;
    return transform === 'none' ? 0 : new DOMMatrixReadOnly(transform).m42;
  });
}

async function scrollIntoFrame(locator) {
  await locator.evaluate((element) => element.scrollIntoView({ behavior: 'instant', block: 'center' }));
}

test.describe('Showcase motion and visitor controls', () => {
  test('scrolling reveals a later gallery card and changes the photo position', async ({ page }) => {
    await openAnimatedShowcase(page);
    const lastCard = page.locator('.gallery-card[data-scroll-reveal]').last();
    await expect.poll(() => opacity(lastCard)).toBeLessThan(0.5);

    const photo = page.locator('#showcase img[data-parallax]').first();
    await expect.poll(() => photo.evaluate((element) => getComputedStyle(element).transform)).not.toBe('none');
    await photo.evaluate((element) => window.scrollTo({
      top: window.scrollY + element.getBoundingClientRect().top - 240,
      behavior: 'instant',
    }));
    // Settle the scrub at a known scroll position before comparing two positions.
    let previous = await imageTranslation(photo);
    let stableSamples = 0;
    await expect.poll(async () => {
      const current = await imageTranslation(photo);
      const change = Math.abs(current - previous);
      previous = current;
      stableSamples = change < 0.1 ? stableSamples + 1 : 0;
      return stableSamples;
    }, { intervals: [150] }).toBeGreaterThanOrEqual(3);
    const before = await imageTranslation(photo);
    const initialScroll = await page.evaluate(() => window.scrollY);
    await page.evaluate(() => window.scrollBy({ top: 160, behavior: 'instant' }));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(initialScroll + 100);
    await expect.poll(async () => Math.abs((await imageTranslation(photo)) - before)).toBeGreaterThan(0.5);

    await scrollIntoFrame(lastCard);
    await expect.poll(() => opacity(lastCard)).toBeGreaterThan(0.98);
    await lastCard.click();
    await expect(page.locator('#gallery-dialog')).toBeVisible();
    await expect(page.locator('#gallery-caption')).toContainText('6 / 6');
  });

  test('leaving and returning to the showcase restores usable scroll animations', async ({ page }) => {
    await openAnimatedShowcase(page);
    const lastCard = page.locator('.gallery-card[data-scroll-reveal]').last();
    await expect.poll(() => opacity(lastCard)).toBeLessThan(0.5);
    await scrollIntoFrame(lastCard);
    await expect.poll(() => opacity(lastCard)).toBeGreaterThan(0.98);

    await page.locator('#primary-nav [data-view="treatments"]').click();
    await expect(page.locator('#treatments')).toBeVisible();
    await page.locator('#primary-nav [data-view="showcase"]').click();
    await expect(page.locator('#showcase')).toBeVisible();
    await expect(page.locator('#showcase-title')).toBeFocused();
    await scrollIntoFrame(lastCard);
    await expect.poll(() => opacity(lastCard)).toBeGreaterThan(0.98);
    await lastCard.click();
    await expect(page.locator('#gallery-dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(lastCard).toBeFocused();
  });

  test('changing the reduced motion preference immediately restores static content', async ({ page }) => {
    await openAnimatedShowcase(page);
    const photo = page.locator('#showcase img[data-parallax]').first();
    const lastCard = page.locator('.gallery-card[data-scroll-reveal]').last();
    await expect.poll(() => photo.evaluate((element) => getComputedStyle(element).transform)).not.toBe('none');
    await expect.poll(() => opacity(lastCard)).toBeLessThan(0.5);

    await page.emulateMedia({ reducedMotion: 'reduce' });
    for (const card of await page.locator('.gallery-card').all()) {
      await expect.poll(() => opacity(card)).toBe(1);
      await expect(card).toHaveCSS('visibility', 'visible');
    }
    for (const image of await page.locator('#showcase img[data-parallax]').all()) {
      await expect(image).toHaveCSS('transform', 'none');
    }
    await scrollIntoFrame(lastCard);
    await lastCard.click();
    await expect(page.locator('#gallery-dialog')).toBeVisible();
  });

  test('keyboard visitors can reach and open all six photographs without hidden focused cards', async ({ page }) => {
    await openAnimatedShowcase(page);
    const cards = page.locator('.gallery-card');
    await expect(cards).toHaveCount(6);
    await page.locator('#showcase-title').focus();
    let opened = 0;
    for (let tab = 0; tab < 18 && opened < 6; tab += 1) {
      await page.keyboard.press('Tab');
      const focusedIndex = await cards.evaluateAll((elements) => elements.indexOf(document.activeElement));
      if (focusedIndex < 0) continue;
      const card = cards.nth(focusedIndex);
      await expect.poll(() => opacity(card)).toBeGreaterThan(0.98);
      await expect(card).toHaveCSS('visibility', 'visible');
      await page.keyboard.press('Enter');
      await expect(page.locator('#gallery-dialog')).toBeVisible();
      await expect(page.locator('#gallery-caption')).toContainText(`${focusedIndex + 1} / 6`);
      await page.keyboard.press('Escape');
      await expect(card).toBeFocused();
      opened += 1;
    }
    expect(opened).toBe(6);
  });

  test('the intro can be replayed, skipped by keyboard and closed with Escape', async ({ page }) => {
    await openAnimatedShowcase(page);
    const replay = page.locator('#replay-intro');
    const intro = page.locator('#intro-dialog');
    await expect(intro).not.toBeVisible();
    await replay.click();
    await expect(intro).toBeVisible();
    await expect(page.locator('#skip-intro')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(intro).not.toBeVisible();
    await expect(replay).toBeFocused();
    await replay.click();
    await expect(intro).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(intro).not.toBeVisible();
    await expect(replay).toBeFocused();
  });

  test('a blocked animation library leaves the complete gallery readable and usable', async ({ page }) => {
    let blockedImports = 0;
    await page.route(/gsap/i, (route) => {
      blockedImports += 1;
      return route.abort();
    });
    await openAnimatedShowcase(page);
    await expect.poll(() => blockedImports).toBeGreaterThan(0);
    const cards = page.locator('.gallery-card');
    await expect(cards).toHaveCount(6);
    for (const card of await cards.all()) {
      await expect.poll(() => opacity(card)).toBe(1);
      await expect(card).toHaveCSS('visibility', 'visible');
    }
    await cards.last().click();
    await expect(page.locator('#gallery-dialog')).toBeVisible();
    await expect(page.locator('#gallery-caption')).toContainText('6 / 6');
    await expect(page.locator('#gallery-image')).toHaveJSProperty('complete', true);
    await expect(page.locator('#gallery-image')).not.toHaveJSProperty('naturalWidth', 0);
  });
});
