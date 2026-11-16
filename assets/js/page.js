/*
 * The small pages (privacy, support, terms and "not found"): one bee that looks at the pointer.
 * No network calls. No tracking.
 */
(function () {
  'use strict';
  var BK = window.BeeKind;
  if (!BK) return;
  var host = document.getElementById('docBee') || document.getElementById('lostBee');
  if (!host) return;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var bee = BK.createBee({ mode: 'flying' });
  host.appendChild(bee.el);
  if (reduce) return;
  bee.setFlap('fast');
  bee.setFlapRate(0.9);

  var look = { x: 0, y: 0, tx: 6, ty: 4, has: false };
  var blinkAt = -9, nextBlink = 2.2, happyAt = -9;
  window.addEventListener('pointermove', function (e) {
    var r = host.getBoundingClientRect();
    look.tx = Math.max(-28, Math.min(28, (e.clientX - (r.left + r.width * 0.66)) / 14));
    look.ty = Math.max(-20, Math.min(20, (e.clientY - (r.top + r.height * 0.5)) / 14));
    look.has = true;
  }, { passive: true });
  host.addEventListener('click', function () { happyAt = performance.now() / 1000; });

  var last = performance.now();
  function frame(now) {
    var t = now / 1000;
    var dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    var k = 1 - Math.exp(-dt / 0.12);
    if (!look.has) { look.tx = Math.sin(t * 0.5) * 12; look.ty = Math.sin(t * 0.37 + 1) * 5 + 3; }
    look.x += (look.tx - look.x) * k;
    look.y += (look.ty - look.y) * k;
    if (t >= nextBlink) { blinkAt = t; nextBlink = t + 2.6 + Math.random() * 4.2; }
    var bu = (t - blinkAt) / 0.3;
    var hu = (t - happyAt) / 1.3;
    var happy = hu > 0 && hu < 1 ? Math.sin(Math.PI * hu) : 0;
    var p = bee.pose;
    p.lookX = look.x;
    p.lookY = look.y;
    p.eyeOpen = bu < 1 ? Math.abs(Math.cos(bu * Math.PI)) : 1;
    p.happy = happy;
    p.armRaise = happy * 0.9;
    p.antL = Math.sin(t * 1.5) * 3.5 + happy * Math.sin(t * 34) * 9;
    p.antR = Math.sin(t * 1.3 + 1.4) * 3.5 + happy * Math.sin(t * 34) * 9;
    p.foot = Math.sin(t * 1.9) * 5 + happy * Math.sin(t * 26) * 8;
    p.breathe = Math.sin(t * 1.4);
    bee.apply();
    window.requestAnimationFrame(frame);
  }
  window.requestAnimationFrame(frame);
})();
