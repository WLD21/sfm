import test from 'node:test';
import assert from 'node:assert/strict';
import { messages } from '../src/translations.js';
import { t, setLanguage, getLanguage, preferredLanguage } from '../src/i18n.js';
import { formatEUR } from '../src/services.js';
import { describeTravel, estimateTravel } from '../src/travel.js';

test('language selection respects explicit and saved choices before supported browser preferences', () => {
  assert.equal(preferredLanguage({ requested: 'en', saved: 'fr', browserLanguages: ['nl-BE'] }), 'en');
  assert.equal(preferredLanguage({ requested: 'invalid', saved: 'fr', browserLanguages: ['nl-BE'] }), 'fr');
  assert.equal(preferredLanguage({ browserLanguages: ['de-BE', 'nl-BE', 'fr-BE'] }), 'nl');
  assert.equal(preferredLanguage({ browserLanguages: ['FR-be', 'en-GB'] }), 'fr');
  assert.equal(preferredLanguage({ browserLanguages: [null, 'de-BE'] }), 'en');
  assert.equal(preferredLanguage(), 'en');
});

test('French and Dutch copy preserve all named interpolation parameters', () => {
  const parameters = value => [...value.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort();
  for (const [source, translations] of Object.entries(messages)) {
    for (const language of ['fr', 'nl']) {
      assert.ok(translations[language]?.trim(), `${language}: ${source}`);
      assert.deepEqual(parameters(translations[language]), parameters(source), `${language}: ${source}`);
    }
  }
});

test('locale changes format euro prices without altering cents or inventing travel quotes', () => {
  try {
    for (const language of ['fr', 'nl']) {
      setLanguage(language);
      assert.match(formatEUR(5999), /59,99/);
      assert.equal(estimateTravel(5999, 'antwerp').totalMinCents, 6998);
      assert.equal(estimateTravel(5999, 'outside').totalMaxCents, null);
      assert.doesNotMatch(describeTravel(5999, 'outside').note, /No travel fee/);
      assert.equal(t('Step {step} of {total}', { step: 2, total: 4 }), language === 'fr' ? 'Étape 2 sur 4' : 'Stap 2 van 4');
    }
    setLanguage('unsupported');
    assert.equal(getLanguage(), 'nl');
  } finally { setLanguage('en'); }
  assert.equal(formatEUR(5999), '€59.99');
});
