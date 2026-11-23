import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Clock, Heart, Search, X } from 'lucide-react';
import {
  COLOR_GROUPS,
  COLOR_PALETTES,
  LAYOUTS,
  PURPOSES,
  STYLE_CATEGORY_TAG_LABELS,
  STYLES,
  UNIFIED_STYLE_TAGS,
} from '../data/catalog';
import { getVerifiedPalette } from '../utils/paletteExtractor';
import { filterStyles, getLayoutsForKind } from '../utils/promptEngine';
import { ColorCardPreview, LayoutSchematic, StyleArtwork } from './CatalogArtwork';
import type {
  ColorGroup,
  ColorPaletteItem,
  LayoutItem,
  PurposeKind,
  StyleItem,
} from '../types';

export type PickerSlot = 'layout' | 'style' | 'color';

interface VisualPickerModalProps {
  slot: PickerSlot | null;
  kind: PurposeKind;
  styles: StyleItem[];
  selectedId: string;
  selectedAccentIds: string[];
  favoriteStyleIds: string[];
  recentStyleIds: string[];
  onToggleFavoriteStyle: (styleId: string) => void;
  onSelect: (slot: PickerSlot, id: string) => void;
  onApplyColorHarmony: (primaryId: string, accentIds: string[]) => void;
  onClose: () => void;
}

const PAGE_SIZE = 12;

type StyleViewTab = 'recommended' | 'all' | 'favorites' | 'recent';

