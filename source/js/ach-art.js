'use strict';
/* ================= ДОСТИЖЕНИЯ v2: значки (вектор, без картинок и эмодзи) =================
   Каждый значок = форма по ступени (бронза — медаль на ленте, серебро — орден-розетка, золото — кубок,
   легенда — статуэтка на постаменте, секрет — кристалл) + своя эмблема + своё число/деталь + цвет ленты по разделу.
   Металлы — CSS-переменные --ach-* (заданы в app.html, одинаковы во всех скинах: это «вещи», а не интерфейс).
   badge(id, {locked, size}) → строка <svg>. Чистая функция: тот же файл грузит test/ach.test.mjs. */
(function (root) {
  const METAL = {
    bronze: ['--ach-br-hi', '--ach-br', '--ach-br-lo'],
    silver: ['--ach-sv-hi', '--ach-sv', '--ach-sv-lo'],
    gold: ['--ach-gd-hi', '--ach-gd', '--ach-gd-lo'],
    legend: ['--ach-lg-hi', '--ach-lg', '--ach-lg-lo'],
    secret: ['--ach-sc-hi', '--ach-sc', '--ach-sc-lo'],
    legacy: ['--ach-sv-hi', '--ach-sv', '--ach-sv-lo'],
  };
  const RIBBON = {
    hours: '--ach-rb-blue', habit: '--ach-rb-red', books: '--ach-rb-green', sessions: '--ach-rb-teal',
    daytime: '--ach-rb-indigo', calendar: '--ach-rb-pink', returns: '--ach-rb-orange', formats: '--ach-rb-cyan',
    quotes: '--ach-rb-violet', levels: '--ach-rb-gold', secret: '--ach-rb-ink', legacy: '--ach-rb-ink',
  };
  const v = (n) => 'var(' + n + ')';

  /* ---- эмблемы: рисуются в квадрате 0..100 с центром 50,50, примерно в круге r=20; c = цвет гравировки ---- */
  const E = {
    steps: (c) => '<g fill="' + c + '"><ellipse cx="42" cy="58" rx="6" ry="9" transform="rotate(-12 42 58)"/><circle cx="36" cy="45" r="2"/><circle cx="40" cy="43" r="2"/><circle cx="44" cy="43.5" r="2"/><ellipse cx="58" cy="44" rx="6" ry="9" transform="rotate(12 58 44)"/><circle cx="54" cy="31" r="2"/><circle cx="58" cy="29.5" r="2"/><circle cx="62" cy="30" r="2"/></g>',
    hourglass: (c) => '<g fill="none" stroke="' + c + '" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M36 30h28M36 70h28"/><path d="M39 30c0 11 11 14 11 20s-11 9-11 20M61 30c0 11-11 14-11 20s11 9 11 20"/></g><path fill="' + c + '" d="M43 66c2-6 5-8 7-9 2 1 5 3 7 9z M45 38h10c-1 4-3 6-5 7-2-1-4-3-5-7z"/>',
    clock: (c) => '<g fill="none" stroke="' + c + '" stroke-width="3.2" stroke-linecap="round"><circle cx="50" cy="50" r="19"/><path d="M50 37v13l9 6"/></g><g fill="' + c + '"><circle cx="50" cy="34.5" r="1.4"/><circle cx="65.5" cy="50" r="1.4"/><circle cx="50" cy="65.5" r="1.4"/><circle cx="34.5" cy="50" r="1.4"/></g>',
    stopwatch: (c) => '<g fill="none" stroke="' + c + '" stroke-width="3.2" stroke-linecap="round"><circle cx="50" cy="54" r="17"/><path d="M50 54l7-8M46 31h8M50 31v6M64 38l3-3"/></g>',
    flame: (c) => '<path fill="' + c + '" d="M51 28c3 9 14 13 14 26a15 15 0 0 1-30 0c0-7 4-11 7-15 0 5 2 8 5 9-2-8 0-14 4-20z"/><path fill="var(--ach-hole)" opacity=".45" d="M50 72a6 6 0 0 1-6-6c0-4 3-6 5-9 1 3 2 4 4 5 2 1 3 2 3 4a6 6 0 0 1-6 6z"/>',
    book: (c) => '<g fill="' + c + '"><path d="M28 38q11-5 20 1v29q-9-6-20-1z"/><path d="M72 38q-11-5-20 1v29q9-6 20-1z"/></g>',
    stack: (c) => '<g fill="' + c + '"><rect x="31" y="58" width="38" height="9" rx="2"/><rect x="35" y="47" width="32" height="9" rx="2" transform="rotate(-4 51 51)"/><rect x="33" y="36" width="30" height="9" rx="2" transform="rotate(3 48 40)"/></g>',
    brick: (c) => '<path fill="' + c + '" d="M30 40l24-8 16 6v24l-24 8-16-6z"/><path fill="var(--ach-hole)" opacity=".4" d="M46 46l24-8v24l-24 8z"/><path fill="none" stroke="var(--ach-hole)" stroke-opacity=".5" stroke-width="1.4" d="M33 44l13 5M33 50l13 5M33 56l13 5"/>',
    owl: (c) => '<path fill="' + c + '" d="M34 32l7 6q9-4 18 0l7-6v22q0 17-16 20q-16-3-16-20z"/><g fill="var(--ach-hole)"><circle cx="43" cy="47" r="6"/><circle cx="57" cy="47" r="6"/></g><g fill="' + c + '"><circle cx="43" cy="47" r="2.4"/><circle cx="57" cy="47" r="2.4"/><path d="M47.5 54h5l-2.5 5z"/></g>',
    lark: (c) => '<path fill="' + c + '" d="M24 46c9-5 17-4 23 0 4-9 12-15 25-17-6 7-10 13-12 19 6 2 12 2 18 0-8 8-19 10-29 8-9 1-19-2-25-10z"/><circle cx="66" cy="36" r="1.6" fill="var(--ach-hole)"/><path fill="' + c + '" d="M30 70a20 12 0 0 1 40 0z" opacity=".75"/>',
    moon: (c) => '<path fill="' + c + '" d="M58 30a20 20 0 1 0 12 30a16 16 0 0 1-12-30z"/><g fill="' + c + '"><circle cx="66" cy="36" r="1.8"/><circle cx="72" cy="46" r="1.2"/></g>',
    sun: (c) => '<circle cx="50" cy="50" r="10" fill="' + c + '"/><g stroke="' + c + '" stroke-width="3.2" stroke-linecap="round"><path d="M50 30v5M50 65v5M30 50h5M65 50h5M36 36l3.5 3.5M60.5 60.5L64 64M36 64l3.5-3.5M60.5 39.5L64 36"/></g>',
    cup: (c) => '<path fill="' + c + '" d="M32 40h30v14a13 13 0 0 1-13 13h-4a13 13 0 0 1-13-13z"/><path fill="none" stroke="' + c + '" stroke-width="3.2" d="M62 44h3a6 6 0 0 1 0 12h-4"/><g fill="none" stroke="' + c + '" stroke-width="2.4" stroke-linecap="round"><path d="M40 28q-3 4 0 7M47 26q-3 4 0 8M54 28q-3 4 0 7"/></g><path fill="' + c + '" d="M28 70h38v3H28z"/>',
    firework: (c) => '<g stroke="' + c + '" stroke-width="3" stroke-linecap="round"><path d="M50 31v8M50 61v8M31 50h8M61 50h8M37 37l5 5M58 58l5 5M37 63l5-5M58 42l5-5"/></g><circle cx="50" cy="50" r="4" fill="' + c + '"/>',
    tree: (c) => '<path fill="' + c + '" d="M50 26l10 13h-5l9 11h-6l9 12H33l9-12h-6l9-11h-5z"/><rect x="47" y="62" width="6" height="8" fill="' + c + '"/>',
    leaf: (c) => '<path fill="' + c + '" d="M30 68c0-22 14-36 40-38-2 26-16 40-38 40z"/><path fill="none" stroke="var(--ach-hole)" stroke-opacity=".5" stroke-width="2" d="M33 67c8-10 16-18 30-30"/>',
    snow: (c) => '<g stroke="' + c + '" stroke-width="3" stroke-linecap="round"><path d="M50 30v40M33 40l34 20M33 60l34-20"/><path d="M45 33l5 4 5-4M45 67l5-4 5 4M34 46l5-1-2-5M66 54l-5 1 2 5M34 54l5 1-2 5M66 46l-5-1 2-5"/></g>',
    pumpkin: (c) => '<path fill="' + c + '" d="M50 38c-4-3-10-3-14 0-6 4-7 16-2 23 4 5 11 6 16 4 5 2 12 1 16-4 5-7 4-19-2-23-4-3-10-3-14 0z"/><path fill="none" stroke="' + c + '" stroke-width="3" stroke-linecap="round" d="M50 38q0-6 5-9"/><g fill="var(--ach-hole)"><path d="M40 48l5 3-5 2z M60 48l-5 3 5 2z M41 58q9 5 18 0-3 4-9 4-6 0-9-4z"/></g>',
    calendar: (c) => '<rect x="32" y="34" width="36" height="34" rx="4" fill="none" stroke="' + c + '" stroke-width="3.2"/><path stroke="' + c + '" stroke-width="3.2" stroke-linecap="round" d="M32 43h36M41 30v7M59 30v7"/>',
    phoenix: (c) => '<path fill="' + c + '" d="M50 46C45 38 36 33 24 29c4 6 6 10 10 14-4 0-7 2-9 4 7 2 12 3 17 5-1 7 2 14 8 22 6-8 9-15 8-22 5-2 10-3 17-5-2-2-5-4-9-4 4-4 6-8 10-14-12 4-21 9-26 17z"/><circle cx="50" cy="40" r="4.2" fill="' + c + '"/><path fill="' + c + '" d="M47 37l-2-8 4 4 1-6 2 6 3-4-2 8z"/><path fill="var(--ach-hole)" opacity=".4" d="M50 58c-2 4-2 8 0 12 2-4 2-8 0-12z"/>',
    question: (c) => '<text x="50" y="63" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="900" font-size="40" fill="' + c + '">?</text>',
    key: (c) => '<g fill="none" stroke="' + c + '" stroke-width="3.4" stroke-linecap="round"><circle cx="40" cy="44" r="9"/><path d="M47 51l18 18M58 62l5-5M63 67l4-4"/></g>',
    loop: (c) => '<g fill="none" stroke="' + c + '" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M66 48a16 16 0 1 1-6-12"/><path d="M62 28l-1 9-9-1"/></g>',
    page: (c) => '<path fill="' + c + '" d="M36 28h20l10 10v34H36z"/><path fill="var(--ach-hole)" opacity=".45" d="M56 28v10h10z"/>',
    stars: (c) => '<path fill="' + c + '" d="M50 30l5.5 12 13 1.4-9.8 8.8 2.8 12.8L50 58.4 38.5 65l2.8-12.8-9.8-8.8 13-1.4z"/>',
    quote: (c) => '<g fill="' + c + '"><path d="M34 60c0-12 4-20 12-24l2 4c-4 3-6 6-6 10h6v12H34z"/><path d="M54 60c0-12 4-20 12-24l2 4c-4 3-6 6-6 10h6v12H54z"/></g>',
    quill: (c) => '<path fill="' + c + '" d="M68 28c-16 2-28 14-30 32l-6 12 4-2 4-8c16-2 26-14 28-34z"/><path fill="none" stroke="var(--ach-hole)" stroke-opacity=".5" stroke-width="1.6" d="M40 62c8-10 16-20 26-30"/>',
    hat: (c) => '<path fill="' + c + '" d="M50 24l14 34H36z"/><ellipse cx="50" cy="60" rx="22" ry="6" fill="' + c + '"/><g fill="var(--ach-hole)"><path d="M50 36l1.4 3 3 .3-2.3 2 .7 3-2.8-1.6-2.8 1.6.7-3-2.3-2 3-.3z"/><circle cx="56" cy="49" r="1.6"/><circle cx="45" cy="52" r="1.2"/></g>',
    crown: (c) => '<path fill="' + c + '" d="M30 62l-2-24 11 10 11-16 11 16 11-10-2 24z"/><rect x="30" y="64" width="40" height="6" rx="2" fill="' + c + '"/>',
    cat: (c) => '<path fill="' + c + '" d="M32 34l9 8q9-3 18 0l9-8v20q0 16-18 16t-18-16z"/><g fill="var(--ach-hole)"><path d="M40 52q4-4 8 0-4 3-8 0zM52 52q4-4 8 0-4 3-8 0z"/></g>',
    mirror: (c) => '<g fill="' + c + '"><path d="M30 38h8l6 12-6 12h-8l6-12z"/><path d="M70 38h-8l-6 12 6 12h8l-6-12z"/></g><path stroke="' + c + '" stroke-width="2" stroke-dasharray="3 3" d="M50 30v40"/>',
    twins: (c) => '<g fill="' + c + '"><rect x="32" y="32" width="14" height="36" rx="2"/><rect x="54" y="32" width="14" height="36" rx="2"/></g><g stroke="var(--ach-hole)" stroke-opacity=".6" stroke-width="2"><path d="M35 40h8M57 40h8"/></g>',
    dawn: (c) => '<path fill="' + c + '" d="M34 60a16 16 0 0 1 32 0z"/><g stroke="' + c + '" stroke-width="3" stroke-linecap="round"><path d="M28 66h44M50 32v6M34 40l4 4M66 40l-4 4"/></g>',
    globe: (c) => '<circle cx="50" cy="50" r="19" fill="none" stroke="' + c + '" stroke-width="3.2"/><path fill="' + c + '" d="M50 31a19 19 0 0 1 0 38z"/><circle cx="41" cy="45" r="4" fill="' + c + '"/><circle cx="59" cy="55" r="4" fill="var(--ach-hole)"/>',
    shelf: (c) => '<g fill="' + c + '"><rect x="32" y="34" width="7" height="28" rx="1.5"/><rect x="41" y="38" width="7" height="24" rx="1.5"/><rect x="50" y="32" width="7" height="30" rx="1.5"/><rect x="59" y="36" width="8" height="26" rx="1.5" transform="rotate(10 63 49)"/><rect x="28" y="63" width="44" height="4" rx="1.5"/></g>',
    file: (c) => '<path fill="' + c + '" d="M38 28h16l10 10v34H38z"/><g fill="var(--ach-hole)" opacity=".5"><rect x="42" y="46" width="18" height="3" rx="1"/><rect x="42" y="53" width="18" height="3" rx="1"/><rect x="42" y="60" width="12" height="3" rx="1"/></g>',
    archive: (c) => '<rect x="30" y="34" width="40" height="10" rx="2" fill="' + c + '"/><path fill="' + c + '" d="M33 46h34v20a3 3 0 0 1-3 3H36a3 3 0 0 1-3-3z"/><rect x="44" y="51" width="12" height="4" rx="2" fill="var(--ach-hole)" opacity=".5"/>',
  };

  /* ---- формы ---- */
  function grad(id, m) {
    return '<linearGradient id="' + id + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + v(m[0]) + '"/><stop offset=".5" stop-color="' + v(m[1]) + '"/><stop offset="1" stop-color="' + v(m[2]) + '"/></linearGradient>';
  }
  /* эмблема с тиснением: светлый блик со сдвигом + тёмная гравировка */
  function emboss(em, m, tr) {
    const f = E[em] || E.stars;
    return '<g transform="' + tr + '"><g transform="translate(.9 .9)" opacity=".55">' + f(v(m[0])) + '</g>' + f(v(m[2])) + '</g>';
  }
  function num(txt, x, y, size, m) {
    if (!txt) return '';
    return '<text x="' + x + '" y="' + y + '" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="800" font-size="' + size + '" fill="' + v(m[2]) + '" stroke="' + v(m[0]) + '" stroke-width=".8" paint-order="stroke">' + txt + '</text>';
  }
  function scallop(cx, cy, r1, r2, k) {
    let d = '';
    for (let i = 0; i < k * 2; i++) {
      const a = (Math.PI * i) / k - Math.PI / 2, r = i % 2 ? r2 : r1;
      d += (i ? 'L' : 'M') + (cx + r * Math.cos(a)).toFixed(1) + ' ' + (cy + r * Math.sin(a)).toFixed(1);
    }
    return d + 'Z';
  }
  const FORM = {
    /* бронза: круглая медаль на V-ленте */
    medal: function (g, m, rb, em, n) {
      return '<path fill="' + rb + '" d="M30 4h14l10 34H40z"/><path fill="' + rb + '" d="M70 4H56L46 38h14z" opacity=".82"/>' +
        '<path fill="var(--ach-hole)" opacity=".18" d="M44 4h12L50 24z"/>' +
        '<circle cx="50" cy="62" r="31" fill="url(#' + g + ')"/><circle cx="50" cy="62" r="25" fill="none" stroke="' + v(m[2]) + '" stroke-opacity=".55" stroke-width="1.6"/>' +
        '<circle cx="50" cy="62" r="23.5" fill="none" stroke="' + v(m[0]) + '" stroke-opacity=".7" stroke-width="1"/>' +
        emboss(em, m, 'translate(50 ' + (n ? 56 : 62) + ') scale(.74) translate(-50 -50)') + num(n, 50, 84.5, 11.5, m);
    },
    /* серебро: орден-розетка с двумя хвостами */
    rosette: function (g, m, rb, em, n) {
      return '<path fill="' + rb + '" d="M30 62l-10 34 11-6 7 9 8-34z"/><path fill="' + rb + '" d="M70 62l10 34-11-6-7 9-8-34z" opacity=".82"/>' +
        '<path fill="url(#' + g + ')" d="' + scallop(50, 46, 40, 34, 16) + '"/>' +
        '<circle cx="50" cy="46" r="28" fill="' + rb + '"/><circle cx="50" cy="46" r="24" fill="url(#' + g + ')"/>' +
        '<circle cx="50" cy="46" r="24" fill="none" stroke="' + v(m[2]) + '" stroke-opacity=".5" stroke-width="1.2"/>' +
        emboss(em, m, 'translate(50 ' + (n ? 42 : 46) + ') scale(.72) translate(-50 -50)') + num(n, 50, 66, 9.5, m);
    },
    /* золото: кубок с ручками на подставке; лента — табличка */
    cup: function (g, m, rb, em, n) {
      return '<g fill="none" stroke="url(#' + g + ')" stroke-width="6" stroke-linecap="round"><path d="M27 18h-9c0 14 6 22 15 24"/><path d="M73 18h9c0 14-6 22-15 24"/></g>' +
        '<path fill="url(#' + g + ')" d="M24 10h52v14c0 22-11 34-26 34S24 46 24 24z"/>' +
        '<path fill="' + v(m[0]) + '" opacity=".45" d="M30 14h6v12c0 10 3 18 8 24-9-3-14-12-14-24z"/>' +
        '<path fill="url(#' + g + ')" d="M45 56h10v12h-10z M36 68h28l4 10H32z"/>' +
        '<rect x="28" y="78" width="44" height="16" rx="3" fill="' + rb + '"/><rect x="30" y="80" width="40" height="12" rx="2" fill="url(#' + g + ')" opacity=".35"/>' +
        emboss(em, m, 'translate(50 31) scale(.56) translate(-50 -50)') +
        (n ? '<text x="50" y="89.5" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="800" font-size="' + Math.min(9.5, 70 / n.length).toFixed(1) + '" fill="var(--ach-plate)">' + n + '</text>' : '');
    },
    /* легенда: статуэтка — эмблема объёмом на ступенчатом постаменте с табличкой */
    statue: function (g, m, rb, em, n) {
      const f = E[em] || E.stars, tr = 'translate(50 38) scale(1.12) translate(-50 -50)';
      let rays = '';
      for (let i = 0; i < 12; i++) rays += '<path d="M50 38L' + (50 + 46 * Math.cos(i * Math.PI / 6)).toFixed(1) + ' ' + (38 + 46 * Math.sin(i * Math.PI / 6)).toFixed(1) + 'L' + (50 + 46 * Math.cos(i * Math.PI / 6 + .16)).toFixed(1) + ' ' + (38 + 46 * Math.sin(i * Math.PI / 6 + .16)).toFixed(1) + 'z"/>';
      return '<g fill="' + v(m[0]) + '" opacity=".35">' + rays + '</g><circle cx="50" cy="38" r="26" fill="' + v(m[0]) + '" opacity=".35"/>' +
        '<g transform="' + tr + '"><g transform="translate(1.6 1.6)">' + f(v(m[2])) + '</g>' + f('url(#' + g + ')') + '</g>' +
        '<path fill="url(#' + g + ')" d="M32 68h36l3 6H29z"/><path fill="' + v(m[2]) + '" d="M27 74h46v4H27z"/>' +
        '<path fill="' + rb + '" d="M24 78h52l-2 18H26z"/><path fill="' + v(m[2]) + '" opacity=".35" d="M24 78h52v3H24z"/>' +
        (n ? '<rect x="29" y="83" width="42" height="10" rx="2" fill="' + v('--ach-gd-hi') + '"/><text x="50" y="91" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="800" font-size="' + Math.min(8, 66 / n.length).toFixed(1) + '" fill="' + v('--ach-gd-lo') + '">' + n + '</text>' : '');
    },
    /* секрет: огранённый кристалл */
    gem: function (g, m, rb, em, n) {
      return '<path fill="url(#' + g + ')" d="M50 4l34 22v48L50 96 16 74V26z"/>' +
        '<path fill="' + v(m[0]) + '" opacity=".35" d="M50 4l34 22-34 12-34-12z"/><path fill="' + v(m[2]) + '" opacity=".35" d="M50 96l34-22-34-10-34 10z"/>' +
        '<path fill="none" stroke="' + v(m[0]) + '" stroke-opacity=".6" stroke-width="1" d="M16 26l34 12 34-12M50 38v26M16 74l34-10 34 10"/>' +
        emboss(em, m, 'translate(50 51) scale(.62) translate(-50 -50)') + num(n, 50, 86, 8, m);
    },
  };
  const TIER_FORM = { bronze: 'medal', silver: 'rosette', gold: 'cup', legend: 'statue', secret: 'gem', legacy: 'medal' };

  /* ---- каталог значков: id → [эмблема, надпись?, форма?] (форма по умолчанию — по ступени) ---- */
  const ART = {
    first: ['steps'], h1: ['hourglass', '1 ч'], h5: ['hourglass', '5 ч'], h10: ['clock', '10 ч'], h25: ['globe', '25 ч'],
    h50: ['clock', '50'], h100: ['clock', '100'], h250: ['hourglass', '250 ч'], h500: ['hourglass', '500 ч'],
    d3: ['sun', '3'], d7: ['sun', '7'], d14: ['calendar', '14'], d30: ['calendar', '30'], d60: ['calendar', '60'], d100: ['crown', '100'],
    d200: ['sun', '200 дней'], d365: ['globe', '365 дней'],
    streak3: ['flame', '3'], streak7: ['flame', '7'], streak14: ['flame', '14'], streak30: ['flame', '30'], streak60: ['flame', '60'],
    streak100: ['flame', '100'], streak365: ['flame', '365 подряд'],
    wk1: ['calendar', '1 нед'], wk4: ['calendar', '4 нед'], wk12: ['calendar', '12 нед'], wk26: ['calendar', '26 нед'], wk52: ['crown', '52 недели'],
    full7: ['stars', '7/7'], month: ['crown', 'месяц'],
    fin1: ['book'], fin3: ['stack', '3'], fin5: ['stack', '5'], fin10: ['shelf', '10'], fin25: ['shelf', '25'], fin50: ['shelf', '50'],
    fin100: ['shelf', '100 книг'], big500: ['brick', '500'], big1000: ['brick', '1000'], fast7: ['page', '7 дн'], slow90: ['leaf', '90 дн'],
    author3: ['quill', '3'], authors5: ['quill', '5'], parallel3: ['twins', '3'],
    marathon: ['stopwatch', '30'], sess60: ['stopwatch', '60'], sess120: ['stopwatch', '120'], day100: ['sun', '100'], day180: ['sun', '180'],
    sess10: ['stopwatch', '10'], sess50: ['book', '50'], sess100: ['book', '100'], sess500: ['stack', '500'], sess1000: ['stopwatch', '1000 сессий'],
    lark: ['lark'], lunch: ['cup'], owl: ['owl'], night3: ['moon', '3:00'], weekend: ['sun', 'сб–вс'], morning10: ['dawn', '10'],
    night10: ['owl', '10'], hours24: ['globe', '24 часа'],
    ny: ['firework', '1.01'], nye: ['tree', '31.12'], bookday: ['book', '23.04'], rusday: ['quill', '6.06'], sep1: ['stack', '1.09'],
    halloween: ['pumpkin'], leap: ['calendar', '29.02'], summer: ['sun', '21.06'], winter: ['snow', '21.12'], weekends: ['calendar', 'сб вс'],
    back7: ['loop', '7'], back30: ['phoenix'], rebook: ['key'], refinish: ['loop', '60'], refinish3: ['phoenix', 'второй шанс'],
    collector: ['archive'], pdf60: ['file', 'PDF'], fb260: ['file', 'FB2'], epub60: ['file', 'EPUB'], txt60: ['file', 'TXT'],
    formats3: ['shelf', '3'], own10: ['archive', '10'],
    q1: ['quote'], q10: ['quote', '10'], q50: ['quote', '50'], q200: ['quote', '200'], qbooks3: ['quill', '3'], qbooks10: ['book', '10'],
    lvl3: ['stars', '3'], lvl5: ['stars', '5'], lvl10: ['hat', '10'], lvl15: ['quill', '15'], lvl20: ['key', '20'], lvl30: ['hat', 'архимаг'],
    s100: ['sun', '100'], s1001: ['moon', '1001'], s2222: ['clock', '22:22'], smirror: ['mirror'], stwin: ['twins'], s13: ['cat', '13'],
    s7books: ['shelf', '7'], sonce: ['book', '1 день'], sdawn: ['dawn'],
    xp1k: ['stars', '1000'], xp5k: ['stars', '5000'], goldA1k: ['crown', '1000'], goldA5k: ['crown', '5000'], sk5: ['key', '5'], char10: ['hat', '10'],
  };

  let seq = 0;
  /** SVG-значок. locked: серый силуэт без цвета ленты. */
  function badge(a, opt) {
    opt = opt || {};
    const art = ART[a.id] || ['stars'], tier = a.tier || 'bronze';
    const m = opt.locked ? ['--ach-lk-hi', '--ach-lk', '--ach-lk-lo'] : METAL[tier] || METAL.bronze;
    const rb = opt.locked ? v('--ach-lk-lo') : v(RIBBON[a.sec] || '--ach-rb-ink');
    const form = FORM[art[2] || TIER_FORM[tier] || 'medal'];
    const g = 'achg' + (++seq);
    const size = opt.size || 56;
    return '<svg class="achb' + (opt.locked ? ' lk' : '') + '" viewBox="0 0 100 100" width="' + size + '" height="' + size + '" aria-hidden="true" focusable="false">' +
      '<defs>' + grad(g, m) + '</defs>' + (opt.locked && tier === 'secret' ? form(g, m, rb, 'question', '') : form(g, m, rb, art[0], art[1])) + '</svg>';
  }
  root.RQAchArt = { badge: badge, ART: ART, E: E, FORM: FORM };
})(typeof window !== 'undefined' ? window : globalThis);
