// Шапка, приветствие и карточка-портрет: node tools/make-scene.mjs
// Слои неба и замка готовит tools/make-backdrop.py (assets/build/), портрет — tools/make-avatar.py.
import { pixelText, ADVANCE } from "./pixel-font.mjs";
import { existsSync } from "node:fs";
import { asset, pimg, pngSize, frame, hairGradient, writeSvg, C, FONT_UI } from "./svg-kit.mjs";

const TILE = 576; // ширина бесшовного куска облаков
const b = (n) => asset("build", n);

const DRIFT_CSS = `
.drift{animation:drift linear infinite;animation-timing-function:steps(576)}
.far{animation-duration:160s}.near{animation-duration:70s}
@keyframes drift{to{transform:translateX(-576px)}}
.lamp{animation:lamp 4s ease-in-out infinite}
@keyframes lamp{0%,100%{opacity:1}50%{opacity:.5}}
.tw{animation:tw 3s ease-in-out infinite}
@keyframes tw{0%,100%{opacity:1}50%{opacity:.1}}
`;

// ---------- 1. шапка: мансарда и закатное небо ----------
// Зверушки: кадры из tools/make-critters.py, листаются CSS-анимацией по opacity
const critterFrames = (name) => {
  const frames = [];
  for (let i = 0; existsSync(b(`critters/${name}-${i}.png`)); i++) frames.push(b(`critters/${name}-${i}.png`));
  return frames;
};
/** Покадровая анимация: n кадров стопкой, каждый виден свою 1/n периода */
function flipbook(name, x, y, period, flip = false) {
  const frames = critterFrames(name);
  const [w, h] = pngSize(frames[0]);
  const n = frames.length;
  const t = flip ? ` transform="translate(${2 * x + w} 0) scale(-1 1)"` : "";
  return {
    w, h,
    svg:
      `<g${t}>` +
      frames
        .map((f, i) => pimg(f, x, y, w, h, `class="fb${n}" style="animation-duration:${period}s;animation-delay:${((i * period) / n).toFixed(3)}s"`))
        .join("") +
      `</g>`,
    css: `.fb${n}{opacity:0;animation:fb${n} steps(1) infinite}@keyframes fb${n}{0%{opacity:1}${(100 / n).toFixed(3)}%,100%{opacity:0}}`,
  };
}

const pct = (t, T) => +((t / T) * 100).toFixed(3);
/** keyframes, где элемент виден только в окна [a, b) секунд периода T */
function windowKeyframes(name, windows, T) {
  const marks = new Map([[0, 0], [100, 0]]);
  for (const [a, b2] of windows) {
    marks.set(pct(a, T), 1);
    if (!marks.has(pct(b2, T)) || pct(b2, T) === 100) marks.set(pct(b2, T), pct(b2, T) === 100 ? marks.get(100) : 0);
  }
  if (windows.some(([a]) => a === 0)) marks.set(0, 1);
  const body = [...marks.entries()].sort((x, y) => x[0] - y[0]).map(([k, v]) => `${k}%{opacity:${v}}`).join("");
  return `@keyframes ${name}{${body}}`;
}
/** Кадры по сценарию: seq = [[кадр, секунд], ...], крутится по кругу */
function seqbook(uid, name, seq, x = 0, y = 0) {
  const frames = critterFrames(name);
  const [w, h] = pngSize(frames[0]);
  const T = seq.reduce((a, [, d]) => a + d, 0);
  const wins = new Map();
  let t = 0;
  for (const [i, d] of seq) {
    if (!wins.has(i)) wins.set(i, []);
    wins.get(i).push([t, t + d]);
    t += d;
  }
  let css = "";
  const svg = [...wins.entries()]
    .map(([i, ws]) => {
      css += `.${uid}${i}{opacity:0;animation:${uid}${i} ${T.toFixed(3)}s steps(1,end) infinite}${windowKeyframes(`${uid}${i}`, ws, T)}
`;
      return pimg(frames[i], x, y, w, h, `class="${uid}${i}"`);
    })
    .join("");
  return { w, h, T, svg, css };
}
/** Обычный цикл всех кадров с равной длительностью */
const loop = (uid, name, frameSec) => seqbook(uid, name, critterFrames(name).map((_, i) => [i, frameSec]));