export function VisualPickerModal({
  slot,
  kind,
  styles,
  selectedId,
  selectedAccentIds,
  favoriteStyleIds,
  recentStyleIds,
  onToggleFavoriteStyle,
  onSelect,
  onApplyColorHarmony,
  onClose,
}: VisualPickerModalProps) {
  const [query, setQuery] = useState('');
  const [styleTab, setStyleTab] = useState<StyleViewTab>('recommended');
  const [styleTagId, setStyleTagId] = useState<string>('all');
  const [colorGroup, setColorGroup] = useState<ColorGroup | 'all'>('all');
  const [colorEditMode, setColorEditMode] = useState<'primary' | 'accent'>('primary');
  const [draftPrimaryColorId, setDraftPrimaryColorId] = useState<string>('');
  const [draftAccentColorIds, setDraftAccentColorIds] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const [detailIndex, setDetailIndex] = useState<number | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const activeStyles = styles.length > 0 ? styles : STYLES;
  const currentPurpose = PURPOSES.find((p) => p.id === kind) ?? PURPOSES[0];
  const activeTag =
    UNIFIED_STYLE_TAGS.find((t) => t.id === styleTagId) ?? UNIFIED_STYLE_TAGS[0];

  useEffect(() => {
    if (!slot) return;
    setQuery('');
    setStyleTab('recommended');
    setStyleTagId('all');
    setColorGroup('all');
    setColorEditMode('primary');
    setDraftPrimaryColorId(slot === 'color' ? selectedId : '');
    setDraftAccentColorIds(slot === 'color' ? [...selectedAccentIds] : []);
    setPage(0);
    setDetailIndex(null);
    const frame = window.requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [slot, selectedId, selectedAccentIds]);

  const sceneMatchedCount = useMemo(
    () => activeStyles.filter((s) => s.recommendedKinds.includes(kind)).length,
    [activeStyles, kind]
  );

  const recentStyles = useMemo(
    () =>
      recentStyleIds
        .map((id) => activeStyles.find((s) => s.id === id))
        .filter((s): s is StyleItem => Boolean(s)),
    [recentStyleIds, activeStyles]
  );

  const items = useMemo<Array<LayoutItem | StyleItem | ColorPaletteItem>>(() => {
    if (slot === 'layout') {
      const base = getLayoutsForKind(kind, LAYOUTS);
      const q = query.trim().toLowerCase();
      if (!q) return base;
      return base.filter((item) =>
        `${item.id} ${item.title} ${item.description} ${item.promptStructureCn}`
          .toLowerCase()
          .includes(q)
      );
    }
    if (slot === 'style') {
      if (styleTab === 'recent') {
        const q = query.trim().toLowerCase();
        if (!q) return recentStyles;
        return recentStyles.filter((s) =>
          `${s.id} ${s.title} ${s.englishName} ${s.description}`.toLowerCase().includes(q)
        );
      }
      const base = filterStyles(activeStyles, {
        category: activeTag.featuredOnly ? 'featured' : 'all',
        sceneKind: styleTab === 'recommended' ? kind : 'all',
        query,
        favoritesOnly: styleTab === 'favorites',
        favoriteIds: favoriteStyleIds,
      });
      if (activeTag.categories) {
        return base.filter((s) => activeTag.categories!.includes(s.category));
      }
      return base;
    }
    if (slot === 'color') {
      const q = query.trim().toLowerCase();
      return COLOR_PALETTES.filter((c) => {
        if (colorGroup !== 'all' && c.group !== colorGroup) return false;
        if (!q) return true;
        return `${c.id} ${c.name} ${c.englishName} ${c.mood} ${c.hex}`.toLowerCase().includes(q);
      });
    }
    return [];
  }, [
    slot,
    kind,
    activeStyles,
    query,
    styleTab,
    activeTag,
    favoriteStyleIds,
    recentStyles,
    colorGroup,
  ]);

  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const visibleItems = items.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  useEffect(() => {
    if (!slot) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (detailIndex !== null) {
          setDetailIndex(null);
        } else {
          onClose();
        }
      } else if (detailIndex !== null && e.key === 'ArrowLeft') {
        e.preventDefault();
        setDetailIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : prev));
      } else if (detailIndex !== null && e.key === 'ArrowRight') {
        e.preventDefault();
        setDetailIndex((prev) =>
          prev !== null && prev < items.length - 1 ? prev + 1 : prev
        );
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [slot, detailIndex, items.length, onClose]);

  if (!slot) return null;

  const modalTitle =
    slot === 'layout'
      ? `选择版式 · ${currentPurpose.label}`
      : slot === 'style'
      ? `选择画风 · ${currentPurpose.label}`
      : '色彩搭配台（主色 + 点缀色）';

  const detailItem = detailIndex !== null ? items[detailIndex] : null;
  const draftPrimaryColor = draftPrimaryColorId
    ? COLOR_PALETTES.find((c) => c.id === draftPrimaryColorId) ?? null
    : null;
  const draftAccentColors = draftAccentColorIds
    .map((id) => COLOR_PALETTES.find((c) => c.id === id))
    .filter((c): c is ColorPaletteItem => Boolean(c));

  const toggleDraftAccent = (colorId: string) => {
    setDraftAccentColorIds((prev) => {
      if (prev.includes(colorId)) {
        return prev.filter((id) => id !== colorId);
      }
      if (prev.length >= 2) {
        return [prev[1], colorId];
      }
      return [...prev, colorId];
    });
  };

  const handleColorCardPick = (colorId: string) => {
    if (colorEditMode === 'primary') {
      setDraftPrimaryColorId((prev) => (prev === colorId ? '' : colorId));
    } else {
      toggleDraftAccent(colorId);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="visual-picker-heading"
      className="fixed inset-0 z-40 flex items-center justify-center bg-[#171716]/55 p-3 backdrop-blur-xs sm:p-4"
      onClick={onClose}
    >
      <div
        className="animate-modal-in flex max-h-[90dvh] w-full max-w-5xl flex-col overflow-hidden rounded-[6px] border border-[var(--border)] bg-[var(--paper)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Fixed Header */}
        <div className="shrink-0 border-b border-[var(--border)] px-5 pb-4 pt-5 sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h2
                id="visual-picker-heading"
                className="font-editorial truncate text-lg font-bold text-[var(--ink)]"
              >
                {modalTitle}
              </h2>
              <p className="mt-0.5 text-xs text-[var(--muted)]">
                {slot === 'style'
                  ? `已按「${currentPurpose.label}」智能筛选推荐画风，可随时切换全库、收藏或最近使用`
                  : slot === 'layout'
                  ? `当前场景提供 ${getLayoutsForKind(kind, LAYOUTS).length} 套真实位图版式预览`
                  : '同一界面内完成主色与最多 2 种点缀色搭配，实时查看 70 / 20 / 10 色彩和谐比例'}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {slot !== 'color' && selectedId && (
                <button
                  type="button"
                  onClick={() => {
                    onSelect(slot, '');
                    onClose();
                  }}
                  className="cursor-pointer whitespace-nowrap rounded-[4px] border border-dashed border-[#c7c0b3] bg-[var(--bg)] px-3 py-1.5 text-xs font-medium text-[var(--ink-soft)] transition-colors hover:border-[var(--seal)] hover:text-[var(--seal)]"
                >
                  {slot === 'layout' ? '不限定版式' : '不限定画风'}
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                aria-label="关闭素材选择"
                className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-[4px] border border-[var(--border)] text-[var(--ink)] transition-colors hover:border-[var(--ink)] hover:bg-[var(--surface-alt)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Unified Color Harmony Studio Bar */}
          {slot === 'color' && (
            <div className="mt-3.5 rounded-[4px] border border-[var(--border)] bg-[var(--bg)] p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div
                  role="tablist"
                  aria-label="选择主色或点缀色"
                  className="inline-flex rounded-[4px] border border-[var(--border)] bg-[var(--paper)] p-0.5"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={colorEditMode === 'primary'}
                    onClick={() => setColorEditMode('primary')}
                    className={`cursor-pointer whitespace-nowrap rounded-[3px] px-3 py-1.5 text-xs font-semibold transition-colors ${
                      colorEditMode === 'primary'
                        ? 'bg-[var(--ink)] text-[#fbf9f4]'
                        : 'text-[var(--muted)] hover:text-[var(--ink)]'
                    }`}
                  >
                    1. 选主色{draftPrimaryColor ? `（${draftPrimaryColor.name}）` : '（跟随画风）'}
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={colorEditMode === 'accent'}
                    onClick={() => setColorEditMode('accent')}
                    className={`cursor-pointer whitespace-nowrap rounded-[3px] px-3 py-1.5 text-xs font-semibold transition-colors ${
                      colorEditMode === 'accent'
                        ? 'bg-[var(--ink)] text-[#fbf9f4]'
                        : 'text-[var(--muted)] hover:text-[var(--ink)]'
                    }`}
                  >
                    2. 选点缀色（{draftAccentColorIds.length}/2）
                  </button>
                </div>

                {(draftPrimaryColorId || draftAccentColorIds.length > 0) && (
                  <button
                    type="button"
                    onClick={() => {
                      setDraftPrimaryColorId('');
                      setDraftAccentColorIds([]);
                    }}
                    className="cursor-pointer whitespace-nowrap text-xs font-medium text-[var(--muted)] hover:text-[var(--seal)]"
                  >
                    清空全部配色
                  </button>
                )}
              </div>

              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                <div
                  className="flex h-7 flex-1 overflow-hidden rounded-[3px] border border-black/10 bg-white"
                  aria-label="配色占比实时预览条"
                >
                  <div
                    className="flex items-center justify-center text-[10px] font-medium transition-colors"
                    style={{
                      width: '68%',
                      backgroundColor: draftPrimaryColor?.hex ?? '#F4F1EA',
                      color: draftPrimaryColor ? '#ffffff' : '#686762',
                    }}
                  >
                    <span className="truncate px-2 drop-shadow-2xs">
                      {draftPrimaryColor
                        ? `主色 70% · ${draftPrimaryColor.name}`
                        : '主色 70% · 跟随画风原色'}
                    </span>
                  </div>
                  <div
                    className="flex items-center justify-center text-[10px]"
                    style={{
                      width: '20%',
                      backgroundColor: draftPrimaryColor?.secondaryHex ?? '#E5E0D5',
                    }}
                    title="辅色过渡 20%"
                  />
                  {draftAccentColors.length > 0 ? (
                    draftAccentColors.map((ac) => (
                      <div
                        key={ac.id}
                        style={{
                          width: `${12 / draftAccentColors.length}%`,
                          backgroundColor: ac.hex,
                        }}
                        title={`点缀色 · ${ac.name}`}
                      />
                    ))
                  ) : (
                    <div
                      className="flex items-center justify-center bg-[#fbf9f4] text-[9px] text-[var(--muted)]"
                      style={{ width: '12%' }}
                    >
                      点缀
                    </div>
                  )}
                </div>

                {draftAccentColors.length > 0 && (
                  <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                    {draftAccentColors.map((ac) => (
                      <button
                        key={ac.id}
                        type="button"
                        onClick={() => toggleDraftAccent(ac.id)}
                        className="inline-flex cursor-pointer items-center gap-1 rounded-[3px] border border-[var(--border)] bg-white px-2 py-1 text-[11px] text-[var(--ink)] hover:border-[var(--seal)]"
                        title={`移除点缀色 ${ac.name}`}
                      >
                        <span
                          className="h-2.5 w-2.5 rounded-full border border-black/15"
                          style={{ backgroundColor: ac.hex }}
                        />
                        <span>{ac.name}</span>
                        <X className="h-2.5 w-2.5 text-[var(--muted)]" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Search Bar + Style Segment Control */}
          <div className="mt-3.5 flex flex-col gap-2.5 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]"
                aria-hidden="true"
              />
              <input
                ref={searchInputRef}
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(0);
                }}
                aria-label="搜索视觉选项"
                placeholder={
                  slot === 'style'
                    ? '搜索编号（FA-001 / GS-risograph）、画风名、笔触或流派…'
                    : slot === 'color'
                    ? '搜索编号（C-01）、色名、英文或 HEX 色值…'
                    : '搜索版式编号（SC-001 / IG-002 / SB-001）或构图关键词…'
                }
                className="w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] py-2 pl-9 pr-4 text-sm text-[var(--ink)] placeholder:text-[#9b9991]"
              />
            </div>

            {slot === 'style' && (
              <div
                role="tablist"
                aria-label="画风筛选视图"
                className="inline-flex shrink-0 flex-wrap gap-1 rounded-[4px] border border-[var(--border)] bg-[var(--bg)] p-0.5"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={styleTab === 'recommended'}
                  onClick={() => {
                    setStyleTab('recommended');
                    setPage(0);
                  }}
                  className={`cursor-pointer whitespace-nowrap rounded-[3px] px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                    styleTab === 'recommended'
                      ? 'bg-[var(--ink)] text-[#fbf9f4]'
                      : 'text-[var(--ink-soft)] hover:text-[var(--ink)]'
                  }`}
                >
                  场景推荐 ({sceneMatchedCount})
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={styleTab === 'all'}
                  onClick={() => {
                    setStyleTab('all');
                    setPage(0);
                  }}
                  className={`cursor-pointer whitespace-nowrap rounded-[3px] px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                    styleTab === 'all'
                      ? 'bg-[var(--ink)] text-[#fbf9f4]'
                      : 'text-[var(--ink-soft)] hover:text-[var(--ink)]'
                  }`}
                >
                  全库 ({activeStyles.length})
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={styleTab === 'favorites'}
                  onClick={() => {
                    setStyleTab('favorites');
                    setPage(0);
                  }}
                  className={`inline-flex cursor-pointer items-center gap-1 whitespace-nowrap rounded-[3px] px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                    styleTab === 'favorites'
                      ? 'bg-[var(--ink)] text-[#fbf9f4]'
                      : 'text-[var(--ink-soft)] hover:text-[var(--ink)]'
                  }`}
                >
                  <Heart className="h-3 w-3" aria-hidden="true" />
                  <span>收藏 ({favoriteStyleIds.length})</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={styleTab === 'recent'}
                  onClick={() => {
                    setStyleTab('recent');
                    setPage(0);
                  }}
                  className={`inline-flex cursor-pointer items-center gap-1 whitespace-nowrap rounded-[3px] px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                    styleTab === 'recent'
                      ? 'bg-[var(--ink)] text-[#fbf9f4]'
                      : 'text-[var(--ink-soft)] hover:text-[var(--ink)]'
                  }`}
                >
                  <Clock className="h-3 w-3" aria-hidden="true" />
                  <span>最近 ({recentStyles.length})</span>
                </button>
              </div>
            )}
          </div>

          {/* Unified Style Tags Row */}
          {slot === 'style' && styleTab !== 'recent' && (
            <div className="mt-3 flex flex-wrap items-center gap-1">
              {UNIFIED_STYLE_TAGS.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => {
                    setStyleTagId(tag.id);
                    setPage(0);
                  }}
                  className={`cursor-pointer whitespace-nowrap rounded-[3px] px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    styleTagId === tag.id
                      ? 'bg-[var(--accent-soft)] text-[var(--seal)] font-semibold'
                      : 'text-[var(--muted)] hover:bg-[var(--light)] hover:text-[var(--ink)]'
                  }`}
                >
                  {tag.label}
                </button>
              ))}
            </div>
          )}

          {/* Color Group Tabs */}
          {slot === 'color' && (
            <div className="mt-3 flex flex-wrap items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  setColorGroup('all');
                  setPage(0);
                }}
                className={`cursor-pointer whitespace-nowrap rounded-[3px] px-3 py-1.5 text-xs font-medium transition-colors ${
                  colorGroup === 'all'
                    ? 'bg-[var(--ink)] text-[#fbf9f4]'
                    : 'bg-[var(--bg)] text-[var(--ink-soft)] hover:bg-[var(--light)]'
                }`}
              >
                全部色系 (36)
              </button>
              {COLOR_GROUPS.map((grp) => (
                <button
                  key={grp.id}
                  type="button"
                  onClick={() => {
                    setColorGroup(grp.id);
                    setPage(0);
                  }}
                  className={`cursor-pointer whitespace-nowrap rounded-[3px] px-3 py-1.5 text-xs font-medium transition-colors ${
                    colorGroup === grp.id
                      ? 'bg-[var(--ink)] text-[#fbf9f4]'
                      : 'bg-[var(--bg)] text-[var(--ink-soft)] hover:bg-[var(--light)]'
                  }`}
                >
                  {grp.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Scrollable Grid Region */}
        <div className="subtle-scroll min-h-0 flex-1 overflow-y-auto bg-[var(--bg)] px-5 py-4 sm:px-6">
          {visibleItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-sm font-medium text-[var(--ink)]">没有找到匹配的视觉选项</p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                可切换至「全库」或清空搜索词查看全部内容
              </p>
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setStyleTab('all');
                  setStyleTagId('all');
                  setColorGroup('all');
                }}
                className="mt-4 cursor-pointer rounded-[4px] border border-[var(--ink)] px-4 py-2 text-xs font-medium text-[var(--ink)] hover:bg-[var(--ink)] hover:text-[#fbf9f4]"
              >
                显示全库全部样式
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-4">
              {visibleItems.map((item, idx) => {
                const globalIndex = safePage * PAGE_SIZE + idx;
                const isSelectedPrimary =
                  slot === 'color' ? item.id === draftPrimaryColorId : item.id === selectedId;
                const isSelectedAccent =
                  slot === 'color' && draftAccentColorIds.includes(item.id);
                const isHighlighted = isSelectedPrimary || isSelectedAccent;
                const title = 'name' in item ? item.name : item.title;
                const isFavStyle = slot === 'style' && favoriteStyleIds.includes(item.id);
                const isSceneRecommended =
                  slot === 'style' &&
                  'recommendedKinds' in item &&
                  item.recommendedKinds.includes(kind);
                const verifiedStyleDots =
                  slot === 'style' && 'palettePreview' in item
                    ? getVerifiedPalette(item.palettePreview)
                    : [];

                return (
                  <div
                    key={item.id}
                    className={`group relative flex flex-col overflow-hidden rounded-[4px] border bg-[var(--paper)] transition-colors ${
                      isHighlighted
                        ? 'border-[var(--seal)] ring-1 ring-[var(--seal)]'
                        : 'border-[var(--border)] hover:border-[#b9b2a4]'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        slot === 'color'
                          ? handleColorCardPick(item.id)
                          : setDetailIndex(globalIndex)
                      }
                      className="flex flex-1 cursor-pointer flex-col text-left"
                      aria-label={
                        slot === 'color'
                          ? `${colorEditMode === 'primary' ? '设为主色' : '切换点缀色'} ${title}`
                          : `预览 ${title}`
                      }
                    >
                      {slot === 'layout' && (
                        <LayoutSchematic
                          layout={item as LayoutItem}
                          fit="contain"
                          className="h-44 w-full p-1.5"
                        />
                      )}
                      {slot === 'style' && (
                        <div className="p-1.5 pb-0">
                          <StyleArtwork
                            style={item as StyleItem}
                            fit="cover"
                            className="aspect-[4/3] w-full rounded-[2px]"
                          />
                        </div>
                      )}
                      {slot === 'color' && (
                        <div className="p-2 pb-0">
                          <ColorCardPreview color={item as ColorPaletteItem} className="h-28 w-full" />
                        </div>
                      )}
                      <div className="px-3 py-2.5">
                        <div className="flex items-center justify-between gap-1.5">
                          <p
                            title={title}
                            className="truncate text-xs font-semibold text-[var(--ink)] group-hover:text-[var(--seal)]"
                          >
                            {title}
                          </p>
                          <div className="flex shrink-0 items-center gap-1">
                            {slot === 'color' && isSelectedPrimary && (
                              <span className="rounded-[2px] bg-[var(--ink)] px-1.5 py-0.5 text-[10px] font-semibold leading-none text-[#fbf9f4]">
                                主色
                              </span>
                            )}
                            {slot === 'color' && isSelectedAccent && (
                              <span className="rounded-[2px] bg-[var(--seal)] px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
                                点缀
                              </span>
                            )}
                            <span className="font-tabular text-[10px] text-[var(--muted)]">
                              {item.id}
                            </span>
                          </div>
                        </div>
                        <div className="mt-1 flex items-center justify-between gap-2">
                          <p className="truncate text-[11px] text-[var(--muted)]">
                            {'mood' in item
                              ? `${item.englishName} · ${item.hex}`
                              : 'category' in item
                              ? `${STYLE_CATEGORY_TAG_LABELS[item.category] ?? '特色画风'}${
                                  isSceneRecommended ? ' · 场景适配' : ''
                                }`
                              : item.description}
                          </p>
                          {verifiedStyleDots.length > 0 && (
                            <span className="flex shrink-0 items-center gap-0.5">
                              {verifiedStyleDots.map((hex, i) => (
                                <span
                                  key={i}
                                  className="h-2 w-2 rounded-full ring-1 ring-black/15"
                                  style={{ backgroundColor: hex }}
                                />
                              ))}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>

                    {slot === 'style' && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleFavoriteStyle(item.id);
                        }}
                        aria-label={isFavStyle ? `取消收藏 ${title}` : `收藏 ${title}`}
                        className={`absolute right-2.5 top-2.5 flex h-7 w-7 cursor-pointer items-center justify-center rounded-[3px] border bg-white/95 transition-colors ${
                          isFavStyle
                            ? 'border-[var(--seal)]/40 text-[var(--seal)]'
                            : 'border-[var(--border)] text-[var(--muted)] hover:text-[var(--seal)]'
                        }`}
                      >
                        <Heart className={`h-3.5 w-3.5 ${isFavStyle ? 'fill-current' : ''}`} />
                      </button>
                    )}

                    {slot !== 'color' && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelect(slot, item.id);
                          onClose();
                        }}
                        aria-label={`直接选用 ${title}`}
                        className={`absolute right-2.5 top-2.5 inline-flex h-7 cursor-pointer items-center gap-1 rounded-[3px] px-2.5 text-[11px] font-semibold shadow-xs transition-opacity ${
                          slot === 'style' ? 'right-11' : 'right-2.5'
                        } ${
                          isSelectedPrimary
                            ? 'bg-[var(--seal)] text-white opacity-100'
                            : 'bg-[var(--ink)] text-[#fbf9f4] opacity-95 hover:bg-[var(--seal)] sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100'
                        }`}
                      >
                        <Check className="h-3 w-3" aria-hidden="true" />
                        <span>{isSelectedPrimary ? '已选' : '选用'}</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Fixed Footer */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] bg-[var(--paper)] px-5 py-3.5 sm:px-6">
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={safePage <= 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="inline-flex cursor-pointer items-center gap-1 whitespace-nowrap rounded-[4px] border border-[var(--border)] bg-[var(--paper)] px-3 py-2 text-xs font-medium text-[var(--ink)] hover:border-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
              <span>上一批</span>
            </button>

            <span className="font-tabular text-xs text-[var(--muted)]">
              {items.length === 0 ? '0 / 0' : `${safePage + 1} / ${totalPages}`} · 共 {items.length} 项
            </span>

            <button
              type="button"
              disabled={safePage + 1 >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              className="inline-flex cursor-pointer items-center gap-1 whitespace-nowrap rounded-[4px] border border-[var(--border)] bg-[var(--paper)] px-3 py-2 text-xs font-medium text-[var(--ink)] hover:border-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span>下一批</span>
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>

          {slot === 'color' && (
            <button
              type="button"
              onClick={() => {
                onApplyColorHarmony(draftPrimaryColorId, draftAccentColorIds);
                onClose();
              }}
              className="inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-[4px] bg-[var(--ink)] px-5 py-2 text-xs font-semibold text-[#fbf9f4] transition-colors hover:bg-[var(--seal)]"
            >
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
              <span>确认配色搭配</span>
            </button>
          )}
        </div>
      </div>

      {/* Nested Detail Preview Modal */}
      {detailItem && detailIndex !== null && slot !== 'color' && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="detail-preview-heading"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#171716]/60 p-4"
          onClick={(e) => {
            e.stopPropagation();
            setDetailIndex(null);
          }}
        >
          <div
            className="animate-modal-in flex max-h-[92dvh] w-full max-w-4xl flex-col overflow-hidden rounded-[6px] border border-[var(--border)] bg-[var(--paper)] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-[var(--border)] px-6 py-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2
                    id="detail-preview-heading"
                    className="font-editorial truncate text-base font-bold text-[var(--ink)]"
                  >
                    {'name' in detailItem ? detailItem.name : detailItem.title}
                  </h2>
                  {'category' in detailItem && (
                    <span className="text-xs font-medium text-[var(--seal)]">
                      {STYLE_CATEGORY_TAG_LABELS[detailItem.category] ?? '特色画风'}
                    </span>
                  )}
                </div>
                <p className="font-tabular text-xs text-[var(--muted)]">
                  {detailItem.id} · 第 {detailIndex + 1} / {items.length} 项 · 支持键盘 ← / →
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetailIndex(null)}
                aria-label="关闭详情预览"
                className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-[4px] border border-[var(--border)] text-[var(--ink)] hover:border-[var(--ink)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid min-h-0 flex-1 overflow-y-auto md:grid-cols-12 md:overflow-hidden">
              <div className="flex items-center justify-center bg-[var(--surface-alt)] p-4 md:col-span-7 md:border-r md:border-[var(--border)] md:p-6">
                {slot === 'layout' && (
                  <LayoutSchematic
                    layout={detailItem as LayoutItem}
                    fit="contain"
                    className="h-[320px] w-full bg-transparent sm:h-[400px] md:h-[min(64dvh,560px)]"
                  />
                )}
                {slot === 'style' && (
                  <StyleArtwork
                    style={detailItem as StyleItem}
                    fit="contain"
                    className="h-[320px] w-full bg-transparent sm:h-[400px] md:h-[min(64dvh,560px)]"
                  />
                )}
              </div>

              <div className="subtle-scroll p-6 md:col-span-5 md:overflow-y-auto">
                <p className="text-sm leading-relaxed text-[var(--ink-soft)]">
                  {'promptStructureCn' in detailItem
                    ? detailItem.promptStructureCn
                    : 'description' in detailItem
                    ? detailItem.description
                    : ''}
                </p>

                {'visualTraitsCn' in detailItem && (
                  <dl className="mt-4 divide-y divide-[var(--border)]">
                    <div className="py-3">
                      <dt className="text-[11px] font-semibold tracking-wider text-[var(--muted)]">
                        视觉特征
                      </dt>
                      <dd className="mt-1 text-xs leading-relaxed text-[var(--ink-soft)]">
                        {detailItem.visualTraitsCn}
                      </dd>
                    </div>
                    <div className="py-3">
                      <dt className="text-[11px] font-semibold tracking-wider text-[var(--muted)]">
                        适配场景
                      </dt>
                      <dd className="mt-1 text-xs font-medium text-[var(--ink)]">
                        {detailItem.recommendedKinds
                          .map((k) => PURPOSES.find((p) => p.id === k)?.label)
                          .filter(Boolean)
                          .join(' · ')}
                      </dd>
                    </div>
                    <div className="pt-3">
                      <dt className="text-[11px] font-semibold tracking-wider text-[var(--muted)]">
                        Skill 风格规范
                      </dt>
                      <dd className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
                        {detailItem.skillSystemPrompt}
                      </dd>
                    </div>
                  </dl>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-[var(--border)] bg-[var(--bg)] px-6 py-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={detailIndex <= 0}
                  onClick={() => setDetailIndex((i) => (i !== null && i > 0 ? i - 1 : i))}
                  aria-label="上一个样式"
                  className="inline-flex cursor-pointer items-center gap-1 rounded-[4px] border border-[var(--border)] bg-[var(--paper)] px-3 py-2 text-xs font-medium text-[var(--ink)] hover:border-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  <span>上一个</span>
                </button>
                <button
                  type="button"
                  disabled={detailIndex >= items.length - 1}
                  onClick={() =>
                    setDetailIndex((i) =>
                      i !== null && i < items.length - 1 ? i + 1 : i
                    )
                  }
                  aria-label="下一个样式"
                  className="inline-flex cursor-pointer items-center gap-1 rounded-[4px] border border-[var(--border)] bg-[var(--paper)] px-3 py-2 text-xs font-medium text-[var(--ink)] hover:border-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <span>下一个</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  onSelect(slot, detailItem.id);
                  setDetailIndex(null);
                  onClose();
                }}
                className="cursor-pointer whitespace-nowrap rounded-[4px] bg-[var(--ink)] px-5 py-2 text-xs font-semibold text-[#fbf9f4] transition-colors hover:bg-[var(--seal)]"
              >
                选用这个样式
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
