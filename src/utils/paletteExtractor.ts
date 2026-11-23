export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

export interface PaletteCluster {
  r: number;
  g: number;
  b: number;
  count: number;
  coverage: number;
  chroma: number;
  luminance: number;
}

const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;

/**
 * Redmean perceptual RGB distance (0..~765), much closer to human vision than Euclidean RGB.
 */
export function perceptualRgbDistance(a: RgbColor, b: RgbColor): number {
  const rMean = (a.r + b.r) * 0.5;
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  const weightR = 2 + rMean / 256;
  const weightG = 4;
  const weightB = 2 + (255 - rMean) / 256;
  return Math.sqrt(weightR * dr * dr + weightG * dg * dg + weightB * db * db);
}

export function rgbToHex({ r, g, b }: RgbColor): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return (
    '#' +
    [clamp(r), clamp(g), clamp(b)]
      .map((v) => v.toString(16).padStart(2, '0').toUpperCase())
      .join('')
  );
}

function getChromaAndLuminance({ r, g, b }: RgbColor): { chroma: number; luminance: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const chroma = max - min;
  const luminance = 0.2126 * rn + 0.7152 * gn + 0.0722 * bn;
  return { chroma, luminance };
}

/**
 * Deterministic k-means++ perceptual palette extractor operating on packed RGB24 byte buffers.
 * Returns 1..3 genuine, visually distinct HEX colors sorted from deepest/hero pigment to lightest paper tone.
 * Never fabricates colors that are not present in the source pixels.
 */
