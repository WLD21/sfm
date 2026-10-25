import test from 'node:test';
import assert from 'node:assert/strict';
import { services, priceFor } from '../src/services.js';
import { ANTWERP_TRAVEL, estimateTravel, describeTravel } from '../src/travel.js';

test('Antwerp adds the €9.99–€14.99 range once using integer cents for every menu price', () => {
  assert.deepEqual(ANTWERP_TRAVEL, { minCents: 999, maxCents: 1499 });
  for (const service of services) {
    for (const duration of [60, 90]) {
      const treatment = priceFor(service.id, duration);
      assert.deepEqual(estimateTravel(treatment, 'antwerp'), {
        area: 'antwerp', treatmentCents: treatment,
        travelMinCents: 999, travelMaxCents: 1499,
        totalMinCents: treatment + 999, totalMaxCents: treatment + 1499,
      });
    }
  }
  assert.equal(describeTravel(5999, 'antwerp').price, '€69.98–€74.98');
  assert.equal(describeTravel(7499, 'antwerp').price, '€84.98–€89.98');
});

test('outside Antwerp has a distance-based quote and no numeric final total', () => {
  const estimate = estimateTravel(5999, 'outside');
  assert.equal(estimate.area, 'outside');
  for (const key of ['travelMinCents', 'travelMaxCents', 'totalMinCents', 'totalMaxCents']) {
    assert.equal(estimate[key], null);
  }
  const copy = describeTravel(5999, 'outside');
  assert.equal(copy.priceLabel, 'Price basis');
  assert.equal(copy.price, '€59.99 treatment + travel quote');
  assert.match(copy.travel, /agreed with you based on total travel distance/);
  assert.match(copy.note, /No travel fee or final total is set/);
});

test('missing or unrecognized areas never become free travel or inferred locations', () => {
  for (const area of ['', undefined, null, 'Antwerp', '2000', 'Ghent', '__proto__']) {
    const estimate = estimateTravel(5999, area);
    assert.equal(estimate.area, null);
    for (const key of ['travelMinCents', 'travelMaxCents', 'totalMinCents', 'totalMaxCents']) {
      assert.equal(estimate[key], null);
    }
    assert.equal(describeTravel(5999, area).travel, 'Choose your travel area');
    assert.match(describeTravel(5999, area).price, /travel not estimated/);
  }
});

test('invalid amounts cannot cause decimal drift, overflow or misleading estimates', () => {
  for (const amount of [-1, 59.99, '5999', null, undefined, NaN, Infinity, Number.MAX_SAFE_INTEGER]) {
    assert.throws(() => estimateTravel(amount, 'antwerp'), RangeError);
  }
  const highest = Number.MAX_SAFE_INTEGER - 1499;
  assert.equal(estimateTravel(highest, 'antwerp').totalMaxCents, Number.MAX_SAFE_INTEGER);
  assert.equal(estimateTravel(0, 'antwerp').totalMinCents, 999);
});

test('duo estimates show one provisional travel fee and require two-therapist confirmation', () => {
  const copy = describeTravel(11999, 'antwerp', 2);
  assert.equal(copy.price, '€129.98–€134.98 for 2 people');
  assert.match(copy.note, /once per visit/);
  assert.match(copy.note, /two therapists.*must be confirmed/);
  assert.equal(describeTravel(13999, 'outside', 2).price, '€139.99 treatment for 2 people + travel quote');
});
