import assert from 'node:assert/strict';
import test from 'node:test';
import {
  extractPaletteFromRgb,
  getVerifiedPalette,
  perceptualRgbDistance,
} from './paletteExtractor';

function makeSolidRgb(
  segments: Array<{ rgb: [number, number, number]; pixels: number }>
): Uint8Array {
  const total = segments.reduce((sum, s) => sum + s.pixels, 0);
  const out = new Uint8Array(total * 3);
  let offset = 0;
  for (const seg of segments) {
    for (let i = 0; i < seg.pixels; i++) {
      out[offset++] = seg.rgb[0];
      out[offset++] = seg.rgb[1];
      out[offset++] = seg.rgb[2];
    }
  }
  return out;
}

test('extractPaletteFromRgb recovers true 3-color palette matching artwork pixels', () => {
  const buf = makeSolidRgb([
    { rgb: [246, 242, 232], pixels: 600 }, // warm paper
    { rgb: [32, 42, 38], pixels: 250 }, // deep charcoal ink
    { rgb: [212, 84, 58], pixels: 150 }, // vermilion accent
  ]);
  const palette = extractPaletteFromRgb(buf, 3);
  assert.equal(palette.length, 3);
  assert.equal(palette[0], '#202A26');
  assert.equal(palette[1], '#D4543A');
  assert.equal(palette[2], '#F6F2E8');
});

test('extractPaletteFromRgb does not fabricate fake colors for strict 2-tone monochrome artwork', () => {
  const buf = makeSolidRgb([
    { rgb: [250, 249, 245], pixels: 800 },
    { rgb: [24, 24, 24], pixels: 200 },
  ]);
  const palette = extractPaletteFromRgb(buf, 3);
  assert.equal(palette.length, 2);
  assert.equal(palette[0], '#181818');
  assert.equal(palette[1], '#FAF9F5');
});

test('getVerifiedPalette filters invalid entries and deduplicates hex strings', () => {
  assert.deepEqual(getVerifiedPalette([]), []);
  assert.deepEqual(getVerifiedPalette(undefined), []);
  assert.deepEqual(getVerifiedPalette(['#abc', 'not-a-color', '#1f513b', '#1F513B', '#d97757']), [
    '#1F513B',
    '#D97757',
  ]);
  assert.ok(perceptualRgbDistance({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 }) > 500);
});
