/* «Небесный»: 3D-герой (проба 19.10, Джессика: «одного героя и несколько вещей для него»).
   Модель собрана из примитивов three.js: тело, лицо (текстура), волосы; вещи — отдельные группы по слотам.
   Тон-шейдинг в 3 тона + контур (вывернутая оболочка). Крутится пальцем; при reduced-motion не качается.
   Подключается лениво: тегом type=module из hero.js (heroLoad3d), three — vendor/three (MIT). */
import * as T from '../vendor/three/three.module.min.js';

const C = { skin: 0xf6dcc8, skinSh: 0xe2b9a2, hair: 0x5a3626, shirt: 0xf3ecdf, pants: 0x2b2f45, boot: 0x5b3a26,
  gold: 0xd9b25a, line: 0x2a2236, iris: 0x2f8f8a };

function gradientMap() {
  const d = new Uint8Array([90, 90, 90, 255, 175, 175, 175, 255, 255, 255, 255, 255]);
  const t = new T.DataTexture(d, 3, 1, T.RGBAFormat); t.minFilter = t.magFilter = T.NearestFilter; t.needsUpdate = true; return t;
}
const GRAD = gradientMap();
const toon = (color, extra) => new T.MeshToonMaterial(Object.assign({ color, gradientMap: GRAD }, extra || {}));
const OUTLINE = new T.ShaderMaterial({
  side: T.BackSide, uniforms: { w: { value: 0.006 }, c: { value: new T.Color(C.line) } },
  vertexShader: 'uniform float w;void main(){vec3 p=position+normal*w;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);}',
  fragmentShader: 'uniform vec3 c;void main(){gl_FragColor=vec4(c,1.0);}'
});

function part(geo, mat, line) {
  const m = new T.Mesh(geo, mat);
  if (line !== false) { const o = new T.Mesh(geo, OUTLINE); o.renderOrder = -1; m.add(o); }
  return m;
}
const sc = (o, x, y, z) => (o.scale.set(x, y, z), o);
function at(o, x, y, z, rx, ry, rz) { o.position.set(x || 0, y || 0, z || 0); o.rotation.set(rx || 0, ry || 0, rz || 0); return o; }
/* профиль всегда снизу вверх, иначе нормали внутрь и ткань чёрная */
const lathe = (pts, seg, ps, pl) => new T.LatheGeometry((pts[0][1] > pts[pts.length - 1][1] ? pts.slice().reverse() : pts).map(p => new T.Vector2(p[0], p[1])), seg || 40, ps || 0, pl || Math.PI * 2);
/* сегмент между двумя точками: капсула от a до b */
function limb(a, b, r, mat) {
  const A = new T.Vector3(...a), B = new T.Vector3(...b), len = A.distanceTo(B);
  const m = part(new T.CapsuleGeometry(r, len, 8, 16), mat);
  m.position.copy(A).add(B).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), B.clone().sub(A).normalize());
  return m;
}

