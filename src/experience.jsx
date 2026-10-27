import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createPortal, flushSync } from 'react-dom';
import { getLanguage } from './i18n.js';
import { experienceCopy } from './experience-copy.js';
import { GymScene, SpaScene } from './experience-scenes.jsx';
import { TrainingRequest } from './training-request.jsx';
import './experience.css';

function readExperience() {
  try { return sessionStorage.getItem('sfm-experience') === 'spa' ? 'spa' : 'gym'; } catch { return 'gym'; }
}
function App({ openBooking }) {
  const [mode, setMode] = useState(readExperience);
  const modeRef = useRef(mode);
  const [language, setLanguage] = useState(getLanguage);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [active, setActive] = useState(() => document.body.dataset.activeView || 'home');
  const [visible, setVisible] = useState(() => !document.hidden);
  const [busy, setBusy] = useState(false);
  const [request, setRequest] = useState(null);
  const [announcement, setAnnouncement] = useState('');
  const transition = useRef(null);
  const transitionGeneration = useRef(0);
  const fallback = useRef(null);
  const c = experienceCopy[language] || experienceCopy.en;
  const animate = !paused && !reduced && visible && active === 'home';
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

  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
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
    const onRequest = event => setRequest({ goal: event.detail?.goal || 'strength', trigger: document.activeElement });
    document.addEventListener('languagechange', onLanguage);
    document.addEventListener('viewchange', onView);
    document.addEventListener('visibilitychange', onVisibility);
    document.addEventListener('trainingrequest', onRequest);
    media.addEventListener('change', onMedia);
    return () => {
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

  function training(goal = 'strength') { setRequest({ goal, trigger: document.activeElement }); }
  const switcher = <div className="experience-switcher-inner">
    <p className="experience-switcher-caption">{c.tagline}</p>
    <div className="experience-tabs" role="group" aria-label={c.switchLabel}>
      <button type="button" data-experience-choice="gym" aria-pressed={mode === 'gym'} disabled={busy} onClick={() => changeMode('gym')}><span aria-hidden="true">↗</span>{c.gym}</button>
      <button type="button" data-experience-choice="spa" aria-pressed={mode === 'spa'} disabled={busy} onClick={() => changeMode('spa')}><span aria-hidden="true">✳</span>{c.spa}</button>
    </div>
    {!reduced && <button type="button" className="motion-control" onClick={() => setPaused(value => !value)} aria-pressed={paused} aria-label={paused ? c.play : c.pause}><span aria-hidden="true">{paused ? '▷' : 'Ⅱ'}</span><span className="motion-control-label">{paused ? c.play : c.pause}</span></button>}
  </div>;

  const gym = <>
    <div className="gym-hero">
      <div className="gym-hero-copy">
        <p className="eyebrow"><span className="eyebrow-line" aria-hidden="true" />{c.kicker}</p>
        <h1 id="gym-home-title" tabIndex={-1}>{c.title}<br /><em>{c.italic}</em></h1>
        <p className="gym-description">{c.description}</p>
        <div className="hero-actions"><button type="button" className="button gym-main-cta" onClick={() => training()}>{c.primary}<span aria-hidden="true">↗</span></button><a className="text-link" href="#training">{c.secondary}<span aria-hidden="true">→</span></a></div>
        <p className="gym-note"><span aria-hidden="true">✳</span>{c.note}</p>
      </div>
      <div className="gym-art hero-art">
        <div className="scene-topline"><span>{c.sceneLabel}</span><span aria-hidden="true">S / 01</span></div>
        <GymScene animate={animate && mode === 'gym'} />
        <div className="scene-caption"><strong>{c.sceneTitle}</strong><span>{c.sceneHint}</span></div>
        <span className="scene-disc" aria-hidden="true">S<span>TRAIN / RECOVER</span></span>
      </div>
    </div>
    <div className="gym-pillars">{c.strip.map(([title, note], i) => <div key={title}><span className="pillar-index">0{i + 1}</span><p><strong>{title}</strong><span>{note}</span></p><span className="pillar-arrow" aria-hidden="true">↗</span></div>)}</div>
    <div className="experience-bridge"><p>{c.recovery}</p><button type="button" className="text-link" onClick={() => changeMode('spa')}>{c.recoveryCta}<span aria-hidden="true">→</span></button></div>
  </>;
  const trainingView = <>
    <div className="view-heading"><div><p className="eyebrow">{c.trainingKicker}</p><h1 id="training-title" tabIndex={-1}>{c.trainingTitle}<br /><em>{c.trainingItalic}</em></h1><p>{c.trainingIntro}</p></div><span className="training-wordmark" aria-hidden="true">MOVE<br />WITH<br /><em>PURPOSE.</em></span></div>
    <div className="training-programs">{c.programs.map((program, i) => <article className="training-program" key={program.id}>
      <div className="program-top"><span>0{i + 1}</span><span className="program-orbit" aria-hidden="true">↗</span></div>
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
    {createPortal(<div className="spa-atmosphere-card"><SpaScene animate={animate && mode === 'spa'} /><p><span aria-hidden="true">✳</span>{c.spaAtmosphere}</p></div>, document.getElementById('spa-atmosphere'))}
    {request && <TrainingRequest request={request} copy={c} onClose={() => setRequest(null)} />}
    <p className="sr-only" role="status">{announcement}</p>
  </>;
}

export function setupExperience(options) {
  const root = createRoot(document.getElementById('experience-system'));
  root.render(<App {...options} />);
  return () => root.unmount();
}
