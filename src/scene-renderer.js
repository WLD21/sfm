// Real, local geometry; no remote models, trackers, HDRs or media requests.
import * as THREE from 'three';

const clamp = THREE.MathUtils.clamp;
const smooth = (a, b, t) => a + (b - a) * t;
function canvasTexture(draw, size = 256) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  draw(canvas.getContext('2d'), size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
function woodTexture() {
  return canvasTexture((c, n) => {
    c.fillStyle = '#c99b63'; c.fillRect(0, 0, n, n);
    for (let i = 0; i < 170; i++) {
      const x = (i * 71.37) % n;
      c.strokeStyle = i % 3 ? 'rgba(82,45,20,.12)' : 'rgba(255,235,193,.25)';
      c.lineWidth = .4 + i % 3;
      c.beginPath(); c.moveTo(x, 0);
      c.bezierCurveTo(x + Math.sin(i) * 5, n / 3, x - 4, n * .7, x + Math.sin(i * 4) * 3, n); c.stroke();
    }
  });
}
function mesh(geometry, material, parent, x = 0, y = 0, z = 0) {
  const item = new THREE.Mesh(geometry, material);
  item.position.set(x, y, z); parent.add(item); return item;
}
function box(parent, material, w, h, d, x, y, z) {
  return mesh(new THREE.BoxGeometry(w, h, d), material, parent, x, y, z);
}
function roundedPlate(parent, material, radius, depth, x) {
  const edge = .05;
  const profile = [
    new THREE.Vector2(.04, -depth / 2),
    new THREE.Vector2(radius - edge, -depth / 2),
    new THREE.Vector2(radius, -depth / 2 + edge),
    new THREE.Vector2(radius, depth / 2 - edge),
    new THREE.Vector2(radius - edge, depth / 2),
    new THREE.Vector2(.04, depth / 2),
  ];
  const plate = mesh(new THREE.LatheGeometry(profile, 64), material, parent, x);
  plate.rotation.z = Math.PI / 2;
  return plate;
}
function dumbbell(materials) {
  const root = new THREE.Group(), ends = [];
  const shaft = mesh(new THREE.CylinderGeometry(.105, .105, 1.65, 40), materials.chrome, root);
  shaft.rotation.z = Math.PI / 2;
  const grip = mesh(new THREE.CylinderGeometry(.135, .135, .89, 48), materials.grip, root);
  grip.rotation.z = Math.PI / 2;
  // Fine machined rings catch the light instead of painting a flat grey handle.
  const rings = new THREE.InstancedMesh(new THREE.TorusGeometry(.137, .006, 4, 40), materials.chrome, 23);
  const ringPose = new THREE.Object3D(); ringPose.rotation.y = Math.PI / 2;
  for (let i = -11; i <= 11; i++) {
    ringPose.position.x = i * .034; ringPose.updateMatrix(); rings.setMatrixAt(i + 11, ringPose.matrix);
  }
  root.add(rings);
  for (const side of [-1, 1]) {
    const end = new THREE.Group(); end.position.x = side * .77; root.add(end);
    roundedPlate(end, materials.rubber, .64, .32, side * .04);
    roundedPlate(end, materials.rubber, .57, .2, side * .29);
    roundedPlate(end, materials.face, .48, .08, side * .43);
    const ring = mesh(new THREE.TorusGeometry(.414, .012, 8, 64), materials.accent, end, side * .479);
    ring.rotation.y = Math.PI / 2;
    roundedPlate(end, materials.chrome, .13, .03, side * .49);
    ends.push({ item: end, side });
  }
  return { root, ends };
}
function gymWorld(scene) {
  const materials = {
    rubber: new THREE.MeshStandardMaterial({ color: '#25392e', roughness: .79, metalness: .08 }),
    face: new THREE.MeshStandardMaterial({ color: '#344e3c', roughness: .62, metalness: .17 }),
    chrome: new THREE.MeshStandardMaterial({ color: '#d6dbcd', roughness: .23, metalness: .97 }),
    grip: new THREE.MeshStandardMaterial({ color: '#a3afa2', roughness: .42, metalness: .87 }),
    accent: new THREE.MeshStandardMaterial({ color: '#c5dc8b', roughness: .43, metalness: .25 }),
  };
  const group = new THREE.Group(); scene.add(group);
  const front = dumbbell(materials), rear = dumbbell(materials);
  group.add(front.root, rear.root);
  rear.root.scale.setScalar(.83);
  rear.root.position.set(.1, .69, -.85);
  rear.root.rotation.set(.35, -.45, -.26);
  front.root.position.set(-.14, -.06, .52);
  front.root.rotation.set(.21, .36, -.2);
  const plinthMaterial = new THREE.MeshStandardMaterial({ color: '#d5ddbf', roughness: .9 });
  const plinth = mesh(new THREE.CylinderGeometry(2.05, 2.1, .16, 96), plinthMaterial, scene, 0, -.96, 0);
  plinth.scale.z = .72;
  return {
    update({ time, progress, pointer, focus, motion }) {
      const f = focus === 'fitness' ? 1 : focus === 'confidence' ? 2 : 0;
      const open = Math.sin(progress * Math.PI) * .3;
      front.ends.forEach(({ item, side }) => { item.position.x = side * (.77 + open); });
      rear.ends.forEach(({ item, side }) => { item.position.x = side * (.77 + open * .6); });
      group.rotation.y = smooth(group.rotation.y, f * .19 + pointer.x * .13 + progress * .28, motion ? .075 : 1);
      group.rotation.x = smooth(group.rotation.x, pointer.y * .06, motion ? .07 : 1);
      front.root.position.y = -.06 + (motion ? Math.sin(time * .65) * .035 : 0) + progress * .08;
      front.root.rotation.z = -.2 + progress * .16;
      rear.root.position.y = .69 + (motion ? Math.sin(time * .55 + 1) * .045 : 0) - f * .075;
      rear.root.rotation.z = -.26 - progress * .16 - f * .09;
      return [group.rotation.y, group.rotation.x, front.root.position.y, front.ends[0].item.position.x, rear.root.rotation.z];
    },
  };
}
function palm(parent, wood, leafMaterial, x, y, z, scale = 1) {
  const base = new THREE.Group(); base.position.set(x, y, z); base.scale.setScalar(scale); parent.add(base);
  const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(.02, .7, .01), new THREE.Vector3(-.12, 1.5, 0)]);
  mesh(new THREE.TubeGeometry(curve, 18, .045, 8, false), wood, base);
  const crown = new THREE.Group(); crown.position.set(-.12, 1.5, 0); base.add(crown);
  for (let f = 0; f < 7; f++) {
    const angle = f / 7 * Math.PI * 2;
    const frond = new THREE.Group(); frond.rotation.y = angle; crown.add(frond);
    const path = new THREE.CatmullRomCurve3([new THREE.Vector3(), new THREE.Vector3(.4, .3, 0), new THREE.Vector3(.9, .04, 0), new THREE.Vector3(1.13, -.2, 0)]);
    mesh(new THREE.TubeGeometry(path, 16, .009, 5, false), leafMaterial, frond);
    const vertices = [];
    for (let i = 1; i < 13; i++) {
      const t = i / 14, p = path.getPoint(t), width = Math.sin(t * Math.PI) * .29;
      for (const side of [-1, 1]) vertices.push(
        p.x - .05, p.y, 0, p.x + .08, p.y + .015, 0, p.x + .11, p.y - .08, side * width,
      );
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.computeVertexNormals(); mesh(geometry, leafMaterial, frond);
  }
  return crown;
}
function spaWorld(scene) {
  const group = new THREE.Group(); scene.add(group);
  const wood = new THREE.MeshStandardMaterial({ map: woodTexture(), color: '#f5d4a1', roughness: .83 });
  const darkWood = new THREE.MeshStandardMaterial({ color: '#71472c', roughness: .79 });
  const steel = new THREE.MeshStandardMaterial({ color: '#343632', roughness: .4, metalness: .8 });
  const stone = new THREE.MeshStandardMaterial({ color: '#55564d', roughness: .97 });
  const leaf = new THREE.MeshStandardMaterial({ color: '#3c6545', roughness: .8, side: THREE.DoubleSide });
  const stoneBase = new THREE.MeshStandardMaterial({ color: '#d7c9ab', roughness: .95 });
  box(group, stoneBase, 3.5, .13, 2.55, 0, -.9, -.18);
  // An open architectural detail: cedar walls, bench and heater, not a toy hut.
  for (let i = 0; i < 14; i++) {
    box(group, wood, .205, 2.25, .085, -1.4 + i * .215, .27, -1.2);
  }
  for (let i = 0; i < 7; i++) box(group, wood, .085, 2.25, .205, -1.51, .27, -1.08 + i * .215);
  box(group, darkWood, 3.1, .09, .12, -.02, 1.42, -1.18);
  for (let i = 0; i < 6; i++) box(group, wood, 2.1, .065, .1, -.28, -.1, -.93 + i * .12);
  for (const x of [-1.16, .55]) {
    box(group, darkWood, .085, .72, .085, x, -.49, -.91);
    box(group, darkWood, .085, .72, .085, x, -.49, -.36);
  }
  for (let i = 0; i < 3; i++) box(group, wood, 2.1, .11, .045, -.28, .23 + i * .15, -1.1);
  const heater = new THREE.Group(); heater.position.set(1.08, -.52, -.42); group.add(heater);
  const heaterBody = mesh(new THREE.CylinderGeometry(.29, .25, .64, 32), steel, heater);
  for (let i = 0; i < 15; i++) {
    const a = i / 15 * Math.PI * 2;
    box(heater, steel, .022, .68, .022, Math.cos(a) * .3, 0, Math.sin(a) * .3);
  }
  for (let i = 0; i < 11; i++) {
    const rock = mesh(new THREE.DodecahedronGeometry(.11 + i % 3 * .017, 1), stone, heater,
      Math.sin(i * 2.4) * .17, .32 + Math.sin(i) * .028, Math.cos(i * 2.4) * .17);
    rock.scale.set(1.2, .7, 1); rock.rotation.set(i, i * .8, i * .4);
  }
  const glow = new THREE.PointLight('#ffcf84', 4, 4); glow.position.set(-.4, -.35, -.65); group.add(glow);
  const glowStrip = new THREE.MeshBasicMaterial({ color: '#ffe4ab' });
  box(group, glowStrip, 1.9, .022, .024, -.27, -.21, -.31);
  const crown = palm(group, darkWood, leaf, 1.58, -.84, .58, .83);
  const mist = canvasTexture((c, n) => {
    const g = c.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2);
    g.addColorStop(0, 'rgba(255,252,240,.36)'); g.addColorStop(.45, 'rgba(255,252,240,.16)'); g.addColorStop(1, 'rgba(255,252,240,0)');
    c.fillStyle = g; c.fillRect(0, 0, n, n);
  }, 128);
  const steam = [];
  for (let i = 0; i < 8; i++) {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: mist, transparent: true, depthWrite: false, opacity: .55 }));
    group.add(sprite); steam.push(sprite);
  }
  return {
    update({ time, progress, pointer, motion }) {
      group.rotation.y = smooth(group.rotation.y, -.12 + pointer.x * .09 + progress * .13, motion ? .065 : 1);
      crown.rotation.z = motion ? Math.sin(time * .5) * .045 : 0;
      steam.forEach((p, i) => {
        const life = ((motion ? time * .12 : .24) + i / steam.length) % 1;
        p.position.set(1.03 + Math.sin(life * 4 + i) * .12, -.05 + life * 1.65, -.4 + life * .15);
        p.scale.setScalar(.28 + life * .7);
        p.material.opacity = Math.sin(life * Math.PI) * .56;
      });
      return [group.rotation.y, crown.rotation.z, steam[0].position.y, steam[0].material.opacity, heaterBody.position.y];
    },
  };
}

