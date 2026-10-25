import test from 'node:test';
import assert from 'node:assert/strict';
import { formatPrice, getBookingState, getSubscriptionState, validateCommerceConfig } from '../src/commerce.js';

// Fictional test data only; these are not the business's approved services/prices.
const service = {
  id: 'test-service', name: 'Test service', priceMinor: 6500,
  currency: 'GBP', bookingUrl: 'https://calendly.com/test-provider/test-service',
};
const subscription = {
  id: 'test-plan', name: 'Test subscription', priceMinor: 10000,
  currency: 'GBP', interval: 'month', checkoutUrl: 'https://buy.stripe.com/test_link',
};

test('missing configuration clearly disables every commerce action', () => {
  for (const value of [undefined, null, {}, false, [], 'unconfigured']) {
    const state = getBookingState(value);
    assert.equal(state.enabled, false);
    assert.equal(state.url, null);
    assert.equal(state.priceLabel, null);
    assert.ok(state.issues.some((issue) => issue.includes('approved')));
    assert.ok(state.issues.some((issue) => issue.includes('calendar or booking')));
  }
  const result = validateCommerceConfig({ services: [], subscriptions: [] });
  assert.equal(result.valid, false);
  assert.deepEqual(result.issues.map((issue) => issue.path), ['services', 'subscriptions']);
});

test('an approved price, currency, identity, and provider are all required', () => {
  for (const key of ['id', 'name', 'priceMinor', 'currency', 'bookingUrl']) {
    const incomplete = { ...service };
    delete incomplete[key];
    const state = getBookingState(incomplete);
    assert.equal(state.enabled, false, `missing ${key} must disable booking`);
    assert.equal(state.url, null);
  }
  for (const priceMinor of [-1, 1.5, '6500', NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal(getBookingState({ ...service, priceMinor }).enabled, false);
  }
  for (const currency of ['ZZZ', 'XXX', 'GBP ', '$', 123]) {
    assert.equal(getBookingState({ ...service, currency }).enabled, false);
  }
});

test('provider links reject unsafe, malformed, local, and placeholder destinations', () => {
  const invalidUrls = [
    'javascript:alert(1)', 'data:text/html,hello', 'http://calendly.com/test',
    '//calendly.com/test', 'https:calendly.com/test', 'https://',
    'https://user:secret@calendly.com/test', 'https://calendly.com\\@evil.org',
    ' https://calendly.com/test', 'https://calendly.com/a b', 'https://calendly.com/\n',
    'https://localhost', 'https://localhost.localdomain', 'https://calendar.internal',
    'https://calendar.local', 'https://calendar.home.arpa', 'https://calendar.lan',
    'https://calendar.test', 'https://example.com/booking',
    'https://checkout.example.org', 'https://127.0.0.1', 'https://2130706433',
    'https://10.0.0.1', 'https://[::1]', 'https://[2001:db8::1]',
    'https://calendly.com:444/test', 'https://-bad-host.org/test', 'https://a..org/test',
  ];
  for (const bookingUrl of invalidUrls) {
    const state = getBookingState({ ...service, bookingUrl });
    assert.equal(state.enabled, false, bookingUrl);
    assert.equal(state.url, null, bookingUrl);
  }
});

test('complete configuration exposes an external action without inventing a result', () => {
  const booking = getBookingState(service);
  assert.deepEqual(booking, { enabled: true, url: service.bookingUrl, priceLabel: '£65.00', issues: [] });
  const checkout = getSubscriptionState(subscription);
  assert.deepEqual(checkout, { enabled: true, url: subscription.checkoutUrl, priceLabel: '£100.00', issues: [] });
  for (const state of [booking, checkout]) {
    for (const forbidden of ['success', 'booked', 'paid', 'slots', 'availableSlots', 'reservation', 'paymentId']) {
      assert.equal(Object.hasOwn(state, forbidden), false);
    }
  }
});

test('subscription checkout requires an explicit approved billing interval', () => {
  for (const interval of [undefined, null, 'monthly', '', 12]) {
    const state = getSubscriptionState({ ...subscription, interval });
    assert.equal(state.enabled, false);
    assert.equal(state.url, null);
    assert.ok(state.issues.some((issue) => issue.includes('billing interval')));
  }
  for (const interval of ['week', 'month', 'year']) {
    assert.equal(getSubscriptionState({ ...subscription, interval }).enabled, true);
  }
  assert.equal(getSubscriptionState({ ...subscription, checkoutUrl: undefined }).enabled, false);
});

test('prices respect zero-, two-, and three-decimal currencies and preserve minor units', () => {
  assert.equal(formatPrice(6500, 'GBP'), '£65.00');
  assert.equal(formatPrice(6500, 'gbp'), '£65.00');
  assert.equal(formatPrice(6500, 'JPY', 'en-US'), '¥6,500');
  assert.equal(formatPrice(12345, 'BHD', 'en-US'), 'BHD\u00a012.345');
  assert.equal(formatPrice(0, 'GBP'), '£0.00');
  assert.equal(formatPrice(5, 'GBP'), '£0.05');
  assert.equal(formatPrice(Number.MAX_SAFE_INTEGER, 'GBP'), '£90,071,992,547,409.91');
  assert.equal(formatPrice(null, 'GBP'), null);
  assert.equal(formatPrice(6500, 'ZZZ'), null);
  assert.equal(formatPrice(-100, 'GBP'), null);
  assert.equal(formatPrice(6500, 'GBP', 'invalid_locale'), null);
});

test('configuration reports precise issues and never mutates caller data', () => {
  const incomplete = Object.freeze({ ...service, bookingUrl: '' });
  const input = Object.freeze({ services: Object.freeze([incomplete]), subscriptions: Object.freeze([Object.freeze(subscription)]) });
  const result = validateCommerceConfig(input);
  assert.equal(result.valid, false);
  assert.deepEqual(result.issues.map(({ path, code }) => ({ path, code })), [
    { path: 'services[0].bookingUrl', code: 'invalid_provider_url' },
  ]);
  assert.equal(result.services[0].enabled, false);
  assert.equal(result.subscriptions[0].enabled, true);
  assert.equal(incomplete.bookingUrl, '');
  assert.equal(validateCommerceConfig({ services: [service], subscriptions: [subscription] }).valid, true);
});

test('duplicate IDs are disabled so a selection cannot target an ambiguous service', () => {
  const result = validateCommerceConfig({ services: [service, { ...service, id: ` ${service.id} ` }], subscriptions: [subscription] });
  assert.equal(result.valid, false);
  assert.equal(result.issues.filter((issue) => issue.code === 'duplicate_id').length, 2);
  assert.ok(result.services.every((entry) => entry.enabled === false && entry.url === null));
});

test('malformed collections and entries are reported without throwing', () => {
  const result = validateCommerceConfig({ services: [null, true, []], subscriptions: 'not an array' });
  assert.equal(result.valid, false);
  assert.equal(result.services.length, 3);
  assert.ok(result.services.every((entry) => entry.enabled === false));
  assert.ok(result.issues.some((issue) => issue.path === 'subscriptions'));
});
