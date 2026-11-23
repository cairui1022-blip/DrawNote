import { LayoutGrid, Palette, Sparkles } from 'lucide-react';
import { getVerifiedPalette } from '../utils/paletteExtractor';
import { LayoutSchematic, StyleArtwork } from './CatalogArtwork';
import type {
  ColorPaletteItem,
  LayoutItem,
  PurposeOption,
  StyleItem,
} from '../types';
import type { PickerSlot } from './VisualPickerModal';

interface RecipeMoodboardProps {
  purpose: PurposeOption;
  ratio: string;
  layout: LayoutItem | null;
  style: StyleItem | null;
  primaryColor: ColorPaletteItem | null;
  accentColors: ColorPaletteItem[];
  compact?: boolean;
  onOpenPicker: (slot: PickerSlot) => void;
}

function getRatioFrameBox(ratio: string): { w: number; h: number } {
  const [rw, rh] = ratio.split(':').map(Number);
  if (!rw || !rh) return { w: 24, h: 32 };
  const maxSide = 34;
  if (rw >= rh) {
    return { w: maxSide, h: Math.max(16, Math.round((maxSide * rh) / rw)) };
  }
  return { w: Math.max(16, Math.round((maxSide * rw) / rh)), h: maxSide };
}

export function RecipeMoodboard({
  purpose,
  ratio,
  layout,
  style,
  primaryColor,
  accentColors,
  compact = false,
  onOpenPicker,
}: RecipeMoodboardProps) {
  const frame = getRatioFrameBox(ratio);
  const verifiedStylePalette = getVerifiedPalette(style?.palettePreview);

  return (
    <div
      aria-label="当前画面配方实时预览"
      className={`rounded-[4px] border border-[var(--border)] bg-[var(--paper)] ${
        compact ? 'p-3' : 'p-4'
      }`}
    >
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] pb-2">
        <div className="flex items-center gap-2 text-xs">
          <span className="font-editorial font-semibold text-[var(--ink)]">实时画面配方</span>
          <span aria-hidden="true" className="text-[#cfc9bc]">
            /
          </span>
          <span className="text-[var(--muted)]">{purpose.label}</span>
          <span aria-hidden="true" className="text-[#cfc9bc]">
            ·
          </span>
          <span className="font-tabular font-semibold text-[var(--seal)]">{ratio}</span>
        </div>
        <span className="text-[11px] text-[var(--muted)]">点击任一样张即可快速调整</span>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {/* 1. Aspect Ratio Visual Frame */}
        <div className="flex items-center gap-2.5 rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 py-2">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[2px] border border-[var(--border)] bg-[var(--paper)]"
            aria-hidden="true"
          >
            <div
              className="border-[1.5px] border-[var(--ink)] bg-[var(--accent-soft)]"
              style={{ width: `${frame.w}px`, height: `${frame.h}px` }}
            />
          </div>
          <div className="min-w-0">
            <span className="block text-[10px] text-[var(--muted)]">目标画幅</span>
            <span className="font-tabular block truncate text-xs font-semibold text-[var(--ink)]">
              {ratio}
            </span>
          </div>
        </div>

        {/* 2. Layout Visual Slot */}
        {purpose.usesLayout ? (
          <button
            type="button"
            onClick={() => onOpenPicker('layout')}
            className="group flex cursor-pointer items-center gap-2.5 rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 py-2 text-left transition-colors hover:border-[var(--ink)] hover:bg-[var(--paper)]"
          >
            {layout ? (
              <LayoutSchematic
                layout={layout}
                fit="contain"
                className="h-10 w-10 shrink-0 rounded-[2px] p-0.5"
              />
            ) : (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[2px] border border-dashed border-[#cfc9bc] bg-[var(--paper)] text-[var(--muted)]">
                <LayoutGrid className="h-4 w-4" aria-hidden="true" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <span className="block text-[10px] text-[var(--muted)]">版式结构</span>
              <span className="block truncate text-xs font-semibold text-[var(--ink)] group-hover:text-[var(--seal)]">
                {layout ? layout.title : '自由留白'}
              </span>
            </div>
          </button>
        ) : (
          <div className="flex items-center gap-2.5 rounded-[4px] border border-dashed border-[#d6d0c3] bg-[var(--bg)] px-2.5 py-2">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[2px] bg-[var(--paper)] text-[var(--muted)]">
              <LayoutGrid className="h-4 w-4" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <span className="block text-[10px] text-[var(--muted)]">版式结构</span>
              <span className="block truncate text-xs font-medium text-[var(--ink-soft)]">
                纯图满幅
              </span>
            </div>
          </div>
        )}

        {/* 3. Style Visual Slot */}
        <button
          type="button"
          onClick={() => onOpenPicker('style')}
          className="group flex cursor-pointer items-center gap-2.5 rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 py-2 text-left transition-colors hover:border-[var(--ink)] hover:bg-[var(--paper)]"
        >
          {style ? (
            <StyleArtwork
              style={style}
              className="h-10 w-10 shrink-0 rounded-[2px]"
            />
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[2px] border border-dashed border-[#cfc9bc] bg-[var(--paper)] text-[var(--muted)]">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <span className="block text-[10px] text-[var(--muted)]">画风材质</span>
            <span className="block truncate text-xs font-semibold text-[var(--ink)] group-hover:text-[var(--seal)]">
              {style ? style.title : '自由发挥'}
            </span>
          </div>
        </button>

        {/* 4. Color Harmony Slot */}
        <button
          type="button"
          onClick={() => onOpenPicker('color')}
          className="group flex cursor-pointer items-center gap-2.5 rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 py-2 text-left transition-colors hover:border-[var(--ink)] hover:bg-[var(--paper)]"
        >
          <div
            className="flex h-10 w-10 shrink-0 flex-col overflow-hidden rounded-[2px] border border-black/10 bg-[var(--paper)]"
            aria-hidden="true"
          >
            {primaryColor ? (
              <>
                <span
                  className="w-full flex-1"
                  style={{ backgroundColor: primaryColor.hex }}
                />
                <div className="flex h-3 w-full">
                  <span
                    className="flex-1"
                    style={{ backgroundColor: primaryColor.secondaryHex }}
                  />
                  {accentColors.map((ac) => (
                    <span
                      key={ac.id}
                      className="flex-1"
                      style={{ backgroundColor: ac.hex }}
                    />
                  ))}
                </div>
              </>
            ) : accentColors.length > 0 ? (
              <div className="flex h-full w-full flex-col">
                <div className="flex flex-1">
                  {verifiedStylePalette.length > 0 ? (
                    verifiedStylePalette.map((hex, i) => (
                      <span key={i} className="flex-1" style={{ backgroundColor: hex }} />
                    ))
                  ) : (
                    <span className="flex-1 bg-[#f4f1ea]" />
                  )}
                </div>
                <div className="flex h-3">
                  {accentColors.map((ac) => (
                    <span key={ac.id} className="flex-1" style={{ backgroundColor: ac.hex }} />
                  ))}
                </div>
              </div>
            ) : verifiedStylePalette.length > 0 ? (
              <div className="flex h-full w-full">
                {verifiedStylePalette.map((hex, i) => (
                  <span key={i} className="flex-1" style={{ backgroundColor: hex }} />
                ))}
              </div>
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[var(--muted)]">
                <Palette className="h-4 w-4" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <span className="block text-[10px] text-[var(--muted)]">色彩配方</span>
            <span className="block truncate text-xs font-semibold text-[var(--ink)] group-hover:text-[var(--seal)]">
              {primaryColor
                ? accentColors.length > 0
                  ? `${primaryColor.name} +${accentColors.length}`
                  : primaryColor.name
                : accentColors.length > 0
                ? `原色 +${accentColors.length} 点缀`
                : '跟随画风'}
            </span>
          </div>
        </button>
      </div>
    </div>
  );
}
