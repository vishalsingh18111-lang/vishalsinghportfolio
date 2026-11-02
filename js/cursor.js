/* =========================================================================
   Cursor — Vishal Singh portfolio
   Research-based "dot + ring" pointer:
   • Dot  = the exact click point. It has zero lag, so aiming stays precise.
   • Ring = a glass ring in the icon palette. It follows with a short, smooth
     delay (~50 ms) and stretches a little in the direction you move, like water.
   • Over links and buttons the ring grows and the dot melts into it.
   • Over graphics, certificates and videos it shows a short label (View / Play).
   • On red buttons it turns white so it never disappears.
   • Text fields keep the normal text cursor. Touch screens and
     "reduce motion" users keep their system cursor.
   ========================================================================= */
(function () {
  'use strict';
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var root = document.documentElement;
  var el = document.createElement('div');
  el.className = 'cur';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = '<div class="cur__ring"></div><div class="cur__label"><span></span></div><div class="cur__dot"></div>';
  document.body.appendChild(el);
  var ring = el.querySelector('.cur__ring');
  var dot = el.querySelector('.cur__dot');
  var label = el.querySelector('.cur__label');
  var labelText = label.querySelector('span');
  root.classList.add('has-cursor');

  var mx = -100, my = -100, rx = -100, ry = -100, vx = 0, vy = 0;
  var scale = 1, scaleTarget = 1, press = 1, pressTarget = 1;
  var seen = false, running = false, last = 0, state = '';

  var LINK = 'a, button, label, summary, [role="button"], .gfx-card, .cert-card__btn';
  var ON_RED = '.btn--primary, .footer__social a';
  var FIELD = 'input, textarea, select, [contenteditable="true"]';

  function setState(target) {
    var s = 'default', text = '';
    if (target && target.closest) {
      if (target.closest(FIELD)) s = 'field';
      else if (target.closest('video')) { s = 'label'; text = target.closest('video').paused ? 'Play' : ''; if (!text) s = 'media'; }
      else if (target.closest('.gfx-card, .cert-card__btn, [href="#resume-view"]')) { s = 'label'; text = 'View'; }
      else if (target.closest(ON_RED)) s = 'link on-red';
      else if (target.closest(LINK)) s = 'link';
    }
    var key = s + text;
    if (key === state) return;
    state = key;
    el.className = 'cur is-' + s.split(' ').join(' is-') + (seen ? ' is-visible' : '');
    labelText.textContent = text;
    scaleTarget = s === 'link' || s === 'link on-red' ? 1.7 : s === 'label' ? 2.2 : s === 'media' ? 0.6 : 1;
  }

  window.addEventListener('pointermove', function (e) {
    if (e.pointerType !== 'mouse') return;
    mx = e.clientX; my = e.clientY;
    if (!seen) { seen = true; rx = mx; ry = my; }
    // the dot moves on the same frame as the pointer (no lag)
    dot.style.transform = 'translate3d(' + mx + 'px,' + my + 'px,0)';
    setState(e.target);
    el.classList.add('is-visible');
    wake();
  }, { passive: true });

  document.addEventListener('mouseout', function (e) { if (!e.relatedTarget) root.classList.add('cur-out'); });
  document.addEventListener('mouseover', function () { root.classList.remove('cur-out'); });
  window.addEventListener('pointerdown', function (e) { if (e.pointerType === 'mouse') { pressTarget = 0.78; wake(); } });
  window.addEventListener('pointerup', function () { pressTarget = 1; wake(); });
  document.addEventListener('play', function (e) { setState(e.target); }, true);
  document.addEventListener('pause', function (e) { state = ''; setState(e.target); }, true);
  window.addEventListener('scroll', function () {
    var t = document.elementFromPoint(mx, my); if (t) setState(t);
  }, { passive: true });

  function frame(now) {
    var dt = Math.min(0.05, (now - last) / 1000 || 1 / 60); last = now;
    var k = 1 - Math.exp(-dt * 22);                 // ~50 ms smoothing, frame-rate independent
    var nx = rx + (mx - rx) * k, ny = ry + (my - ry) * k;
    vx = (nx - rx) / dt; vy = (ny - ry) / dt; rx = nx; ry = ny;
    scale += (scaleTarget - scale) * (1 - Math.exp(-dt * 16));
    press += (pressTarget - press) * (1 - Math.exp(-dt * 26));

    // water-like stretch along the motion, capped so the ring never looks broken
    var speed = Math.hypot(vx, vy);
    var st = Math.min(0.28, speed / 4200);
    var ang = Math.atan2(vy, vx) * 180 / Math.PI;
    var s = scale * press;
    ring.style.transform = 'translate3d(' + rx + 'px,' + ry + 'px,0) rotate(' + ang + 'deg) scale(' + (s * (1 + st)) + ',' + (s * (1 - st * 0.55)) + ')';
    label.style.transform = 'translate3d(' + rx + 'px,' + ry + 'px,0)';

    if (Math.abs(mx - rx) > 0.1 || Math.abs(my - ry) > 0.1 || Math.abs(scaleTarget - scale) > 0.002 || Math.abs(pressTarget - press) > 0.002) {
      requestAnimationFrame(frame);
    } else { running = false; }
  }
  function wake() { if (running) return; running = true; last = performance.now(); requestAnimationFrame(frame); }
})();
