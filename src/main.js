import { t, setupLanguage } from './i18n.js';
import '@fontsource/outfit/latin-600.css';
import '@fontsource/outfit/latin-700.css';
import '@fontsource/manrope/latin-400.css';
import '@fontsource/manrope/latin-500.css';
import '@fontsource/manrope/latin-600.css';
import '@fontsource/manrope/latin-700.css';
import './style.css';
import './showcase.css';
import './motion.css';
import './visitor-guide.css';
import { setupMotion } from './motion.js';
import { services, priceFor, formatEUR } from './services.js';
import { setupBooking } from './booking.js';
import { setupReviews } from './reviews.js';
import { setupTreatmentFinder } from './treatment-finder.js';
import { getSubscriptionState } from './commerce.js';
import { siteConfig } from './site.config.js';
import { setupExperience } from './experience.jsx';

setupLanguage();
const { openBooking } = setupBooking();
const { clearReview } = setupReviews(siteConfig.reviews);
let activeView;
const viewNames = ['home', 'training', 'treatments', 'showcase', 'visit', 'reviews'];
let selectedDuration = 60;
let selectedFilter = 'all';
let motion;

function navigate({ focus = false } = {}) {
  const requested = location.hash.slice(1);
  const viewName = viewNames.includes(requested) ? requested : 'home';
  if (activeView === 'reviews' && viewName !== 'reviews') clearReview();
  activeView = viewName;
  document.body.dataset.activeView = viewName;
  for (const name of viewNames) document.getElementById(name).hidden = name !== viewName;
  document.querySelectorAll('[data-view]').forEach((link) => {
    if (link.dataset.view === viewName) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  if (focus) {
    const headingId = viewName === 'home' && document.body.dataset.experience !== 'spa' ? 'gym-home-title' : `${viewName}-title`;
    document.getElementById(headingId)?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  motion?.enterView(viewName);
  document.dispatchEvent(new CustomEvent('viewchange', { detail: { view: viewName } }));
}
window.addEventListener('hashchange', () => navigate({ focus: true }));
document.querySelector('.skip-link').addEventListener('click', event => {
  event.preventDefault();
  document.querySelector('#main').focus();
});
document.querySelectorAll('[data-view]').forEach((link) => {
  link.addEventListener('click', event => {
    if (location.hash === link.hash) {
      event.preventDefault();
      navigate({ focus: true });
    }
  });
});
navigate();

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) { node.textContent = t(text); if (typeof text === 'string') node.dataset.copySource = text; }
  return node;
}
function renderServices() {
  const grid = document.querySelector('#service-grid');
  const visible = services.filter((service) => selectedFilter === 'all' || service.category === selectedFilter);
  grid.replaceChildren(...visible.map((service) => {
    const card = element('article', 'service-card');
    card.dataset.serviceId = service.id;
    const top = element('div', 'service-card-top');
    top.append(element('span', 'service-number', String(services.indexOf(service) + 1).padStart(2, '0')));
    top.append(element('span', 'service-category', { spa: 'Unwind', fitness: 'Recover', duo: 'Together' }[service.category]));
    const title = element('h3', 'service-title', service.name);
    const description = element('p', 'service-description', service.description);
    const bottom = element('div', 'service-card-bottom');
    const cost = element('div', 'service-cost');
    cost.append(element('strong', 'service-price', formatEUR(priceFor(service.id, selectedDuration))));
    cost.append(element('span', 'service-meta', `${selectedDuration} min · ${t(service.people === 2 ? 'total for two people' : 'one person')}`));
    const book = element('button', 'service-book button', 'Choose treatment');
    book.type = 'button';
    book.dataset.book = service.id;
    book.setAttribute('aria-label', t('Request {service}, {minutes} minutes', { service: t(service.name), minutes: selectedDuration }));
    bottom.append(cost, book);
    card.append(top, title, description, bottom);
    return card;
  }));
  document.querySelectorAll('[data-duration]').forEach((button) => button.setAttribute('aria-pressed', String(Number(button.dataset.duration) === selectedDuration)));
  document.querySelectorAll('[data-filter]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.filter === selectedFilter)));
  const count = document.querySelector('#service-count');
  if (count) count.textContent = `${visible.length} ${visible.length === 1 ? 'treatment' : 'treatments'} · ${selectedDuration} minutes`;
}
document.addEventListener('click', (event) => {
  const book = event.target.closest('[data-book]');
  if (book) {
    event.preventDefault();
    if (book.hasAttribute('data-adaptive-book') && document.body.dataset.experience !== 'spa') {
      document.dispatchEvent(new CustomEvent('trainingrequest'));
    } else openBooking(book.dataset.book || undefined, selectedDuration);
  }
  const duration = event.target.closest('[data-duration]');
  if (duration) { selectedDuration = Number(duration.dataset.duration); renderServices(); }
  const filter = event.target.closest('[data-filter]');
  if (filter) { selectedFilter = filter.dataset.filter; renderServices(); }
});
renderServices();
setupTreatmentFinder({
  onChoose: (id, duration, travelArea) => openBooking(id, duration, { travelArea }),
  onShowAll: () => { selectedFilter = 'all'; renderServices(); },
});

// Never substitute stock photos for unavailable client imagery.
document.querySelectorAll('img[data-original-image]').forEach((image) => {
  const markUnavailable = () => {
    image.hidden = true;
    const frame = image.closest('figure, .gallery-image-wrap, .hero-image, .photo-frame') || image.parentElement;
    frame.classList.add('image-unavailable');
    if (!frame.querySelector('.image-fallback')) frame.append(element('span', 'image-fallback', 'Original photo unavailable'));
  };
  image.addEventListener('error', markUnavailable);
  if (image.complete && image.naturalWidth === 0) markUnavailable();
});

const galleryDialog = document.querySelector('#gallery-dialog');
const galleryImage = document.querySelector('#gallery-image');
let galleryIndex = 0;
function showGalleryImage(index) {
  galleryIndex = (index + siteConfig.photos.length) % siteConfig.photos.length;
  const photo = siteConfig.photos[galleryIndex];
  galleryImage.hidden = false;
  galleryImage.alt = t(photo.alt);
  galleryImage.src = photo.src;
  document.querySelector('#gallery-caption').textContent = `${galleryIndex + 1} / ${siteConfig.photos.length} — ${t(photo.caption)}`;
  let status = document.querySelector('#gallery-status');
  if (!status) {
    status = element('p', 'gallery-status');
    status.id = 'gallery-status';
    status.setAttribute('role', 'status');
    galleryDialog.append(status);
  }
  status.textContent = '';
}
galleryImage.addEventListener('error', () => {
  galleryImage.hidden = true;
  document.querySelector('#gallery-status').textContent = t('This original photo is currently unavailable.');
});
document.querySelectorAll('[data-gallery]').forEach((button) => {
  button.addEventListener('click', () => {
    showGalleryImage(Number(button.dataset.gallery));
    galleryDialog.showModal();
    document.querySelector('#gallery-close').focus();
  });
});
document.querySelector('#gallery-prev').addEventListener('click', () => showGalleryImage(galleryIndex - 1));
document.querySelector('#gallery-next').addEventListener('click', () => showGalleryImage(galleryIndex + 1));
document.querySelector('#gallery-close').addEventListener('click', () => galleryDialog.close());
galleryDialog.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault();
    showGalleryImage(galleryIndex + (event.key === 'ArrowLeft' ? -1 : 1));
  }
});

