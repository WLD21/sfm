import { t, getLocale } from './i18n.js';
/** Source menu prices in integer euro cents; duo prices cover two people. */
export const services = Object.freeze([
  {
    id: 'relaxing-oil', name: 'Relaxing Oil', category: 'spa', people: 1,
    prices: { 60: 5999, 90: 7499 },
    description: 'Unhurried oil massage, with time to switch off and settle into your day.',
  },
  {
    id: 'foot', name: 'Foot', category: 'spa', people: 1,
    prices: { 60: 5999, 90: 7499 },
    description: 'Dedicated attention for tired feet. A quiet pause after a busy day.',
  },
  {
    id: 'head-neck', name: 'Head & Neck', category: 'spa', people: 1,
    prices: { 60: 5999, 90: 7499 },
    description: 'Focused massage for the head, neck and a little breathing space.',
  },
  {
    id: 'deep-tissue', name: 'Deep Tissue, Sports & Thai Combination', category: 'fitness', people: 1,
    prices: { 60: 6499, 90: 7999 },
    description: 'A combination of massage approaches for your active routine. Discuss your preferred pressure before your visit.',
  },
  {
    id: 'duo-relaxing', name: 'Duo Relaxing Oil', category: 'duo', people: 2,
    prices: { 60: 11999, 90: 13999 },
    description: 'Make time together with relaxing oil massage for two people, with two therapists.',
  },
  {
    id: 'duo-sports', name: 'Duo Sports & Oil', category: 'duo', people: 2,
    prices: { 60: 12499, 90: 14499 },
    description: 'Share a moment of care with sports and oil massage for two people, with two therapists.',
  },
].map((service) => Object.freeze({ ...service, prices: Object.freeze(service.prices) })));

export function priceFor(serviceId, duration = 60) {
  const service = services.find(({ id }) => id === serviceId);
  if (!service || ![60, 90].includes(Number(duration))) return null;
  return service.prices[Number(duration)];
}

export function formatEUR(cents) {
  if (!Number.isSafeInteger(cents) || cents < 0) return null;
  return new Intl.NumberFormat(getLocale(), { style: 'currency', currency: 'EUR' }).format(cents / 100);
}

function localISODate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** The one-year limit clamps 29 February to 28 February in a non-leap year. */
export function dateBounds(now = new Date()) {
  const year = now.getFullYear() + 1;
  const month = now.getMonth();
  const day = Math.min(now.getDate(), new Date(year, month + 1, 0).getDate());
  return { min: localISODate(now), max: localISODate(new Date(year, month, day)) };
}

/** Empty string means valid, matching the native setCustomValidity API. */
export function validateVisitDate(value, now = new Date()) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return t('Choose a preferred date.');
  const [year, month, day] = value.split('-').map(Number);
  const candidate = new Date(year, month - 1, day);
  if (candidate.getFullYear() !== year || candidate.getMonth() !== month - 1 || candidate.getDate() !== day) {
    return t('Choose a real calendar date.');
  }
  const { min, max } = dateBounds(now);
  if (value < min) return t('Choose today or a later date.');
  if (value > max) return t('Choose a date within the next year.');
  return '';
}
