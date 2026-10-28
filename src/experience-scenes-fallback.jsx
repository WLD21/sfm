import React, { useEffect, useRef, useState } from 'react';

function useOnScreen(ref) {
  const [onScreen, setOnScreen] = useState(false);
  useEffect(() => {
    if (!('IntersectionObserver' in window)) { setOnScreen(true); return; }
    const observer = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting), { rootMargin: '40px' });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref]);
  return onScreen;
}

function Dumbbell({ x, y, angle, small = false }) {
  return <g transform={`translate(${x} ${y}) rotate(${angle}) scale(${small ? 0.68 : 1})`}>
    <g className={small ? 'weight-float weight-secondary' : 'weight-float weight-primary'}>
      <rect x="-80" y="-11" width="160" height="22" rx="7" fill="url(#chrome)" />
      {[-1, 1].map(side => <g key={side} transform={`translate(${side * 82} 0)`}>
        <rect x="-29" y="-68" width="58" height="136" rx="18" fill="url(#plate)" stroke="#263c32" strokeWidth="2" />
        <rect x="-16" y="-61" width="32" height="122" rx="10" fill="url(#plateFace)" />
        <path d="M-10 -47V47" stroke="#bdd59e" strokeOpacity=".35" strokeWidth="2" />
        <rect x={side < 0 ? -37 : 29} y="-22" width="8" height="44" rx="4" fill="#183127" />
      </g>)}
      <path d="M-45 -6H45" stroke="#f7f4e9" strokeOpacity=".8" strokeWidth="2" />
      {[-30, -15, 0, 15, 30].map(x => <path key={x} d={`M${x} -5v10`} stroke="#526658" strokeOpacity=".5" />)}
    </g>
  </g>;
}

function Palm({ x, y, scale = 1, flip = false }) {
  return <g transform={`translate(${x} ${y}) scale(${flip ? -scale : scale} ${scale})`}>
    <path d="M0 150Q15 65 3 0" fill="none" stroke="#b99561" strokeWidth="12" />
    <path d="M-2 146Q10 70 0 8" fill="none" stroke="#dcc49e" strokeWidth="4" />
    <g className="palm-crown">
      {[
        'M3 3Q-60 -48 -91 5Q-34 -12 3 3',
        'M3 3Q-22 -70 -60 -65Q-18 -19 3 3',
        'M3 3Q32 -75 57 -47Q27 -20 3 3',
        'M3 3Q80 -32 94 16Q41 -7 3 3',
        'M3 3Q-60 12 -61 63Q-31 25 3 3',
        'M3 3Q59 13 63 64Q30 26 3 3',
      ].map((d, i) => <path key={d} d={d} fill={i % 2 ? '#385d47' : '#577453'} stroke="#385b43" strokeWidth="1" />)}
      <circle r="8" cx="3" cy="3" fill="#a3824c" />
    </g>
  </g>;
}

export function GymScene({ animate }) {
  const ref = useRef(null);
  const onScreen = useOnScreen(ref);
  useEffect(() => {
    if (!animate || !onScreen) return;
    let cancelled = false;
    let context;
    import('gsap').then(({ gsap }) => {
      if (cancelled) return;
      context = gsap.context(() => {
        gsap.to('.weight-primary', { y: -18, rotation: 3, transformOrigin: '50% 50%', duration: 2.8, repeat: -1, yoyo: true, ease: 'sine.inOut' });
        gsap.to('.weight-secondary', { y: 12, rotation: -5, transformOrigin: '50% 50%', duration: 3.7, repeat: -1, yoyo: true, ease: 'sine.inOut' });
        gsap.to('.weight-shadow', { scaleX: .88, opacity: .14, transformOrigin: '50% 50%', duration: 2.8, repeat: -1, yoyo: true, ease: 'sine.inOut' });
        gsap.to('.gym-orbit', { rotation: 360, transformOrigin: '50% 50%', duration: 60, repeat: -1, ease: 'none' });
      }, ref);
    }).catch(() => { /* Static illustration is the fallback. */ });
    return () => { cancelled = true; context?.revert(); };
  }, [animate, onScreen]);
  return <svg ref={ref} className="experience-scene legacy-gym-svg" viewBox="0 0 600 520" aria-hidden="true">
    <defs>
      <linearGradient id="plate" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#6d8863" /><stop offset=".4" stopColor="#274b3b" /><stop offset="1" stopColor="#102c23" /></linearGradient>
      <linearGradient id="plateFace" x1="0" y1="0" x2="1" y2="0"><stop stopColor="#55744e" /><stop offset=".5" stopColor="#37533c" /><stop offset="1" stopColor="#68805d" /></linearGradient>
      <linearGradient id="chrome" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#faf4df" /><stop offset=".4" stopColor="#8d9a84" /><stop offset=".52" stopColor="#d5d9c3" /><stop offset="1" stopColor="#5b7061" /></linearGradient>
      <radialGradient id="gymGlow"><stop stopColor="#ddebc0" /><stop offset="1" stopColor="#d9e5cf" stopOpacity="0" /></radialGradient>
      <radialGradient id="softShadow"><stop stopColor="#304d38" stopOpacity=".35" /><stop offset="1" stopColor="#304d38" stopOpacity="0" /></radialGradient>
    </defs>
    <circle cx="300" cy="245" r="220" fill="url(#gymGlow)" />
    <g fill="none" stroke="#849c77" strokeOpacity=".3">
      <circle cx="300" cy="250" r="182" /><circle cx="300" cy="250" r="213" strokeDasharray="2 12" />
      <g className="gym-orbit"><ellipse cx="300" cy="250" rx="240" ry="89" transform="rotate(-34 300 250)" /><circle cx="100" cy="365" r="6" fill="#a1b476" stroke="none" /></g>
    </g>
    <ellipse className="weight-shadow" cx="306" cy="408" rx="174" ry="35" fill="url(#softShadow)" />
    <Dumbbell x={344} y={191} angle={-26} small />
    <Dumbbell x={272} y={304} angle={-25} />
    <g stroke="#537142" strokeWidth="1.2"><path d="M92 137h24m-12-12v24M465 371h18m-9-9v18" /><circle cx="486" cy="141" r="3" fill="#789455" /></g>
  </svg>;
}

