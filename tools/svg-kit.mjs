// Общие кусочки для всех SVG профиля.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const asset = (...p) => join(ROOT, "assets", ...p);

/** PNG как data: URI — SVG внутри <img> не может грузить внешние файлы. */
export const pngUri = (file) => `data:image/png;base64,${readFileSync(file).toString("base64")}`;
export const pngSize = (file) => {
  const b = readFileSync(file);
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
};

/** <image> с чёткими пикселями */
export const pimg = (file, x, y, w, h, attrs = "") =>
  `<image x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="none" style="image-rendering:pixelated"${attrs ? " " + attrs : ""} href="${pngUri(file)}"/>`;

// Палитра профиля: бирюза → салатовый (волосы), розовый (пряди), закат
export const C = {
  ink: "#0b0e24",
  plate: "#120f26",
  plate2: "#1b1636",
  teal: "#1fd1c1",
  mint: "#3fe0a0",
  lime: "#b4f55a",
  pink: "#ff8fd0",
  rose: "#ff6fae",
  shadow: "#4a1236",
  lilac: "#d9ccff",
  muted: "#a99cc9",
  peach: "#ffc28a",
};

export const FONT_UI = `'Segoe UI',-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif`;

/** Градиент «как волосы» по диагонали всего SVG */
export const hairGradient = (id, w, h) =>
  `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${w}" y2="${h}"><stop offset="0" stop-color="${C.teal}"/><stop offset=".55" stop-color="${C.mint}"/><stop offset="1" stop-color="${C.lime}"/></linearGradient>`;

/** Пиксельная рамка со срезанными углами: внешний контур + тёмная подложка */
export const frame = (w, h, b = 4, fill = "url(#g)", bg = C.plate) =>
  `<path d="M${b} 0H${w - b}V${b}H${w}V${h - b}H${w - b}V${h}H${b}V${h - b}H0V${b}H${b}Z" fill="${fill}"/>` +
  (bg ? `<rect x="${b}" y="${b}" width="${w - b * 2}" height="${h - b * 2}" fill="${bg}"/>` : "");

export const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function writeSvg(name, w, h, label, body, { css = "", defs = "" } = {}) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(label)}">
${css ? `<style>${css.trim()}\n@media (prefers-reduced-motion:reduce){*{animation:none!important}}</style>` : ""}
<defs>${defs}</defs>
${body}
</svg>
`;
  const file = asset(name);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, svg);
  console.log(`ok: ${name} ${w}x${h} (${(svg.length / 1024).toFixed(1)} KB)`);
}