const subscriptions = element('dialog', 'subscription-dialog');
subscriptions.id = 'subscription-dialog';
subscriptions.setAttribute('aria-labelledby', 'subscription-title');
const closeSubscriptions = element('button', 'dialog-close', '×');
closeSubscriptions.type = 'button';
closeSubscriptions.setAttribute('aria-label', t('Close subscriptions'));
closeSubscriptions.addEventListener('click', () => subscriptions.close());
const subscriptionTitle = element('h2', '', siteConfig.subscriptions.length ? 'Your regular moment of care' : 'Subscriptions are being prepared');
subscriptionTitle.id = 'subscription-title';
subscriptions.append(closeSubscriptions, element('p', 'eyebrow', 'A little more time for you'), subscriptionTitle);
if (!siteConfig.subscriptions.length) {
  subscriptions.append(element('p', '', 'Plans, prices and billing terms will be available before enrollment opens. You can still explore individual treatments.'));
  subscriptions.append(element('p', 'transaction-note', 'No subscription has been activated and no payment has been taken.'));
  const browse = element('a', 'button', 'Explore individual treatments');
  browse.href = '#treatments';
  browse.addEventListener('click', () => { subscriptions.close(); });
  subscriptions.append(browse);
} else {
  for (const plan of siteConfig.subscriptions) {
    const state = getSubscriptionState(plan);
    const item = element('article', 'subscription-plan');
    item.append(element('h3', '', plan.name));
    if (state.priceLabel) item.append(element('p', '', `${state.priceLabel} / ${plan.interval}`));
    if (state.enabled) {
      const link = element('a', 'button', 'Continue to secure checkout');
      link.href = state.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      item.append(link);
    } else item.append(element('p', '', 'Enrollment for this plan is not available yet.'));
    subscriptions.append(item);
  }
  subscriptions.append(element('p', 'transaction-note', 'Your payment provider confirms your purchase. Opening checkout does not activate a subscription.'));
}
document.body.append(subscriptions);
document.querySelectorAll('[data-subscriptions]').forEach((button) => button.addEventListener('click', () => subscriptions.showModal()));

motion = setupMotion();
motion.enterView(viewNames.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'home');

function refreshLanguage() {
  renderServices();
  document.querySelectorAll('[data-copy-source]').forEach(node => { node.textContent = t(node.dataset.copySource); });
  closeSubscriptions.setAttribute('aria-label', t('Close subscriptions'));
  if (galleryDialog.open) showGalleryImage(galleryIndex);
  document.querySelectorAll('[data-eur]').forEach(node => { node.textContent = formatEUR(Number(node.dataset.eur)); });
  motion?.enterView(activeView);
}
document.addEventListener('languagechange', refreshLanguage);
refreshLanguage();

const privacyDialog = document.querySelector('#privacy-dialog');
document.querySelectorAll('[data-privacy]').forEach(button => button.addEventListener('click', () => privacyDialog.showModal()));
privacyDialog.querySelector('[data-close-privacy]').addEventListener('click', () => privacyDialog.close());
// Native dialogs make their surroundings inert; also prevent background scrolling.
const syncDialogScroll = () => document.body.classList.toggle('modal-open', Boolean(document.querySelector('dialog[open]')));
new MutationObserver(syncDialogScroll).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['open'] });
syncDialogScroll();

setupExperience();
