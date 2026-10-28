import { chromium, expect } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '4207', '--strictPort'], { stdio: 'inherit' });
let browser;
try {
  for (let i = 0; i < 100; i++) {
    try { const response = await fetch('http://127.0.0.1:4207'); if (response.ok) break; } catch {}
    if (i === 99) throw new Error('Scene capture server did not start');
    await new Promise(resolve => setTimeout(resolve, 150));
  }
  browser = await chromium.launch({ ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}), args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  await mkdir('public/images', { recursive: true });
  const records = [];
  for (const [size, viewport] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
    for (const mode of ['gym', 'spa']) {
      const context = await browser.newContext({ viewport, deviceScaleFactor: 1, reducedMotion: 'no-preference' });
      await context.addInitScript(() => {
        sessionStorage.setItem('sfm-intro-seen', '1');
        Element.prototype.requestPointerLock = () => Promise.reject(new Error('Native pointer lock disabled in verification'));
        Element.prototype.setPointerCapture = function () {};
        Element.prototype.releasePointerCapture = function () {};
        Document.prototype.exitPointerLock = function () {};
      });
      const page = await context.newPage();
      await page.goto('http://127.0.0.1:4207/?lang=en&experience=' + mode);
      const host = page.locator('[data-scene="' + mode + '"]');
      await host.scrollIntoViewIfNeeded();
      await expect(host).toHaveAttribute('data-scene-ready', 'true', { timeout: 30000 });
      await page.evaluate(() => document.querySelector('.motion-control').click());
      await expect(page.locator('body')).toHaveAttribute('data-motion', 'paused');
      // A locator screenshot includes anything composited above the canvas.
      // Hide HTML labels and fixed controls so the poster contains the scene
      // alone; those accessible labels remain live HTML in every motion mode.
      await page.addStyleTag({ content: '.scene-topline,.scene-caption,.scene-arc,.hero-caption,.hero-seal,.mobile-booking-bar,.spa-atmosphere-card > p { visibility:hidden!important; }' });
      const canvas = host.locator('canvas');
      const path = 'public/images/scene-' + mode + '-' + size + '.png';
      const bytes = await canvas.screenshot({ path });
      const rect = await canvas.boundingBox();
      records.push({ mode, size, path, width: rect.width, height: rect.height, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'), source: 'Final Three.js scene at rest, captured by Chrome' });
      await context.close();
    }
  }
  await mkdir('docs/previews', { recursive: true });
  await writeFile('docs/previews/scene-posters.json', JSON.stringify(records, null, 2) + '\n');
  console.log('Captured four exact desktop/phone WebGL scene posters:', records.map(r => r.path));
} finally { await browser?.close(); server.kill(); }
