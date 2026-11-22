import { useEffect, useState } from 'react';
import type { ColorPaletteItem, LayoutItem, StyleItem } from '../types';

const FALLBACK_BITMAP = '/src/assets/images/style_watercolor_storybook_1795328903873.jpg';

export function StyleArtwork({
  style,
  className = 'h-36 w-full',
  fit = 'cover',
}: {
  style: StyleItem;
  className?: string;
  fit?: 'cover' | 'contain';
}) {
  const [src, setSrc] = useState(style.image);
  const [exhausted, setExhausted] = useState(false);

  useEffect(() => {
    setSrc(style.image);
    setExhausted(false);
  }, [style.image]);

  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden bg-[#f6f5ef] ${className}`}
    >
      {!exhausted ? (
        <img
          src={src}
          alt={`${style.title}风格示例`}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => {
            if (src !== FALLBACK_BITMAP) {
              setSrc(FALLBACK_BITMAP);
            } else {
              setExhausted(true);
            }
          }}
          className={
            fit === 'contain'
              ? 'max-h-full max-w-full h-auto w-auto object-contain'
              : 'h-full w-full object-cover'
          }
        />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center p-3 text-center text-xs text-[var(--muted)]"
          style={{ backgroundColor: style.palettePreview[2] }}
        >
          {style.title}
        </div>
      )}
    </div>
  );
}

export function LayoutSchematic({
  layout,
  className = 'h-36 w-full',
  fit = 'cover',
}: {
  layout: LayoutItem;
  className?: string;
  fit?: 'cover' | 'contain';
}) {
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [layout.image]);

  if (layout.image && !imgFailed) {
    return (
      <div
        className={`relative flex items-center justify-center overflow-hidden bg-[#f4f6f0] ${className}`}
        aria-label={`${layout.title}版式预览图`}
      >
        <img
          src={layout.image}
          alt={`${layout.title}版式示例`}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
          className={
            fit === 'contain'
              ? 'max-h-full max-w-full h-auto w-auto object-contain'
              : 'h-full w-full object-cover'
          }
        />
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-center bg-[#f4f6f0] p-3 ${className}`}
      aria-label={`${layout.title}版式结构示意`}
    >
      <div className="flex h-full w-full flex-col items-center justify-center rounded-lg border border-[#d9e0d6] bg-white p-2 text-center">
        <span className="font-tabular text-[11px] font-semibold text-[var(--green)]">{layout.id}</span>
        <span className="mt-1 line-clamp-2 text-[10px] text-[var(--muted)]">{layout.title}</span>
      </div>
    </div>
  );
}

export function ColorCardPreview({
  color,
  className = 'h-32 w-full',
}: {
  color: ColorPaletteItem;
  className?: string;
}) {
  return (
    <div
      className={`relative flex flex-col justify-between overflow-hidden rounded-lg p-3 ${className}`}
      style={{ backgroundColor: color.paperHex }}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className="h-12 w-12 shrink-0 rounded-lg border border-black/10"
          style={{ backgroundColor: color.hex }}
        />
        <div className="flex flex-col items-end gap-1">
          <span
            className="h-5 w-10 rounded border border-black/10"
            style={{ backgroundColor: color.secondaryHex }}
          />
          <span className="font-tabular text-[11px] text-[#55665e]">{color.hex}</span>
        </div>
      </div>
      <div className="flex items-center gap-1.5 pt-2">
        <span className="h-2.5 flex-1 rounded-full" style={{ backgroundColor: color.hex }} />
        <span className="h-2.5 w-8 rounded-full" style={{ backgroundColor: color.secondaryHex }} />
      </div>
    </div>
  );
}
