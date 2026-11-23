/**
 * Bespoke Tokyo Independent Print Magazine Manga Storyboard Plate Generator
 * Generates all 71 structurally exact comic storyboard plates (SB-001 .. SB-071)
 * in a unified 750x1000 (3:4) editorial print aesthetic:
 *   - Warm Washi Paper (#FAF7F0) with subtle manuscript crop ticks
 *   - Sumi Ink (#181816) comic borders, halftone screentones & expressive manga vignettes
 *   - Cinnabar Vermilion (#C83E2B) reading-order stamps & directional flow lines
 */

export const CANVAS_W = 750;
export const CANVAS_H = 1000;

const INK = '#181816';
const INK_SOFT = '#3B3934';
const PAPER = '#FAF7F0';
const PANEL_WHITE = '#FFFFFF';
const PANEL_WARM = '#F3EFE4';
const PANEL_STONE = '#E9E4D8';
const PANEL_SLATE = '#E3E9EC';
const PANEL_SAGE = '#E5EBE2';
const PANEL_BLUSH = '#F3E7E2';
const SEAL = '#C83E2B';
const GOLD = '#D5A24C';
const SLATE = '#5A7182';

function esc(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function defsBlock(uid) {
  return `
  <defs>
    <pattern id="dots-${uid}" width="10" height="10" patternUnits="userSpaceOnUse">
      <circle cx="3" cy="3" r="1.45" fill="${INK}" opacity="0.16" />
    </pattern>
    <pattern id="dots-dark-${uid}" width="8" height="8" patternUnits="userSpaceOnUse">
      <circle cx="2.5" cy="2.5" r="1.7" fill="${INK}" opacity="0.32" />
    </pattern>
    <pattern id="hatch-${uid}" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(42)">
      <line x1="0" y1="0" x2="0" y2="12" stroke="${INK}" stroke-width="1.4" opacity="0.18" />
    </pattern>
    <pattern id="speed-${uid}" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(-18)">
      <line x1="0" y1="0" x2="0" y2="14" stroke="${INK}" stroke-width="2" opacity="0.22" />
    </pattern>
    <pattern id="grid-${uid}" width="24" height="24" patternUnits="userSpaceOnUse">
      <path d="M 24 0 L 0 0 0 24" fill="none" stroke="${INK}" stroke-width="0.6" opacity="0.08" />
    </pattern>
    <marker id="arrow-${uid}" viewBox="0 0 12 12" refX="9" refY="6" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
      <path d="M 1 2 L 10 6 L 1 10 z" fill="${SEAL}" />
    </marker>
    <linearGradient id="spine-${uid}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#181816" stop-opacity="0" />
      <stop offset="48%" stop-color="#181816" stop-opacity="0.14" />
      <stop offset="50%" stop-color="#181816" stop-opacity="0.24" />
      <stop offset="52%" stop-color="#181816" stop-opacity="0.12" />
      <stop offset="100%" stop-color="#181816" stop-opacity="0" />
    </linearGradient>
    <filter id="card-shadow-${uid}" x="-10%" y="-10%" width="125%" height="125%">
      <feDropShadow dx="4" dy="6" stdDeviation="4" flood-color="#181816" flood-opacity="0.12" />
    </filter>
  </defs>`;
}

function pageFrame(uid) {
  return `
  <rect x="0" y="0" width="${CANVAS_W}" height="${CANVAS_H}" fill="${PAPER}" />
  <rect x="0" y="0" width="${CANVAS_W}" height="${CANVAS_H}" fill="url(#grid-${uid})" opacity="0.45" />
  <!-- Subtle Manga Genko Yoshi Registration Crop Marks -->
  <g stroke="${INK}" stroke-width="1.2" opacity="0.26">
    <path d="M 26 42 L 42 42 M 42 26 L 42 42" />
    <path d="M 724 42 L 708 42 M 708 26 L 708 42" />
    <path d="M 26 958 L 42 958 M 42 974 L 42 958" />
    <path d="M 724 958 L 708 958 M 708 974 L 708 958" />
  </g>`;
}

/** Crisp Vermilion Reading-Order Number Stamp */
function stepBadge(x, y, label, size = 34, dark = false) {
  const r = size / 2;
  const fill = dark ? INK : SEAL;
  const fontSize = String(label).length > 1 ? Math.round(size * 0.44) : Math.round(size * 0.54);
  return `
  <g transform="translate(${x}, ${y})">
    <circle cx="0" cy="0" r="${r}" fill="${fill}" stroke="${PAPER}" stroke-width="2.5" />
    <text x="0" y="${Math.round(fontSize * 0.35)}" text-anchor="middle" fill="#FFFFFF"
      font-family="ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif"
      font-size="${fontSize}" font-weight="800" letter-spacing="-0.02em">${esc(label)}</text>
  </g>`;
}

/** Flow Arrow between points */
function flowArrow(uid, d, dashed = true) {
  return `<path d="${d}" fill="none" stroke="${SEAL}" stroke-width="4.5" stroke-linecap="round"
    ${dashed ? 'stroke-dasharray="10 8"' : ''} marker-end="url(#arrow-${uid})" />`;
}

/** Manga Speech Bubble */
function speechBubble(cx, cy, rx, ry, tailDx = -14, tailDy = 24) {
  return `
  <g>
    <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#FFFFFF" stroke="${INK}" stroke-width="2.6" />
    <path d="M ${cx + tailDx * 0.3} ${cy + ry * 0.72} L ${cx + tailDx} ${cy + ry + tailDy} L ${cx + tailDx * 0.3 + 12} ${cy + ry * 0.8}"
      fill="#FFFFFF" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round" />
    <ellipse cx="${cx}" cy="${cy}" rx="${rx - 1.5}" ry="${ry - 1.5}" fill="#FFFFFF" />
    <line x1="${cx - rx * 0.5}" y1="${cy - 4}" x2="${cx + rx * 0.5}" y2="${cy - 4}" stroke="${INK}" stroke-width="2" stroke-linecap="round" opacity="0.35" />
    <line x1="${cx - rx * 0.35}" y1="${cy + 5}" x2="${cx + rx * 0.32}" y2="${cy + 5}" stroke="${INK}" stroke-width="2" stroke-linecap="round" opacity="0.28" />
  </g>`;
}

/** Spiky Action Burst / Impact Star */
function impactBurst(cx, cy, rOuter, rInner, points = 14, fill = '#FFFFFF', stroke = INK) {
  const pts = [];
  for (let i = 0; i < points * 2; i++) {
    const angle = (i * Math.PI) / points - Math.PI / 2;
    const r = i % 2 === 0 ? rOuter : rInner;
    pts.push(`${(cx + Math.cos(angle) * r).toFixed(1)},${(cy + Math.sin(angle) * r).toFixed(1)}`);
  }
  return `<polygon points="${pts.join(' ')}" fill="${fill}" stroke="${stroke}" stroke-width="3" stroke-linejoin="miter" />`;
}

/** Radial Manga Focus Speedlines centered at (cx, cy) */
function radialLines(cx, cy, rMin, rMax, count = 34, opacity = 0.35) {
  let out = `<g stroke="${INK}" opacity="${opacity}" stroke-linecap="round">`;
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const inner = rMin + ((i * 19) % 35);
    const w = i % 3 === 0 ? 3.2 : 1.5;
    out += `<line x1="${(cx + Math.cos(a) * inner).toFixed(1)}" y1="${(cy + Math.sin(a) * inner).toFixed(1)}"
      x2="${(cx + Math.cos(a) * rMax).toFixed(1)}" y2="${(cy + Math.sin(a) * rMax).toFixed(1)}" stroke-width="${w}" />`;
  }
  return out + '</g>';
}

/** Expressive Manga Character Bust (scale around 1.0 = ~140px tall) */
function mangaBust(cx, cy, scale = 1, opts = {}) {
  const {
    facing = 1, // 1 = right, -1 = left, 0 = front
    mood = 'calm', // calm | happy | shock | intense | deadpan
    hair = 'short', // short | bob | spiky
    shirtColor = PANEL_STONE,
    opacity = 1,
  } = opts;
  const eyeShift = facing * 6;
  let hairSvg = '';
  if (hair === 'bob') {
    hairSvg = `<path d="M -34 -18 C -36 -58, 36 -58, 34 -18 L 38 14 C 30 22, 22 14, 22 4 L 22 -24 C 12 -32, -12 -32, -22 -24 L -22 6 C -22 16, -32 22, -38 14 Z" fill="${INK}" />`;
  } else if (hair === 'spiky') {
    hairSvg = `<path d="M -34 -14 L -46 -32 L -28 -36 L -32 -58 L -10 -46 L 4 -64 L 16 -46 L 38 -56 L 30 -32 L 46 -22 L 28 -10 C 20 -26, -20 -26, -28 -10 Z" fill="${INK}" />`;
  } else {
    hairSvg = `<path d="M -32 -14 C -36 -54, 34 -56, 33 -14 C 24 -26, 8 -30, -8 -24 C -18 -20, -24 -22, -32 -14 Z" fill="${INK}" />`;
  }

  let faceSvg = '';
  if (mood === 'shock') {
    faceSvg = `
      <circle cx="${-11 + eyeShift}" cy="-8" r="6" fill="#FFFFFF" stroke="${INK}" stroke-width="2.5" />
      <circle cx="${-11 + eyeShift}" cy="-8" r="2" fill="${INK}" />
      <circle cx="${11 + eyeShift}" cy="-8" r="6" fill="#FFFFFF" stroke="${INK}" stroke-width="2.5" />
      <circle cx="${11 + eyeShift}" cy="-8" r="2" fill="${INK}" />
      <ellipse cx="${eyeShift}" cy="11" rx="7" ry="9" fill="${INK}" />
      <path d="M -18 -19 L -6 -22 M 18 -19 L 6 -22" stroke="${INK}" stroke-width="2.5" stroke-linecap="round" />`;
  } else if (mood === 'intense') {
    faceSvg = `
      <path d="M ${-18 + eyeShift} -13 L ${-5 + eyeShift} -8 M ${18 + eyeShift} -13 L ${5 + eyeShift} -8" stroke="${INK}" stroke-width="3.2" stroke-linecap="round" />
      <circle cx="${-10 + eyeShift}" cy="-6" r="2.8" fill="${INK}" />
      <circle cx="${10 + eyeShift}" cy="-6" r="2.8" fill="${INK}" />
      <path d="M ${-8 + eyeShift} 10 Q ${eyeShift} 6, ${9 + eyeShift} 11" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linecap="round" />`;
  } else if (mood === 'happy') {
    faceSvg = `
      <path d="M ${-15 + eyeShift} -8 Q ${-10 + eyeShift} -14, ${-5 + eyeShift} -8" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linecap="round" />
      <path d="M ${5 + eyeShift} -8 Q ${10 + eyeShift} -14, ${15 + eyeShift} -8" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linecap="round" />
      <path d="M ${-8 + eyeShift} 7 Q ${eyeShift} 16, ${9 + eyeShift} 7" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linecap="round" />`;
  } else if (mood === 'deadpan') {
    faceSvg = `
      <line x1="${-16 + eyeShift}" y1="-9" x2="${-6 + eyeShift}" y2="-9" stroke="${INK}" stroke-width="2.8" stroke-linecap="round" />
      <line x1="${6 + eyeShift}" y1="-9" x2="${16 + eyeShift}" y2="-9" stroke="${INK}" stroke-width="2.8" stroke-linecap="round" />
      <line x1="${-6 + eyeShift}" y1="10" x2="${6 + eyeShift}" y2="10" stroke="${INK}" stroke-width="2.4" stroke-linecap="round" />`;
  } else {
    faceSvg = `
      <circle cx="${-10 + eyeShift}" cy="-8" r="3" fill="${INK}" />
      <circle cx="${10 + eyeShift}" cy="-8" r="3" fill="${INK}" />
      <path d="M ${-6 + eyeShift} 9 Q ${eyeShift} 13, ${7 + eyeShift} 9" fill="none" stroke="${INK}" stroke-width="2.4" stroke-linecap="round" />`;
  }

  return `
  <g transform="translate(${cx}, ${cy}) scale(${scale})" opacity="${opacity}">
    <!-- Shoulders / Torso -->
    <path d="M -54 78 C -52 38, -28 28, 0 28 C 28 28, 52 38, 54 78 Z" fill="${shirtColor}" stroke="${INK}" stroke-width="3.2" stroke-linejoin="round" />
    <!-- Neck -->
    <rect x="-10" y="16" width="20" height="18" rx="6" fill="#FFFFFF" stroke="${INK}" stroke-width="3" />
    <!-- Head -->
    <ellipse cx="0" cy="-6" rx="28" ry="32" fill="#FFFFFF" stroke="${INK}" stroke-width="3.2" />
    ${hairSvg}
    ${faceSvg}
  </g>`;
}

/** Full-body stylized manga silhouette figure (standing / running / leaping / falling) */
function mangaFigure(cx, cy, scale = 1, pose = 'stand', color = INK, opacity = 1) {
  let body = '';
  if (pose === 'run') {
    body = `
      <circle cx="8" cy="-46" r="14" fill="${color}" />
      <path d="M 4 -32 L -4 2 L 26 24 L 18 32 L -12 10 L -34 38 L -42 30 L -16 -6 L -12 -28 Z" fill="${color}" />
      <path d="M -2 -26 L 28 -18 L 24 -9 L -4 -16 Z" fill="${color}" />
      <path d="M -6 -24 L -32 -12 L -27 -3 L -2 -14 Z" fill="${color}" />`;
  } else if (pose === 'leap') {
    body = `
      <circle cx="14" cy="-50" r="14" fill="${color}" />
      <path d="M 4 -36 C -4 -14, -12 2, -26 22 L -14 28 L 2 4 L 22 30 L 32 22 L 10 -8 L 12 -32 Z" fill="${color}" />
      <path d="M 10 -32 L 42 -48 L 46 -38 L 14 -22 Z" fill="${color}" />
      <path d="M 0 -28 L -34 -34 L -32 -24 L 0 -18 Z" fill="${color}" />`;
  } else if (pose === 'fall') {
    body = `
      <circle cx="0" cy="40" r="13" fill="${color}" />
      <path d="M -8 26 L -4 -10 L -26 -38 L -16 -44 L 4 -18 L 24 -42 L 32 -34 L 8 -4 L 8 26 Z" fill="${color}" />
      <path d="M -6 14 L -34 24 L -30 32 L -2 22 Z" fill="${color}" />
      <path d="M 6 14 L 34 22 L 30 30 L 2 22 Z" fill="${color}" />`;
  } else {
    body = `
      <circle cx="0" cy="-46" r="13" fill="${color}" />
      <path d="M -16 -28 C -16 -32, 16 -32, 16 -28 L 18 10 L 10 10 L 10 48 L 2 48 L 0 12 L -2 48 L -10 48 L -10 10 L -18 10 Z" fill="${color}" />`;
  }
  return `<g transform="translate(${cx}, ${cy}) scale(${scale})" opacity="${opacity}">${body}</g>`;
}

/** Wide scenic skyline / street backdrop */
function scenicSkyline(x, y, w, h, tint = PANEL_SLATE) {
  const hy = y + h * 0.68;
  return `
  <g>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${tint}" />
    <circle cx="${x + w * 0.8}" cy="${y + h * 0.28}" r="${Math.min(w, h) * 0.12}" fill="#FFFFFF" stroke="${INK}" stroke-width="2" />
    <path d="M ${x} ${hy} L ${x + w * 0.16} ${hy - h * 0.24} L ${x + w * 0.34} ${hy - h * 0.08} L ${x + w * 0.58} ${hy - h * 0.3} L ${x + w * 0.82} ${hy - h * 0.12} L ${x + w} ${hy - h * 0.22} L ${x + w} ${y + h} L ${x} ${y + h} Z"
      fill="${PANEL_STONE}" stroke="${INK}" stroke-width="2.2" />
    <!-- City silhouettes -->
    <rect x="${x + w * 0.08}" y="${hy - h * 0.18}" width="${w * 0.1}" height="${h * 0.22}" fill="${INK}" opacity="0.22" />
    <rect x="${x + w * 0.22}" y="${hy - h * 0.28}" width="${w * 0.12}" height="${h * 0.32}" fill="${INK}" opacity="0.18" />
    <rect x="${x + w * 0.65}" y="${hy - h * 0.22}" width="${w * 0.11}" height="${h * 0.26}" fill="${INK}" opacity="0.2" />
    <line x1="${x}" y1="${hy + h * 0.04}" x2="${x + w}" y2="${hy + h * 0.04}" stroke="${INK}" stroke-width="2.2" />
  </g>`;
}

/** Dramatic Manga Eye Close-Up */
function mangaEye(cx, cy, scale = 1, intensity = 0) {
  const lidY = -12 + intensity * 3;
  const pupilR = Math.max(5, 11 - intensity * 2);
  return `
  <g transform="translate(${cx}, ${cy}) scale(${scale})">
    <path d="M -52 ${lidY - 12} Q 0 ${lidY - 22 + intensity * 8}, 54 ${lidY - 8}" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round" />
    <path d="M -46 0 Q 0 ${-24 + intensity * 4}, 48 -2 Q 0 22, -46 0 Z" fill="#FFFFFF" stroke="${INK}" stroke-width="4" />
    <circle cx="0" cy="-1" r="${pupilR + 5}" fill="${INK}" opacity="0.2" />
    <circle cx="0" cy="-1" r="${pupilR}" fill="${INK}" />
    <circle cx="-4" cy="-5" r="3.2" fill="#FFFFFF" />
  </g>`;
}

/** Expressive Hand / Button Close-up */
function handMotif(cx, cy, scale = 1, mode = 'reach') {
  if (mode === 'button') {
    return `
    <g transform="translate(${cx}, ${cy}) scale(${scale})">
      <rect x="-46" y="18" width="92" height="24" rx="5" fill="${PANEL_STONE}" stroke="${INK}" stroke-width="3" />
      <rect x="-24" y="2" width="48" height="18" rx="6" fill="${SEAL}" stroke="${INK}" stroke-width="3" />
      <path d="M -8 -44 L 8 -44 L 10 -4 C 10 2, -10 2, -10 -4 Z" fill="#FFFFFF" stroke="${INK}" stroke-width="3" />
      <path d="M -18 -26 L -34 -18 M 20 -26 L 36 -18" stroke="${SEAL}" stroke-width="3" stroke-linecap="round" />
    </g>`;
  }
  return `
  <g transform="translate(${cx}, ${cy}) scale(${scale})">
    <path d="M -56 20 L -14 20 L -2 34 L 22 30 C 30 28, 34 18, 28 12 L 46 6 C 52 2, 48 -8, 40 -6 L 16 -2 L 34 -18 C 38 -24, 30 -32, 22 -26 L 2 -12 L -16 -12 L -56 -4 Z"
      fill="#FFFFFF" stroke="${INK}" stroke-width="3.2" stroke-linejoin="round" />
  </g>`;
}

