// Карточки README: путь (лента + карточки мест), «сейчас делаю», направления, стек.
// node tools/make-cards.mjs   (иконки — assets/build/icons из make-backdrop.py, логотипы стека — tools/stack-icons.json)
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pixelText, textWidth } from "./pixel-font.mjs";
import { ROOT, asset, pimg, frame, hairGradient, writeSvg, esc, C, FONT_UI } from "./svg-kit.mjs";

const W = 880;
const icon = (name) => asset("build", "icons", `${name}.png`);
const GLOW = `<filter id="glow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;

/** Перенос строки по оценке ширины системного шрифта */
function wrap(str, maxW, fs) {
  const cw = (ch) => (ch === " " ? 0.28 : /[A-ZА-ЯЁ0-9]/.test(ch) ? 0.66 : /[ilj.,·:;!|'’]/.test(ch) ? 0.3 : /[шщжмюыф]/.test(ch) ? 0.78 : 0.56) * fs;
  const width = (s) => [...s].reduce((a, ch) => a + cw(ch), 0);
  const lines = [];
  let cur = "";
  for (const word of str.split(" ")) {
    const next = cur ? cur + " " + word : word;
    if (width(next) > maxW && cur) {
      lines.push(cur);
      cur = word;
    } else cur = next;
  }
  if (cur) lines.push(cur);
  return { lines, width };
}

const text = (x, y, str, { fs = 15, fill = C.lilac, weight = 400, anchor = "start", extra = "" } = {}) =>
  `<text x="${x}" y="${y}" font-family="${FONT_UI}" font-size="${fs}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}"${extra ? " " + extra : ""}>${esc(str)}</text>`;

/** Плитка с пиксельной иконкой из «Книги заклинаний» */
const iconTile = (name, x, y, size, border = "url(#g)") =>
  `<g transform="translate(${x} ${y})">${frame(size, size, 3, border, C.ink)}${pimg(icon(name), 3, 3, size - 6, size - 6)}</g>`;

const chip = (x, y, label, color) => {
  const w = Math.round(wrap(label, 999, 12).width(label)) + 20;
  return {
    w,
    svg: `<rect x="${x}" y="${y}" width="${w}" height="22" rx="11" fill="${color}" fill-opacity=".14" stroke="${color}" stroke-opacity=".55"/>` +
      text(x + w / 2, y + 15, label, { fs: 12, fill: color, weight: 600, anchor: "middle" }),
  };
};

// ================= МОЙ ПУТЬ =================
const JOBS = [
  {
    key: "freelance", icon: "runner", title: "ФРИЛАНС", years: "2020 - 2022", y0: 2020, y1: 2022, color: C.peach,
    sub: "первые коммерческие заказы",
    task: "небольшим бизнесам нужны сайты и Telegram-боты: быстро, недорого и под ключ",
    done: "сайты и боты от идеи до запуска, общение с заказчиками напрямую, поддержка после релиза",
    chips: ["JavaScript", "Python", "Telegram-боты", "HTML/CSS"],
  },
  {
    key: "localie", icon: "clover", title: "LOCALIE", years: "2022 - 2024", y0: 2022, y1: 2024, color: C.lime,
    sub: "продуктовая команда: автоматизация, платежи, новые разделы",
    task: "убрать ручную рутину в поддержке, подключить регулярные платежи и развивать продукт",
    done: "автоматизировала статусы и процессы тикетов и чата, добавила автоплатежи через Stripe, сделала полностью новые страницы и модули взаимодействия с пользователем",
    chips: ["TypeScript", "JavaScript", "Stripe", "автоматизация"],
  },
  {
    key: "mycircles", icon: "eye", title: "MY CIRCLES AI", years: "2024 - 2025", y0: 2024, y1: 2025, color: C.pink,
    sub: "автоматическое ведение профиля в LinkedIn с помощью ИИ",
    task: "вести LinkedIn-профиль за человека: находить и анализировать контент, готовить публикации",
    done: "веб-приложение, админка, API и браузерное расширение; анализ контента через LangChain. 300+ коммитов",
    chips: ["TypeScript", "React", "Node.js", "LangChain", "браузерное расширение"],
  },
  {
    key: "nda-ai", icon: "hand", title: "NDA · AI-ПЛАТФОРМА", years: "2025 - СЕЙЧАС", y0: 2025, y1: 2026, color: C.teal, now: true,
    sub: "AI-продукт для бизнеса",
    task: "проект под NDA, поэтому без подробностей",
    done: "fullstack-разработка AI-продукта: от задачи до продакшена",
    chips: ["🔒 детали под NDA"],
  },
  {
    key: "nda-saas", icon: "clouds", title: "NDA · B2B SAAS", years: "2026", y0: 2026, y1: 2026, color: C.lilac, now: true,
    sub: "B2B-платформа",
    task: "проект под NDA, поэтому без подробностей",
    done: "fullstack-разработка: несколько сервисов с нуля и вывод в продакшен",
    chips: ["🔒 детали под NDA"],
  },
];

// ---- лента: горизонтальный обзор пути, по ней бежит огонёк ----
{
  const H = 186, B = 4;
  const L = 70, R = W - 70, LY = 86;
  const years = [2020, 2021, 2022, 2023, 2024, 2025, 2026];
  const xOf = (y) => L + ((y - 2020) / 6) * (R - L);
  const out = [frame(W, H, B)];
  out.push(`<rect x="${L}" y="${LY - 2}" width="${R - L}" height="4" fill="${C.plate2}"/>`);
  out.push(`<rect x="${L}" y="${LY - 2}" width="${R - L}" height="4" fill="url(#g)" class="grow"/>`);
  years.forEach((y) => {
    out.push(`<rect x="${xOf(y) - 1}" y="${LY + 6}" width="2" height="6" fill="${C.muted}" opacity=".6"/>`);
    out.push(pixelText(String(y), xOf(y) - textWidth(String(y), 2) / 2, LY + 18, 2, C.muted));
  });
  // станции — места работы; одинаковые годы разводим
  const stations = [
    ["runner", 2020, C.peach, "ФРИЛАНС"],
    ["clover", 2022, C.lime, "LOCALIE"],
    ["eye", 2024, C.pink, "MY CIRCLES AI"],
    ["hand", 2025, C.teal, "NDA AI"],
    ["clouds", 2026, C.lilac, "NDA SAAS"],
  ];
  stations.forEach(([ic, y, color, label], i) => {
    const x = xOf(y);
    const S = 44;
    out.push(`<g class="pop" style="animation-delay:${(0.3 + i * 0.5).toFixed(1)}s">`);
    out.push(iconTile(ic, x - S / 2, LY - S - 14, S, color));
    out.push(`<rect x="${x - 5}" y="${LY - 5}" width="10" height="10" fill="${color}" filter="url(#glow)"/>`);
    out.push(pixelText(label, x - textWidth(label, 2) / 2, LY + 40 + (i % 2) * 22, 2, color));
    out.push(`</g>`);
  });
  // «сейчас» — пульсирует
  out.push(`<rect x="${xOf(2026) - 9}" y="${LY - 9}" width="18" height="18" fill="none" stroke="${C.lime}" stroke-width="2" class="pulse"/>`);
  // бегущий огонёк
  out.push(`<rect x="${L - 4}" y="${LY - 4}" width="8" height="8" fill="#fff6d8" filter="url(#glow)" class="run"/>`);
  writeSvg("path-line.svg", W, H, "Мой путь: фриланс 2020, Localie 2022, My Circles AI 2024, AI-платформа 2025, B2B SaaS 2026", out.join("\n"), {
    css: `
