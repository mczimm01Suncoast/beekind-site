/*
 * Bee Kind website: the look of the meadow, by season and by time of day.
 * The same rules and the same colors as the app (ios/Shared/Scene/MeadowLook.swift).
 *
 * The browser knows the date, the clock and the time zone of the visitor. The page asks for no
 * location and for no permission. It makes no network call.
 *
 * "?look=autumn-night" in the address gives one look, for a test. One word is enough
 * ("?look=winter" or "?look=evening").
 *
 * This file runs before the page is drawn, so that the page does not start with the wrong colors.
 */
(function () {
  'use strict';

  var SEASONS = ['spring', 'summer', 'autumn', 'winter'];
  var TIMES = ['morning', 'day', 'evening', 'night'];

  // True for a visitor in the south half of the world: December is summer there.
  // The page does not know the place of the visitor. It reads the time zone, and then the region.
  function isSouth(zone, region) {
    var zones = ['Australia/', 'Antarctica/', 'Pacific/Auckland', 'Pacific/Chatham', 'Pacific/Fiji',
      'America/Argentina/', 'America/Buenos_Aires', 'America/Santiago', 'America/Montevideo',
      'America/Asuncion', 'America/Sao_Paulo', 'America/La_Paz', 'America/Lima',
      'Africa/Johannesburg', 'Africa/Maputo', 'Africa/Harare', 'Africa/Windhoek',
      'Africa/Gaborone', 'Africa/Lusaka', 'Africa/Maseru', 'Africa/Mbabane',
      'Indian/Mauritius', 'Indian/Reunion', 'Indian/Antananarivo'];
    for (var i = 0; i < zones.length; i++) {
      if (zone.indexOf(zones[i]) === 0) return true;
    }
    // A time zone with a place in its name, that is not in the list, is in the north.
    if (zone.indexOf('/') >= 0) return false;
    var countries = ['AU', 'NZ', 'ZA', 'AR', 'CL', 'UY', 'PY', 'BO', 'PE', 'NA', 'BW',
      'ZW', 'MZ', 'MG', 'LS', 'SZ', 'FJ', 'MU'];
    return countries.indexOf(region) >= 0;
  }

  function seasonOf(date, south) {
    var month = date.getMonth() + 1;
    var north = month >= 3 && month <= 5 ? 'spring' : (month >= 6 && month <= 8 ? 'summer' : (month >= 9 && month <= 11 ? 'autumn' : 'winter'));
    if (!south) return north;
    return { spring: 'autumn', summer: 'winter', autumn: 'spring', winter: 'summer' }[north];
  }

  // The minutes of the day at which the morning, the day, the evening and the night start.
  function starts(season) {
    if (season === 'summer') return [5 * 60 + 30, 8 * 60 + 30, 18 * 60 + 30, 21 * 60];
    if (season === 'winter') return [7 * 60 + 30, 9 * 60 + 30, 16 * 60, 17 * 60 + 30];
    return [6 * 60 + 30, 9 * 60, 17 * 60 + 30, 19 * 60 + 30];
  }

  function lookAt(date, south) {
    var season = seasonOf(date, south);
    var minute = date.getHours() * 60 + date.getMinutes();
    var s = starts(season);
    var time = minute < s[0] || minute >= s[3] ? 'night' : (minute < s[1] ? 'morning' : (minute < s[2] ? 'day' : 'evening'));
    return { season: season, time: time };
  }

  // A color between two colors. `weight` 0 is the first one, 1 is the second one.
  function mix(a, b, weight) {
    function part(shift) {
      var x = (a >> shift) & 0xFF, y = (b >> shift) & 0xFF;
      return Math.max(0, Math.min(255, Math.round(x + (y - x) * weight)));
    }
    return (part(16) << 16) | (part(8) << 8) | part(0);
  }

  function hex(n) {
    var s = n.toString(16).toUpperCase();
    while (s.length < 6) s = '0' + s;
    return '#' + s;
  }

  // The colors and the parts of one look.
  function palette(look) {
    var season = look.season, time = look.time;
    var land = {
      summer: { hills: [0x86D466, 0x7ACB5C], bush: 0x33A45A, ground: [0x7DCC5B, 0x74C653], tuft: 0x52B34D, petal: 0xFFFFFF },
      spring: { hills: [0x9BE07A, 0x8FD86E], bush: 0x45B868, ground: [0x8FD96C, 0x86D263], tuft: 0x5DBE55, petal: 0xFFC2DC },
      autumn: { hills: [0xE6BE55, 0xDDAE45], bush: 0xE2702E, ground: [0xB9CF62, 0xAEC657], tuft: 0x9AAE3F, petal: 0xFFFFFF },
      winter: { hills: [0xF4F9FF, 0xE6F0FB], bush: 0x2F8F5E, ground: [0xFFFFFF, 0xEAF3FD], tuft: 0xC9DDF0, petal: 0xFFFFFF }
    }[season];
    // The light of the time of day on the land: a color, and how much of it.
    var light = { day: [0xFFFFFF, 0], morning: [0xFFE9C8, 0.07], evening: [0x202840, 0.10], night: [0x0E5CAF, 0.30] }[time];
    function lit(c) { return mix(c, light[0], light[1]); }

    var sky, sun, glow, cloud;
    if (time === 'day') {
      sky = season === 'winter' ? [0x8FCFF8, 0xDDF0FC] : (season === 'autumn' ? [0x8CCDF3, 0xD9EEF9] : [0x7ACBFA, 0xB9E7FF]);
      sun = season === 'winter' ? 0xFFE27A : (season === 'autumn' ? 0xFFCF45 : 0xFFD83D);
      glow = season === 'winter' ? 0xFFFBE0 : 0xFFF6B8;
      cloud = 0xFFFFFF;
    } else if (time === 'morning') {
      sky = [0x8FD0FA, 0xFFE3C4]; sun = 0xFFC44D; glow = 0xFFE2B0; cloud = 0xFFF6EC;
    } else if (time === 'evening') {
      sky = [0x8F8FE0, 0xF7A8B8, 0xFFC38A]; sun = 0xFF9A3D; glow = 0xFFD0A0; cloud = 0xFFDDE2;
    } else {
      sky = [0x6C78D6, 0x9AA0EA, 0xC0BEF5]; sun = 0xFFF3C4; glow = 0xFFFFFF; cloud = 0xE1E3FA;
    }

    // The leaves of the trees and the bushes: a dark side, the color, and a light side.
    function crown(base) {
      var deep = season === 'autumn' ? [0x7A2410, 0.30, 0xFFD24A, 0.38]
        : (season === 'winter' ? [0x0B3D2E, 0.28, 0xD8F3E2, 0.26] : [0x0B3D2E, 0.26, 0xC8F08A, 0.36]);
      return { dark: hex(lit(mix(base, deep[0], deep[1]))), base: hex(lit(base)), light: hex(lit(mix(base, deep[2], deep[3]))) };
    }

    return {
      season: season,
      time: time,
      sky: sky.map(hex),
      skyMid: hex(sky.length === 3 ? sky[1] : mix(sky[0], sky[1], 0.5)),
      sun: hex(sun),
      glow: hex(glow),
      cloud: hex(cloud),
      moon: time === 'night',
      stars: time === 'night',
      hills: [hex(lit(land.hills[0])), hex(lit(land.hills[1]))],
      // The main color of the leaves, and a second color for the bush in the middle of each side
      // (it is red in autumn).
      crowns: [crown(land.bush), crown(season === 'autumn' ? 0xD9542B : land.bush)],
      trunk: hex(lit(0x9A6A45)),
      trunkDark: hex(lit(0x7A5033)),
      // Single leaves that show in a crown in autumn.
      crownLeaves: season === 'autumn' ? [hex(lit(0xF6BE3E)), hex(lit(0xC23F26)), hex(lit(0xF39A3C))] : [],
      blossom: '#FFB3D4',
      ground: [hex(lit(land.ground[0])), hex(lit(land.ground[1]))],
      tuft: hex(lit(land.tuft)),
      // The dark shape under the jar: green on grass, blue-grey on snow.
      shade: hex(lit({ summer: 0x5CB24B, spring: 0x69BD55, autumn: 0x8FAE45, winter: 0xC3D5EA }[season])),
      stem: hex(lit(0x4DAF4A)),
      petal: hex(lit(land.petal)),
      flowers: season === 'spring' || season === 'summer',
      blossoms: season === 'spring',
      leaves: season === 'autumn',
      snow: season === 'winter'
    };
  }

  var zone = '';
  try { zone = window.Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { /* no time zone */ }
  var region = ((window.navigator.language || '').split('-')[1] || '').toUpperCase();
  var look = lookAt(new Date(), isSouth(zone, region));

  // A test look from the address.
  var asked = /[?&]look=([a-z-]+)/.exec(window.location.search);
  if (asked) {
    var words = asked[1].split('-');
    for (var w = 0; w < words.length; w++) {
      if (SEASONS.indexOf(words[w]) >= 0) look.season = words[w];
      if (TIMES.indexOf(words[w]) >= 0) look.time = words[w];
    }
  }

  var colors = palette(look);
  var root = document.documentElement;
  root.setAttribute('data-season', look.season);
  root.setAttribute('data-time', look.time);
  var style = root.style;
  style.setProperty('--sky-1', colors.sky[0]);
  style.setProperty('--sky-mid', colors.skyMid);
  style.setProperty('--sky-2', colors.sky[colors.sky.length - 1]);
  style.setProperty('--grass', colors.ground[1]);
  style.setProperty('--ground', colors.ground[0]);
  style.setProperty('--hill-1', colors.hills[0]);
  style.setProperty('--hill-2', colors.hills[1]);
  style.setProperty('--cloud', colors.cloud);
  // The bar of the browser above the page takes the color of the top of the sky.
  var theme = document.querySelector('meta[name="theme-color"]');
  if (theme) theme.setAttribute('content', colors.sky[0]);

  window.BeeKindLook = {
    look: look, colors: colors,
    // For a test: the rules, with no page.
    lookAt: lookAt, isSouth: isSouth, palette: palette, mix: mix, hex: hex
  };
})();