/** Clipped Panel Helper */
function clippedPanel(uid, idx, shapeSvg, clipShapeSvg, innerSvg, opts = {}) {
  const { strokeWidth = 3.5, fill = PANEL_WHITE, stroke = INK, shadow = false } = opts;
  const clipId = `cp-${uid}-${idx}`;
  return `
  <g ${shadow ? `filter="url(#card-shadow-${uid})"` : ''}>
    <defs><clipPath id="${clipId}">${clipShapeSvg}</clipPath></defs>
    ${shapeSvg.replace('__FILL__', fill).replace('__STROKE__', 'none').replace('__SW__', '0')}
    <g clip-path="url(#${clipId})">${innerSvg}</g>
    ${stroke !== 'none' ? shapeSvg.replace('__FILL__', 'none').replace('__STROKE__', stroke).replace('__SW__', String(strokeWidth)) : ''}
  </g>`;
}

function rectPanel(uid, idx, x, y, w, h, innerSvg, opts = {}) {
  const rx = opts.rx ?? 2;
  const s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="__FILL__" stroke="__STROKE__" stroke-width="__SW__" />`;
  const c = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" />`;
  return clippedPanel(uid, idx, s, c, innerSvg, opts);
}

function polyPanel(uid, idx, points, innerSvg, opts = {}) {
  const s = `<polygon points="${points}" fill="__FILL__" stroke="__STROKE__" stroke-width="__SW__" stroke-linejoin="round" />`;
  const c = `<polygon points="${points}" />`;
  return clippedPanel(uid, idx, s, c, innerSvg, opts);
}

function pathPanel(uid, idx, d, innerSvg, opts = {}) {
  const s = `<path d="${d}" fill="__FILL__" stroke="__STROKE__" stroke-width="__SW__" stroke-linejoin="round" />`;
  const c = `<path d="${d}" />`;
  return clippedPanel(uid, idx, s, c, innerSvg, opts);
}