function faceTexture() {
  const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 512; const g = cv.getContext('2d');
  g.fillStyle = '#f6dcc8'; g.fillRect(0, 0, 1024, 512);
  const eye = (cx, flip) => {
    const cy = 292;
    g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(cx, cy, 22, 27, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#2f8f8a'; g.beginPath(); g.ellipse(cx, cy + 3, 16, 23, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#1d4f55'; g.beginPath(); g.ellipse(cx, cy + 6, 9, 13, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(cx - 6 * flip, cy - 8, 6, 7, 0, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(cx + 6 * flip, cy + 12, 3, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#2a2236'; g.lineWidth = 7; g.lineCap = 'round';
    g.beginPath(); g.moveTo(cx - 26, cy - 18); g.quadraticCurveTo(cx, cy - 34, cx + 26, cy - 20); g.stroke(); /* верхнее веко */
    g.lineWidth = 3; g.beginPath(); g.moveTo(cx - 14, cy + 28); g.quadraticCurveTo(cx, cy + 32, cx + 14, cy + 28); g.stroke();
    g.lineWidth = 5; g.strokeStyle = '#5a3626'; g.beginPath(); g.moveTo(cx - 22, cy - 50); g.quadraticCurveTo(cx, cy - 58, cx + 24, cy - 48); g.stroke(); /* бровь */
  };
  eye(256 - 46, 1); eye(256 + 46, -1);
  g.strokeStyle = '#b06a5c'; g.lineWidth = 3; g.beginPath(); g.moveTo(246, 352); g.quadraticCurveTo(256, 358, 266, 352); g.stroke(); /* рот */
  g.fillStyle = 'rgba(232,140,130,.35)'; [192, 320].forEach(x => { g.beginPath(); g.ellipse(x, 330, 20, 9, 0, 0, Math.PI * 2); g.fill(); }); /* румянец */
  const t = new T.CanvasTexture(cv); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4; return t;
}

function starTexture(bg, n) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 512; const g = cv.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, 512, 512); let s = 7;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < n; i++) { const x = rnd() * 512, y = rnd() * 512, r = rnd() * 2.2 + 0.6; g.fillStyle = rnd() > 0.8 ? '#f4d27a' : '#dfe6ff'; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
  g.strokeStyle = 'rgba(244,210,122,.55)'; g.lineWidth = 1.5; /* созвездия */
  for (let k = 0; k < 6; k++) { g.beginPath(); let x = rnd() * 512, y = rnd() * 512; g.moveTo(x, y); for (let j = 0; j < 4; j++) { x += (rnd() - 0.5) * 90; y += (rnd() - 0.5) * 90; g.lineTo(x, y); g.fillStyle = '#f4d27a'; g.fillRect(x - 2, y - 2, 4, 4); } g.stroke(); }
  const t = new T.CanvasTexture(cv); t.colorSpace = T.SRGBColorSpace; t.wrapS = t.wrapT = T.RepeatWrapping; return t;
}

function starShape(R, r, n) {
  const s = new T.Shape(); n = n || 5;
  for (let i = 0; i < n * 2; i++) { const a = i * Math.PI / n - Math.PI / 2, d = i % 2 ? r : R; i ? s.lineTo(Math.cos(a) * d, -Math.sin(a) * d) : s.moveTo(Math.cos(a) * d, -Math.sin(a) * d); }
  return s;
}
/* кайма по краю lathe-куска [P0, P0+L] на высоте y */
function hem(r, y, P0, L, mat, sz) { const m = part(lathe([[r - 0.003, y - 0.012], [r + 0.006, y], [r - 0.003, y + 0.012]], 48, P0, L), mat); m.scale.z = sz || 1; return m; }
const star = (R, mat) => part(new T.ExtrudeGeometry(starShape(R, R * 0.45), { depth: R * 0.25, bevelEnabled: false }), mat);

