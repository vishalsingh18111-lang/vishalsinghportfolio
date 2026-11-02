/* =========================================================================
   Click droplets — Vishal Singh portfolio  (the pointer itself is js/cursor.js)
   - Every click lets a droplet fall on the page:
       impact  → spreads, then wobbles in surface-tension modes (n = 2, 3)
       splash  → tiny satellite drops are thrown out and slide to a stop
       merge   → drops that touch coalesce (volume is conserved)
       dry     → pinned phase (gets flatter, contact line fixed),
                 then the contact line recedes (d²-law), gone after ~3 s
   ========================================================================= */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (reduce) return;

  var root = document.documentElement;
  var canvas = document.createElement('canvas');
  canvas.className = 'liquid-cursor';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.appendChild(canvas);
  var ctx = canvas.getContext('2d');
  var W = 0, H = 0, DPR = 1;

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    wake();
  }
  window.addEventListener('resize', resize);

  /* ---------- constants (tuned by eye, but physically shaped) ---------- */
  var HEAD_R = 7.5;          // cursor bead radius (px)
  var HOVER_R = 19;          // bead radius over links/buttons (becomes a lens)
  var NODES = 9;             // tail masses
  var K = 520, C = 26;       // tail spring stiffness / damping  (underdamped → wobble)
  var LIFE = 3.0;            // seconds until a normal droplet has fully evaporated
  var MAX_DROPS = 60;

  /* ------------------------------ state -------------------------------- */
  var mouse = { x: -100, y: -100, vx: 0, vy: 0, seen: false, inside: true };
  var nodes = [];
  for (var i = 0; i < NODES; i++) nodes.push({ x: -100, y: -100, vx: 0, vy: 0 });
  var headR = HEAD_R, headRv = 0, headTarget = HEAD_R;   // spring on the bead size
  var hover = 0, hoverTarget = 0;                         // 0 = bead, 1 = lens
  var hidden = 0, hiddenTarget = 0;                       // fade out over text fields
  var drops = [];                                         // droplets on the page
  var vapour = [];                                        // faint vapour puffs
  var running = false, last = 0;


  /* ------------------------------ input -------------------------------- */
  var lastMove = 0;
  window.addEventListener('pointermove', function (e) {
    if (e.pointerType !== 'mouse') return;
    var now = performance.now(), dt = Math.max(8, now - lastMove) / 1000;
    mouse.vx = (e.clientX - mouse.x) / dt; mouse.vy = (e.clientY - mouse.y) / dt;
    lastMove = now;
    mouse.x = e.clientX; mouse.y = e.clientY; mouse.inside = true;
    if (!mouse.seen) {
      mouse.seen = true;
      nodes.forEach(function (n) { n.x = mouse.x; n.y = mouse.y; });
    }
    var t = e.target;
    var field = t.closest && t.closest('input, textarea, select, [contenteditable="true"]');
    var link = t.closest && t.closest('a, button, label, summary, [role="button"], .project-card__thumb, .gallery-item, video');
    hiddenTarget = field ? 1 : 0;
    hoverTarget = (!field && link) ? 1 : 0;
    headTarget = hoverTarget ? HOVER_R : HEAD_R;
    wake();
  }, { passive: true });

  document.addEventListener('mouseout', function (e) {
    if (!e.relatedTarget) { mouse.inside = false; wake(); }
  });
  document.addEventListener('mouseover', function () { mouse.inside = true; wake(); });

  window.addEventListener('pointerdown', function (e) {
    if (e.button !== 0) return;
    if (e.target.closest && e.target.closest('input, textarea, select')) return;
    if (e.pointerType === 'mouse') { headRv -= 260; }        // the bead squeezes as it lets go
    spawnDrop(e.clientX, e.clientY + window.scrollY, 1);
    wake();
  }, { passive: true });

  window.addEventListener('scroll', wake, { passive: true });

  /* ---------------------------- droplets ------------------------------- */
  function rand(a, b) { return a + Math.random() * (b - a); }

  function makeDrop(x, y, r, satellite) {
    // d²-law: drying time ∝ r²  (a drop of radius 8px lasts LIFE seconds)
    var life = satellite ? Math.max(0.55, LIFE * Math.pow(r / 8, 2) * 1.6) : LIFE * Math.pow(r / 8, 2);
    life = Math.min(Math.max(life, 0.55), LIFE * 1.6);
    return {
      x: x, y: y, vx: 0, vy: 0,
      r0: r, r: r, h: 1,            // contact radius, relative height (contact angle)
      age: 0, life: life,
      spread: 0, spreadV: satellite ? 0 : 9,     // radial impact oscillation
      a2: satellite ? 0 : rand(0.10, 0.16), p2: rand(0, Math.PI),   // shape mode n=2
      a3: satellite ? 0 : rand(0.05, 0.09), p3: rand(0, Math.PI * 2), // shape mode n=3
      rot: rand(0, Math.PI * 2),
      satellite: !!satellite, puffed: 0
    };
  }

  function spawnDrop(x, y, scale) {
    var speed = Math.min(1, Math.hypot(mouse.vx, mouse.vy) / 2500);
    var r = rand(7, 9) * scale;
    var d = makeDrop(x, y, r, false);
    drops.push(d);
    // splash: satellites thrown out, slightly biased in the direction of motion
    var n = 2 + Math.floor(Math.random() * 3 + speed * 3);
    var bias = Math.atan2(mouse.vy, mouse.vx);
    for (var i = 0; i < n; i++) {
      var ang = speed > 0.15 && Math.random() < 0.6 ? bias + rand(-0.7, 0.7) : rand(0, Math.PI * 2);
      var v = rand(160, 320) * (1 + speed);
      var s = makeDrop(x + Math.cos(ang) * r * 0.6, y + Math.sin(ang) * r * 0.6, rand(1.2, 2.6), true);
      s.vx = Math.cos(ang) * v; s.vy = Math.sin(ang) * v;
      drops.push(s);
    }
    while (drops.length > MAX_DROPS) drops.shift();
  }

  function stepDrops(dt) {
    for (var i = drops.length - 1; i >= 0; i--) {
      var d = drops[i];
      d.age += dt;

      // sliding on the surface: strong friction (viscous drag + contact-line pinning)
      if (d.vx || d.vy) {
        var f = Math.exp(-dt * 14);
        d.x += d.vx * dt; d.y += d.vy * dt;
        d.vx *= f; d.vy *= f;
        if (Math.hypot(d.vx, d.vy) < 4) { d.vx = d.vy = 0; }
      }

      // impact spread: damped spring  (ω ≈ 2π·5 Hz, ζ ≈ 0.25)
      var w = 31, z = 0.25;
      d.spreadV += (-w * w * d.spread - 2 * z * w * d.spreadV) * dt;
      d.spread += d.spreadV * dt;

      // surface-tension modes decay; Rayleigh: ω3/ω2 = √(30/8) ≈ 1.94
      var decay = Math.exp(-dt * 3.2);
      d.a2 *= decay; d.a3 *= Math.exp(-dt * 4.4);

      // evaporation
      var t = d.age / d.life;
      var pin = 0.55;                                 // first 55%: contact line pinned
      if (t < pin) {
        d.r = d.r0;
        d.h = 1 - 0.55 * (t / pin);                   // drop flattens, contact angle falls
      } else {
        var u = Math.min(1, (t - pin) / (1 - pin));
        d.r = d.r0 * Math.sqrt(Math.max(0, 1 - u));   // receding: r² shrinks linearly
        d.h = 0.45 * (1 - 0.6 * u);
        if (!d.satellite && d.puffed < 3 && Math.random() < dt * 5) { puff(d); d.puffed++; }
      }
      if (t >= 1) drops.splice(i, 1);
    }

    // coalescence: overlapping drops merge, volume (≈ r³) is conserved
    for (var a = 0; a < drops.length; a++) {
      for (var b = a + 1; b < drops.length; b++) {
        var A = drops[a], B = drops[b];
        if (A.vx || A.vy || B.vx || B.vy) continue;      // still sliding from the splash
        var dist = Math.hypot(A.x - B.x, A.y - B.y);
        if (dist < (A.r + B.r) * 0.82) {
          var va = Math.pow(A.r, 3) * A.h, vb = Math.pow(B.r, 3) * B.h, vt = va + vb;
          var big = va >= vb ? A : B, small = big === A ? B : A;
          big.x = (A.x * va + B.x * vb) / vt; big.y = (A.y * va + B.y * vb) / vt;
          var r = Math.cbrt(Math.pow(A.r, 3) + Math.pow(B.r, 3));
          big.r0 = big.r = r; big.h = Math.max(A.h, B.h);
          big.vx = (A.vx * va + B.vx * vb) / vt; big.vy = (A.vy * va + B.vy * vb) / vt;
          big.age = 0; big.life = Math.min(LIFE * Math.pow(r / 8, 2), LIFE * 1.6);
          big.satellite = big.satellite && small.satellite;
          big.a2 += 0.08; big.a3 += 0.04; big.spreadV += 4;   // the merge makes it wobble
          drops.splice(drops.indexOf(small), 1);
          b--;
        }
      }
    }
  }

  function puff(d) {
    vapour.push({ x: d.x + rand(-d.r, d.r) * 0.6, y: d.y - d.r * 0.3, r: rand(3, 6), age: 0, life: rand(0.7, 1.1), vx: rand(-8, 8) });
  }
  function stepVapour(dt) {
    for (var i = vapour.length - 1; i >= 0; i--) {
      var p = vapour[i];
      p.age += dt; p.y -= 22 * dt; p.x += p.vx * dt; p.r += 9 * dt;
      if (p.age > p.life) vapour.splice(i, 1);
    }
  }

  /* --------------------------- cursor physics -------------------------- */
  function stepCursor(dt) {
    // head sticks to the pointer (it is the hotspot), the tail follows on springs
    nodes[0].x = mouse.x; nodes[0].y = mouse.y;
    for (var i = 1; i < NODES; i++) {
      var p = nodes[i - 1], n = nodes[i];
      var k = K * (1 - i / (NODES * 1.6)), c = C;
      n.vx += ((p.x - n.x) * k - n.vx * c) * dt;
      n.vy += ((p.y - n.y) * k - n.vy * c) * dt;
      n.x += n.vx * dt; n.y += n.vy * dt;
      // cohesion: surface tension won't let the liquid neck stretch past a limit
      var maxLen = Math.max(1.2, headR * 0.85 * (1 - i / NODES) * (1 - hover * 0.8));
      var dx = n.x - p.x, dy = n.y - p.y, dl = Math.hypot(dx, dy);
      if (dl > maxLen) {
        var s = maxLen / dl;
        n.x = p.x + dx * s; n.y = p.y + dy * s;
        n.vx *= 0.85; n.vy *= 0.85;
      }
    }
    // bead size: underdamped spring → squash & bounce on click / hover
    headRv += ((headTarget - headR) * 900 - headRv * 28) * dt;
    headR += headRv * dt;
    if (headR < 3) { headR = 3; headRv = Math.abs(headRv) * 0.3; }
    hover += (hoverTarget - hover) * Math.min(1, dt * 12);
    var hT = (!mouse.inside || !mouse.seen) ? 1 : hiddenTarget;
    hidden += (hT - hidden) * Math.min(1, dt * 14);
    mouse.vx *= Math.exp(-dt * 10); mouse.vy *= Math.exp(-dt * 10);
  }

  function cursorSettled() {
    var tail = nodes[NODES - 1];
    return Math.abs(tail.x - mouse.x) < 0.3 && Math.abs(tail.y - mouse.y) < 0.3 &&
      Math.abs(headTarget - headR) < 0.05 && Math.abs(headRv) < 0.5 &&
      Math.abs(hoverTarget - hover) < 0.01 && Math.abs((mouse.inside ? hiddenTarget : 1) - hidden) < 0.01;
  }

  /* ------------------------------ drawing ------------------------------ */
  // union of circles + their outer tangents, all wound the same way (nonzero fill → no holes)
  function addCircle(path, x, y, r) { path.moveTo(x + r, y); path.arc(x, y, r, 0, Math.PI * 2, false); }
  function addBridge(path, x1, y1, r1, x2, y2, r2) {
    var dx = x2 - x1, dy = y2 - y1, d = Math.hypot(dx, dy);
    if (d <= Math.abs(r1 - r2) + 0.01) return;
    var th = Math.atan2(dy, dx), al = Math.acos((r1 - r2) / d);
    var pts = [
      [x1 + r1 * Math.cos(th + al), y1 + r1 * Math.sin(th + al)],
      [x2 + r2 * Math.cos(th + al), y2 + r2 * Math.sin(th + al)],
      [x2 + r2 * Math.cos(th - al), y2 + r2 * Math.sin(th - al)],
      [x1 + r1 * Math.cos(th - al), y1 + r1 * Math.sin(th - al)]
    ];
    var area = 0;
    for (var i = 0; i < 4; i++) { var a = pts[i], b = pts[(i + 1) % 4]; area += a[0] * b[1] - b[0] * a[1]; }
    if (area < 0) pts.reverse();                 // match arc() winding (clockwise on screen)
    path.moveTo(pts[0][0], pts[0][1]);
    for (var j = 1; j < 4; j++) path.lineTo(pts[j][0], pts[j][1]);
    path.closePath();
  }

  function drawCursor() {
    var alpha = 1 - hidden;
    if (alpha < 0.02) return;
    var R = headR, hx = nodes[0].x, hy = nodes[0].y;

    // tail radii taper; the tail thins out more while hovering (lens mode)
    var radii = [];
    for (var i = 0; i < NODES; i++) radii.push(R * Math.pow(1 - i / NODES, 0.9) * (1 - hover * 0.55 * (i > 0)));

    var body = new Path2D();
    for (var k = 0; k < NODES; k++) {
      addCircle(body, nodes[k].x, nodes[k].y, Math.max(0.5, radii[k]));
      if (k) addBridge(body, nodes[k - 1].x, nodes[k - 1].y, radii[k - 1], nodes[k].x, nodes[k].y, radii[k]);
    }

    ctx.save();
    ctx.globalAlpha = alpha;

    // soft red glow under the drop (like the icons' shadow)
    ctx.shadowColor = 'rgba(225,29,46,' + (0.45 - hover * 0.25) + ')';
    ctx.shadowBlur = 14; ctx.shadowOffsetY = 4;

    // glass body: white top-left → pink → red bottom-right
    var g = ctx.createRadialGradient(hx - R * 0.45, hy - R * 0.5, R * 0.1, hx + R * 0.2, hy + R * 0.3, R * 2.4);
    var a1 = 0.95 - hover * 0.8, a2 = 0.92 - hover * 0.72, a3 = 0.98 - hover * 0.6;
    g.addColorStop(0, 'rgba(255,236,238,' + a1 + ')');
    g.addColorStop(0.35, 'rgba(255,128,142,' + a2 + ')');
    g.addColorStop(0.75, 'rgba(232,30,50,' + a3 + ')');
    g.addColorStop(1, 'rgba(176,14,30,' + a3 + ')');
    ctx.fillStyle = g;
    ctx.fill(body, 'nonzero');
    ctx.shadowColor = 'transparent';

    // lens rim when hovering something clickable
    if (hover > 0.02) {
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = 'rgba(225,29,46,' + (0.85 * hover) + ')';
      ctx.beginPath(); ctx.arc(hx, hy, R, 0, Math.PI * 2); ctx.stroke();
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.9 * hover) + ')';
      ctx.beginPath(); ctx.arc(hx, hy, R + 1.4, 0, Math.PI * 2); ctx.stroke();
    }

    // light focused through the drop: bright crescent on the side away from the light
    ctx.globalCompositeOperation = 'lighter';
    var cg = ctx.createRadialGradient(hx + R * 0.35, hy + R * 0.42, 0, hx + R * 0.35, hy + R * 0.42, R * 0.6);
    cg.addColorStop(0, 'rgba(255,190,198,' + (0.55 - hover * 0.4) + ')');
    cg.addColorStop(1, 'rgba(255,190,198,0)');
    ctx.fillStyle = cg;
    ctx.beginPath(); ctx.arc(hx + R * 0.35, hy + R * 0.42, R * 0.6, 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';

    // specular highlight (light from top-left, same as the UI)
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.beginPath();
    ctx.ellipse(hx - R * 0.36, hy - R * 0.4, R * 0.3, R * 0.17, -Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function dropPath(d, sy) {
    var p = new Path2D();
    var steps = 40, R = d.r * (1 + d.spread * 0.08);
    for (var i = 0; i <= steps; i++) {
      var th = (i / steps) * Math.PI * 2;
      var rr = R * (1 + d.a2 * Math.cos(2 * (th - d.p2) + d.age * 2 * Math.PI * 6.5)
                      + d.a3 * Math.cos(3 * (th - d.p3) + d.age * 2 * Math.PI * 12.6));
      var x = d.x + Math.cos(th) * rr, y = d.y - sy + Math.sin(th) * rr;
      if (i) p.lineTo(x, y); else p.moveTo(x, y);
    }
    p.closePath();
    return p;
  }

  function drawDrops() {
    var sy = window.scrollY;
    for (var i = 0; i < drops.length; i++) {
      var d = drops[i];
      var y = d.y - sy;
      if (y < -40 || y > H + 40) continue;
      var R = d.r * (1 + d.spread * 0.08);
      if (R < 0.25) continue;
      var h = d.h;                                    // 1 = round bead, →0 = thin film
      var t = d.age / d.life;
      var fade = t > 0.9 ? 1 - (t - 0.9) / 0.1 : 1;   // last molecules go quickly
      var path = dropPath(d, sy);

      ctx.save();
      // contact shadow + caustic (the drop is a lens: dark rim, bright focused light)
      ctx.globalAlpha = fade;
      var sg = ctx.createRadialGradient(d.x + R * 0.25, y + R * 0.35, R * 0.2, d.x + R * 0.25, y + R * 0.35, R * 1.35);
      sg.addColorStop(0, 'rgba(255,255,255,' + (0.0) + ')');
      sg.addColorStop(0.55, 'rgba(225,29,46,' + (0.10 * h) + ')');
      sg.addColorStop(1, 'rgba(225,29,46,0)');
      ctx.fillStyle = sg;
      ctx.beginPath(); ctx.arc(d.x + R * 0.25, y + R * 0.35, R * 1.35, 0, Math.PI * 2); ctx.fill();

      // body: mostly transparent centre, refracted red at the rim
      var g = ctx.createRadialGradient(d.x - R * 0.2, y - R * 0.25, R * 0.05, d.x, y, R);
      g.addColorStop(0, 'rgba(255,240,242,' + (0.18 + 0.12 * h) + ')');
      g.addColorStop(0.6, 'rgba(255,120,135,' + (0.22 + 0.22 * h) + ')');
      g.addColorStop(0.88, 'rgba(225,29,46,' + (0.35 + 0.4 * h) + ')');
      g.addColorStop(1, 'rgba(160,12,26,' + (0.45 + 0.45 * h) + ')');
      ctx.fillStyle = g;
      ctx.fill(path);

      // thin edge where the contact line meets the surface
      ctx.lineWidth = Math.max(0.5, R * 0.06);
      ctx.strokeStyle = 'rgba(150,10,24,' + (0.25 + 0.3 * h) + ')';
      ctx.stroke(path);

      // focused light inside the drop (opposite the light source)
      if (R > 1.6) {
        ctx.globalCompositeOperation = 'lighter';
        var cx = d.x + R * 0.32, cy = y + R * 0.38;
        var cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.55);
        cg.addColorStop(0, 'rgba(255,220,224,' + (0.55 * h) + ')');
        cg.addColorStop(1, 'rgba(255,220,224,0)');
        ctx.fillStyle = cg;
        ctx.beginPath(); ctx.arc(cx, cy, R * 0.55, 0, Math.PI * 2); ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
      }

      // specular highlight: shrinks as the drop flattens (lower contact angle)
      var sx = d.x - R * 0.36, syy = y - R * 0.38;
      ctx.fillStyle = 'rgba(255,255,255,' + (0.35 + 0.6 * h) + ')';
      ctx.beginPath();
      ctx.ellipse(sx, syy, Math.max(0.4, R * 0.3 * (0.4 + 0.6 * h)), Math.max(0.3, R * 0.16 * (0.4 + 0.6 * h)), -Math.PI / 4, 0, Math.PI * 2);
      ctx.fill();
      if (!d.satellite && R > 4) {
        ctx.fillStyle = 'rgba(255,255,255,' + (0.5 * h) + ')';
        ctx.beginPath(); ctx.arc(d.x + R * 0.12, y - R * 0.55, R * 0.07, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }

    // vapour
    for (var j = 0; j < vapour.length; j++) {
      var p = vapour[j], k = p.age / p.life, py = p.y - sy;
      var vg = ctx.createRadialGradient(p.x, py, 0, p.x, py, p.r);
      var a = 0.14 * Math.sin(Math.PI * k);
      vg.addColorStop(0, 'rgba(255,170,180,' + a + ')');
      vg.addColorStop(1, 'rgba(255,170,180,0)');
      ctx.fillStyle = vg;
      ctx.beginPath(); ctx.arc(p.x, py, p.r, 0, Math.PI * 2); ctx.fill();
    }
  }

  /* ------------------------------- loop -------------------------------- */
  function frame(now) {
    var dt = Math.min(1 / 30, (now - last) / 1000 || 1 / 60);
    last = now;
    // sub-steps keep the springs stable at any frame rate
    var sub = 3;
    stepDrops(dt); stepVapour(dt);

    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    drawDrops();

    if (drops.length || vapour.length) {
      requestAnimationFrame(frame);
    } else {
      running = false;
      ctx.clearRect(0, 0, W, H);
    }
  }
  function wake() {
    if (running) return;
    running = true; last = performance.now();
    requestAnimationFrame(frame);
  }

  resize();
})();
