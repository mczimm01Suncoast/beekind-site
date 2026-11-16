/*
 * The Bee Kind bee (design B5), drawn as SVG.
 *
 * The shapes and the colors are the same as in the iPhone app
 * (ios/Shared/Bee/BeeB5Art.swift and BeeB5View.swift). All numbers are in
 * design units. The design square is 1200 units wide.
 */
(function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  var seq = 0;

  var C = {
    headLight: '#FFDB70', headMid: '#FECB5E', headEdge: '#F6AE44', headLow: '#EE9A36',
    bodyYellow: '#FCC350', stripe: '#6A3B1A', limb: '#64381D', limbLight: '#8A5630',
    foot: '#52301B', stem: '#603924', brow: '#5A3118',
    heart: '#FDB62B', heartLight: '#FFCB52', heartShade: '#F4991B',
    wing: '#E2EBF2', wingVein: '#F6F9FC', lash: '#331B0F', eyeWhite: '#FDEFE1',
    irisDark: '#25130D', irisLow: '#7A3D12', pupil: '#1A100D',
    mouth: '#5C1A12', tongue: '#FD855E', cheek: '#FF9468',
    ring: '#4AA3F2', ringLight: '#8FCBFB', ringShade: '#2E84DA', ringHole: '#246BB8',
    navy: '#151B54', gold: '#FFD53D', goldDark: '#F2A900',
    red: '#F0504A', redDark: '#C93838', blue: '#4FB3F6'
  };

  // ---------- Small helpers ----------

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

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

  function smoothstep(a, b, x) {
    var u = clamp((x - a) / (b - a), 0, 1);
    return u * u * (3 - 2 * u);
  }

  /** A random source that gives the same numbers on every run. */
  function seeded(seed) {
    var s = seed >>> 0;
    return function () {
      s = (s + 0x6D2B79F5) >>> 0;
      var t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /** An outline from radius values at even angle steps around a centre. 0 is right, 90 is down. */
  function polar(cx, cy, radii, count) {
    count = count || 144;
    var n = radii.length;
    var step = 360 / n;
    var pts = [];
    function r(k) { return radii[((k % n) + n) % n]; }
    for (var j = 0; j < count; j++) {
      var deg = j / count * 360;
      var f = deg / step;
      var i = Math.floor(f);
      var u = f - i;
      var p0 = r(i - 1), p1 = r(i), p2 = r(i + 1), p3 = r(i + 2);
      var v = 0.5 * ((2 * p1) + (-p0 + p2) * u +
        (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u +
        (-p0 + 3 * p1 - 3 * p2 + p3) * u * u * u);
      var a = deg * Math.PI / 180;
      pts.push([cx + Math.cos(a) * v, cy + Math.sin(a) * v]);
    }
    return pts;
  }

  function poly(pts) {
    var d = 'M';
    for (var i = 0; i < pts.length; i++) {
      d += (i ? 'L' : '') + r1(pts[i][0]) + ' ' + r1(pts[i][1]);
    }
    return d + 'Z';
  }

  /** Soft fur: many short pointed hairs along an outline. */
  function fringe(base, length, width, spacing, seed) {
    var spread = 0.55;
    var count = base.length;
    var cum = [0];
    var area = 0;
    var i;
    for (i = 0; i < count; i++) {
      var a0 = base[i], b0 = base[(i + 1) % count];
      cum.push(cum[i] + Math.hypot(b0[0] - a0[0], b0[1] - a0[1]));
      area += a0[0] * b0[1] - b0[0] * a0[1];
    }
    var total = cum[count];
    var sign = area > 0 ? 1 : -1;
    var rnd = seeded(seed);
    var d = '';
    var walked = 0;
    var index = 0;
    while (walked < total) {
      while (index < count - 1 && cum[index + 1] < walked) index++;
      var A = base[index], B = base[(index + 1) % count];
      var seg = Math.max(cum[index + 1] - cum[index], 0.001);
      var f = (walked - cum[index]) / seg;
      var px = A[0] + (B[0] - A[0]) * f, py = A[1] + (B[1] - A[1]) * f;
      var dx = B[0] - A[0], dy = B[1] - A[1];
      var len = Math.max(Math.hypot(dx, dy), 0.001);
      var ax = dx / len, ay = dy / len;
      var nx = dy / len * sign, ny = -dx / len * sign;
      var lean = (rnd() * 2 - 1) * spread;
      var ux = nx + ax * lean, uy = ny + ay * lean;
      var ul = Math.max(Math.hypot(ux, uy), 0.001);
      ux /= ul; uy /= ul;
      var hair = length * (0.5 + rnd() * 0.9);
      var half = width / 2 * (0.7 + rnd() * 0.6);
      var rx = px - nx * hair * 0.3, ry = py - ny * hair * 0.3;
      d += 'M' + r1(rx - ax * half) + ' ' + r1(ry - ay * half) +
        'L' + r1(px + ux * hair) + ' ' + r1(py + uy * hair) +
        'L' + r1(rx + ax * half) + ' ' + r1(ry + ay * half) + 'Z';
      walked += spacing * (0.6 + rnd() * 0.8);
    }
    return d;
  }

  /** A curved line that gets wider from its start to its end. */
  function tapered(a, c, b, w0, w1) {
    var L = [], R = [], n = 24;
    for (var i = 0; i <= n; i++) {
      var t = i / n, m = 1 - t;
      var px = a[0] * m * m + c[0] * 2 * t * m + b[0] * t * t;
      var py = a[1] * m * m + c[1] * 2 * t * m + b[1] * t * t;
      var dx = (c[0] - a[0]) * 2 * m + (b[0] - c[0]) * 2 * t;
      var dy = (c[1] - a[1]) * 2 * m + (b[1] - c[1]) * 2 * t;
      var len = Math.max(Math.hypot(dx, dy), 0.001);
      var nx = -dy / len, ny = dx / len;
      var half = (w0 + (w1 - w0) * t) / 2;
      L.push([px + nx * half, py + ny * half]);
      R.push([px - nx * half, py - ny * half]);
    }
    return poly(L.concat(R.reverse()));
  }

  /** A brush stroke along a curve. It is thick in the middle and thinner at both ends. */
  function brush(a, c1, c2, b, mid, end) {
    var L = [], R = [], n = 28;
    for (var i = 0; i <= n; i++) {
      var t = i / n, m = 1 - t;
      var px = a[0] * m * m * m + c1[0] * 3 * m * m * t + c2[0] * 3 * m * t * t + b[0] * t * t * t;
      var py = a[1] * m * m * m + c1[1] * 3 * m * m * t + c2[1] * 3 * m * t * t + b[1] * t * t * t;
      var dx = (c1[0] - a[0]) * 3 * m * m + (c2[0] - c1[0]) * 6 * m * t + (b[0] - c2[0]) * 3 * t * t;
      var dy = (c1[1] - a[1]) * 3 * m * m + (c2[1] - c1[1]) * 6 * m * t + (b[1] - c2[1]) * 3 * t * t;
      var len = Math.max(Math.hypot(dx, dy), 0.001);
      var nx = -dy / len, ny = dx / len;
      var half = (end + (mid - end) * Math.sin(t * Math.PI)) / 2;
      L.push([px + nx * half, py + ny * half]);
      R.push([px - nx * half, py - ny * half]);
    }
    return poly(L.concat(R.reverse()));
  }

  /** A soft heart. The point is at the bottom before the turn. */
  function heartPath(cx, cy, w, h, deg) {
    var a = deg * Math.PI / 180, co = Math.cos(a), si = Math.sin(a);
    function p(x, y) {
      var sx = x * w, sy = y * h;
      return r1(cx + sx * co - sy * si) + ' ' + r1(cy + sx * si + sy * co);
    }
    return 'M' + p(0, 0.5) +
      'C' + p(-0.14, 0.46) + ' ' + p(-0.5, 0.24) + ' ' + p(-0.5, -0.1) +
      'C' + p(-0.5, -0.5) + ' ' + p(-0.06, -0.52) + ' ' + p(0, -0.24) +
      'C' + p(0.06, -0.52) + ' ' + p(0.5, -0.5) + ' ' + p(0.5, -0.1) +
      'C' + p(0.5, 0.24) + ' ' + p(0.14, 0.46) + ' ' + p(0, 0.5) + 'Z';
  }

  /** A part of the ring line. 0 is right, 90 is the near side. */
  function ringArc(from, to, lift) {
    var cx = 670, cy = 1095, rx = 420, ry = 135;
    var steps = Math.max(2, Math.ceil(Math.abs(to - from) / 3));
    var d = '';
    for (var i = 0; i <= steps; i++) {
      var a = (from + (to - from) * i / steps) * Math.PI / 180;
      d += (i ? 'L' : 'M') + r1(cx + Math.cos(a) * rx) + ' ' + r1(cy + Math.sin(a) * ry - (lift || 0));
    }
    return d;
  }

  // ---------- Shapes that never change (made one time) ----------

  var HEAD = polar(770, 620, [354, 364, 353, 330, 310, 284, 275, 284, 300, 317, 342, 349,
    354, 357, 352, 341, 334, 321, 322, 318, 334, 336, 338, 344]);
  var BODY = polar(480, 890, [300, 305, 306, 295, 285, 250, 228, 235, 250, 258, 252, 262,
    255, 250, 240, 235, 238, 245, 250, 250, 255, 270, 285, 295]);
  var BAND = polar(480, 890, [250, 250, 250, 250, 248, 240, 226, 222, 218, 208, 203, 199,
    218, 240, 248, 243, 246, 253, 256, 250, 250, 250, 250, 250]);
  var STRIPE = polar(480, 890, [300, 305, 306, 295, 285, 250, 175, 145, 122, 110, 103, 106,
    113, 124, 142, 172, 218, 245, 250, 250, 255, 270, 285, 295]);
  var BELLY = polar(610, 860, [235, 232, 228, 228, 233, 218, 192, 178, 168, 165, 167, 174,
    183, 193, 215, 262, 265, 265, 265, 262, 258, 250, 242, 238]);
  var WING_FRONT = polar(225, 510, [160, 170, 185, 180, 150, 145, 157, 175, 165, 140, 140, 150], 96);

  var PATHS = {
    head: poly(HEAD),
    headWisps: fringe(HEAD, 14, 10, 8, 51),
    body: poly(BODY), bodyFur: fringe(BODY, 14, 10, 9, 61),
    band: poly(BAND), bandFur: fringe(BAND, 14, 10, 9, 62),
    stripe: poly(STRIPE), stripeFur: fringe(STRIPE, 14, 10, 9, 63),
    belly: poly(BELLY), bellyFur: fringe(BELLY, 13, 10, 9, 64),
    wingFront: poly(WING_FRONT),
    mouth: 'M766 674Q838 730 906 670C920 818 776 852 766 674Z'
  };

  // ---------- The bee ----------

  /**
   * Makes one bee.
   * opts.mode: 'flying' (no ring), 'ring' (the bee sits in its pool float) or 'head' (only the head).
   * opts.item: 'none', 'flower', 'bow', 'partyHat', 'topHat' or 'crown'.
   */
  function createBee(opts) {
    opts = opts || {};
    var mode = opts.mode || 'flying';
    var id = 'bee' + (++seq);
    var root = document.createElement('div');
    root.className = 'bee bee--' + mode;
    root.setAttribute('aria-hidden', 'true');

    function layer(cls, box) {
      var s = node('svg', { viewBox: box || '0 0 1200 1200', 'class': cls, focusable: 'false' });
      return s;
    }

    var wingsWrap = null, wingBack = null, wingFront = null, ringBack = null;

    if (mode === 'ring') {
      ringBack = layer('bee__layer bee__ring-back');
      node('ellipse', { cx: 670, cy: 1095, rx: 400, ry: 110, fill: C.ringHole }, ringBack);
      node('path', { d: ringArc(177, 363), fill: 'none', stroke: C.ring, 'stroke-width': 190 }, ringBack);
      node('path', { d: ringArc(196, 344, 40), fill: 'none', stroke: C.ringLight, 'stroke-width': 58, 'stroke-linecap': 'round' }, ringBack);
      root.appendChild(ringBack);
    }

    if (mode !== 'head') {
      wingsWrap = document.createElement('div');
      wingsWrap.className = 'bee__wings';
      wingBack = layer('bee__layer bee__wing bee__wing--back');
      node('ellipse', { cx: 365, cy: 420, rx: 112, ry: 165, transform: 'rotate(10 365 420)', fill: C.wing, 'fill-opacity': 0.88 }, wingBack);
      node('path', { d: 'M335 300Q362 450 405 620', fill: 'none', stroke: C.wingVein, 'stroke-opacity': 0.7, 'stroke-width': 5, 'stroke-linecap': 'round' }, wingBack);
      wingFront = layer('bee__layer bee__wing bee__wing--front');
      node('path', { d: PATHS.wingFront, fill: C.wing, 'fill-opacity': 0.9 }, wingFront);
      node('path', { d: 'M120 440Q250 520 392 650', fill: 'none', stroke: C.wingVein, 'stroke-opacity': 0.7, 'stroke-width': 5, 'stroke-linecap': 'round' }, wingFront);
      wingsWrap.appendChild(wingBack);
      wingsWrap.appendChild(wingFront);
      root.appendChild(wingsWrap);
    }

    var svg = layer('bee__layer bee__main', mode === 'head' ? '350 -30 840 1040' : '0 0 1200 1200');
    root.appendChild(svg);
    var defs = node('defs', null, svg);

    function blur(name, sd, pad) {
      var p = pad == null ? 15 : pad;
      var f = node('filter', {
        id: id + name, x: -p + '%', y: -p + '%', width: (100 + 2 * p) + '%', height: (100 + 2 * p) + '%',
        'color-interpolation-filters': 'sRGB'
      }, defs);
      node('feGaussianBlur', { stdDeviation: sd }, f);
      return 'url(#' + id + name + ')';
    }
    var fFur = blur('fur', 3.6);
    var fWisp = blur('wisp', 2.2);
    var fSoft = blur('soft', 1.5, 10);
    var fGlow = blur('glow', 11, 20);
    var fSpot = blur('spot', 12, 120);
    var fShadow = blur('shadow', 26, 80);

    function gradient(kind, gid, attrs, stops) {
      var g = node(kind, attrs, defs);
      g.setAttribute('id', id + gid);
      g.setAttribute('gradientUnits', 'userSpaceOnUse');
      for (var i = 0; i < stops.length; i++) {
        var st = { offset: stops[i][0], 'stop-color': stops[i][1] };
        if (stops[i][2] != null) st['stop-opacity'] = stops[i][2];
        node('stop', st, g);
      }
      return 'url(#' + id + gid + ')';
    }

    // The parts that go up when the bee hops out of its ring.
    var up1 = node('g', null, svg);
    var ringFront = null;
    var up2;

    // ----- Body -----
    var torso = null;
    if (mode !== 'head') {
      torso = node('g', null, up1);
      var coats = [
        [PATHS.bodyFur, PATHS.body, C.stripe],
        [PATHS.bandFur, PATHS.band, C.bodyYellow],
        [PATHS.stripeFur, PATHS.stripe, C.stripe],
        [PATHS.bellyFur, PATHS.belly, C.bodyYellow]
      ];
      for (var ci = 0; ci < coats.length; ci++) {
        var cg = node('g', { filter: fFur }, torso);
        node('path', { d: coats[ci][0], fill: coats[ci][2], 'fill-opacity': 0.6 }, cg);
        node('path', { d: coats[ci][1], fill: coats[ci][2] }, cg);
      }
      // A soft shadow where the head sits over the body.
      var bodyClip = node('clipPath', { id: id + 'bodyclip' }, defs);
      node('path', { d: PATHS.body }, bodyClip);
      var sh = node('g', { 'clip-path': 'url(#' + id + 'bodyclip)' }, torso);
      node('ellipse', { cx: 520, cy: 830, rx: 150, ry: 90, transform: 'rotate(50 520 830)', fill: C.stripe, 'fill-opacity': 0.2, filter: fShadow }, sh);
    }

    if (mode === 'ring') {
      ringFront = node('g', { fill: 'none' }, svg);
      node('path', { d: ringArc(-3, 183), stroke: C.ring, 'stroke-width': 190 }, ringFront);
      node('path', { d: ringArc(14, 166, -56), stroke: C.ringShade, 'stroke-width': 62, 'stroke-linecap': 'round' }, ringFront);
      node('path', { d: ringArc(10, 170, 44), stroke: C.ringLight, 'stroke-width': 60, 'stroke-linecap': 'round' }, ringFront);
      node('path', { d: ringArc(24, 42, 50), stroke: '#fff', 'stroke-opacity': 0.9, 'stroke-width': 26, 'stroke-linecap': 'round' }, ringFront);
      node('path', { d: ringArc(49, 50.5, 50), stroke: '#fff', 'stroke-opacity': 0.9, 'stroke-width': 24, 'stroke-linecap': 'round' }, ringFront);
      node('path', { d: ringArc(150, 157, 50), stroke: '#fff', 'stroke-opacity': 0.5, 'stroke-width': 20, 'stroke-linecap': 'round' }, ringFront);
    }
    up2 = node('g', null, svg);

    // ----- Limbs -----
    var limbCount = 0;
    /** A soft brown limb with a lighter spot at its upper left. */
    function limb(parent, cx, cy, rx, ry, rot, color) {
      var n = ++limbCount;
      var clip = node('clipPath', { id: id + 'limb' + n }, defs);
      var clipShape = node('ellipse', { rx: rx, ry: ry }, clip);
      var g = node('g', null, parent);
      var shape = node('ellipse', { rx: rx, ry: ry, fill: color, filter: fSoft }, g);
      var spotWrap = node('g', { 'clip-path': 'url(#' + id + 'limb' + n + ')' }, g);
      var spot = node('ellipse', { rx: rx * 0.5, ry: ry * 0.42, fill: C.limbLight, 'fill-opacity': 0.45, filter: fSpot }, spotWrap);
      function place(x, y, deg) {
        var t = 'translate(' + r1(x) + ' ' + r1(y) + ') rotate(' + r1(deg) + ')';
        shape.setAttribute('transform', t);
        clipShape.setAttribute('transform', t);
        spot.setAttribute('transform', 'translate(' + r1(x - rx * 0.22) + ' ' + r1(y - ry * 0.28) + ') rotate(' + r1(deg) + ')');
      }
      place(cx, cy, rot);
      return { g: g, place: place };
    }

    var footL = null, footR = null, armL = null, armR = null;
    if (mode === 'flying') {
      footL = limb(up1, 368, 1112, 50, 56, 0, C.foot);
      footR = limb(up1, 552, 1146, 52, 40, 0, C.foot);
    } else if (mode === 'ring') {
      footL = limb(up2, 565, 1153, 56, 62, -10, C.foot);
      footR = limb(up2, 775, 1155, 56, 62, 10, C.foot);
    }
    if (mode !== 'head') {
      armL = limb(up2, 605, 960, 66, 80, -20, C.limb);
      armR = limb(up2, 840, 972, 78, 60, -30, C.limb);
    }

    // ----- Head -----
    var head = node('g', null, up2);

    function antenna(base, control, tip, hx, hy, w, h, rot, name) {
      var g = node('g', null, head);
      node('path', { d: tapered(base, control, tip, 23, 28), fill: C.stem }, g);
      node('circle', { cx: base[0], cy: base[1], r: 11.5, fill: C.stem }, g);
      var fill = gradient('linearGradient', name,
        { x1: hx - w * 0.3, y1: hy - h * 0.5, x2: hx + w * 0.25, y2: hy + h * 0.5 },
        [[0, C.heartLight], [0.5, C.heart], [1, C.heartShade]]);
      node('path', { d: heartPath(hx, hy, w, h, rot), fill: fill, filter: fSoft }, g);
      return g;
    }
    var antL = antenna([686, 340], [676, 248], [612, 154], 542, 105, 176, 158, -16, 'heartL');
    var antR = antenna([882, 340], [894, 262], [952, 196], 1013, 160, 165, 155, 17, 'heartR');

    var headFill = gradient('radialGradient', 'headfill', { cx: 740, cy: 470, r: 440 },
      [[0, C.headLight], [0.114, C.headLight], [0.557, C.headMid], [1, C.headEdge]]);
    var headLowFill = gradient('linearGradient', 'headlow', { x1: 770, y1: 700, x2: 770, y2: 905 },
      [[0, C.headLow, 0], [1, C.headLow, 0.42]]);
    node('path', { d: PATHS.head, fill: C.headEdge, 'fill-opacity': 0.55, filter: fGlow }, head);
    node('path', { d: PATHS.headWisps, fill: C.headEdge, 'fill-opacity': 0.6, filter: fWisp }, head);
    var headShape = node('g', { filter: fFur }, head);
    node('path', { d: PATHS.head, fill: headFill }, headShape);
    node('path', { d: PATHS.head, fill: headLowFill }, headShape);

    function cheek(cx, cy, rx, ry, name) {
      var fill = gradient('radialGradient', name, { cx: 0, cy: 0, r: rx },
        [[0, C.cheek, 0.5], [0.5, C.cheek, 0.25], [1, C.cheek, 0]]);
      node('circle', { r: rx, fill: fill, transform: 'translate(' + cx + ' ' + cy + ') scale(1 ' + r1(ry / rx * 1000) / 1000 + ')' }, head);
    }
    cheek(580, 762, 78, 52, 'cheekL');
    cheek(1065, 722, 68, 48, 'cheekR');

    // Eyes
    var irisL = gradient('linearGradient', 'irisL', { x1: 658, y1: 514, x2: 658, y2: 700 },
      [[0, C.irisDark], [0.5, C.irisDark], [1, C.irisLow]]);
    var irisR = gradient('linearGradient', 'irisR', { x1: 977, y1: 501, x2: 977, y2: 691 },
      [[0, C.irisDark], [0.5, C.irisDark], [1, C.irisLow]]);

    var clipL = node('clipPath', { id: id + 'eyeL' }, defs);
    node('ellipse', { cx: 629, cy: 598, rx: 114, ry: 108 }, clipL);
    node('ellipse', { cx: 633, cy: 606, rx: 112, ry: 104 }, clipL);
    var clipR = node('clipPath', { id: id + 'eyeR' }, defs);
    node('ellipse', { cx: 1009, cy: 580, rx: 88, ry: 116 }, clipR);
    node('ellipse', { cx: 1003, cy: 590, rx: 87, ry: 113 }, clipR);

    var eyeLWrap = node('g', null, head);
    var eyeL = node('g', { 'clip-path': 'url(#' + id + 'eyeL)' }, eyeLWrap);
    node('rect', { x: 500, y: 470, width: 270, height: 260, fill: C.lash }, eyeL);
    node('ellipse', { cx: 633, cy: 606, rx: 108, ry: 100, fill: C.eyeWhite }, eyeL);
    var lIris = node('ellipse', { cx: 658, cy: 607, rx: 85, ry: 93, fill: irisL }, eyeL);
    var lPupil = node('circle', { cx: 660, cy: 598, r: 52, fill: C.pupil }, eyeL);
    var lShine1 = node('circle', { cx: 692, cy: 570, r: 16, fill: '#fff' }, eyeL);
    var lShine2 = node('circle', { cx: 612, cy: 562, r: 7, fill: '#fff' }, eyeL);

    var eyeRWrap = node('g', null, head);
    var eyeR = node('g', { 'clip-path': 'url(#' + id + 'eyeR)' }, eyeRWrap);
    node('rect', { x: 900, y: 450, width: 220, height: 270, fill: C.lash }, eyeR);
    node('ellipse', { cx: 1003, cy: 590, rx: 83, ry: 109, fill: C.eyeWhite }, eyeR);
    var rIris = node('ellipse', { cx: 977, cy: 596, rx: 64, ry: 95, fill: irisR }, eyeR);
    var rPupil = node('ellipse', { cx: 975, cy: 588, rx: 42, ry: 50, fill: C.pupil }, eyeR);
    var rShine = node('circle', { cx: 950, cy: 553, r: 14, fill: '#fff' }, eyeR);

    var lids = node('g', { fill: 'none', stroke: C.lash, 'stroke-width': 14, 'stroke-linecap': 'round', opacity: 0 }, head);
    node('path', { d: 'M523 612Q633 690 745 612' }, lids);
    node('path', { d: 'M917 600Q1002 668 1088 592' }, lids);
    var arcs = node('g', { fill: 'none', stroke: C.lash, 'stroke-width': 17, 'stroke-linecap': 'round', opacity: 0 }, head);
    node('path', { d: 'M525 642Q633 520 745 642' }, arcs);
    node('path', { d: 'M920 626Q1002 510 1086 616' }, arcs);

    // Mouth. B5 always has an open smile.
    var mouth = node('g', null, head);
    var mouthClip = node('clipPath', { id: id + 'mouth' }, defs);
    node('path', { d: PATHS.mouth }, mouthClip);
    node('path', { d: PATHS.mouth, fill: C.mouth }, mouth);
    node('ellipse', { cx: 818, cy: 780, rx: 62, ry: 46, fill: C.tongue, 'clip-path': 'url(#' + id + 'mouth)' }, mouth);
    node('path', { d: 'M776 684Q766 678 760 666', fill: 'none', stroke: C.mouth, 'stroke-width': 9, 'stroke-linecap': 'round' }, mouth);
    node('path', { d: 'M898 680Q908 674 913 661', fill: 'none', stroke: C.mouth, 'stroke-width': 9, 'stroke-linecap': 'round' }, mouth);

    // Brows
    node('path', { d: brush([580, 437], [592, 412], [618, 398], [650, 401], 16, 8), fill: C.brow }, head);
    node('path', { d: brush([943, 393], [962, 383], [988, 392], [1002, 415], 16, 8), fill: C.brow }, head);

    // The item on the head
    var itemLayer = node('g', null, head);

    function drawItem(name) {
      while (itemLayer.firstChild) itemLayer.removeChild(itemLayer.firstChild);
      var tx = 784, ty = 300;
      function P(x, y) { return [tx + x, ty + y]; }
      function pts(list) { return poly(list); }
      var g, i;
      if (name === 'flower') {
        var cx = tx - 186, cy = ty + 30;
        g = node('g', null, itemLayer);
        var shade = node('g', { fill: C.navy, 'fill-opacity': 0.14, transform: 'translate(5 8)' }, g);
        var white = node('g', { fill: '#fff' }, g);
        for (i = 0; i < 7; i++) {
          var a = i / 7 * 2 * Math.PI;
          var px = r1(cx + Math.cos(a) * 44), py = r1(cy + Math.sin(a) * 44);
          var attrs = { cx: px, cy: py, rx: 34, ry: 23, transform: 'rotate(' + r1(a * 180 / Math.PI) + ' ' + px + ' ' + py + ')' };
          node('ellipse', attrs, shade);
          node('ellipse', attrs, white);
        }
        node('circle', { cx: cx, cy: cy, r: 27, fill: C.goldDark }, g);
        node('circle', { cx: cx - 5, cy: cy - 6, r: 14, fill: C.gold }, g);
      } else if (name === 'bow') {
        var bx = tx + 182, by = ty + 34;
        g = node('g', { transform: 'rotate(14 ' + bx + ' ' + by + ')' }, itemLayer);
        var loop = function (s) {
          return 'M' + (bx + s * 8) + ' ' + by +
            'Q' + (bx + s * 48) + ' ' + (by - 70) + ' ' + (bx + s * 104) + ' ' + (by - 58) +
            'Q' + (bx + s * 126) + ' ' + by + ' ' + (bx + s * 104) + ' ' + (by + 58) +
            'Q' + (bx + s * 48) + ' ' + (by + 70) + ' ' + (bx + s * 8) + ' ' + by + 'Z';
        };
        node('path', { d: loop(-1), fill: C.red }, g);
        node('path', { d: loop(1), fill: C.red }, g);
        node('ellipse', { cx: bx - 62, cy: by, rx: 26, ry: 20, fill: C.redDark, 'fill-opacity': 0.55 }, g);
        node('ellipse', { cx: bx + 62, cy: by, rx: 26, ry: 20, fill: C.redDark, 'fill-opacity': 0.55 }, g);
        node('rect', { x: bx - 24, y: by - 28, width: 48, height: 56, rx: 18, fill: C.redDark }, g);
      } else if (name === 'partyHat') {
        g = node('g', { transform: 'rotate(-9 ' + tx + ' ' + (ty + 26) + ')' }, itemLayer);
        var cone = pts([P(-98, 26), P(98, 26), P(8, -236)]);
        var coneClip = node('clipPath', { id: id + 'cone' }, g);
        node('path', { d: cone }, coneClip);
        node('path', { d: cone, fill: C.blue }, g);
        var stripes = node('g', { fill: C.gold, 'clip-path': 'url(#' + id + 'cone)' }, g);
        for (i = 0; i < 4; i++) {
          var y = i * 78 - 250;
          node('path', { d: pts([P(-140, y + 110), P(140, y + 30), P(140, y + 68), P(-140, y + 148)]) }, stripes);
        }
        node('ellipse', { cx: tx, cy: ty + 26, rx: 104, ry: 24, fill: '#fff' }, g);
        node('circle', { cx: tx + 8, cy: ty - 242, r: 34, fill: '#fff' }, g);
      } else if (name === 'topHat') {
        g = node('g', { transform: 'rotate(8 ' + tx + ' ' + (ty + 20) + ')' }, itemLayer);
        node('ellipse', { cx: tx, cy: ty + 20, rx: 156, ry: 34, fill: C.navy }, g);
        node('path', { d: pts([P(-92, 14), P(92, 14), P(100, -196), P(-100, -196)]), fill: C.navy }, g);
        node('ellipse', { cx: tx, cy: ty - 196, rx: 100, ry: 22, fill: '#2B3478' }, g);
        node('path', { d: pts([P(-93, -6), P(93, -6), P(95, -52), P(-95, -52)]), fill: C.gold }, g);
      } else if (name === 'crown') {
        g = node('g', { transform: 'rotate(-5 ' + tx + ' ' + (ty + 22) + ')' }, itemLayer);
        node('path', { d: pts([P(-112, 22), P(112, 22), P(126, -128), P(64, -52), P(0, -152), P(-64, -52), P(-126, -128)]), fill: C.gold }, g);
        node('path', { d: pts([P(-112, 22), P(112, 22), P(115, -14), P(-115, -14)]), fill: C.goldDark }, g);
        node('ellipse', { cx: tx, cy: ty + 22, rx: 112, ry: 20, fill: C.goldDark }, g);
        node('circle', { cx: tx - 126, cy: ty - 134, r: 17, fill: C.gold }, g);
        node('circle', { cx: tx + 126, cy: ty - 134, r: 17, fill: C.gold }, g);
        node('circle', { cx: tx, cy: ty - 158, r: 19, fill: C.gold }, g);
        node('circle', { cx: tx, cy: ty + 2, r: 15, fill: C.red }, g);
        node('circle', { cx: tx - 62, cy: ty + 4, r: 12, fill: C.blue }, g);
        node('circle', { cx: tx + 62, cy: ty + 4, r: 12, fill: C.blue }, g);
      }
    }

    // ---------- Pose ----------

    var cache = {};
    function set(el, key, attr, value) {
      if (cache[key] === value) return;
      cache[key] = value;
      el.setAttribute(attr, value);
    }

    var pose = {
      eyeOpen: 1, happy: 0, antL: 0, antR: 0, head: 0, armRaise: 0,
      foot: 0, lookX: 0, lookY: 0, breathe: 0, hop: 0
    };

    function apply() {
      var p = pose;
      var lx = clamp(p.lookX, -28, 28), ly = clamp(p.lookY, -20, 20);

      set(head, 'head', 'transform', 'rotate(' + r1(p.head) + ' 770 900)');
      set(antL, 'antL', 'transform', 'rotate(' + r1(p.antL) + ' 686 340)');
      set(antR, 'antR', 'transform', 'rotate(' + r1(p.antR) + ' 882 340)');

      // Eyes. A cheer first shuts the eyes like a blink. Then the happy arcs show.
      var open = p.eyeOpen * (1 - smoothstep(0, 0.6, p.happy));
      var openPart = smoothstep(0.12, 0.3, open);
      var arcPart = smoothstep(0.6, 0.9, p.happy);
      var lidPart = (1 - openPart) * (1 - arcPart);
      var sy = r1(Math.max(open, 0.12) * 100) / 100;
      set(eyeLWrap, 'eyeLs', 'transform', 'translate(0 612) scale(1 ' + sy + ') translate(0 -612)');
      set(eyeRWrap, 'eyeRs', 'transform', 'translate(0 592) scale(1 ' + sy + ') translate(0 -592)');
      set(eyeLWrap, 'eyeLo', 'opacity', r1(openPart * 10) / 10);
      set(eyeRWrap, 'eyeRo', 'opacity', r1(openPart * 10) / 10);
      set(lids, 'lids', 'opacity', r1(lidPart * 10) / 10);
      set(arcs, 'arcs', 'opacity', r1(arcPart * 10) / 10);

      set(lIris, 'liX', 'cx', r1(658 + lx * 0.6)); set(lIris, 'liY', 'cy', r1(607 + ly * 0.6));
      set(lPupil, 'lpX', 'cx', r1(660 + lx)); set(lPupil, 'lpY', 'cy', r1(598 + ly));
      set(lShine1, 'l1X', 'cx', r1(692 + lx * 0.5)); set(lShine1, 'l1Y', 'cy', r1(570 + ly * 0.5));
      set(lShine2, 'l2X', 'cx', r1(612 + lx * 0.5)); set(lShine2, 'l2Y', 'cy', r1(562 + ly * 0.5));
      set(rIris, 'riX', 'cx', r1(977 + lx * 0.6)); set(rIris, 'riY', 'cy', r1(596 + ly * 0.6));
      set(rPupil, 'rpX', 'cx', r1(975 + lx)); set(rPupil, 'rpY', 'cy', r1(588 + ly));
      set(rShine, 'rsX', 'cx', r1(950 + lx * 0.5)); set(rShine, 'rsY', 'cy', r1(553 + ly * 0.5));

      var ms = r1((1 + 0.12 * p.happy) * 100) / 100;
      set(mouth, 'mouth', 'transform', 'translate(836 700) scale(' + ms + ') translate(-836 -700)');

      if (mode === 'head') return;

      var bs = r1((1 + p.breathe * 0.012) * 1000) / 1000;
      set(torso, 'torso', 'transform', 'translate(530 890) scale(' + bs + ') translate(-530 -890)');

      if (mode === 'flying') {
        set(footL.g, 'footL', 'transform', 'rotate(' + r1(p.foot) + ' 375 1065)');
        set(footR.g, 'footR', 'transform', 'rotate(' + r1(-p.foot) + ' 552 1110)');
      } else {
        set(footL.g, 'footL', 'transform', 'rotate(' + r1(p.foot) + ' 575 1100)');
        set(footR.g, 'footR', 'transform', 'rotate(' + r1(-p.foot) + ' 765 1100)');
      }

      // Two short mitten arms. On a cheer they swing out and up beside the head.
      var r = clamp(p.armRaise, 0, 1);
      var key = r1(r * 50) / 50;
      if (cache.arms !== key) {
        cache.arms = key;
        armL.place(605 + (352 - 605) * r, 960 + (672 - 960) * r, -20 + 68 * r);
        armR.place(840 + (1168 - 840) * r, 972 + (722 - 972) * r, -30 - 24 * r);
      }
      set(armL.g, 'armL', 'transform', 'rotate(' + r1(p.foot * 0.6 * (1 - r)) + ' 590 890)');
      set(armR.g, 'armR', 'transform', 'rotate(' + r1(-p.foot * 0.6 * (1 - r)) + ' 880 925)');

      if (mode === 'ring') {
        var hop = 'translate(0 ' + r1(-p.hop) + ')';
        set(up1, 'up1', 'transform', hop);
        set(up2, 'up2', 'transform', hop);
        var px = -p.hop / 1200 * 100;
        if (cache.wingHop !== px) {
          cache.wingHop = px;
          wingsWrap.style.transform = 'translateY(' + r1(px) + '%)';
        }
      }
    }

    // ---------- Wings ----------

    var flaps = [];
    var flapKind = '';
    /** kind: 'fast' (the bee flies), 'slow' (the bee rests) or 'off'. */
    function setFlap(kind) {
      if (kind === flapKind || !wingBack || !wingBack.animate) return;
      flapKind = kind;
      var i;
      for (i = 0; i < flaps.length; i++) flaps[i].cancel();
      flaps = [];
      if (kind === 'off') return;
      var fast = kind === 'fast';
      var a = fast ? [-7, 22] : [-3.5, 3.5];
      var options = { duration: fast ? 92 : 1500, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' };
      flaps.push(wingBack.animate(
        [{ transform: 'rotate(' + a[0] + 'deg)' }, { transform: 'rotate(' + a[1] + 'deg)' }], options));
      flaps.push(wingFront.animate(
        [{ transform: 'rotate(' + (-a[0] * 0.7) + 'deg)' }, { transform: 'rotate(' + (-a[1] * 0.7) + 'deg)' }], options));
    }
    function setFlapRate(rate) {
      for (var i = 0; i < flaps.length; i++) flaps[i].playbackRate = rate;
    }

    var bodyShown = true;
    /** In ring mode: false hides the bee and keeps the ring. */
    function setBodyVisible(on) {
      if (on === bodyShown) return;
      bodyShown = on;
      var v = on ? '' : 'hidden';
      up1.style.visibility = v;
      up2.style.visibility = v;
      if (wingsWrap) wingsWrap.style.visibility = v;
    }

    var item = 'none';
    function setItem(name) {
      item = name || 'none';
      drawItem(item);
    }

    if (opts.item) setItem(opts.item);
    apply();

    return {
      el: root,
      mode: mode,
      pose: pose,
      /** Draws the bee again with the values in `pose`. */
      apply: apply,
      setItem: setItem,
      getItem: function () { return item; },
      setFlap: setFlap,
      setFlapRate: setFlapRate,
      setBodyVisible: setBodyVisible
    };
  }

  window.BeeKind = window.BeeKind || {};
  window.BeeKind.createBee = createBee;
  window.BeeKind.colors = C;
  /** The place on the ring bee that sits on the honey surface, in design units. */
  window.BeeKind.waterline = { x: 670, y: 1267 };
})();