export function SpaScene({ animate }) {
  const ref = useRef(null);
  const onScreen = useOnScreen(ref);
  useEffect(() => {
    if (!animate || !onScreen) return;
    let cancelled = false;
    let context;
    import('gsap').then(({ gsap }) => {
      if (cancelled) return;
      context = gsap.context(() => {
        gsap.fromTo('.steam', { y: 16, opacity: 0, scaleX: .8 }, { y: -32, opacity: .65, scaleX: 1.25, duration: 3.4, repeat: -1, stagger: 1.1, ease: 'sine.inOut', repeatDelay: .3 });
        gsap.to('.palm-crown', { rotation: 4, svgOrigin: '3 3', duration: 4, repeat: -1, yoyo: true, ease: 'sine.inOut', stagger: .6 });
        gsap.to('.sauna-glow', { opacity: .55, duration: 2.8, repeat: -1, yoyo: true, ease: 'sine.inOut' });
      }, ref);
    }).catch(() => { /* The warm room remains visible without animation. */ });
    return () => { cancelled = true; context?.revert(); };
  }, [animate, onScreen]);
  return <svg ref={ref} className="experience-scene legacy-spa-svg" viewBox="0 0 600 440" aria-hidden="true">
    <defs>
      <linearGradient id="saunaWood" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#d7b580" /><stop offset="1" stopColor="#a77a47" /></linearGradient>
      <linearGradient id="saunaGlass"><stop stopColor="#2c493b" /><stop offset="1" stopColor="#7e855c" /></linearGradient>
      <radialGradient id="saunaWarmth"><stop stopColor="#ffdd93" stopOpacity=".9" /><stop offset="1" stopColor="#f3bc6f" stopOpacity="0" /></radialGradient>
    </defs>
    <ellipse cx="301" cy="354" rx="245" ry="40" fill="#a7967224" />
    <circle cx="311" cy="215" r="167" fill="#efe4c8" />
    <Palm x={111} y={130} scale={1.12} /><Palm x={491} y={158} scale={.95} flip />
    <g className="sauna-cabin">
      <path d="M184 191l124-67 127 67v149H184Z" fill="url(#saunaWood)" stroke="#a98251" strokeWidth="2" />
      {[211, 230, 249, 268, 287, 306, 325].map(y => <path key={y} d={`M185 ${y}H434`} stroke="#9c744a" strokeOpacity=".48" />)}
      <path d="M164 197l144-81 148 81-12 18-136-77-134 76Z" fill="#466047" />
      <rect x="235" y="199" width="105" height="141" rx="4" fill="url(#saunaGlass)" stroke="#e4c391" strokeWidth="10" />
      <ellipse className="sauna-glow" cx="290" cy="262" rx="64" ry="77" fill="url(#saunaWarmth)" />
      <path d="M247 299h80M247 282h80" stroke="#cc9e61" strokeWidth="7" />
      <path d="M323 244v31" stroke="#f1d9a9" strokeWidth="5" />
      <rect x="366" y="218" width="42" height="47" rx="3" fill="#53654a" stroke="#e7c18a" strokeWidth="6" />
      <path d="M387 219v45" stroke="#e7c18a" strokeWidth="4" />
      <path d="M222 347h132" stroke="#9d7951" strokeWidth="12" />
    </g>
    <g fill="none" stroke="#fffaf0" strokeWidth="7" strokeLinecap="round">
      <path className="steam" d="M269 173c-30-27 21-35 0-63s-7-38 0-48" />
      <path className="steam" d="M311 154c-27-26 22-34 1-59s-6-34 0-44" />
      <path className="steam" d="M349 180c-24-27 21-32 0-60s-6-33 0-42" />
    </g>
    <ellipse cx="157" cy="351" rx="34" ry="11" fill="#8b987b" /><ellipse cx="146" cy="339" rx="24" ry="11" fill="#c2c4aa" /><ellipse cx="160" cy="327" rx="18" ry="9" fill="#d6d5bb" />
    <path d="M454 354c-27-40-18-63-6-63s25 34 6 63Z" fill="#82916a" />
  </svg>;
}
