import { test as base, expect } from '@playwright/test';
export { expect };
export const test = base.extend({
  context: async ({ context }, use) => {
    await context.addInitScript(() => {
      Element.prototype.requestPointerLock = () => Promise.reject(new Error('Native pointer lock disabled in verification'));
      Element.prototype.setPointerCapture = function () {};
      Element.prototype.releasePointerCapture = function () {};
      Document.prototype.exitPointerLock = function () {};
    });
    await use(context);
  },
});
