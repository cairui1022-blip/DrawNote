import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Heart, Search, X } from 'lucide-react';
import {
  COLOR_GROUPS,
  COLOR_PALETTES,
  LAYOUTS,
  PURPOSES,
  STYLE_CATEGORIES,
  STYLE_CATEGORY_TAG_LABELS,
  STYLES,
  UNIFIED_STYLE_TAGS,
} from '../data/catalog';
import { filterStyles, getLayoutsForKind } from '../utils/promptEngine';
import { ColorCardPreview, LayoutSchematic, StyleArtwork } from './CatalogArtwork';
import type {
  ColorGroup,
  ColorPaletteItem,
  LayoutItem,
  PurposeKind,
  StyleCategory,
  StyleItem,
} from '../types';

export type PickerSlot = 'layout' | 'style' | 'color';

interface VisualPickerModalProps {
  slot: PickerSlot | null;
  kind: PurposeKind;
  styles: StyleItem[];
  selectedId: string;
  favoriteStyleIds: string[];
  recentStyleIds: string[];
  onToggleFavoriteStyle: (styleId: string) => void;
  onSelect: (slot: PickerSlot, id: string) => void;
  onClose: () => void;
}

const PAGE_SIZE = 12;

export function VisualPickerModal({
  slot,
  kind,
  styles,
  selectedId,
  favoriteStyleIds,
  recentStyleIds,
  onToggleFavoriteStyle,
  onSelect,
  onClose,
}: VisualPickerModalProps) {
  const [query, setQuery] = useState('');
  const [styleCategory, setStyleCategory] = useState<StyleCategory>('all');
  const [styleTagId, setStyleTagId] = useState<string>('all');
  const [matchCurrentScene, setMatchCurrentScene] = useState(true);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [colorGroup, setColorGroup] = useState<ColorGroup | 'all'>('all');
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
    setStyleCategory('all');
    setStyleTagId('all');
    setMatchCurrentScene(true);
    setFavoritesOnly(false);
    setColorGroup('all');
    setPage(0);
    setDetailIndex(null);
    const frame = window.requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [slot]);

  const sceneMatchedCount = useMemo(
    () => activeStyles.filter((s) => s.recommendedKinds.includes(kind)).length,
    [activeStyles, kind]
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
      const base = filterStyles(activeStyles, {
        category: activeTag.featuredOnly ? 'featured' : styleCategory,
        sceneKind: matchCurrentScene ? kind : 'all',
        query,
        favoritesOnly,
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
    styleCategory,
    activeTag,
    matchCurrentScene,
    favoritesOnly,
    favoriteStyleIds,
    colorGroup,
  ]);

  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const visibleItems = items.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  const recentStyles = useMemo(
    () =>
      recentStyleIds
        .map((id) => activeStyles.find((s) => s.id === id))
        .filter((s): s is StyleItem => Boolean(s)),
    [recentStyleIds, activeStyles]
  );

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
      : '选择主色调（36 标准色）';

  const detailItem = detailIndex !== null ? items[detailIndex] : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="visual-picker-heading"
      className="fixed inset-0 z-40 flex items-center justify-center bg-[#183628]/45 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="flex max-h-[88dvh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Fixed Header */}
        <div className="shrink-0 border-b border-[var(--border)] px-5 pb-4 pt-5 sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2
                id="visual-picker-heading"
                className="text-lg font-semibold text-[var(--ink)]"
              >
                {modalTitle}
              </h2>
              <p className="mt-0.5 text-xs text-[var(--muted)]">
                {slot === 'style'
                  ? `已按「${currentPurpose.label}」智能筛选推荐画风，也可切换浏览全库 ${activeStyles.length} 款`
                  : slot === 'layout'
                  ? `当前场景提供 ${getLayoutsForKind(kind, LAYOUTS).length} 套真实位图版式预览`
                  : '点击卡片查看大图细节，或点击卡片右下按钮直接选用'}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {selectedId && (
                <button
                  type="button"
                  onClick={() => {
                    onSelect(slot, '');
                    onClose();
                  }}
                  className="cursor-pointer whitespace-nowrap rounded-lg border border-dashed border-[#a6bba9] bg-[#f7faf6] px-3 py-1.5 text-xs font-medium text-[var(--green)] transition-colors hover:border-[var(--green)] hover:bg-[#eef5ef]"
                >
                  {slot === 'layout'
                    ? '不限定版式'
                    : slot === 'style'
                    ? '不限定画风'
                    : '跟随画风原色'}
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                aria-label="关闭素材选择"
                className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-[var(--border)] text-[var(--ink)] transition-colors hover:bg-[var(--light)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Search Bar + Category Selector Row */}
          <div className="mt-3.5 flex flex-col gap-2.5 sm:flex-row">
            <div className="relative flex-1">
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]"
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
                className="w-full rounded-xl border border-[var(--border)] bg-[#fafbf8] py-2 pl-10 pr-4 text-sm text-[var(--ink)] placeholder:text-[#96a39b]"
              />
            </div>

            {slot === 'style' && (
              <select
                aria-label="按细分画风流派筛选"
                value={styleCategory}
                onChange={(e) => {
                  setStyleCategory(e.target.value as StyleCategory);
                  setStyleTagId('all');
                  setFavoritesOnly(false);
                  setPage(0);
                }}
                className="rounded-xl border border-[var(--border)] bg-white px-3.5 py-2 text-xs font-medium text-[var(--ink)] sm:w-56"
              >
                {STYLE_CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Style Scene Match + Unified Style Tags + Favorites Filter Row */}
          {slot === 'style' && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                aria-pressed={matchCurrentScene}
                onClick={() => {
                  setMatchCurrentScene((prev) => !prev);
                  setPage(0);
                }}
                className={`cursor-pointer whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  matchCurrentScene
                    ? 'bg-[var(--green)] text-white'
                    : 'border border-[var(--border)] bg-white text-[var(--ink-soft)] hover:bg-[var(--light)]'
                }`}
              >
                {matchCurrentScene
                  ? `✓ 适配「${currentPurpose.label}」(${sceneMatchedCount})`
                  : `仅看适配「${currentPurpose.label}」(${sceneMatchedCount})`}
              </button>

              <span aria-hidden="true" className="mx-0.5 text-[#d4dcd5]">|</span>

              {UNIFIED_STYLE_TAGS.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => {
                    setStyleTagId(tag.id);
                    setStyleCategory('all');
                    setFavoritesOnly(false);
                    setPage(0);
                  }}
                  className={`cursor-pointer whitespace-nowrap rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    styleTagId === tag.id && !favoritesOnly
                      ? 'border-[var(--green)] bg-[#eef5ef] text-[var(--green)] font-semibold'
                      : 'border-[var(--border)] bg-white text-[var(--muted)] hover:text-[var(--ink)]'
                  }`}
                >
                  {tag.label}
                </button>
              ))}

              <button
                type="button"
                onClick={() => {
                  setFavoritesOnly((prev) => !prev);
                  setPage(0);
                }}
                className={`inline-flex cursor-pointer items-center gap-1 whitespace-nowrap rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  favoritesOnly
                    ? 'border-[var(--green)] bg-[var(--green)] text-white'
                    : 'border-[var(--border)] bg-white text-[var(--ink-soft)] hover:bg-[var(--light)]'
                }`}
              >
                <Heart className="h-3 w-3" aria-hidden="true" />
                <span>收藏 ({favoriteStyleIds.length})</span>
              </button>
            </div>
          )}

          {/* Recent Styles Strip */}
          {slot === 'style' && recentStyles.length > 0 && !query && styleCategory === 'all' && styleTagId === 'all' && !favoritesOnly && (
            <div className="mt-2.5 flex items-center gap-2 overflow-x-auto pb-0.5 text-xs">
              <span className="shrink-0 text-[var(--muted)]">最近使用：</span>
              {recentStyles.map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => {
                    onSelect('style', st.id);
                    onClose();
                  }}
                  className="shrink-0 cursor-pointer whitespace-nowrap rounded-md border border-[var(--border)] bg-white px-2.5 py-1 text-[11px] text-[var(--ink)] hover:border-[var(--green)] hover:bg-[var(--light)]"
                >
                  {st.id} · {st.title}
                </button>
              ))}
            </div>
          )}

          {/* Color Group Tabs */}
          {slot === 'color' && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setColorGroup('all');
                  setPage(0);
                }}
                className={`cursor-pointer whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  colorGroup === 'all'
                    ? 'bg-[var(--green)] text-white'
                    : 'bg-[var(--light)] text-[var(--ink-soft)] hover:bg-[#e3ece0]'
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
                  className={`cursor-pointer whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    colorGroup === grp.id
                      ? 'bg-[var(--green)] text-white'
                      : 'bg-[var(--light)] text-[var(--ink-soft)] hover:bg-[#e3ece0]'
                  }`}
                >
                  {grp.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Scrollable Grid Region */}
        <div className="subtle-scroll min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
          {visibleItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-sm font-medium text-[var(--ink)]">没有找到匹配的视觉选项</p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                可关闭「仅看适配当前场景」或重置搜索词查看全库内容
              </p>
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setStyleCategory('all');
                  setStyleTagId('all');
                  setMatchCurrentScene(false);
                  setFavoritesOnly(false);
                  setColorGroup('all');
                }}
                className="mt-4 cursor-pointer rounded-lg border border-[var(--border)] px-4 py-2 text-xs font-medium text-[var(--green)] hover:bg-[var(--light)]"
              >
                显示全库全部样式
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {visibleItems.map((item, idx) => {
                const globalIndex = safePage * PAGE_SIZE + idx;
                const isSelected = item.id === selectedId;
                const title = 'name' in item ? item.name : item.title;
                const isFavStyle = slot === 'style' && favoriteStyleIds.includes(item.id);

                return (
                  <div
                    key={item.id}
                    className={`group relative flex flex-col overflow-hidden rounded-xl border bg-white transition-colors ${
                      isSelected
                        ? 'border-[var(--green)] ring-1 ring-[var(--green)]'
                        : 'border-[var(--border)] hover:border-[#89a993]'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setDetailIndex(globalIndex)}
                      className="flex flex-1 cursor-pointer flex-col text-left"
                      aria-label={`预览 ${title}`}
                    >
                      {slot === 'layout' && (
                        <LayoutSchematic
                          layout={item as LayoutItem}
                          fit="contain"
                          className="h-44 w-full p-1.5"
                        />
                      )}
                      {slot === 'style' && (
                        <StyleArtwork
                          style={item as StyleItem}
                          fit="contain"
                          className="h-44 w-full p-1.5"
                        />
                      )}
                      {slot === 'color' && (
                        <div className="p-2 pb-0">
                          <ColorCardPreview color={item as ColorPaletteItem} className="h-32 w-full" />
                        </div>
                      )}
                      <div className="border-t border-[#f0efe8] px-3 py-2.5">
                        <div className="flex items-center justify-between gap-1.5">
                          <p
                            title={title}
                            className="truncate text-xs font-semibold text-[var(--ink)]"
                          >
                            {title}
                          </p>
                          <span className="shrink-0 font-tabular text-[10px] text-[var(--muted)]">
                            {item.id}
                          </span>
                        </div>
                        <p className="mt-0.5 truncate text-[11px] text-[var(--muted)]">
                          {'mood' in item
                            ? item.englishName
                            : 'category' in item
                            ? `${STYLE_CATEGORY_TAG_LABELS[item.category] ?? '特色画风'} · ${item.englishName}`
                            : item.description}
                        </p>
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
                        className={`absolute right-2 top-2 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border bg-white/95 shadow-xs transition-colors ${
                          isFavStyle
                            ? 'border-[#d66a5c] text-[#c94736]'
                            : 'border-[var(--border)] text-[var(--muted)] hover:text-[#c94736]'
                        }`}
                      >
                        <Heart className={`h-3.5 w-3.5 ${isFavStyle ? 'fill-current' : ''}`} />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelect(slot, item.id);
                        onClose();
                      }}
                      aria-label={`直接选用 ${title}`}
                      className={`absolute right-2 ${
                        slot === 'color' ? 'top-[104px]' : 'top-[142px]'
                      } inline-flex h-7 cursor-pointer items-center gap-1 rounded-full px-2.5 text-[11px] font-semibold shadow-xs transition-opacity ${
                        isSelected
                          ? 'bg-[var(--green)] text-white opacity-100'
                          : 'bg-white/95 text-[var(--green)] opacity-95 hover:bg-[var(--green)] hover:text-white sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100'
                      }`}
                    >
                      <Check className="h-3 w-3" aria-hidden="true" />
                      <span>{isSelected ? '已选' : '选用'}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Fixed Pagination Footer */}
        <div className="flex shrink-0 items-center justify-between gap-4 border-t border-[var(--border)] bg-[#fafbf8] px-5 py-3.5 sm:px-6">
          <button
            type="button"
            disabled={safePage <= 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="inline-flex cursor-pointer items-center gap-1 whitespace-nowrap rounded-lg border border-[var(--border)] bg-white px-3.5 py-2 text-xs font-medium text-[var(--ink)] hover:bg-[var(--light)] disabled:cursor-not-allowed disabled:opacity-45"
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
            className="inline-flex cursor-pointer items-center gap-1 whitespace-nowrap rounded-lg border border-[var(--border)] bg-white px-3.5 py-2 text-xs font-medium text-[var(--ink)] hover:bg-[var(--light)] disabled:cursor-not-allowed disabled:opacity-45"
          >
            <span>下一批</span>
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Nested Detail Preview Modal */}
      {detailItem && detailIndex !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="detail-preview-heading"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#183628]/55 p-4"
          onClick={(e) => {
            e.stopPropagation();
            setDetailIndex(null);
          }}
        >
          <div
            className="flex max-h-[92dvh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-[var(--border)] px-6 py-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2
                    id="detail-preview-heading"
                    className="truncate text-base font-semibold text-[var(--ink)]"
                  >
                    {'name' in detailItem ? detailItem.name : detailItem.title}
                  </h2>
                  {'category' in detailItem && (
                    <span className="rounded bg-[#eef5ef] px-2 py-0.5 text-[11px] font-medium text-[var(--green)]">
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
                className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full border border-[var(--border)] text-[var(--ink)] hover:bg-[var(--light)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid min-h-0 flex-1 overflow-y-auto md:grid-cols-12 md:overflow-hidden">
              {/* Left Full-Size Uncropped Stage */}
              <div className="flex items-center justify-center bg-[#f6f5ef] p-4 md:col-span-7 md:border-r md:border-[var(--border)] md:p-6">
                {slot === 'layout' && (
                  <LayoutSchematic
                    layout={detailItem as LayoutItem}
                    fit="contain"
                    className="h-[340px] w-full rounded-xl bg-transparent sm:h-[420px] md:h-[min(64dvh,560px)]"
                  />
                )}
                {slot === 'style' && (
                  <StyleArtwork
                    style={detailItem as StyleItem}
                    fit="contain"
                    className="h-[340px] w-full rounded-xl bg-transparent sm:h-[420px] md:h-[min(64dvh,560px)]"
                  />
                )}
                {slot === 'color' && (
                  <ColorCardPreview color={detailItem as ColorPaletteItem} className="h-64 w-full" />
                )}
              </div>

              {/* Right Details Panel */}
              <div className="subtle-scroll p-6 md:col-span-5 md:overflow-y-auto">
                <p className="text-sm leading-relaxed text-[var(--ink-soft)]">
                  {'mood' in detailItem
                    ? detailItem.mood
                    : 'promptStructureCn' in detailItem
                    ? detailItem.promptStructureCn
                    : detailItem.description}
                </p>

                {'visualTraitsCn' in detailItem && (
                  <div className="mt-4 space-y-3">
                    <div>
                      <p className="text-[11px] font-semibold tracking-wider text-[var(--muted)]">
                        视觉特征
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-[var(--ink-soft)]">
                        {detailItem.visualTraitsCn}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold tracking-wider text-[var(--muted)]">
                        适配场景
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {detailItem.recommendedKinds.map((k) => {
                          const label = PURPOSES.find((p) => p.id === k)?.label;
                          if (!label) return null;
                          return (
                            <span
                              key={k}
                              className="rounded-md border border-[var(--border)] bg-[#fafbf8] px-2 py-0.5 text-[11px] font-medium text-[var(--ink)]"
                            >
                              {label}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold tracking-wider text-[var(--muted)]">
                        Skill 风格规范
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
                        {detailItem.skillSystemPrompt}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-[var(--border)] bg-[#fafbf8] px-6 py-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={detailIndex <= 0}
                  onClick={() => setDetailIndex((i) => (i !== null && i > 0 ? i - 1 : i))}
                  aria-label="上一个样式"
                  className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-xs font-medium text-[var(--ink)] hover:bg-[var(--light)] disabled:cursor-not-allowed disabled:opacity-45"
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
                  className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-xs font-medium text-[var(--ink)] hover:bg-[var(--light)] disabled:cursor-not-allowed disabled:opacity-45"
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
                className="cursor-pointer whitespace-nowrap rounded-full bg-[var(--green)] px-5 py-2 text-xs font-semibold text-white hover:bg-[var(--green-hover)]"
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