export function createScene(host, kind, onFail) {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;
  renderer.setClearColor(0x000000, 0);
  const canvas = renderer.domElement;
  canvas.className = 'scene-canvas'; canvas.setAttribute('aria-hidden', 'true');
  host.append(canvas);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, .1, 50);
  // Six painted studio softboxes supply reflections without rendering an
  // entire room into six costly cubemap faces for each scene switch.
  const faces = Array.from({ length: 6 }, (_, i) => {
    const image = document.createElement('canvas'); image.width = image.height = 64;
    const ctx = image.getContext('2d'), gradient = ctx.createLinearGradient(0, 0, 64, 64);
    gradient.addColorStop(0, i === 2 ? '#fffef4' : '#d9dfd0');
    gradient.addColorStop(1, i === 3 ? '#465042' : '#7e8b78');
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, 64, 64);
    if (i !== 3) { ctx.fillStyle = '#ffffff'; ctx.fillRect(7, 4, 18, 48); }
    return image;
  });
  const env = new THREE.CubeTexture(faces); env.colorSpace = THREE.SRGBColorSpace;
  env.needsUpdate = true; scene.environment = env;
  scene.add(new THREE.HemisphereLight('#fffde9', '#5c6451', 2.3));
  const light = new THREE.DirectionalLight('#fff5db', 4.2); light.position.set(-3, 6, 4); scene.add(light);
  const fill = new THREE.DirectionalLight('#e0ead4', 1.8); fill.position.set(4, 1, -2); scene.add(fill);
  const world = kind === 'gym' ? gymWorld(scene) : spaWorld(scene);
  const shadowTexture = canvasTexture((c, n) => {
    const g = c.createRadialGradient(n / 2, n / 2, n * .09, n / 2, n / 2, n * .48);
    g.addColorStop(0, 'rgba(30,36,22,.24)'); g.addColorStop(1, 'rgba(30,36,22,0)');
    c.fillStyle = g; c.fillRect(0, 0, n, n);
  });
  const shadow = mesh(new THREE.PlaneGeometry(5.4, 4.1), new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false }), scene, 0, -1.07, .1);
  shadow.rotation.x = -Math.PI / 2;
  let frame = 0, disposed = false, running = false, last = 0, clock = 0, count = 0;
  let frameBudget = 33, resolutionLimit = 1.5;
  let settings = { motion: false, focus: 'strength' }, progress = 0;
  const pointer = { x: 0, y: 0 };
  const coarse = matchMedia('(pointer: coarse)').matches;
  const act = host.closest('[data-sc-act]');
  function readProgress() {
    if (!act) return 0;
    // Scroll Craft publishes flow progress. Normalize it over this short hero,
    // without adding artificial scroll distance or pinning the booking controls.
    const h = act.offsetHeight, top = act.getBoundingClientRect().top + scrollY;
    const engine = parseFloat(act.style.getPropertyValue('--sc-p'));
    const raw = Number.isFinite(engine) ? engine : (scrollY + innerHeight - top) / (h + innerHeight);
    const opening = (innerHeight - top) / (h + innerHeight);
    return clamp((raw - opening) / (Math.max(220, h * .7) / (h + innerHeight)), 0, 1);
  }
  function render(now = performance.now()) {
    if (disposed) return;
    const dt = last ? Math.min((now - last) / 1000, .05) : 0; last = now;
    if (settings.motion) clock += dt;
    progress = settings.motion ? smooth(progress, readProgress(), .1) : 0;
    const state = world.update({ ...settings, time: clock, progress, pointer: settings.motion ? pointer : { x: 0, y: 0 } });
    const started = performance.now();
    renderer.render(scene, camera);
    const elapsed = performance.now() - started;
    // Do not let expensive software/GPU rendering monopolize the main thread.
    if (count > 2 && elapsed > 55) {
      frameBudget = Math.max(66, Math.min(140, elapsed * 1.5));
      if (resolutionLimit > 1) {
        resolutionLimit = 1;
        renderer.setPixelRatio(1); renderer.setSize(host.clientWidth, host.clientHeight, false);
      }
    }
    host.dataset.sceneReady = 'true';
    host.dataset.sceneFrames = String(++count);
    host.dataset.scVerifyState = state.map(n => n.toFixed(3)).join(',');
    host.dataset.sceneFocus = settings.focus;
  }
  function tick(now) {
    if (!running || disposed) return;
    // A touch screen gets a deliberately smaller 30fps GPU budget.
    if (!last || now - last >= frameBudget) render(now);
    frame = requestAnimationFrame(tick);
  }
  function resize() {
    if (disposed) return;
    const w = host.clientWidth, h = host.clientHeight;
    if (!w || !h) return;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, resolutionLimit, coarse || innerWidth < 641 ? 1.25 : 1.5));
    renderer.setSize(w, h, false); camera.aspect = w / h;
    const narrow = w / h < 1.2;
    camera.position.set(kind === 'spa' ? 3.8 : 3.3, kind === 'spa' ? 2.4 : 2.15, kind === 'spa' ? 5.6 : 6.1);
    if (narrow) camera.position.multiplyScalar(kind === 'spa' ? 1.03 : 1.04);
    camera.lookAt(0, kind === 'spa' ? .15 : -.02, 0); camera.updateProjectionMatrix(); render();
  }
  const observer = new ResizeObserver(resize); observer.observe(host);
  function move(e) {
    if (coarse || !settings.motion) return;
    const r = host.getBoundingClientRect();
    pointer.x = clamp((e.clientX - r.left) / r.width * 2 - 1, -1, 1);
    pointer.y = clamp((e.clientY - r.top) / r.height * 2 - 1, -1, 1);
  }
  function leave() { pointer.x = pointer.y = 0; }
  function lost(event) { event.preventDefault(); running = false; cancelAnimationFrame(frame); onFail(); }
  host.addEventListener('pointermove', move, { passive: true });
  host.addEventListener('pointerleave', leave);
  canvas.addEventListener('webglcontextlost', lost);
  resize();
  return {
    update(next) {
      if (disposed) return;
      settings = { ...settings, ...next };
      running = settings.motion;
      cancelAnimationFrame(frame); last = 0; render();
      if (running) frame = requestAnimationFrame(tick);
    },
    dispose() {
      if (disposed) return;
      disposed = true; running = false; cancelAnimationFrame(frame); observer.disconnect();
      host.removeEventListener('pointermove', move); host.removeEventListener('pointerleave', leave);
      canvas.removeEventListener('webglcontextlost', lost);
      const geometries = new Set(), materials = new Set(), textures = new Set();
      scene.traverse(o => { if (o.geometry) geometries.add(o.geometry); if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => materials.add(m)); });
      materials.forEach(m => { Object.values(m).forEach(v => { if (v?.isTexture) textures.add(v); }); m.dispose(); });
      geometries.forEach(g => g.dispose()); textures.forEach(t => t.dispose()); env.dispose();
      renderer.dispose(); renderer.forceContextLoss(); canvas.remove();
      delete host.dataset.sceneReady; host.dataset.sceneFrames = '0';
    },
  };
}