function circlePanel(uid, idx, cx, cy, r, innerSvg, opts = {}) {
  const s = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="__FILL__" stroke="__STROKE__" stroke-width="__SW__" />`;
  const c = `<circle cx="${cx}" cy="${cy}" r="${r}" />`;
  return clippedPanel(uid, idx, s, c, innerSvg, opts);
}

/** Cozy Lifestyle Room / Cafe vignette for SB-069, SB-070, SB-071 */
function lifeScene(x, y, w, h, variant = 0) {
  const bgColors = [PANEL_WARM, PANEL_SAGE, PANEL_BLUSH, PANEL_SLATE];
  const bg = bgColors[variant % bgColors.length];
  const cy = y + h * 0.56;
  const cx = x + w * 0.5;
  const moods = ['calm', 'happy', 'deadpan', 'happy'];
  return `
  <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${bg}" />
  <!-- Window / wall horizon -->
  <rect x="${x + w * 0.08}" y="${y + h * 0.12}" width="${w * 0.24}" height="${h * 0.42}" fill="#FFFFFF" stroke="${INK}" stroke-width="2.2" />
  <line x1="${x + w * 0.2}" y1="${y + h * 0.12}" x2="${x + w * 0.2}" y2="${y + h * 0.54}" stroke="${INK}" stroke-width="1.6" />
  <line x1="${x + w * 0.08}" y1="${y + h * 0.33}" x2="${x + w * 0.32}" y2="${y + h * 0.33}" stroke="${INK}" stroke-width="1.6" />
  <!-- Table -->
  <rect x="${x}" y="${y + h * 0.72}" width="${w}" height="${h * 0.28}" fill="#E4DCCB" stroke="${INK}" stroke-width="2.4" />
  ${mangaBust(cx, cy + h * 0.08, Math.min(w, h) / 210, { mood: moods[variant % 4], hair: variant % 2 === 0 ? 'bob' : 'short', shirtColor: variant % 2 === 0 ? PANEL_BLUSH : PANEL_SLATE })}
  <!-- Cup on table -->
  <rect x="${cx + w * 0.18}" y="${y + h * 0.62}" width="26" height="22" rx="4" fill="#FFFFFF" stroke="${INK}" stroke-width="2.2" />
  <path d="M ${cx + w * 0.18 + 26} ${y + h * 0.66} C ${cx + w * 0.18 + 36} ${y + h * 0.66}, ${cx + w * 0.18 + 36} ${y + h * 0.78}, ${cx + w * 0.18 + 26} ${y + h * 0.78}" fill="none" stroke="${INK}" stroke-width="2.2" />
  ${speechBubble(cx + w * 0.24, y + h * 0.26, 46, 22, -14, 14)}`;
}

/** Build each bespoke SB-001 .. SB-071 inner body */
function renderBoardContent(id, uid) {
  const M = 56; // outer margin
  const W = CANVAS_W - M * 2; // 638
  const H = CANVAS_H - M * 2; // 888
  const G = 18; // gutter

  switch (id) {
    case 'SB-001': {
      // 规则网格: 2x3 equal panels
      const pw = (W - G) / 2;
      const ph = (H - G * 2) / 3;
      const scenes = [
        (x, y) => scenicSkyline(x, y, pw, ph, PANEL_SLATE) + mangaFigure(x + pw * 0.5, y + ph * 0.72, 0.85, 'stand'),
        (x, y) => mangaBust(x + pw * 0.45, y + ph * 0.66, 1.05, { facing: 1, mood: 'calm', hair: 'short' }) + speechBubble(x + pw * 0.72, y + ph * 0.25, 48, 24, -18, 18),
        (x, y) => mangaBust(x + pw * 0.56, y + ph * 0.66, 1.05, { facing: -1, mood: 'happy', hair: 'bob', shirtColor: PANEL_BLUSH }) + speechBubble(x + pw * 0.28, y + ph * 0.25, 48, 24, 18, 18),
        (x, y) => `<rect x="${x}" y="${y}" width="${pw}" height="${ph}" fill="${PANEL_WARM}" />` + mangaBust(x + pw * 0.34, y + ph * 0.68, 0.9, { facing: 1, mood: 'calm' }) + mangaBust(x + pw * 0.7, y + ph * 0.68, 0.9, { facing: -1, mood: 'deadpan', hair: 'bob' }),
        (x, y) => `<rect x="${x}" y="${y}" width="${pw}" height="${ph}" fill="url(#dots-${uid})" />` + mangaBust(x + pw * 0.5, y + ph * 0.65, 1.15, { mood: 'shock', hair: 'short' }),
        (x, y) => `<rect x="${x}" y="${y}" width="${pw}" height="${ph}" fill="${PANEL_SAGE}" />` + mangaBust(x + pw * 0.5, y + ph * 0.65, 1.05, { mood: 'happy', hair: 'bob', shirtColor: PANEL_WARM }) + speechBubble(x + pw * 0.74, y + ph * 0.24, 42, 20, -14, 14),
      ];
      let out = '';
      for (let i = 0; i < 6; i++) {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const x = M + col * (pw + G);
        const y = M + row * (ph + G);
        out += rectPanel(uid, i, x, y, pw, ph, scenes[i](x, y));
        out += stepBadge(x + 26, y + 26, i + 1, 30);
      }
      return out;
    }

    case 'SB-002': {
      // 四格起承转合: 2x2 crisp 4-beat gag comic
      const pw = (W - G) / 2;
      const ph = (H - G) / 2;
      const beats = [
        { bg: PANEL_WHITE, content: (x, y) => scenicSkyline(x, y, pw, ph, PANEL_WARM) + mangaBust(x + pw * 0.5, y + ph * 0.72, 1.2, { mood: 'calm', hair: 'bob' }) + speechBubble(x + pw * 0.72, y + ph * 0.22, 52, 26, -16, 18) },
        { bg: PANEL_WARM, content: (x, y) => `<rect x="${x}" y="${y}" width="${pw}" height="${ph}" fill="${PANEL_WARM}" />` + mangaFigure(x + pw * 0.45, y + ph * 0.6, 1.45, 'run') + `<path d="M ${x + 30} ${y + ph * 0.62} L ${x + 95} ${y + ph * 0.62}" stroke="${INK}" stroke-width="3" />` },
        { bg: PANEL_BLUSH, content: (x, y) => `<rect x="${x}" y="${y}" width="${pw}" height="${ph}" fill="${PANEL_BLUSH}" />` + radialLines(x + pw * 0.5, y + ph * 0.52, 65, 220, 26, 0.28) + mangaBust(x + pw * 0.5, y + ph * 0.68, 1.35, { mood: 'shock', hair: 'bob', shirtColor: '#FFFFFF' }) },
        { bg: PANEL_WHITE, content: (x, y) => `<rect x="${x}" y="${y}" width="${pw}" height="${ph}" fill="${PANEL_WHITE}" />` + mangaBust(x + pw * 0.5, y + ph * 0.74, 1.15, { mood: 'deadpan', hair: 'bob', shirtColor: PANEL_STONE }) + speechBubble(x + pw * 0.72, y + ph * 0.28, 42, 22, -18, 22) },
      ];
      let out = '';
      for (let i = 0; i < 4; i++) {
        const x = M + (i % 2) * (pw + G);
        const y = M + Math.floor(i / 2) * (ph + G);
        out += rectPanel(uid, i, x, y, pw, ph, beats[i].content(x, y));
        out += stepBadge(x + 28, y + 28, i + 1, 34);
      }
      return out + flowArrow(uid, `M ${M + pw - 20} ${M + ph * 0.5} L ${M + pw + G + 24} ${M + ph * 0.5}`, false);
    }

    case 'SB-003': {
      // 大格 + 小格: 1 dominant hero panel (left/top) + 3 small reaction panels
      const bigW = W * 0.62;
      const bigH = H * 0.64;
      const smW = W - bigW - G;
      const smH = (bigH - G) / 2;
      const botH = H - bigH - G;
      const botW = (W - G) / 2;
      let out = '';
      out += rectPanel(uid, 0, M, M, bigW, bigH,
        scenicSkyline(M, M, bigW, bigH, PANEL_SLATE) +
        radialLines(M + bigW * 0.5, M + bigH * 0.52, 95, 320, 24, 0.2) +
        mangaFigure(M + bigW * 0.52, M + bigH * 0.58, 2.2, 'leap', INK)
      );
      out += rectPanel(uid, 1, M + bigW + G, M, smW, smH,
        `<rect x="${M + bigW + G}" y="${M}" width="${smW}" height="${smH}" fill="${PANEL_WARM}" />` +
        mangaBust(M + bigW + G + smW * 0.5, M + smH * 0.68, 1.0, { mood: 'shock', hair: 'short' })
      );
      out += rectPanel(uid, 2, M + bigW + G, M + smH + G, smW, smH,
        `<rect x="${M + bigW + G}" y="${M + smH + G}" width="${smW}" height="${smH}" fill="url(#dots-${uid})" />` +
        handMotif(M + bigW + G + smW * 0.5, M + smH + G + smH * 0.55, 1.15)
      );
      out += rectPanel(uid, 3, M, M + bigH + G, botW, botH,
        `<rect x="${M}" y="${M + bigH + G}" width="${botW}" height="${botH}" fill="${PANEL_WHITE}" />` +
        mangaBust(M + botW * 0.45, M + bigH + G + botH * 0.68, 1.05, { facing: 1, mood: 'intense' }) +
        speechBubble(M + botW * 0.74, M + bigH + G + botH * 0.28, 44, 22, -16, 16)
      );
      out += rectPanel(uid, 4, M + botW + G, M + bigH + G, botW, botH,
        `<rect x="${M + botW + G}" y="${M + bigH + G}" width="${botW}" height="${botH}" fill="${PANEL_SAGE}" />` +
        mangaBust(M + botW + G + botW * 0.55, M + bigH + G + botH * 0.68, 1.05, { facing: -1, mood: 'happy', hair: 'bob' })
      );
      out += stepBadge(M + 30, M + 30, 1, 36);
      out += stepBadge(M + bigW + G + 24, M + 24, 2, 28);
      out += stepBadge(M + bigW + G + 24, M + smH + G + 24, 3, 28);
      out += stepBadge(M + 24, M + bigH + G + 24, 4, 28);
      out += stepBadge(M + botW + G + 24, M + bigH + G + 24, 5, 28);
      return out;
    }

    case 'SB-004': {
      // 顶部大格开场
      const topH = H * 0.4;
      const remH = H - topH - G;
      const rH = (remH - G) / 2;
      const cW = (W - G) / 2;
      let out = rectPanel(uid, 0, M, M, W, topH,
        scenicSkyline(M, M, W, topH, PANEL_SLATE) +
        mangaFigure(M + W * 0.34, M + topH * 0.72, 1.25, 'stand') +
        mangaFigure(M + W * 0.66, M + topH * 0.72, 1.2, 'stand', INK_SOFT) +
        speechBubble(M + W * 0.5, M + topH * 0.26, 68, 26, -24, 18)
      );
      const y1 = M + topH + G;
      const y2 = y1 + rH + G;
      out += rectPanel(uid, 1, M, y1, cW, rH, mangaBust(M + cW * 0.5, y1 + rH * 0.68, 1.05, { facing: 1, mood: 'calm' }));
      out += rectPanel(uid, 2, M + cW + G, y1, cW, rH, `<rect x="${M + cW + G}" y="${y1}" width="${cW}" height="${rH}" fill="${PANEL_WARM}" />` + mangaBust(M + cW + G + cW * 0.5, y1 + rH * 0.68, 1.05, { facing: -1, mood: 'happy', hair: 'bob' }));
      out += rectPanel(uid, 3, M, y2, cW, rH, `<rect x="${M}" y="${y2}" width="${cW}" height="${rH}" fill="url(#dots-${uid})" />` + mangaEye(M + cW * 0.5, y2 + rH * 0.52, 1.4, 1));
      out += rectPanel(uid, 4, M + cW + G, y2, cW, rH, `<rect x="${M + cW + G}" y="${y2}" width="${cW}" height="${rH}" fill="${PANEL_SAGE}" />` + mangaBust(M + cW + G + cW * 0.5, y2 + rH * 0.68, 1.05, { mood: 'shock' }));
      out += stepBadge(M + 30, M + 30, 1, 36);
      out += stepBadge(M + 24, y1 + 24, 2, 28);
      out += stepBadge(M + cW + G + 24, y1 + 24, 3, 28);
      out += stepBadge(M + 24, y2 + 24, 4, 28);
      out += stepBadge(M + cW + G + 24, y2 + 24, 5, 28);
      return out;
    }

    case 'SB-005': {
      // 底部大格收尾
      const botH = H * 0.42;
      const topTotal = H - botH - G;
      const rH = (topTotal - G) / 2;
      const cW = (W - G) / 2;
      let out = '';
      const y1 = M;
      const y2 = M + rH + G;
      const y3 = M + topTotal + G;
      out += rectPanel(uid, 0, M, y1, cW, rH, mangaBust(M + cW * 0.5, y1 + rH * 0.68, 1.0, { mood: 'calm', facing: 1 }));
      out += rectPanel(uid, 1, M + cW + G, y1, cW, rH, `<rect x="${M + cW + G}" y="${y1}" width="${cW}" height="${rH}" fill="${PANEL_WARM}" />` + mangaBust(M + cW + G + cW * 0.5, y1 + rH * 0.68, 1.0, { mood: 'deadpan', hair: 'bob' }));
      out += rectPanel(uid, 2, M, y2, cW, rH, `<rect x="${M}" y="${y2}" width="${cW}" height="${rH}" fill="url(#dots-${uid})" />` + mangaEye(M + cW * 0.5, y2 + rH * 0.52, 1.35, 2));
      out += rectPanel(uid, 3, M + cW + G, y2, cW, rH, handMotif(M + cW + G + cW * 0.5, y2 + rH * 0.55, 1.2, 'button'));
      out += rectPanel(uid, 4, M, y3, W, botH,
        `<rect x="${M}" y="${y3}" width="${W}" height="${botH}" fill="${PANEL_BLUSH}" />` +
        radialLines(M + W * 0.5, y3 + botH * 0.52, 70, 360, 36, 0.3) +
        impactBurst(M + W * 0.5, y3 + botH * 0.5, 150, 96, 16, '#FFFFFF', INK) +
        mangaBust(M + W * 0.5, y3 + botH * 0.64, 1.45, { mood: 'shock', hair: 'spiky', shirtColor: SEAL })
      );
      out += stepBadge(M + 24, y1 + 24, 1, 28);
      out += stepBadge(M + cW + G + 24, y1 + 24, 2, 28);
      out += stepBadge(M + 24, y2 + 24, 3, 28);
      out += stepBadge(M + cW + G + 24, y2 + 24, 4, 28);
      out += stepBadge(M + 32, y3 + 32, 5, 36);
      return out;
    }

    case 'SB-006': {
      // 中央大格爆发
      const topH = H * 0.22;
      const midH = H * 0.50;
      const botH = H - topH - midH - G * 2;
      const cW = (W - G) / 2;
      const yMid = M + topH + G;
      const yBot = yMid + midH + G;
      let out = '';
      out += rectPanel(uid, 0, M, M, cW, topH, mangaBust(M + cW * 0.5, M + topH * 0.72, 0.85, { mood: 'calm' }));
      out += rectPanel(uid, 1, M + cW + G, M, cW, topH, mangaEye(M + cW + G + cW * 0.5, M + topH * 0.5, 1.35, 2));
      out += rectPanel(uid, 2, M, yMid, W, midH,
        `<rect x="${M}" y="${yMid}" width="${W}" height="${midH}" fill="${PANEL_BLUSH}" />` +
        radialLines(M + W * 0.5, yMid + midH * 0.5, 85, 400, 42, 0.38) +
        impactBurst(M + W * 0.5, yMid + midH * 0.5, 185, 120, 18, '#FFFFFF', SEAL) +
        mangaFigure(M + W * 0.5, yMid + midH * 0.52, 2.2, 'leap', INK)
      );
      out += rectPanel(uid, 3, M, yBot, cW, botH, `<rect x="${M}" y="${yBot}" width="${cW}" height="${botH}" fill="${PANEL_WARM}" />` + mangaBust(M + cW * 0.5, yBot + botH * 0.72, 0.9, { mood: 'shock', hair: 'bob' }));
      out += rectPanel(uid, 4, M + cW + G, yBot, cW, botH, `<rect x="${M + cW + G}" y="${yBot}" width="${cW}" height="${botH}" fill="${PANEL_SLATE}" />` + mangaBust(M + cW + G + cW * 0.5, yBot + botH * 0.72, 0.9, { mood: 'intense', hair: 'spiky' }));
      out += stepBadge(M + 24, M + 24, 1, 28);
      out += stepBadge(M + cW + G + 24, M + 24, 2, 28);
      out += stepBadge(M + 34, yMid + 34, 3, 38);
      out += stepBadge(M + 24, yBot + 24, 4, 28);
      out += stepBadge(M + cW + G + 24, yBot + 24, 5, 28);
      return out;
    }

    case 'SB-007': {
      // 对角切割: dramatic diagonal slash panels
      const x0 = M, x1 = M + W, y0 = M, y1 = M + H;
      const p1 = `${x0},${y0} ${x1},${y0} ${x1},${y0 + 190} ${x0},${y0 + 340}`;
      const p2 = `${x0},${y0 + 364} ${x1},${y0 + 214} ${x1},${y0 + 500} ${x0},${y0 + 650}`;
      const p3 = `${x0},${y0 + 674} ${x1},${y0 + 524} ${x1},${y1} ${x0},${y1}`;
      let out = '';
      out += polyPanel(uid, 0, p1,
        `<rect x="${x0}" y="${y0}" width="${W}" height="360" fill="${PANEL_SLATE}" />` +
        `<rect x="${x0}" y="${y0}" width="${W}" height="360" fill="url(#speed-${uid})" />` +
        mangaBust(x0 + W * 0.34, y0 + 180, 1.35, { facing: 1, mood: 'intense', hair: 'spiky' })
      );
      out += polyPanel(uid, 1, p2,
        `<rect x="${x0}" y="${y0 + 200}" width="${W}" height="460" fill="${PANEL_BLUSH}" />` +
        `<rect x="${x0}" y="${y0 + 200}" width="${W}" height="460" fill="url(#speed-${uid})" />` +
        mangaFigure(x0 + W * 0.52, y0 + 430, 1.9, 'leap', INK)
      );
      out += polyPanel(uid, 2, p3,
        `<rect x="${x0}" y="${y0 + 510}" width="${W}" height="400" fill="${PANEL_WARM}" />` +
        mangaBust(x0 + W * 0.68, y1 - 120, 1.35, { facing: -1, mood: 'shock', hair: 'bob' })
      );
      out += `<line x1="${x0 - 8}" y1="${y0 + 352}" x2="${x1 + 8}" y2="${y0 + 202}" stroke="${SEAL}" stroke-width="5" />`;
      out += `<line x1="${x0 - 8}" y1="${y0 + 662}" x2="${x1 + 8}" y2="${y0 + 512}" stroke="${SEAL}" stroke-width="5" />`;
      out += stepBadge(x0 + 34, y0 + 34, 1, 34);
      out += stepBadge(x0 + 34, y0 + 408, 2, 34);
      out += stepBadge(x0 + 34, y0 + 716, 3, 34);
      return out;
    }

    case 'SB-008': {
      // Z 字阅读
      const pw = (W - G) / 2;
      const ph = (H - G) / 2;
      let out = '';
      const coords = [
        [M, M],
        [M + pw + G, M],
        [M, M + ph + G],
        [M + pw + G, M + ph + G],
      ];
      const fills = [PANEL_WHITE, PANEL_WARM, PANEL_SLATE, PANEL_SAGE];
      const moods = ['calm', 'happy', 'intense', 'happy'];
      coords.forEach(([x, y], i) => {
        out += rectPanel(uid, i, x, y, pw, ph,
          `<rect x="${x}" y="${y}" width="${pw}" height="${ph}" fill="${fills[i]}" />` +
          mangaBust(x + pw * 0.5, y + ph * 0.72, 1.2, { facing: i % 2 === 0 ? 1 : -1, mood: moods[i], hair: i % 2 ? 'bob' : 'short' })
        );
      });
      // Bold Z reading path
      const zPath = `M ${M + pw * 0.45} ${M + ph * 0.34} L ${M + pw + G + pw * 0.55} ${M + ph * 0.34} L ${M + pw * 0.45} ${M + ph + G + ph * 0.34} L ${M + pw + G + pw * 0.62} ${M + ph + G + ph * 0.34}`;
      out += `<path d="${zPath}" fill="none" stroke="${PAPER}" stroke-width="11" stroke-linecap="round" stroke-linejoin="round" opacity="0.88" />`;
      out += flowArrow(uid, zPath, true);
      coords.forEach(([x, y], i) => {
        out += stepBadge(x + 30, y + 30, i + 1, 34);
      });
      return out;
    }

    case 'SB-009': {
      // S 型阅读
      const rowH = (H - G * 2) / 3;
      const w1 = W * 0.54, w2 = W - w1 - G;
      let out = '';
      out += rectPanel(uid, 0, M, M, w1, rowH, `<rect x="${M}" y="${M}" width="${w1}" height="${rowH}" fill="${PANEL_WARM}" />` + mangaBust(M + w1 * 0.46, M + rowH * 0.68, 1.05, { facing: 1, mood: 'happy', hair: 'bob' }), { rx: 14 });
      out += rectPanel(uid, 1, M + w1 + G, M, w2, rowH, `<rect x="${M + w1 + G}" y="${M}" width="${w2}" height="${rowH}" fill="${PANEL_SLATE}" />` + scenicSkyline(M + w1 + G, M, w2, rowH, PANEL_SLATE), { rx: 14 });
      const y2 = M + rowH + G;
      out += rectPanel(uid, 2, M, y2, w2, rowH, `<rect x="${M}" y="${y2}" width="${w2}" height="${rowH}" fill="${PANEL_SAGE}" />` + mangaFigure(M + w2 * 0.5, y2 + rowH * 0.58, 1.3, 'run'), { rx: 14 });
      out += rectPanel(uid, 3, M + w2 + G, y2, w1, rowH, `<rect x="${M + w2 + G}" y="${y2}" width="${w1}" height="${rowH}" fill="${PANEL_WHITE}" />` + mangaBust(M + w2 + G + w1 * 0.5, y2 + rowH * 0.68, 1.05, { facing: -1, mood: 'calm' }), { rx: 14 });
      const y3 = y2 + rowH + G;
      out += rectPanel(uid, 4, M, y3, W, rowH, `<rect x="${M}" y="${y3}" width="${W}" height="${rowH}" fill="${PANEL_BLUSH}" />` + scenicSkyline(M, y3, W, rowH, PANEL_BLUSH) + mangaFigure(M + W * 0.72, y3 + rowH * 0.65, 1.25, 'stand'), { rx: 14 });
      const sCurve = `M ${M + 95} ${M + rowH * 0.45} C ${M + W - 40} ${M + rowH * 0.15}, ${M + W - 40} ${y2 + rowH * 0.55}, ${M + W * 0.5} ${y2 + rowH * 0.48} C ${M + 40} ${y2 + rowH * 0.45}, ${M + 40} ${y3 + rowH * 0.6}, ${M + W - 90} ${y3 + rowH * 0.48}`;
      out += `<path d="${sCurve}" fill="none" stroke="${PAPER}" stroke-width="11" stroke-linecap="round" opacity="0.88" />`;
      out += flowArrow(uid, sCurve, true);
      out += stepBadge(M + 30, M + 30, 1, 32);
      out += stepBadge(M + w1 + G + 30, M + 30, 2, 32);
      out += stepBadge(M + w2 + G + 30, y2 + 30, 3, 32);
      out += stepBadge(M + 30, y2 + 30, 4, 32);
      out += stepBadge(M + 30, y3 + 30, 5, 32);
      return out;
    }

    case 'SB-010': {
      // 螺旋阅读: Golden spiral wrapping inward to center focal panel
      const x0 = M, y0 = M;
      const topH = 220;
      const rightW = 200;
      const botH = 220;
      const leftW = 190;
      const cx = x0 + leftW + G;
      const cy = y0 + topH + G;
      const cw = W - leftW - rightW - G * 2;
      const ch = H - topH - botH - G * 2;
      let out = '';
      out += rectPanel(uid, 0, x0, y0, W, topH, scenicSkyline(x0, y0, W, topH, PANEL_SLATE));
      out += rectPanel(uid, 1, x0 + W - rightW, cy, rightW, H - topH - G, `<rect x="${x0 + W - rightW}" y="${cy}" width="${rightW}" height="${H - topH - G}" fill="${PANEL_WARM}" />` + mangaFigure(x0 + W - rightW / 2, cy + 320, 1.5, 'run'));
      out += rectPanel(uid, 2, x0, y0 + H - botH, W - rightW - G, botH, `<rect x="${x0}" y="${y0 + H - botH}" width="${W - rightW - G}" height="${botH}" fill="${PANEL_STONE}" />` + mangaBust(x0 + 210, y0 + H - 80, 1.0, { facing: -1, mood: 'intense' }));
      out += rectPanel(uid, 3, x0, cy, leftW, ch, `<rect x="${x0}" y="${cy}" width="${leftW}" height="${ch}" fill="url(#dots-${uid})" />` + mangaEye(x0 + leftW / 2, cy + ch / 2, 1.2, 2));
      out += rectPanel(uid, 4, cx, cy, cw, ch, `<rect x="${cx}" y="${cy}" width="${cw}" height="${ch}" fill="${PANEL_BLUSH}" />` + radialLines(cx + cw / 2, cy + ch / 2, 30, 220, 24, 0.3) + impactBurst(cx + cw / 2, cy + ch / 2, 85, 52, 12, '#FFFFFF', SEAL), { stroke: SEAL, strokeWidth: 4.5 });
      const sp = `M ${x0 + 140} ${y0 + 110} L ${x0 + W - 100} ${y0 + 110} L ${x0 + W - 100} ${y0 + H - 110} L ${x0 + 95} ${y0 + H - 110} L ${x0 + 95} ${cy + ch * 0.5} L ${cx + cw * 0.42} ${cy + ch * 0.5}`;
      out += `<path d="${sp}" fill="none" stroke="${PAPER}" stroke-width="10" stroke-linejoin="round" opacity="0.85" />`;
      out += flowArrow(uid, sp, true);
      out += stepBadge(x0 + 30, y0 + 30, 1, 32);
      out += stepBadge(x0 + W - rightW + 30, cy + 30, 2, 32);
      out += stepBadge(x0 + 30, y0 + H - botH + 30, 3, 32);
      out += stepBadge(x0 + 30, cy + 30, 4, 32);
      out += stepBadge(cx + cw / 2, cy + ch / 2, 5, 38);
      return out;
    }

    case 'SB-011': {
      // 放射型分镜: wedges radiating from central focal medallion
      const cx = CANVAS_W / 2, cy = CANVAS_H / 2;
      const x0 = M, x1 = M + W, y0 = M, y1 = M + H;
      const wedges = [
        `${x0},${y0} ${cx - 12},${y0} ${cx - 18},${cy - 24} ${x0},${cy - 110}`,
        `${cx + 12},${y0} ${x1},${y0} ${x1},${cy - 110} ${cx + 18},${cy - 24}`,
        `${x1},${cy - 86} ${x1},${cy + 86} ${cx + 28},${cy + 14} ${cx + 28},${cy - 14}`,
        `${x1},${cy + 110} ${x1},${y1} ${cx + 12},${y1} ${cx + 18},${cy + 24}`,
        `${cx - 12},${y1} ${x0},${y1} ${x0},${cy + 110} ${cx - 18},${cy + 24}`,
        `${x0},${cy + 86} ${x0},${cy - 86} ${cx - 28},${cy - 14} ${cx - 28},${cy + 14}`,
      ];
      const fills = [PANEL_WARM, PANEL_SLATE, PANEL_STONE, PANEL_SAGE, PANEL_WARM, PANEL_SLATE];
      let out = '';
      wedges.forEach((pts, i) => {
        out += polyPanel(uid, i, pts, `<rect x="${x0}" y="${y0}" width="${W}" height="${H}" fill="${fills[i]}" /><rect x="${x0}" y="${y0}" width="${W}" height="${H}" fill="url(#dots-${uid})" />`);
      });
      out += radialLines(cx, cy, 115, 420, 28, 0.25);
      out += circlePanel(uid, 6, cx, cy, 128,
        `<rect x="${cx - 130}" y="${cy - 130}" width="260" height="260" fill="${PANEL_BLUSH}" />` +
        impactBurst(cx, cy, 115, 76, 14, '#FFFFFF', SEAL) +
        mangaBust(cx, cy + 28, 1.05, { mood: 'shock', hair: 'spiky', shirtColor: SEAL }),
        { stroke: INK, strokeWidth: 4.5, shadow: true }
      );
      out += stepBadge(x0 + 36, y0 + 36, 1, 30);
      out += stepBadge(x1 - 36, y0 + 36, 2, 30);
      out += stepBadge(x1 - 36, cy, 3, 30);
      out += stepBadge(x1 - 36, y1 - 36, 4, 30);
      out += stepBadge(x0 + 36, y1 - 36, 5, 30);
      out += stepBadge(cx, cy - 92, '!', 34);
      return out;
    }

    case 'SB-012': {
      // 碎片面板: shattered glass polygons
      const x0 = M, y0 = M, x1 = M + W, y1 = M + H;
      const shards = [
        `${x0},${y0} ${x0 + 330},${y0} ${x0 + 270},${y0 + 250} ${x0},${y0 + 210}`,
        `${x0 + 355},${y0} ${x1},${y0} ${x1},${y0 + 290} ${x0 + 295},${y0 + 255}`,
        `${x0},${y0 + 238} ${x0 + 265},${y0 + 278} ${x0 + 360},${y0 + 510} ${x0},${y0 + 590}`,
        `${x0 + 295},${y0 + 280} ${x1},${y0 + 318} ${x1},${y0 + 620} ${x0 + 385},${y0 + 515}`,
        `${x0},${y0 + 618} ${x0 + 362},${y0 + 540} ${x0 + 280},${y1} ${x0},${y1}`,
        `${x0 + 390},${y0 + 545} ${x1},${y0 + 648} ${x1},${y1} ${x0 + 308},${y1}`,
      ];
      let out = `<rect x="${x0 - 8}" y="${y0 - 8}" width="${W + 16}" height="${H + 16}" fill="${INK}" opacity="0.08" rx="4" />`;
      const fills = [PANEL_WHITE, PANEL_SLATE, PANEL_BLUSH, PANEL_STONE, PANEL_WARM, PANEL_WHITE];
      shards.forEach((pts, i) => {
        const inner = i === 2
          ? `<rect x="${x0}" y="${y0}" width="${W}" height="${H}" fill="${fills[i]}" />` + mangaEye(x0 + 165, y0 + 425, 1.35, 3)
          : i === 3
            ? `<rect x="${x0}" y="${y0}" width="${W}" height="${H}" fill="${fills[i]}" /><rect x="${x0}" y="${y0}" width="${W}" height="${H}" fill="url(#dots-dark-${uid})" />` + mangaBust(x0 + 500, y0 + 470, 1.1, { mood: 'shock', hair: 'spiky' })
            : `<rect x="${x0}" y="${y0}" width="${W}" height="${H}" fill="${fills[i]}" /><rect x="${x0}" y="${y0}" width="${W}" height="${H}" fill="url(#hatch-${uid})" />`;
        out += polyPanel(uid, i, pts, inner, { strokeWidth: 4 });
      });
      out += `<circle cx="${x0 + 370}" cy="${y0 + 528}" r="14" fill="${SEAL}" />`;
      out += stepBadge(x0 + 34, y0 + 34, 1, 30);
      out += stepBadge(x0 + 390, y0 + 34, 2, 30);
      out += stepBadge(x0 + 34, y0 + 310, 3, 30);
      out += stepBadge(x0 + 440, y0 + 350, 4, 30);
      out += stepBadge(x0 + 34, y0 + 660, 5, 30);
      out += stepBadge(x0 + 430, y0 + 680, 6, 30);
      return out;
    }

    case 'SB-013': {
      // 破框构图: dynamic hero breaking straight out of panel border into gutter!
      const h1 = 270, h2 = 310, h3 = H - h1 - h2 - G * 2;
      const y2 = M + h1 + G, y3 = y2 + h2 + G;
      let out = '';
      out += rectPanel(uid, 0, M, M, W, h1, scenicSkyline(M, M, W, h1, PANEL_SLATE));
      out += rectPanel(uid, 1, M + 28, y2, W - 56, h2, `<rect x="${M + 28}" y="${y2}" width="${W - 56}" height="${h2}" fill="${PANEL_BLUSH}" />` + radialLines(CANVAS_W / 2, y2 + h2 / 2, 65, 340, 30, 0.28));
      out += rectPanel(uid, 2, M, y3, W, h3, `<rect x="${M}" y="${y3}" width="${W}" height="${h3}" fill="${PANEL_WARM}" />` + mangaBust(M + W * 0.72, y3 + h3 * 0.68, 1.1, { mood: 'shock', facing: -1 }));
      // Pop-out breaking frame burst & leaping hero ON TOP of panel borders!
      out += `<path d="M ${M - 10} ${y2 + 40} L ${M + W + 16} ${y2 + h2 - 36}" stroke="${SEAL}" stroke-width="14" stroke-linecap="round" opacity="0.22" />`;
      out += `<path d="M ${M - 10} ${y2 + 40} L ${M + W + 16} ${y2 + h2 - 36}" stroke="${SEAL}" stroke-width="4" stroke-linecap="round" />`;
      out += impactBurst(CANVAS_W * 0.48, y2 + h2 * 0.48, 195, 130, 14, '#FFFFFF', INK);
      out += mangaFigure(CANVAS_W * 0.48, y2 + h2 * 0.48, 2.75, 'leap', INK);
      out += stepBadge(M + 28, M + 28, 1, 30);
      out += stepBadge(M + 58, y2 + 28, 2, 34);
      out += stepBadge(M + 28, y3 + 28, 3, 30);
      return out;
    }

    case 'SB-014': {
      // 跨格人物: single giant character striding/extending across 3 vertical panels
      const pW = (W - G * 2) / 3;
      let out = '';
      for (let i = 0; i < 3; i++) {
        const x = M + i * (pW + G);
        const fills = [PANEL_WARM, PANEL_SLATE, PANEL_SAGE];
        out += rectPanel(uid, i, x, M + 40, pW, H - 80, `<rect x="${x}" y="${M + 40}" width="${pW}" height="${H - 80}" fill="${fills[i]}" /><rect x="${x}" y="${M + 40}" width="${pW}" height="${H - 80}" fill="url(#dots-${uid})" />`);
        out += stepBadge(x + 28, M + 70, i + 1, 30);
      }
      // Hero silhouette spanning across ALL 3 panels seamlessly
      out += `<ellipse cx="${CANVAS_W / 2}" cy="${CANVAS_H * 0.78}" rx="230" ry="26" fill="${INK}" opacity="0.12" />`;
      out += mangaFigure(CANVAS_W / 2, CANVAS_H * 0.52, 4.4, 'run', INK);
      out += flowArrow(uid, `M ${M + 60} ${CANVAS_H * 0.85} L ${M + W - 60} ${CANVAS_H * 0.85}`, true);
      return out;
    }

    case 'SB-015': {
      // 跨格背景: continuous panoramic backdrop divided by 4 gutters, character moves across time
      const pH = (H - G * 3) / 4;
      let out = '';
      for (let i = 0; i < 4; i++) {
        const y = M + i * (pH + G);
        const charX = M + 95 + i * 150;
        const inner = scenicSkyline(M, M, W, H, PANEL_SLATE) +
          mangaFigure(charX, y + pH * 0.62, 1.05, i < 3 ? 'run' : 'stand', i === 3 ? SEAL : INK);
        out += rectPanel(uid, i, M, y, W, pH, inner);
        out += stepBadge(M + 26, y + 26, i + 1, 28);
      }
      return out;
    }

    case 'SB-016': {
      // 一镜到底: One single borderless continuous spatial world with character at 4 sequential points
      let out = rectPanel(uid, 0, M, M, W, H,
        scenicSkyline(M, M, W, H * 0.55, PANEL_SLATE) +
        `<rect x="${M}" y="${M + H * 0.52}" width="${W}" height="${H * 0.48}" fill="${PANEL_WARM}" />` +
        `<path d="M ${M} ${M + H * 0.58} Q ${M + W * 0.5} ${M + H * 0.48}, ${M + W} ${M + H * 0.64} L ${M + W} ${M + H * 0.78} Q ${M + W * 0.5} ${M + H * 0.62}, ${M} ${M + H * 0.74} Z" fill="#FFFFFF" stroke="${INK}" stroke-width="2.5" />` +
        flowArrow(uid, `M ${M + 95} ${M + H * 0.65} C ${M + 240} ${M + H * 0.55}, ${M + 390} ${M + H * 0.62}, ${M + W - 95} ${M + H * 0.71}`, true) +
        mangaFigure(M + 95, M + H * 0.63, 1.0, 'stand', INK, 0.45) +
        mangaFigure(M + 245, M + H * 0.58, 1.1, 'run', INK, 0.65) +
        mangaFigure(M + 410, M + H * 0.62, 1.2, 'run', INK, 0.82) +
        mangaFigure(M + 565, M + H * 0.69, 1.35, 'leap', SEAL, 1)
      );
      out += stepBadge(M + 95, M + H * 0.52, 1, 28);
      out += stepBadge(M + 245, M + H * 0.47, 2, 28);
      out += stepBadge(M + 410, M + H * 0.51, 3, 28);
      out += stepBadge(M + 565, M + H * 0.56, 4, 30);
      return out;
    }

    case 'SB-017': {
      // 电影胶片式: 35mm cinema filmstrip with sprocket holes
      const stripX = M + 24, stripW = W - 48;
      let out = `<rect x="${stripX}" y="${M}" width="${stripW}" height="${H}" rx="8" fill="${INK}" />`;
      // Sprocket holes left & right
      for (let sy = M + 22; sy < M + H - 28; sy += 38) {
        out += `<rect x="${stripX + 14}" y="${sy}" width="22" height="16" rx="3" fill="${PAPER}" />`;
        out += `<rect x="${stripX + stripW - 36}" y="${sy}" width="22" height="16" rx="3" fill="${PAPER}" />`;
      }
      const fx = stripX + 52, fw = stripW - 104, fh = (H - 5 * 20) / 4;
      const tints = [PANEL_SLATE, PANEL_WARM, PANEL_SAGE, PANEL_BLUSH];
      for (let i = 0; i < 4; i++) {
        const fy = M + 20 + i * (fh + 20);
        out += rectPanel(uid, i, fx, fy, fw, fh,
          scenicSkyline(fx, fy, fw, fh, tints[i]) +
          mangaFigure(fx + 100 + i * 95, fy + fh * 0.66, 0.95, i === 3 ? 'stand' : 'run', i === 3 ? SEAL : INK),
          { stroke: '#FFFFFF', strokeWidth: 2, rx: 4 }
        );
        out += stepBadge(fx + 26, fy + 26, i + 1, 28);
      }
      return out;
    }

    case 'SB-018': {
      // 宽银幕横格: 4 ultrawide cinemascope horizontal strips
      const fh = (H - G * 3) / 4;
      let out = '';
      const scenes = [
        (y) => scenicSkyline(M, y, W, fh, PANEL_SLATE) + mangaFigure(M + 110, y + fh * 0.68, 0.9, 'stand'),
        (y) => `<rect x="${M}" y="${y}" width="${W}" height="${fh}" fill="${PANEL_WARM}" />` + mangaBust(M + W * 0.25, y + fh * 0.72, 1.05, { facing: 1, mood: 'calm' }) + mangaBust(M + W * 0.75, y + fh * 0.72, 1.05, { facing: -1, mood: 'intense', hair: 'bob' }),
        (y) => `<rect x="${M}" y="${y}" width="${W}" height="${fh}" fill="url(#speed-${uid})" />` + mangaEye(M + W * 0.5, y + fh * 0.5, 1.5, 2),
        (y) => scenicSkyline(M, y, W, fh, PANEL_BLUSH) + mangaFigure(M + W * 0.5, y + fh * 0.66, 1.15, 'leap', SEAL),
      ];
      for (let i = 0; i < 4; i++) {
        const y = M + i * (fh + G);
        out += rectPanel(uid, i, M, y, W, fh, scenes[i](y));
        out += stepBadge(M + 26, y + 26, i + 1, 28);
      }
      return out;
    }

    case 'SB-019': {
      // 竖向长格: 3 tall vertical pillar panels
      const pw = (W - G * 2) / 3;
      const tints = [PANEL_SLATE, PANEL_WARM, PANEL_BLUSH];
      let out = '';
      for (let i = 0; i < 3; i++) {
        const x = M + i * (pw + G);
        const inner = i === 0
          ? `<rect x="${x}" y="${M}" width="${pw}" height="${H}" fill="${tints[i]}" /><rect x="${x + 36}" y="${M + 160}" width="${pw - 72}" height="${H - 160}" fill="#FFFFFF" stroke="${INK}" stroke-width="2.5" />` + mangaFigure(x + pw / 2, M + 120, 0.85, 'stand')
          : i === 1
            ? `<rect x="${x}" y="${M}" width="${pw}" height="${H}" fill="${tints[i]}" /><line x1="${x + pw * 0.3}" y1="${M + 60}" x2="${x + pw * 0.3}" y2="${M + H - 60}" stroke="${INK}" stroke-width="2" opacity="0.25" /><line x1="${x + pw * 0.7}" y1="${M + 60}" x2="${x + pw * 0.7}" y2="${M + H - 60}" stroke="${INK}" stroke-width="2" opacity="0.25" />` + mangaFigure(x + pw / 2, M + H * 0.52, 1.6, 'fall', SEAL)
            : `<rect x="${x}" y="${M}" width="${pw}" height="${H}" fill="${tints[i]}" />` + mangaFigure(x + pw / 2, M + H * 0.75, 1.55, 'stand');
        out += rectPanel(uid, i, x, M, pw, H, inner);
        out += stepBadge(x + 28, M + 28, i + 1, 32);
      }
      return out;
    }

    case 'SB-020': {
      // 超窄反应格: main panels punctuated by ultra-narrow reaction slivers
      const mainW = W * 0.68;
      const sliverW = W - mainW - G;
      const h1 = 290, h2 = 280, h3 = H - h1 - h2 - G * 2;
      const y2 = M + h1 + G, y3 = y2 + h2 + G;
      let out = '';
      out += rectPanel(uid, 0, M, M, mainW, h1, scenicSkyline(M, M, mainW, h1, PANEL_WARM) + mangaBust(M + mainW * 0.5, M + h1 * 0.7, 1.15, { mood: 'calm' }));
      // Two narrow stacked reaction slivers
      const sh = (h1 - G) / 2;
      out += rectPanel(uid, 1, M + mainW + G, M, sliverW, sh, `<rect x="${M + mainW + G}" y="${M}" width="${sliverW}" height="${sh}" fill="${PANEL_BLUSH}" />` + mangaEye(M + mainW + G + sliverW / 2, M + sh / 2, 1.15, 2), { stroke: SEAL, strokeWidth: 3.5 });
      out += rectPanel(uid, 2, M + mainW + G, M + sh + G, sliverW, sh, `<rect x="${M + mainW + G}" y="${M + sh + G}" width="${sliverW}" height="${sh}" fill="url(#dots-${uid})" />` + handMotif(M + mainW + G + sliverW / 2, M + sh + G + sh / 2, 0.95, 'button'), { stroke: SEAL, strokeWidth: 3.5 });
      // Ultra-narrow horizontal reaction strip across full width!
      const stripH = 92;
      out += rectPanel(uid, 3, M, y2, W, stripH, `<rect x="${M}" y="${y2}" width="${W}" height="${stripH}" fill="${PANEL_SLATE}" />` + mangaEye(M + W * 0.34, y2 + stripH / 2, 1.0, 3) + mangaEye(M + W * 0.66, y2 + stripH / 2, 1.0, 3), { stroke: SEAL, strokeWidth: 3.5 });
      out += rectPanel(uid, 4, M, y2 + stripH + G, W, H - h1 - stripH - G * 2, `<rect x="${M}" y="${y2 + stripH + G}" width="${W}" height="500" fill="${PANEL_WHITE}" />` + mangaBust(M + W * 0.5, y3 + h3 * 0.55, 1.5, { mood: 'shock', hair: 'spiky' }));
      out += stepBadge(M + 26, M + 26, 1, 28);
      out += stepBadge(M + mainW + G + 22, M + 22, 2, 24);
      out += stepBadge(M + mainW + G + 22, M + sh + G + 22, 3, 24);
      out += stepBadge(M + 24, y2 + 24, 4, 24);
      out += stepBadge(M + 28, y2 + stripH + G + 28, 5, 30);
      return out;
    }

    case 'SB-021': {
      // 眼睛特写链: 4 stacked escalating eye close-up strips
      const fh = (H - G * 3) / 4;
      const tints = [PANEL_WHITE, PANEL_WARM, PANEL_SLATE, PANEL_BLUSH];
      let out = '';
      for (let i = 0; i < 4; i++) {
        const y = M + i * (fh + G);
        out += rectPanel(uid, i, M, y, W, fh,
          `<rect x="${M}" y="${y}" width="${W}" height="${fh}" fill="${tints[i]}" />` +
          (i >= 2 ? `<rect x="${M}" y="${y}" width="${W}" height="${fh}" fill="url(#speed-${uid})" />` : '') +
          mangaEye(M + W * 0.34, y + fh * 0.52, 1.35 + i * 0.14, i) +
          mangaEye(M + W * 0.68, y + fh * 0.52, 1.35 + i * 0.14, i)
        );
        out += stepBadge(M + 28, y + 28, i + 1, 30);
      }
      return out;
    }

    case 'SB-022': {
      // 手部动作链: 4 close-up hand action panels
      const pw = (W - G) / 2, ph = (H - G) / 2;
      const modes = ['reach', 'reach', 'button', 'button'];
      const tints = [PANEL_WHITE, PANEL_WARM, PANEL_SLATE, PANEL_BLUSH];
      let out = '';
      for (let i = 0; i < 4; i++) {
        const x = M + (i % 2) * (pw + G);
        const y = M + Math.floor(i / 2) * (ph + G);
        out += rectPanel(uid, i, x, y, pw, ph,
          `<rect x="${x}" y="${y}" width="${pw}" height="${ph}" fill="${tints[i]}" />` +
          (i === 3 ? radialLines(x + pw / 2, y + ph / 2, 48, 200, 22, 0.3) : '') +
          handMotif(x + pw / 2, y + ph * 0.54, 1.45 + i * 0.12, modes[i])
        );
        out += stepBadge(x + 28, y + 28, i + 1, 30);
      }
      return out;
    }

    case 'SB-023': {
      // 由远到近: wide -> medium -> close-up -> extreme close-up
      const fh = (H - G * 3) / 4;
      const stages = [
        (y) => scenicSkyline(M, y, W, fh, PANEL_SLATE) + mangaFigure(M + W * 0.5, y + fh * 0.72, 0.65, 'stand'),
        (y) => `<rect x="${M}" y="${y}" width="${W}" height="${fh}" fill="${PANEL_WARM}" />` + mangaBust(M + W * 0.5, y + fh * 0.74, 0.95, { mood: 'calm' }),
        (y) => `<rect x="${M}" y="${y}" width="${W}" height="${fh}" fill="${PANEL_STONE}" />` + mangaBust(M + W * 0.5, y + fh * 0.85, 1.6, { mood: 'intense' }),
        (y) => `<rect x="${M}" y="${y}" width="${W}" height="${fh}" fill="${PANEL_BLUSH}" />` + radialLines(M + W / 2, y + fh / 2, 60, 320, 28, 0.25) + mangaEye(M + W * 0.5, y + fh * 0.52, 2.1, 3),
      ];
      let out = '';
      for (let i = 0; i < 4; i++) {
        const y = M + i * (fh + G);
        out += rectPanel(uid, i, M, y, W, fh, stages[i](y));
        out += stepBadge(M + 28, y + 28, i + 1, 30);
      }
      return out;
    }

    case 'SB-024': {
      // 由近到远: extreme close-up -> face -> room -> huge wide panorama
      const h1 = 155, h2 = 185, h3 = 215, h4 = H - h1 - h2 - h3 - G * 3;
      const ys = [M, M + h1 + G, M + h1 + h2 + G * 2, M + h1 + h2 + h3 + G * 3];
      const hs = [h1, h2, h3, h4];
      const scenes = [
        () => `<rect x="${M}" y="${ys[0]}" width="${W}" height="${hs[0]}" fill="${PANEL_BLUSH}" />` + mangaEye(M + W / 2, ys[0] + hs[0] / 2, 1.8, 2),
        () => `<rect x="${M}" y="${ys[1]}" width="${W}" height="${hs[1]}" fill="${PANEL_WARM}" />` + mangaBust(M + W / 2, ys[1] + hs[1] * 0.82, 1.35, { mood: 'shock' }),
        () => `<rect x="${M}" y="${ys[2]}" width="${W}" height="${hs[2]}" fill="${PANEL_STONE}" />` + mangaFigure(M + W / 2, ys[2] + hs[2] * 0.62, 1.1, 'stand'),
        () => scenicSkyline(M, ys[3], W, hs[3], PANEL_SLATE) + mangaFigure(M + W / 2, ys[3] + hs[3] * 0.78, 0.55, 'stand', SEAL),
      ];
      let out = '';
      for (let i = 0; i < 4; i++) {
        out += rectPanel(uid, i, M, ys[i], W, hs[i], scenes[i]());
        out += stepBadge(M + 26, ys[i] + 26, i + 1, 28);
      }
      return out;
    }

    case 'SB-025': {
      // 正反打: Shot/reverse-shot dialogue A <-> B
      const fh = (H - G * 3) / 4;
      let out = '';
      for (let i = 0; i < 4; i++) {
        const y = M + i * (fh + G);
        const isA = i % 2 === 0;
        const inner = `<rect x="${M}" y="${y}" width="${W}" height="${fh}" fill="${isA ? PANEL_WARM : PANEL_SLATE}" />` +
          (isA
            ? mangaBust(M + W * 0.3, y + fh * 0.7, 1.15, { facing: 1, mood: i === 2 ? 'intense' : 'calm', hair: 'short' }) + speechBubble(M + W * 0.64, y + fh * 0.42, 76, 30, -28, 16)
            : mangaBust(M + W * 0.7, y + fh * 0.7, 1.15, { facing: -1, mood: i === 3 ? 'shock' : 'deadpan', hair: 'bob', shirtColor: PANEL_BLUSH }) + speechBubble(M + W * 0.36, y + fh * 0.42, 76, 30, 28, 16));
        out += rectPanel(uid, i, M, y, W, fh, inner);
        out += stepBadge(isA ? M + 28 : M + W - 28, y + 28, isA ? 'A' : 'B', 30, !isA);
      }
      return out;
    }

    case 'SB-026': {
      // 三连特写: 3 rapid stacked/vertical detail strikes + climax
      const topH = H * 0.52;
      const colW = (W - G * 2) / 3;
      const botH = H - topH - G;
      const yBot = M + topH + G;
      let out = '';
      out += rectPanel(uid, 0, M, M, colW, topH, `<rect x="${M}" y="${M}" width="${colW}" height="${topH}" fill="${PANEL_WARM}" />` + mangaEye(M + colW / 2, M + topH / 2, 1.25, 2));
      out += rectPanel(uid, 1, M + colW + G, M, colW, topH, `<rect x="${M + colW + G}" y="${M}" width="${colW}" height="${topH}" fill="${PANEL_SLATE}" />` + handMotif(M + colW + G + colW / 2, M + topH / 2, 1.25, 'reach'));
      out += rectPanel(uid, 2, M + (colW + G) * 2, M, colW, topH, `<rect x="${M + (colW + G) * 2}" y="${M}" width="${colW}" height="${topH}" fill="${PANEL_BLUSH}" />` + handMotif(M + (colW + G) * 2 + colW / 2, M + topH / 2, 1.25, 'button'));
      out += rectPanel(uid, 3, M, yBot, W, botH, `<rect x="${M}" y="${yBot}" width="${W}" height="${botH}" fill="${PANEL_WHITE}" />` + radialLines(M + W / 2, yBot + botH / 2, 70, 360, 32, 0.28) + impactBurst(M + W / 2, yBot + botH / 2, 140, 88, 14, '#FFFFFF', SEAL));
      out += stepBadge(M + 26, M + 26, 1, 28);
      out += stepBadge(M + colW + G + 26, M + 26, 2, 28);
      out += stepBadge(M + (colW + G) * 2 + 26, M + 26, 3, 28);
      out += stepBadge(M + 30, yBot + 30, 4, 34);
      return out;
    }

    case 'SB-027': {
      // 动作分解: 4 sequential kinetic steps (windup -> dash -> strike -> land)
      const pw = (W - G) / 2, ph = (H - G) / 2;
      const poses = ['stand', 'run', 'leap', 'stand'];
      const tints = [PANEL_WHITE, PANEL_WARM, PANEL_BLUSH, PANEL_SAGE];
      let out = '';
      for (let i = 0; i < 4; i++) {
        const x = M + (i % 2) * (pw + G);
        const y = M + Math.floor(i / 2) * (ph + G);
        out += rectPanel(uid, i, x, y, pw, ph,
          `<rect x="${x}" y="${y}" width="${pw}" height="${ph}" fill="${tints[i]}" />` +
          (i === 2 ? radialLines(x + pw / 2, y + ph / 2, 55, 210, 26, 0.3) : `<rect x="${x}" y="${y}" width="${pw}" height="${ph}" fill="url(#speed-${uid})" opacity="${i === 1 ? 0.8 : 0.2}" />`) +
          mangaFigure(x + pw / 2, y + ph * 0.56, 1.75, poses[i], i === 2 ? SEAL : INK)
        );
        out += stepBadge(x + 28, y + 28, i + 1, 32);
      }
      return out;
    }

    case 'SB-028': {
      // 连续动作残影: multiple ghosted motion silhouettes tracing one fast path
      const h1 = H * 0.56, h2 = H - h1 - G;
      const y2 = M + h1 + G;
      let out = rectPanel(uid, 0, M, M, W, h1,
        `<rect x="${M}" y="${M}" width="${W}" height="${h1}" fill="${PANEL_WARM}" />` +
        `<rect x="${M}" y="${M}" width="${W}" height="${h1}" fill="url(#speed-${uid})" />` +
        `<path d="M ${M + 80} ${M + h1 * 0.72} Q ${M + W * 0.45} ${M + h1 * 0.18}, ${M + W - 95} ${M + h1 * 0.52}" fill="none" stroke="${SEAL}" stroke-width="4" stroke-dasharray="10 8" />` +
        mangaFigure(M + 105, M + h1 * 0.68, 1.35, 'run', INK, 0.16) +
        mangaFigure(M + 225, M + h1 * 0.50, 1.45, 'leap', INK, 0.34) +
        mangaFigure(M + 365, M + h1 * 0.42, 1.55, 'leap', INK, 0.62) +
        mangaFigure(M + 515, M + h1 * 0.52, 1.75, 'run', INK, 1.0)
      );
      out += rectPanel(uid, 1, M, y2, W, h2,
        `<rect x="${M}" y="${y2}" width="${W}" height="${h2}" fill="${PANEL_SLATE}" />` +
        mangaFigure(M + 150, y2 + h2 * 0.58, 1.3, 'run', INK, 0.22) +
        mangaFigure(M + 310, y2 + h2 * 0.58, 1.4, 'run', INK, 0.5) +
        mangaFigure(M + 485, y2 + h2 * 0.58, 1.55, 'stand', SEAL, 1.0)
      );
      out += stepBadge(M + 30, M + 30, 1, 34);
      out += stepBadge(M + 30, y2 + 30, 2, 34);
      return out;
    }

    case 'SB-029': {
      // 静止重复: 4 nearly identical deadpan panels with tiny micro-change in panel 4
      const pw = (W - G) / 2, ph = (H - G) / 2;
      let out = '';
      for (let i = 0; i < 4; i++) {
        const x = M + (i % 2) * (pw + G);
        const y = M + Math.floor(i / 2) * (ph + G);
        const micro = i === 3
          ? `<path d="M ${x + pw * 0.68} ${y + ph * 0.44} C ${x + pw * 0.68} ${y + ph * 0.38}, ${x + pw * 0.74} ${y + ph * 0.44}, ${x + pw * 0.71} ${y + ph * 0.5} C ${x + pw * 0.68} ${y + ph * 0.5}, ${x + pw * 0.68} ${y + ph * 0.44}, ${x + pw * 0.68} ${y + ph * 0.44} Z" fill="${SEAL}" />` + speechBubble(x + pw * 0.74, y + ph * 0.24, 34, 18, -14, 16)
          : '';
        out += rectPanel(uid, i, x, y, pw, ph,
          `<rect x="${x}" y="${y}" width="${pw}" height="${ph}" fill="${PANEL_WHITE}" />` +
          `<line x1="${x + 24}" y1="${y + ph * 0.84}" x2="${x + pw - 24}" y2="${y + ph * 0.84}" stroke="${INK}" stroke-width="2.5" />` +
          mangaBust(x + pw * 0.5, y + ph * 0.68, 1.15, { mood: 'deadpan', hair: 'short', shirtColor: PANEL_STONE }) +
          micro
        );
        out += stepBadge(x + 26, y + 26, i + 1, 28, i < 3);
      }
      return out;
    }

    case 'SB-030': {
      // 节奏骤停: 6 dense high-speed panels on top -> huge calm whitespace pause below
      const topH = H * 0.44;
      const cw = (W - G * 2) / 3, rh = (topH - G) / 2;
      let out = '';
      for (let i = 0; i < 6; i++) {
        const x = M + (i % 3) * (cw + G);
        const y = M + Math.floor(i / 3) * (rh + G);
        out += rectPanel(uid, i, x, y, cw, rh, `<rect x="${x}" y="${y}" width="${cw}" height="${rh}" fill="${i % 2 ? PANEL_BLUSH : PANEL_STONE}" /><rect x="${x}" y="${y}" width="${cw}" height="${rh}" fill="url(#speed-${uid})" />` + (i % 2 ? mangaEye(x + cw / 2, y + rh / 2, 0.9, 3) : mangaFigure(x + cw / 2, y + rh * 0.58, 0.9, 'leap')));
        out += stepBadge(x + 20, y + 20, i + 1, 24);
      }
      const yBot = M + topH + G * 1.4;
      const botH = H - topH - G * 1.4;
      out += rectPanel(uid, 6, M, yBot, W, botH,
        `<rect x="${M}" y="${yBot}" width="${W}" height="${botH}" fill="${PANEL_WHITE}" />` +
        `<line x1="${M + 90}" y1="${yBot + botH * 0.78}" x2="${M + W - 90}" y2="${yBot + botH * 0.78}" stroke="${INK}" stroke-width="2" opacity="0.4" />` +
        mangaFigure(M + W * 0.5, yBot + botH * 0.66, 0.85, 'stand', INK),
        { strokeWidth: 2.2 }
      );
      out += stepBadge(M + 32, yBot + 32, 7, 34, true);
      return out;
    }

    case 'SB-031': {
      // 爆发后留白: giant action explosion at top -> vast serene empty bottom with tiny figure
      const topH = H * 0.46;
      const yBot = M + topH + G * 1.8;
      const botH = H - topH - G * 1.8;
      let out = rectPanel(uid, 0, M, M, W, topH,
        `<rect x="${M}" y="${M}" width="${W}" height="${topH}" fill="${PANEL_BLUSH}" />` +
        radialLines(M + W / 2, M + topH / 2, 70, 380, 40, 0.4) +
        impactBurst(M + W / 2, M + topH / 2, 175, 110, 18, '#FFFFFF', SEAL) +
        mangaFigure(M + W / 2, M + topH / 2, 1.9, 'leap', INK)
      );
      // Vast quiet breathing field at bottom with tiny deadpan character
      out += `<line x1="${M + 120}" y1="${yBot + botH * 0.84}" x2="${M + W - 120}" y2="${yBot + botH * 0.84}" stroke="${INK}" stroke-width="1.6" opacity="0.35" />`;
      out += mangaFigure(M + W * 0.74, yBot + botH * 0.74, 0.65, 'stand', INK);
      out += speechBubble(M + W * 0.66, yBot + botH * 0.58, 30, 16, 12, 14);
      out += stepBadge(M + 32, M + 32, 1, 34);
      out += stepBadge(M + 32, yBot + 32, 2, 30, true);
      return out;
    }

    case 'SB-032': {
      // 上下镜像: mirrored top & bottom halves with contrasting light/dark mood
      const ph = (H - G * 1.5) / 2;
      const y2 = M + ph + G * 1.5;
      let out = rectPanel(uid, 0, M, M, W, ph,
        scenicSkyline(M, M, W, ph, PANEL_WARM) +
        mangaBust(M + W * 0.5, M + ph * 0.74, 1.45, { mood: 'happy', hair: 'bob', shirtColor: '#FFFFFF' })
      );
      out += rectPanel(uid, 1, M, y2, W, ph,
        `<rect x="${M}" y="${y2}" width="${W}" height="${ph}" fill="${PANEL_SLATE}" />` +
        `<rect x="${M}" y="${y2}" width="${W}" height="${ph}" fill="url(#dots-dark-${uid})" />` +
        `<g transform="translate(${M + W * 0.5}, ${y2 + ph * 0.26}) scale(1, -1)">${mangaBust(0, 0, 1.45, { mood: 'deadpan', hair: 'bob', shirtColor: INK_SOFT })}</g>`
      );
      out += `<line x1="${M - 10}" y1="${M + ph + G * 0.75}" x2="${M + W + 10}" y2="${M + ph + G * 0.75}" stroke="${SEAL}" stroke-width="4" stroke-dasharray="10 6" />`;
      out += stepBadge(M + 32, M + 32, 1, 32);
      out += stepBadge(M + 32, y2 + 32, 2, 32, true);
      return out;
    }

    case 'SB-033': {
      // 左右对峙: Left vs Right dramatic confrontation split down center
      const x0 = M, x1 = M + W, y0 = M, y1 = M + H;
      const mid = CANVAS_W / 2;
      const leftPts = `${x0},${y0} ${mid + 24},${y0} ${mid - 36},${y1} ${x0},${y1}`;
      const rightPts = `${mid + 46},${y0} ${x1},${y0} ${x1},${y1} ${mid - 14},${y1}`;
      let out = polyPanel(uid, 0, leftPts,
        `<rect x="${x0}" y="${y0}" width="${W}" height="${H}" fill="${PANEL_WARM}" />` +
        `<rect x="${x0}" y="${y0}" width="${W}" height="${H}" fill="url(#speed-${uid})" />` +
        mangaBust(x0 + W * 0.26, y0 + H * 0.56, 1.9, { facing: 1, mood: 'intense', hair: 'spiky', shirtColor: PANEL_STONE })
      );
      out += polyPanel(uid, 1, rightPts,
        `<rect x="${x0}" y="${y0}" width="${W}" height="${H}" fill="${PANEL_SLATE}" />` +
        `<rect x="${x0}" y="${y0}" width="${W}" height="${H}" fill="url(#dots-dark-${uid})" />` +
        mangaBust(x0 + W * 0.74, y0 + H * 0.56, 1.9, { facing: -1, mood: 'intense', hair: 'bob', shirtColor: INK_SOFT })
      );
      out += `<line x1="${mid + 35}" y1="${y0 - 8}" x2="${mid - 25}" y2="${y1 + 8}" stroke="${SEAL}" stroke-width="6" />`;
      out += impactBurst(mid + 5, CANVAS_H / 2, 48, 24, 10, SEAL, PAPER);
      out += stepBadge(x0 + 34, y0 + 34, 'L', 34);
      out += stepBadge(x1 - 34, y0 + 34, 'R', 34, true);
      return out;
    }

    case 'SB-034': {
      // 双线并行: Left track A + Right track B converging into one bottom panel
      const cw = (W - G) / 2;
      const rh = 195;
      let out = '';
      for (let r = 0; r < 3; r++) {
        const y = M + r * (rh + G);
        out += rectPanel(uid, r * 2, M, y, cw, rh, `<rect x="${M}" y="${y}" width="${cw}" height="${rh}" fill="${PANEL_WARM}" />` + mangaBust(M + cw / 2, y + rh * 0.72, 0.9, { facing: 1, mood: 'calm', hair: 'short' }));
        out += rectPanel(uid, r * 2 + 1, M + cw + G, y, cw, rh, `<rect x="${M + cw + G}" y="${y}" width="${cw}" height="${rh}" fill="${PANEL_SLATE}" />` + mangaBust(M + cw + G + cw / 2, y + rh * 0.72, 0.9, { facing: -1, mood: 'calm', hair: 'bob', shirtColor: PANEL_BLUSH }));
        out += stepBadge(M + 24, y + 24, `A${r + 1}`, 28);
        out += stepBadge(M + cw + G + 24, y + 24, `B${r + 1}`, 28, true);
      }
      const yBot = M + 3 * (rh + G);
      const botH = H - 3 * (rh + G);
      out += rectPanel(uid, 6, M, yBot, W, botH,
        `<rect x="${M}" y="${yBot}" width="${W}" height="${botH}" fill="${PANEL_SAGE}" />` +
        mangaBust(M + W * 0.34, yBot + botH * 0.72, 1.05, { facing: 1, mood: 'happy' }) +
        mangaBust(M + W * 0.66, yBot + botH * 0.72, 1.05, { facing: -1, mood: 'happy', hair: 'bob', shirtColor: PANEL_BLUSH })
      );
      out += stepBadge(M + W / 2, yBot + 28, 'A+B', 38);
      return out;
    }

    case 'SB-035': {
      // 交叉剪辑: Alternating checkerboard A / B rapid cross-cut
      const cw = (W - G) / 2, rh = (H - G * 2) / 3;
      let out = '';
      for (let i = 0; i < 6; i++) {
        const col = i % 2, row = Math.floor(i / 2);
        const x = M + col * (cw + G), y = M + row * (rh + G);
        const isA = (row + col) % 2 === 0;
        out += rectPanel(uid, i, x, y, cw, rh,
          `<rect x="${x}" y="${y}" width="${cw}" height="${rh}" fill="${isA ? PANEL_WARM : PANEL_SLATE}" />` +
          (isA ? mangaBust(x + cw / 2, y + rh * 0.7, 1.0, { facing: 1, mood: 'intense', hair: 'short' }) : mangaBust(x + cw / 2, y + rh * 0.7, 1.0, { facing: -1, mood: 'shock', hair: 'bob', shirtColor: PANEL_STONE }))
        );
        out += stepBadge(x + 28, y + 28, isA ? 'A' : 'B', 30, !isA);
      }
      return out;
    }

    case 'SB-036': {
      // 闪回嵌套: Main present panel with sepia-toned flashback inset nested inside
      let out = rectPanel(uid, 0, M, M, W, H,
        scenicSkyline(M, M, W, H, PANEL_SLATE) +
        mangaBust(M + W * 0.28, M + H * 0.78, 1.75, { facing: 1, mood: 'calm', hair: 'short' })
      );
      const ix = M + W * 0.34, iy = M + 74, iw = W * 0.58, ih = H * 0.46;
      out += rectPanel(uid, 1, ix, iy, iw, ih,
        `<rect x="${ix}" y="${iy}" width="${iw}" height="${ih}" fill="#EFE4CE" />` +
        `<rect x="${ix}" y="${iy}" width="${iw}" height="${ih}" fill="url(#dots-${uid})" />` +
        mangaBust(ix + iw * 0.36, iy + ih * 0.68, 1.05, { facing: 1, mood: 'happy', hair: 'short' }) +
        mangaBust(ix + iw * 0.68, iy + ih * 0.68, 1.0, { facing: -1, mood: 'happy', hair: 'bob' }),
        { stroke: SEAL, strokeWidth: 3.5, rx: 8, shadow: true }
      );
      out += `<rect x="${ix - 8}" y="${iy - 8}" width="${iw + 16}" height="${ih + 16}" rx="12" fill="none" stroke="${SEAL}" stroke-width="2" stroke-dasharray="8 6" />`;
      out += stepBadge(M + 32, M + 32, 1, 32, true);
      out += stepBadge(ix + 28, iy + 28, 2, 32);
      return out;
    }

    case 'SB-037': {
      // 想象嵌套: Real character below + scalloped daydream imagination cloud panel above
      let out = rectPanel(uid, 0, M, M, W, H,
        `<rect x="${M}" y="${M}" width="${W}" height="${H}" fill="${PANEL_WARM}" />` +
        mangaBust(M + W * 0.3, M + H * 0.84, 1.65, { facing: 1, mood: 'deadpan', hair: 'short' })
      );
      // Thought trail dots
      out += `<circle cx="${M + W * 0.42}" cy="${M + H * 0.64}" r="12" fill="#FFFFFF" stroke="${INK}" stroke-width="3" />`;
      out += `<circle cx="${M + W * 0.48}" cy="${M + H * 0.56}" r="18" fill="#FFFFFF" stroke="${INK}" stroke-width="3" />`;
      const cloudD = `M ${M + 170} ${M + 145} C ${M + 170} ${M + 75}, ${M + 310} ${M + 60}, ${M + 365} ${M + 100} C ${M + 430} ${M + 55}, ${M + 585} ${M + 90}, ${M + 575} ${M + 185} C ${M + 620} ${M + 250}, ${M + 580} ${M + 395}, ${M + 485} ${M + 395} C ${M + 435} ${M + 445}, ${M + 290} ${M + 440}, ${M + 255} ${M + 390} C ${M + 145} ${M + 405}, ${M + 105} ${M + 285}, ${M + 150} ${M + 220} C ${M + 125} ${M + 180}, ${M + 145} ${M + 145}, ${M + 170} ${M + 145} Z`;
      out += pathPanel(uid, 1, cloudD,
        `<rect x="${M + 80}" y="${M + 50}" width="540" height="400" fill="${PANEL_BLUSH}" />` +
        radialLines(M + 370, M + 255, 50, 240, 24, 0.25) +
        mangaFigure(M + 370, M + 255, 1.85, 'leap', SEAL),
        { stroke: INK, strokeWidth: 4, shadow: true }
      );
      out += stepBadge(M + 32, M + H - 36, 1, 32, true);
      out += stepBadge(M + 205, M + 155, 2, 34);
      return out;
    }

    case 'SB-038': {
      // 监控屏幕式: 2x3 CCTV security monitor grid with REC dots & HUD brackets
      let out = `<rect x="${M - 10}" y="${M - 10}" width="${W + 20}" height="${H + 20}" rx="8" fill="#232422" />`;
      const cw = (W - G) / 2, rh = (H - G * 2) / 3;
      for (let i = 0; i < 6; i++) {
        const x = M + (i % 2) * (cw + G), y = M + Math.floor(i / 2) * (rh + G);
        out += rectPanel(uid, i, x, y, cw, rh,
          `<rect x="${x}" y="${y}" width="${cw}" height="${rh}" fill="${PANEL_SLATE}" />` +
          `<rect x="${x}" y="${y}" width="${cw}" height="${rh}" fill="url(#dots-${uid})" />` +
          mangaFigure(x + cw * (0.3 + (i % 3) * 0.2), y + rh * 0.62, 0.95, i % 2 ? 'run' : 'stand', INK) +
          // HUD corners + REC
          `<path d="M ${x + 12} ${y + 28} L ${x + 12} ${y + 12} L ${x + 28} ${y + 12} M ${x + cw - 28} ${y + 12} L ${x + cw - 12} ${y + 12} L ${x + cw - 12} ${y + 28}" fill="none" stroke="${INK}" stroke-width="2" />` +
          `<circle cx="${x + 24}" cy="${y + rh - 20}" r="5.5" fill="${SEAL}" />` +
          `<text x="${x + 36}" y="${y + rh - 15}" font-family="ui-monospace, monospace" font-size="13" font-weight="700" fill="${INK}">CAM-0${i + 1}</text>`,
          { stroke: '#4A4E4D', strokeWidth: 2.5, rx: 3 }
        );
      }
      return out;
    }

    case 'SB-039': {
      // 手机聊天式: Real scene panels + overlaid smartphone chat UI column
      const leftW = W * 0.56;
      const phoneX = M + leftW + G, phoneW = W - leftW - G;
      const rh = (H - G * 2) / 3;
      let out = '';
      for (let i = 0; i < 3; i++) {
        const y = M + i * (rh + G);
        out += rectPanel(uid, i, M, y, leftW, rh,
          `<rect x="${M}" y="${y}" width="${leftW}" height="${rh}" fill="${i === 1 ? PANEL_BLUSH : PANEL_WARM}" />` +
          mangaBust(M + leftW * 0.5, y + rh * 0.68, 1.05, { mood: ['calm', 'shock', 'happy'][i], hair: 'bob' })
        );
        out += stepBadge(M + 26, y + 26, i + 1, 28);
      }
      // Smartphone frame on right
      out += `<rect x="${phoneX}" y="${M + 24}" width="${phoneW}" height="${H - 48}" rx="28" fill="${INK}" />`;
      out += `<rect x="${phoneX + 12}" y="${M + 48}" width="${phoneW - 24}" height="${H - 96}" rx="18" fill="#FFFFFF" />`;
      out += `<rect x="${phoneX + phoneW / 2 - 34}" y="${M + 34}" width="68" height="7" rx="3.5" fill="#444" />`;
      // Chat bubbles inside phone
      const bubbles = [
        { side: 'L', y: M + 105, w: 150, h: 64, fill: PANEL_STONE },
        { side: 'R', y: M + 195, w: 165, h: 72, fill: SEAL },
        { side: 'L', y: M + 295, w: 175, h: 86, fill: PANEL_STONE },
        { side: 'R', y: M + 410, w: 145, h: 62, fill: SEAL },
        { side: 'L', y: M + 500, w: 165, h: 78, fill: PANEL_STONE },
        { side: 'R', y: M + 605, w: 170, h: 84, fill: INK },
      ];
      bubbles.forEach((b) => {
        const bx = b.side === 'L' ? phoneX + 26 : phoneX + phoneW - 26 - b.w;
        out += `<rect x="${bx}" y="${b.y}" width="${b.w}" height="${b.h}" rx="14" fill="${b.fill}" />`;
        out += `<line x1="${bx + 18}" y1="${b.y + 24}" x2="${bx + b.w - 22}" y2="${b.y + 24}" stroke="${b.side === 'L' ? INK : '#FFFFFF'}" stroke-width="3" stroke-linecap="round" opacity="0.45" />`;
        out += `<line x1="${bx + 18}" y1="${b.y + 42}" x2="${bx + b.w - 46}" y2="${b.y + 42}" stroke="${b.side === 'L' ? INK : '#FFFFFF'}" stroke-width="3" stroke-linecap="round" opacity="0.3" />`;
      });
      return out;
    }

    case 'SB-040': {
      // 档案拼贴式: Investigation board with pinned polaroids, sticky notes & red string
      let out = `<rect x="${M}" y="${M}" width="${W}" height="${H}" fill="${PANEL_STONE}" stroke="${INK}" stroke-width="3" rx="4" />`;
      out += `<rect x="${M}" y="${M}" width="${W}" height="${H}" fill="url(#dots-${uid})" />`;
      // Red clue string connecting cards
      out += `<path d="M ${M + 170} ${M + 130} L ${M + 470} ${M + 230} L ${M + 210} ${M + 540} L ${M + 480} ${M + 690}" fill="none" stroke="${SEAL}" stroke-width="3.5" />`;
      // Tilted Polaroid 1
      out += `<g transform="translate(${M + 48}, ${M + 70}) rotate(-4)" filter="url(#card-shadow-${uid})">
        <rect x="0" y="0" width="230" height="270" fill="#FFFFFF" stroke="${INK}" stroke-width="2.5" />
        <rect x="16" y="16" width="198" height="190" fill="${PANEL_SLATE}" stroke="${INK}" stroke-width="2" />
        ${mangaBust(115, 145, 0.9, { mood: 'intense' })}
        <circle cx="115" cy="14" r="9" fill="${SEAL}" />
      </g>`;
      // Tilted Evidence Card 2
      out += `<g transform="translate(${M + 350}, ${M + 125}) rotate(3.5)" filter="url(#card-shadow-${uid})">
        <rect x="0" y="0" width="245" height="260" fill="#FFFDF4" stroke="${INK}" stroke-width="2.5" />
        <line x1="24" y1="54" x2="215" y2="54" stroke="${INK}" stroke-width="3" />
        <line x1="24" y1="88" x2="190" y2="88" stroke="${INK}" stroke-width="2" opacity="0.45" />
        <line x1="24" y1="116" x2="210" y2="116" stroke="${INK}" stroke-width="2" opacity="0.45" />
        <rect x="24" y="146" width="195" height="86" fill="${PANEL_WARM}" stroke="${INK}" stroke-width="2" />
        <circle cx="122" cy="16" r="9" fill="${SEAL}" />
      </g>`;
      // Sticky Note
      out += `<g transform="translate(${M + 75}, ${M + 430}) rotate(2.5)" filter="url(#card-shadow-${uid})">
        <rect x="0" y="0" width="245" height="245" fill="#F8E7B4" stroke="${INK}" stroke-width="2.5" />
        ${handMotif(122, 130, 1.1, 'reach')}
        <circle cx="122" cy="16" r="9" fill="${SEAL}" />
      </g>`;
      // Bottom Photo Card
      out += `<g transform="translate(${M + 335}, ${M + 510}) rotate(-3)" filter="url(#card-shadow-${uid})">
        <rect x="0" y="0" width="250" height="290" fill="#FFFFFF" stroke="${INK}" stroke-width="2.5" />
        <rect x="16" y="16" width="218" height="210" fill="${PANEL_BLUSH}" stroke="${INK}" stroke-width="2" />
        ${mangaEye(125, 120, 1.25, 2)}
        <circle cx="125" cy="14" r="9" fill="${SEAL}" />
      </g>`;
      return out;
    }

    case 'SB-041': {
      // 杂志编辑式: Editorial magazine masthead + hero portrait + 3 comic insets
      let out = `<rect x="${M}" y="${M}" width="${W}" height="${H}" fill="#FFFFFF" stroke="${INK}" stroke-width="3" />`;
      // Top editorial masthead bar
      out += `<rect x="${M + 26}" y="${M + 26}" width="${W - 52}" height="74" fill="${INK}" />`;
      out += `<rect x="${M + 46}" y="${M + 48}" width="240" height="14" fill="#FFFFFF" />`;
      out += `<rect x="${M + 46}" y="${M + 70}" width="140" height="8" fill="${SEAL}" />`;
      out += `<rect x="${M + W - 110}" y="${M + 44}" width="64" height="36" fill="${SEAL}" />`;
      // Left editorial column + right hero panel
      out += rectPanel(uid, 0, M + 26, M + 120, W * 0.56, 390,
        scenicSkyline(M + 26, M + 120, W * 0.56, 390, PANEL_WARM) +
        mangaBust(M + 26 + W * 0.28, M + 380, 1.45, { mood: 'happy', hair: 'bob', shirtColor: PANEL_BLUSH })
      );
      const rx = M + 26 + W * 0.56 + 18, rw = W - 52 - W * 0.56 - 18;
      // Editorial copy lines
      for (let l = 0; l < 7; l++) {
        out += `<rect x="${rx}" y="${M + 132 + l * 22}" width="${l === 6 ? rw * 0.65 : rw}" height="7" fill="${INK}" opacity="${l === 0 ? 0.85 : 0.22}" />`;
      }
      out += rectPanel(uid, 1, rx, M + 306, rw, 204, `<rect x="${rx}" y="${M + 306}" width="${rw}" height="204" fill="${PANEL_SLATE}" />` + mangaEye(rx + rw / 2, M + 408, 1.05, 1));
      // Bottom 2 comic strips
      const bw = (W - 52 - 18) / 2;
      out += rectPanel(uid, 2, M + 26, M + 530, bw, 326, `<rect x="${M + 26}" y="${M + 530}" width="${bw}" height="326" fill="${PANEL_SAGE}" />` + mangaFigure(M + 26 + bw / 2, M + 695, 1.45, 'run'));
      out += rectPanel(uid, 3, M + 26 + bw + 18, M + 530, bw, 326, `<rect x="${M + 26 + bw + 18}" y="${M + 530}" width="${bw}" height="326" fill="${PANEL_WARM}" />` + mangaBust(M + 26 + bw + 18 + bw / 2, M + 740, 1.15, { mood: 'calm' }));
      return out;
    }

    case 'SB-042': {
      // 信息图漫画: Comic panels paired with infographic chart + callout arrows
      const pw = (W - G) / 2;
      let out = rectPanel(uid, 0, M, M, W, 290,
        `<rect x="${M}" y="${M}" width="${W}" height="290" fill="${PANEL_WARM}" />` +
        mangaBust(M + 150, M + 205, 1.15, { facing: 1, mood: 'happy' }) +
        // Mini bar chart inside panel
        `<rect x="${M + 310}" y="${M + 48}" width="286" height="194" rx="6" fill="#FFFFFF" stroke="${INK}" stroke-width="2.4" />` +
        `<rect x="${M + 344}" y="${M + 150}" width="38" height="72" fill="${PANEL_SLATE}" stroke="${INK}" stroke-width="2" />` +
        `<rect x="${M + 402}" y="${M + 112}" width="38" height="110" fill="${GOLD}" stroke="${INK}" stroke-width="2" />` +
        `<rect x="${M + 460}" y="${M + 78}" width="38" height="144" fill="${SEAL}" stroke="${INK}" stroke-width="2" />` +
        `<rect x="${M + 518}" y="${M + 132}" width="38" height="90" fill="${SLATE}" stroke="${INK}" stroke-width="2" />`
      );
      const y2 = M + 290 + G;
      out += rectPanel(uid, 1, M, y2, pw, 275, `<rect x="${M}" y="${y2}" width="${pw}" height="275" fill="${PANEL_WHITE}" />` + `<circle cx="${M + pw / 2}" cy="${y2 + 138}" r="76" fill="${PANEL_SLATE}" stroke="${INK}" stroke-width="3" />` + `<path d="M ${M + pw / 2} ${y2 + 138} L ${M + pw / 2} ${y2 + 62} A 76 76 0 0 1 ${M + pw / 2 + 68} ${y2 + 170} Z" fill="${SEAL}" stroke="${INK}" stroke-width="2.5" />`);
      out += rectPanel(uid, 2, M + pw + G, y2, pw, 275, `<rect x="${M + pw + G}" y="${y2}" width="${pw}" height="275" fill="${PANEL_SAGE}" />` + mangaBust(M + pw + G + pw / 2, y2 + 190, 1.05, { mood: 'calm', hair: 'bob' }));
      const y3 = y2 + 275 + G;
      const h3 = H - 290 - 275 - G * 2;
      out += rectPanel(uid, 3, M, y3, W, h3,
        `<rect x="${M}" y="${y3}" width="${W}" height="${h3}" fill="${PANEL_WHITE}" />` +
        `<rect x="${M + 36}" y="${y3 + 56}" width="160" height="160" rx="6" fill="${PANEL_WARM}" stroke="${INK}" stroke-width="2.4" />` +
        `<rect x="${M + 238}" y="${y3 + 56}" width="160" height="160" rx="6" fill="${PANEL_SLATE}" stroke="${INK}" stroke-width="2.4" />` +
        `<rect x="${M + 440}" y="${y3 + 56}" width="160" height="160" rx="6" fill="${PANEL_BLUSH}" stroke="${INK}" stroke-width="2.4" />` +
        flowArrow(uid, `M ${M + 202} ${y3 + 136} L ${M + 232} ${y3 + 136}`, false) +
        flowArrow(uid, `M ${M + 404} ${y3 + 136} L ${M + 434} ${y3 + 136}`, false)
      );
      out += stepBadge(M + 28, M + 28, 1, 30);
      out += stepBadge(M + 28, y2 + 28, 2, 30);
      out += stepBadge(M + pw + G + 28, y2 + 28, 3, 30);
      out += stepBadge(M + 28, y3 + 28, 4, 30);
      return out;
    }

    case 'SB-043': {
      // 地图路线式: Winding map trail connecting 5 illustrated comic milestone stops
      let out = `<rect x="${M}" y="${M}" width="${W}" height="${H}" fill="${PANEL_SAGE}" stroke="${INK}" stroke-width="3.5" rx="4" />`;
      out += `<rect x="${M}" y="${M}" width="${W}" height="${H}" fill="url(#grid-${uid})" />`;
      const trail = `M ${M + 115} ${M + 125} C ${M + 540} ${M + 80}, ${M + 560} ${M + 310}, ${M + 170} ${M + 390} C ${M + 40} ${M + 430}, ${M + 550} ${M + 540}, ${M + 510} ${M + 740}`;
      out += `<path d="${trail}" fill="none" stroke="#FFFFFF" stroke-width="26" stroke-linecap="round" />`;
      out += `<path d="${trail}" fill="none" stroke="${SEAL}" stroke-width="5" stroke-dasharray="12 10" stroke-linecap="round" marker-end="url(#arrow-${uid})" />`;
      const stops = [
        { x: M + 45, y: M + 55, w: 220, h: 145 },
        { x: M + 365, y: M + 150, w: 225, h: 145 },
        { x: M + 65, y: M + 325, w: 225, h: 150 },
        { x: M + 345, y: M + 485, w: 235, h: 150 },
        { x: M + 145, y: M + 685, w: 310, h: 155 },
      ];
      stops.forEach((s, i) => {
        out += rectPanel(uid, i, s.x, s.y, s.w, s.h,
          `<rect x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}" fill="#FFFFFF" />` +
          mangaFigure(s.x + s.w * 0.5, s.y + s.h * 0.55, 0.9, i === 4 ? 'leap' : 'run', i === 4 ? SEAL : INK),
          { rx: 10, shadow: true }
        );
        out += stepBadge(s.x + 22, s.y + 22, i + 1, 28);
      });
      return out;
    }

    case 'SB-044': {
      // 时间轴式: Vertical left timeline rail (morning -> noon -> dusk -> night) + 4 right scenes
      const railX = M + 64;
      const rowH = (H - G * 3) / 4;
      let out = `<line x1="${railX}" y1="${M + 40}" x2="${railX}" y2="${M + H - 40}" stroke="${INK}" stroke-width="4" />`;
      const tints = ['#FBF4DF', PANEL_WARM, PANEL_BLUSH, '#D7DFE6'];
      for (let i = 0; i < 4; i++) {
        const y = M + i * (rowH + G);
        const cy = y + rowH / 2;
        out += `<circle cx="${railX}" cy="${cy}" r="24" fill="${i === 3 ? INK : '#FFFFFF'}" stroke="${INK}" stroke-width="3.5" />`;
        // Time icon (rising sun, full sun, dusk, crescent moon)
        if (i === 0) out += `<path d="M ${railX - 11} ${cy + 4} A 11 11 0 0 1 ${railX + 11} ${cy + 4} Z" fill="${SEAL}" />`;
        else if (i === 1) out += `<circle cx="${railX}" cy="${cy}" r="9" fill="${GOLD}" />`;
        else if (i === 2) out += `<circle cx="${railX}" cy="${cy + 3}" r="8" fill="${SEAL}" /><line x1="${railX - 13}" y1="${cy + 7}" x2="${railX + 13}" y2="${cy + 7}" stroke="${INK}" stroke-width="2" />`;
        else out += `<path d="M ${railX + 4} ${cy - 9} A 9 9 0 1 0 ${railX + 4} ${cy + 9} A 7 7 0 1 1 ${railX + 4} ${cy - 9} Z" fill="#FBF9F4" />`;
        const px = railX + 48, pw = W - (px - M);
        out += `<line x1="${railX + 24}" y1="${cy}" x2="${px}" y2="${cy}" stroke="${SEAL}" stroke-width="3" />`;
        out += rectPanel(uid, i, px, y, pw, rowH,
          `<rect x="${px}" y="${y}" width="${pw}" height="${rowH}" fill="${tints[i]}" />` +
          mangaBust(px + pw * 0.35, y + rowH * 0.72, 1.0, { facing: 1, mood: ['calm', 'happy', 'deadpan', 'calm'][i] }) +
          speechBubble(px + pw * 0.72, y + rowH * 0.38, 62, 24, -22, 16)
        );
        out += stepBadge(px + pw - 26, y + 26, i + 1, 28);
      }
      return out;
    }

    case 'SB-045': {
      // 时钟式: Radial clock dial at center with 6 comic panels orbiting around clock ticks
      const cx = CANVAS_W / 2, cy = CANVAS_H / 2;
      let out = `<circle cx="${cx}" cy="${cy}" r="300" fill="${PANEL_WARM}" stroke="${INK}" stroke-width="3" stroke-dasharray="6 8" />`;
      // Clock ticks
      for (let h = 0; h < 12; h++) {
        const a = (h / 12) * Math.PI * 2 - Math.PI / 2;
        out += `<line x1="${(cx + Math.cos(a) * 118).toFixed(1)}" y1="${(cy + Math.sin(a) * 118).toFixed(1)}" x2="${(cx + Math.cos(a) * 136).toFixed(1)}" y2="${(cy + Math.sin(a) * 136).toFixed(1)}" stroke="${INK}" stroke-width="${h % 3 === 0 ? 4 : 2}" />`;
      }
      // 6 radial comic panels around clock
      const angles = [-90, -30, 30, 90, 150, 210];
      angles.forEach((deg, i) => {
        const a = (deg * Math.PI) / 180;
        const px = cx + Math.cos(a) * 248;
        const py = cy + Math.sin(a) * 288;
        out += circlePanel(uid, i, px, py, 86,
          `<rect x="${px - 90}" y="${py - 90}" width="180" height="180" fill="${i % 2 ? PANEL_SLATE : PANEL_WHITE}" />` +
          mangaBust(px, py + 24, 0.72, { mood: ['calm', 'happy', 'intense', 'deadpan', 'happy', 'calm'][i], hair: i % 2 ? 'bob' : 'short' }),
          { shadow: true }
        );
        out += stepBadge(px - 62, py - 58, i + 1, 28);
      });
      // Center clock face
      out += `<circle cx="${cx}" cy="${cy}" r="112" fill="#FFFFFF" stroke="${INK}" stroke-width="4.5" filter="url(#card-shadow-${uid})" />`;
      out += `<line x1="${cx}" y1="${cy}" x2="${cx}" y2="${cy - 68}" stroke="${INK}" stroke-width="5" stroke-linecap="round" />`;
      out += `<line x1="${cx}" y1="${cy}" x2="${cx + 52}" y2="${cy + 22}" stroke="${SEAL}" stroke-width="4.5" stroke-linecap="round" />`;
      out += `<circle cx="${cx}" cy="${cy}" r="9" fill="${SEAL}" />`;
      return out;
    }

    case 'SB-046': {
      // 中心物件式: Central anchor hero object (steaming mug) + 4 orbiting narrative panels
      const pw = (W - G) / 2, ph = (H - G) / 2;
      const cx = CANVAS_W / 2, cy = CANVAS_H / 2;
      let out = '';
      for (let i = 0; i < 4; i++) {
        const x = M + (i % 2) * (pw + G), y = M + Math.floor(i / 2) * (ph + G);
        out += rectPanel(uid, i, x, y, pw, ph,
          `<rect x="${x}" y="${y}" width="${pw}" height="${ph}" fill="${[PANEL_WARM, PANEL_SLATE, PANEL_SAGE, PANEL_BLUSH][i]}" />` +
          mangaBust(x + (i % 2 === 0 ? pw * 0.34 : pw * 0.66), y + (i < 2 ? ph * 0.42 : ph * 0.72), 1.0, { facing: i % 2 === 0 ? 1 : -1, mood: ['calm', 'happy', 'deadpan', 'happy'][i], hair: i % 2 ? 'bob' : 'short' })
        );
        out += stepBadge(x + 26, y + 26, i + 1, 28);
      }
      // Hero object medallion dead-center
      out += circlePanel(uid, 4, cx, cy, 134,
        `<rect x="${cx - 140}" y="${cy - 140}" width="280" height="280" fill="#FFFFFF" />` +
        `<rect x="${cx - 48}" y="${cy - 12}" width="84" height="74" rx="12" fill="${SEAL}" stroke="${INK}" stroke-width="4" />` +
        `<path d="M ${cx + 36} ${cy + 4} C ${cx + 68} ${cy + 4}, ${cx + 68} ${cy + 46}, ${cx + 36} ${cy + 46}" fill="none" stroke="${INK}" stroke-width="5" />` +
        `<path d="M ${cx - 24} ${cy - 28} Q ${cx - 34} ${cy - 52}, ${cx - 18} ${cy - 70} M ${cx + 4} ${cy - 28} Q ${cx - 6} ${cy - 54}, ${cx + 12} ${cy - 74}" fill="none" stroke="${INK}" stroke-width="3.2" stroke-linecap="round" />`,
        { stroke: INK, strokeWidth: 4.5, shadow: true }
      );
      return out;
    }

    case 'SB-047': {
      // 中心人物式: Protagonist standing tall at dead-center while 4 story panels surround them
      const pw = (W - G) / 2, ph = (H - G) / 2;
      const cx = CANVAS_W / 2, cy = CANVAS_H / 2;
      let out = '';
      for (let i = 0; i < 4; i++) {
        const x = M + (i % 2) * (pw + G), y = M + Math.floor(i / 2) * (ph + G);
        out += rectPanel(uid, i, x, y, pw, ph,
          `<rect x="${x}" y="${y}" width="${pw}" height="${ph}" fill="${[PANEL_SLATE, PANEL_WARM, PANEL_BLUSH, PANEL_SAGE][i]}" />` +
          speechBubble(x + (i % 2 === 0 ? pw * 0.35 : pw * 0.65), y + (i < 2 ? ph * 0.34 : ph * 0.68), 54, 24, i % 2 === 0 ? 18 : -18, 16)
        );
        out += stepBadge(x + 26, y + 26, i + 1, 28);
      }
      // Tall vertical central hero medallion overlapping gutters
      out += rectPanel(uid, 4, cx - 108, cy - 220, 216, 440,
        `<rect x="${cx - 110}" y="${cy - 222}" width="220" height="444" fill="#FFFFFF" />` +
        `<rect x="${cx - 110}" y="${cy - 222}" width="220" height="444" fill="url(#dots-${uid})" />` +
        mangaFigure(cx, cy + 12, 3.0, 'stand', INK),
        { rx: 108, stroke: SEAL, strokeWidth: 4.5, shadow: true }
      );
      return out;
    }

    case 'SB-048': {
      // 环形阅读: Circular ring of 6 panels connected in a continuous loop
      const cx = CANVAS_W / 2, cy = CANVAS_H / 2;
      let out = `<circle cx="${cx}" cy="${cy}" r="250" fill="none" stroke="${SEAL}" stroke-width="4.5" stroke-dasharray="10 8" />`;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
        const px = cx + Math.cos(a) * 238;
        const py = cy + Math.sin(a) * 295;
        out += rectPanel(uid, i, px - 86, py - 74, 172, 148,
          `<rect x="${px - 86}" y="${py - 74}" width="172" height="148" fill="${i % 2 ? PANEL_WARM : PANEL_WHITE}" />` +
          mangaBust(px, py + 24, 0.72, { mood: ['calm', 'happy', 'intense', 'shock', 'deadpan', 'calm'][i], hair: 'short' }),
          { rx: 12, shadow: true }
        );
        out += stepBadge(px - 66, py - 54, i + 1, 28);
      }
      // Central cycle symbol
      out += `<path d="M ${cx - 44} ${cy} A 44 44 0 1 1 ${cx + 26} ${cy + 36}" fill="none" stroke="${SEAL}" stroke-width="5" stroke-linecap="round" marker-end="url(#arrow-${uid})" />`;
      return out;
    }

    case 'SB-049': {
      // 上下坠落式: Accelerating downward vertical chute with tumbling character
      const hs = [145, 175, 215, 290];
      let y = M;
      let out = '';
      for (let i = 0; i < 4; i++) {
        const inset = i === 3 ? 0 : (3 - i) * 28;
        const pw = W - inset * 2;
        const x = M + inset;
        out += rectPanel(uid, i, x, y, pw, hs[i],
          `<rect x="${x}" y="${y}" width="${pw}" height="${hs[i]}" fill="${i === 3 ? PANEL_BLUSH : PANEL_SLATE}" />` +
          `<line x1="${x + pw * 0.25}" y1="${y}" x2="${x + pw * 0.25}" y2="${y + hs[i]}" stroke="${INK}" stroke-width="2" opacity="0.25" />` +
          `<line x1="${x + pw * 0.75}" y1="${y}" x2="${x + pw * 0.75}" y2="${y + hs[i]}" stroke="${INK}" stroke-width="2" opacity="0.25" />` +
          mangaFigure(CANVAS_W / 2, y + hs[i] * 0.52, 0.9 + i * 0.32, 'fall', i === 3 ? SEAL : INK)
        );
        out += stepBadge(x + 26, y + 26, i + 1, 28);
        y += hs[i] + G;
      }
      out += flowArrow(uid, `M ${M + W - 26} ${M + 80} L ${M + W - 26} ${M + H - 80}`, true);
      return out;
    }

    case 'SB-050': {
      // 阶梯式: 4 ascending staircase panels stepping left-to-right / bottom-to-top
      const steps = [
        { x: M, y: M + 48, w: 300, h: 190 },
        { x: M + 112, y: M + 258, w: 310, h: 190 },
        { x: M + 224, y: M + 468, w: 310, h: 190 },
        { x: M + 328, y: M + 678, w: 310, h: 195 },
      ];
      let out = `<path d="M ${M + 40} ${M + 260} L ${M + 40} ${M + 870} L ${M + 310} ${M + 870}" fill="none" stroke="${INK}" stroke-width="2" opacity="0.2" stroke-dasharray="6 6" />`;
      steps.forEach((s, i) => {
        out += rectPanel(uid, i, s.x, s.y, s.w, s.h,
          `<rect x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}" fill="${[PANEL_WHITE, PANEL_WARM, PANEL_SLATE, PANEL_BLUSH][i]}" />` +
          mangaFigure(s.x + s.w * 0.54, s.y + s.h * 0.56, 1.15, i === 3 ? 'leap' : 'run', i === 3 ? SEAL : INK),
          { shadow: true }
        );
        out += stepBadge(s.x + 26, s.y + 26, i + 1, 30);
      });
      out += flowArrow(uid, `M ${M + 340} ${M + 115} L ${M + 585} ${M + 640}`, true);
      return out;
    }

    case 'SB-051': {
      // 波浪式: 3 organic flowing wavy-border horizontal bands
      const x0 = M, x1 = M + W;
      const d1 = `M ${x0} ${M} L ${x1} ${M} L ${x1} ${M + 275} C ${x0 + 430} ${M + 345}, ${x0 + 210} ${M + 205}, ${x0} ${M + 295} Z`;
      const d2 = `M ${x0} ${M + 320} C ${x0 + 210} ${M + 230}, ${x0 + 430} ${M + 370}, ${x1} ${M + 300} L ${x1} ${M + 585} C ${x0 + 430} ${M + 655}, ${x0 + 210} ${M + 515}, ${x0} ${M + 605} Z`;
      const d3 = `M ${x0} ${M + 630} C ${x0 + 210} ${M + 540}, ${x0 + 430} ${M + 680}, ${x1} ${M + 610} L ${x1} ${M + H} L ${x0} ${M + H} Z`;
      let out = '';
      out += pathPanel(uid, 0, d1, `<rect x="${x0}" y="${M}" width="${W}" height="350" fill="${PANEL_SLATE}" />` + mangaBust(x0 + 190, M + 195, 1.1, { facing: 1, mood: 'happy', hair: 'bob' }));
      out += pathPanel(uid, 1, d2, `<rect x="${x0}" y="${M + 220}" width="${W}" height="440" fill="${PANEL_WARM}" />` + mangaFigure(CANVAS_W / 2, M + 455, 1.5, 'leap', SEAL));
      out += pathPanel(uid, 2, d3, `<rect x="${x0}" y="${M + 530}" width="${W}" height="410" fill="${PANEL_SAGE}" />` + scenicSkyline(x0, M + 540, W, 380, PANEL_SAGE));
      out += stepBadge(x0 + 32, M + 32, 1, 30);
      out += stepBadge(x0 + 32, M + 355, 2, 30);
      out += stepBadge(x0 + 32, M + 665, 3, 30);
      return out;
    }

    case 'SB-052': {
      // 自由漂浮式: Free-floating asymmetric panels connected by sightline dotted guides
      const cards = [
        { x: M + 12, y: M + 18, w: 280, h: 220, rot: -3, bg: PANEL_WARM },
        { x: M + 335, y: M + 125, w: 285, h: 235, rot: 2.5, bg: PANEL_SLATE },
        { x: M + 38, y: M + 365, w: 265, h: 230, rot: 2, bg: PANEL_BLUSH },
        { x: M + 318, y: M + 585, w: 300, h: 255, rot: -2.5, bg: PANEL_SAGE },
      ];
      let out = flowArrow(uid, `M ${M + 260} ${M + 140} L ${M + 350} ${M + 210}`, true) +
        flowArrow(uid, `M ${M + 380} ${M + 340} L ${M + 260} ${M + 430}`, true) +
        flowArrow(uid, `M ${M + 270} ${M + 540} L ${M + 360} ${M + 640}`, true);
      cards.forEach((c, i) => {
        out += `<g transform="rotate(${c.rot}, ${c.x + c.w / 2}, ${c.y + c.h / 2})">`;
        out += rectPanel(uid, i, c.x, c.y, c.w, c.h,
          `<rect x="${c.x}" y="${c.y}" width="${c.w}" height="${c.h}" fill="${c.bg}" />` +
          mangaBust(c.x + c.w / 2, c.y + c.h * 0.68, 0.95, { facing: i % 2 === 0 ? 1 : -1, mood: ['calm', 'happy', 'shock', 'happy'][i], hair: i % 2 ? 'bob' : 'short' }),
          { rx: 6, shadow: true }
        );
        out += stepBadge(c.x + 26, c.y + 26, i + 1, 28);
        out += '</g>';
      });
      return out;
    }

    case 'SB-053': {
      // 无边框分镜: Completely borderless vignettes floating directly on open washi paper
      let out = '';
      // Soft atmospheric tonal pools instead of frames
      out += `<ellipse cx="${M + 195}" cy="${M + 190}" rx="165" ry="120" fill="${PANEL_SLATE}" opacity="0.7" />`;
      out += mangaBust(M + 195, M + 215, 1.2, { facing: 1, mood: 'calm' });
      out += speechBubble(M + 390, M + 115, 62, 26, -32, 24);

      out += `<ellipse cx="${M + 455}" cy="${M + 475}" rx="175" ry="125" fill="${PANEL_WARM}" opacity="0.85" />`;
      out += mangaFigure(M + 455, M + 475, 1.55, 'run', INK);

      out += `<ellipse cx="${M + 240}" cy="${M + 745}" rx="200" ry="118" fill="${PANEL_BLUSH}" opacity="0.75" />`;
      out += mangaBust(M + 240, M + 770, 1.25, { facing: -1, mood: 'happy', hair: 'bob' });

      out += stepBadge(M + 64, M + 95, 1, 30);
      out += stepBadge(M + 315, M + 375, 2, 30);
      out += stepBadge(M + 82, M + 660, 3, 30);
      return out;
    }

    case 'SB-054': {
      // 白场分镜: Poetic 75% negative space with tiny isolated figures & quiet bubbles
      let out = `<rect x="${M}" y="${M}" width="${W}" height="${H}" fill="#FFFFFF" stroke="${INK}" stroke-width="1.8" opacity="0.65" />`;
      out += `<line x1="${M + 100}" y1="${M + 240}" x2="${M + 250}" y2="${M + 240}" stroke="${INK}" stroke-width="2" />`;
      out += mangaFigure(M + 175, M + 192, 0.72, 'stand', INK);
      out += speechBubble(M + 245, M + 128, 36, 18, -14, 18);

      out += `<line x1="${M + 395}" y1="${M + 545}" x2="${M + 545}" y2="${M + 545}" stroke="${INK}" stroke-width="2" />`;
      out += mangaFigure(M + 470, M + 498, 0.72, 'stand', INK_SOFT);
      out += speechBubble(M + 402, M + 432, 36, 18, 14, 18);

      out += `<line x1="${M + 240}" y1="${M + 810}" x2="${M + 410}" y2="${M + 810}" stroke="${INK}" stroke-width="2" />`;
      out += mangaFigure(M + 325, M + 762, 0.72, 'stand', SEAL);

      out += stepBadge(M + 95, M + 140, 1, 28, true);
      out += stepBadge(M + 545, M + 445, 2, 28, true);
      out += stepBadge(M + 235, M + 710, 3, 28);
      return out;
    }

    case 'SB-055': {
      // 满版冲击格: Single monumental full-bleed splash page
      let out = rectPanel(uid, 0, M - 16, M - 16, W + 32, H + 32,
        scenicSkyline(M - 16, M - 16, W + 32, H + 32, PANEL_BLUSH) +
        radialLines(CANVAS_W / 2, CANVAS_H * 0.46, 110, 560, 48, 0.34) +
        impactBurst(CANVAS_W / 2, CANVAS_H * 0.46, 255, 175, 18, '#FFFFFF', SEAL) +
        mangaFigure(CANVAS_W / 2, CANVAS_H * 0.48, 3.6, 'leap', INK),
        { strokeWidth: 5 }
      );
      out += stepBadge(M + 28, M + 28, 'FULL', 44);
      return out;
    }

    case 'SB-056': {
      // 跨页式单页模拟: Simulated double-page magazine spread with center spine gutter
      let out = rectPanel(uid, 0, M, M + 80, W, H - 160,
        scenicSkyline(M, M + 80, W, H - 160, PANEL_SLATE) +
        mangaFigure(M + W * 0.24, M + H * 0.56, 2.0, 'run', INK) +
        mangaFigure(M + W * 0.76, M + H * 0.54, 2.1, 'leap', SEAL) +
        flowArrow(uid, `M ${M + W * 0.32} ${M + H * 0.5} L ${M + W * 0.65} ${M + H * 0.5}`, true) +
        // Center book spine fold shadow!
        `<rect x="${CANVAS_W / 2 - 36}" y="${M + 80}" width="72" height="${H - 160}" fill="url(#spine-${uid})" />` +
        `<line x1="${CANVAS_W / 2}" y1="${M + 80}" x2="${CANVAS_W / 2}" y2="${M + H - 80}" stroke="${INK}" stroke-width="1.5" stroke-dasharray="6 6" opacity="0.45" />`,
        { strokeWidth: 4 }
      );
      out += stepBadge(M + 34, M + 114, 'L', 32, true);
      out += stepBadge(M + W - 34, M + 114, 'R', 32);
      return out;
    }

    case 'SB-057': {
      // 海报式漫画: Commanding central poster visual + 3 small narrative inset boxes along bottom
      let out = rectPanel(uid, 0, M, M, W, H,
        scenicSkyline(M, M, W, H, PANEL_WARM) +
        radialLines(CANVAS_W / 2, M + 320, 90, 420, 32, 0.2) +
        mangaBust(CANVAS_W / 2, M + 410, 2.6, { mood: 'intense', hair: 'spiky', shirtColor: SEAL })
      );
      const iw = (W - 72 - G * 2) / 3, ih = 195, iy = M + H - ih - 28;
      for (let i = 0; i < 3; i++) {
        const ix = M + 36 + i * (iw + G);
        out += rectPanel(uid, i + 1, ix, iy, iw, ih,
          `<rect x="${ix}" y="${iy}" width="${iw}" height="${ih}" fill="#FFFFFF" />` +
          mangaFigure(ix + iw / 2, iy + ih * 0.56, 0.95, ['stand', 'run', 'leap'][i], INK),
          { shadow: true, strokeWidth: 3 }
        );
        out += stepBadge(ix + 22, iy + 22, i + 1, 26);
      }
      return out;
    }

    case 'SB-058': {
      // 封面式叙事页: Magazine cover header + hero visual top half + 3 narrative panels bottom
      const topH = H * 0.54;
      const botH = H - topH - G;
      const cw = (W - G * 2) / 3;
      const yBot = M + topH + G;
      let out = rectPanel(uid, 0, M, M, W, topH,
        `<rect x="${M}" y="${M}" width="${W}" height="${topH}" fill="${PANEL_BLUSH}" />` +
        `<rect x="${M + 36}" y="${M + 28}" width="${W - 72}" height="68" fill="${INK}" />` +
        `<rect x="${M + 58}" y="${M + 50}" width="260" height="24" fill="#FFFFFF" />` +
        `<rect x="${M + W - 120}" y="${M + 48}" width="64" height="28" fill="${SEAL}" />` +
        mangaBust(M + W / 2, M + topH * 0.72, 1.85, { mood: 'happy', hair: 'bob', shirtColor: '#FFFFFF' })
      );
      for (let i = 0; i < 3; i++) {
        const x = M + i * (cw + G);
        out += rectPanel(uid, i + 1, x, yBot, cw, botH,
          `<rect x="${x}" y="${yBot}" width="${cw}" height="${botH}" fill="${[PANEL_WHITE, PANEL_WARM, PANEL_SAGE][i]}" />` +
          mangaBust(x + cw / 2, yBot + botH * 0.68, 0.9, { mood: ['calm', 'shock', 'happy'][i] })
        );
        out += stepBadge(x + 24, yBot + 24, i + 1, 28);
      }
      return out;
    }

    case 'SB-059': {
      // 舞台式分镜: Fixed proscenium stage room repeated in 3 wide panels as characters enter/meet/exit
      const rh = (H - G * 2) / 3;
      let out = '';
      for (let i = 0; i < 3; i++) {
        const y = M + i * (rh + G);
        const stage = `<rect x="${M}" y="${y}" width="${W}" height="${rh}" fill="${PANEL_WARM}" />` +
          // Fixed proscenium curtains + stage floor
          `<path d="M ${M} ${y} L ${M + 54} ${y} Q ${M + 44} ${y + rh * 0.5}, ${M + 24} ${y + rh} L ${M} ${y + rh} Z" fill="${INK}" opacity="0.2" />` +
          `<path d="M ${M + W} ${y} L ${M + W - 54} ${y} Q ${M + W - 44} ${y + rh * 0.5}, ${M + W - 24} ${y + rh} L ${M + W} ${y + rh} Z" fill="${INK}" opacity="0.2" />` +
          `<line x1="${M}" y1="${y + rh * 0.78}" x2="${M + W}" y2="${y + rh * 0.78}" stroke="${INK}" stroke-width="2.6" />` +
          `<rect x="${M + W * 0.44}" y="${y + rh * 0.36}" width="76" height="${rh * 0.42}" fill="#FFFFFF" stroke="${INK}" stroke-width="2" />`;
        const actors = i === 0
          ? mangaFigure(M + 145, y + rh * 0.6, 1.1, 'run', INK)
          : i === 1
            ? mangaFigure(M + W * 0.4, y + rh * 0.6, 1.1, 'stand', INK) + mangaFigure(M + W * 0.6, y + rh * 0.6, 1.1, 'stand', SEAL) + speechBubble(M + W * 0.5, y + rh * 0.24, 48, 20, -10, 14)
            : mangaFigure(M + W - 145, y + rh * 0.6, 1.1, 'run', SEAL);
        out += rectPanel(uid, i, M, y, W, rh, stage + actors);
        out += stepBadge(M + 28, y + 28, i + 1, 30);
      }
      return out;
    }

    case 'SB-060': {
      // 横卷式分镜: Traditional horizontal scroll strips with continuous landscape & character progression
      const rh = (H - G * 2) / 3;
      let out = '';
      for (let i = 0; i < 3; i++) {
        const y = M + i * (rh + G);
        out += rectPanel(uid, i, M, y, W, rh,
          scenicSkyline(M, y, W, rh, [PANEL_WARM, PANEL_SAGE, PANEL_SLATE][i]) +
          mangaFigure(M + 110, y + rh * 0.66, 0.9, 'stand', INK, 0.4) +
          mangaFigure(M + 315, y + rh * 0.66, 0.95, 'run', INK, 0.72) +
          mangaFigure(M + 520, y + rh * 0.66, 1.05, 'run', SEAL, 1.0) +
          flowArrow(uid, `M ${M + 150} ${y + rh * 0.3} L ${M + 485} ${y + rh * 0.3}`, true)
        );
        // Scroll end dowels
        out += `<rect x="${M - 10}" y="${y - 4}" width="12" height="${rh + 8}" rx="4" fill="${INK}" />`;
        out += `<rect x="${M + W - 2}" y="${y - 4}" width="12" height="${rh + 8}" rx="4" fill="${INK}" />`;
        out += stepBadge(M + 28, y + 28, i + 1, 28);
      }
      return out;
    }

    case 'SB-061': {
      // 竖卷式分镜: Continuous vertical scroll descending seamlessly top to bottom
      const scrollX = M + 78, scrollW = W - 156;
      let out = rectPanel(uid, 0, scrollX, M + 18, scrollW, H - 36,
        `<rect x="${scrollX}" y="${M + 18}" width="${scrollW}" height="${H - 36}" fill="${PANEL_WARM}" />` +
        // Winding vertical river/path from top to bottom
        `<path d="M ${CANVAS_W / 2 - 40} ${M + 18} C ${CANVAS_W / 2 + 120} ${M + 260}, ${CANVAS_W / 2 - 140} ${M + 560}, ${CANVAS_W / 2 + 40} ${M + H - 18}" fill="none" stroke="${PANEL_SLATE}" stroke-width="96" />` +
        `<path d="M ${CANVAS_W / 2 - 40} ${M + 45} C ${CANVAS_W / 2 + 110} ${M + 265}, ${CANVAS_W / 2 - 130} ${M + 565}, ${CANVAS_W / 2 + 36} ${M + H - 55}" fill="none" stroke="${SEAL}" stroke-width="4.5" stroke-dasharray="10 8" marker-end="url(#arrow-${uid})" />` +
        mangaFigure(CANVAS_W / 2 - 10, M + 160, 1.0, 'stand', INK) +
        mangaFigure(CANVAS_W / 2 + 30, M + 420, 1.05, 'run', INK) +
        mangaFigure(CANVAS_W / 2 - 35, M + 660, 1.1, 'run', INK) +
        mangaFigure(CANVAS_W / 2 + 25, M + 835, 1.2, 'leap', SEAL)
      );
      // Scroll top & bottom wooden rollers
      out += `<rect x="${scrollX - 24}" y="${M + 8}" width="${scrollW + 48}" height="18" rx="6" fill="${INK}" />`;
      out += `<rect x="${scrollX - 24}" y="${M + H - 26}" width="${scrollW + 48}" height="18" rx="6" fill="${INK}" />`;
      out += stepBadge(scrollX + 28, M + 64, 1, 28);
      out += stepBadge(scrollX + 28, M + 360, 2, 28);
      out += stepBadge(scrollX + 28, M + 650, 3, 28);
      return out;
    }

    case 'SB-062': {
      // 镜面反射式: Crisp mirror glass reflection showing outer calm vs inner intensity
      const pw = (W - 10) / 2;
      let out = rectPanel(uid, 0, M, M, pw, H,
        `<rect x="${M}" y="${M}" width="${pw}" height="${H}" fill="${PANEL_WARM}" />` +
        mangaBust(M + pw * 0.56, M + H * 0.56, 1.9, { facing: 1, mood: 'calm', hair: 'bob', shirtColor: '#FFFFFF' })
      );
      out += rectPanel(uid, 1, M + pw + 10, M, pw, H,
        `<rect x="${M + pw + 10}" y="${M}" width="${pw}" height="${H}" fill="${PANEL_SLATE}" />` +
        `<rect x="${M + pw + 10}" y="${M}" width="${pw}" height="${H}" fill="url(#hatch-${uid})" />` +
        // Diagonal mirror sheen
        `<path d="M ${M + pw + 35} ${M + 40} L ${M + W - 20} ${M + 260} L ${M + W - 20} ${M + 330} L ${M + pw + 35} ${M + 110} Z" fill="#FFFFFF" opacity="0.45" />` +
        mangaBust(M + pw + 10 + pw * 0.44, M + H * 0.56, 1.9, { facing: -1, mood: 'shock', hair: 'bob', shirtColor: SEAL })
      );
      // Mirror center divider line
      out += `<line x1="${M + pw + 5}" y1="${M - 10}" x2="${M + pw + 5}" y2="${M + H + 10}" stroke="${INK}" stroke-width="6" />`;
      out += stepBadge(M + 32, M + 32, 1, 32, true);
      out += stepBadge(M + W - 32, M + 32, 2, 32);
      return out;
    }

    case 'SB-063': {
      // 窗口式分镜: Architectural multi-pane window frame where each glass pane is a panel
      let out = `<rect x="${M - 8}" y="${M - 8}" width="${W + 16}" height="${H + 16}" rx="6" fill="#46433D" stroke="${INK}" stroke-width="4" />`;
      const paneW = (W - 28 * 3) / 2, paneH = (H - 28 * 4) / 3;
      const tints = [PANEL_SLATE, PANEL_WARM, PANEL_BLUSH, PANEL_SAGE, PANEL_WHITE, PANEL_WARM];
      for (let i = 0; i < 6; i++) {
        const x = M + 28 + (i % 2) * (paneW + 28);
        const y = M + 28 + Math.floor(i / 2) * (paneH + 28);
        out += rectPanel(uid, i, x, y, paneW, paneH,
          `<rect x="${x}" y="${y}" width="${paneW}" height="${paneH}" fill="${tints[i]}" />` +
          mangaBust(x + paneW / 2, y + paneH * 0.72, 0.92, { facing: i % 2 === 0 ? 1 : -1, mood: ['calm', 'happy', 'deadpan', 'shock', 'calm', 'happy'][i], hair: i % 2 ? 'bob' : 'short' }) +
          `<path d="M ${x + 14} ${y + 38} L ${x + 48} ${y + 10}" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round" opacity="0.55" />`,
          { stroke: INK, strokeWidth: 3 }
        );
        out += stepBadge(x + 24, y + 24, i + 1, 26);
      }
      // Window sill at bottom
      out += `<rect x="${M - 22}" y="${M + H + 4}" width="${W + 44}" height="18" rx="3" fill="${INK}" />`;
      return out;
    }

    case 'SB-064': {
      // 物件遮挡式: Foreground architectural pillars / tree trunks dividing the scene into 3 zones
      let out = rectPanel(uid, 0, M, M, W, H,
        scenicSkyline(M, M, W, H, PANEL_WARM) +
        mangaFigure(M + 108, M + H * 0.66, 1.35, 'stand', INK) +
        mangaFigure(M + W * 0.5, M + H * 0.64, 1.4, 'run', INK) +
        mangaFigure(M + W - 108, M + H * 0.66, 1.45, 'leap', SEAL) +
        // Tall dark foreground tree trunks / pillars slicing cleanly across the full height!
        `<path d="M ${M + 195} ${M} L ${M + 236} ${M} L ${M + 248} ${M + H} L ${M + 186} ${M + H} Z" fill="${INK}" />` +
        `<path d="M ${M + 412} ${M} L ${M + 458} ${M} L ${M + 470} ${M + H} L ${M + 402} ${M + H} Z" fill="${INK}" />` +
        // Foliage top silhouette
        `<ellipse cx="${M + 215}" cy="${M + 35}" rx="85" ry="44" fill="${INK}" />` +
        `<ellipse cx="${M + 435}" cy="${M + 30}" rx="92" ry="48" fill="${INK}" />`
      );
      out += stepBadge(M + 40, M + 115, 1, 32);
      out += stepBadge(M + 320, M + 115, 2, 32);
      out += stepBadge(M + 540, M + 115, 3, 32);
      return out;
    }

    case 'SB-065': {
      // 文字主导式: Giant sculptural display typography acting as page skeleton with mini scenes around it
      let out = rectPanel(uid, 0, M, M, W, H,
        `<rect x="${M}" y="${M}" width="${W}" height="${H}" fill="${PANEL_WARM}" />` +
        `<rect x="${M}" y="${M}" width="${W}" height="${H}" fill="url(#dots-${uid})" />` +
        // Giant graphic typography skeleton
        `<text x="${CANVAS_W / 2}" y="${M + 315}" text-anchor="middle" font-family="ui-sans-serif, Arial Black, sans-serif" font-size="228" font-weight="900" fill="${INK}" letter-spacing="-0.05em">POW!</text>` +
        `<text x="${CANVAS_W / 2}" y="${M + 585}" text-anchor="middle" font-family="ui-sans-serif, Arial Black, sans-serif" font-size="210" font-weight="900" fill="${SEAL}" letter-spacing="-0.04em">BAM</text>`
      );
      // Panels nestled into negative spaces around the giant type
      out += rectPanel(uid, 1, M + 28, M + 36, 230, 128, `<rect x="${M + 28}" y="${M + 36}" width="230" height="128" fill="#FFFFFF" />` + mangaEye(M + 143, M + 100, 1.15, 2), { shadow: true });
      out += rectPanel(uid, 2, M + 34, M + 635, 275, 222, `<rect x="${M + 34}" y="${M + 635}" width="275" height="222" fill="${PANEL_SLATE}" />` + mangaFigure(M + 170, M + 750, 1.35, 'leap', INK), { shadow: true });
      out += rectPanel(uid, 3, M + 332, M + 635, 274, 222, `<rect x="${M + 332}" y="${M + 635}" width="274" height="222" fill="#FFFFFF" />` + mangaBust(M + 468, M + 785, 1.05, { mood: 'shock', hair: 'spiky' }), { shadow: true });
      out += stepBadge(M + 52, M + 60, 1, 28);
      out += stepBadge(M + 58, M + 662, 2, 28);
      out += stepBadge(M + 356, M + 662, 3, 28);
      return out;
    }

    case 'SB-066': {
      // 音效主导式: Sweeping giant jagged SFX lightning ribbon cutting across 4 panels
      const pw = (W - G) / 2, ph = (H - G) / 2;
      let out = '';
      for (let i = 0; i < 4; i++) {
        const x = M + (i % 2) * (pw + G), y = M + Math.floor(i / 2) * (ph + G);
        out += rectPanel(uid, i, x, y, pw, ph,
          `<rect x="${x}" y="${y}" width="${pw}" height="${ph}" fill="${[PANEL_WHITE, PANEL_WARM, PANEL_SLATE, PANEL_BLUSH][i]}" />` +
          mangaFigure(x + pw / 2, y + ph * 0.62, 1.35, i === 3 ? 'leap' : 'run', INK)
        );
      }
      // Huge jagged diagonal SFX ribbon slicing straight through ALL 4 panels!
      const sfx = `M ${M - 16} ${M + 150} L ${M + 260} ${M + 310} L ${M + 215} ${M + 390} L ${M + 475} ${M + 545} L ${M + 425} ${M + 625} L ${M + W + 18} ${M + 790} L ${M + 355} ${M + 675} L ${M + 395} ${M + 590} L ${M + 135} ${M + 430} L ${M + 180} ${M + 345} Z`;
      out += `<path d="${sfx}" fill="${SEAL}" stroke="${INK}" stroke-width="4" stroke-linejoin="miter" filter="url(#card-shadow-${uid})" />`;
      out += `<text x="${CANVAS_W / 2}" y="${CANVAS_H / 2 + 24}" text-anchor="middle" transform="rotate(32, ${CANVAS_W / 2}, ${CANVAS_H / 2})" font-family="ui-sans-serif, Arial Black, sans-serif" font-size="82" font-weight="900" fill="#FFFFFF" stroke="${INK}" stroke-width="3">WHOOSH!</text>`;
      return out;
    }

    case 'SB-067': {
      // 色块主导式: Borderless modern risograph color blocks serving as mood panels (ZERO black frames!)
      const h1 = 270, h2 = 300, h3 = H - h1 - h2 - G * 2;
      const wA = W * 0.58, wB = W - wA - G;
      const y2 = M + h1 + G, y3 = y2 + h2 + G;
      let out = '';
      out += rectPanel(uid, 0, M, M, wA, h1, `<rect x="${M}" y="${M}" width="${wA}" height="${h1}" fill="#E6C37A" />` + mangaBust(M + wA * 0.5, M + h1 * 0.72, 1.1, { mood: 'happy', hair: 'bob', shirtColor: '#FFFFFF' }), { stroke: 'none', rx: 6 });
      out += rectPanel(uid, 1, M + wA + G, M, wB, h1, `<rect x="${M + wA + G}" y="${M}" width="${wB}" height="${h1}" fill="#6F8C9B" />` + mangaEye(M + wA + G + wB / 2, M + h1 / 2, 1.15, 1), { stroke: 'none', rx: 6 });
      out += rectPanel(uid, 2, M, y2, wB, h2, `<rect x="${M}" y="${y2}" width="${wB}" height="${h2}" fill="#8AA386" />` + mangaFigure(M + wB / 2, y2 + h2 * 0.56, 1.35, 'run', '#FFFFFF'), { stroke: 'none', rx: 6 });
      out += rectPanel(uid, 3, M + wB + G, y2, wA, h2, `<rect x="${M + wB + G}" y="${y2}" width="${wA}" height="${h2}" fill="#D96B52" />` + mangaFigure(M + wB + G + wA / 2, y2 + h2 * 0.56, 1.65, 'leap', '#FFFFFF'), { stroke: 'none', rx: 6 });
      out += rectPanel(uid, 4, M, y3, W, h3, `<rect x="${M}" y="${y3}" width="${W}" height="${h3}" fill="#2E363B" />` + mangaBust(M + W / 2, y3 + h3 * 0.72, 1.25, { mood: 'calm', hair: 'short', shirtColor: '#E6C37A' }), { stroke: 'none', rx: 6 });
      out += stepBadge(M + 28, M + 28, 1, 30, true);
      out += stepBadge(M + wA + G + 28, M + 28, 2, 30, true);
      out += stepBadge(M + 28, y2 + 28, 3, 30, true);
      out += stepBadge(M + wB + G + 28, y2 + 28, 4, 30, true);
      out += stepBadge(M + 28, y3 + 28, 5, 30);
      return out;
    }

    case 'SB-068': {
      // 几何分割式: Circle + Triangle + Hexagon + Rhombus non-rectangular graphic panels
      let out = '';
      // Circle top-left
      out += circlePanel(uid, 0, M + 155, M + 165, 145, `<rect x="${M}" y="${M}" width="320" height="330" fill="${PANEL_WARM}" />` + mangaBust(M + 155, M + 205, 1.05, { mood: 'happy', hair: 'bob' }));
      // Triangle top-right
      out += polyPanel(uid, 1, `${M + 335},${M + 20} ${M + W},${M + 20} ${M + W},${M + 315}`, `<rect x="${M + 320}" y="${M}" width="330" height="330" fill="${PANEL_SLATE}" />` + mangaEye(M + 515, M + 135, 1.1, 2));
      // Hexagon center
      const hx = CANVAS_W / 2, hy = M + 465, hr = 158;
      const hexPts = Array.from({ length: 6 }, (_, k) => {
        const a = (k * Math.PI) / 3 - Math.PI / 6;
        return `${(hx + Math.cos(a) * hr).toFixed(1)},${(hy + Math.sin(a) * hr).toFixed(1)}`;
      }).join(' ');
      out += polyPanel(uid, 2, hexPts, `<rect x="${hx - 170}" y="${hy - 170}" width="340" height="340" fill="${PANEL_BLUSH}" />` + radialLines(hx, hy, 45, 170, 20, 0.25) + mangaFigure(hx, hy + 8, 1.55, 'leap', SEAL));
      // Slanted parallelogram bottom-left
      out += polyPanel(uid, 3, `${M},${M + 645} ${M + 335},${M + 645} ${M + 265},${M + H} ${M},${M + H}`, `<rect x="${M}" y="${M + 640}" width="350" height="260" fill="${PANEL_SAGE}" />` + mangaBust(M + 145, M + 795, 0.95, { facing: 1, mood: 'calm' }));
      // Slanted parallelogram bottom-right
      out += polyPanel(uid, 4, `${M + 365},${M + 645} ${M + W},${M + 645} ${M + W},${M + H} ${M + 295},${M + H}`, `<rect x="${M + 280}" y="${M + 640}" width="370" height="260" fill="${PANEL_STONE}" />` + mangaBust(M + 485, M + 795, 0.95, { facing: -1, mood: 'deadpan' }));
      out += stepBadge(M + 60, M + 70, 1, 30);
      out += stepBadge(M + W - 44, M + 58, 2, 30);
      out += stepBadge(hx, hy - 120, 3, 32);
      out += stepBadge(M + 34, M + 680, 4, 30);
      out += stepBadge(M + 390, M + 680, 5, 30);
      return out;
    }

    case 'SB-069':
    case 'SB-070':
    case 'SB-071': {
      // 生活漫画分镜: SB-069 (2 rows), SB-071 (3 rows), SB-070 (4 rows)
      // Strict structure: 80% full-bleed top lifestyle illustration + 20% flush bottom caption bar (same paper tone, no side borders)
      const count = id === 'SB-069' ? 2 : id === 'SB-071' ? 3 : 4;
      const gap = count === 4 ? 14 : 20;
      const rowH = (H - gap * (count - 1)) / count;
      let out = '';
      for (let i = 0; i < count; i++) {
        const y = M + i * (rowH + gap);
        const imgH = Math.round(rowH * 0.78);
        const capH = rowH - imgH;
        // Full-bleed image top (no side frame, flush horizontal edges)
        out += rectPanel(uid, i, M, y, W, imgH, lifeScene(M, y, W, imgH, i), { stroke: INK, strokeWidth: 2.2, rx: 0 });
        // Flush bottom 20% caption bar matching background paper
        out += `<rect x="${M}" y="${y + imgH}" width="${W}" height="${capH}" fill="${PAPER}" />`;
        out += `<line x1="${M}" y1="${y + imgH + capH}" x2="${M + W}" y2="${y + imgH + capH}" stroke="${INK}" stroke-width="1.2" opacity="0.22" />`;
        // Clean centered caption line bars representing narrative text
        const cy = y + imgH + capH * 0.52;
        out += `<rect x="${CANVAS_W / 2 - 175}" y="${cy - 4}" width="350" height="8" rx="4" fill="${INK}" opacity="0.65" />`;
        if (capH >= 48) {
          out += `<rect x="${CANVAS_W / 2 - 110}" y="${cy + 12}" width="220" height="6" rx="3" fill="${INK}" opacity="0.32" />`;
        }
        out += stepBadge(M + 26, y + 26, i + 1, count === 4 ? 26 : 30);
      }
      return out;
    }

    default:
      throw new Error(`Unhandled layout id: ${id}`);
  }
}

export function buildComicStoryboardSvg(layout) {
  const uid = layout.id.replace(/[^a-zA-Z0-9]/g, '');
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CANVAS_W} ${CANVAS_H}" width="${CANVAS_W}" height="${CANVAS_H}">
  ${defsBlock(uid)}
  ${pageFrame(uid)}
  ${renderBoardContent(layout.id, uid)}
</svg>`;
}
