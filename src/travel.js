import { t } from './i18n.js';
import { formatEUR } from './services.js';

/** Provisional travel surcharge in integer cents, applied once per visit. */
export const ANTWERP_TRAVEL = Object.freeze({ minCents: 999, maxCents: 1499 });
export const TRAVEL_AREAS = Object.freeze({ antwerp: 'Within Antwerp', outside: 'Outside Antwerp' });

/** Unknown areas and distance-based quotes never imply free travel or a final total. */
export function estimateTravel(treatmentCents, area) {
  if (!Number.isSafeInteger(treatmentCents) || treatmentCents < 0 || treatmentCents > Number.MAX_SAFE_INTEGER - ANTWERP_TRAVEL.maxCents) {
    throw new RangeError('Treatment price must be a non-negative, safe integer amount in cents.');
  }
  const knownArea = Object.hasOwn(TRAVEL_AREAS, area) ? area : null;
  const quotedRange = knownArea === 'antwerp';
  return {
    area: knownArea,
    treatmentCents,
    travelMinCents: quotedRange ? ANTWERP_TRAVEL.minCents : null,
    travelMaxCents: quotedRange ? ANTWERP_TRAVEL.maxCents : null,
    totalMinCents: quotedRange ? treatmentCents + ANTWERP_TRAVEL.minCents : null,
    totalMaxCents: quotedRange ? treatmentCents + ANTWERP_TRAVEL.maxCents : null,
  };
}

/** Shared wording for the live estimate, review and exported appointment request. */
export function describeTravel(treatmentCents, area, people = 1) {
  const estimate = estimateTravel(treatmentCents, area);
  const range = (min, max) => `${formatEUR(min)}–${formatEUR(max)}`;
  if (estimate.area === 'antwerp') {
    return {
      area: t(TRAVEL_AREAS.antwerp),
      travel: `${range(estimate.travelMinCents, estimate.travelMaxCents)} ${t('per visit (estimated)')}`,
      priceLabel: t('Estimated total'),
      price: `${range(estimate.totalMinCents, estimate.totalMaxCents)}${people === 2 ? ` ${t('for 2 people')}` : ''}`,
      note: people === 2
        ? t('The travel range is added once per visit. Travel for two therapists and the final price must be confirmed with Supreme.')
        : t('Includes your treatment and an estimated travel fee. Supreme confirms the final fee and requested location before your visit.'),
    };
  }
  if (estimate.area === 'outside') {
    return {
      area: t(TRAVEL_AREAS.outside),
      travel: t('To be agreed with you based on total travel distance'),
      priceLabel: t('Price basis'),
      price: t('{price} treatment{people} + travel quote', { price: formatEUR(treatmentCents), people: people === 2 ? ` ${t('for 2 people')}` : '' }),
      note: t('No travel fee or final total is set. Share your location so Supreme can agree the distance-based quote with you before your visit.'),
    };
  }
  return {
    area: t('Not selected'),
    travel: t('Choose your travel area'),
    priceLabel: t('Price basis'),
    price: t('{price} treatment; travel not estimated', { price: formatEUR(treatmentCents) }),
    note: t('Select whether your requested location is within or outside Antwerp. Travel is not included in the menu price.'),
  };
}
