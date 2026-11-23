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
      className={`relative flex items-center justify-center overflow-hidden bg-[#f4f1ea] ${className}`}
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
              ? 'h-auto max-h-full w-auto max-w-full object-contain'
              : 'h-full w-full object-cover'
          }
        />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center p-3 text-center text-xs text-[var(--muted)]"
          style={{ backgroundColor: style.palettePreview?.[2] ?? '#F4F1EA' }}
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
        className={`relative flex items-center justify-center overflow-hidden bg-[#f4f1ea] ${className}`}
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
              ? 'h-auto max-h-full w-auto max-w-full object-contain'
              : 'h-full w-full object-cover'
          }
        />
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-center bg-[#f4f1ea] p-3 ${className}`}
      aria-label={`${layout.title}版式结构示意`}
    >
      <div className="flex h-full w-full flex-col items-center justify-center rounded-[3px] border border-[var(--border)] bg-[var(--paper)] p-2 text-center">
        <span className="font-tabular text-[11px] font-semibold text-[var(--seal)]">
          {layout.id}
        </span>
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
      className={`relative flex flex-col justify-between overflow-hidden rounded-[3px] p-3 ${className}`}
      style={{ backgroundColor: color.paperHex }}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className="h-12 w-12 shrink-0 rounded-[3px] border border-black/10"
          style={{ backgroundColor: color.hex }}
        />
        <div className="flex flex-col items-end gap-1">
          <span
            className="h-5 w-10 rounded-[2px] border border-black/10"
            style={{ backgroundColor: color.secondaryHex }}
          />
          <span className="font-tabular text-[11px] text-[#555550]">{color.hex}</span>
        </div>
      </div>
      <div className="flex items-center gap-1.5 pt-2">
        <span className="h-2 flex-1 rounded-[1px]" style={{ backgroundColor: color.hex }} />
        <span className="h-2 w-8 rounded-[1px]" style={{ backgroundColor: color.secondaryHex }} />
      </div>
    </div>
  );
}