/* ---------- тело ---------- */
function buildBody() {
  const g = new T.Group(), skin = toon(C.skin), shirt = toon(C.shirt), pants = toon(C.pants), boot = toon(C.boot), hair = toon(C.hair);
  /* ноги и сапоги */
  [-1, 1].forEach(sd => {
    g.add(limb([0.075 * sd, 0.78, 0], [0.072 * sd, 0.3, 0.005], 0.062, pants));
    g.add(limb([0.072 * sd, 0.36, 0.005], [0.07 * sd, 0.07, 0.01], 0.066, boot));
    g.add(sc(at(part(new T.SphereGeometry(0.068, 20, 12), boot), 0.07 * sd, 0.045, 0.045), 1, 0.62, 1.55));
    g.add(at(part(new T.TorusGeometry(0.069, 0.009, 8, 24), toon(C.gold)), 0.071 * sd, 0.33, 0.005, Math.PI / 2));
  });
  /* корпус: рубашка, пояс */
  const torso = part(lathe([[0, 0.72], [0.135, 0.74], [0.15, 0.82], [0.128, 0.95], [0.142, 1.07], [0.158, 1.17], [0.162, 1.23], [0.13, 1.29], [0.06, 1.32], [0, 1.325]]), shirt);
  torso.scale.z = 0.72; g.add(torso); g.userData.torso = torso;
  g.add(sc(at(part(new T.CylinderGeometry(0.151, 0.153, 0.05, 40), toon(C.boot)), 0, 0.84, 0), 1, 1, 0.73));
  g.add(at(part(new T.BoxGeometry(0.05, 0.04, 0.02), toon(C.gold)), 0, 0.84, 0.11));
  /* шея и голова */
  g.add(at(part(new T.CylinderGeometry(0.036, 0.04, 0.12, 20), skin), 0, 1.36, 0));
  const k0 = g.children.length;
  const head = part(new T.SphereGeometry(0.13, 48, 32), new T.MeshToonMaterial({ map: faceTexture(), gradientMap: GRAD }));
  head.position.set(0, 1.52, 0); head.scale.set(0.95, 1.06, 0.98); g.add(head);
  [-1, 1].forEach(sd => g.add(sc(at(part(new T.SphereGeometry(0.026, 12, 10), skin), 0.122 * sd, 1.51, -0.005), 0.5, 1, 0.8))); /* уши */
  /* волосы: шапка, затылок, чёлка, боковые пряди */
  const cap = part(new T.SphereGeometry(0.142, 40, 24, 0, Math.PI * 2, 0, 1.28), hair); at(cap, 0, 1.535, -0.004); cap.scale.set(0.97, 1.05, 1); g.add(cap);
  const back = part(new T.SphereGeometry(0.144, 40, 24, Math.PI * 1.05, Math.PI * 0.9, 0, 2.25), hair); at(back, 0, 1.53, -0.006); back.scale.set(0.97, 1.05, 1); g.add(back);
  const lock = (x, y, z, len, rz, rx, r) => { const m = part(new T.ConeGeometry(r || 0.032, len, 10), hair); at(m, x, y, z, Math.PI + (rx || 0), 0, rz); return m; };
  [[-0.09, 0.075, 0.35, 0.5], [-0.05, 0.09, 0.15, 0.55], [-0.005, 0.1, -0.05, 0.6], [0.045, 0.09, -0.22, 0.55], [0.09, 0.075, -0.38, 0.5]]
    .forEach(([x, len, rz, tilt]) => { const l = lock(x, 1.6, 0.098, len, rz, -tilt, 0.036); l.scale.z = 0.55; g.add(l); });
  [-1, 1].forEach(sd => { g.add(lock(0.122 * sd, 1.46, 0.03, 0.2, -0.12 * sd, -0.05, 0.03)); g.add(lock(0.1 * sd, 1.42, -0.08, 0.24, -0.25 * sd, 0.15, 0.04)); });
  g.add(at(part(new T.ConeGeometry(0.03, 0.12, 10), hair), 0.02, 1.69, -0.02, -0.5, 0, -0.6)); /* вихор */
  /* голова крупнее, как в аниме: всё, что после шеи, — в группу с центром головы */
  const hg = new T.Group(); hg.position.set(0, 1.53, 0); hg.scale.setScalar(1.18);
  g.children.slice(k0).forEach(o => { g.remove(o); o.position.y -= 1.52; hg.add(o); }); g.add(hg);
  /* руки: правая (для зрителя слева) держит предмет */
  const arm = (sd, pose) => {
    const a = new T.Group(); a.position.set(0.185 * sd, 1.24, 0);
    a.add(at(part(new T.SphereGeometry(0.058, 16, 12), shirt), 0, 0, 0));
    const el = pose ? [0.05 * sd, -0.25, 0.03] : [0.055 * sd, -0.25, 0];
    const wr = pose ? [0.115 * sd, -0.43, 0.07] : [0.085 * sd, -0.49, 0.03];
    a.add(limb([0, 0, 0], el, 0.048, shirt)); a.add(limb(el, wr, 0.04, shirt));
    const cuff = at(part(new T.TorusGeometry(0.041, 0.008, 6, 20), toon(C.shirt)), ...wr); cuff.lookAt(new T.Vector3(...el)); a.add(cuff);
    const hand = at(part(new T.SphereGeometry(0.037, 16, 12), skin), wr[0] + 0.004 * sd, wr[1] - 0.04, wr[2] + 0.005); hand.scale.set(0.85, 1.1, 0.9); a.add(hand);
    a.userData.hand = hand; return a;
  };
  const rArm = arm(-1, true), lArm = arm(1, false); g.add(rArm, lArm);
  g.userData.rHand = rArm.userData.hand; g.userData.rArm = rArm;
  return g;
}

