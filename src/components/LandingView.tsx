import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import {
  HERO_IMAGE,
  LAYOUTS,
  PURPOSES,
  STYLE_CATEGORY_TAG_LABELS,
  STYLES,
  UNIFIED_STYLE_TAGS,
} from '../data/catalog';
import { getLayoutsForKind, rankStylesForGallery } from '../utils/promptEngine';
import { LayoutSchematic, StyleArtwork } from './CatalogArtwork';
import type { PurposeKind, StyleItem } from '../types';

interface LandingViewProps {
  isLoggedIn: boolean;
  styles: StyleItem[];
  onStartCreation: (preset?: { styleId?: string; kind?: PurposeKind }) => void;
}

const GALLERY_PAGE_SIZE = 12;

export function LandingView({ isLoggedIn, styles, onStartCreation }: LandingViewProps) {
  const [activeScene, setActiveScene] = useState<PurposeKind | 'all'>('all');
  const [activeTagId, setActiveTagId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [activeStyle, setActiveStyle] = useState<StyleItem | null>(null);
  const [activeTab, setActiveTab] = useState<'prompt' | 'image'>('prompt');
  const [heroImgFailed, setHeroImgFailed] = useState(false);

  const activeCatalog = styles.length > 0 ? styles : STYLES;
  const selectedPurpose =
    activeScene === 'all' ? null : PURPOSES.find((p) => p.id === activeScene) ?? null;
  const selectedTag =
    UNIFIED_STYLE_TAGS.find((t) => t.id === activeTagId) ?? UNIFIED_STYLE_TAGS[0];

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
      filteredStyles.slice(safePage * GALLERY_PAGE_SIZE, safePage * GALLERY_PAGE_SIZE + GALLERY_PAGE_SIZE),
    [filteredStyles, safePage]
  );

  useEffect(() => {
    setPage(0);
  }, [activeScene, activeTagId, searchQuery]);

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
      } else if (e.key === 'ArrowRight' && activeStyleIndex >= 0 && activeStyleIndex < filteredStyles.length - 1) {
        e.preventDefault();
        setActiveStyle(filteredStyles[activeStyleIndex + 1]);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeStyle, activeStyleIndex, filteredStyles]);

  return (
    <div id="top" className="w-full">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-[var(--border)] bg-[#faf9f4]">
        <div className="mx-auto grid max-w-[1360px] items-stretch gap-8 px-5 py-14 md:px-8 lg:grid-cols-12 lg:py-20">
          <div className="relative z-10 flex flex-col justify-center lg:col-span-6 lg:pr-6">
            <p className="mb-4 text-xs font-medium tracking-widest text-[var(--green)]">
              画语 DrawNote · AI 插画风格与提示词画室
            </p>
            <h1 className="font-editorial text-4xl font-semibold leading-[1.2] tracking-tight text-[var(--ink)] text-balance sm:text-5xl lg:text-[54px]">
              把想法，
              <span className="text-[var(--green)]">画出来。</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-[var(--ink-soft)]">
              收录 <span className="font-semibold text-[var(--ink)]">{activeCatalog.length} 种</span>位图插画与摄影风格、<span className="font-semibold text-[var(--ink)]">{LAYOUTS.length} 套</span>结构化版式与 36 组标准色板——按应用场景与风格标签精准匹配，一键生成可直接出图的专业提示词。
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => onStartCreation()}
                className="inline-flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-full bg-[var(--green)] px-7 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--green-hover)]"
              >
                <span>{isLoggedIn ? '进入创作工作台' : '开始创作'}</span>
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </button>
              <a
                href="#artworks"
                className="inline-flex items-center whitespace-nowrap rounded-full border border-[var(--border)] bg-white/90 px-6 py-3.5 text-sm font-medium text-[var(--ink)] transition-colors hover:border-[var(--green)] hover:bg-[var(--light)]"
              >
                浏览画风图鉴
              </a>
            </div>

            <p className="mt-4 text-xs text-[var(--muted)]">
              提示词生成不限次数、免费使用 · 支持自由留空与保存个人常用创作模板
            </p>
          </div>

          <div className="lg:col-span-6">
            <div className="relative h-full min-h-[300px] overflow-hidden rounded-2xl border border-[var(--border)] bg-[#f4f1e6] lg:min-h-[420px]">
              {!heroImgFailed ? (
                <img
                  src={HERO_IMAGE}
                  alt="一幅水彩创作花园：湖畔窗前的画桌、画笔、手绘本与午后熟睡的橘猫"
                  referrerPolicy="no-referrer"
                  onError={() => setHeroImgFailed(true)}
                  className="h-full w-full object-cover object-[82%_center]"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center p-8 text-center text-sm text-[var(--muted)]">
                  水彩创作花园插画
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Unified Scene × Style Tag Gallery (replaces separate duplicate sections) */}
      <section id="artworks" className="mx-auto max-w-[1360px] px-5 py-16 md:px-8">
        <div id="scenarios" className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-medium tracking-widest text-[var(--muted)]">
              画风图鉴 · 场景与标签自由组合
            </p>
            <h2 className="mt-2 font-editorial text-2xl font-semibold text-[var(--ink)] sm:text-3xl">
              一种想法，{activeCatalog.length} 种视觉语言
            </h2>
          </div>
          <div className="relative w-full md:w-72">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="搜索画风名称或关键词"
              placeholder="搜索画风、材质、流派或编号…"
              className="w-full rounded-full border border-[var(--border)] bg-white py-2 pl-10 pr-4 text-xs text-[var(--ink)] placeholder:text-[#96a39b]"
            />
          </div>
        </div>

        {/* Row 1: Application Scene Switcher */}
        <div
          role="tablist"
          aria-label="按应用场景筛选画风"
          className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeScene === 'all'}
            onClick={() => setActiveScene('all')}
            className={`flex cursor-pointer flex-col justify-between rounded-xl border px-3.5 py-3 text-left transition-colors ${
              activeScene === 'all'
                ? 'border-[var(--green)] bg-[var(--green)] text-white shadow-xs'
                : 'border-[var(--border)] bg-white text-[var(--ink)] hover:border-[var(--green)] hover:bg-[#fcfdfb]'
            }`}
          >
            <span className="font-tabular text-[11px] opacity-80">{LAYOUTS.length} 版式</span>
            <span className="mt-1 text-sm font-semibold">全部场景</span>
            <span
              className={`mt-0.5 text-[11px] ${
                activeScene === 'all' ? 'text-white/80' : 'text-[var(--muted)]'
              }`}
            >
              全库 {activeCatalog.length} 款
            </span>
          </button>

          {PURPOSES.map((purpose) => {
            const active = activeScene === purpose.id;
            const layCount = getLayoutsForKind(purpose.id, LAYOUTS).length;
            return (
              <button
                key={purpose.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveScene(purpose.id)}
                className={`flex cursor-pointer flex-col justify-between rounded-xl border px-3.5 py-3 text-left transition-colors ${
                  active
                    ? 'border-[var(--green)] bg-[var(--green)] text-white shadow-xs'
                    : 'border-[var(--border)] bg-white text-[var(--ink)] hover:border-[var(--green)] hover:bg-[#fcfdfb]'
                }`}
              >
                <span className="font-tabular text-[11px] opacity-80">
                  {purpose.usesLayout ? `${layCount} 版式` : '无框纯图'}
                </span>
                <span className="mt-1 text-sm font-semibold">{purpose.label}</span>
                <span
                  className={`mt-0.5 text-[11px] ${
                    active ? 'text-white/80' : 'text-[var(--muted)]'
                  }`}
                >
                  推荐 {purpose.recommendedRatio}
                </span>
              </button>
            );
          })}
        </div>

        {/* Row 2: Unified Style Tag Filter Bar with dynamic counts */}
        <div
          role="tablist"
          aria-label="风格标签筛选"
          className="mt-4 flex flex-wrap items-center gap-1.5"
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
                className={`inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                  active
                    ? 'border-[var(--green)] bg-[#eef5ef] text-[var(--green)] font-semibold'
                    : 'border-[var(--border)] bg-white text-[var(--ink-soft)] hover:border-[#9eb7a6] hover:text-[var(--ink)]'
                }`}
              >
                <span>{tag.label}</span>
                <span
                  className={`font-tabular text-[11px] ${
                    active ? 'text-[var(--green)]/80' : 'text-[var(--muted)]'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Contextual Scene or Tag Guidance Bar */}
        {selectedPurpose ? (
          <div className="mt-4 rounded-2xl border border-[var(--border)] bg-white p-5">
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
              <div className="max-w-3xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-[var(--ink)]">
                    {selectedPurpose.label} · 优先推荐画风
                  </span>
                  <span className="font-tabular text-xs text-[var(--green)]">
                    已按场景重排 · 匹配 {filteredStyles.length} 款
                    {selectedPurpose.usesLayout ? ` · 专属版式 ${sceneLayoutsCount} 套` : ''}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
                  {selectedPurpose.styleGuidanceCn}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onStartCreation({ kind: selectedPurpose.id })}
                className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full bg-[var(--green)] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[var(--green-hover)]"
              >
                <span>以此场景开始创作</span>
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>

            {/* Scene-Specific Layout Strip (visually differentiates 社媒卡片 vs 信息图 vs 漫画分镜 etc.) */}
            {selectedPurpose.usesLayout && sceneLayouts.length > 0 && (
              <div className="mt-4 border-t border-[#f0efe8] pt-3.5">
                <div className="mb-2 flex items-center justify-between text-[11px] text-[var(--muted)]">
                  <span className="font-semibold text-[var(--ink-soft)]">
                    {selectedPurpose.label}专属版式示例（共 {sceneLayoutsCount} 套）
                  </span>
                  <span>进入工作台可自由切换或留空自动构图</span>
                </div>
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                  {sceneLayouts.slice(0, 4).map((layout) => (
                    <button
                      key={layout.id}
                      type="button"
                      onClick={() => onStartCreation({ kind: selectedPurpose.id })}
                      className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-[var(--border)] bg-[#fafbf8] p-2 text-left transition-colors hover:border-[var(--green)] hover:bg-white"
                    >
                      <LayoutSchematic
                        layout={layout}
                        fit="contain"
                        className="h-12 w-12 shrink-0 rounded-lg p-0.5"
                      />
                      <div className="min-w-0 flex-1">
                        <span className="block font-tabular text-[10px] text-[var(--muted)]">
                          {layout.id}
                        </span>
                        <span className="block truncate text-xs font-medium text-[var(--ink)]">
                          {layout.title}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-4 flex flex-col justify-between gap-2 rounded-2xl border border-[var(--border)] bg-white px-5 py-3.5 sm:flex-row sm:items-center">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-[var(--ink)]">
                  全部场景 · {selectedTag.label}
                </span>
                <span className="font-tabular text-xs text-[var(--green)]">
                  当前展示 {filteredStyles.length} 款
                </span>
              </div>
              <p className="mt-0.5 text-xs leading-relaxed text-[var(--muted)]">
                {selectedTag.summaryCn}
              </p>
            </div>
            {activeTagId !== 'all' && (
              <button
                type="button"
                onClick={() => setActiveTagId('all')}
                className="shrink-0 cursor-pointer whitespace-nowrap text-xs font-medium text-[var(--green)] hover:underline underline-offset-2"
              >
                返回全部风格
              </button>
            )}
          </div>
        )}

        {/* Unified Style Cards Grid */}
        {visibleStyles.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-[var(--border)] bg-white py-16 text-center">
            <p className="text-sm font-medium text-[var(--ink)]">当前筛选条件下暂无匹配画风</p>
            <button
              type="button"
              onClick={() => {
                setActiveScene('all');
                setActiveTagId('all');
                setSearchQuery('');
              }}
              className="mt-3 cursor-pointer rounded-lg border border-[var(--border)] px-4 py-2 text-xs font-medium text-[var(--green)] hover:bg-[var(--light)]"
            >
              重置全部筛选条件
            </button>
          </div>
        ) : (
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {visibleStyles.map((style) => {
              const categoryTag = STYLE_CATEGORY_TAG_LABELS[style.category] ?? '特色画风';
              const displaySceneKind =
                activeScene !== 'all' && style.recommendedKinds.includes(activeScene)
                  ? activeScene
                  : style.recommendedKinds[0];
              const primarySceneLabel = PURPOSES.find((p) => p.id === displaySceneKind)?.label;
              return (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => setActiveStyle(style)}
                  className="group flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-white text-left transition-colors hover:border-[var(--green)]"
                >
                  <StyleArtwork style={style} fit="contain" className="h-48 w-full p-2" />
                  <div className="flex flex-1 flex-col justify-between border-t border-[#f0efe8] p-4">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="truncate text-sm font-semibold text-[var(--ink)] group-hover:text-[var(--green)]">
                          {style.title}
                        </h3>
                        <span className="shrink-0 font-tabular text-[11px] text-[var(--muted)]">
                          {style.id}
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[var(--muted)]">
                        {style.description}
                      </p>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2 pt-1">
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                        <span className="rounded bg-[#eef5ef] px-2 py-0.5 font-medium text-[var(--green)]">
                          {categoryTag}
                        </span>
                        {primarySceneLabel && (
                          <span className="rounded bg-[#f4f5f0] px-2 py-0.5 text-[var(--muted)]">
                            {primarySceneLabel}
                          </span>
                        )}
                      </div>
                      <span className="shrink-0 text-xs font-medium text-[var(--green)]">
                        看大图
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Unified Pagination Bar */}
        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-white px-5 py-3.5">
            <button
              type="button"
              disabled={safePage <= 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="inline-flex cursor-pointer items-center gap-1 whitespace-nowrap rounded-lg border border-[var(--border)] bg-white px-3.5 py-2 text-xs font-medium text-[var(--ink)] hover:bg-[var(--light)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
              <span>上一批</span>
            </button>

            <span className="font-tabular text-xs text-[var(--muted)]">
              第 {safePage + 1} / {totalPages} 页 · 共 {filteredStyles.length} 款画风
            </span>

            <button
              type="button"
              disabled={safePage + 1 >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              className="inline-flex cursor-pointer items-center gap-1 whitespace-nowrap rounded-lg border border-[var(--border)] bg-white px-3.5 py-2 text-xs font-medium text-[var(--ink)] hover:bg-[var(--light)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span>下一批</span>
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        )}
      </section>

      {/* Dual Creation Mode Section */}
      <section className="border-t border-[var(--border)] bg-white py-16">
        <div className="mx-auto max-w-[1360px] px-5 md:px-8">
          <div className="grid gap-10 rounded-3xl border border-[var(--border)] bg-[var(--bg)] p-8 md:p-12 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-6">
              <p className="text-xs font-medium tracking-widest text-[var(--muted)]">
                从灵感到成品
              </p>
              <h2 className="mt-2 font-editorial text-2xl font-semibold leading-snug text-[var(--ink)] sm:text-3xl">
                下一幅画，从你的一句话开始。
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-[var(--ink-soft)]">
                不必背诵复杂参数。选定应用场景，系统自动匹配最对味的版式与画风 Skill，一键产出可直接用于即梦、Midjourney 与 GPT-4o 的专业提示词。
              </p>
            </div>

            <div className="lg:col-span-6">
              <div
                role="tablist"
                aria-label="创作方式说明"
                className="inline-flex rounded-xl bg-[var(--light)] p-1"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'prompt'}
                  onClick={() => setActiveTab('prompt')}
                  className={`cursor-pointer whitespace-nowrap rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${
                    activeTab === 'prompt'
                      ? 'bg-white text-[var(--ink)] shadow-xs'
                      : 'text-[var(--muted)] hover:text-[var(--ink)]'
                  }`}
                >
                  生成提示词（已开放）
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'image'}
                  onClick={() => setActiveTab('image')}
                  className={`cursor-pointer whitespace-nowrap rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${
                    activeTab === 'image'
                      ? 'bg-white text-[var(--ink)] shadow-xs'
                      : 'text-[var(--muted)] hover:text-[var(--ink)]'
                  }`}
                >
                  站内直接生图（即将开放）
                </button>
              </div>

              <div role="tabpanel" className="mt-5">
                {activeTab === 'prompt' ? (
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--ink)]">
                      全库 {activeCatalog.length} 款画风 Skill，一键适配多款生图工具
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                      支持 AI 智能润色与结构化极速生成，自动注入当前场景构图纪律与对应风格 Skill 指令，提供「中文通用」「Midjourney 英文」「去作者名安全版」三种格式切换。
                    </p>
                  </div>
                ) : (
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--ink)]">
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
                  className="mt-6 inline-flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-full bg-[var(--green)] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--green-hover)]"
                >
                  <span>开始这一幅</span>
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Full-Size Uncropped Style Detail Lightbox */}
      {activeStyle && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="landing-style-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#183628]/55 p-4 backdrop-blur-xs"
          onClick={() => setActiveStyle(null)}
        >
          <div
            className="flex max-h-[92dvh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-[var(--border)] px-6 py-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 id="landing-style-title" className="truncate text-lg font-semibold text-[var(--ink)]">
                    {activeStyle.title}
                  </h2>
                  <span className="rounded bg-[#eef5ef] px-2 py-0.5 text-[11px] font-medium text-[var(--green)]">
                    {STYLE_CATEGORY_TAG_LABELS[activeStyle.category] ?? '特色画风'}
                  </span>
                </div>
                <p className="mt-0.5 truncate font-tabular text-xs text-[var(--muted)]">
                  {activeStyle.id} · {activeStyle.englishName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveStyle(null)}
                aria-label="关闭画风详情"
                className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-[var(--border)] text-[var(--ink)] transition-colors hover:bg-[var(--light)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid min-h-0 flex-1 overflow-y-auto md:grid-cols-12 md:overflow-hidden">
              {/* Left Full Uncropped Artwork Stage */}
              <div className="flex items-center justify-center bg-[#f6f5ef] p-4 md:col-span-7 md:border-r md:border-[var(--border)] md:p-6">
                <StyleArtwork
                  style={activeStyle}
                  fit="contain"
                  className="h-[340px] w-full rounded-xl bg-transparent sm:h-[420px] md:h-[min(64dvh,560px)]"
                />
              </div>

              {/* Right Details & Tags Panel */}
              <div className="subtle-scroll flex flex-col justify-between p-6 md:col-span-5 md:overflow-y-auto">
                <div className="space-y-4">
                  <div>
                    <p className="text-[11px] font-semibold tracking-wider text-[var(--muted)]">
                      画风说明
                    </p>
                    <p className="mt-1.5 text-sm leading-relaxed text-[var(--ink-soft)]">
                      {activeStyle.description}
                    </p>
                  </div>

                  <div>
                    <p className="text-[11px] font-semibold tracking-wider text-[var(--muted)]">
                      核心笔触与媒介特征
                    </p>
                    <p className="mt-1.5 text-xs leading-relaxed text-[var(--ink-soft)]">
                      {activeStyle.visualTraitsCn}
                    </p>
                  </div>

                  <div>
                    <p className="text-[11px] font-semibold tracking-wider text-[var(--muted)]">
                      适配应用场景标签
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {activeStyle.recommendedKinds.map((k) => {
                        const label = PURPOSES.find((p) => p.id === k)?.label;
                        if (!label) return null;
                        return (
                          <span
                            key={k}
                            className="rounded-md border border-[var(--border)] bg-[#fafbf8] px-2.5 py-1 text-xs font-medium text-[var(--ink)]"
                          >
                            {label}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] bg-[#fafbf8] px-6 py-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={activeStyleIndex <= 0}
                  onClick={() =>
                    activeStyleIndex > 0 && setActiveStyle(filteredStyles[activeStyleIndex - 1])
                  }
                  aria-label="上一个画风"
                  className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-xs font-medium text-[var(--ink)] hover:bg-[var(--light)] disabled:cursor-not-allowed disabled:opacity-40"
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
                  className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-xs font-medium text-[var(--ink)] hover:bg-[var(--light)] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <span>下一个</span>
                  <ChevronRight className="h-3.5 w-3.5" />
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
                className="inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full bg-[var(--green)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--green-hover)]"
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
