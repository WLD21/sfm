import { messages } from './translations.js';

export const languages = ['en', 'fr', 'nl'];
let language = 'en';
const bindings = new Set();
const registered = new WeakSet();
export const getLanguage = () => language;
export const getLocale = () => ({ en: 'en-IE', fr: 'fr-BE', nl: 'nl-BE' })[language];

/** Only application-owned strings go through this function, never customer text. */
export function t(source, values = {}) {
  const translated = language === 'en' ? source : messages[source]?.[language] ?? source;
  return translated.replace(/\{(\w+)\}/g, (match, key) => Object.hasOwn(values, key) ? String(values[key]) : match);
}

/** Register static, application-owned markup once; retain its original English. */
export function translateTree(root) {
  root.querySelectorAll('option:not([value])').forEach(option => { option.value = option.textContent; });
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const node of nodes) {
    if (registered.has(node) || node.parentElement?.closest('script, style, noscript, textarea, [translate="no"]')) continue;
    const source = node.textContent.trim();
    if (!messages[source]) continue;
    const leading = node.textContent.match(/^\s*/)[0];
    const trailing = node.textContent.match(/\s*$/)[0];
    const apply = () => { node.textContent = leading + t(source) + trailing; };
    registered.add(node);
    bindings.add({ node, apply });
    apply();
  }
  root.querySelectorAll('[data-language-select]').forEach(select => { select.value = language; });
  for (const element of [root, ...root.querySelectorAll('*')]) {
    if (!element.getAttribute || element.closest('[translate="no"]')) continue;
    // Values must remain stable when labels on native options are translated.
    if (element.tagName === 'OPTION' && !element.hasAttribute('value')) element.value = element.textContent;
    for (const attribute of ['aria-label', 'alt', 'title', 'placeholder']) {
      const source = element.getAttribute(attribute);
      if (!messages[source]) continue;
      const apply = () => element.setAttribute(attribute, t(source));
      bindings.add({ node: element, apply });
      apply();
    }
  }
}

export function setLanguage(next) {
  if (!languages.includes(next)) return;
  language = next;
  if (typeof document === 'undefined') return;
  document.documentElement.lang = language;
  for (const binding of bindings) {
    if (binding.node.isConnected) binding.apply();
    else bindings.delete(binding);
  }
  document.querySelectorAll('[data-language-select]').forEach(select => { select.value = language; });
  document.title = t('Supreme Fitness & Massage — A little more you.');
  const description = document.querySelector('meta[name="description"]');
  if (description) description.content = t('Massage for relaxation, fitness recovery and time together, in Antwerp and surrounding areas.');
  try { localStorage.setItem('sfm-language', language); } catch { /* Works without storage, including local files. */ }
  try {
    const url = new URL(location.href);
    url.searchParams.set('lang', language);
    // Rewriting about:/file: URLs can make fragment links load a fresh document.
    if (['http:', 'https:'].includes(location.protocol)) history.replaceState(history.state, '', url);
  } catch { /* An originless standalone preview may not allow URL changes. */ }
  document.dispatchEvent(new CustomEvent('languagechange', { detail: { language } }));
}

/** Explicit URL and saved choices win; otherwise honour a supported browser language. */
export function preferredLanguage({ requested, saved, browserLanguages = [] } = {}) {
  for (const choice of [requested, saved]) if (languages.includes(choice)) return choice;
  for (const choice of browserLanguages) {
    const base = typeof choice === 'string' ? choice.toLowerCase().split('-')[0] : '';
    if (languages.includes(base)) return base;
  }
  return 'en';
}

export function setupLanguage() {
  let requested;
  let saved;
  try { requested = new URL(location.href).searchParams.get('lang'); } catch { /* URL preference optional. */ }
  try { saved = localStorage.getItem('sfm-language'); } catch { /* Storage optional. */ }
  language = preferredLanguage({ requested, saved, browserLanguages: navigator.languages || [navigator.language] });
  translateTree(document.body);
  document.addEventListener('change', event => {
    if (event.target.matches('[data-language-select]')) setLanguage(event.target.value);
  });
  setLanguage(language);
}
