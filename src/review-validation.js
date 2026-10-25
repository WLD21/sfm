import { t } from './i18n.js';
const EMAIL = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)+$/;

function clean(value) {
  return typeof value === 'string' ? value.trim() : '';
}

/** Accept one plain address, never a URL or additional mail headers. */
export function isReviewEmail(value) {
  return typeof value === 'string' && value.length <= 254 && value === value.trim()
    && EMAIL.test(value) && !value.split('@')[0].startsWith('.')
    && !value.split('@')[0].endsWith('.') && !value.split('@')[0].includes('..');
}

export function isReviewPhone(value) {
  if (typeof value !== 'string' || value.length > 40 || !/^\+?[\d ().-]+$/.test(value)) return false;
  const digits = value.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;
}

export function validateReview(input = {}) {
  const values = {
    rating: typeof input.rating === 'number' || typeof input.rating === 'string' ? Number(input.rating) : 0,
    displayName: clean(input.displayName),
    experience: clean(input.experience),
    contactType: clean(input.contactType),
    contact: clean(input.contact),
  };
  const errors = {};
  if (!Number.isInteger(values.rating) || values.rating < 1 || values.rating > 5) errors.rating = t('Choose a rating from 1 to 5 stars.');
  if (!values.displayName || values.displayName.length > 80) errors.displayName = t('Add a display name of up to 80 characters.');
  if (!values.experience || values.experience.length > 2000) errors.experience = t('Share your experience in up to 2,000 characters.');
  if (!['email', 'phone'].includes(values.contactType)) errors.contactType = t('Choose email or phone to link your review.');
  else if (values.contactType === 'email' && !isReviewEmail(values.contact)) errors.contact = t('Enter a complete email address, such as name@example.com.');
  else if (values.contactType === 'phone' && !isReviewPhone(values.contact)) errors.contact = t('Enter a phone number with 7 to 15 digits. You can include a country code, spaces, brackets or dashes.');
  return { values, errors, valid: Object.keys(errors).length === 0 };
}

/** A private handoff includes contact information; it is never a public post. */
export function buildPrivateReview(input) {
  const { values, valid } = validateReview(input);
  if (!valid) throw new TypeError('A complete, valid review is required.');
  return [
    t('Supreme Fitness & Massage — private review draft'),
    '',
    `${t('Rating')}: ${t('{rating} / 5 stars', { rating: values.rating })}`,
    `${t('Display name')}: ${values.displayName}`,
    `${t('Experience')}:`,
    values.experience,
    '',
    t('PRIVATE CONTACT — do not include in a public review'),
    `${t(values.contactType === 'email' ? 'Email' : 'Phone')}: ${values.contact}`,
    t('This contact information has not been verified.'),
    '',
    t('This is a draft. Preparing, copying or downloading it does not send or publish a review.'),
  ].join('\n');
}

export function reviewMailtoLink(recipientEmail, input) {
  if (!isReviewEmail(recipientEmail) || !validateReview(input).valid) return null;
  return `mailto:${encodeURIComponent(recipientEmail)}?subject=${encodeURIComponent(t('My Supreme Fitness & Massage review'))}&body=${encodeURIComponent(buildPrivateReview(input))}`;
}
