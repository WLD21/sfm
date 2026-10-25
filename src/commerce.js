/**
 * Public commerce configuration only. An enabled action is an outbound link;
 * it is never evidence of availability, a reservation, or a completed payment.
 */
const currencies = new Set(
  typeof Intl.supportedValuesOf === 'function'
    ? Intl.supportedValuesOf('currency')
    : [],
);

const intervals = new Set(['week', 'month', 'year']);
const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const hasText = (value) => typeof value === 'string' && value.trim().length > 0;
const hasPrice = (value) => Number.isSafeInteger(value) && value >= 0;

function currencyCode(value) {
  if (typeof value !== 'string' || !/^[a-z]{3}$/i.test(value)) return null;
  const code = value.toUpperCase();
  return currencies.has(code) ? code : null;
}

/** Amounts use the currency's actual minor unit: JPY has 0 decimals, BHD has 3. */
export function formatPrice(priceMinor, currency, locale = 'en-GB') {
  const code = currencyCode(currency);
  if (!hasPrice(priceMinor) || !code) return null;

  try {
    const formatter = new Intl.NumberFormat(locale, { style: 'currency', currency: code });
    const decimals = formatter.resolvedOptions().maximumFractionDigits;
    const digits = String(priceMinor).padStart(decimals + 1, '0');
    // Pass an exact decimal string so large safe integers do not lose minor units.
    const amount = decimals
      ? `${digits.slice(0, -decimals)}.${digits.slice(-decimals)}`
      : digits;
    return formatter.format(amount);
  } catch {
    return null;
  }
}

function publicProviderUrl(value) {
  if (typeof value !== 'string' || !value || /[\s\\\u0000-\u001f\u007f]/u.test(value)) return null;
  // Requiring the literal scheme delimiter also rejects parser-repaired URLs.
  if (!/^https:\/\//i.test(value)) return null;

  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password) return null;
    const host = url.hostname.toLowerCase().replace(/\.$/, '');

    // Provider links must target a public DNS name. IP literals, development
    // hosts, and documentation placeholders are not real provider configuration.
    if (!host.includes('.') || /^\d+(?:\.\d+){3}$/.test(host) || host.includes(':')) return null;
    if (/(?:^|\.)(?:localhost|localdomain|local|internal|lan|home|onion|test|invalid|example)$/.test(host)) return null;
    if (/(?:^|\.)home\.arpa$/.test(host)) return null;
    if (/(?:^|\.)example\.(?:com|net|org)$/.test(host)) return null;
    if (!host.split('.').every((label) => /^[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?$/.test(label))) return null;
    if (host.length > 253 || (url.port && url.port !== '443')) return null;
    return url.href;
  } catch {
    return null;
  }
}

function inspectItem(value, kind, locale) {
  const item = isRecord(value) ? value : {};
  const issues = [];
  const add = (field, code, message) => issues.push({ field, code, message });
  const subscription = kind === 'subscription';
  const noun = subscription ? 'Subscription' : 'Service';
  const urlField = subscription ? 'checkoutUrl' : 'bookingUrl';

  if (!hasText(item.id)) add('id', 'missing_id', `${noun} needs a stable ID.`);
  if (!hasText(item.name)) add('name', 'missing_name', `${noun} needs its approved name.`);
  if (!hasPrice(item.priceMinor)) {
    add('priceMinor', 'invalid_price', `${noun} needs an approved, non-negative integer price in currency minor units.`);
  }
  if (!currencyCode(item.currency)) {
    add('currency', 'invalid_currency', `${noun} needs a supported three-letter ISO currency code.`);
  }
  if (subscription && !intervals.has(item.interval)) {
    add('interval', 'invalid_interval', 'Subscription needs an approved billing interval: week, month, or year.');
  }

  const url = publicProviderUrl(item[urlField]);
  if (!url) {
    add(urlField, 'invalid_provider_url', subscription
      ? 'Configure a valid public HTTPS payment checkout URL before enabling subscription checkout.'
      : 'Configure a valid public HTTPS calendar or booking URL before enabling booking.');
  }

  const enabled = issues.length === 0;
  return {
    state: {
      enabled,
      url: enabled ? url : null,
      priceLabel: formatPrice(item.priceMinor, item.currency, locale),
      issues: issues.map((issue) => issue.message),
    },
    details: issues,
  };
}

/** No slots are generated; the calendar provider owns availability and bookings. */
export function getBookingState(service, locale = 'en-GB') {
  return inspectItem(service, 'service', locale).state;
}

/** No transaction is initiated or marked paid by this module. */
export function getSubscriptionState(subscription, locale = 'en-GB') {
  return inspectItem(subscription, 'subscription', locale).state;
}

/**
 * Validate the public configuration and report every missing requirement.
 * `valid` only describes configuration syntax; it does not verify providers.
 */
export function validateCommerceConfig(config, locale = 'en-GB') {
  const source = isRecord(config) ? config : {};
  const issues = [];
  const result = { valid: false, issues, services: [], subscriptions: [] };

  for (const [key, kind] of [['services', 'service'], ['subscriptions', 'subscription']]) {
    const collection = source[key];
    if (!Array.isArray(collection) || collection.length === 0) {
      issues.push({ path: key, code: 'missing_collection', message: `Add the approved ${key} before enabling ${key === 'services' ? 'booking' : 'subscription checkout'}.` });
      continue;
    }

    const ids = new Map();
    for (const value of collection) {
      if (isRecord(value) && hasText(value.id)) ids.set(value.id.trim(), (ids.get(value.id.trim()) || 0) + 1);
    }

    result[key] = collection.map((item, index) => {
      const { state, details } = inspectItem(item, kind, locale);
      const id = isRecord(item) && hasText(item.id) ? item.id.trim() : null;
      if (id && ids.get(id) > 1) {
        const duplicate = { field: 'id', code: 'duplicate_id', message: `${kind === 'service' ? 'Service' : 'Subscription'} ID "${id}" must be unique.` };
        details.push(duplicate);
        state.issues.push(duplicate.message);
        state.enabled = false;
        state.url = null;
      }
      for (const { field, ...detail } of details) {
        issues.push({ path: `${key}[${index}].${field}`, ...detail });
      }
      return { id, ...state };
    });
  }

  result.valid = issues.length === 0;
  return result;
}
