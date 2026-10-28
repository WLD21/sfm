import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createPortal, flushSync } from 'react-dom';
import { getLanguage } from './i18n.js';
import { experienceCopy } from './experience-copy.js';
import { GymScene, SpaScene } from './experience-scenes.jsx';
import { TrainingRequest } from './training-request.jsx';
import './experience.css';
import './scroll-design.css';
import { mountScrollExperience } from './scroll-experience.js';

function readExperience() {
  const requested = new URLSearchParams(location.search).get('experience');
  if (requested === 'gym' || requested === 'spa') return requested;
  try { return sessionStorage.getItem('sfm-experience') === 'spa' ? 'spa' : 'gym'; } catch { return 'gym'; }
}
function App() {
  const [mode, setMode] = useState(readExperience);
  const modeRef = useRef(mode);
  const [language, setLanguage] = useState(getLanguage);
  const [paused, setPaused] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState('strength');
  const goalRef = useRef(selectedGoal);
  goalRef.current = selectedGoal;
  const [reduced, setReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [active, setActive] = useState(() => document.body.dataset.activeView || 'home');
  const [visible, setVisible] = useState(() => !document.hidden);
  const [busy, setBusy] = useState(false);
  const [overlayOpen, setOverlayOpen] = useState(() => Boolean(document.querySelector('dialog[open]')));
  const [request, setRequest] = useState(null);
  const [announcement, setAnnouncement] = useState('');
  const transition = useRef(null);
  const transitionGeneration = useRef(0);
  const fallback = useRef(null);
  const c = experienceCopy[language] || experienceCopy.en;
  const sceneEnabled = visible && active === 'home' && !busy && !overlayOpen && !request;
  const animate = !paused && !reduced && sceneEnabled;
  const surfaces = () => [...document.querySelectorAll('.site-header, .site-main, .site-footer, .mobile-booking-bar')];

  function restoreSurfaces() {
    surfaces().forEach(node => { node.style.removeProperty('opacity'); node.style.removeProperty('transform'); });
    document.body.classList.remove('experience-changing');
  }
  function commitMode(next) {
    modeRef.current = next;
    document.body.dataset.experience = next;
    try { sessionStorage.setItem('sfm-experience', next); } catch { /* Preference is optional. */ }
    flushSync(() => setMode(next));
    if (location.hash && location.hash !== '#home') location.hash = '#home';
    document.dispatchEvent(new CustomEvent('experiencechange', { detail: { mode: next } }));
  }
  async function changeMode(next) {
    if (next === modeRef.current || busy || document.querySelector('dialog[open]')) return;
    const generation = ++transitionGeneration.current;
    transition.current?.kill();
    clearTimeout(fallback.current);
    if (reduced || paused) {
      commitMode(next);
      restoreSurfaces();
      return;
    }
    setBusy(true);
    document.body.classList.add('experience-changing');
    // Even a blocked or slow animation import cannot leave the page faded out.
    const finish = () => {
      if (generation !== transitionGeneration.current) return;
      transitionGeneration.current += 1;
      transition.current?.kill();
      if (modeRef.current !== next) commitMode(next);
      restoreSurfaces();
      setBusy(false);
      setAnnouncement((experienceCopy[getLanguage()] || experienceCopy.en)[next]);
      clearTimeout(fallback.current);
    };
    fallback.current = setTimeout(finish, 1100);
    try {
      const { gsap } = await import('gsap');
      if (generation !== transitionGeneration.current) return;
      transition.current = gsap.timeline({ onComplete: finish })
        .to(surfaces(), { opacity: 0, y: -5, duration: .23, ease: 'power2.in' })
        .call(() => commitMode(next))
        .set(surfaces(), { y: 9 })
        .to(surfaces(), { opacity: 1, y: 0, duration: .48, stagger: .025, ease: 'power3.out' });
    } catch { finish(); }
  }

  useLayoutEffect(() => {
    document.body.dataset.experience = mode;
    modeRef.current = mode;
    const home = document.getElementById('home');
    home.setAttribute('aria-labelledby', mode === 'gym' ? 'gym-home-title' : 'home-title');
    // Hidden content is also removed from the keyboard and accessibility tree.
    document.querySelector('[data-gym-content]').hidden = mode !== 'gym';
    document.querySelector('[data-spa-content]').hidden = mode !== 'spa';
    const label = mode === 'gym' ? c.primary : (language === 'fr' ? 'Demander un massage' : language === 'nl' ? 'Massage aanvragen' : 'Request a massage');
    document.querySelectorAll('[data-adaptive-book]').forEach(button => {
      button.replaceChildren(Object.assign(document.createElement('span'), { textContent: label }));
    });
    const mobile = document.querySelector('.mobile-booking-bar > div');
    if (mobile) {
      mobile.querySelector('span').textContent = mode === 'gym' ? c.mobileGymSub : c.mobileSpaSub;
      mobile.querySelector('strong').textContent = mode === 'gym' ? c.mobileGym : c.mobileSpa;
    }
    const nav = document.querySelector('[data-view="training"]');
    if (nav) nav.textContent = c.trainingNav;
  }, [mode, c, language]);

  useEffect(() => { document.body.dataset.motion = animate ? 'playing' : 'paused'; }, [animate]);
  useEffect(() => { document.dispatchEvent(new CustomEvent('motionpausechange', { detail: { paused } })); }, [paused]);

  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const checkOverlay = () => setOverlayOpen(Boolean(document.querySelector('dialog[open]')));
    const dialogs = new MutationObserver(checkOverlay);
    dialogs.observe(document.body, { attributes: true, attributeFilter: ['open'], subtree: true });
    checkOverlay();
    const onMedia = () => {
      setReduced(media.matches);
      if (media.matches) {
        transitionGeneration.current += 1;
        transition.current?.kill();
        clearTimeout(fallback.current);
        restoreSurfaces();
        setBusy(false);
      }
    };
    const onLanguage = () => setLanguage(getLanguage());
    const onView = event => setActive(event.detail.view);
    const onVisibility = () => setVisible(!document.hidden);
    const onRequest = event => setRequest({ goal: event.detail?.goal || goalRef.current, trigger: document.activeElement });
    document.addEventListener('languagechange', onLanguage);
    document.addEventListener('viewchange', onView);
    document.addEventListener('visibilitychange', onVisibility);
    document.addEventListener('trainingrequest', onRequest);
    media.addEventListener('change', onMedia);
    return () => {
      dialogs.disconnect();
      document.removeEventListener('languagechange', onLanguage);
      document.removeEventListener('viewchange', onView);
      document.removeEventListener('visibilitychange', onVisibility);
      document.removeEventListener('trainingrequest', onRequest);
      media.removeEventListener('change', onMedia);
      transitionGeneration.current += 1;
      transition.current?.kill();
      clearTimeout(fallback.current);
      restoreSurfaces();
    };
  }, []);

  function training(goal = goalRef.current) { setRequest({ goal, trigger: document.activeElement }); }
  useEffect(() => {
    let canceled = false, destroy = () => {};
    if (!animate) { document.documentElement.classList.add('sc-ready'); return; }
    const root = document.querySelector(mode === 'gym' ? '#gym-home' : '[data-spa-content]');
    mountScrollExperience(root, () => canceled).then(cleanup => { destroy = cleanup; }).catch(() => {
      document.documentElement.classList.add('sc-ready');
    });
    return () => { canceled = true; destroy(); };
  }, [animate, mode]);
  const focusCopy = {
    en: { label: 'What would you like to work on?', short: ['Strength', 'Fitness', 'Confidence'], detail: ['Build a stronger foundation.', 'Find a rhythm that lasts.', 'Feel at home in the gym.'], photo: 'Recovery has a place in your routine.', link: 'See the Supreme collection', alt: 'A massage session from the Supreme collection' },
    fr: { label: 'Sur quoi souhaitez-vous travailler ?', short: ['Force', 'Forme', 'Confiance'], detail: ['Construisez des bases solides.', 'Trouvez un rythme durable.', 'Sentez-vous à l’aise en salle.'], photo: 'La récupération fait partie de votre routine.', link: 'Voir la collection Supreme', alt: 'Une séance de massage de la collection Supreme' },
    nl: { label: 'Waar wil je aan werken?', short: ['Kracht', 'Conditie', 'Vertrouwen'], detail: ['Bouw een sterke basis.', 'Vind een ritme dat blijft.', 'Voel je thuis in de gym.'], photo: 'Herstel hoort bij je routine.', link: 'Bekijk de Supreme-collectie', alt: 'Een massagesessie uit de Supreme-collectie' }
  }[language] || { label: 'Your focus', short: ['Strength', 'Fitness', 'Confidence'], detail: ['Build your foundation.', 'Find your rhythm.', 'Start with confidence.'], photo: c.recovery, link: c.pairCta, alt: 'Supreme massage' };
  const goalIds = ['strength', 'fitness', 'confidence'];
  const switcher = <div className="experience-switcher-inner">
    <p className="experience-switcher-caption">{c.tagline}</p>
    <div className="experience-tabs" role="group" aria-label={c.switchLabel}>
      <button type="button" data-experience-choice="gym" aria-pressed={mode === 'gym'} disabled={busy} onClick={() => changeMode('gym')}><span aria-hidden="true">↗</span>{c.gym}</button>
      <button type="button" data-experience-choice="spa" aria-pressed={mode === 'spa'} disabled={busy} onClick={() => changeMode('spa')}><span aria-hidden="true">✳</span>{c.spa}</button>
    </div>
    {!reduced && <button type="button" className="motion-control" onClick={() => setPaused(value => !value)} aria-pressed={paused} aria-label={paused ? c.play : c.pause}><span aria-hidden="true">{paused ? '▷' : 'Ⅱ'}</span><span className="motion-control-label">{paused ? c.play : c.pause}</span></button>}
  </div>;

  const gym = <>
    <div className="gym-hero" data-sc-act="flow">
      <div className="gym-hero-copy">
        <p className="eyebrow"><span className="eyebrow-line" aria-hidden="true" />{c.kicker}</p>
        <h1 id="gym-home-title" tabIndex={-1}>{c.title}<br /><em>{c.italic}</em></h1>
        <p className="gym-description">{c.description}</p>
        <div className="training-focus">
          <p id="training-focus-label">{focusCopy.label}</p>
          <div role="group" aria-labelledby="training-focus-label" className="focus-options">
            {goalIds.map((id, i) => <button type="button" key={id} data-training-focus={id} aria-pressed={selectedGoal === id} onClick={() => setSelectedGoal(id)}>{focusCopy.short[i]}<span aria-hidden="true">↗</span></button>)}
          </div>
          <p className="focus-description" role="status">{focusCopy.detail[goalIds.indexOf(selectedGoal)]}</p>
        </div>
        <div className="hero-actions"><button type="button" className="button gym-main-cta" onClick={() => training()}>{c.primary}<span aria-hidden="true">↗</span></button><a className="text-link" href="#training">{c.secondary}<span aria-hidden="true">→</span></a></div>
        <p className="gym-note"><span aria-hidden="true">✳</span>{c.note}</p>
      </div>
      <div className="gym-art hero-art">
        <div className="scene-topline"><span>{c.sceneLabel}</span></div>
        <GymScene animate={animate && mode === 'gym'} enabled={sceneEnabled && mode === 'gym'} focus={selectedGoal} reduced={reduced} />
        <div className="scene-caption"><strong>{c.sceneTitle}</strong><span>{c.sceneHint}</span></div>
        <span className="scene-arc" data-sc-parallax="-.06" aria-hidden="true" />
      </div>
    </div>
    <div className="gym-pillars" data-sc-act="flow" data-sc-in="">{c.strip.map(([title, note], i) => <div key={title}><p><strong>{title}</strong><span>{note}</span></p><span className="pillar-arrow" aria-hidden="true">↗</span></div>)}</div>
    <div className="recovery-story" data-sc-act="flow">
      <a href="#showcase" className="recovery-photo-link" aria-label={focusCopy.link}><img src="/images/massage-session.jpg" alt={focusCopy.alt} width="1080" height="609" loading="lazy" data-sc-reveal="left" data-sc-cue="0.1" /></a>
      <div><p className="eyebrow">{c.spa}</p><p className="recovery-story-title">{focusCopy.photo}</p><a href="#showcase" className="text-link">{focusCopy.link}<span aria-hidden="true">↗</span></a></div>
    </div>
    <div className="experience-bridge" data-sc-act="flow" data-sc-in=""><p>{c.recovery}</p><button type="button" className="text-link" onClick={() => changeMode('spa')}>{c.recoveryCta}<span aria-hidden="true">→</span></button></div>
  </>;
  const trainingView = <>
    <div className="view-heading"><div><p className="eyebrow">{c.trainingKicker}</p><h1 id="training-title" tabIndex={-1}>{c.trainingTitle}<br /><em>{c.trainingItalic}</em></h1><p>{c.trainingIntro}</p></div><span className="training-wordmark" aria-hidden="true">MOVE<br />WITH<br /><em>PURPOSE.</em></span></div>
    <div className="training-programs">{c.programs.map((program, i) => <article className="training-program" key={program.id}>
      
      <p className="eyebrow">{program.label}</p><h2>{program.title}</h2><p>{program.text}</p>
      <button type="button" className="text-link" onClick={() => training(program.id)}>{c.enquire}<span aria-hidden="true">↗</span></button>
    </article>)}</div>
    <p className="training-terms">{c.trainingTerms}</p>
    <div className="training-recovery"><div><p className="eyebrow">{c.spa}</p><h2>{c.pairTitle}</h2><p>{c.pairText}</p></div><a className="button secondary" href="#treatments">{c.pairCta}<span aria-hidden="true">↗</span></a></div>
  </>;
  return <>
    {createPortal(switcher, document.getElementById('experience-switcher'))}
    {createPortal(gym, document.getElementById('gym-home'))}
    {createPortal(trainingView, document.getElementById('training-content'))}
    {createPortal(<div className="spa-atmosphere-card"><SpaScene animate={animate && mode === 'spa'} enabled={sceneEnabled && mode === 'spa'} reduced={reduced} /><p><span aria-hidden="true">✳</span>{c.spaAtmosphere}</p></div>, document.getElementById('spa-atmosphere'))}
    {request && <TrainingRequest request={request} copy={c} onClose={() => setRequest(null)} />}
    <p className="sr-only" role="status">{announcement}</p>
  </>;
}

export function setupExperience() {
  // Portals append into their targets; remove the no-JavaScript fallback once,
  // only when the React module has successfully loaded and can take ownership.
  document.getElementById('gym-home').replaceChildren();
  document.getElementById('training-content').replaceChildren();
  const root = createRoot(document.getElementById('experience-system'));
  flushSync(() => root.render(<App />));
  return () => root.unmount();
}