function makeBanner(file, extras = []) {
  const W = 960, H = 220;
  const css = new Set();
  const out = [
    pimg(b("banner-sky.png"), 0, 0, W, H),
    pimg(b("banner-far.png"), 0, 0, W + TILE, H, `class="drift far"`),
    pimg(b("banner-near.png"), 0, 0, W + TILE, H, `class="drift near"`),
  ];
  // птицы: два кадра взмаха, летят справа налево
  const birdUp = ["#...#", ".#.#.", "..#.."];
  const birdDown = [".....", "#.#.#", ".#.#."];
  const sprite = (rows, s, cls) =>
    `<g class="${cls}">` +
    rows.flatMap((row, y) => [...row].map((ch, x) => (ch === "#" ? `<rect x="${x * s}" y="${y * s}" width="${s}" height="${s}"/>` : ""))).join("") +
    `</g>`;
  [
    [70, 3, 0, 34],
    [92, 2, 6, 34],
    [48, 2, 17, 46],
  ].forEach(([y, s, delay, dur]) => {
    out.push(
      `<g fill="#3b2244" class="fly" style="animation-delay:-${delay}s;animation-duration:${dur}s"><g transform="translate(0 ${y})">${sprite(birdUp, s, "f1")}${sprite(birdDown, s, "f2")}</g></g>`,
    );
  });
  // красный дракон летит справа налево (из-за мансарды): машет крыльями, потом парит
  if (extras.includes("dragon-glide")) {
    const F = 0.13; // секунд на кадр взмаха
    const flap = (k) => Array.from({ length: 6 * k }, (_, i) => [i % 6, F]);
    const GLIDE = 4; // кадр с раскрытыми крыльями
    const seq = [...flap(2), [GLIDE, 2.4, true], ...flap(1), [GLIDE, 1.8, true], ...flap(3), [GLIDE, 2.6, true]];
    const d = seqbook("dg", "dragon-red", seq);
    css.add(d.css);
    // высота: на взмахах набирает, в парении плавно снижается — в такт сценарию
    let t = 0, yy = 0;
    const alt = [`0%{transform:translateY(0)}`];
    for (const [, dur, glide] of seq) {
      t += dur;
      if (glide) yy += 14;
      else yy -= 14 / 6 / 2.2;
      alt.push(`${pct(t, d.T)}%{transform:translateY(${yy.toFixed(1)}px)}`);
    }
    const drift = yy; // за цикл высота должна вернуться — растягиваем возврат на весь цикл
    const altFixed = alt.map((k) => k.replace(/translateY\(([-\d.]+)px\)/, (_, v) => {
      const p = parseFloat(k);
      return `translateY(${(parseFloat(v) - (drift * p) / 100).toFixed(1)}px)`;
    }));
    css.add(`.dalt{animation:dalt ${d.T.toFixed(3)}s linear infinite}@keyframes dalt{${altFixed.join("")}}`);
    const FLY = 14, PAUSE = 14, TT = FLY + PAUSE;
    css.add(`.dpath{animation:dpath ${TT}s linear infinite;transform:translate(${W + 20}px,30px)}
@keyframes dpath{0%{transform:translate(${W + 20}px,30px)}${pct(FLY, TT)}%{transform:translate(${-d.w - 20}px,44px)}100%{transform:translate(${-d.w - 20}px,44px)}}`);
    // кадры смотрят вправо — отражаем
    out.push(`<g class="dpath"><g class="dalt"><g transform="translate(${d.w} 0) scale(-1 1)">${d.svg}</g></g></g>`);
  }
  out.push(pimg(b("banner-castle.png"), 0, 0, W, H));
  // тёплый свет из витражей «дышит»
  out.push(`<ellipse cx="753" cy="130" rx="190" ry="110" fill="url(#lamp)" class="lamp"/>`);
  // светлячки у окон
  [[640, 120], [700, 60], [820, 52], [880, 118], [930, 90], [610, 170], [905, 165]].forEach(([x, y], i) =>
    out.push(`<rect x="${x}" y="${y}" width="3" height="3" fill="#ffe7a8" class="tw" style="animation-delay:${(i * 0.55).toFixed(2)}s"/>`),
  );
  // котик гуляет по черепице: идёт вправо, сидит, выгибает спинку, сидит, идёт обратно, сидит
  if (extras.includes("cat-walk")) {
    const GY = 196; // где лапы
    const X0 = 70, X1 = 430;
    const T = 36;
    const plan = [ // [состояние, направление, начало, конец]
      ["walk", 1, 0, 10], ["idle", 1, 10, 15], ["arch", 1, 15, 17.4], ["idle", 1, 17.4, 21],
      ["walk", -1, 21, 31], ["idle", -1, 31, 36],
    ];
    const books = { walk: loop("cw", "cat-walk", 0.13), idle: loop("ci", "cat-idle", 0.2), arch: loop("ca", "cat-arch", 0.22) };
    for (const bk of Object.values(books)) css.add(bk.css);
    const { w, h } = books.idle;
    const C = 40; // центр тела в кадре — вокруг него разворачиваемся
    const groups = [];
    for (const dir of [1, -1]) {
      for (const st of ["walk", "idle", "arch"]) {
        const wins = plan.filter(([s2, d2]) => s2 === st && d2 === dir).map(([, , a, b2]) => [a, b2]);
        if (!wins.length) continue;
        const uid = `cs${st}${dir > 0 ? "r" : "l"}`;
        css.add(`.${uid}{opacity:0;animation:${uid} ${T}s steps(1,end) infinite}${windowKeyframes(uid, wins, T)}`);
        const flip = dir < 0 ? ` transform="translate(${2 * C} 0) scale(-1 1)"` : "";
        groups.push(`<g class="${uid}"><g${flip}>${books[st].svg}</g></g>`);
      }
    }
    css.add(`.cpath{animation:cpath ${T}s linear infinite}
@keyframes cpath{0%{transform:translate(${X0}px,${GY - h}px)}${pct(10, T)}%,${pct(21, T)}%{transform:translate(${X1}px,${GY - h}px)}${pct(31, T)}%,100%{transform:translate(${X0}px,${GY - h}px)}}`);
    out.push(`<g class="cpath">${groups.join("")}</g>`);
  }
  if (extras.includes("rabbit")) {
    const fb = flipbook("rabbit", 190, 0, 1.6);
    out.push(fb.svg.replace(/y="0"/g, `y="${153 - fb.h}"`));
    css.add(fb.css);
  }
  writeSvg(file, W, H, "Пиксельная мансарда замка на фоне закатного неба", out.join("\n"), {
    css: `${DRIFT_CSS}
.fly{animation:fly linear infinite}
@keyframes fly{from{transform:translateX(${W + 20}px)}to{transform:translateX(-40px)}}
.f1{animation:f1 .5s steps(1) infinite}.f2{animation:f2 .5s steps(1) infinite}
@keyframes f1{50%{opacity:0}}@keyframes f2{0%{opacity:0}50%{opacity:1}}
${[...css].join("\n")}`,
    defs: `<radialGradient id="lamp"><stop offset="0" stop-color="#ffcf7a" stop-opacity=".3"/><stop offset="1" stop-color="#ffcf7a" stop-opacity="0"/></radialGradient>`,
  });
}

