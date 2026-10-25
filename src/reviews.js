import { t, translateTree } from './i18n.js';
import './reviews.css';
import { buildPrivateReview, isReviewEmail, reviewMailtoLink, validateReview } from './review-validation.js';

/** Keep the draft in this page only. Email is a user-controlled handoff, not a submission. */
export function setupReviews(config = {}) {
  const root = document.querySelector('#review-form-root');
  if (!root) return { clearReview() {} };
  const recipientEmail = isReviewEmail(config?.recipientEmail) ? config.recipientEmail : '';
  root.innerHTML = `
    <p class="review-delivery-note review-availability" role="note">${recipientEmail ? 'Prepare your review, then open your email app to share it with Supreme. You choose when to send it.' : 'Review sending is not available yet. You can prepare a private draft, then copy or save it for later.'}</p>
    <div class="reviews-layout">
      <form id="review-form" class="review-form" novalidate>
        <fieldset class="review-rating-field">
          <legend>Your rating <span>(1–5 stars)</span></legend>
          <div class="review-stars">
            ${[1, 2, 3, 4, 5].map((rating) => `<label class="review-star-choice"><input type="radio" name="rating" value="${rating}" required aria-label="${rating} ${rating === 1 ? 'star' : 'stars'}"><span class="review-star-symbol" aria-hidden="true">★</span><span class="review-star-number" aria-hidden="true">${rating}</span></label>`).join('')}
          </div>
          <p class="review-field-hint">Choose the rating that reflects your experience.</p>
        </fieldset>
        <label class="review-label" for="review-display-name">Display name</label>
        <input id="review-display-name" name="displayName" maxlength="80" autocomplete="nickname" required aria-describedby="review-name-note">
        <p id="review-name-note" class="review-field-hint">The name you would like shown with your review.</p>
        <label class="review-label" for="review-experience">Tell us about your experience</label>
        <textarea id="review-experience" name="experience" maxlength="2000" rows="5" required aria-describedby="review-experience-note"></textarea>
        <p id="review-experience-note" class="review-field-hint">Up to 2,000 characters. Please keep contact details and sensitive personal information out of your review.</p>
        <fieldset class="review-contact-type">
          <legend>Link your review to a contact</legend>
          <div class="review-contact-choices">
            <label><input type="radio" name="contactType" value="email" checked> Email</label>
            <label><input type="radio" name="contactType" value="phone"> Phone</label>
          </div>
        </fieldset>
        <div class="review-email-field">
          <label class="review-label" for="review-email">Your email address</label>
          <input id="review-email" type="email" name="email" maxlength="254" autocomplete="email" required aria-describedby="review-contact-note">
        </div>
        <div class="review-phone-field" hidden>
          <label class="review-label" for="review-phone">Your phone number</label>
          <input id="review-phone" type="tel" name="phone" maxlength="40" autocomplete="tel" disabled aria-describedby="review-contact-note">
        </div>
        <p id="review-contact-note" class="review-field-hint">Your contact is kept separate from the review preview. It is included in your private copy or email so Supreme can link the review to you. Contact details are not verified here.</p>
        <div class="review-form-actions">
          <button type="submit" class="review-button review-primary">Prepare review <span aria-hidden="true">→</span></button>
          <button type="reset" class="review-button review-secondary">Clear review</button>
        </div>
        <p class="review-privacy">Your draft stays in this page’s memory until you clear it, leave this section or reload. It is not stored or published. A copied or downloaded draft remains on your device.</p>
      </form>
      <aside class="review-side" aria-label="Your review preview">
        <div class="review-introduction">
          <span class="review-ornament" aria-hidden="true">✦</span>
          <p class="eyebrow">A moment to reflect</p>
          <h2>Your words.<br>Your experience.</h2>
          <p>From the first welcome to how you felt afterwards, we’d love to hear about your visit.</p>
        </div>
        <section id="review-prepared" class="review-prepared" hidden aria-labelledby="review-preview-title">
          <p class="eyebrow">Ready for your review</p>
          <h2 id="review-preview-title" tabindex="-1">Your review preview</h2>
          <p class="review-preview-notice">This is a preview. Nothing has been sent or published.</p>
          <article class="review-preview-card" aria-label="Review content without contact details">
            <p class="review-preview-rating"></p>
            <p class="review-preview-experience"></p>
            <p class="review-preview-name"></p>
          </article>
          <div class="review-private-contact"><strong>Private contact</strong><p class="review-preview-contact"></p><p>Included only in your private copy or email, not in the review preview above.</p></div>
          <div class="review-share-actions">
            <a class="review-button review-primary review-send" hidden>Open email to send</a>
            <button class="review-button review-secondary review-copy" type="button">Copy private review</button>
            <button class="review-button review-secondary review-download" type="button">Save review as TXT</button>
          </div>
          <p class="review-handoff-note">${recipientEmail ? 'Your email app opens with the review and private contact details. You still need to send the message there. Opening email does not confirm delivery or publish your review.' : 'Review sending is not available yet. Copying or saving makes a private draft; it does not send or publish it.'}</p>
          <div class="review-copy-fallback" hidden><label class="review-label" for="review-private-text">Select and copy your private review</label><textarea id="review-private-text" readonly rows="8" spellcheck="false"></textarea></div>
        </section>
        <p class="review-status" role="status" aria-live="polite"></p>
      </aside>
    </div>`;

  translateTree(root);
  const form = root.querySelector('#review-form');
  const field = (name) => form.elements.namedItem(name);
  const prepared = root.querySelector('#review-prepared');
  const introduction = root.querySelector('.review-introduction');
  const status = root.querySelector('.review-status');
  const emailAction = root.querySelector('.review-send');
  const fallback = root.querySelector('.review-copy-fallback');
  const privateText = root.querySelector('#review-private-text');
  let draft = '';
  let generation = 0;

  function invalidatePreview() {
    generation += 1;
    draft = '';
    privateText.value = '';
    prepared.hidden = true;
    introduction.hidden = false;
    fallback.hidden = true;
    emailAction.hidden = true;
    emailAction.removeAttribute('href');
    for (const selector of ['.review-preview-rating', '.review-preview-name', '.review-preview-experience', '.review-preview-contact']) root.querySelector(selector).textContent = '';
    status.textContent = '';
  }

  function updateContactType() {
    const useEmail = field('contactType').value === 'email';
    root.querySelector('.review-email-field').hidden = !useEmail;
    root.querySelector('.review-phone-field').hidden = useEmail;
    field('email').disabled = !useEmail;
    field('email').required = useEmail;
    field('phone').disabled = useEmail;
    field('phone').required = !useEmail;
    const unused = field(useEmail ? 'phone' : 'email');
    unused.value = '';
    unused.setCustomValidity('');
  }

  function clearReview() {
    form.reset();
    for (const control of form.querySelectorAll('input, textarea')) control.setCustomValidity('');
    updateContactType();
    invalidatePreview();
  }

  form.addEventListener('reset', () => {
    // Native reset runs after this event. Wait to reflect its default email choice.
    queueMicrotask(() => {
      for (const control of form.querySelectorAll('input, textarea')) control.setCustomValidity('');
      updateContactType();
      invalidatePreview();
    });
  });

  form.addEventListener('input', (event) => {
    if (typeof event.target.setCustomValidity === 'function') event.target.setCustomValidity('');
    if (event.target.name === 'rating') for (const radio of form.querySelectorAll('[name="rating"]')) radio.setCustomValidity('');
    invalidatePreview();
  });
  form.addEventListener('change', (event) => {
    if (event.target.name === 'contactType') updateContactType();
    invalidatePreview();
  });
  function prepareReview(moveFocus = true) {
    const contactType = field('contactType').value;
    const result = validateReview({ rating: field('rating').value, displayName: field('displayName').value, experience: field('experience').value, contactType, contact: field(contactType).value });
    for (const control of form.querySelectorAll('input, textarea')) control.setCustomValidity('');
    const errorControls = { rating: form.querySelector('[name="rating"]'), displayName: field('displayName'), experience: field('experience'), contactType: form.querySelector('[name="contactType"]'), contact: field(contactType) };
    for (const [name, message] of Object.entries(result.errors)) errorControls[name]?.setCustomValidity(message);
    if (!form.reportValidity() || !result.valid) return;
    invalidatePreview();
    const { values } = result;
    draft = buildPrivateReview(values);
    privateText.value = draft;
    root.querySelector('.review-preview-rating').textContent = `${'★'.repeat(values.rating)}${'☆'.repeat(5 - values.rating)} · ${t('{rating} / 5 stars', { rating: values.rating })}`;
    root.querySelector('.review-preview-experience').textContent = values.experience;
    root.querySelector('.review-preview-name').textContent = values.displayName;
    root.querySelector('.review-preview-contact').textContent = `${t(values.contactType === 'email' ? 'Email' : 'Phone')}: ${values.contact}`;
    const emailUrl = reviewMailtoLink(recipientEmail, values);
    if (emailUrl) {
      emailAction.href = emailUrl;
      emailAction.hidden = false;
    }
    prepared.hidden = false;
    introduction.hidden = true;
    if (moveFocus) root.querySelector('#review-preview-title').focus();
  }
  form.addEventListener('submit', (event) => { event.preventDefault(); prepareReview(); });
  root.querySelector('.review-copy').addEventListener('click', async () => {
    if (!draft) return;
    const currentGeneration = generation;
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(draft);
      if (generation === currentGeneration) status.textContent = t('Private review copied, including your contact details. Nothing has been sent or published.');
    } catch {
      if (generation !== currentGeneration) return;
      fallback.hidden = false;
      privateText.focus();
      privateText.select();
      status.textContent = t('Automatic copying is unavailable. Select and copy the private draft; it includes your contact details.');
    }
  });
  root.querySelector('.review-download').addEventListener('click', () => {
    if (!draft) return;
    const url = URL.createObjectURL(new Blob([draft], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'supreme-private-review.txt';
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    status.textContent = t('Private review download requested, including your contact details. Nothing has been sent or published.');
  });
  emailAction.addEventListener('click', () => {
    if (draft) status.textContent = t('Your email app was requested. Send the message there when you are ready; delivery is not confirmed here.');
  });
  document.addEventListener('languagechange', () => {
    for (const control of form.querySelectorAll('input, textarea')) control.setCustomValidity('');
    if (draft) prepareReview(false);
    status.textContent = '';
  });
  return { clearReview };
}
