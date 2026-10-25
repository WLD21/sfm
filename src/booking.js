import { t, getLocale, translateTree } from './i18n.js';
import { services, priceFor, formatEUR, dateBounds, validateVisitDate } from './services.js';
import { describeTravel } from './travel.js';
import './booking.css';

const CONTACT_URL = 'https://supremefitnessmassage.com/home';
const stepNames = ['Treatment', 'Visit', 'Details', 'Review'];

/** Prepare an appointment request. This module never sends or reserves it. */
export function setupBooking() {
  const dialog = document.createElement('dialog');
  dialog.id = 'booking-dialog';
  dialog.className = 'booking-dialog';
  dialog.setAttribute('aria-labelledby', 'booking-title');
  dialog.innerHTML = `
    <div class="booking-shell">
      <header class="booking-header">
        <p class="booking-eyebrow">YOUR MOMENT OF CARE</p>
        <button class="booking-close" type="button" aria-label="Close appointment request">×</button>
        <h2 id="booking-title" tabindex="-1">Choose your treatment</h2>
        <p class="booking-intro">Prepare a request to share with Supreme. Availability is confirmed personally.</p>
        <div class="booking-language"><label for="booking-language">Language</label><select id="booking-language" data-language-select translate="no"><option value="en" lang="en">English</option><option value="fr" lang="fr">Français</option><option value="nl" lang="nl">Nederlands</option></select></div>
      </header>
      <ol class="booking-stepper" aria-label="Appointment request progress">
        <li><span>1</span> Treatment</li><li><span>2</span> Visit</li>
        <li><span>3</span> Details</li><li><span>4</span> Review</li>
      </ol>
      <form class="booking-form" novalidate>
        <fieldset class="booking-step" data-step="0">
          <legend class="booking-sr-only">Treatment and duration</legend>
          <label for="booking-service">Treatment</label>
          <select id="booking-service" name="service" required></select>
          <p class="booking-description"></p>
          <label for="booking-duration">Time for yourself</label>
          <select id="booking-duration" name="duration" required>
            <option value="60">60 minutes</option><option value="90">90 minutes</option>
          </select>
          <div class="booking-price-block"><span>Menu price</span><strong class="booking-price"></strong><small class="booking-people"></small></div>
          <p class="booking-note">Prices are from the supplied menu. Your request, travel arrangements and final price are confirmed by Supreme before your visit.</p>
        </fieldset>
        <fieldset class="booking-step" data-step="1" hidden disabled>
          <legend class="booking-sr-only">Your preferred visit</legend>
          <div class="booking-field-row">
            <div><label for="booking-location">Where would you like your visit?</label>
              <select id="booking-location" name="location"><option value="home">Mobile massage at home</option><option value="mobile">Mobile massage at another location</option><option value="gym">At a gym</option><option value="spa">At a healthcare spa</option></select>
            </div>
            <div><label for="booking-venue">Venue name <span>(optional)</span></label><input id="booking-venue" name="venue" maxlength="150" autocomplete="off"></div>
          </div>
          <div class="booking-venue-confirmation" hidden>
            <p>Gym and spa visits depend on venue access, therapist availability and price confirmation.</p>
            <label class="booking-check"><input type="checkbox" name="venueConfirmed"><span>I understand the venue, access and price must be confirmed.</span></label>
          </div>
          <label for="booking-travel-area">Travel area</label>
          <select id="booking-travel-area" name="travelArea" required aria-describedby="booking-travel-note">
            <option value="">Choose your travel area</option><option value="antwerp">Within Antwerp</option><option value="outside">Outside Antwerp</option>
          </select>
          <div class="booking-travel-estimate" aria-live="polite" aria-atomic="true">
            <dl><dt>Travel fee</dt><dd class="booking-travel-fee"></dd><dt class="booking-total-label"></dt><dd class="booking-estimated-total"></dd></dl>
            <p id="booking-travel-note" class="booking-note"></p>
          </div>
          <div class="booking-field-row">
            <div><label for="booking-date">Preferred date</label><input id="booking-date" name="date" type="date" required aria-describedby="booking-date-note"></div>
            <div><label for="booking-time">Preferred time</label><select id="booking-time" name="time"><option>No preference</option><option>Morning</option><option>Afternoon</option><option>Evening</option></select></div>
          </div>
          <p id="booking-date-note" class="booking-note">This is a preference, not a live appointment slot.</p>
          <label for="booking-town">Postcode or town</label><input id="booking-town" name="town" maxlength="100" autocomplete="address-level2" required>
          <label for="booking-address">Requested address or location details <span>(optional)</span></label>
          <textarea id="booking-address" name="address" rows="2" maxlength="400" autocomplete="street-address" aria-describedby="booking-location-note"></textarea>
          <p id="booking-location-note" class="booking-note">Your therapist travels to your requested location, such as home, a hotel or your office. You can share the exact address later. Access, availability and travel costs must be agreed before your visit.</p>
        </fieldset>
        <fieldset class="booking-step" data-step="2" hidden disabled>
          <legend class="booking-sr-only">Your contact details</legend>
          <label for="booking-name">Full name</label><input id="booking-name" name="fullName" maxlength="120" autocomplete="name" required>
          <label for="booking-email">Email address</label><input id="booking-email" name="email" type="email" maxlength="254" autocomplete="email" required>
          <label for="booking-phone">Phone number <span>(optional)</span></label><input id="booking-phone" name="phone" type="tel" maxlength="50" autocomplete="tel">
          <p class="booking-privacy">Your details stay in this page’s memory until you close this form or reload the page. We do not send or store them. A copied or downloaded request remains in your clipboard or device.</p>
        </fieldset>
        <fieldset class="booking-step" data-step="3" hidden disabled>
          <legend class="booking-sr-only">Review and share your request</legend>
          <div class="booking-notice"><strong>Your request is ready to share.</strong><p>Nothing has been sent, reserved or paid. Copy or save your request, then share it through Supreme’s original website.</p></div>
          <dl class="booking-review"></dl>
          <div class="booking-share-actions">
            <button type="button" class="booking-secondary booking-copy">Copy request</button>
            <button type="button" class="booking-secondary booking-download">Save as TXT</button>
          </div>
          <div class="booking-copy-fallback" hidden>
            <label for="booking-request-text">Select and copy your request</label>
            <textarea id="booking-request-text" readonly rows="8" spellcheck="false"></textarea>
          </div>
          <a class="booking-contact" href="${CONTACT_URL}" target="_blank" rel="noopener noreferrer">Contact Supreme <svg class="icon external-arrow" aria-hidden="true"><use href="#arrow" /></svg><span class="booking-sr-only"> (opens the original website in a new tab)</span></a>
          <p class="booking-note">The contact link opens the original website. It does not send this form. Please confirm availability, arrangements and the final price directly with Supreme.</p>
          <p class="booking-status" role="status" aria-live="polite"></p>
        </fieldset>
        <footer class="booking-footer"><button class="booking-back booking-secondary" type="button" hidden>Back</button><p class="booking-progress">Step 1 of 4</p><button class="booking-next" type="submit">Choose my visit <span aria-hidden="true">→</span></button></footer>
      </form>
    </div>`;
  document.body.append(dialog);
  translateTree(dialog);

  const form = dialog.querySelector('form');
  const field = (name) => form.elements.namedItem(name);
  const heading = dialog.querySelector('#booking-title');
  const panels = [...dialog.querySelectorAll('.booking-step')];
  const steps = [...dialog.querySelectorAll('.booking-stepper li')];
  const back = dialog.querySelector('.booking-back');
  const next = dialog.querySelector('.booking-next');
  const status = dialog.querySelector('.booking-status');
  const review = dialog.querySelector('.booking-review');
  const fallback = dialog.querySelector('.booking-copy-fallback');
  const requestText = dialog.querySelector('#booking-request-text');
  let step = 0;
  let request = '';

  for (const service of services) {
    const option = document.createElement('option');
    option.value = service.id;
    option.textContent = service.name;
    field('service').append(option);
    translateTree(option);
  }

  function updateTreatment() {
    const selected = services.find(({ id }) => id === field('service').value);
    dialog.querySelector('.booking-description').textContent = t(selected.description);
    dialog.querySelector('.booking-price').textContent = formatEUR(priceFor(selected.id, field('duration').value));
    dialog.querySelector('.booking-people').textContent = selected.people === 2
      ? t('Total for 2 people · 2 therapists')
      : t('For 1 person');
    updateTravel();
  }

  function selectedTravel() {
    const selected = services.find(({ id }) => id === field('service').value);
    return describeTravel(priceFor(selected.id, field('duration').value), field('travelArea').value, selected.people);
  }

  function updateTravel() {
    const travel = selectedTravel();
    dialog.querySelector('.booking-travel-fee').textContent = travel.travel;
    dialog.querySelector('.booking-total-label').textContent = travel.priceLabel;
    dialog.querySelector('.booking-estimated-total').textContent = travel.price;
    dialog.querySelector('#booking-travel-note').textContent = travel.note;
  }

  function updateVenue() {
    const confirmationRequired = ['gym', 'spa'].includes(field('location').value);
    dialog.querySelector('.booking-venue-confirmation').hidden = !confirmationRequired;
    field('venueConfirmed').required = confirmationRequired;
    field('venueConfirmed').setCustomValidity('');
    if (!confirmationRequired) field('venueConfirmed').checked = false;
  }

  function updateDateBounds() {
    const { min, max } = dateBounds();
    field('date').min = min;
    field('date').max = max;
  }

  function validateStep() {
    if (step === 1) {
      updateDateBounds();
      field('date').setCustomValidity(validateVisitDate(field('date').value));
    }
    for (const input of panels[step].querySelectorAll('input[required]:not([type="date"]):not([type="checkbox"])')) {
      input.setCustomValidity(input.value.trim() ? '' : t('Please complete this field.'));
    }
    if (step === 1) {
      field('travelArea').setCustomValidity(field('travelArea').value ? '' : t('Choose your travel area'));
      field('venueConfirmed').setCustomValidity(field('venueConfirmed').required && !field('venueConfirmed').checked ? t('Please confirm the venue arrangements.') : '');
    }
    if (step === 2 && field('email').validity.typeMismatch) field('email').setCustomValidity(t('Please enter a valid email address.'));
    return form.reportValidity();
  }

  function renderReview() {
    const selected = services.find(({ id }) => id === field('service').value);
    const selectedDate = new Date(`${field('date').value}T12:00:00`);
    const location = { home: 'Mobile massage at home', mobile: 'Mobile massage at your requested location', gym: 'At a gym — access and price to confirm', spa: 'At a healthcare spa — access and price to confirm' }[field('location').value];
    const travel = selectedTravel();
    const rows = [
      ['Treatment', t(selected.name)],
      ['Duration', t('{minutes} minutes', { minutes: field('duration').value })],
      ['Menu price', `${formatEUR(priceFor(selected.id, field('duration').value))}${selected.people === 2 ? ` ${t('total for 2 people · 2 therapists')}` : ` ${t('for 1 person')}`}`],
      ['Travel area', travel.area],
      ['Travel fee', travel.travel],
      [travel.priceLabel, travel.price],
      ['Price confirmation', travel.note],
      ['Visit', t(location)],
      ['Venue', field('venue').value.trim() || t('Not specified')],
      ['Preferred date', selectedDate.toLocaleDateString(getLocale(), { day: 'numeric', month: 'long', year: 'numeric' })],
      ['Preferred time', t(field('time').value)],
      ['Postcode / town', field('town').value.trim()],
      ['Requested address / location', field('address').value.trim() || t('To be shared directly with Supreme')],
      ['Name', field('fullName').value.trim()],
      ['Email', field('email').value.trim()],
      ['Phone', field('phone').value.trim() || t('Not supplied')],
    ];
    review.replaceChildren();
    for (const [label, value] of rows) {
      const term = document.createElement('dt');
      const detail = document.createElement('dd');
      term.textContent = t(label);
      detail.textContent = value;
      review.append(term, detail);
    }
    request = [
      t('Supreme Fitness & Massage — appointment request'),
      '',
      ...rows.map(([label, value]) => `${t(label)}: ${value}`),
      '',
      t('This request has not been sent. No appointment is reserved and no payment has been made.'),
      t('Please confirm availability, the requested location and venue/access arrangements, the travel fee and the final price.'),
      `${t('Contact')}: ${CONTACT_URL}`,
    ].join('\n');
    requestText.value = request;
    status.textContent = '';
    fallback.hidden = true;
  }

  function showStep(index, moveFocus = true) {
    step = index;
    const titles = ['Choose your treatment', 'Make it your visit', 'A way to reach you', 'Review your request'];
    const nextLabels = ['Choose my visit', 'Add my details', 'Review my request'];
    panels.forEach((panel, panelIndex) => {
      panel.hidden = panelIndex !== step;
      panel.disabled = panelIndex !== step;
    });
    steps.forEach((item, itemIndex) => {
      if (itemIndex === step) item.setAttribute('aria-current', 'step');
      else item.removeAttribute('aria-current');
      item.classList.toggle('booking-complete', itemIndex < step);
    });
    heading.textContent = t(titles[step]);
    dialog.querySelector('.booking-progress').textContent = t('Step {step} of {total}', { step: step + 1, total: stepNames.length });
    back.hidden = step === 0;
    next.hidden = step === 3;
    next.textContent = t(nextLabels[step] || '');
    if (step === 3) renderReview();
    if (moveFocus) {
      heading.focus({ preventScroll: true });
      dialog.scrollTop = 0;
    }
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (step < 3 && validateStep()) showStep(step + 1);
  });
  form.addEventListener('input', (event) => {
    if (typeof event.target.setCustomValidity === 'function') event.target.setCustomValidity('');
  });
  field('service').addEventListener('change', updateTreatment);
  field('duration').addEventListener('change', updateTreatment);
  field('location').addEventListener('change', updateVenue);
  field('travelArea').addEventListener('change', updateTravel);
  back.addEventListener('click', () => showStep(Math.max(0, step - 1)));
  function clearRequest() {
    form.reset();
    for (const input of form.querySelectorAll('input, select, textarea')) input.setCustomValidity('');
    request = '';
    requestText.value = '';
    review.replaceChildren();
    status.textContent = '';
    fallback.hidden = true;
    updateTreatment();
    updateVenue();
    document.body.classList.remove('booking-open');
  }
  function closeRequest() {
    // Clear synchronously: the native close event is queued after dismissal.
    clearRequest();
    dialog.close();
  }
  dialog.querySelector('.booking-close').addEventListener('click', closeRequest);
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    closeRequest();
  });
  dialog.addEventListener('close', () => {
    // A previously queued event must not clear a newly opened request.
    if (!dialog.open) clearRequest();
  });
  dialog.querySelector('.booking-copy').addEventListener('click', async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(request);
      status.textContent = t('Request copied. It has not been sent; share it with Supreme to arrange your visit.');
    } catch {
      fallback.hidden = false;
      requestText.focus();
      requestText.select();
      status.textContent = t('Automatic copying is unavailable. Select the request above and use your device’s Copy command.');
    }
  });
  dialog.querySelector('.booking-download').addEventListener('click', () => {
    const url = URL.createObjectURL(new Blob([request], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'supreme-appointment-request.txt';
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    status.textContent = t('Text download requested. Your request has not been sent; share it with Supreme to arrange your visit.');
  });

  function openBooking(serviceId, duration = 60, preferences = {}) {
    if (dialog.open) return;
    field('service').value = services.some(({ id }) => id === serviceId) ? serviceId : services[0].id;
    field('duration').value = [60, 90].includes(Number(duration)) ? String(duration) : '60';
    field('travelArea').value = ['antwerp', 'outside'].includes(preferences.travelArea) ? preferences.travelArea : '';
    updateTreatment();
    updateVenue();
    updateDateBounds();
    showStep(0, false);
    document.body.classList.add('booking-open');
    dialog.showModal();
    heading.focus();
  }

  document.addEventListener('languagechange', () => {
    for (const control of form.querySelectorAll('input, select, textarea')) control.setCustomValidity('');
    updateTreatment();
    showStep(step, false);
    status.textContent = '';
  });
  return { openBooking, dialog };
}