export function extractPaletteFromRgb(
  rgbBytes: Uint8Array,
  maxColors = 3
): string[] {
  const pixelCount = Math.floor(rgbBytes.length / 3);
  if (pixelCount <= 0 || maxColors <= 0) return [];

  // Quantize into 5-bit/channel histogram buckets first for speed + deterministic seeding
  const buckets = new Map<number, { rSum: number; gSum: number; bSum: number; count: number }>();
  for (let i = 0; i < pixelCount; i++) {
    const r = rgbBytes[i * 3];
    const g = rgbBytes[i * 3 + 1];
    const b = rgbBytes[i * 3 + 2];
    const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
    const entry = buckets.get(key);
    if (entry) {
      entry.rSum += r;
      entry.gSum += g;
      entry.bSum += b;
      entry.count += 1;
    } else {
      buckets.set(key, { rSum: r, gSum: g, bSum: b, count: 1 });
    }
  }

  const samples: Array<RgbColor & { weight: number }> = [];
  for (const entry of buckets.values()) {
    samples.push({
      r: entry.rSum / entry.count,
      g: entry.gSum / entry.count,
      b: entry.bSum / entry.count,
      weight: entry.count,
    });
  }

  if (samples.length === 0) return [];
  // Sort deterministically by weight descending
  samples.sort((a, b) => b.weight - a.weight || a.r - b.r || a.g - b.g || a.b - b.b);

  const k = Math.min(8, samples.length);
  const centroids: RgbColor[] = [{ r: samples[0].r, g: samples[0].g, b: samples[0].b }];

  // Deterministic farthest-weighted k-means++ seeding
  while (centroids.length < k) {
    let bestIdx = 0;
    let bestScore = -1;
    for (let i = 0; i < samples.length; i++) {
      const s = samples[i];
      let minDist = Infinity;
      for (const c of centroids) {
        const d = perceptualRgbDistance(s, c);
        if (d < minDist) minDist = d;
      }
      const score = minDist * minDist * Math.sqrt(s.weight);
      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }
    centroids.push({ r: samples[bestIdx].r, g: samples[bestIdx].g, b: samples[bestIdx].b });
  }

  // Run 12 weighted k-means iterations
  const assignments = new Int32Array(samples.length);
  for (let iter = 0; iter < 12; iter++) {
    let changed = false;
    for (let i = 0; i < samples.length; i++) {
      const s = samples[i];
      let bestC = 0;
      let bestDist = Infinity;
      for (let c = 0; c < centroids.length; c++) {
        const d = perceptualRgbDistance(s, centroids[c]);
        if (d < bestDist) {
          bestDist = d;
          bestC = c;
        }
      }
      if (assignments[i] !== bestC) {
        assignments[i] = bestC;
        changed = true;
      }
    }

    const sums = centroids.map(() => ({ r: 0, g: 0, b: 0, w: 0 }));
    for (let i = 0; i < samples.length; i++) {
      const idx = assignments[i];
      const s = samples[i];
      sums[idx].r += s.r * s.weight;
      sums[idx].g += s.g * s.weight;
      sums[idx].b += s.b * s.weight;
      sums[idx].w += s.weight;
    }

    for (let c = 0; c < centroids.length; c++) {
      if (sums[c].w > 0) {
        centroids[c] = {
          r: sums[c].r / sums[c].w,
          g: sums[c].g / sums[c].w,
          b: sums[c].b / sums[c].w,
        };
      }
    }
    if (!changed) break;
  }

  // Aggregate final clusters
  const totals = centroids.map(() => ({ r: 0, g: 0, b: 0, count: 0 }));
  for (let i = 0; i < samples.length; i++) {
    const idx = assignments[i];
    const s = samples[i];
    totals[idx].r += s.r * s.weight;
    totals[idx].g += s.g * s.weight;
    totals[idx].b += s.b * s.weight;
    totals[idx].count += s.weight;
  }

  const clusters: PaletteCluster[] = totals
    .filter((t) => t.count > 0)
    .map((t) => {
      const rgb = { r: t.r / t.count, g: t.g / t.count, b: t.b / t.count };
      const { chroma, luminance } = getChromaAndLuminance(rgb);
      return {
        ...rgb,
        count: t.count,
        coverage: t.count / pixelCount,
        chroma,
        luminance,
      };
    })
    .filter((c) => c.coverage >= 0.008)
    .sort((a, b) => b.coverage - a.coverage);

  if (clusters.length === 0) return [];

  const picked: PaletteCluster[] = [];

  // 1) Dominant canvas / primary visual mass
  picked.push(clusters[0]);

  const pickNext = (minDist: number, chromaBoost: number): PaletteCluster | null => {
    let best: PaletteCluster | null = null;
    let bestScore = -1;
    for (const candidate of clusters) {
      if (picked.includes(candidate)) continue;
      const farEnough = picked.every(
        (existing) => perceptualRgbDistance(existing, candidate) >= minDist
      );
      if (!farEnough) continue;
      const score = Math.pow(candidate.coverage, 0.52) * (1 + candidate.chroma * chromaBoost);
      if (score > bestScore) {
        bestScore = score;
        best = candidate;
      }
    }
    return best;
  };

  // 2) Secondary salient color (ink or hero pigment distinct from dominant)
  const second = pickNext(68, 2.4) ?? pickNext(42, 1.6);
  if (second && picked.length < maxColors) {
    picked.push(second);
  }

  // 3) Third distinct tone (accent or contrasting tonal anchor)
  if (picked.length < maxColors) {
    const third = pickNext(62, 2.0) ?? pickNext(36, 1.4);
    if (third) {
      picked.push(third);
    }
  }

  // Order harmoniously: darkest / richest anchor first -> mid/accent -> lightest paper/highlight last
  picked.sort((a, b) => {
    const scoreA = a.luminance - a.chroma * 0.22;
    const scoreB = b.luminance - b.chroma * 0.22;
    return scoreA - scoreB;
  });

  // Deduplicate exact HEX strings
  const hexes: string[] = [];
  for (const c of picked) {
    const hex = rgbToHex(c);
    if (!hexes.includes(hex)) {
      hexes.push(hex);
    }
  }
  return hexes;
}

export function getVerifiedPalette(palette?: string[] | null): string[] {
  if (!Array.isArray(palette)) return [];
  const valid: string[] = [];
  for (const item of palette) {
    if (typeof item === 'string' && HEX_COLOR_REGEX.test(item.trim())) {
      const normalized = item.trim().toUpperCase();
      if (!valid.includes(normalized)) {
        valid.push(normalized);
      }
    }
  }
  return valid.slice(0, 3);
}
