// Доска активности с переливом: node tools/make-activity.mjs [выходной.svg]
// Берёт календарь вкладов через GitHub GraphQL (токен: GITHUB_TOKEN или GH_TOKEN).
// В Actions запускается раз в день (.github/workflows/activity.yml) и публикуется в ветку output.
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pixelText, textWidth } from "./pixel-font.mjs";
import { frame, hairGradient, esc, C, FONT_UI } from "./svg-kit.mjs";

const LOGIN = process.env.PROFILE_LOGIN || "Rin-Boro";
const TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
const OUT = resolve(process.argv[2] || "dist/activity.svg");
if (!TOKEN) throw new Error("Нужен GITHUB_TOKEN или GH_TOKEN");

const query = `query($login:String!){user(login:$login){contributionsCollection{contributionCalendar{totalContributions weeks{contributionDays{date contributionCount weekday}}}}}}`;
const res = await fetch("https://api.github.com/graphql", {
  method: "POST",
  headers: { Authorization: `bearer ${TOKEN}`, "Content-Type": "application/json", "User-Agent": "profile-activity" },
  body: JSON.stringify({ query, variables: { login: LOGIN } }),
});
const json = await res.json();
if (!res.ok || json.errors) throw new Error(JSON.stringify(json.errors || json));
const cal = json.data.user.contributionsCollection.contributionCalendar;
const weeks = cal.weeks.map((w) => w.contributionDays);
const days = weeks.flat();

// ---------- статистика ----------
const max = Math.max(...days.map((d) => d.contributionCount));
const best = days.find((d) => d.contributionCount === max);
let longest = 0, run = 0;
for (const d of days) {
  run = d.contributionCount ? run + 1 : 0;
  longest = Math.max(longest, run);
}
let current = 0;
for (let i = days.length - 1; i >= 0; i--) {
  if (days[i].contributionCount) current++;
  else if (i === days.length - 1) continue; // сегодня ещё не вечер
  else break;
}
const quart = [...days.map((d) => d.contributionCount).filter(Boolean)].sort((a, b) => a - b);
const q = (p) => quart[Math.floor((quart.length - 1) * p)] || 1;
const level = (n) => (!n ? 0 : n <= q(0.25) ? 1 : n <= q(0.5) ? 2 : n <= q(0.75) ? 3 : 4);

const plural = (n) => (n % 10 === 1 && n % 100 !== 11 ? "вклад" : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? "вклада" : "вкладов");

// ---------- рисуем ----------
const W = 880, B = 4, CELL = 12, GAP = 3, STEP = CELL + GAP;
const gridW = weeks.length * STEP - GAP;
const GX = Math.round((W - gridW) / 2), GY = 128;
const H = GY + 7 * STEP - GAP + 52;
const GREENS = ["#1b1f2b", "#0e4429", "#006d32", "#26a641", "#39d353"];
const out = [frame(W, H, B, "url(#g)", C.ink)];

// три числа сверху
const stats = [
  [String(cal.totalContributions), "вкладов за год", C.lime],
  [String(current), "дней подряд сейчас", C.teal],
  [String(longest), "самая длинная серия", C.pink],
];
const colW = (W - 2 * GX) / 3;
stats.forEach(([num, label, color], i) => {
  const cx = GX + colW * i + colW / 2;
  out.push(pixelText(num, cx - textWidth(num, 5) / 2, 26, 5, color, C.shadow));
  out.push(`<text x="${cx}" y="88" font-family="${FONT_UI}" font-size="14" fill="${C.muted}" text-anchor="middle">${esc(label)}</text>`);
});

// месяцы
const MONTHS = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
let lastMonth = -1;
weeks.forEach((w, x) => {
  const m = new Date(w[0].date).getUTCMonth();
  if (m !== lastMonth && x < weeks.length - 2) {
    out.push(`<text x="${GX + x * STEP}" y="${GY - 8}" font-family="${FONT_UI}" font-size="11" fill="${C.muted}">${MONTHS[m]}</text>`);
    lastMonth = m;
  }
});

// клетки + перелив: светлая волна идёт по диагонали доски
const cells = [], waves = [];
weeks.forEach((w, x) =>
  w.forEach((d) => {
    const y = d.weekday;
    const px = GX + x * STEP, py = GY + y * STEP;
    const lv = level(d.contributionCount);
    cells.push(`<rect x="${px}" y="${py}" width="${CELL}" height="${CELL}" rx="2" fill="${GREENS[lv]}"><title>${d.date}: ${d.contributionCount}</title></rect>`);
    waves.push(`<rect x="${px}" y="${py}" width="${CELL}" height="${CELL}" rx="2" class="w${lv ? "" : " e"}" style="animation-delay:${(x * 0.05 + y * 0.1).toFixed(2)}s"/>`);
    if (d === best) cells.push(`<rect x="${px - 2}" y="${py - 2}" width="${CELL + 4}" height="${CELL + 4}" rx="3" fill="none" stroke="${C.rose}" stroke-width="2" class="best"/>`);
  }),
);
out.push(...cells, `<g fill="${C.lime}">${waves.join("")}</g>`);

// легенда
const ly = GY + 7 * STEP + 16;
out.push(`<text x="${GX}" y="${ly + 10}" font-family="${FONT_UI}" font-size="12" fill="${C.muted}">лучший день — ${new Date(best.date).toLocaleDateString("ru-RU", { day: "numeric", month: "long", timeZone: "UTC" })}: ${max} ${plural(max)}</text>`);
let lx = GX + gridW - 5 * STEP - 56;
out.push(`<text x="${lx - 6}" y="${ly + 10}" font-family="${FONT_UI}" font-size="12" fill="${C.muted}" text-anchor="end">меньше</text>`);
GREENS.forEach((g, i) => out.push(`<rect x="${lx + i * STEP}" y="${ly}" width="${CELL}" height="${CELL}" rx="2" fill="${g}"/>`));
out.push(`<text x="${lx + 5 * STEP + 4}" y="${ly + 10}" font-family="${FONT_UI}" font-size="12" fill="${C.muted}">больше</text>`);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Активность на GitHub: ${cal.totalContributions} вкладов за год, серия ${current} дн., рекорд ${longest} дн.">
<style>
.w{opacity:0;animation:w 6s ease-in-out infinite}.e{fill:${C.teal}}
@keyframes w{0%{opacity:0}7%{opacity:.75}18%,100%{opacity:0}}
.best{animation:best 1.6s steps(2) infinite}@keyframes best{50%{opacity:.3}}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}
</style>
<defs>${hairGradient("g", W, H)}</defs>
${out.join("\n")}
</svg>
`;
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, svg);
console.log(`ok: ${OUT} — ${cal.totalContributions} вкладов, серия ${current}, рекорд ${longest}, лучший день ${best.date} (${max})`);
