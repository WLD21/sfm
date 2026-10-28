import React, { useEffect, useRef, useState } from 'react';
import { GymScene as GymFallback, SpaScene as SpaFallback } from './experience-scenes-fallback.jsx';

// Literal references are embedded by the offline single-file build too.
const posters = {
  gym: { mobile: '/images/scene-gym-mobile.png', desktop: '/images/scene-gym-desktop.png' },
  spa: { mobile: '/images/scene-spa-mobile.png', desktop: '/images/scene-spa-desktop.png' },
};
function Scene({ kind, animate, enabled = true, focus = 'strength', reduced = false }) {
  const host = useRef(null), api = useRef(null);
  const settings = useRef({ motion: animate, focus });
  settings.current = { motion: animate, focus };
  const [onscreen, setOnscreen] = useState(false);
  const [failed, setFailed] = useState(false);
  const [posterLoaded, setPosterLoaded] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setOnscreen(entry.isIntersecting), { rootMargin: '0px' });
    observer.observe(host.current); return () => observer.disconnect();
  }, []);
  useEffect(() => {
    let canceled = false;
    if (!enabled || !onscreen || failed || reduced) return;
    import('./scene-renderer.js').then(({ createScene }) => {
      if (canceled) return;
      try {
        api.current = createScene(host.current, kind, () => setFailed(true));
        api.current.update(settings.current);
      } catch { setFailed(true); }
    }).catch(() => { if (!canceled) setFailed(true); });
    return () => { canceled = true; api.current?.dispose(); api.current = null; };
  }, [enabled, onscreen, kind, failed, reduced]);
  useEffect(() => { api.current?.update({ motion: animate, focus }); }, [animate, focus]);
  const Fallback = kind === 'gym' ? GymFallback : SpaFallback;
  return <div ref={host} className={'scene-3d ' + kind + '-scene'} data-scene={kind} data-scene-fallback={failed || reduced ? 'true' : 'false'} aria-hidden="true">
    <div className="scene-poster">
      {!posterLoaded && <Fallback animate={false} />}
      <picture style={{ visibility: posterLoaded ? 'visible' : 'hidden' }}>
        <source media="(max-width: 640px)" srcSet={posters[kind].mobile} />
        <img src={posters[kind].desktop} alt="" decoding="async" onLoad={() => setPosterLoaded(true)} />
      </picture>
    </div>
  </div>;
}
export function GymScene(props) { return <Scene kind="gym" {...props} />; }
export function SpaScene(props) { return <Scene kind="spa" {...props} />; }
