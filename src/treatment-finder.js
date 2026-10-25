import { t, translateTree } from './i18n.js';
import { services, priceFor, formatEUR } from './services.js';
import { describeTravel } from './travel.js';
import './treatment-finder.css';

// Suggestions are existing menu choices by occasion, never a clinical assessment.
const suggestions = Object.freeze({
  relax: ['relaxing-oil', 'head-neck'],
  active: ['deep-tissue'],
  together: ['duo-relaxing', 'duo-sports'],
});

export function setupTreatmentFinder({ mount = document.querySelector('#treatment-finder'), onChoose, onShowAll } = {}) {
  if (!mount) return null;
  if (typeof onChoose !== 'function') throw new TypeError('Treatment finder requires an onChoose callback.');

  mount.innerHTML = `
    <details class="treatment-finder">
      <summary class="finder-summary">
        <span><strong>Help me choose</strong><span class="finder-summary-note">A starting point for your visit</span></span>
        <span class="finder-toggle" aria-hidden="true">+</span>
      </summary>
      <div class="finder-content">
        <p class="finder-introduction">A few simple choices. Ideas from our menu.</p>
        <div class="finder-questions">
          <div class="finder-field">
            <label for="finder-intent">What would you like time for?</label>
            <select id="finder-intent" name="finder-intent">
              <option value="">Choose your moment</option>
              <option value="relax">Unwind and relax</option>
              <option value="active">A pause in an active routine</option>
              <option value="together">Time together</option>
            </select>
          </div>
          <div class="finder-field">
            <label for="finder-duration">How much time do you have?</label>
            <select id="finder-duration" name="finder-duration">
              <option value="60">60 minutes</option>
              <option value="90">90 minutes</option>
            </select>
          </div>
          <div class="finder-field">
            <label for="finder-travel-area">Travel area (optional)</label>
            <select id="finder-travel-area" name="finder-travel-area">
              <option value="">Decide later</option>
              <option value="antwerp">Within Antwerp</option>
              <option value="outside">Outside Antwerp</option>
            </select>
          </div>
        </div>
        <p class="finder-status sr-only" role="status" aria-live="polite" aria-atomic="true"></p>
        <section class="finder-results" aria-labelledby="finder-results-title" hidden>
          <h2 id="finder-results-title">A few ideas for your moment</h2>
          <div class="finder-options"></div>
          <p class="finder-travel-fee"></p>
          <p class="finder-travel-note"></p>
        </section>
        <button class="text-link finder-show-all" type="button">See all treatments</button>
      </div>
    </details>`;

  const details = mount.querySelector('details');
  const intent = mount.querySelector('#finder-intent');
  const duration = mount.querySelector('#finder-duration');
  const travelArea = mount.querySelector('#finder-travel-area');
  const results = mount.querySelector('.finder-results');
  const options = mount.querySelector('.finder-options');
  const status = mount.querySelector('.finder-status');
  translateTree(mount);

  function create(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function renderSuggestions() {
    const ids = suggestions[intent.value] || [];
    const minutes = Number(duration.value);
    const area = travelArea.value;
    results.hidden = ids.length === 0;
    options.replaceChildren(...ids.map(id => {
      const service = services.find(item => item.id === id);
      const article = create('article', 'finder-option');
      article.dataset.finderService = id;
      const heading = create('h3', 'finder-service-name', t(service.name));
      const description = create('p', 'finder-description', t(service.description));
      const travel = describeTravel(priceFor(id, minutes), area, service.people);
      const bottom = create('div', 'finder-option-bottom');
      const cost = create('div', 'finder-cost');
      const price = create('strong', 'finder-price', formatEUR(priceFor(id, minutes)));
      const meta = create('span', 'finder-meta', `${minutes} min · ${t(service.people === 2 ? 'total for two people' : 'one person')}`);
      cost.append(price, meta);
      const choose = create('button', 'button finder-choose', t('Choose treatment'));
      choose.type = 'button';
      choose.setAttribute('aria-label', t('Request {service}, {minutes} minutes', { service: t(service.name), minutes }));
      choose.addEventListener('click', () => onChoose(id, minutes, area));
      bottom.append(cost, choose);
      article.append(heading, description, bottom);
      if (area) {
        const estimate = create('dl', 'finder-travel-estimate');
        estimate.append(create('dt', '', travel.priceLabel), create('dd', '', travel.price));
        article.append(estimate);
      }
      return article;
    }));
    const service = services.find(item => item.id === ids[0]);
    const travel = service ? describeTravel(priceFor(service.id, minutes), area, service.people) : null;
    const fee = mount.querySelector('.finder-travel-fee');
    fee.hidden = !area;
    fee.textContent = area && travel ? `${t('Travel fee')}: ${travel.travel}` : '';
    mount.querySelector('.finder-travel-note').textContent = area && travel ? travel.note : t('Menu prices exclude travel.');
    status.textContent = ids.length ? t(ids.length === 1 ? '{count} treatment to explore · {minutes} minutes' : '{count} treatments to explore · {minutes} minutes', { count: ids.length, minutes }) + (area ? ` · ${travel.area}` : '') : '';
  }

  intent.addEventListener('change', renderSuggestions);
  duration.addEventListener('change', renderSuggestions);
  travelArea.addEventListener('change', renderSuggestions);
  document.addEventListener('languagechange', renderSuggestions);
  mount.querySelector('.finder-show-all').addEventListener('click', () => {
    onShowAll?.();
    details.open = false;
    const menu = document.querySelector('#treatments [data-filter="all"]');
    menu?.focus({ preventScroll: true });
    menu?.scrollIntoView({ block: 'nearest', behavior: 'instant' });
  });

  return { open: () => { details.open = true; intent.focus(); } };
}
