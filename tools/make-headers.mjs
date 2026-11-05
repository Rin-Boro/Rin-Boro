// Пиксельные заголовки разделов README в стиле баннера: node tools/make-headers.mjs
// Пишет assets/h-*.svg
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pixelText, textWidth } from "./pixel-font.mjs";

const here = dirname(fileURLToPath(import.meta.url));

const HEADERS = {
  about: "ОБО МНЕ",
  now: "СЕЙЧАС ДЕЛАЮ",
  skills: "ЧЕМ ЗАНИМАЮСЬ",
  stack: "СТЕК",
  activity: "АКТИВНОСТЬ",
  path: "МОЙ ПУТЬ",
  contacts: "КОНТАКТЫ",
};

const S = 4; // размер пикселя шрифта
const B = 4; // толщина рамки
const PAD_X = 18;
const PAD_Y = 12;
const GREENS = ["#0e4429", "#26a641", "#39d353"];
const BULLET = 3 * 10 + 2 * 4; // три квадратика активности слева

for (const [key, label] of Object.entries(HEADERS)) {
  const tw = textWidth(label, S);
  const w = B * 2 + PAD_X * 2 + BULLET + 16 + tw + S;
  const h = B * 2 + PAD_Y * 2 + 7 * S + S;
  const parts = [];
  // рамка с «пиксельно» срезанными углами
  parts.push(`<path d="M${B} 0H${w - B}V${B}H${w}V${h - B}H${w - B}V${h}H${B}V${h - B}H0V${B}H${B}Z" fill="url(#g)"/>`);
  parts.push(`<rect x="${B}" y="${B}" width="${w - B * 2}" height="${h - B * 2}" fill="#0b0e24"/>`);
  // квадратики активности
  const by = (h - 10) / 2;
  GREENS.forEach((c, i) => {
    parts.push(`<rect x="${B + PAD_X + i * 14}" y="${by}" width="10" height="10" fill="${c}" class="c" style="animation-delay:${i * 0.4}s"/>`);
  });
  parts.push(pixelText(label, B + PAD_X + BULLET + 16, B + PAD_Y, S, "url(#g)", "#4a1236"));

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges" role="img" aria-label="${label}">
<style>.c{animation:c 2.4s ease-in-out infinite}@keyframes c{50%{opacity:.35}}@media (prefers-reduced-motion:reduce){.c{animation:none}}</style>
<defs><linearGradient id="g" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${w}" y2="${h}"><stop offset="0" stop-color="#1fd1c1"/><stop offset=".55" stop-color="#3fe0a0"/><stop offset="1" stop-color="#b4f55a"/></linearGradient></defs>
${parts.join("\n")}
</svg>
`;
  const file = join(here, "..", "assets", `h-${key}.svg`);
  writeFileSync(file, svg);
  console.log(`ok: h-${key}.svg ${w}x${h}`);
}
