/* «Небесный»: 3D-герой из VRoid Studio (VRM). Джессика собирает героя в VRoid: база — майка и легинсы,
   наряды — тот же персонаж в другой одежде, экспорт с выключенным Delete Transparent Meshes.
   Наряд берётся из своего файла: его одежда (материалы *_Tops_*, *_Bottoms_*, *_Shoes_*) пересаживается
   на базу по костям с теми же именами; своих костей наряда (юбка, рукава) у базы нет — они пришиваются
   к ближайшему общему родителю. Части базы того же слота прячутся (плюс hide из описания наряда).
   Подключается лениво: тегом type=module из hero.js (heroLoad3d); three — vendor/three, three-vrm — vendor/three/vrm.min.js (MIT). */
import * as T from '../vendor/three/three.module.min.js';
import { GLTFLoader, VRMLoaderPlugin, VRMUtils } from '../vendor/three/vrm.min.js';

const SLOT = /_(Tops|Bottoms|Shoes|Accessory)_/;
const mats = o => [].concat(o.material).map(m => (m && m.name) || '').join('|');
const slotOf = o => { const m = SLOT.exec(mats(o)); return m && m[1]; };

function loadVrm(url) {
  const gl = new GLTFLoader(); gl.register(p => new VRMLoaderPlugin(p));
  return gl.loadAsync(url).then(g => {
    const vrm = g.userData.vrm; if (!vrm) throw new Error('not a VRM: ' + url);
    VRMUtils.rotateVRM0(vrm);
    /* без первого update() материалы MToon файла-донора рисуются чёрными */
    vrm.update(0);
    return vrm;
  });
}

/* одежда наряда → сетки на скелете базы */
function transplant(base, src, bones) {
  const out = [], slots = new Set();
  src.scene.traverse(o => { if (o.isSkinnedMesh && slotOf(o)) { slots.add(slotOf(o)); out.push(o); } });
  const graft = b => {
    if (bones[b.name]) return bones[b.name];
    const par = graft(b.parent), c = new T.Bone(); c.name = b.name;
    c.position.copy(b.position); c.quaternion.copy(b.quaternion); c.scale.copy(b.scale);
    par.add(c); bones[b.name] = c; return c;
  };
  return {
    slots, meshes: out.map(m => {
      const sk = m.skeleton; sk.bones.forEach(graft);
      const mesh = new T.SkinnedMesh(m.geometry, m.material); mesh.name = 'wear:' + m.name; mesh.frustumCulled = false;
      base.scene.add(mesh); mesh.bind(new T.Skeleton(sk.bones.map(b => bones[b.name]), sk.boneInverses), m.bindMatrix);
      return mesh;
    })
  };
}

/* opts: base — url базы; outfits — [{id, file, hide:['Bottoms']}]; wear — id наряда или ''; angle, keep */
export async function mountHeroVrm(box, opts) {
  opts = opts || {};
  const list = opts.outfits || [];
  const base = await loadVrm(opts.base);
  const donors = {};
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const W = () => box.clientWidth || 300, H = () => box.clientHeight || 400;
  const r = new T.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: !!opts.keep });
  r.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); r.setSize(W(), H()); r.outputColorSpace = T.SRGBColorSpace;
  box.appendChild(r.domElement); r.domElement.style.touchAction = 'pan-y';
  const scene = new T.Scene(), cam = new T.PerspectiveCamera(24, W() / H(), 0.1, 20);
  cam.position.set(0, 0.85, 4.4); cam.lookAt(0, 0.8, 0);
  scene.add(new T.AmbientLight(0xffffff, 1.2));
  const sun = new T.DirectionalLight(0xffffff, Math.PI * 0.9); sun.position.set(1, 2, 2); scene.add(sun);
  scene.add(base.scene);
  const hb = n => base.humanoid.getNormalizedBoneNode(n);
  hb('leftUpperArm').rotation.z = -1.2; hb('rightUpperArm').rotation.z = 1.2;
  const bones = {}; base.scene.traverse(o => { if (o.isBone) bones[o.name] = o; });
  const own = []; base.scene.traverse(o => { if (o.isMesh) own.push(o); });
  let worn = null, wearId = '', alive = true;

  async function setWear(id) {
    wearId = id || '';
    const it = list.find(x => x.id === wearId);
    if (it && !donors[it.id]) donors[it.id] = await loadVrm(it.file);
    if (!alive || wearId !== (id || '')) return;
    if (worn) worn.meshes.forEach(m => base.scene.remove(m));
    worn = it ? transplant(base, donors[it.id], bones) : null;
    const hide = new Set(worn ? [...worn.slots, ...(it.hide || [])] : []);
    own.forEach(o => { const s = slotOf(o); o.visible = !s || !hide.has(s); });
  }
  await setWear(opts.wear);

  let rot = opts.angle || 0.35, vel = 0, drag = null, last = performance.now();
  const el = r.domElement;
  el.addEventListener('pointerdown', e => { drag = { last: e.clientX }; vel = 0; el.setPointerCapture(e.pointerId); });
  el.addEventListener('pointermove', e => { if (!drag) return; const dx = e.clientX - drag.last; drag.last = e.clientX; rot += dx * 0.012; vel = dx * 0.012; });
  const up = () => { drag = null; }; el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  function frame(now) {
    if (!alive) return;
    const dt = Math.min((now - last) / 1000, 0.05); last = now;
    if (!drag) { rot += vel; vel *= 0.94; if (Math.abs(vel) < 0.0004) vel = 0; }
    base.scene.rotation.y = rot;
    base.update(reduce ? 0 : dt);
    r.render(scene, cam); requestAnimationFrame(frame);
  }
  base.update(0); r.render(scene, cam);
  requestAnimationFrame(frame);
  const ro = new ResizeObserver(() => { r.setSize(W(), H()); cam.aspect = W() / H(); cam.updateProjectionMatrix(); }); ro.observe(box);
  return {
    setWear,
    setAngle(a) { rot = a; vel = 0; base.scene.rotation.y = a; base.update(0); r.render(scene, cam); },
    dispose() {
      alive = false; ro.disconnect();
      VRMUtils.deepDispose(base.scene); Object.values(donors).forEach(v => VRMUtils.deepDispose(v.scene));
      r.dispose(); el.remove();
    }
  };
}

window.__rqHeroVrm = { mountHeroVrm }; /* для hero.js (heroLoad3d) */