// основная шапка — состав зверей задаётся здесь; варианты для выбора — в assets/variants/
const BANNER_EXTRAS = ["cat-walk", "dragon-glide"];
makeBanner("banner.svg", BANNER_EXTRAS);
if (process.argv.includes("--variants")) {
  for (const [name, ex] of Object.entries({
    "cat-walk": ["cat-walk"],
    "dragon-glide": ["dragon-glide"],
    "cat-walk-dragon-glide": ["cat-walk", "dragon-glide"],
  }))
    makeBanner(`variants/banner-${name}.svg`, ex);
}

// ---------- 2. приветствие, которое печатается ----------
{
  const W = 960, H = 172, B = 4;
  const out = [frame(W, H, B)];
  const lines = [
    { text: "ПРИВЕТ! Я ЕКАТЕРИНА БОРОДИНОВА", x: 32, y: 26, s: 4, fill: "url(#g)", shadow: C.shadow, start: 0.4, step: 0.07 },
    { text: "FULLSTACK DEVELOPER", x: 32, y: 74, s: 3, fill: C.pink, shadow: C.ink, start: 3.0, step: 0.07 },
  ];
  // печать: каждая буква появляется в свой момент (CSS — работает везде, где работает <img>),
  // курсор едет шагами вслед за текстом
  let keyframes = "";
  lines.forEach(({ text, x, y, s, fill, shadow, start, step }, i) => {
    const chars = [...text];
    const n = chars.length;
    const adv = ADVANCE * s;
    chars.forEach((ch, k) => {
      if (ch === " ") return;
      out.push(`<g class="ch" style="animation-delay:${(start + k * step).toFixed(2)}s">${pixelText(ch, x + k * adv, y, s, fill, shadow)}</g>`);
    });
    const last = i === lines.length - 1;
    const end = start + n * step;
    keyframes += `@keyframes m${i}{to{transform:translateX(${n * adv}px)}}`;
    // последний курсор остаётся мигать в конце строки, остальные исчезают
    const hide = last ? "" : `,hide 0s ${(lines[i + 1].start).toFixed(2)}s forwards`;
    out.push(
      `<g class="ch" style="animation-delay:${start.toFixed(2)}s"><g style="animation:m${i} ${(n * step).toFixed(2)}s steps(${n}) ${start.toFixed(2)}s forwards${hide}"><rect x="${x + 2}" y="${y}" width="${s * 3}" height="${7 * s}" fill="${C.lilac}" class="blink"/></g></g>`,
    );
    if (last) keyframes += `/* end ${end.toFixed(2)}s */`;
  });
  // полоска направлений — обычным шрифтом, с переливом заката
  const dirs = "игры · сайты · боты · автоматизация · оцифровка · ИИ-агенты · базы знаний · SaaS";
  out.push(
    `<rect x="32" y="112" width="${W - 64}" height="2" fill="url(#g)" opacity=".5"/>`,
    `<text x="32" y="146" textLength="${W - 64}" lengthAdjust="spacing" font-family="${FONT_UI}" font-size="21" font-weight="600" fill="url(#flow)" class="fade">${dirs}</text>`,
  );
  writeSvg("hello.svg", W, H, "Привет! Я Екатерина Бородинова, Fullstack Developer: " + dirs, out.join("\n"), {
    css: `.blink{animation:blink 1s steps(1) infinite}@keyframes blink{50%{opacity:0}}
.ch{opacity:0;animation:show 0s forwards}@keyframes show{to{opacity:1}}@keyframes hide{to{opacity:0}}
.fade{opacity:0;animation:fade .8s ease-out 4.6s forwards}@keyframes fade{to{opacity:1}}
${keyframes}
@media (prefers-reduced-motion:reduce){.ch,.fade{opacity:1!important}}`,
    defs:
      hairGradient("g", W, H) +
      `<linearGradient id="flow" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="960" y2="0" spreadMethod="repeat"><stop offset="0" stop-color="${C.pink}"/><stop offset=".25" stop-color="${C.peach}"/><stop offset=".5" stop-color="${C.lilac}"/><stop offset=".75" stop-color="${C.teal}"/><stop offset="1" stop-color="${C.pink}"/><animateTransform attributeName="gradientTransform" type="translate" from="0 0" to="960 0" dur="9s" repeatCount="indefinite"/></linearGradient>`,
  });
}

