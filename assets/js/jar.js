/*
 * The honey jar, drawn as SVG.
 *
 * The shape, the honey and the marks are the same as in the iPhone app
 * (ios/Shared/Scene/JarPictureView.swift). One jar width is 1000 units here.
 */
(function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  var W = 1000;
  var VIEW = { x: -70, y: 0, w: 1140, h: 1190 };
  var NECK_Y = 0.10, BOTTOM_Y = 1.08, WIDEST_Y = 0.30, NECK_HALF = 0.375, LIP_RISE = 0.06, LIP_OUT = 0.06;
  var BEE_WIDTH = 0.67;
  var seq = 0;

  var BUBBLES = [
    [-0.62, 0.034, 19, 0.05], [0.55, 0.040, 23, 0.40], [-0.18, 0.026, 17, 0.72],
    [0.22, 0.020, 21, 0.22], [0.74, 0.022, 26, 0.88], [-0.42, 0.018, 15, 0.55]
  ];

  function node(name, attrs, parent) {
    var n = document.createElementNS(NS, name);
    if (attrs) {
      for (var k in attrs) {
        if (Object.prototype.hasOwnProperty.call(attrs, k)) n.setAttribute(k, attrs[k]);
      }
    }
    if (parent) parent.appendChild(n);
    return n;
  }

  function r1(n) { return Math.round(n * 10) / 10; }

  function smoothstep(a, b, x) {
    var u = Math.min(Math.max((x - a) / (b - a), 0), 1);
    return u * u * (3 - 2 * u);
  }

  /** Half of the inner width at a height. `v` is the height as a part of the jar width. */
  function halfWidth(v) {
    if (v <= WIDEST_Y) {
      var s0 = Math.max(0, (v - NECK_Y) / (WIDEST_Y - NECK_Y));
      return NECK_HALF + (0.48 - NECK_HALF) * Math.pow(Math.sin(s0 * Math.PI / 2), 0.85);
    }
    var s = Math.min(1, (v - WIDEST_Y) / (BOTTOM_Y - WIDEST_Y));
    return 0.48 * Math.pow(1 - Math.pow(s, 3.4), 1 / 3.4);
  }

  /** The height of the honey surface for a level from 0 to 1. */
  function surfaceY(level) {
    return (0.93 - 0.50 * Math.min(Math.max(level, 0), 1.02)) * W;
  }

  var SHAPES = (function () {
    var left = [], right = [], n = 70, i;
    for (i = 0; i <= n; i++) {
      var v = NECK_Y + (BOTTOM_Y - NECK_Y) * i / n;
      var hw = halfWidth(v);
      left.push([(0.5 - hw) * W, v * W]);
      right.push([(0.5 + hw) * W, v * W]);
    }
    var body = 'M';
    var all = left.concat(right.slice().reverse());
    for (i = 0; i < all.length; i++) body += (i ? 'L' : '') + r1(all[i][0]) + ' ' + r1(all[i][1]);
    body += 'Z';

    // The glass as one open line: left lip, left side, bottom, right side, right lip.
    var tipY = (NECK_Y - LIP_RISE) * W;
    var sides = 'M' + r1((0.5 - NECK_HALF - LIP_OUT) * W) + ' ' + r1(tipY) +
      'Q' + r1((0.5 - NECK_HALF) * W) + ' ' + r1(tipY) + ' ' + r1(left[0][0]) + ' ' + r1(left[0][1]);
    for (i = 1; i < left.length; i++) sides += 'L' + r1(left[i][0]) + ' ' + r1(left[i][1]);
    for (i = right.length - 1; i >= 0; i--) sides += 'L' + r1(right[i][0]) + ' ' + r1(right[i][1]);
    sides += 'Q' + r1((0.5 + NECK_HALF) * W) + ' ' + r1(tipY) + ' ' + r1((0.5 + NECK_HALF + LIP_OUT) * W) + ' ' + r1(tipY);
    return { body: body, sides: sides };
  })();

  /**
   * Makes one jar.
   * opts.goal: how many marks the glass has. opts.bee: a bee from BeeKind.createBee (ring mode), or nothing.
   * opts.shadow: false leaves out the shadow on the grass. opts.shade: the color of that shadow
   * (with no value it is the green of a summer day).
   */
  function createJar(opts) {
    opts = opts || {};
    var goal = opts.goal == null ? 5 : opts.goal;
    var id = 'jar' + (++seq);
    var box = VIEW.x + ' ' + VIEW.y + ' ' + VIEW.w + ' ' + VIEW.h;

    var root = document.createElement('div');
    root.className = 'jar';
    root.setAttribute('aria-hidden', 'true');

    // ----- Back: shadow, glass, the top face of the honey -----
    var back = node('svg', { viewBox: box, 'class': 'jar__svg', focusable: 'false' });
    root.appendChild(back);
    var defsB = node('defs', null, back);
    var glassFill = node('linearGradient', { id: id + 'glass', gradientUnits: 'userSpaceOnUse', x1: 0, y1: (NECK_Y - LIP_RISE) * W, x2: 0, y2: (NECK_Y + 0.07) * W }, defsB);
    node('stop', { offset: 0, 'stop-color': '#fff', 'stop-opacity': 0 }, glassFill);
    node('stop', { offset: 1, 'stop-color': '#fff', 'stop-opacity': 0.34 }, glassFill);
    var clipB = node('clipPath', { id: id + 'clipB' }, defsB);
    node('path', { d: SHAPES.body }, clipB);
    if (opts.shadow !== false) {
      node('ellipse', { cx: W / 2, cy: 1.085 * W, rx: 0.56 * W, ry: 0.065 * W, fill: opts.shade || '#5CB24B', 'fill-opacity': 0.85 }, back);
    }
    node('path', { d: SHAPES.sides + 'Z', fill: 'url(#' + id + 'glass)' }, back);
    var bandWrap = node('g', { 'clip-path': 'url(#' + id + 'clipB)' }, back);
    var band = node('path', { fill: '#FFDE59' }, bandWrap);

    // ----- The bee on its ring -----
    var slot = null;
    if (opts.bee) {
      slot = document.createElement('div');
      slot.className = 'jar__bee';
      slot.appendChild(opts.bee.el);
      root.appendChild(slot);
    }

    // ----- Front: honey, bubbles, glass outline, shine, marks -----
    var front = node('svg', { viewBox: box, 'class': 'jar__svg', focusable: 'false' });
    root.appendChild(front);
    var defsF = node('defs', null, front);
    var honeyFill = node('linearGradient', { id: id + 'honey', gradientUnits: 'userSpaceOnUse', x1: 0, y1: 0, x2: 0, y2: 1.1 * W }, defsF);
    node('stop', { offset: 0, 'stop-color': '#FFC229', 'stop-opacity': 0.93 }, honeyFill);
    node('stop', { offset: 1, 'stop-color': '#FBAA17', 'stop-opacity': 0.96 }, honeyFill);
    var clipF = node('clipPath', { id: id + 'clipF' }, defsF);
    node('path', { d: SHAPES.body }, clipF);
    var honeyWrap = node('g', { 'clip-path': 'url(#' + id + 'clipF)' }, front);
    var honey = node('path', { fill: 'url(#' + id + 'honey)' }, honeyWrap);
    var edge = node('path', { fill: 'none', stroke: '#FFE27A', 'stroke-opacity': 0.9, 'stroke-width': 0.014 * W, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, honeyWrap);
    var bubbles = [];
    for (var b = 0; b < BUBBLES.length; b++) {
      bubbles.push({
        main: node('circle', { fill: '#FFE680' }, honeyWrap),
        shine: node('circle', { fill: '#fff' }, honeyWrap)
      });
    }
    node('path', { d: SHAPES.sides, fill: 'none', stroke: '#fff', 'stroke-width': 0.034 * W, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, front);
    node('path', { d: 'M105 420Q70 570 115 720', fill: 'none', stroke: '#fff', 'stroke-opacity': 0.8, 'stroke-width': 30, 'stroke-linecap': 'round' }, front);
    node('path', { d: 'M880 360Q900 410 905 460', fill: 'none', stroke: '#fff', 'stroke-opacity': 0.7, 'stroke-width': 24, 'stroke-linecap': 'round' }, front);

    // Marks on the glass, like the marks on a measuring cup: one for each kind act of the goal.
    for (var i = 1; i <= goal; i++) {
      var y = surfaceY(i / goal);
      var wall = (0.5 + halfWidth(y / W)) * W - 0.04 * W;
      var full = i === goal;
      var d = 'M' + r1(wall) + ' ' + r1(y) + 'L' + r1(wall - W * (full ? 0.17 : 0.085)) + ' ' + r1(y);
      node('path', { d: d, stroke: '#151B54', 'stroke-opacity': 0.16, 'stroke-width': W * (full ? 0.034 : 0.026), 'stroke-linecap': 'round' }, front);
      node('path', { d: d, stroke: '#fff', 'stroke-opacity': full ? 1 : 0.9, 'stroke-width': W * (full ? 0.022 : 0.015), 'stroke-linecap': 'round' }, front);
    }

    // ---------- State ----------

    var level = opts.level || 0;
    var target = level;
    var slosh = 0;
    var lift = 0;
    var scale = 0;
    var beePlace = { x: 0, y: 0, roll: 0 };

    function wave(xn, t, gain, bandShift) {
      return (Math.sin(xn * 5.2 + t * 0.9 + bandShift) * 0.011 +
        Math.sin(xn * 9.1 - t * 0.62 + 1.3 + bandShift * 2) * 0.006) * W * gain;
    }

    /** Draws one picture of the jar. `t` is the clock in seconds. `moving` false gives a still picture. */
    function draw(t, moving) {
      var gain = moving ? 1 + 1.6 * slosh : 0;
      var surface = surfaceY(level);
      var steps = 40;
      var dBand = '', dHoney = '', x, yy, k;
      for (k = 0; k <= steps; k++) {
        x = W * k / steps;
        yy = surface + wave(x / W, t, gain, 1.7) - 0.045 * W;
        dBand += (k ? 'L' : 'M') + r1(x) + ' ' + r1(yy);
        yy = surface + wave(x / W, t, gain, 0);
        dHoney += (k ? 'L' : 'M') + r1(x) + ' ' + r1(yy);
      }
      band.setAttribute('d', dBand + 'L' + W + ' ' + 1.1 * W + 'L0 ' + 1.1 * W + 'Z');
      edge.setAttribute('d', dHoney);
      honey.setAttribute('d', dHoney + 'L' + W + ' ' + 1.1 * W + 'L0 ' + 1.1 * W + 'Z');
      honeyFill.setAttribute('y1', r1(surface));

      // Bubbles rise slowly and fade near the top.
      var bottom = BOTTOM_Y * W;
      var depth = bottom - surface;
      for (k = 0; k < BUBBLES.length; k++) {
        var bb = BUBBLES[k];
        var rise = moving ? ((t / bb[2] + bb[3]) % 1) : bb[3];
        var by = bottom - 0.05 * W - rise * (depth - 0.09 * W);
        var fade = depth > 0.14 * W ? smoothstep(0, 0.12, rise) * (1 - smoothstep(0.82, 1, rise)) : 0;
        var hw = halfWidth(by / W) * W;
        var bx = W / 2 + bb[0] * hw * 0.82 + Math.sin(t * 0.6 + bb[3] * 20) * 0.012 * W;
        var r = bb[1] * W * (0.8 + 0.2 * rise);
        bubbles[k].main.setAttribute('cx', r1(bx));
        bubbles[k].main.setAttribute('cy', r1(by));
        bubbles[k].main.setAttribute('r', r1(r));
        bubbles[k].main.setAttribute('fill-opacity', r1(0.8 * fade * 100) / 100);
        bubbles[k].shine.setAttribute('cx', r1(bx - r * 0.3));
        bubbles[k].shine.setAttribute('cy', r1(by - r * 0.3));
        bubbles[k].shine.setAttribute('r', r1(r * 0.28));
        bubbles[k].shine.setAttribute('fill-opacity', r1(0.55 * fade * 100) / 100);
      }

      // The bee floats on the honey.
      var move = moving ? 1 : 0;
      var beeX = W / 2 + Math.sin(t * 0.31) * 0.022 * W * move;
      var flat = surface;
      var w2 = wave(beeX / W, t, gain, 0);
      var bob = Math.sin(t * 1.15) * 0.012 * W * move;
      var beeY = (flat + w2) * 0.7 + flat * 0.3 + bob - lift * W;
      var roll = Math.sin(t * 0.86 + 1) * 2.2 * move;
      beePlace.x = beeX;
      beePlace.y = beeY;
      beePlace.roll = roll;
      if (slot && scale) {
        var sc = BEE_WIDTH * W / 1200;
        var left = (beeX - window.BeeKind.waterline.x * sc - VIEW.x) * scale;
        var top = (beeY - window.BeeKind.waterline.y * sc - VIEW.y) * scale;
        slot.style.transform = 'translate3d(' + r1(left) + 'px,' + r1(top) + 'px,0) rotate(' + r1(roll) + 'deg)';
      }
    }

    /** Moves the honey toward its level. `dt` is the time since the last call, in seconds. */
    function step(dt) {
      level += (target - level) * (1 - Math.exp(-dt / 0.42));
      slosh *= Math.exp(-dt / 0.9);
      lift *= Math.exp(-dt / 0.25);
    }

    function measure() {
      scale = root.clientWidth / VIEW.w;
    }

    return {
      el: root,
      draw: draw,
      step: step,
      measure: measure,
      /** Sets the honey level, from 0 to 1. `now` true gives no motion. */
      setLevel: function (value, now) {
        var wasLower = value > target;
        target = value;
        if (now) { level = value; return; }
        if (wasLower) { slosh = 1; lift = 0.02; }
      },
      getLevel: function () { return level; },
      /** The square of the bee on the screen: its left, top and size in CSS pixels, and its roll. */
      beeBox: function () {
        var rect = root.getBoundingClientRect();
        var sc = BEE_WIDTH * W / 1200;
        var s = rect.width / VIEW.w;
        return {
          left: rect.left + (beePlace.x - window.BeeKind.waterline.x * sc - VIEW.x) * s,
          top: rect.top + (beePlace.y - window.BeeKind.waterline.y * sc - VIEW.y) * s,
          size: BEE_WIDTH * W * s,
          roll: beePlace.roll
        };
      }
    };
  }

  window.BeeKind = window.BeeKind || {};
  window.BeeKind.createJar = createJar;
})();