/* ---------- вещи ---------- */
const ITEMS = {
  'cl3-hat': { slot: 'headwear', name: 'Шляпа астролога', build() {
    const g = new T.Group(), m = toon(0x4b2a7a), gold = toon(C.gold);
    g.add(at(part(new T.CylinderGeometry(0.29, 0.3, 0.012, 48), m), 0, 0, 0));
    const cone = part(lathe([[0.155, 0], [0.15, 0.04], [0.12, 0.14], [0.08, 0.24], [0.04, 0.31], [0.0, 0.34]], 40), m); g.add(cone);
    g.add(at(part(new T.ConeGeometry(0.04, 0.16, 16), m), -0.06, 0.37, 0, 0, 0, 0.9));
    g.add(at(part(new T.TorusGeometry(0.152, 0.014, 8, 48), gold), 0, 0.03, 0, Math.PI / 2));
    g.add(at(star(0.045, gold), 0, 0.03, 0.15)); g.add(at(part(new T.OctahedronGeometry(0.018), toon(0x9b6be0)), 0, 0.03, 0.17));
    g.position.set(0, 1.625, -0.01); g.rotation.set(-0.08, 0, 0.06); g.scale.setScalar(1.12); return g; } },
  'cl3-cloak': { slot: 'cloak', name: 'Плащ «Ночное небо»', build() {
    const g = new T.Group(), tex = starTexture('#18214d', 160); tex.repeat.set(3, 2);
    const m = toon(0xffffff, { map: tex, side: T.DoubleSide }), gold = toon(C.gold, { side: T.DoubleSide });
    const prof = [[0.2, 1.3], [0.23, 1.2], [0.27, 0.9], [0.33, 0.5], [0.38, 0.12]];
    const cape = part(lathe(prof, 48, Math.PI * 0.32, Math.PI * 1.36), m); cape.scale.z = 0.75; g.add(cape);
    g.add(hem(0.38, 0.12, Math.PI * 0.32, Math.PI * 1.36, gold, 0.75));
    const collar = part(lathe([[0.17, 1.27], [0.2, 1.32], [0.21, 1.4]], 40, Math.PI * 0.42, Math.PI * 1.16), toon(0x22306a, { side: T.DoubleSide })); collar.scale.z = 0.8; g.add(collar);
    [-1, 1].forEach(sd => g.add(at(star(0.03, toon(C.gold)), 0.12 * sd, 1.29, 0.1)));
    g.add(at(part(new T.CylinderGeometry(0.004, 0.004, 0.24, 6), gold), 0, 1.29, 0.105, 0, 0, Math.PI / 2));
    return g; } },
  'cl3-coat': { slot: 'top', name: 'Пальто картографа', build() {
    const g = new T.Group(), m = toon(0x1f8a8a, { side: T.DoubleSide }), gold = toon(C.gold), vest = toon(0x5b3a26);
    const coat = part(lathe([[0.17, 1.27], [0.172, 1.2], [0.15, 1.0], [0.16, 0.86], [0.2, 0.6], [0.24, 0.4]], 48, Math.PI * 0.14, Math.PI * 1.72), m); coat.scale.z = 0.78; g.add(coat);
    const v = part(lathe([[0.168, 1.2], [0.156, 1.07], [0.142, 0.95], [0.162, 0.83]], 40, Math.PI * 1.83, Math.PI * 0.34), vest); v.scale.z = 0.76; g.add(v);
    for (let i = 0; i < 4; i++) g.add(at(part(new T.SphereGeometry(0.009, 8, 6), gold), 0.0, 1.16 - i * 0.07, 0.112));
    g.add(hem(0.24, 0.4, Math.PI * 0.14, Math.PI * 1.72, gold, 0.78));
    const scarf = part(new T.ConeGeometry(0.035, 0.12, 8), toon(0x1f8a8a)); at(scarf, 0, 1.24, 0.12, Math.PI, 0, 0); g.add(scarf);
    return g; } },
  'cl3-staff': { slot: 'weapon', name: 'Посох-полумесяц', build(body) {
    const g = new T.Group(), wood = toon(0x6b4630), gold = toon(C.gold);
    g.add(at(part(new T.CylinderGeometry(0.013, 0.016, 1.5, 12), wood), 0, 0.75, 0));
    g.add(at(part(new T.TorusGeometry(0.085, 0.016, 10, 32, Math.PI * 1.35), gold), 0, 1.6, 0, 0, 0, -Math.PI * 0.18));
    g.add(at(part(new T.OctahedronGeometry(0.03), toon(0x7fb3ff)), 0, 1.59, 0));
    for (let i = 0; i < 3; i++) g.add(at(part(new T.TorusGeometry(0.018, 0.005, 6, 16), gold), 0, 1.05 + i * 0.03, 0, Math.PI / 2));
    body.updateWorldMatrix(true, true); const h = body.worldToLocal(body.userData.rHand.getWorldPosition(new T.Vector3())); g.position.set(h.x, 0.02, h.z + 0.01); return g; } },
  'cl3-amulet': { slot: 'accessory', name: 'Аметистовый кулон', build() {
    const g = new T.Group(); const ch = part(new T.TorusGeometry(0.075, 0.003, 6, 40, Math.PI), toon(C.gold), false);
    at(ch, 0, 1.3, 0.035, 0.25, 0, Math.PI); g.add(ch);
    const gem = part(new T.OctahedronGeometry(0.024), toon(0x9b5de5)); at(gem, 0, 1.2, 0.118); gem.scale.y = 1.4; g.add(gem);
    return g; } },
  'cl3-owl': { slot: 'companion', name: 'Звёздная сова', build() {
    const g = new T.Group(), m = toon(0x3a3f78), belly = toon(0xe8dcc0), gold = toon(C.gold);
    const b = part(new T.SphereGeometry(0.07, 24, 16), m); b.scale.set(1, 1.1, 0.95); g.add(b);
    const bl = part(new T.SphereGeometry(0.05, 20, 12), belly); at(bl, 0, -0.012, 0.03); bl.scale.set(1, 1.15, 0.8); g.add(bl);
    [-1, 1].forEach(sd => {
      g.add(at(part(new T.SphereGeometry(0.024, 16, 12), toon(0xffffff)), 0.03 * sd, 0.035, 0.055));
      g.add(at(part(new T.SphereGeometry(0.013, 12, 10), toon(0xf2b632)), 0.03 * sd, 0.035, 0.074, 0, 0, 0));
      g.add(at(part(new T.ConeGeometry(0.018, 0.05, 8), m), 0.045 * sd, 0.085, 0, 0, 0, -0.35 * sd));
      const w = part(new T.SphereGeometry(0.04, 16, 10), m); at(w, 0.065 * sd, -0.01, -0.005, 0, 0, 0.3 * sd); w.scale.set(0.45, 1, 0.8); g.add(w);
    });
    g.add(at(part(new T.ConeGeometry(0.01, 0.025, 6), gold), 0, 0.012, 0.075, Math.PI / 2 + 0.6));
    g.add(at(star(0.02, gold), 0, 0.105, 0.0));
    g.position.set(0.34, 1.44, 0.04); g.userData.float = true; return g; } },
};
export const HERO3D_ITEMS = Object.keys(ITEMS).map(id => ({ id, slot: ITEMS[id].slot, name: ITEMS[id].name }));