// ---------- 3. карточка: я на фоне плывущих облаков ----------
{
  const B = 6, CW = 240, CH = 324;
  const W = CW + B * 2, H = CH + B * 2;
  const out = [frame(W, H, B, "url(#g)", null)];
  out.push(`<svg x="${B}" y="${B}" width="${CW}" height="${CH}" viewBox="0 0 ${CW} ${CH}" overflow="hidden">`);
  out.push(pimg(b("card-sky.png"), 0, 0, CW, CH));
  out.push(pimg(b("card-far.png"), 0, 0, CW + TILE, CH, `class="drift far"`));
  out.push(pimg(b("card-near.png"), 0, 0, CW + TILE, CH, `class="drift near"`));
  const av = asset("avatar.png");
  const [aw, ah] = pngSize(av);
  const AH = 300;
  const AW = Math.round((aw / ah) * AH);
  const AX = Math.round((CW - AW) / 2);
  out.push(pimg(av, AX, CH - AH, AW, AH, `filter="url(#rim)"`));
  // искры вокруг силуэта
  [[AX - 12, 150], [AX - 4, 210], [AX + 6, 100], [AX + AW + 4, 140], [AX + AW - 6, 96], [AX + AW + 8, 220]].forEach(([x, y], i) =>
    out.push(
      `<rect x="${x}" y="${y}" width="${4 + (i % 2) * 2}" height="${4 + (i % 2) * 2}" fill="${[C.teal, C.lime, C.rose][i % 3]}" filter="url(#glow)" class="spark s${1 + (i % 3)}" style="animation-delay:${(i * 0.45).toFixed(2)}s"/>`,
    ),
  );
  out.push(`</svg>`);
  writeSvg("portrait.svg", W, H, "Пиксельный портрет Екатерины на фоне закатного неба", out.join("\n"), {
    css: `${DRIFT_CSS}
.far{animation-duration:120s}.near{animation-duration:55s}
.spark{opacity:0;animation:2.8s steps(10) infinite}
.s1{animation-name:s1}.s2{animation-name:s2}.s3{animation-name:s3}
@keyframes s1{0%{opacity:0;transform:translate(0,0)}10%{opacity:1}100%{opacity:0;transform:translate(-14px,-80px)}}
@keyframes s2{0%{opacity:0;transform:translate(0,0)}10%{opacity:1}100%{opacity:0;transform:translate(10px,-90px)}}
@keyframes s3{0%{opacity:0;transform:translate(0,0)}10%{opacity:1}100%{opacity:0;transform:translate(22px,-70px)}}`,
    defs:
      hairGradient("g", W, H) +
      `<filter id="rim" x="-10%" y="-10%" width="120%" height="120%"><feDropShadow dx="0" dy="0" stdDeviation="3" flood-color="#ffd7a8" flood-opacity=".6"/></filter>` +
      `<filter id="glow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`,
  });
}
