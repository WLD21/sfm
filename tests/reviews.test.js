import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPrivateReview, isReviewEmail, isReviewPhone, reviewMailtoLink, validateReview } from '../src/review-validation.js';

const review = { rating: '5', displayName: 'Test visitor', experience: 'A calm and welcoming visit.', contactType: 'email', contact: 'visitor@example.com' };

test('review ratings start empty and accept every honest rating from one to five', () => {
  for (const rating of ['', undefined, null, 0, 6, 1.5, true, [], 'five']) assert.equal(validateReview({ ...review, rating }).valid, false);
  for (const rating of [1, 2, 3, 4, 5]) assert.equal(validateReview({ ...review, rating }).valid, true);
});

test('a review requires meaningful text and exactly one supported contact type', () => {
  for (const field of ['displayName', 'experience', 'contact']) assert.equal(validateReview({ ...review, [field]: '   ' }).valid, false, field);
  assert.equal(validateReview({ ...review, displayName: 'a'.repeat(81) }).valid, false);
  assert.equal(validateReview({ ...review, experience: 'a'.repeat(2001) }).valid, false);
  assert.equal(validateReview({ ...review, contactType: 'website' }).valid, false);
  const result = validateReview({ ...review, displayName: '  Visitor  ', contact: ' visitor@example.com ' });
  assert.equal(result.valid, true);
  assert.equal(result.values.displayName, 'Visitor');
  assert.equal(result.values.contact, 'visitor@example.com');
});

test('phone reviews accept practical international formats and reject malformed numbers', () => {
  for (const contact of ['+32 471 23 45 67', '(03) 123-45-67', '0471.23.45.67']) {
    assert.equal(isReviewPhone(contact), true, contact);
    assert.equal(validateReview({ ...review, contactType: 'phone', contact }).valid, true);
  }
  for (const contact of ['123', '+', '1234567890123456', '+32 call me', '32+471234567', '++32471234567', '1234567\nBCC: other@example.com']) assert.equal(isReviewPhone(contact), false, contact);
});

test('review email addresses and recipient settings reject additional headers and URL injection', () => {
  for (const value of ['visitor@example.com', 'visitor+massage@example.co.uk']) assert.equal(isReviewEmail(value), true);
  for (const value of ['', null, 'name', 'a@b', 'a@example.com?bcc=other@example.com', 'a@example.com\r\nBcc:other@example.com', 'a@example.com,b@example.com', 'mailto:a@example.com', 'a@-example.com', '.a@example.com', 'a..b@example.com', ' a@example.com']) {
    assert.equal(isReviewEmail(value), false, String(value));
    assert.equal(reviewMailtoLink(value, review), null);
  }
});

test('private handoff preserves the rating and labels contact as private and unverified', () => {
  const text = buildPrivateReview({ ...review, rating: 2 });
  assert.match(text, /Rating: 2 \/ 5 stars/);
  assert.match(text, /PRIVATE CONTACT — do not include in a public review/);
  assert.match(text, /Email: visitor@example.com/);
  assert.match(text, /not been verified/);
  assert.match(text, /does not send or publish/);
  assert.throws(() => buildPrivateReview({ ...review, rating: 0 }), TypeError);
});

test('email handoff encodes the whole private draft without introducing extra headers', () => {
  const hostileText = { ...review, experience: 'Relaxing & welcoming? #review\nBcc: another@example.com' };
  const link = reviewMailtoLink('owner@example.com', hostileText);
  const query = new URL(link).searchParams;
  assert.deepEqual([...query.keys()], ['subject', 'body']);
  assert.equal(query.get('body'), buildPrivateReview(hostileText));
  assert.equal(link.startsWith('mailto:owner%40example.com?subject='), true);
  assert.equal(reviewMailtoLink('owner@example.com', { ...review, contact: '' }), null);
});