.grow{transform-origin:${L}px 0;animation:grow 2.6s steps(26) both}@keyframes grow{from{transform:scaleX(0)}}
.pop{opacity:0;animation:pop .4s steps(4) forwards}@keyframes pop{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
.pulse{transform-box:fill-box;transform-origin:center;animation:pulse 1.6s ease-out infinite}@keyframes pulse{from{transform:scale(1);opacity:1}to{transform:scale(2.2);opacity:0}}
.run{animation:run 6s linear 3s infinite;opacity:0}@keyframes run{0%{opacity:0;transform:translateX(0)}5%{opacity:1}90%{opacity:1}100%{opacity:0;transform:translateX(${R - L}px)}}
@media (prefers-reduced-motion:reduce){.pop{opacity:1}}`,
    defs: hairGradient("g", W, H) + GLOW,
  });
}

// ---- карточка места работы ----
for (const job of JOBS) {
  const B = 3, PAD = 22, IS = 96;
  const TX = PAD + IS + 24;
  const TW = W - TX - PAD;
  const FS = 15, LH = 21;
  const out = [];
  let y = PAD;
  const body = [];
  // заголовок + годы
  body.push(pixelText(job.title, TX, y + 2, 3, job.color, C.ink));
  const yw = textWidth(job.years, 2) + 20;
  body.push(`<rect x="${W - PAD - yw}" y="${y}" width="${yw}" height="26" fill="${C.plate2}" stroke="${job.color}" stroke-opacity=".6"/>`);
  body.push(pixelText(job.years, W - PAD - yw + 10, y + 6, 2, job.color));
  if (job.now) body.push(`<rect x="${W - PAD - yw - 18}" y="${y + 9}" width="8" height="8" fill="${C.lime}" class="blink"/>`);
  y += 21 + 22;
  body.push(text(TX, y, job.sub, { fs: FS, fill: C.muted, extra: `font-style="italic"` }));
  y += 12;
  for (const [label, str, color] of [["Задача", job.task, C.pink], ["Что сделала", job.done, C.teal]]) {
    y += LH + 4;
    const lw = label.length * 8.6 + 14;
    body.push(text(TX, y, label, { fs: FS, fill: color, weight: 700 }));
    const { lines } = wrap(str, TW - lw, FS);
    lines.forEach((ln, i) => {
      body.push(text(TX + lw, y + i * LH, ln, { fs: FS, fill: "#ece6ff" }));
    });
    y += (lines.length - 1) * LH;
  }
  y += 16;
  let cx = TX;
  for (const c of job.chips) {
    const ch = chip(cx, y, c, job.color);
    body.push(ch.svg);
    cx += ch.w + 8;
  }
  y += 22 + PAD;
  const H = Math.max(y, PAD * 2 + IS + 10);
  out.push(frame(W, H, B, job.color, C.plate));
  out.push(`<rect x="${B}" y="${B}" width="6" height="${H - B * 2}" fill="${job.color}" opacity=".85"/>`);
  out.push(iconTile(job.icon, PAD + 6, PAD, IS, job.color));
  out.push(...body);
  writeSvg(`job-${job.key}.svg`, W, H, `${job.title}, ${job.years}: ${job.sub}. Задача: ${job.task}. Что сделала: ${job.done}`, out.join("\n"), {
    css: `.blink{animation:blink 1.2s steps(1) infinite}@keyframes blink{50%{opacity:.2}}`,
  });
}

// ================= СЕЙЧАС ДЕЛАЮ =================
{
  const NOW = [
    ["ice", "В РАБОТЕ", C.teal, "AI-продукты для бизнеса в команде. Проекты под NDA, поэтому без подробностей 🔒"],
    ["fireball", "ДЛЯ СЕБЯ", C.pink, "обучающая платформа по программированию: задачи на JS, Python, C# и C++, код запускается в браузере, а в сюжетном квесте учишься колдовать кодом"],
    ["vines", "УЧУСЬ", C.lime, "Unity и C#: 2D RPG, где сюжет пишет локальная LLM, а броски кубиков честно считает движок"],
  ];
  const GAP = 16, CWd = (W - GAP * 2) / 3, IS = 64, FS = 14, LH = 20, PAD = 18;
  const blocks = NOW.map(([ic, title, color, desc]) => ({ ic, title, color, lines: wrap(desc, CWd - PAD * 2, FS).lines }));
  const H = PAD + IS + 18 + Math.max(...blocks.map((b) => b.lines.length)) * LH + PAD;
  const out = [];
  blocks.forEach(({ ic, title, color, lines }, i) => {
    const x = i * (CWd + GAP);
    out.push(`<g transform="translate(${x} 0)" class="pop" style="animation-delay:${(i * 0.35).toFixed(2)}s">`);
    out.push(frame(CWd, H, 3, color, C.plate));
    out.push(`<g class="bob" style="animation-delay:${(i * 0.6).toFixed(1)}s">${iconTile(ic, PAD, PAD, IS, color)}</g>`);
    out.push(pixelText(title, PAD + IS + 16, PAD + 22, 3, color, C.ink));
    lines.forEach((ln, k) => out.push(text(PAD, PAD + IS + 26 + k * LH, ln, { fs: FS, fill: "#ece6ff" })));
    out.push(`</g>`);
  });
  writeSvg("now.svg", W, H, "Сейчас делаю: " + NOW.map((n) => `${n[1]} — ${n[3]}`).join("; "), out.join("\n"), {
    css: `.pop{opacity:0;animation:pop .5s steps(5) forwards}@keyframes pop{from{opacity:0}to{opacity:1}}
.bob{animation:bob 2.4s steps(2) infinite}@keyframes bob{50%{transform:translateY(-3px)}}
@media (prefers-reduced-motion:reduce){.pop{opacity:1}}`,
  });
}

// ================= ЧЕМ ЗАНИМАЮСЬ =================
{
  const SKILLS = [
    ["roots", "RAG и базы знаний", C.teal, "векторный поиск · эмбеддинги · пайплайн оцифровки · ссылки на источники"],
    ["flames", "ИИ-интеграции и агенты", C.pink, "OpenAI · Gemini · Ollama · LangChain · конструктор агентов"],
    ["bolt", "Оцифровка и автоматизация", C.peach, "OCR · правила на естественном языке · миграция файлов · дайджесты"],
    ["spikes", "SaaS-платформы", C.lilac, "мультиарендность · Postgres RLS · SSO · 2FA · Stripe"],
    ["wings", "Боты и Mini Apps", C.teal, "aiogram · Pyrogram · slack_bolt · Telegram Payments"],
    ["wisps", "Игры и обучение", C.pink, "Three.js · pixi.js · Unity · код в браузере · сюжетный движок"],
    ["waves", "Веб и бэкенд", C.lime, "Next.js · React · FastAPI · GraphQL · PostgreSQL · Redis"],
    ["tornado", "DevOps и качество", C.lilac, "Docker · CI/CD · Nginx · Playwright · Vitest · ревью"],
  ];
  const COLS = 4, GAP = 12, TW = (W - GAP * (COLS - 1)) / COLS, IS = 56, PAD = 14, FS = 13, LH = 18;
  const tiles = SKILLS.map(([ic, title, color, kw]) => ({ ic, title, color, tl: wrap(title, TW - PAD * 2, 16).lines, kl: wrap(kw, TW - PAD * 2, FS).lines }));
  const TH = PAD + IS + 12 + Math.max(...tiles.map((t) => t.tl.length * 21 + t.kl.length * LH)) + PAD;
  const rows = Math.ceil(SKILLS.length / COLS);
  const H = rows * TH + (rows - 1) * GAP;
  const out = [];
  tiles.forEach(({ ic, color, tl, kl }, i) => {
    const x = (i % COLS) * (TW + GAP), y = Math.floor(i / COLS) * (TH + GAP);
    out.push(`<g transform="translate(${x} ${y})">`);
    out.push(frame(TW, TH, 3, color, C.plate));
    out.push(`<rect x="3" y="3" width="${TW - 6}" height="${PAD + IS + 6}" fill="${color}" opacity=".08"/>`);
    out.push(`<g class="glim" style="animation-delay:${(i * 0.5).toFixed(1)}s">${iconTile(ic, PAD, PAD, IS, color)}</g>`);
    let ty = PAD + IS + 28;
    tl.forEach((ln) => { out.push(text(PAD, ty, ln, { fs: 16, fill: color, weight: 700 })); ty += 21; });
    ty += 2;
    kl.forEach((ln) => { out.push(text(PAD, ty, ln, { fs: FS, fill: "#d8d0f0" })); ty += LH; });
    out.push(`</g>`);
  });
  writeSvg("skills.svg", W, H, "Чем занимаюсь: " + SKILLS.map((s) => `${s[1]} (${s[3]})`).join("; "), out.join("\n"), {
    css: `.glim{animation:glim 4s steps(4) infinite}@keyframes glim{0%,85%,100%{opacity:1}92%{opacity:.55}}`,
  });
}

// ================= СТЕК =================
{
  const ICONS = JSON.parse(readFileSync(join(ROOT, "tools", "stack-icons.json"), "utf8"));
  const GROUPS = [
    ["ФРОНТЕНД", C.teal, ["typescript", "javascript", "react", "nextdotjs", "vite", "tailwindcss", "threedotjs"]],
    ["БЭКЕНД", C.pink, ["nodedotjs", "express", "graphql", "python", "fastapi", "flask", "dotnet"]],
    ["ДАННЫЕ", C.lime, ["postgresql", "supabase", "mongodb", "redis", "sqlite", "prisma"]],
    ["ИИ", C.peach, ["openai", "langchain", "ollama", "googlegemini"]],
    ["DEVOPS", C.lilac, ["docker", "nginx", "linux", "githubactions", "git", "hetzner"]],
    ["ИГРЫ И БОТЫ", C.teal, ["unity", "telegram", "slack", "stripe", "vitest"]],
  ];
  // тёмные фирменные цвета не видны на тёмной плашке — осветляем
  const lum = (hex) => {
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
    return 0.299 * r + 0.587 * g + 0.114 * b;
  };
  const LBL = 140, TS = 92, GAP = 8, RH = 92, PADX = 24, PADY = 20;
  const H = GROUPS.length * (RH + GAP) - GAP + PADY * 2;
  const out = [frame(W, H, 4, "url(#g)", C.ink)];
  const mix = (hex) => "#" + [0, 2, 4].map((i) => Math.round((parseInt(hex.slice(i, i + 2), 16) + 255) / 2).toString(16).padStart(2, "0")).join("");
  GROUPS.forEach(([label, color, keys], r) => {
    const y = PADY + r * (RH + GAP);
    out.push(pixelText(label, PADX, y + RH / 2 - 7, 2, color));
    out.push(`<rect x="${PADX}" y="${y + RH / 2 + 10}" width="${textWidth(label, 2)}" height="2" fill="${color}" opacity=".5"/>`);
    keys.forEach((k, i) => {
      const ic = ICONS[k];
      const x = PADX + LBL + i * (TS + GAP);
      const l = lum(ic.hex);
      const fill = l < 45 ? "#e8e4f5" : l < 100 ? mix(ic.hex) : `#${ic.hex}`;
      out.push(`<g transform="translate(${x} ${y})">`);
      out.push(frame(TS, RH, 3, C.plate2, C.plate));
      out.push(`<g transform="translate(${TS / 2 - 18} 14) scale(1.5)"><path d="${ic.path}" fill="${fill}"/></g>`);
      out.push(text(TS / 2, RH - 14, ic.name, { fs: 12, fill: "#d8d0f0", weight: 600, anchor: "middle" }));
      out.push(`</g>`);
    });
  });
  writeSvg("stack.svg", W, H, "Стек: " + GROUPS.map(([l, , ks]) => `${l}: ${ks.map((k) => ICONS[k].name).join(", ")}`).join("; "), out.join("\n"), {
    defs: hairGradient("g", W, H),
  });
}
