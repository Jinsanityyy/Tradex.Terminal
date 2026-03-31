import { Resvg } from "@resvg/resvg-js";
import { writeFileSync } from "fs";

// The icon SVG — candlestick chart on dark background
function buildSvg(size) {
  const s = size;
  const pad = Math.round(s * 0.1);
  const r = Math.round(s * 0.16); // border radius

  // Candle dimensions scaled to size
  const cw = Math.round(s * 0.19);   // candle body width
  const gap = Math.round(s * 0.06);  // gap between candles
  const wt = Math.round(s * 0.05);   // wick thickness

  const totalW = cw * 3 + gap * 2;
  const startX = Math.round((s - totalW) / 2);

  // Candle 1 (left, green, medium)
  const c1x = startX;
  const c1bh = Math.round(s * 0.31); // body height
  const c1by = Math.round(s * 0.35); // body y
  const c1wt = c1by - Math.round(s * 0.1);
  const c1wb = Math.round(s * 0.12);

  // Candle 2 (middle, red, tall)
  const c2x = startX + cw + gap;
  const c2bh = Math.round(s * 0.40);
  const c2by = Math.round(s * 0.22);
  const c2wt = c2by - Math.round(s * 0.1);
  const c2wb = Math.round(s * 0.1);

  // Candle 3 (right, green, tallest)
  const c3x = startX + (cw + gap) * 2;
  const c3bh = Math.round(s * 0.50);
  const c3by = Math.round(s * 0.13);
  const c3wt = c3by - Math.round(s * 0.08);
  const c3wb = Math.round(s * 0.1);

  const cx1 = c1x + cw / 2;
  const cx2 = c2x + cw / 2;
  const cx3 = c3x + cw / 2;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${s} ${s}" width="${s}" height="${s}">
  <rect width="${s}" height="${s}" rx="${r}" fill="#0a0e1a"/>
  <rect width="${s}" height="${s}" rx="${r}" fill="none" stroke="#5fc77a" stroke-width="${Math.max(1, Math.round(s*0.025))}" stroke-opacity="0.25"/>

  <!-- Candle 1: Bullish green -->
  <line x1="${cx1}" y1="${c1by - c1wt}" x2="${cx1}" y2="${c1by}" stroke="#5fc77a" stroke-width="${wt}" stroke-linecap="round"/>
  <rect x="${c1x}" y="${c1by}" width="${cw}" height="${c1bh}" rx="${Math.max(1,Math.round(s*0.025))}" fill="#5fc77a"/>
  <line x1="${cx1}" y1="${c1by + c1bh}" x2="${cx1}" y2="${c1by + c1bh + c1wb}" stroke="#5fc77a" stroke-width="${wt}" stroke-linecap="round"/>

  <!-- Candle 2: Bearish red -->
  <line x1="${cx2}" y1="${c2by - c2wt}" x2="${cx2}" y2="${c2by}" stroke="#ef4444" stroke-width="${wt}" stroke-linecap="round"/>
  <rect x="${c2x}" y="${c2by}" width="${cw}" height="${c2bh}" rx="${Math.max(1,Math.round(s*0.025))}" fill="#ef4444"/>
  <line x1="${cx2}" y1="${c2by + c2bh}" x2="${cx2}" y2="${c2by + c2bh + c2wb}" stroke="#ef4444" stroke-width="${wt}" stroke-linecap="round"/>

  <!-- Candle 3: Bullish green tall -->
  <line x1="${cx3}" y1="${c3by - c3wt}" x2="${cx3}" y2="${c3by}" stroke="#5fc77a" stroke-width="${wt}" stroke-linecap="round"/>
  <rect x="${c3x}" y="${c3by}" width="${cw}" height="${c3bh}" rx="${Math.max(1,Math.round(s*0.025))}" fill="#5fc77a"/>
  <line x1="${cx3}" y1="${c3by + c3bh}" x2="${cx3}" y2="${c3by + c3bh + c3wb}" stroke="#5fc77a" stroke-width="${wt}" stroke-linecap="round"/>
</svg>`;
}

const sizes = [192, 512, 180, 32];

for (const size of sizes) {
  const svg = buildSvg(size);
  const resvg = new Resvg(svg, { fitTo: { mode: "width", value: size } });
  const png = resvg.render().asPng();
  const filename = size === 180
    ? `public/apple-touch-icon.png`
    : size === 32
    ? `public/favicon-32.png`
    : `public/icon-${size}.png`;
  writeFileSync(filename, png);
  console.log(`Generated ${filename} (${size}x${size})`);
}
