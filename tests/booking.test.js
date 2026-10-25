import test from 'node:test';
import assert from 'node:assert/strict';
import { services, priceFor, formatEUR, dateBounds, validateVisitDate } from '../src/services.js';

test('all twelve approved prices match the source menu in integer cents', () => {
  const expected = [
    ['relaxing-oil', 5999, 7499],
    ['foot', 5999, 7499],
    ['head-neck', 5999, 7499],
    ['deep-tissue', 6499, 7999],
    ['duo-relaxing', 11999, 13999],
    ['duo-sports', 12499, 14499],
  ];
  assert.equal(services.length, 6);
  for (const [id, sixty, ninety] of expected) {
    assert.equal(priceFor(id, 60), sixty);
    assert.equal(priceFor(id, 90), ninety);
    assert.ok(Number.isInteger(priceFor(id, 60)));
  }
});

test('duo totals represent two people, never a per-person amount', () => {
  assert.equal(services.find(({ id }) => id === 'duo-relaxing').people, 2);
  assert.equal(services.find(({ id }) => id === 'duo-sports').people, 2);
  assert.equal(formatEUR(priceFor('duo-relaxing', 60)), '€119.99');
  assert.equal(formatEUR(priceFor('relaxing-oil', 90)), '€74.99');
});

test('invalid services, durations and prices cannot silently become prices', () => {
  assert.equal(priceFor('unknown', 60), null);
  assert.equal(priceFor('foot', 30), null);
  for (const value of [-1, 59.99, NaN, '5999', null, undefined]) assert.equal(formatEUR(value), null);
});

test('date validation uses local today and an inclusive one-year horizon', () => {
  const today = new Date(2026, 9, 17, 23, 59, 59);
  assert.deepEqual(dateBounds(today), { min: '2026-10-17', max: '2027-10-17' });
  assert.equal(validateVisitDate('2026-10-17', today), '');
  assert.equal(validateVisitDate('2027-10-17', today), '');
  assert.match(validateVisitDate('2026-10-16', today), /today or a later/);
  assert.match(validateVisitDate('2027-10-18', today), /within the next year/);
});

test('impossible and malformed dates are rejected', () => {
  const today = new Date(2026, 0, 1);
  for (const value of ['2026-02-29', '2026-04-31', '2026-13-01', '2026-00-01', '2026-01-00']) {
    assert.match(validateVisitDate(value, today), /real calendar date/);
  }
  for (const value of ['', '2026-1-1', '17/10/2026', '<script>', undefined]) {
    assert.match(validateVisitDate(value, today), /Choose a preferred date/);
  }
});

test('leap-day anniversaries clamp to the last day of February', () => {
  const leapDay = new Date(2028, 1, 29, 1);
  assert.deepEqual(dateBounds(leapDay), { min: '2028-02-29', max: '2029-02-28' });
  assert.equal(validateVisitDate('2029-02-28', leapDay), '');
  assert.match(validateVisitDate('2029-03-01', leapDay), /within the next year/);
  assert.equal(validateVisitDate('2028-02-29', new Date(2027, 2, 1)), '');
});
