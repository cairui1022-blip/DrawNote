import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Eye,
  Heart,
  Search,
  Shuffle,
  X,
} from 'lucide-react';
import {
  LAYOUTS,
  PURPOSES,
  STYLE_CATEGORY_TAG_LABELS,
  STYLES,
  UNIFIED_STYLE_TAGS,
} from '../data/catalog';
import { getVerifiedPalette } from '../utils/paletteExtractor';
import {
  getLayoutsForKind,
  getPaginationWindow,
  pickRandomInspirationStyle,
  rankStylesForGallery,
} from '../utils/promptEngine';
import { LayoutSchematic, StyleArtwork } from './CatalogArtwork';
import type { PurposeKind, StyleItem } from '../types';

interface LandingViewProps {
  isLoggedIn: boolean;
  styles: StyleItem[];
  favoriteStyleIds: string[];
  onToggleFavoriteStyle: (styleId: string) => void;
  onStartCreation: (preset?: {
    styleId?: string;
    kind?: PurposeKind;
    layoutId?: string;
  }) => void;
}

const GALLERY_PAGE_SIZE = 12;

interface HeroSpecimenSpec {
  plateNo: string;
  preferredStyleId: string;
  localImage: string;
  fallbackTitle: string;
  alt: string;
}

const HERO_SPECIMENS: HeroSpecimenSpec[] = [
  {
    plateNo: '01',
    preferredStyleId: 'GS-ukiyo-e',
    localImage: '/src/assets/images/style_japanese_ink_editorial_1795341811942.jpg',
    fallbackTitle: '浮世绘木刻版画',
    alt: '浮世绘锦鲤红叶墨线插画样张',
  },
  {
    plateNo: '02',
    preferredStyleId: 'FB-001',
    localImage: '/src/assets/images/style_watercolor_storybook_1795328903873.jpg',
    fallbackTitle: '经典水彩绘本',
    alt: '温暖秋日水彩故事绘本样张',
  },
  {
    plateNo: '03',
    preferredStyleId: 'GS-risograph',
    localImage: '/src/assets/images/style_risograph_print_1795337534636.jpg',
    fallbackTitle: '孔版印刷 Risograph',
    alt: '朱红与孔雀蓝套色孔版印刷海报样张',
  },
  {
    plateNo: '04',
    preferredStyleId: 'GS-botanical-illustration',
    localImage: '/src/assets/images/style_botanical_specimen_1795341840609.jpg',
    fallbackTitle: '博物植物图鉴',
    alt: '古典科学水彩植物标本图鉴样张',
  },
];

