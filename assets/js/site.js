/*
 * Bee Kind website: the meadow, the live jar, and the bee that flies with you.
 * No network calls. No tracking. All of it runs in the browser.
 */
(function () {
  'use strict';

  var BK = window.BeeKind;
  var doc = document;
  if (!BK || !doc.body.classList.contains('home')) return;

  var NS = 'http://www.w3.org/2000/svg';
  var BASE = ((doc.currentScript && doc.currentScript.src) || '').replace(/assets\/js\/site\.js.*$/, '');
  // "?still" in the address gives the page with no motion, for a test.
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches || /[?&]still\b/.test(window.location.search);
  var HEART = 'M12 20.6c-.3 0-.6-.1-.9-.3C7.3 17.5 3 14.1 3 9.6 3 6.8 5.1 4.6 7.8 4.6c1.7 0 3.2.8 4.2 2.2 1-1.4 2.5-2.2 4.2-2.2C18.9 4.6 21 6.8 21 9.6c0 4.500-4.300 7.900-8.100 10.700-.300.200-.600.300-.900.300Z';

  // If the browser does not run the start animation (a page in the background, a preview tool),
  // the text and the jar still show.
  window.setTimeout(function () { doc.documentElement.classList.add('settled'); }, 2600);

  function $(sel, parent) { return (parent || doc).querySelector(sel); }
  function $$(sel, parent) { return Array.prototype.slice.call((parent || doc).querySelectorAll(sel)); }
  function div(cls) { var d = doc.createElement('div'); d.className = cls; return d; }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function damp(dt, tau) { return 1 - Math.exp(-dt / tau); }
  function r1(n) { return Math.round(n * 10) / 10; }

  // ---------- Sound (only after a tap or a click) ----------

  var Sound = (function () {
    var on = true;
    try { on = window.localStorage.getItem('bk-sound') !== 'off'; } catch (e) { /* no storage */ }
    var cache = {};
    var button = $('#soundToggle');
    function paint() { if (button) button.setAttribute('aria-pressed', on ? 'true' : 'false'); }
    function play(name, volume) {
      if (!on) return;
      try {
        var a = cache[name];
        if (!a) a = cache[name] = new Audio(BASE + 'assets/audio/' + name + '.m4a');
        a.currentTime = 0;
        a.volume = volume == null ? 0.6 : volume;
        var p = a.play();
        if (p && p.catch) p.catch(function () { /* the browser said no */ });
      } catch (e) { /* no sound */ }
    }
    if (button) {
      button.addEventListener('click', function () {
        on = !on;
        try { window.localStorage.setItem('bk-sound', on ? 'on' : 'off'); } catch (e) { /* no storage */ }
        paint();
        if (on) play('tap', 0.5);
      });
    }
    paint();
    return { play: play };
  })();

  // ---------- The meadow ----------

  // The look of the meadow: its season and its time of day (assets/js/look.js).
  // With no look it is a summer day.
  var LOOK = (window.BeeKindLook && window.BeeKindLook.colors) || {
    season: 'summer', time: 'day', sky: ['#7ACBFA', '#B9E7FF'], sun: '#FFD83D', glow: '#FFF6B8', cloud: '#FFFFFF',
    moon: false, stars: false, hills: ['#86D466', '#7ACB5C'],
    crowns: [{ dark: '#29894F', base: '#33A45A', light: '#69BF6B' }, { dark: '#29894F', base: '#33A45A', light: '#69BF6B' }],
    trunk: '#9A6A45', trunkDark: '#7A5033', crownLeaves: [], blossom: '#FFB3D4',
    ground: ['#7DCC5B', '#74C653'], tuft: '#52B34D', shade: '#5CB24B', stem: '#4DAF4A', petal: '#FFFFFF',
    flowers: true, blossoms: false, leaves: false, snow: false
  };

  var sceneSeq = 0;
  var CLOUDS = [
    [0.20, 0.76, 1.00, 5.0], [0.78, 0.90, 0.92, 3.6], [0.55, 0.36, 0.62, 2.6],
    [0.38, 0.58, 0.80, 3.1], [0.93, 0.18, 0.70, 2.2]
  ];
  var FLOWERS = [
    [0.035, 48, 1.0], [0.09, 136, 0.9], [0.16, 70, 0.8], [0.27, 150, 0.95], [0.36, 40, 0.7],
    [0.455, 120, 0.85], [0.545, 60, 0.75], [0.62, 165, 0.9], [0.895, 96, 1.05], [0.76, 160, 0.85],
    [0.955, 27, 0.75], [0.985, 150, 0.9], [0.115, 48, 1.0], [0.70, 64, 0.8]
  ];
  var TUFTS = [
    [0.185, 18, 1.0], [0.06, 105, 0.9], [0.31, 90, 0.9], [0.42, 170, 0.8], [0.5, 25, 0.8],
    [0.84, 27, 1.0], [0.66, 126, 0.8], [0.93, 136, 0.9], [0.24, 30, 0.7], [0.58, 12, 0.7]
  ];
  // Places of the stars: across the page, and how far down the sky.
  var STARS = [
    [0.06, 0.30, 1.0], [0.14, 0.62, 0.7], [0.23, 0.16, 0.8], [0.31, 0.74, 1.0], [0.40, 0.42, 0.6],
    [0.47, 0.86, 0.8], [0.55, 0.22, 0.7], [0.63, 0.66, 1.0], [0.71, 0.36, 0.6], [0.79, 0.80, 0.8],
    [0.86, 0.50, 1.0], [0.94, 0.26, 0.7], [0.19, 0.90, 0.6], [0.68, 0.94, 0.7]
  ];
  // Places of the snow and of the leaves that fall: across the page, the start height, the size
  // and the speed.
  var FALLING = [
    [0.04, 0.10, 1.0, 1.0], [0.11, 0.55, 0.7, 0.8], [0.17, 0.82, 0.9, 1.1], [0.24, 0.30, 0.6, 0.7],
    [0.30, 0.68, 0.8, 0.9], [0.69, 0.20, 0.7, 0.8], [0.75, 0.74, 1.0, 1.0], [0.81, 0.44, 0.6, 0.7],
    [0.87, 0.90, 0.9, 1.1], [0.93, 0.14, 0.8, 0.9], [0.98, 0.60, 0.7, 0.8], [0.08, 0.38, 0.6, 0.9],
    [0.21, 0.02, 0.8, 1.0], [0.78, 0.04, 0.9, 0.9], [0.90, 0.34, 0.7, 1.0], [0.14, 0.96, 0.7, 0.8],
    [0.42, 0.48, 0.8, 0.9], [0.52, 0.08, 0.7, 1.0], [0.60, 0.88, 0.9, 0.8], [0.36, 0.26, 0.6, 1.0]
  ];
  var LEAF_COLORS = ['#E8792B', '#D9A02B', '#D9542B'];

  // The plants at the two sides, as in the app (MeadowView.swift): three at the left side, then
  // three at the right side. The first one of a side is a tree at the edge. The next two are bushes.
  // Each one: the place across a normal phone as a part of its width, the height above the grass
  // edge, and the size.
  var PLANTS = [[0.05, -43, 34], [0.13, -26, 28], [0.215, -8, 20], [0.96, -39, 36], [0.885, -22, 26], [0.8, -8, 18]];
  // The width of a normal phone. The places of the plants were made for it.
  var PLANT_WIDTH = 402;
  // How far the crown of a tree is above its place, as a part of its size. Its trunk shows below.
  var TREE_LIFT = 0.42;

  // A number from 0 to 1. The same `seed` and `step` give the same number each time.
  function chance(seed, step) {
    var v = Math.sin(seed * 12.9898 + step * 78.233) * 43758.5453;
    return v - Math.floor(v);
  }

  // The round parts of the crown of one plant: the middle and the size of each, as parts of the
  // size of the plant. The first one is the core. The others stand around it, each with its own
  // size, and make the leafy edge. So a crown is one shape with bumps, not a ball.
  function crownParts(seed, tree) {
    var wide = tree ? 1 : 1.14, tall = tree ? 1 : 0.86;
    var parts = [[0, 0, 0.72]];
    for (var k = 0; k < 7; k++) {
      var angle = (k + chance(seed, k) * 0.45) / 7 * 2 * Math.PI;
      var distance = 0.58 + chance(seed, k + 20) * 0.10;
      var size = 0.30 + chance(seed, k + 40) * 0.10;
      parts.push([Math.cos(angle) * distance * wide, Math.sin(angle) * distance * tall, size]);
    }
    return parts;
  }

  // The middle of one plant across the page. The size of a plant follows `unit`, not the width.
  // So on a wide screen the plants of a side keep the distance that they have on a phone, from
  // the near edge. Then they stay one group, and they do not come apart.
  function plantX(x, width, unit) {
    var left = x < 0.5;
    var part = left ? x : 1 - x;
    var fromEdge = Math.min(part * width, part * PLANT_WIDTH * unit);
    return left ? fromEdge : width - fromEdge;
  }

  function crownSvg(parts, mx, my, r, fill) {
    var out = '<g fill="' + fill + '">';
    for (var i = 0; i < parts.length; i++) {
      out += '<circle cx="' + r1(mx + parts[i][0] * r) + '" cy="' + r1(my + parts[i][1] * r) + '" r="' + r1(parts[i][2] * r) + '"/>';
    }
    return out + '</g>';
  }

  /**
   * One tree or one bush: a leafy crown with a dark side, a light side and, in autumn, single
   * leaves in other colors. A tree has a trunk. `size` is the size of the small parts, `sunX` is
   * the place of the sun across the page: the light comes from its side. `inset` moves the plant
   * away from its edge of the page.
   */
  function plantSvg(index, w, H, u, hill, size, sunX, inset) {
    var p = PLANTS[index];
    var tree = index % 3 === 0;
    var r = p[2] * size;
    var mx = plantX(p[0], w, size) + (p[0] < 0.5 ? inset : -inset);
    var my = H + (p[1] - (tree ? TREE_LIFT * p[2] : 0)) * u * hill;
    var tones = LOOK.crowns[index % 3 === 1 ? 1 : 0];
    var parts = crownParts(index, tree);
    var side = sunX >= mx ? 1 : -1;
    var out = '', k;

    if (tree) {
      // The trunk goes from the crown down into the grass. The grass hides its foot.
      var footY = H + 14 * u, topY = my + r * 0.25, midY = (footY + topY) / 2;
      out += '<path fill="' + LOOK.trunk + '" d="M' + r1(mx - r * 0.21) + ' ' + r1(footY) +
        'Q' + r1(mx - r * 0.12) + ' ' + r1(midY) + ' ' + r1(mx - r * 0.12) + ' ' + r1(topY) +
        'L' + r1(mx + r * 0.12) + ' ' + r1(topY) +
        'Q' + r1(mx + r * 0.12) + ' ' + r1(midY) + ' ' + r1(mx + r * 0.21) + ' ' + r1(footY) + 'Z"/>';
      // The side of the trunk away from the sun is darker.
      out += '<path fill="' + LOOK.trunkDark + '" d="M' + r1(mx - side * r * 0.21) + ' ' + r1(footY) +
        'Q' + r1(mx - side * r * 0.12) + ' ' + r1(midY) + ' ' + r1(mx - side * r * 0.12) + ' ' + r1(topY) +
        'L' + r1(mx - side * r * 0.02) + ' ' + r1(topY) +
        'Q' + r1(mx - side * r * 0.02) + ' ' + r1(midY) + ' ' + r1(mx - side * r * 0.06) + ' ' + r1(footY) + 'Z"/>';
    }

    out += crownSvg(parts, mx, my, r, tones.dark);
    // The main color lies a little to the side of the sun. The dark tone stays as an edge at the
    // other side: this makes the crown look round and full.
    out += crownSvg(parts, mx + side * r * 0.05, my - r * 0.07, r * 0.92, tones.base);
    if (LOOK.snow) {
      // Snow lies on the top of each crown. A green edge stays around it.
      out += crownSvg(parts, mx + side * r * 0.05, my - r * 0.24, r * 0.68, LOOK.hills[0]);
    } else {
      // The leaves in the sun: the same leafy shape, smaller, at the side of the sun.
      out += crownSvg(parts, mx + side * r * 0.17, my - r * 0.22, r * 0.58, tones.light);
    }
    // Single leaves in other colors, in autumn.
    for (k = 0; k < 7 && LOOK.crownLeaves.length; k++) {
      var angle = chance(index, k + 60) * 2 * Math.PI;
      var distance = 0.18 + chance(index, k + 80) * 0.52;
      var lx = r1(mx + Math.cos(angle) * distance * r), ly = r1(my + Math.sin(angle) * distance * r * 0.9);
      out += '<ellipse cx="' + lx + '" cy="' + ly + '" rx="' + r1(0.13 * r) + '" ry="' + r1(0.07 * r) +
        '" transform="rotate(' + r1(chance(index, k + 100) * 180) + ' ' + lx + ' ' + ly + ')" fill="' +
        LOOK.crownLeaves[(index + k) % LOOK.crownLeaves.length] + '"/>';
    }
    // Pink blossoms on the trees and the bushes in spring.
    for (k = 0; k < 5 && LOOK.blossoms; k++) {
      var a = k * 1.3 + index;
      out += '<circle cx="' + r1(mx + Math.cos(a) * r * 0.55) + '" cy="' + r1(my + Math.sin(a) * r * 0.5 - r * 0.1) +
        '" r="' + r1(4.2 * size) + '" fill="' + LOOK.blossom + '"/>';
    }
    return out;
  }

  // In spring some flowers are pink and some are white.
  function flowerSvg(w, h, n) {
    var color = LOOK.season === 'spring' && n % 2 === 1 ? '#FFFFFF' : LOOK.petal;
    var petals = '';
    for (var i = 0; i < 5; i++) {
      var a = i / 5 * 2 * Math.PI - Math.PI / 2;
      petals += '<circle cx="' + r1(Math.cos(a) * 6.2) + '" cy="' + r1(-19 + Math.sin(a) * 6.2) + '" r="5.4" fill="' + color + '"/>';
    }
    return '<svg viewBox="-13 -32 26 33" width="' + r1(w) + '" height="' + r1(h) + '">' +
      '<path d="M0 0Q3 -8 0 -15" fill="none" stroke="' + LOOK.stem + '" stroke-width="2.6" stroke-linecap="round"/>' +
      petals + '<circle cx="0" cy="-19" r="4.4" fill="#FFD23F"/></svg>';
  }

  // A leaf that lies on the grass in autumn, where a flower is in summer.
  function leafSvg(w, h, n) {
    return '<svg viewBox="-9 -9 18 10" width="' + r1(w) + '" height="' + r1(h) + '">' +
      '<ellipse cx="0" cy="-4" rx="7.5" ry="4" transform="rotate(' + (n * 47 % 180) + ' 0 -4)" fill="' + LEAF_COLORS[n % 3] + '"/></svg>';
  }

  function tuftSvg(w, h) {
    var blades = [[-5, -8, 11], [0, 0, 15], [5, 8, 11]];
    var d = '';
    for (var i = 0; i < blades.length; i++) {
      var b = blades[i];
      d += '<path d="M' + b[0] + ' 0Q' + b[0] + ' ' + r1(-b[2] * 0.6) + ' ' + b[1] + ' ' + (-b[2]) + '"/>';
    }
    return '<svg viewBox="-12 -17 24 18" width="' + r1(w) + '" height="' + r1(h) + '">' +
      '<g fill="none" stroke="' + LOOK.tuft + '" stroke-width="4" stroke-linecap="round">' + d + '</g></svg>';
  }

  function buildScene(host) {
    var id = 'scene' + (++sceneSeq);
    var sky = div('scene__sky');
    host.appendChild(sky);

    // Stars at night, behind the moon and the clouds.
    var stars = null;
    if (LOOK.stars) {
      stars = div('scene__stars');
      sky.appendChild(stars);
    }

    var sun = div('sun');
    var glowDefs = '<defs><radialGradient id="' + id + 'glow" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="87">' +
      '<stop offset=".19" stop-color="' + LOOK.glow + '" stop-opacity="' + (LOOK.moon ? '.48' : '.8') + '"/>' +
      '<stop offset=".6" stop-color="' + LOOK.glow + '" stop-opacity="' + (LOOK.moon ? '.15' : '.25') + '"/>' +
      '<stop offset="1" stop-color="' + LOOK.glow + '" stop-opacity="0"/></radialGradient>';
    if (LOOK.moon) {
      // At night the moon is in the place of the sun: a thin moon, with no rays.
      sun.innerHTML = '<svg viewBox="-100 -100 200 200">' + glowDefs +
        '<mask id="' + id + 'moon"><rect x="-100" y="-100" width="200" height="200" fill="#fff"/>' +
        '<circle cx="12.9" cy="-6.2" r="24.6" fill="#000"/></mask></defs>' +
        '<circle class="sun__glow" r="87" fill="url(#' + id + 'glow)"/>' +
        '<circle r="29.4" fill="' + LOOK.sun + '" mask="url(#' + id + 'moon)"/></svg>';
    } else {
      var rays = '';
      for (var i = 0; i < 8; i++) {
        var a = i / 8 * 2 * Math.PI;
        rays += '<line x1="' + r1(Math.cos(a) * 39.8) + '" y1="' + r1(Math.sin(a) * 39.8) +
          '" x2="' + r1(Math.cos(a) * 52) + '" y2="' + r1(Math.sin(a) * 52) + '"/>';
      }
      sun.innerHTML = '<svg viewBox="-100 -100 200 200">' + glowDefs + '</defs>' +
        '<circle class="sun__glow" r="87" fill="url(#' + id + 'glow)"/>' +
        '<g class="sun__rays" stroke="' + LOOK.sun + '" stroke-width="7.3" stroke-linecap="round">' + rays + '</g>' +
        '<circle r="28" fill="' + LOOK.sun + '"/></svg>';
    }
    sky.appendChild(sun);

    var clouds = [];
    for (var c = 0; c < CLOUDS.length; c++) {
      var cloud = div('cloud');
      cloud.innerHTML = '<div class="cloud__bob"><svg viewBox="-1 -0.56 2 1.07"><g fill="' + LOOK.cloud + '">' +
        '<rect x="-1" y="-.12" width="2" height=".62" rx=".31"/><circle cx="-.17" cy="-.1" r=".45"/>' +
        '<circle cx=".34" cy="-.03" r=".39"/></g></svg></div>';
      sky.appendChild(cloud);
      clouds.push(cloud);
    }

    var hills = doc.createElementNS(NS, 'svg');
    hills.setAttribute('class', 'scene__hills');
    host.appendChild(hills);
    var plants = div('scene__plants');
    host.appendChild(plants);

    // Snow in winter and a few leaves in autumn fall slowly.
    var fall = null;
    if (LOOK.snow || LOOK.leaves) {
      fall = div('scene__fall');
      host.appendChild(fall);
    }

    /**
     * Puts the parts in their places.
     * `horizon` is the height of the grass edge in pixels. `opts.avoid` is a list of boxes
     * with no flowers. `opts.sunX` is the place of the sun, from 0 to 1. `opts.clear` is a list
     * of boxes with text or glass: snow and leaves do not fall across them.
     */
    function layout(horizon, opts) {
      opts = opts || {};
      var w = host.clientWidth, h = host.clientHeight;
      if (!w || !h) return;
      var u = clamp(w / 430, 1, 2.2);
      var wide = w > 760;
      // The far hills are lower on a wide screen, so that more sky stays free.
      var hill = wide ? 0.62 : 1;
      var k;

      // Sun
      var sunX = (opts.sunX == null ? (wide ? 0.9 : 0.84) : opts.sunX) * w;
      var sunSize = 200 * u * (wide ? 0.82 : 0.9);
      sun.style.setProperty('--sun', r1(sunSize) + 'px');
      sun.style.setProperty('--sx', r1(sunX) + 'px');
      sun.style.setProperty('--sy', r1(Math.max(opts.sunTop || 110, horizon - (wide ? 150 : 165) * u)) + 'px');

      // Clouds drift across the sky. They stay above the hills.
      var skyTop = opts.skyTop == null ? 84 : opts.skyTop;
      var skyBottom = horizon - 70 * u * hill;
      if (opts.skyBottom != null) skyBottom = Math.min(skyBottom, opts.skyBottom);
      var bandH = Math.max(skyBottom - skyTop, 60);
      for (k = 0; k < clouds.length; k++) {
        var spec = CLOUDS[k];
        if (k >= 3 && !wide) { clouds[k].style.display = 'none'; continue; }
        clouds[k].style.display = '';
        var cw = 42 * u * spec[2] * 2;
        var speed = spec[3] * u * 1.5;
        var span = w + cw + 40;
        clouds[k].style.setProperty('--cw', r1(cw) + 'px');
        clouds[k].style.setProperty('--cy', r1(clamp(skyTop + spec[1] * bandH - cw * 0.27, skyTop - 10, Math.max(skyTop - 10, skyBottom - cw * 0.54))) + 'px');
        clouds[k].style.setProperty('--dur', r1(span / speed) + 's');
        clouds[k].style.setProperty('--delay', r1(-(spec[0] * w + cw) / speed) + 's');
        clouds[k].style.setProperty('--rest', r1(spec[0] * w) + 'px');
      }

      // Stars: in the sky above the hills.
      var html = '';
      if (stars) {
        var starBottom = Math.max(skyTop + 1, horizon - 120 * u * hill);
        for (k = 0; k < STARS.length; k++) {
          var sd = r1(3.8 * u * STARS[k][2]);
          html += '<i class="star' + (reduce ? ' star--still' : '') + '" style="left:' + r1(STARS[k][0] * w) + 'px;top:' +
            r1(skyTop + STARS[k][1] * (starBottom - skyTop)) + 'px;width:' + sd + 'px;height:' + sd + 'px;--tw:' +
            r1(3.5 + (k % 4) * 1.1) + 's;--delay:' + r1(-k * 0.7) + 's"></i>';
        }
        stars.innerHTML = html;
      }

      // Hills, trees and bushes, and the near ground
      var H = horizon;
      var size = u * (wide ? 0.9 : 1);
      // On a wide screen each group stands a little away from the edge: the whole tree shows.
      var inset = wide ? 20 * size : 0;
      var s = '<defs><linearGradient id="' + id + 'ground" gradientUnits="userSpaceOnUse" x1="0" y1="' + r1(H - 40 * u) +
        '" x2="0" y2="' + h + '"><stop offset="0" stop-color="' + LOOK.ground[0] + '"/><stop offset="1" stop-color="' + LOOK.ground[1] + '"/></linearGradient></defs>';
      s += '<ellipse cx="' + r1(w * 0.16) + '" cy="' + r1(H + 101 * u * hill) + '" rx="' + r1(w * 0.72) + '" ry="' + r1(214 * u * hill) + '" fill="' + LOOK.hills[0] + '"/>';
      s += '<ellipse cx="' + r1(w * 0.9) + '" cy="' + r1(H + 118 * u * hill) + '" rx="' + r1(w * 0.66) + '" ry="' + r1(218 * u * hill) + '" fill="' + LOOK.hills[1] + '"/>';
      // A tree and two bushes at each side, from the back to the front.
      for (k = 0; k < PLANTS.length; k++) {
        s += plantSvg(k, w, H, u, hill, size, sunX, inset);
      }
      s += '<path d="M0 ' + r1(H) + 'C' + r1(w * 0.3) + ' ' + r1(H - 39 * u) + ' ' + r1(w * 0.7) + ' ' + r1(H + 35 * u) + ' ' + w + ' ' + r1(H + 4 * u) +
        'L' + w + ' ' + (h + 600) + 'L0 ' + (h + 600) + 'Z" fill="url(#' + id + 'ground)"/>';
      hills.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
      hills.setAttribute('preserveAspectRatio', 'xMidYMin slice');
      hills.innerHTML = s;

      // Flowers and grass move in the breeze. In autumn leaves lie on the grass in place of the
      // flowers. In winter there are no flowers.
      var avoid = opts.avoid || [];
      function free(x, y) {
        for (var a = 0; a < avoid.length; a++) {
          var b = avoid[a];
          if (x > b.left && x < b.right && y > b.top && y < b.bottom) return false;
        }
        return y < h - 14 && y > H + 8;
      }
      html = '';
      function plant(list, make, bw, bh, every, still) {
        for (var n = 0; n < list.length; n++) {
          if (!wide && n % every !== 0) continue;
          var x = list[n][0] * w, y = H + list[n][1] * u;
          var sz = list[n][2] * u * (wide ? 0.82 : 1);
          if (!free(x, y)) continue;
          html += '<div class="plant' + (still ? ' plant--still' : '') + '" style="left:' + r1(x) + 'px;top:' + r1(y) + 'px;--sd:' + r1(2.8 + (n % 4) * 0.5) +
            's;--delay:' + r1(-list[n][0] * 7) + 's">' + make(bw * sz, bh * sz, n) + '</div>';
        }
      }
      plant(TUFTS, tuftSvg, 24, 18, 2, false);
      if (LOOK.flowers) plant(FLOWERS, flowerSvg, 26, 33, 2, false);
      else if (LOOK.leaves) plant(FLOWERS, leafSvg, 18, 10, 2, true);
      plants.innerHTML = html;

      // Snow and leaves that fall. They stay below the top bar, and they do not fall across a
      // box with text or across the glass of the jar.
      if (fall) {
        var clear = opts.clear || [];
        var fallTop = skyTop - 20, fallSpan = Math.max(1, h - fallTop);
        html = '';
        for (k = 0; k < FALLING.length; k++) {
          var f = FALLING[k];
          // Leaves are fewer than snowflakes.
          if (LOOK.leaves && k % 3 !== 0) continue;
          if (!wide && k >= 16) continue;
          var fx = f[0] * w, blocked = false;
          for (var cb = 0; cb < clear.length; cb++) {
            if (fx > clear[cb].left && fx < clear[cb].right) blocked = true;
          }
          if (blocked) continue;
          var dur = fallSpan / (9 * u * f[3] * (LOOK.leaves ? 1.2 : 1));
          var bit;
          if (LOOK.snow) {
            var d = r1((1.6 + 1.5 * f[2]) * u * 2);
            bit = '<i class="fall__bit" style="width:' + d + 'px;height:' + d + 'px;background:#fff"></i>';
          } else {
            bit = '<i class="fall__bit fall__bit--leaf" style="width:' + r1(12 * u * f[2]) + 'px;height:' + r1(6.4 * u * f[2]) +
              'px;background:' + LEAF_COLORS[k % 3] + ';--turn:' + (k * 41 % 360) + 'deg"></i>';
          }
          if (reduce) {
            html += '<div class="fall fall--still" style="left:' + r1(fx) + 'px;top:' + r1(fallTop + f[1] * fallSpan) + 'px">' + bit + '</div>';
          } else {
            html += '<div class="fall" style="left:' + r1(fx) + 'px;--y0:' + r1(fallTop) + 'px;--y1:' + r1(h) + 'px;--dur:' + r1(dur) +
              's;--delay:' + r1(-f[1] * dur) + 's"><div class="fall__sway" style="--sway:' + r1(7 * u) + 'px;--delay:' + r1(-k * 2.1) + 's">' + bit + '</div></div>';
          }
        }
        fall.innerHTML = html;
      }
    }

    return { host: host, sky: sky, layout: layout };
  }

  // ---------- Hero: the live jar ----------

  var hero = $('.hero');
  var stage = $('#jarStage');
  var jarBee = BK.createBee({ mode: 'ring' });
  var jar = BK.createJar({ goal: 5, bee: jarBee, level: 0.4, shade: LOOK.shade });
  stage.appendChild(jar.el);
  jarBee.setFlap(reduce ? 'off' : 'slow');

  var heroScene = buildScene($('.scene[data-scene="hero"]'));
  var outro = $('.outro');
  var outroScene = buildScene($('.scene[data-scene="outro"]'));

  function boxIn(el, parentRect, pad) {
    var r = el.getBoundingClientRect();
    return { left: r.left - parentRect.left - pad, right: r.right - parentRect.left + pad, top: r.top - parentRect.top - pad, bottom: r.bottom - parentRect.top + pad };
  }

  function layoutScenes() {
    jar.measure();
    var hr = hero.getBoundingClientRect();
    var jr = jar.el.getBoundingClientRect();
    var jarW = jr.width * 1000 / 1140;
    var horizon = (jr.top - hr.top) + 0.58 * jarW;
    heroScene.layout(horizon, {
      skyBottom: (jr.top - hr.top) + 0.1 * jarW,
      avoid: [boxIn(jar.el, hr, 4), boxIn($('.hero__copy'), hr, 14), boxIn($('.demo__actions'), hr, 16)],
      // Snow and leaves do not fall behind the glass of the jar. On a wide screen they also stay
      // out of the column with the text.
      clear: hr.width > 760 ? [boxIn(jar.el, hr, 8), boxIn($('.hero__copy'), hr, 10)] : [boxIn(jar.el, hr, 8)]
    });

    var or = outro.getBoundingClientRect();
    outroScene.layout(or.height * 0.7, {
      // On a narrow screen the sun goes to the left edge, away from the app name and the badge.
      sunX: or.width < 520 ? 0 : 0.12, skyTop: 130, sunTop: 170,
      avoid: [boxIn($('.foot'), or, 10), boxIn($('.outro__inner .store'), or, 20)],
      clear: or.width > 760 ? [boxIn($('#outro-title'), or, 10), boxIn($('.outro__inner .store'), or, 10)] : []
    });
    if (reduce) jar.draw(0, false);
  }

  // ---------- The count and the acts ----------

  var GOAL = 5;
  var counts = { others: 1, me: 1 };
  var countBig = $('#countBig'), countSmall = $('#countSmall');
  var tagOthers = $('#tagOthers'), tagMe = $('#tagMe');
  var addButton = $('#addAct'), againButton = $('#startAgain');
  var sheet = $('#actSheet');

  function total() { return counts.others + counts.me; }
  function waits() { return total() >= GOAL && counts.others < 1; }
  function isFull() { return total() >= GOAL && counts.others >= 1; }
  function levelNow() {
    if (waits()) return (GOAL - 0.4) / GOAL;
    return Math.min(total() / GOAL, 1);
  }

  function paintCount(pop) {
    var full = isFull();
    countBig.textContent = full ? 'Jar full!' : total() + ' of ' + GOAL;
    countSmall.textContent = full ? total() + ' kind acts today' : 'kind acts today';
    tagOthers.textContent = waits() ? '1 more for others' : counts.others + ' for others';
    tagMe.textContent = counts.me + ' for me';
    againButton.hidden = !full;
    if (pop && !reduce) {
      countBig.classList.remove('is-pop');
      void countBig.offsetWidth;
      countBig.classList.add('is-pop');
    }
  }

  // The moods of the bee. Each one is a start time in seconds, or a very old time.
  var mood = { cheerAt: -99, giggleAt: -99, partyAt: -99 };
  var clock = 0;

  function addAct(kind) {
    var wasFull = isFull();
    counts[kind === 'me' ? 'me' : 'others'] += 1;
    paintCount(true);
    jar.setLevel(levelNow(), reduce);
    if (reduce) jar.draw(0, false);
    Sound.play('plop', 0.7);
    mood.cheerAt = clock;
    if (!wasFull && isFull()) {
      mood.partyAt = clock + 0.35;
      window.setTimeout(function () { Sound.play('fanfare', 0.5); }, 350);
      startConfetti();
    }
  }

  addButton.addEventListener('click', function () {
    Sound.play('tap', 0.5);
    if (sheet.showModal) sheet.showModal();
  });
  $('#sheetClose').addEventListener('click', function () { sheet.close(); });
  sheet.addEventListener('click', function (e) { if (e.target === sheet) sheet.close(); });
  $$('.act', sheet).forEach(function (button) {
    button.addEventListener('click', function () {
      sheet.close();
      addAct(button.getAttribute('data-for'));
    });
  });
  againButton.addEventListener('click', function () {
    counts.others = 0;
    counts.me = 0;
    mood.partyAt = -99;
    paintCount(true);
    jar.setLevel(0, reduce);
    if (reduce) jar.draw(0, false);
    Sound.play('tap', 0.5);
  });
  paintCount(false);

  // ---------- The small jar in "How it works" ----------

  var miniHost = $('#miniJar');
  var mini = BK.createJar({ goal: 5 });
  miniHost.appendChild(mini.el);
  var miniClock = 0;
  function stepMini(t, dt) {
    miniClock = (miniClock + dt) % 9;
    var acts = Math.min(5, Math.floor(miniClock / 1.15));
    var level = miniClock > 7.8 ? 0 : acts / 5;
    if (Math.abs(level - mini.target) > 0.001) {
      mini.target = level;
      mini.setLevel(level);
    }
    mini.step(dt);
    mini.draw(t, true);
  }
  mini.target = 0;
  if (reduce) { mini.setLevel(0.6, true); mini.draw(0, false); }

  // ---------- Things for the bee to wear ----------

  var looks = $$('.look');
  looks.forEach(function (button) {
    var name = button.getAttribute('data-item');
    var head = BK.createBee({ mode: 'head', item: name });
    $('.look__bee', button).appendChild(head.el);
    button.addEventListener('click', function () {
      looks.forEach(function (other) {
        var on = other === button;
        other.classList.toggle('is-on', on);
        other.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      jarBee.setItem(name);
      flyBee.setItem(name);
      mood.cheerAt = clock;
      Sound.play('tap', 0.5);
    });
  });

  // ---------- The bee that flies with you ----------

  var flyBee = BK.createBee({ mode: 'flying' });
  var flyer = div('flyer');
  flyer.appendChild(flyBee.el);
  var hit = doc.createElement('button');
  hit.type = 'button';
  hit.className = 'flyer__hit';
  hit.tabIndex = -1;
  hit.setAttribute('aria-hidden', 'true');
  flyer.appendChild(hit);
  doc.body.appendChild(flyer);

  var F = {
    out: false, x: 0, y: 0, vx: 0, vy: 0, size: 120, shown: 0, base: 120,
    flip: 1, face: 1, tilt: 0, antLag: 0, ox: -0.62, oy: -0.5,
    px: 0, py: 0, hasPointer: false, tapUntil: -1, lastSpark: 0,
    nextBlink: 2.5, blinkAt: -9, hitOn: true
  };
  var heroInView = true;
  var perchHeads = $$('main h2');

  function baseSize() {
    var w = window.innerWidth;
    return w < 600 ? 92 : (w < 1000 ? 108 : 124);
  }

  function undock() {
    if (F.out || reduce) return;
    var box = jar.beeBox();
    F.size = box.size;
    F.x = box.left + box.size / 2;
    F.y = box.top + box.size / 2;
    F.vx = 60;
    F.vy = -520;
    F.flip = 1;
    F.out = true;
    flyer.classList.add('is-out');
    flyBee.setItem(jarBee.getItem());
    flyBee.setFlap('fast');
    jarBee.setBodyVisible(false);
  }

  function dock() {
    F.out = false;
    flyer.classList.remove('is-out');
    flyBee.setFlap('off');
    jarBee.setBodyVisible(true);
  }

  /** Where the bee rests when it does not follow a pointer. */
  function pickPerch() {
    var vw = window.innerWidth, vh = window.innerHeight;
    if (heroInView) {
      var sr = stage.getBoundingClientRect();
      var seen = Math.min(sr.bottom, vh) - Math.max(sr.top, 0);
      if (seen > sr.height * 0.6) return { home: true };
    }
    var best = null, bestGap = 1e9;
    for (var i = 0; i < perchHeads.length; i++) {
      var r = perchHeads[i].getBoundingClientRect();
      if (r.bottom < 40 || r.top > vh - 60) continue;
      var gap = Math.abs((r.top + r.bottom) / 2 - vh * 0.36);
      if (gap < bestGap) { bestGap = gap; best = r; }
    }
    if (best) {
      return {
        x: clamp(best.right + F.base * 0.25, F.base * 0.6, vw - F.base * 0.6),
        y: clamp(best.top - F.base * (vw < 700 ? 0.66 : 0.3), F.base * 0.6, vh - F.base * 0.6),
        face: -1
      };
    }
    return { x: vw - F.base * 0.62, y: vh * 0.26, face: -1 };
  }

  function envelope(start, length) {
    var u = (clock - start) / length;
    if (u <= 0 || u >= 1) return 0;
    return Math.sin(Math.PI * u);
  }
  function partyNow() {
    var age = clock - mood.partyAt;
    if (age < 0 || age > 6.5) return 0;
    return Math.min(1, age / 0.3) * Math.min(1, (6.5 - age) / 0.6);
  }

  function blinkValue(state, t) {
    if (t >= state.nextBlink) {
      state.blinkAt = t;
      state.nextBlink = t + 2.6 + Math.random() * 4.2;
    }
    var bu = (t - state.blinkAt) / 0.3;
    return bu < 1 ? Math.abs(Math.cos(bu * Math.PI)) : 1;
  }

  function sharedPose(p, t) {
    var cheer = envelope(mood.cheerAt, 1.2);
    var giggle = envelope(mood.giggleAt, 1.3);
    var party = partyNow();
    p.happy = Math.max(cheer, giggle, party);
    p.armRaise = Math.max(cheer * 0.9, party);
    p.breathe = Math.sin(t * 1.4);
    return { cheer: cheer, giggle: giggle, party: party };
  }

  function giggle(x, y) {
    mood.giggleAt = clock;
    Sound.play('giggle', 0.7);
    if (reduce) return;
    for (var i = 0; i < 6; i++) {
      var h = div('pop-heart');
      h.innerHTML = '<svg viewBox="0 0 24 24"><path d="' + HEART + '"/></svg>';
      var a = -Math.PI / 2 + (i - 2.5) * 0.42 + (Math.random() - 0.5) * 0.3;
      var far = 70 + Math.random() * 60;
      h.style.setProperty('--x0', r1(x - 13) + 'px');
      h.style.setProperty('--y0', r1(y - 13) + 'px');
      h.style.setProperty('--x1', r1(x - 13 + Math.cos(a) * far) + 'px');
      h.style.setProperty('--y1', r1(y - 13 + Math.sin(a) * far) + 'px');
      h.style.setProperty('--r0', r1((Math.random() - 0.5) * 40) + 'deg');
      h.style.setProperty('--r1', r1((Math.random() - 0.5) * 60) + 'deg');
      h.style.animationDelay = (i * 45) + 'ms';
      doc.body.appendChild(h);
      (function (el) { window.setTimeout(function () { el.remove(); }, 1500); })(h);
    }
  }

  hit.addEventListener('click', function () { giggle(F.x + F.size * 0.1 * F.flip, F.y - F.size * 0.2); });
  jarBee.el.addEventListener('click', function () {
    var box = jar.beeBox();
    giggle(box.left + box.size * 0.62, box.top + box.size * 0.3);
  });

  // The sparks behind the bee when it flies fast.
  var sparks = [];
  var sparkNext = 0;
  if (!reduce) {
    for (var sp = 0; sp < 12; sp++) {
      var dot = div('spark');
      doc.body.appendChild(dot);
      sparks.push(dot);
    }
  }
  function spark(x, y) {
    var el = sparks[sparkNext];
    sparkNext = (sparkNext + 1) % sparks.length;
    el.classList.remove('is-go');
    el.style.transform = 'translate3d(' + r1(x) + 'px,' + r1(y) + 'px,0)';
    void el.offsetWidth;
    el.classList.add('is-go');
  }

  function fly(t, dt) {
    var vw = window.innerWidth, vh = window.innerHeight;
    var tx, ty, face = F.face, k = 40, c = 10.5, home = false, sizeTarget = F.base;
    var following = F.hasPointer || t < F.tapUntil;

    if (following) {
      // The bee stays up and to the left of the pointer, and looks at it.
      var wantX = F.px < F.base * 1.25 ? 0.62 : -0.62;
      var wantY = F.py < F.base * 1.15 ? 0.62 : -0.5;
      F.ox += (wantX - F.ox) * damp(dt, 0.25);
      F.oy += (wantY - F.oy) * damp(dt, 0.25);
      tx = F.px + F.ox * F.base;
      ty = F.py + F.oy * F.base;
      // When the mouse comes slowly to the bee, the bee stays there, so you can touch it.
      // A bee that flies fast does not stop on its way past the pointer.
      var reach = Math.hypot(F.px - F.x, F.py - F.y);
      var caught = F.hold ? reach < F.size * 0.6 : (reach < F.size * 0.44 && Math.hypot(F.vx, F.vy) < 260);
      F.hold = F.hasPointer && caught;
      if (F.hold) {
        tx = F.x;
        ty = F.y;
      }
    } else {
      var perch = pickPerch();
      k = 15; c = 7.2;
      if (perch.home) {
        var box = jar.beeBox();
        home = true;
        tx = box.left + box.size / 2;
        ty = box.top + box.size / 2;
        sizeTarget = box.size;
      } else {
        tx = perch.x;
        ty = perch.y;
        face = perch.face;
      }
    }

    var ax = (tx - F.x) * k - F.vx * c;
    var ay = (ty - F.y) * k - F.vy * c;
    F.vx = clamp(F.vx + ax * dt, -2400, 2400);
    F.vy = clamp(F.vy + ay * dt, -2400, 2400);
    F.x += F.vx * dt;
    F.y += F.vy * dt;
    var speed = Math.hypot(F.vx, F.vy);
    var dist = Math.hypot(tx - F.x, ty - F.y);

    if (home && dist < 9 && speed < 110) { dock(); return; }

    // Which way the bee looks
    if (home && dist < 170) face = 1;
    else if (speed > 110) face = F.vx > 0 ? 1 : -1;
    else if (following) face = F.px >= F.x ? 1 : -1;
    F.face = face;
    F.flip += (face - F.flip) * damp(dt, 0.11);

    F.size += (sizeTarget - F.size) * damp(dt, 0.22);
    if (Math.abs(F.size - F.shown) > 0.5) {
      F.shown = F.size;
      flyer.style.width = r1(F.size) + 'px';
      flyer.style.height = r1(F.size) + 'px';
    }

    var calm = home ? clamp(dist / 120, 0, 1) : 1;
    var hover = clamp(1 - speed / 500, 0, 1) * calm;
    var bobX = (Math.sin(t * 1.7) * 4 + Math.sin(t * 0.9 + 1) * 3) * hover;
    var bobY = Math.sin(t * 2.3) * 6 * hover;
    var tiltWant = clamp(F.vx * 0.034, -22, 22) * calm + Math.sin(t * 1.1) * 2 * hover;
    F.tilt += (tiltWant - F.tilt) * damp(dt, 0.09);
    flyer.style.transform = 'translate3d(' + r1(F.x + bobX - F.size / 2) + 'px,' + r1(F.y + bobY - F.size / 2) +
      'px,0) rotate(' + r1(F.tilt) + 'deg) scaleX(' + (Math.round(F.flip * 100) / 100) + ')';

    // Only a bee that is almost still takes a click. A fast bee lets clicks go through.
    var hitOn = speed < 140;
    if (hitOn !== F.hitOn) {
      F.hitOn = hitOn;
      hit.style.pointerEvents = hitOn ? 'auto' : 'none';
    }

    // Pose
    var p = flyBee.pose;
    var m = sharedPose(p, t);
    var side = F.flip < 0 ? -1 : 1;
    if (following) {
      var fx = F.x + 0.167 * F.size * side;
      p.lookX = clamp((F.px - fx) / F.size * 60, -28, 28) * side;
      p.lookY = clamp((F.py - F.y) / F.size * 60, -20, 20);
    } else {
      p.lookX = Math.sin(t * 0.5) * 12;
      p.lookY = Math.sin(t * 0.37 + 1) * 5 + 3;
    }
    F.antLag += (clamp(-F.vx * side * 0.035, -24, 24) - F.antLag) * damp(dt, 0.3);
    var wiggle = m.giggle * Math.sin(t * 34) * 9;
    p.antL = Math.sin(t * 1.5) * 3.5 + F.antLag + wiggle + m.party * Math.sin(t * 9) * 6;
    p.antR = Math.sin(t * 1.3 + 1.4) * 3.5 + F.antLag + wiggle - m.party * Math.sin(t * 9) * 6;
    p.foot = Math.sin(t * 1.9) * 5 + clamp(-F.vx * side * 0.02, -16, 16) + m.giggle * Math.sin(t * 26) * 8 + m.party * Math.sin(t * 8.4) * 10;
    p.head = clamp(F.vy * 0.006, -5, 5) + m.party * Math.sin(t * 6) * 3 + m.giggle * Math.sin(t * 20) * 2.5;
    p.eyeOpen = blinkValue(F, t);
    flyBee.apply();
    flyBee.setFlapRate(clamp(0.85 + speed / 420, 0.85, 2.4));

    if (speed > 330 && t - F.lastSpark > 0.055) {
      F.lastSpark = t;
      spark(F.x - side * F.size * 0.26 - 4, F.y + F.size * 0.08 - 4);
    }
  }

  // The bee in the jar
  var jarEyes = { nextBlink: 3.5, blinkAt: -9 };
  function poseJarBee(t) {
    var p = jarBee.pose;
    var m = sharedPose(p, t);
    p.antL = Math.sin(t * 1.5) * 3.5 + m.cheer * 6 + m.giggle * Math.sin(t * 34) * 9;
    p.antR = Math.sin(t * 1.3 + 1.4) * 3.5 - m.cheer * 6 + m.giggle * Math.sin(t * 34) * 9;
    p.foot = Math.sin(t * 1.9) * 5 + m.party * Math.sin(t * 8.4) * 10 + m.giggle * Math.sin(t * 26) * 8;
    p.head = m.party * Math.sin(t * 6) * 3;
    p.hop = (m.cheer * 90 + m.party * Math.abs(Math.sin(t * 5.2)) * 120);
    p.eyeOpen = blinkValue(jarEyes, t);
    if (F.hasPointer) {
      var box = jar.beeBox();
      p.lookX = clamp((F.px - (box.left + box.size * 0.66)) / box.size * 40, -28, 28);
      p.lookY = clamp((F.py - (box.top + box.size * 0.5)) / box.size * 40, -20, 20);
    } else {
      p.lookX = Math.sin(t * 0.45) * 10;
      p.lookY = Math.sin(t * 0.33 + 1) * 4;
    }
    jarBee.apply();
  }

  // ---------- Pointer, touch and scroll ----------

  var ready = false;
  window.setTimeout(function () { ready = true; }, 1100);

  window.addEventListener('pointermove', function (e) {
    if (e.pointerType === 'touch') return;
    F.px = e.clientX;
    F.py = e.clientY;
    F.hasPointer = true;
    if (ready && !F.out) undock();
  }, { passive: true });
  doc.documentElement.addEventListener('mouseleave', function () { F.hasPointer = false; });
  window.addEventListener('blur', function () { F.hasPointer = false; });

  window.addEventListener('pointerdown', function (e) {
    if (e.pointerType !== 'touch') return;
    if (e.target && e.target.closest && e.target.closest('.jar__bee, .flyer__hit, dialog')) return;
    F.px = e.clientX - F.base * 0.1;
    F.py = e.clientY - F.base * 0.35;
    F.ox = -0.3;
    F.oy = -0.6;
    F.tapUntil = clock + 2.4;
    if (ready && !F.out) undock();
  }, { passive: true });

  window.addEventListener('scroll', function () {
    // With no mouse, the bee leaves its jar when the jar goes out of view.
    if (ready && !F.out && !F.hasPointer && !pickPerch().home) undock();
  }, { passive: true });

  // ---------- Confetti for a full jar ----------

  var confetti = null;
  var CONFETTI_COLORS = ['#F76C6C', '#6BB9F0', '#FFC83D', '#8AD96B', '#C59BEE', '#FF9EC0'];
  function startConfetti() {
    if (reduce) return;
    var canvas = doc.createElement('canvas');
    canvas.className = 'confetti';
    doc.body.appendChild(canvas);
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = window.innerWidth, h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    var ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    var pieces = [];
    for (var i = 0; i < 110; i++) {
      pieces.push({
        x: Math.random(), delay: Math.random() * 2.4 - 0.9, speed: 105 + Math.random() * 85,
        sway: 8 + Math.random() * 22, swayRate: 1 + Math.random() * 1.6, spin: 1.2 + Math.random() * 3,
        size: (7 + Math.random() * 6) * (w > 800 ? 1.35 : 1), color: CONFETTI_COLORS[i % CONFETTI_COLORS.length]
      });
    }
    if (confetti) confetti.canvas.remove();
    confetti = { canvas: canvas, ctx: ctx, pieces: pieces, start: clock + 0.3, w: w, h: h, fall: Math.max(1, h / 760) };
  }
  function drawConfetti() {
    var cf = confetti;
    var age0 = clock - cf.start;
    var life = 7.5;
    if (age0 > life) { cf.canvas.remove(); confetti = null; return; }
    var amount = age0 > life - 1.4 ? Math.max(0, (life - age0) / 1.4) : 1;
    var ctx = cf.ctx;
    ctx.clearRect(0, 0, cf.w, cf.h);
    for (var i = 0; i < cf.pieces.length; i++) {
      var p = cf.pieces[i];
      var age = age0 - p.delay;
      if (age <= 0) continue;
      var y = -20 + age * p.speed * cf.fall;
      if (y > cf.h + 20) continue;
      var x = p.x * cf.w + Math.sin(age * p.swayRate + i) * p.sway;
      var flip = 0.35 + 0.65 * Math.abs(Math.cos(age * p.spin * 0.8 + i));
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(age * p.spin + i);
      ctx.globalAlpha = amount;
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2 * flip, -p.size * 0.7, p.size * flip, p.size * 1.4);
      ctx.restore();
    }
  }

  // ---------- The honey waves above the plans ----------

  var waves = $('#honeyWaves');
  var wavesCtx = waves.getContext('2d');
  var wavesSize = { w: 0, h: 0 };
  function sizeWaves() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    wavesSize.w = waves.clientWidth;
    wavesSize.h = waves.clientHeight;
    waves.width = wavesSize.w * dpr;
    waves.height = wavesSize.h * dpr;
    wavesCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function drawWaves(t) {
    var w = wavesSize.w, h = wavesSize.h, ctx = wavesCtx, x;
    if (!w) return;
    ctx.clearRect(0, 0, w, h);
    function line(shift, lift) {
      ctx.beginPath();
      for (x = 0; x <= w + 12; x += 12) {
        var y = 70 - lift + Math.sin(x * 0.0062 + t * 0.9 + shift) * 11 + Math.sin(x * 0.0128 - t * 0.62 + 1.3 + shift * 2) * 6;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
    }
    line(1.7, 16);
    ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath();
    ctx.fillStyle = '#FFDE59';
    ctx.fill();
    line(0, 0);
    ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath();
    ctx.fillStyle = '#FFC229';
    ctx.fill();
    line(0, 0);
    ctx.strokeStyle = 'rgba(255, 226, 122, .95)';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  // ---------- Sections come in when you reach them ----------

  var seen = { hero: true, mini: false, waves: false };
  if ('IntersectionObserver' in window) {
    doc.documentElement.classList.add('reveal-on');
    var reveal = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          reveal.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    $$('.reveal').forEach(function (el) { reveal.observe(el); });

    var watch = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.target === hero) { seen.hero = entry.isIntersecting; heroInView = entry.isIntersecting; }
        if (entry.target === miniHost) seen.mini = entry.isIntersecting;
        if (entry.target === waves) seen.waves = entry.isIntersecting;
      });
    });
    watch.observe(hero);
    watch.observe(miniHost);
    watch.observe(waves);
  } else {
    seen.mini = true;
    seen.waves = true;
  }

  // ---------- The row of phone pictures: arrows, dots, or a drag move it ----------

  var strip = $('#strip');
  var stripWrap = $('#stripWrap');
  var shots = $$('.shot', strip);
  var stripPrev = $('#stripPrev'), stripNext = $('#stripNext'), stripDots = $('#stripDots');
  var dots = shots.map(function (shot, i) {
    var dot = doc.createElement('button');
    dot.type = 'button';
    dot.className = 'strip__dot';
    dot.setAttribute('aria-label', 'Picture ' + (i + 1) + ' of ' + shots.length);
    dot.addEventListener('click', function () { showShot(i); });
    stripDots.appendChild(dot);
    return dot;
  });
  // On a phone one picture is in the middle of the row. On a wider screen the row starts at the
  // left (the same widths as in the style rules).
  var phoneRow = window.matchMedia('(max-width: 600px)');
  var ROW_EDGE = 28;
  // The left edge of one picture in the row.
  function shotLeft(shot) {
    return shot.getBoundingClientRect().left - strip.getBoundingClientRect().left + strip.scrollLeft;
  }
  // The picture that the row shows now: on a phone the one nearest to the middle, on a wider
  // screen the first one at the left edge.
  function shotInView() {
    var i;
    if (!phoneRow.matches) {
      for (i = 0; i < shots.length; i++) {
        if (shotLeft(shots[i]) >= strip.scrollLeft + ROW_EDGE - 8) return i;
      }
      return shots.length - 1;
    }
    var mid = strip.scrollLeft + strip.clientWidth / 2, best = 0, bestD = Infinity;
    for (i = 0; i < shots.length; i++) {
      var d = Math.abs(shotLeft(shots[i]) + shots[i].offsetWidth / 2 - mid);
      if (d < bestD) { bestD = d; best = i; }
    }
    return best;
  }
  function showShot(i) {
    i = clamp(i, 0, shots.length - 1);
    var left = phoneRow.matches
      ? shotLeft(shots[i]) + shots[i].offsetWidth / 2 - strip.clientWidth / 2
      : shotLeft(shots[i]) - ROW_EDGE;
    if (strip.scrollTo) strip.scrollTo({ left: left, behavior: reduce ? 'auto' : 'smooth' });
    else strip.scrollLeft = left;
  }
  // The arrows show only if the row is wider than the screen. The dots show on a phone, where
  // each picture has its own place in the row.
  function paintStrip() {
    var max = strip.scrollWidth - strip.clientWidth;
    var scrolls = max > 4;
    stripWrap.classList.toggle('is-scroll', scrolls);
    stripPrev.hidden = !scrolls || strip.scrollLeft <= 4;
    stripNext.hidden = !scrolls || strip.scrollLeft >= max - 4;
    stripDots.hidden = !scrolls || !phoneRow.matches;
    var now = shotInView();
    for (var i = 0; i < dots.length; i++) {
      dots[i].classList.toggle('is-on', i === now);
      if (i === now) dots[i].setAttribute('aria-current', 'true'); else dots[i].removeAttribute('aria-current');
    }
  }
  var stripFrame = 0;
  strip.addEventListener('scroll', function () {
    if (stripFrame) return;
    stripFrame = window.requestAnimationFrame(function () { stripFrame = 0; paintStrip(); });
  }, { passive: true });
  stripPrev.addEventListener('click', function () { showShot(shotInView() - 1); });
  stripNext.addEventListener('click', function () { showShot(shotInView() + 1); });
  strip.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight') { showShot(shotInView() + 1); e.preventDefault(); }
    else if (e.key === 'ArrowLeft') { showShot(shotInView() - 1); e.preventDefault(); }
  });
  paintStrip();

  var drag = null;
  strip.addEventListener('pointerdown', function (e) {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    drag = { x: e.clientX, left: strip.scrollLeft, moved: false };
  });
  window.addEventListener('pointermove', function (e) {
    if (!drag) return;
    var dx = e.clientX - drag.x;
    if (!drag.moved && Math.abs(dx) > 4) { drag.moved = true; strip.classList.add('is-drag'); }
    if (drag.moved) strip.scrollLeft = drag.left - dx;
  });
  window.addEventListener('pointerup', function () {
    if (drag) { strip.classList.remove('is-drag'); drag = null; }
  });

  // ---------- Size changes ----------

  var resizeTimer = 0;
  function onResize() {
    F.base = baseSize();
    layoutScenes();
    mini.measure();
    sizeWaves();
    if (reduce) drawWaves(0);
    paintStrip();
  }
  window.addEventListener('resize', function () {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(onResize, 120);
  });
  window.addEventListener('load', onResize);
  if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(onResize);
  if ('ResizeObserver' in window) {
    var sizeWatch = new ResizeObserver(function () {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(onResize, 120);
    });
    sizeWatch.observe(hero);
    sizeWatch.observe(outro);
  }
  onResize();

  // ---------- The clock ----------

  if (reduce) {
    jar.setLevel(levelNow(), true);
    jar.draw(0, false);
    jarBee.apply();
    return;
  }

  var last = performance.now();
  var scrollShown = -1;
  function frame(now) {
    var dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    clock = now / 1000;
    var t = clock;

    if (seen.hero) {
      jar.step(dt);
      jar.draw(t, true);
      if (!F.out) poseJarBee(t);
      var sy = window.scrollY;
      if (sy !== scrollShown) {
        scrollShown = sy;
        heroScene.sky.style.transform = 'translate3d(0,' + r1(sy * 0.22) + 'px,0)';
      }
    }
    if (seen.mini) stepMini(t, dt);
    if (F.out) fly(t, dt);
    if (seen.waves) drawWaves(t);
    if (confetti) drawConfetti();
    window.requestAnimationFrame(frame);
  }
  window.requestAnimationFrame(frame);
})();
