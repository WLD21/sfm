// Animations enhance visible HTML. A missing library never hides the website.
let gsapPromise;
let scrollPromise;
function loadGSAP() {
  return gsapPromise ??= import('gsap').then(({ gsap }) => gsap);
}
async function loadScrollEngine() {
  const [gsap, { ScrollTrigger }] = await Promise.all([
    loadGSAP(),
    scrollPromise ??= import('gsap/ScrollTrigger'),
  ]);
  gsap.registerPlugin(ScrollTrigger);
  return { gsap, ScrollTrigger };
}

export function setupMotion() {
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const intro = document.querySelector('#intro-dialog');
  const replay = document.querySelector('#replay-intro');
  let activeView = 'home';
  let manuallyPaused = false;
  const motionDisabled = () => preference.matches || manuallyPaused;
  let viewGeneration = 0;
  let viewContext;
  let removeFocusListener;
  let introGeneration = 0;
  let introContext;
  let introTimeline;
  let deadline;

  function clearView() {
    viewGeneration += 1;
    removeFocusListener?.();
    removeFocusListener = undefined;
    // Revert also kills the ScrollTriggers created in this context. Hidden
    // hash views must never retain measurements or scroll-driven transforms.
    viewContext?.revert();
    viewContext = undefined;
  }

  async function enterView(name) {
    activeView = name;
    clearView();
    if (motionDisabled() || intro.open) return;
    const generation = viewGeneration;
    const view = document.getElementById(name);
    try {
      const { gsap, ScrollTrigger } = await loadScrollEngine();
      if (generation !== viewGeneration || motionDisabled() || intro.open || view.hidden) return;
      const reveals = new Map();
      viewContext = gsap.context(() => {
        if (name === 'home') {
          gsap.fromTo('.hero-copy > *', { y: 16, opacity: 0 }, {
            y: 0, opacity: 1, duration: 0.75, stagger: 0.075, ease: 'power2.out', clearProps: 'transform,opacity',
          });
          gsap.fromTo('.hero-art', { y: 14, opacity: 0.4 }, {
            y: 0, opacity: 1, duration: 1, ease: 'power2.out', clearProps: 'transform,opacity',
          });
        } else if (name !== 'showcase') {
          gsap.fromTo('.view-heading', { y: 14, opacity: 0.3 }, {
            y: 0, opacity: 1, duration: 0.6, ease: 'power2.out', clearProps: 'transform,opacity',
          });
        }

        if (name === 'showcase') {
          view.querySelectorAll('[data-scroll-reveal]').forEach((item) => {
            const tween = gsap.fromTo(item, { y: 32, opacity: 0.22 }, {
              y: 0, opacity: 1, duration: 0.85, ease: 'power2.out',
              clearProps: 'transform,opacity',
              scrollTrigger: { trigger: item, start: 'top 94%', once: true },
            });
            reveals.set(item, tween);
          });
          view.querySelectorAll('img[data-parallax]').forEach((photo) => {
            gsap.fromTo(photo, { yPercent: -3, scale: 1.08 }, {
              yPercent: 3, scale: 1.08, ease: 'none',
              scrollTrigger: {
                trigger: photo.closest('.gallery-image-wrap'),
                start: 'top bottom', end: 'bottom top', scrub: 0.7,
              },
            });
          });
        }
      }, view);

      // Keyboard navigation must reveal a focused item immediately, even
      // before scrolling or its entrance tween has finished.
      const onFocus = (event) => {
        for (const [item, tween] of reveals) {
          if (item.contains(event.target)) {
            tween.progress(1);
            tween.scrollTrigger?.kill();
          }
        }
      };
      view.addEventListener('focusin', onFocus);
      removeFocusListener = () => view.removeEventListener('focusin', onFocus);
      ScrollTrigger.refresh();
      // Local fonts can finish after a direct hash entry, changing card offsets.
      document.fonts?.ready.then(() => {
        if (generation === viewGeneration) ScrollTrigger.refresh();
      });
    } catch {
      if (generation === viewGeneration) clearView();
    }
  }

  function finishIntro() {
    introGeneration += 1;
    clearTimeout(deadline);
    introTimeline?.kill();
    introContext?.revert();
    introContext = undefined;
    if (intro.open) intro.close();
    document.body.classList.remove('intro-open');
    try { sessionStorage.setItem('sfm-intro-seen', '1'); } catch { /* Storage is optional in a local file. */ }
    enterView(activeView);
  }

  async function playIntro() {
    if (motionDisabled() || intro.open) return;
    const generation = ++introGeneration;
    clearView();
    intro.showModal();
    document.body.classList.add('intro-open');
    document.querySelector('#skip-intro').focus({ preventScroll: true });
    // The site always opens within 2.5 seconds, including failed/slow imports.
    deadline = setTimeout(finishIntro, 2500);
    try {
      const gsap = await loadGSAP();
      if (generation !== introGeneration || !intro.open || motionDisabled()) return;
      introContext = gsap.context(() => {
        const petals = intro.querySelectorAll('.intro-lotus path');
        petals.forEach((path) => {
          const length = path.getTotalLength();
          gsap.set(path, { strokeDasharray: length, strokeDashoffset: length });
        });
        introTimeline = gsap.timeline({ defaults: { ease: 'power2.out' }, onComplete: finishIntro })
          .fromTo('.intro-orbit', { scale: 0.86, opacity: 0 }, { scale: 1, opacity: 1, duration: 1.35, stagger: 0.08 }, 0)
          .to(petals, { strokeDashoffset: 0, duration: 0.8, stagger: 0.07 }, 0.08)
          .fromTo('.intro-kicker', { y: 8, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5 }, 0.2)
          .fromTo('.intro-brand span', { yPercent: 105, rotate: 4 }, { yPercent: 0, rotate: 0, duration: 0.75, stagger: 0.045 }, 0.32)
          .fromTo('.intro-subtitle, .intro-mantra', { opacity: 0, y: 7 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.12 }, 0.65)
          .fromTo('.intro-line', { scaleX: 0 }, { scaleX: 1, duration: 1.35, ease: 'power1.inOut' }, 0.15)
          .to('.intro-content, .intro-orbits', { y: -10, opacity: 0, duration: 0.28 }, 1.9)
          .to(intro, { opacity: 0, duration: 0.2 }, 2.08);
      }, intro);
    } catch {
      if (generation === introGeneration) finishIntro();
    }
  }

  intro.addEventListener('cancel', (event) => { event.preventDefault(); finishIntro(); });
  document.querySelector('#skip-intro').addEventListener('click', finishIntro);
  replay?.addEventListener('click', playIntro);
  function applyPreference() {
    if (replay) replay.hidden = motionDisabled();
    if (motionDisabled() && intro.open) finishIntro();
    else enterView(activeView);
  }
  preference.addEventListener('change', applyPreference);
  document.addEventListener('motionpausechange', event => {
    manuallyPaused = Boolean(event.detail.paused);
    applyPreference();
  });
  if (replay) replay.hidden = motionDisabled();
  let seen = new URLSearchParams(location.search).get('intro') === 'skip';
  try { seen ||= sessionStorage.getItem('sfm-intro-seen') === '1'; } catch { /* No storage required. */ }
  if (!seen) playIntro();
  document.addEventListener('experiencechange', () => enterView(activeView));
  return { enterView };
}