export function LandingView({
  isLoggedIn,
  styles,
  favoriteStyleIds,
  onToggleFavoriteStyle,
  onStartCreation,
}: LandingViewProps) {
  const [activeScene, setActiveScene] = useState<PurposeKind | 'all'>('all');
  const [activeTagId, setActiveTagId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [activeStyle, setActiveStyle] = useState<StyleItem | null>(null);
  const [activeTab, setActiveTab] = useState<'prompt' | 'image'>('prompt');

  const galleryTopRef = useRef<HTMLElement>(null);

  const activeCatalog = styles.length > 0 ? styles : STYLES;
  const selectedPurpose =
    activeScene === 'all' ? null : PURPOSES.find((p) => p.id === activeScene) ?? null;
  const selectedTag =
    UNIFIED_STYLE_TAGS.find((t) => t.id === activeTagId) ?? UNIFIED_STYLE_TAGS[0];

  const heroPlates = useMemo(() => {
    return HERO_SPECIMENS.map((spec, idx) => {
      const matched =
        activeCatalog.find((s) => s.id === spec.preferredStyleId) ??
        activeCatalog[idx] ??
        STYLES[idx];
      return {
        ...spec,
        style: matched,
      };
    });
  }, [activeCatalog]);

  const sceneLayouts = useMemo(
    () => (activeScene === 'all' ? LAYOUTS : getLayoutsForKind(activeScene, LAYOUTS)),
    [activeScene]
  );
  const sceneLayoutsCount = sceneLayouts.length;

  // Live count per style tag under the currently selected scene
  const tagMatchCounts = useMemo(() => {
    const scenePool =
      activeScene === 'all'
        ? activeCatalog
        : activeCatalog.filter((s) => s.recommendedKinds.includes(activeScene));
    const counts: Record<string, number> = {};
    for (const tag of UNIFIED_STYLE_TAGS) {
      counts[tag.id] = scenePool.filter((style) => {
        if (tag.featuredOnly && !style.featured) return false;
        if (tag.categories && !tag.categories.includes(style.category)) return false;
        return true;
      }).length;
    }
    return counts;
  }, [activeCatalog, activeScene]);

  useEffect(() => {
    if (activeTagId !== 'all' && (tagMatchCounts[activeTagId] ?? 0) === 0) {
      setActiveTagId('all');
    }
  }, [activeTagId, tagMatchCounts]);

  // Unified filtered gallery: Scene × Style Tag × Search Query with scene-authentic & tag-distinct ranking
  const filteredStyles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = activeCatalog.filter((style) => {
      if (activeScene !== 'all' && !style.recommendedKinds.includes(activeScene)) {
        return false;
      }
      if (selectedTag.featuredOnly && !style.featured) {
        return false;
      }
      if (selectedTag.categories && !selectedTag.categories.includes(style.category)) {
        return false;
      }
      if (!q) return true;
      const tagName = STYLE_CATEGORY_TAG_LABELS[style.category] ?? '';
      return `${style.id} ${style.title} ${style.englishName} ${style.description} ${style.visualTraitsCn} ${tagName}`
        .toLowerCase()
        .includes(q);
    });
    if (q) return list;
    return rankStylesForGallery(list, {
      sceneKind: activeScene,
      tagId: selectedTag.id,
      isFeaturedFilter: Boolean(selectedTag.featuredOnly),
    });
  }, [activeCatalog, activeScene, selectedTag, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredStyles.length / GALLERY_PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const visibleStyles = useMemo(
    () =>
      filteredStyles.slice(
        safePage * GALLERY_PAGE_SIZE,
        safePage * GALLERY_PAGE_SIZE + GALLERY_PAGE_SIZE
      ),
    [filteredStyles, safePage]
  );

  const pageTokens = useMemo(
    () => getPaginationWindow(safePage, totalPages),
    [safePage, totalPages]
  );

  useEffect(() => {
    setPage(0);
  }, [activeScene, activeTagId, searchQuery]);

  const goToPage = (nextPage: number) => {
    const clamped = Math.max(0, Math.min(nextPage, totalPages - 1));
    setPage(clamped);
    galleryTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSurpriseStyle = () => {
    const pool = filteredStyles.length > 0 ? filteredStyles : activeCatalog;
    const picked = pickRandomInspirationStyle(pool, activeStyle?.id);
    if (picked) {
      setActiveStyle(picked);
    }
  };

  // Keyboard navigation inside the full-size lightbox preview
  const activeStyleIndex = useMemo(
    () => (activeStyle ? filteredStyles.findIndex((s) => s.id === activeStyle.id) : -1),
    [activeStyle, filteredStyles]
  );

  useEffect(() => {
    if (!activeStyle) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveStyle(null);
      } else if (e.key === 'ArrowLeft' && activeStyleIndex > 0) {
        e.preventDefault();
        setActiveStyle(filteredStyles[activeStyleIndex - 1]);
      } else if (
        e.key === 'ArrowRight' &&
        activeStyleIndex >= 0 &&
        activeStyleIndex < filteredStyles.length - 1
      ) {
        e.preventDefault();
        setActiveStyle(filteredStyles[activeStyleIndex + 1]);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeStyle, activeStyleIndex, filteredStyles]);

  return (
    <div id="top" className="w-full">
      {/* Hero Spread — Tokyo Independent Illustration Magazine Open-Book Spread */}
      <section className="washi-grid relative overflow-hidden border-b border-[var(--border-strong)]">
        {/* Subtle vertical book-spine crease on desktop */}
        <div
          aria-hidden="true"
          className="magazine-spine pointer-events-none absolute inset-y-0 left-1/2 hidden w-14 -translate-x-1/2 lg:block"
        />

        <div className="mx-auto grid max-w-[1400px] items-center gap-10 px-5 py-10 md:px-8 lg:grid-cols-12 lg:gap-12 lg:py-16">
          {/* Left Page: Editorial Issue Masthead & Oversized Serif Title */}
          <div className="relative z-10 flex flex-col justify-center lg:col-span-6 lg:pr-10">
            <div className="inline-flex w-fit items-center gap-2.5 border border-[var(--border)] bg-[var(--paper)]/92 px-3 py-1.5 text-xs tracking-[0.06em] text-[var(--ink-soft)]">
              <span className="font-tabular font-semibold text-[var(--seal)]">NO.01</span>
              <span aria-hidden="true" className="text-[#cfc9bc]">
                ·
              </span>
              <span className="font-editorial font-medium text-[var(--ink)]">
                {activeCatalog.length} 视觉风格年鉴
              </span>
            </div>

            <h1 className="mt-5 font-editorial text-[34px] font-bold leading-[1.15] tracking-tight text-[var(--ink)] text-balance sm:text-5xl lg:text-[60px]">
              把想法，画出来。
            </h1>

            <p className="mt-4 max-w-lg text-[15px] leading-[1.7] text-[var(--ink-soft)] sm:mt-5">
              收录 <span className="font-tabular font-semibold text-[var(--ink)]">{activeCatalog.length}</span>{' '}
              种实拍插画与摄影媒介、<span className="font-tabular font-semibold text-[var(--ink)]">{LAYOUTS.length}</span>{' '}
              套构图版式与 36 组标准色板——按场景与流派自由组合，把一句话变成可直接出图的专业提示词。
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => onStartCreation()}
                className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 whitespace-nowrap rounded-[4px] bg-[var(--ink)] px-6 py-3 text-sm font-semibold text-[#fbf9f4] transition-colors hover:bg-[#2e2e2b]"
              >
                <span>{isLoggedIn ? '进入创作画案' : '开始创作'}</span>
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </button>
              <a
                href="#artworks"
                className="inline-flex min-h-[44px] items-center gap-1.5 whitespace-nowrap border-b border-[var(--ink)] pb-0.5 text-sm font-medium text-[var(--ink)] transition-colors hover:border-[var(--seal)] hover:text-[var(--seal)] sm:min-h-0"
              >
                <span>翻阅画风年鉴</span>
                <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-[var(--muted)] sm:mt-7 sm:text-xs">
              <span>提示词不限次免费生成</span>
              <span>画面条件均可留空</span>
              <span>支持个人常用模板</span>
            </div>
          </div>

          {/* Right Page: Staggered 4-Specimen Print Collage (Clean archival white borders, clickable to inspect) */}
          <div className="relative z-10 lg:col-span-6 lg:pl-4">
            {/* Desktop Overlapping Editorial Specimen Spread */}
            <div className="relative hidden h-[332px] w-full sm:block lg:h-[360px]">
              {/* Plate 01 — Back Left: Ukiyo-e Ink Woodblock */}
              <button
                type="button"
                onClick={() => heroPlates[0]?.style && setActiveStyle(heroPlates[0].style)}
                title={heroPlates[0]?.style?.title ?? heroPlates[0].fallbackTitle}
                aria-label={`查看首屏样张：${heroPlates[0]?.style?.title ?? heroPlates[0].fallbackTitle}`}
                className="specimen-shadow group absolute left-[2%] top-[2%] z-10 w-[34%] cursor-pointer border border-[var(--border)] bg-[var(--paper)] p-2 text-left transition-transform duration-200 hover:z-40 hover:-translate-y-1"
              >
                <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#f4f1ea]">
                  <img
                    src={heroPlates[0].localImage}
                    alt={heroPlates[0].alt}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
                  />
                  <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-[#171716]/82 px-2 py-1 text-[10px] font-medium text-[#fbf9f4] opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                    {heroPlates[0]?.style?.title ?? heroPlates[0].fallbackTitle}
                  </span>
                </div>
              </button>

              {/* Plate 04 — Back Right: Botanical Specimen */}
              <button
                type="button"
                onClick={() => heroPlates[3]?.style && setActiveStyle(heroPlates[3].style)}
                title={heroPlates[3]?.style?.title ?? heroPlates[3].fallbackTitle}
                aria-label={`查看首屏样张：${heroPlates[3]?.style?.title ?? heroPlates[3].fallbackTitle}`}
                className="specimen-shadow group absolute right-[0%] top-[0%] z-10 w-[31%] cursor-pointer border border-[var(--border)] bg-[var(--paper)] p-2 text-left transition-transform duration-200 hover:z-40 hover:-translate-y-1"
              >
                <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#f4f1ea]">
                  <img
                    src={heroPlates[3].localImage}
                    alt={heroPlates[3].alt}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
                  />
                  <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-[#171716]/82 px-2 py-1 text-[10px] font-medium text-[#fbf9f4] opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                    {heroPlates[3]?.style?.title ?? heroPlates[3].fallbackTitle}
                  </span>
                </div>
              </button>

              {/* Plate 03 — Mid-Right Foreground: Risograph Poster */}
              <button
                type="button"
                onClick={() => heroPlates[2]?.style && setActiveStyle(heroPlates[2].style)}
                title={heroPlates[2]?.style?.title ?? heroPlates[2].fallbackTitle}
                aria-label={`查看首屏样张：${heroPlates[2]?.style?.title ?? heroPlates[2].fallbackTitle}`}
                className="specimen-shadow group absolute right-[19%] top-[10%] z-20 w-[33%] cursor-pointer border border-[var(--border)] bg-[var(--paper)] p-2 text-left transition-transform duration-200 hover:z-40 hover:-translate-y-1"
              >
                <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#f4f1ea]">
                  <img
                    src={heroPlates[2].localImage}
                    alt={heroPlates[2].alt}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
                  />
                  <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-[#171716]/82 px-2 py-1 text-[10px] font-medium text-[#fbf9f4] opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                    {heroPlates[2]?.style?.title ?? heroPlates[2].fallbackTitle}
                  </span>
                </div>
              </button>

              {/* Plate 02 — Front Center-Left: Warm Watercolor Storybook */}
              <button
                type="button"
                onClick={() => heroPlates[1]?.style && setActiveStyle(heroPlates[1].style)}
                title={heroPlates[1]?.style?.title ?? heroPlates[1].fallbackTitle}
                aria-label={`查看首屏样张：${heroPlates[1]?.style?.title ?? heroPlates[1].fallbackTitle}`}
                className="specimen-shadow group absolute bottom-[0%] left-[21%] z-30 w-[35%] cursor-pointer border border-[var(--border)] bg-[var(--paper)] p-2 text-left transition-transform duration-200 hover:z-40 hover:-translate-y-1"
              >
                <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#f4f1ea]">
                  <img
                    src={heroPlates[1].localImage}
                    alt={heroPlates[1].alt}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
                  />
                  <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-[#171716]/82 px-2 py-1 text-[10px] font-medium text-[#fbf9f4] opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                    {heroPlates[1]?.style?.title ?? heroPlates[1].fallbackTitle}
                  </span>
                </div>
              </button>
            </div>

            {/* Mobile Clean 2×2 Specimen Grid */}
            <div className="grid grid-cols-2 gap-3 sm:hidden">
              {heroPlates.map((plate) => (
                <button
                  key={plate.plateNo}
                  type="button"
                  onClick={() => plate.style && setActiveStyle(plate.style)}
                  aria-label={`查看首屏样张：${plate.style?.title ?? plate.fallbackTitle}`}
                  className="specimen-shadow cursor-pointer border border-[var(--border)] bg-[var(--paper)] p-1.5 text-left"
                >
                  <div className="aspect-[4/3] w-full overflow-hidden bg-[#f4f1ea]">
                    <img
                      src={plate.localImage}
                      alt={plate.alt}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <span className="mt-1.5 flex items-center justify-between font-tabular text-xs text-[var(--muted)]">
                    <span>FIG.{plate.plateNo}</span>
                    <span className="truncate pl-1.5 text-[var(--ink-soft)]">
                      {plate.style?.title ?? plate.fallbackTitle}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Main Gallery Section — Tokyo Editorial Underline Tabs & Print Specimen Grid */}
      <section
        id="artworks"
        ref={galleryTopRef}
        className="mx-auto max-w-[1400px] scroll-mt-16 px-5 pb-16 pt-6 md:px-8"
      >
        {/* Row 1: Single-Row Vermilion-Underline Scene Tabs + Inline Search & Surprise */}
        <div
          id="scenarios"
          className="flex flex-col justify-between gap-4 border-b border-[var(--border)] pb-0 lg:flex-row lg:items-end"
        >
          <div
            role="tablist"
            aria-label="按应用场景筛选画风"
            className="horizontal-scroll no-scrollbar -mb-px flex items-center gap-6 overflow-x-auto sm:gap-7"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeScene === 'all'}
              onClick={() => setActiveScene('all')}
              className={`min-h-[44px] shrink-0 cursor-pointer whitespace-nowrap border-b-2 pb-3 pt-2 text-[15px] transition-colors sm:min-h-0 sm:pb-3.5 sm:text-[14px] ${
                activeScene === 'all'
                  ? 'border-[var(--seal)] font-semibold text-[var(--seal)]'
                  : 'border-transparent font-medium text-[var(--ink-soft)] hover:text-[var(--ink)]'
              }`}
            >
              全部场景
            </button>

            {PURPOSES.map((purpose) => {
              const active = activeScene === purpose.id;
              return (
                <button
                  key={purpose.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveScene(purpose.id)}
                  className={`min-h-[44px] shrink-0 cursor-pointer whitespace-nowrap border-b-2 pb-3 pt-2 text-[15px] transition-colors sm:min-h-0 sm:pb-3.5 sm:text-[14px] ${
                    active
                      ? 'border-[var(--seal)] font-semibold text-[var(--seal)]'
                      : 'border-transparent font-medium text-[var(--ink-soft)] hover:text-[var(--ink)]'
                  }`}
                >
                  {purpose.label}
                </button>
              );
            })}
          </div>

          <div className="flex w-full items-center gap-2 pb-3 lg:w-auto">
            <div className="relative min-w-0 flex-1 lg:w-64">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)] sm:h-3.5 sm:w-3.5"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="搜索画风名称或关键词"
                placeholder="搜索画风、材质、流派或编号…"
                className="w-full rounded-[4px] border border-[var(--border)] bg-[var(--paper)] py-2 pl-9 pr-3 text-base text-[var(--ink)] placeholder:text-[#9b9991] sm:py-1.5 sm:pl-8 sm:text-xs"
              />
            </div>

            <button
              type="button"
              onClick={handleSurpriseStyle}
              className="inline-flex min-h-[40px] shrink-0 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-[4px] border border-[var(--border)] bg-[var(--paper)] px-3.5 py-2 text-xs font-medium text-[var(--ink)] transition-colors hover:border-[var(--seal)] hover:text-[var(--seal)] sm:min-h-0 sm:px-3 sm:py-1.5"
            >
              <Shuffle className="h-3.5 w-3.5" aria-hidden="true" />
              <span>手气不错</span>
            </button>
          </div>
        </div>

        {/* Row 2: Clean Inline Style Tag Strip */}
        <div
          role="tablist"
          aria-label="风格标签筛选"
          className="horizontal-scroll no-scrollbar flex items-center gap-1.5 overflow-x-auto border-b border-[var(--border)] py-3"
        >
          {UNIFIED_STYLE_TAGS.map((tag) => {
            const active = activeTagId === tag.id;
            const count = tagMatchCounts[tag.id] ?? 0;
            return (
              <button
                key={tag.id}
                type="button"
                role="tab"
                aria-selected={active}
                disabled={count === 0 && !active}
                onClick={() => setActiveTagId(tag.id)}
                className={`inline-flex min-h-[36px] shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-[3px] px-3 py-1.5 text-[13px] transition-colors disabled:cursor-not-allowed disabled:opacity-35 sm:min-h-0 sm:px-2.5 sm:py-1 sm:text-xs ${
                  active
                    ? 'bg-[var(--ink)] font-semibold text-[#fbf9f4]'
                    : 'text-[var(--ink-soft)] hover:bg-[var(--light)] hover:text-[var(--ink)]'
                }`}
              >
                <span>{tag.label}</span>
                <span
                  className={`font-tabular text-xs sm:text-[11px] ${
                    active ? 'text-[#fbf9f4]/75' : 'text-[var(--muted)]'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Contextual Scene Editorial Header & Direct Layout Hand-Off (Hairline separated, zero nested boxes) */}
        {selectedPurpose ? (
          <div className="border-b border-[var(--border)] py-5">
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
              <div className="max-w-3xl">
                <div className="flex flex-wrap items-center gap-2.5 text-xs">
                  <span className="font-editorial text-sm font-semibold text-[var(--ink)]">
                    {selectedPurpose.label} · 优先策展画风
                  </span>
                  <span aria-hidden="true" className="text-[#cfc9bc]">
                    /
                  </span>
                  <span className="font-tabular text-[var(--seal)]">
                    匹配 {filteredStyles.length} 款
                    {selectedPurpose.usesLayout ? ` · 专属版式 ${sceneLayoutsCount} 套` : ' · 纯图满幅'}
                    {' · '}推荐 {selectedPurpose.recommendedRatio}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
                  {selectedPurpose.styleGuidanceCn}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onStartCreation({ kind: selectedPurpose.id })}
                className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-[4px] bg-[var(--ink)] px-4 py-2 text-xs font-semibold text-[#fbf9f4] transition-colors hover:bg-[#2e2e2b]"
              >
                <span>以此场景开始创作</span>
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>

            {selectedPurpose.usesLayout && sceneLayouts.length > 0 && (
              <div className="mt-4 pt-3 border-t border-[var(--border)]/70">
                <div className="mb-2.5 flex items-center justify-between text-xs text-[var(--muted)] sm:text-[11px]">
                  <span>
                    {selectedPurpose.label}专属版式示例（共 {sceneLayoutsCount} 套 · 点击直接锁定该版式进入画案）
                  </span>
                  <span className="hidden sm:inline">工作台可随时切换或留空自由构图</span>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {sceneLayouts.slice(0, 4).map((layout) => (
                    <button
                      key={layout.id}
                      type="button"
                      onClick={() =>
                        onStartCreation({
                          kind: selectedPurpose.id,
                          layoutId: layout.id,
                        })
                      }
                      aria-label={`使用 ${selectedPurpose.label} 版式 ${layout.title} 开始创作`}
                      className="group flex cursor-pointer items-center gap-2.5 rounded-[4px] border border-[var(--border)] bg-[var(--paper)] p-2 text-left transition-colors hover:border-[var(--ink)]"
                    >
                      <LayoutSchematic
                        layout={layout}
                        fit="contain"
                        className="h-11 w-11 shrink-0 rounded-[2px] p-0.5"
                      />
                      <div className="min-w-0 flex-1">
                        <span className="block font-tabular text-xs text-[var(--muted)] sm:text-[10px]">
                          {layout.id}
                        </span>
                        <span className="block truncate text-xs font-medium text-[var(--ink)] group-hover:text-[var(--seal)]">
                          {layout.title}
                        </span>
                      </div>
                      <ArrowUpRight
                        className="h-3.5 w-3.5 shrink-0 text-[var(--muted)] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[var(--seal)]"
                        aria-hidden="true"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-2 py-4 text-xs text-[var(--muted)]">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-editorial font-semibold text-[var(--ink)]">
                {selectedTag.label}
              </span>
              <span aria-hidden="true" className="text-[#cfc9bc]">
                ·
              </span>
              <span className="font-tabular text-[var(--seal)]">
                共 {filteredStyles.length} 款
              </span>
              <span aria-hidden="true" className="hidden text-[#cfc9bc] sm:inline">
                ·
              </span>
              <span className="hidden sm:inline">{selectedTag.summaryCn}</span>
            </div>
            {activeTagId !== 'all' && (
              <button
                type="button"
                onClick={() => setActiveTagId('all')}
                className="shrink-0 cursor-pointer whitespace-nowrap font-medium text-[var(--seal)] hover:underline underline-offset-4"
              >
                返回全部风格
              </button>
            )}
          </div>
        )}

        {/* Print Specimen Gallery Grid (Crisp 1px Frame + Clean 2-Line Caption & Real Pixel Color Dots) */}
        {visibleStyles.length === 0 ? (
          <div className="mt-6 border border-[var(--border)] bg-[var(--paper)] py-16 text-center">
            <p className="text-sm font-medium text-[var(--ink)]">当前筛选条件下暂无匹配画风</p>
            <button
              type="button"
              onClick={() => {
                setActiveScene('all');
                setActiveTagId('all');
                setSearchQuery('');
              }}
              className="mt-4 cursor-pointer rounded-[4px] border border-[var(--ink)] px-4 py-2 text-xs font-medium text-[var(--ink)] transition-colors hover:bg-[var(--ink)] hover:text-[#fbf9f4]"
            >
              重置全部筛选条件
            </button>
          </div>
        ) : (
          <div className="mt-2 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
            {visibleStyles.map((style) => {
              const categoryTag = STYLE_CATEGORY_TAG_LABELS[style.category] ?? '特色画风';
              const displaySceneKind =
                activeScene !== 'all' && style.recommendedKinds.includes(activeScene)
                  ? activeScene
                  : style.recommendedKinds[0];
              const isFav = favoriteStyleIds.includes(style.id);
              const verifiedPalette = getVerifiedPalette(style.palettePreview);

              return (
                <article key={style.id} className="group relative flex flex-col">
                  {/* Crisp Tokyo Print Specimen White Frame */}
                  <div className="relative overflow-hidden rounded-[4px] border border-[var(--border)] bg-[var(--paper)] p-1.5 transition-all duration-200 group-hover:border-[#b9b2a4] group-hover:shadow-[0_12px_24px_-18px_rgba(23,23,22,0.28)]">
                    <button
                      type="button"
                      onClick={() => setActiveStyle(style)}
                      aria-label={`查看画风 ${style.title} 大图详情`}
                      className="block w-full cursor-pointer overflow-hidden rounded-[2px] text-left"
                    >
                      <StyleArtwork
                        style={style}
                        fit="cover"
                        className="aspect-[4/3] w-full transition-transform duration-300 group-hover:scale-[1.025]"
                      />
                    </button>

                    {/* Favorite Heart Toggle */}
                    <button
                      type="button"
                      onClick={() => onToggleFavoriteStyle(style.id)}
                      aria-label={isFav ? `取消收藏 ${style.title}` : `收藏 ${style.title}`}
                      aria-pressed={isFav}
                      className={`absolute right-3 top-3 flex h-9 w-9 cursor-pointer items-center justify-center rounded-[3px] border bg-[var(--paper)]/95 transition-all sm:h-7 sm:w-7 ${
                        isFav
                          ? 'border-[var(--seal)]/40 text-[var(--seal)] opacity-100'
                          : 'border-[var(--border)] text-[var(--muted)] opacity-90 hover:text-[var(--seal)] sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100'
                      }`}
                    >
                      <Heart className={`h-4 w-4 sm:h-3.5 sm:w-3.5 ${isFav ? 'fill-current' : ''}`} />
                    </button>

                    {/* Subtle Hover Quick Actions */}
                    <div className="pointer-events-none absolute inset-x-3 bottom-3 flex items-center justify-between gap-2 opacity-0 transition-opacity duration-150 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100">
                      <button
                        type="button"
                        onClick={() => setActiveStyle(style)}
                        className="inline-flex cursor-pointer items-center gap-1 whitespace-nowrap rounded-[3px] border border-[var(--border)] bg-[var(--paper)]/95 px-2.5 py-1 text-[11px] font-medium text-[var(--ink)] shadow-xs transition-colors hover:bg-[var(--surface-alt)]"
                      >
                        <Eye className="h-3 w-3" aria-hidden="true" />
                        <span>看大图</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onStartCreation({
                            styleId: style.id,
                            kind: displaySceneKind,
                          })
                        }
                        className="inline-flex cursor-pointer items-center gap-1 whitespace-nowrap rounded-[3px] bg-[var(--ink)] px-2.5 py-1 text-[11px] font-semibold text-[#fbf9f4] shadow-xs transition-colors hover:bg-[var(--seal)]"
                      >
                        <span>直接创作</span>
                        <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  {/* Clean 2-Line Print Catalog Caption (Title + ID/Category + 3 Real Extracted Color Dots) */}
                  <div className="mt-2.5 px-0.5">
                    <button
                      type="button"
                      onClick={() => setActiveStyle(style)}
                      className="block w-full cursor-pointer text-left"
                    >
                      <h3 className="truncate text-[15px] font-semibold leading-snug text-[var(--ink)] transition-colors group-hover:text-[var(--seal)] sm:text-[14px]">
                        {style.title}
                      </h3>
                    </button>

                    <div className="mt-1 flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-1.5 truncate text-xs text-[var(--muted)] sm:text-[11px]">
                        <span className="font-tabular shrink-0">{style.id}</span>
                        <span aria-hidden="true">·</span>
                        <span className="truncate">{categoryTag}</span>
                      </div>

                      {verifiedPalette.length > 0 && (
                        <div
                          className="flex shrink-0 items-center gap-1"
                          title={`样图实拍主色：${verifiedPalette.join(' · ')}`}
                          aria-label={`样图实拍主色 ${verifiedPalette.join(' ')}`}
                        >
                          {verifiedPalette.map((hex, idx) => (
                            <span
                              key={`${style.id}-dot-${idx}`}
                              className="h-2.5 w-2.5 rounded-full ring-1 ring-black/15"
                              style={{ backgroundColor: hex }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* Crisp Hairline Pagination Bar */}
        {totalPages > 1 && (
          <nav
            aria-label="画风图鉴分页"
            className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-6"
          >
            <button
              type="button"
              disabled={safePage <= 0}
              onClick={() => goToPage(safePage - 1)}
              className="inline-flex cursor-pointer items-center gap-1 whitespace-nowrap rounded-[4px] border border-[var(--border)] bg-[var(--paper)] px-3.5 py-2 text-xs font-medium text-[var(--ink)] transition-colors hover:border-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-35"
            >
              <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
              <span>上一批</span>
            </button>

            <div className="flex flex-wrap items-center justify-center gap-1">
              {pageTokens.map((token, idx) =>
                token === 'ellipsis' ? (
                  <span
                    key={`ellipsis-${idx}`}
                    aria-hidden="true"
                    className="px-1.5 text-xs text-[var(--muted)]"
                  >
                    …
                  </span>
                ) : (
                  <button
                    key={token}
                    type="button"
                    onClick={() => goToPage(token)}
                    aria-current={token === safePage ? 'page' : undefined}
                    aria-label={`第 ${token + 1} 页`}
                    className={`font-tabular min-w-[32px] cursor-pointer rounded-[3px] px-2 py-1.5 text-xs font-medium transition-colors ${
                      token === safePage
                        ? 'bg-[var(--ink)] font-semibold text-[#fbf9f4]'
                        : 'text-[var(--ink-soft)] hover:bg-[var(--light)] hover:text-[var(--ink)]'
                    }`}
                  >
                    {token + 1}
                  </button>
                )
              )}
              <span className="ml-2.5 hidden font-tabular text-[11px] text-[var(--muted)] sm:inline">
                共 {filteredStyles.length} 款
              </span>
            </div>

            <button
              type="button"
              disabled={safePage + 1 >= totalPages}
              onClick={() => goToPage(safePage + 1)}
              className="inline-flex cursor-pointer items-center gap-1 whitespace-nowrap rounded-[4px] border border-[var(--border)] bg-[var(--paper)] px-3.5 py-2 text-xs font-medium text-[var(--ink)] transition-colors hover:border-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-35"
            >
              <span>下一批</span>
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </nav>
        )}
      </section>

      {/* Bottom Editorial Spread: Prompt Studio & Upcoming Direct Image Generation */}
      <section className="border-t border-[var(--border)] bg-[var(--paper)]">
        <div className="mx-auto grid max-w-[1400px] gap-10 px-5 py-14 md:px-8 lg:grid-cols-12 lg:items-start lg:gap-12 lg:py-16">
          <div className="lg:col-span-5">
            <p className="font-tabular text-xs font-semibold tracking-[0.12em] text-[var(--seal)] sm:text-[11px]">
              NO.02 · STUDIO WORKFLOW
            </p>
            <h2 className="mt-2 font-editorial text-2xl font-bold leading-snug text-[var(--ink)] sm:text-3xl">
              下一幅画，从你的一句话开始。
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[var(--ink-soft)]">
              不必背诵复杂参数。选定应用场景，系统自动匹配最对味的版式与画风 Skill，一键产出可直接用于即梦、Midjourney 与 GPT-4o 的专业提示词。
            </p>
          </div>

          <div className="border-t border-[var(--border)] pt-6 lg:col-span-7 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0">
            <div
              role="tablist"
              aria-label="创作方式说明"
              className="flex items-center gap-6 border-b border-[var(--border)]"
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'prompt'}
                onClick={() => setActiveTab('prompt')}
                className={`-mb-px min-h-[40px] cursor-pointer whitespace-nowrap border-b-2 pb-2.5 text-[13px] font-semibold transition-colors sm:min-h-0 sm:text-xs ${
                  activeTab === 'prompt'
                    ? 'border-[var(--seal)] text-[var(--seal)]'
                    : 'border-transparent text-[var(--muted)] hover:text-[var(--ink)]'
                }`}
              >
                生成提示词（已开放）
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'image'}
                onClick={() => setActiveTab('image')}
                className={`-mb-px min-h-[40px] cursor-pointer whitespace-nowrap border-b-2 pb-2.5 text-[13px] font-semibold transition-colors sm:min-h-0 sm:text-xs ${
                  activeTab === 'image'
                    ? 'border-[var(--seal)] text-[var(--seal)]'
                    : 'border-transparent text-[var(--muted)] hover:text-[var(--ink)]'
                }`}
              >
                站内直接生图（即将开放）
              </button>
            </div>

            <div role="tabpanel" className="mt-5">
              {activeTab === 'prompt' ? (
                <div>
                  <h3 className="font-editorial text-lg font-semibold text-[var(--ink)]">
                    全库 {activeCatalog.length} 款画风 Skill，一键适配多款生图工具
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                    支持 AI 智能润色与结构化极速生成，自动注入当前场景构图纪律与对应风格 Skill 指令，提供「中文通用」「Midjourney 英文」「去作者名安全版」三种格式切换。
                  </p>
                </div>
              ) : (
                <div>
                  <h3 className="font-editorial text-lg font-semibold text-[var(--ink)]">
                    新用户建档即赠 5 次生图额度，上线即可直接出图
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                    站内生图模型正在接入联调中，新验证账号赠送的 5 次生图机会永久保留不失效。现在可先进入工作台订阅上线提醒，并用免费提示词功能完成日常创作。
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={() => onStartCreation()}
                className="mt-6 inline-flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-[4px] bg-[var(--ink)] px-5 py-2.5 text-sm font-semibold text-[#fbf9f4] transition-colors hover:bg-[#2e2e2b]"
              >
                <span>开始这一幅</span>
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Full-Size Uncropped Style Detail Lightbox — Tokyo Monograph Accession Sheet */}
      {activeStyle && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="landing-style-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#171716]/60 p-4 backdrop-blur-xs"
          onClick={() => setActiveStyle(null)}
        >
          <div
            className="animate-modal-in flex max-h-[92dvh] w-full max-w-4xl flex-col overflow-hidden rounded-[6px] border border-[var(--border)] bg-[var(--paper)] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-[var(--border)] px-6 py-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h2
                    id="landing-style-title"
                    className="font-editorial truncate text-lg font-bold text-[var(--ink)]"
                  >
                    {activeStyle.title}
                  </h2>
                  <span aria-hidden="true" className="text-[#cfc9bc]">
                    ·
                  </span>
                  <span className="text-xs font-medium text-[var(--seal)]">
                    {STYLE_CATEGORY_TAG_LABELS[activeStyle.category] ?? '特色画风'}
                  </span>
                </div>
                <p className="mt-0.5 truncate font-tabular text-xs text-[var(--muted)]">
                  {activeStyle.id} · {activeStyle.englishName}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => onToggleFavoriteStyle(activeStyle.id)}
                  aria-label={
                    favoriteStyleIds.includes(activeStyle.id)
                      ? `取消收藏 ${activeStyle.title}`
                      : `收藏 ${activeStyle.title}`
                  }
                  className={`inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-[4px] border px-3 text-xs font-medium transition-colors ${
                    favoriteStyleIds.includes(activeStyle.id)
                      ? 'border-[var(--seal)] bg-[var(--accent-soft)] text-[var(--seal)]'
                      : 'border-[var(--border)] bg-[var(--paper)] text-[var(--ink-soft)] hover:border-[var(--seal)] hover:text-[var(--seal)]'
                  }`}
                >
                  <Heart
                    className={`h-3.5 w-3.5 ${
                      favoriteStyleIds.includes(activeStyle.id) ? 'fill-current' : ''
                    }`}
                  />
                  <span>{favoriteStyleIds.includes(activeStyle.id) ? '已收藏' : '收藏'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveStyle(null)}
                  aria-label="关闭画风详情"
                  className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-[4px] border border-[var(--border)] text-[var(--ink)] transition-colors hover:border-[var(--ink)] hover:bg-[var(--surface-alt)]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="grid min-h-0 flex-1 overflow-y-auto md:grid-cols-12 md:overflow-hidden">
              {/* Left Full Uncropped Artwork Stage */}
              <div className="flex items-center justify-center bg-[var(--surface-alt)] p-4 md:col-span-7 md:border-r md:border-[var(--border)] md:p-6">
                <StyleArtwork
                  style={activeStyle}
                  fit="contain"
                  className="h-[320px] w-full bg-transparent sm:h-[400px] md:h-[min(64dvh,560px)]"
                />
              </div>

              {/* Right Curatorial Accession Details */}
              <div className="subtle-scroll flex flex-col justify-between p-6 md:col-span-5 md:overflow-y-auto">
                <dl className="divide-y divide-[var(--border)]">
                  <div className="pb-4">
                    <dt className="text-xs font-semibold tracking-wider text-[var(--muted)] sm:text-[11px]">
                      画风说明
                    </dt>
                    <dd className="mt-1.5 text-sm leading-relaxed text-[var(--ink-soft)]">
                      {activeStyle.description}
                    </dd>
                  </div>

                  <div className="py-4">
                    <dt className="text-xs font-semibold tracking-wider text-[var(--muted)] sm:text-[11px]">
                      核心笔触与媒介特征
                    </dt>
                    <dd className="mt-1.5 text-xs leading-relaxed text-[var(--ink-soft)]">
                      {activeStyle.visualTraitsCn}
                    </dd>
                  </div>

                  {(() => {
                    const modalPalette = getVerifiedPalette(activeStyle.palettePreview);
                    if (modalPalette.length === 0) return null;
                    return (
                      <div className="py-4">
                        <dt className="text-xs font-semibold tracking-wider text-[var(--muted)] sm:text-[11px]">
                          样图实拍取色
                        </dt>
                        <dd className="mt-2 flex flex-wrap items-center gap-3">
                          {modalPalette.map((hex, i) => (
                            <div key={`${hex}-${i}`} className="flex items-center gap-1.5">
                              <span
                                className="h-5 w-5 rounded-[3px] ring-1 ring-black/15"
                                style={{ backgroundColor: hex }}
                              />
                              <span className="font-tabular text-xs text-[var(--ink-soft)] sm:text-[11px]">
                                {hex}
                              </span>
                            </div>
                          ))}
                        </dd>
                      </div>
                    );
                  })()}

                  <div className="pt-4">
                    <dt className="text-xs font-semibold tracking-wider text-[var(--muted)] sm:text-[11px]">
                      适配应用场景
                    </dt>
                    <dd className="mt-1.5 text-xs font-medium text-[var(--ink)]">
                      {activeStyle.recommendedKinds
                        .map((k) => PURPOSES.find((p) => p.id === k)?.label)
                        .filter(Boolean)
                        .join(' · ')}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] bg-[var(--bg)] px-6 py-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={activeStyleIndex <= 0}
                  onClick={() =>
                    activeStyleIndex > 0 && setActiveStyle(filteredStyles[activeStyleIndex - 1])
                  }
                  aria-label="上一个画风"
                  className="inline-flex cursor-pointer items-center gap-1 rounded-[4px] border border-[var(--border)] bg-[var(--paper)] px-3 py-2 text-xs font-medium text-[var(--ink)] hover:border-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-35"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  <span>上一个</span>
                </button>
                <button
                  type="button"
                  disabled={activeStyleIndex < 0 || activeStyleIndex >= filteredStyles.length - 1}
                  onClick={() =>
                    activeStyleIndex >= 0 &&
                    activeStyleIndex < filteredStyles.length - 1 &&
                    setActiveStyle(filteredStyles[activeStyleIndex + 1])
                  }
                  aria-label="下一个画风"
                  className="inline-flex cursor-pointer items-center gap-1 rounded-[4px] border border-[var(--border)] bg-[var(--paper)] px-3 py-2 text-xs font-medium text-[var(--ink)] hover:border-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-35"
                >
                  <span>下一个</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleSurpriseStyle}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-[4px] border border-[var(--border)] bg-[var(--paper)] px-3 py-2 text-xs font-medium text-[var(--ink)] hover:border-[var(--seal)] hover:text-[var(--seal)]"
                >
                  <Shuffle className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>换一款</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  const chosenId = activeStyle.id;
                  const chosenKind =
                    activeScene !== 'all' ? activeScene : activeStyle.recommendedKinds[0];
                  setActiveStyle(null);
                  onStartCreation({ styleId: chosenId, kind: chosenKind });
                }}
                className="inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-[4px] bg-[var(--ink)] px-5 py-2.5 text-sm font-semibold text-[#fbf9f4] transition-colors hover:bg-[var(--seal)]"
              >
                <span>用这种画风创作</span>
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
