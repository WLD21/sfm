import { test, expect } from './safe-test.js';
import { PNG } from 'pngjs';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('sfm-intro-seen', '1'));
});
function changedPixels(a, b) {
  const one = PNG.sync.read(a), two = PNG.sync.read(b);
  expect(one.width).toBe(two.width); expect(one.height).toBe(two.height);
  let changed = 0;
  for (let i = 0; i < one.data.length; i += 4) {
    if (Math.abs(one.data[i] - two.data[i]) + Math.abs(one.data[i + 1] - two.data[i + 1]) + Math.abs(one.data[i + 2] - two.data[i + 2]) > 45) changed++;
  }
  return changed / (one.width * one.height);
}

test('real 3D renders, focus changes visible pixels and every training CTA carries the chosen focus', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/?lang=en');
  const scene = page.locator('[data-scene="gym"]');
  await expect(scene).toHaveAttribute('data-scene-ready', 'true', { timeout: 30000 });
  const before = await scene.locator('canvas').screenshot();
  await page.locator('[data-training-focus="confidence"]').click();
  await expect(scene).toHaveAttribute('data-scene-focus', 'confidence');
  await expect.poll(async () => changedPixels(before, await scene.locator('canvas').screenshot()), { timeout: 10000 }).toBeGreaterThan(.012);
  for (const selector of ['.gym-main-cta', '.header-book']) {
    await page.locator(selector).click();
    await expect(page.locator('#training-goal')).toHaveValue('confidence');
    await page.keyboard.press('Escape');
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('.mobile-booking-bar .button').click();
  await expect(page.locator('#training-goal')).toHaveValue('confidence');
});

test('scroll progress moves rendered weights and pause holds actual GPU frames', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 760 });
  await page.goto('/?lang=en');
  const scene = page.locator('[data-scene="gym"]');
  await expect(scene).toHaveAttribute('data-scene-ready', 'true', { timeout: 30000 });
  const initial = Number((await scene.getAttribute('data-sc-verify-state')).split(',')[3]);
  await page.evaluate(() => scrollTo({ top: 180, behavior: 'instant' }));
  await expect.poll(async () => Math.abs(Number((await scene.getAttribute('data-sc-verify-state')).split(',')[3]) - initial)).toBeGreaterThan(.05);
  await page.evaluate(() => document.querySelector('.motion-control').click());
  await expect(page.locator('body')).toHaveAttribute('data-motion', 'paused');
  const frames = await scene.getAttribute('data-scene-frames');
  await page.waitForTimeout(250);
  expect(await scene.getAttribute('data-scene-frames')).toBe(frames);
  await page.locator('[data-view="training"]').click();
  await expect(page.locator('.scene-canvas')).toHaveCount(0);
  expect(await page.evaluate(() => window.ScrollCraft.instances.length)).toBe(0);
});

test('sauna steam animates, mode switches release old contexts, and repeated navigation leaves one engine', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/?lang=en');
  for (const mode of ['spa', 'gym', 'spa']) {
    await page.locator('[data-experience-choice="' + mode + '"]').click();
    const scene = page.locator('[data-scene="' + mode + '"]');
    await expect(scene).toHaveAttribute('data-scene-ready', 'true', { timeout: 30000 });
    await expect(page.locator('.scene-canvas')).toHaveCount(1);
    const state = await scene.getAttribute('data-sc-verify-state');
    await expect.poll(() => scene.getAttribute('data-sc-verify-state')).not.toBe(state);
    expect(await page.evaluate(() => window.ScrollCraft.instances.length)).toBe(1);
  }
  await page.locator('.header-book').click();
  await expect(page.locator('#booking-dialog')).toBeVisible();
});

test('WebGL unavailable and context loss retain exact posters and useful controls', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      if (/webgl/i.test(type)) return null;
      return original.call(this, type, ...args);
    };
  });
  await page.goto('/?lang=en');
  await expect(page.locator('[data-scene="gym"]')).toHaveAttribute('data-scene-fallback', 'true', { timeout: 30000 });
  const img = page.locator('[data-scene="gym"] .scene-poster img');
  await expect.poll(() => img.evaluate(el => el.complete && el.naturalWidth > 0)).toBe(true);
  await page.locator('[data-training-focus="fitness"]').click();
  await page.locator('.gym-main-cta').click();
  await expect(page.locator('#training-goal')).toHaveValue('fitness');
});

test('actual WebGL context loss falls back without losing the enquiry', async ({ page }) => {
  await page.goto('/?lang=en');
  const scene = page.locator('[data-scene="gym"]');
  await expect(scene).toHaveAttribute('data-scene-ready', 'true', { timeout: 30000 });
  await scene.locator('canvas').evaluate(canvas => canvas.getContext('webgl2').getExtension('WEBGL_lose_context').loseContext());
  await expect(scene).toHaveAttribute('data-scene-fallback', 'true');
  await expect(scene.locator('canvas')).toHaveCount(0);
  await expect.poll(() => scene.locator('img').evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
  await page.locator('.gym-main-cta').click();
  await expect(page.locator('#training-request-dialog')).toBeVisible();
});

test('reduced motion never imports Three.js, phone crops fit and focus choices remain keyboard accessible', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const requests = [];
  page.on('request', req => requests.push(req.url()));
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/?lang=en');
    await expect(page.locator('.scene-canvas')).toHaveCount(0);
    await page.locator('[data-training-focus="strength"]').focus();
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-training-focus="fitness"]')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-training-focus="fitness"]')).toHaveAttribute('aria-pressed', 'true');
    for (const button of await page.locator('[data-training-focus]').all()) {
      const box = await button.boundingBox(); expect(box.height).toBeGreaterThanOrEqual(44);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await expect.poll(() => page.locator('[data-scene="gym"] img').evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
  }
  expect(requests.some(url => /scene-renderer|three.*\.js/.test(url))).toBe(false);
});
