/* Desktop quill: native cursor is hidden only while a rendered quill is visible. */
(function () {
  'use strict';
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const forced = matchMedia('(forced-colors: active)');
  const key = (window.RQ_NS || 'rq') + '_quill';
  const root = document.documentElement;
  let enabled = true;
  try { enabled = localStorage.getItem(key) !== 'off'; } catch (_) {}
  const style = document.createElement('style');
  style.textContent = `
    #rqQuill{position:fixed;left:0;top:0;width:34px;height:38px;pointer-events:none;z-index:2147483646;display:none;filter:drop-shadow(0 1px 1px #071b20)}
    #rqQuill svg{overflow:visible;width:100%;height:100%}
    #rqQuill.rq-hot{filter:drop-shadow(0 0 5px #5ce5dc)}
    @media (hover:hover) and (pointer:fine) {
      html.rq-quill-on,html.rq-quill-on *{cursor:none!important}
    }
    @media (prefers-reduced-motion:no-preference) {
      #rqQuill.rq-hot svg{animation:rqQuillGlow 1.8s ease-in-out infinite}
    }
    @keyframes rqQuillGlow{50%{filter:brightness(1.35)}}
  `;
  document.head.appendChild(style);
  const quill = document.createElement('div');
  quill.id = 'rqQuill';
  quill.setAttribute('aria-hidden', 'true');
  quill.innerHTML = '<svg viewBox="0 0 34 38" fill="none"><path d="M2 2C7 3 29 7 30 20C30 29 22 32 16 27C10 22 8 10 2 2Z" fill="#6cdbcd" stroke="#123e47" stroke-width="1.5"/><path d="M2 2L26 33M10 11L19 12M15 17L25 18M20 24L21 15" stroke="#fff1c7" stroke-width="1.5" stroke-linecap="round"/><path d="M2 2L8 9" stroke="#fff" stroke-width="2"/></svg>';
  document.body.appendChild(quill);
  const button = document.getElementById('rqQuillToggle');
  function hide() {
    root.classList.remove('rq-quill-on');
    quill.style.display = 'none';
  }
  function sync() {
    hide();
    if (button) {
      button.setAttribute('aria-checked', String(enabled));
      button.textContent = enabled ? 'Вкл' : 'Выкл';
    }
  }
  if (button) button.addEventListener('click', function () {
    enabled = !enabled;
    try { localStorage.setItem(key, enabled ? 'on' : 'off'); } catch (_) {}
    sync();
  });
  function move(e) {
    const target = e.target instanceof Element ? e.target : null;
    // Preserve all reader, editing and special native cursors.
    hide();
    if (!enabled || !fine.matches || forced.matches || e.pointerType !== 'mouse' || !target) return;
    if (target.closest('#reader,input,textarea,select,[contenteditable]:not([contenteditable="false"]),iframe,dialog,:disabled,[aria-disabled="true"]')) return;
    const cursor = getComputedStyle(target).cursor;
    if (!['auto','default','pointer','none'].includes(cursor)) return;
    quill.style.transform = 'translate(' + (e.clientX - 2) + 'px,' + (e.clientY - 2) + 'px)';
    quill.classList.toggle('rq-hot', !!target.closest('button,a[href],[role="button"],[role="switch"]'));
    quill.style.display = 'block';
    root.classList.add('rq-quill-on');
  }
  document.addEventListener('pointermove', move, {passive:true});
  document.addEventListener('pointerdown', function(e) {
    move(e);
    if (e.button !== 0 || reduced.matches || quill.style.display === 'none' || !quill.animate) return;
    quill.getAnimations().forEach(a => a.cancel());
    quill.animate([{filter:'brightness(1)'},{filter:'brightness(1.9) drop-shadow(0 0 7px #ffd979)'},{filter:'brightness(1)'}], {duration:260});
  }, {passive:true});
  document.addEventListener('pointerout', e => { if (!e.relatedTarget) hide(); });
  document.addEventListener('pointercancel', hide);
  document.addEventListener('keydown', hide);
  document.addEventListener('scroll', hide, true);
  document.addEventListener('visibilitychange', hide);
  window.addEventListener('blur', hide);
  fine.addEventListener('change', sync);
  forced.addEventListener('change', sync);
  reduced.addEventListener('change', () => { quill.getAnimations().forEach(a => a.cancel()); hide(); });
  window.addEventListener('storage', e => { if (e.key === key || e.key === null) { try { enabled = localStorage.getItem(key) !== 'off'; } catch (_) {} sync(); } });
  sync();
})();