/* ---------- сцена ---------- */
export function mountHero3d(box, opts) {
  opts = opts || {};
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const W = () => box.clientWidth || 300, H = () => box.clientHeight || 400;
  const r = new T.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: !!opts.keep });
  r.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); r.setSize(W(), H()); r.outputColorSpace = T.SRGBColorSpace;
  box.appendChild(r.domElement); r.domElement.style.touchAction = 'pan-y';
  const scene = new T.Scene(), cam = new T.PerspectiveCamera(26, W() / H(), 0.1, 20);
  cam.position.set(0, 1.0, 4.4); cam.lookAt(0, 0.95, 0);
  scene.add(new T.HemisphereLight(0xfff4e0, 0x6a6f9a, 1.4));
  const sun = new T.DirectionalLight(0xffffff, 1.9); sun.position.set(1.5, 2.5, 2.5); scene.add(sun);
  const rim = new T.DirectionalLight(0xbcc8ff, 0.8); rim.position.set(-2, 1.5, -2); scene.add(rim);
  const hero = new T.Group(); scene.add(hero);
  const body = buildBody(); hero.add(body);
  /* подставка: звёздный круг */
  const disc = new T.Mesh(new T.CircleGeometry(0.42, 48), new T.MeshBasicMaterial({ color: 0xd9b25a, transparent: true, opacity: 0.25 }));
  disc.rotation.x = -Math.PI / 2; disc.position.y = 0.002; hero.add(disc);
  const ring = new T.Mesh(new T.RingGeometry(0.4, 0.42, 64), new T.MeshBasicMaterial({ color: 0xd9b25a })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.004; hero.add(ring);
  let worn = {};
  function setItems(ids) {
    Object.values(worn).forEach(o => hero.remove(o)); worn = {};
    (ids || []).forEach(id => { const it = ITEMS[id]; if (!it) return; const o = it.build(body); o.userData.id = id; worn[it.slot] = o; hero.add(o); });
    r.render(scene, cam);
  }
  setItems(opts.items || []);
  /* вращение пальцем с инерцией */
  let rot = opts.angle || 0.35, vel = 0, drag = null, alive = true, t0 = performance.now();
  const el = r.domElement;
  el.addEventListener('pointerdown', e => { drag = { x: e.clientX, last: e.clientX }; vel = 0; el.setPointerCapture(e.pointerId); });
  el.addEventListener('pointermove', e => { if (!drag) return; const dx = e.clientX - drag.last; drag.last = e.clientX; rot += dx * 0.012; vel = dx * 0.012; });
  const up = () => { drag = null; }; el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  function frame(now) {
    if (!alive) return;
    if (!drag) { rot += vel; vel *= 0.94; if (Math.abs(vel) < 0.0004) vel = 0; }
    hero.rotation.y = rot;
    const t = (now - t0) / 1000;
    if (!reduce) {
      body.userData.torso.scale.y = 1 + Math.sin(t * 2) * 0.006;
      Object.values(worn).forEach(o => { if (o.userData.float) o.position.y = 1.44 + Math.sin(t * 1.6) * 0.02; });
    }
    r.render(scene, cam); requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  const ro = new ResizeObserver(() => { r.setSize(W(), H()); cam.aspect = W() / H(); cam.updateProjectionMatrix(); }); ro.observe(box);
  return {
    setItems, setAngle(a) { rot = a; vel = 0; r.render(scene, cam); },
    dispose() { alive = false; ro.disconnect(); r.dispose(); el.remove(); }
  };
}

window.__rqHero3d = { mountHero3d, HERO3D_ITEMS }; /* для hero.js (heroLoad3d) */
