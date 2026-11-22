import { useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Plus,
  RotateCcw,
  Save,
  Search,
  Star,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  ASPECT_RATIOS,
  COLOR_PALETTES,
  PURPOSES,
  STYLE_CATEGORIES,
  STYLE_SOURCE_REPOS,
  STYLES as DEFAULT_STYLES,
} from '../data/catalog';
import { formatStyleSkillMarkdown } from '../utils/promptEngine';
import { StyleArtwork } from './CatalogArtwork';
import type {
  ConcreteStyleCategory,
  PurposeKind,
  StyleItem,
  StyleSourceRepo,
} from '../types';

interface SkillAdminViewProps {
  adminToken: string;
  skills: StyleItem[];
  onSkillsUpdated: (nextSkills: StyleItem[]) => void;
  onTryInWorkbench: (styleId: string) => void;
  onAdminUnauthorized?: () => void;
}

const ADMIN_PAGE_SIZE = 20;

const EDITABLE_CATEGORIES = STYLE_CATEGORIES.filter(
  (c): c is { id: ConcreteStyleCategory; label: string; repo?: StyleSourceRepo } =>
    c.id !== 'all' && c.id !== 'featured'
);

const FEATURED_COVER_SAMPLES = DEFAULT_STYLES.filter((s) => s.featured);
const BUILTIN_IDS = new Set(DEFAULT_STYLES.map((s) => s.id));

const SAMPLE_SKILL_MD = `---
id: CS-201
title: 昭和复古汽水海报
englishName: Showa Retro Cream Soda Poster
category: fd-japanese
sourceRepo: custom
defaultRatio: 3:4
defaultColorId: C-07
description: 1980年代日本昭和夏日复古广告画风，带有清爽汽水绿、柔焦彩铅噪点与怀旧阳光。
---

# 昭和复古汽水海报

## Visual Traits (CN)
1980年代昭和夏日复古插画、轻微胶片颗粒与空气刷柔光、蒂芙尼蓝与奶油白配色、清爽玻璃高光

## Visual Traits (EN)
1980s Showa era Japanese retro summer poster illustration, gentle airbrush grain, sunlit glass soda highlights, nostalgic mint and cream tones

## Skill System Instructions
以昭和夏日喫茶店与海边公路海报为灵感，画面光影清亮通透，重点表现玻璃杯折射与蓬松积雨云，整体叠一层轻微复古印刷噪点。

## Negative Prompt
暗黑压抑色调、3D塑料渲染、杂乱水印、过度锐化写实
`;

export function SkillAdminView({
  adminToken,
  skills,
  onSkillsUpdated,
  onTryInWorkbench,
  onAdminUnauthorized,
}: SkillAdminViewProps) {
  const authHeaders = (json = false): Record<string, string> => ({
    ...(json ? { 'Content-Type': 'application/json' } : {}),
    Authorization: `Bearer ${adminToken}`,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<StyleSourceRepo | 'all'>('all');
  const [sceneFilter, setSceneFilter] = useState<PurposeKind | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<ConcreteStyleCategory | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'enabled' | 'disabled'>('all');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string>(() => skills[0]?.id ?? 'FA-001');
  const [activeOverrideScene, setActiveOverrideScene] = useState<PurposeKind>('social-card');

  const [formState, setFormState] = useState<StyleItem | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusToast, setStatusToast] = useState<{ ok: boolean; text: string } | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importRaw, setImportRaw] = useState('');
  const [busyAction, setBusyAction] = useState(false);

  const [newSkillForm, setNewSkillForm] = useState({
    id: '',
    title: '',
    englishName: '',
    category: 'fa-editorial' as ConcreteStyleCategory,
    referenceArtist: '',
    description: '',
    visualTraitsCn: '',
    visualTraitsEn: '',
    skillSystemPrompt: '',
    negativePrompt: '3D渲染、塑料光泽、高饱和霓虹色、杂乱水印',
    defaultRatio: '3:4',
    defaultColorId: 'C-10',
    image: DEFAULT_STYLES[0].image,
  });

  const visibleCategoryOptions = useMemo(() => {
    if (sourceFilter === 'all' || sourceFilter === 'custom') return EDITABLE_CATEGORIES;
    return EDITABLE_CATEGORIES.filter((c) => c.repo === sourceFilter);
  }, [sourceFilter]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, sourceFilter, sceneFilter, categoryFilter, statusFilter]);

  const filteredSkills = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return skills.filter((item) => {
      if (sourceFilter !== 'all' && item.sourceRepo !== sourceFilter) return false;
      if (sceneFilter !== 'all' && !item.recommendedKinds.includes(sceneFilter)) return false;
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
      if (statusFilter === 'enabled' && !item.enabled) return false;
      if (statusFilter === 'disabled' && item.enabled) return false;
      if (!q) return true;
      return `${item.id} ${item.title} ${item.englishName} ${item.visualTraitsCn} ${item.skillSystemPrompt} ${item.sourceRepo} ${item.category}`
        .toLowerCase()
        .includes(q);
    });
  }, [skills, searchQuery, sourceFilter, sceneFilter, categoryFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredSkills.length / ADMIN_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedSkills = useMemo(() => {
    const start = (safePage - 1) * ADMIN_PAGE_SIZE;
    return filteredSkills.slice(start, start + ADMIN_PAGE_SIZE);
  }, [filteredSkills, safePage]);

  const selectedSkill = useMemo(
    () => skills.find((s) => s.id === selectedId) ?? filteredSkills[0] ?? skills[0] ?? null,
    [skills, selectedId, filteredSkills]
  );

  useEffect(() => {
    if (selectedSkill) {
      setFormState({
        ...selectedSkill,
        recommendedKinds: [...selectedSkill.recommendedKinds],
        palettePreview: [...selectedSkill.palettePreview] as [string, string, string],
        sceneOverrides: selectedSkill.sceneOverrides ? { ...selectedSkill.sceneOverrides } : {},
      });
      setActiveOverrideScene(selectedSkill.recommendedKinds[0] ?? 'social-card');
      setIsDirty(false);
    }
  }, [selectedSkill?.id, selectedSkill?.updatedAt, selectedSkill?.enabled, selectedSkill?.featured]);

  const showToast = (ok: boolean, text: string) => {
    setStatusToast({ ok, text });
    window.setTimeout(() => {
      setStatusToast((prev) => (prev?.text === text ? null : prev));
    }, 3200);
  };

  const counts = useMemo(
    () => ({
      total: skills.length,
      enabled: skills.filter((s) => s.enabled).length,
      handrawStyle: skills.filter((s) => s.sourceRepo === 'handraw-style').length,
      gemskills: skills.filter((s) => s.sourceRepo === 'gemskills').length,
      custom: skills.filter((s) => s.sourceRepo === 'custom').length,
    }),
    [skills]
  );

  const patchForm = <K extends keyof StyleItem>(key: K, value: StyleItem[K]) => {
    setFormState((prev) => (prev ? { ...prev, [key]: value } : prev));
    setIsDirty(true);
  };

  const patchSceneOverride = (scene: PurposeKind, value: string) => {
    setFormState((prev) => {
      if (!prev) return prev;
      const nextOverrides = { ...(prev.sceneOverrides ?? {}) };
      if (value.trim()) {
        nextOverrides[scene] = value;
      } else {
        delete nextOverrides[scene];
      }
      return { ...prev, sceneOverrides: nextOverrides };
    });
    setIsDirty(true);
  };

  const toggleRecommendedKind = (kind: PurposeKind) => {
    if (!formState) return;
    const exists = formState.recommendedKinds.includes(kind);
    const next = exists
      ? formState.recommendedKinds.filter((k) => k !== kind)
      : [...formState.recommendedKinds, kind];
    if (next.length === 0) return;
    patchForm('recommendedKinds', next);
  };

  const handleQuickToggle = async (skill: StyleItem, field: 'enabled' | 'featured') => {
    try {
      const res = await fetch(`/api/skills/${encodeURIComponent(skill.id)}`, {
        method: 'PUT',
        headers: authHeaders(true),
        body: JSON.stringify({ [field]: !skill[field] }),
      });
      if (res.status === 401) {
        onAdminUnauthorized?.();
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        showToast(false, data.message || '状态更新失败。');
        return;
      }
      onSkillsUpdated(data.skills);
      showToast(
        true,
        field === 'enabled'
          ? `已${!skill.enabled ? '启用' : '停用'}「${skill.title}」`
          : `已${!skill.featured ? '设为精选' : '取消精选'}「${skill.title}」`
      );
    } catch {
      showToast(false, '网络请求失败，未能保存开关状态。');
    }
  };

  const handleSaveSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/skills/${encodeURIComponent(formState.id)}`, {
        method: 'PUT',
        headers: authHeaders(true),
        body: JSON.stringify(formState),
      });
      if (res.status === 401) {
        onAdminUnauthorized?.();
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        showToast(false, data.message || '保存配置失败。');
        return;
      }
      onSkillsUpdated(data.skills);
      setIsDirty(false);
      showToast(true, `已保存「${formState.title}」Skill 配置，工作台与提示词引擎已即时生效。`);
    } catch {
      showToast(false, '网络请求失败，请稍后重试。');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkillForm.title.trim()) {
      showToast(false, '请填写风格中文名称。');
      return;
    }
    setBusyAction(true);
    try {
      const res = await fetch('/api/skills', {
        method: 'POST',
        headers: authHeaders(true),
        body: JSON.stringify({
          ...newSkillForm,
          sourceRepo: 'custom',
          enabled: true,
        }),
      });
      if (res.status === 401) {
        onAdminUnauthorized?.();
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        showToast(false, data.message || '新建风格 Skill 失败。');
        return;
      }
      onSkillsUpdated(data.skills);
      setSelectedId(data.skill.id);
      setCreateOpen(false);
      setNewSkillForm({
        id: '',
        title: '',
        englishName: '',
        category: 'fa-editorial',
        referenceArtist: '',
        description: '',
        visualTraitsCn: '',
        visualTraitsEn: '',
        skillSystemPrompt: '',
        negativePrompt: '3D渲染、塑料光泽、高饱和霓虹色、杂乱水印',
        defaultRatio: '3:4',
        defaultColorId: 'C-10',
        image: DEFAULT_STYLES[0].image,
      });
      showToast(true, `已新建自定义风格 Skill「${data.skill.title}」。`);
    } catch {
      showToast(false, '创建请求异常，请重试。');
    } finally {
      setBusyAction(false);
    }
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importRaw.trim()) {
      showToast(false, '请先粘贴 JSON 或 SKILL.md 文本。');
      return;
    }
    setBusyAction(true);
    try {
      const res = await fetch('/api/skills/import', {
        method: 'POST',
        headers: authHeaders(true),
        body: JSON.stringify({ payload: importRaw }),
      });
      if (res.status === 401) {
        onAdminUnauthorized?.();
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        showToast(false, data.message || '导入解析失败。');
        return;
      }
      onSkillsUpdated(data.skills);
      if (data.skills[0]) setSelectedId(data.skills[0].id);
      setImportOpen(false);
      setImportRaw('');
      showToast(true, `成功导入并合并 ${data.importedCount} 个风格 Skill 配置。`);
    } catch {
      showToast(false, '导入请求失败，请检查网络。');
    } finally {
      setBusyAction(false);
    }
  };

  const handleDeleteSkill = async (skill: StyleItem) => {
    setBusyAction(true);
    try {
      const res = await fetch(`/api/skills/${encodeURIComponent(skill.id)}`, {
        method: 'DELETE',
        headers: authHeaders(false),
      });
      if (res.status === 401) {
        onAdminUnauthorized?.();
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        showToast(false, data.message || '删除失败。');
        return;
      }
      onSkillsUpdated(data.skills);
      setSelectedId(data.skills[0]?.id ?? 'FA-001');
      showToast(true, `已删除自定义风格「${skill.title}」。`);
    } catch {
      showToast(false, '删除请求异常。');
    } finally {
      setBusyAction(false);
    }
  };

  const handleResetDefaults = async () => {
    setBusyAction(true);
    try {
      const res = await fetch('/api/skills/reset', {
        method: 'POST',
        headers: authHeaders(false),
      });
      if (res.status === 401) {
        onAdminUnauthorized?.();
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        showToast(false, '重置失败，请重试。');
        return;
      }
      onSkillsUpdated(data.skills);
      setSelectedId(data.skills[0]?.id ?? 'FA-001');
      showToast(true, `已恢复全部 ${DEFAULT_STYLES.length} 个默认内置风格 Skill 配置（handraw-style 372 + gemskills 170）。`);
    } catch {
      showToast(false, '重置请求异常。');
    } finally {
      setBusyAction(false);
    }
  };

  const handleExportSkillMd = (skill: StyleItem) => {
    const md = formatStyleSkillMarkdown(skill);
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SKILL-${skill.id}.md`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(true, `已导出 ${skill.id} 的标准 SKILL.md 配置文件。`);
  };

  return (
    <div className="mx-auto max-w-[1360px] px-4 py-6 md:px-8">
      {/* Top Header & Primary Actions */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--border)] pb-5">
        <div>
          <p className="text-xs font-medium tracking-widest text-[var(--muted)]">
            插画风格 SKILL 管理后台
          </p>
          <h1 className="mt-1 font-editorial text-2xl font-semibold text-[var(--ink)] sm:text-3xl">
            风格 Skill 配置中心
          </h1>
          <p className="mt-1.5 text-xs text-[var(--muted)]">
            统一管理来自 <span className="font-medium text-[var(--ink-soft)]">yang0/handraw-style</span> 与{' '}
            <span className="font-medium text-[var(--ink-soft)]">b-open-io/gemskills</span> 的全部插画风格指令、负向约束与启停状态，修改后即时同步至工作台。
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setImportOpen(true)}
            className="inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-xl border border-[var(--border)] bg-white px-3.5 py-2 text-xs font-medium text-[var(--ink)] hover:border-[var(--green)] hover:bg-[var(--light)]"
          >
            <Upload className="h-3.5 w-3.5" aria-hidden="true" />
            <span>导入 SKILL.md / JSON</span>
          </button>
          <button
            type="button"
            disabled={busyAction}
            onClick={handleResetDefaults}
            className="inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-xl border border-[var(--border)] bg-white px-3.5 py-2 text-xs font-medium text-[var(--ink-soft)] hover:bg-[var(--light)] disabled:opacity-50"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>恢复默认库</span>
          </button>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-xl bg-[var(--green)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--green-hover)]"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            <span>新建风格 Skill</span>
          </button>
        </div>
      </div>

      {/* Inline Toast Feedback */}
      {statusToast && (
        <div
          role="status"
          className={`mt-4 flex items-center justify-between rounded-xl border px-4 py-2.5 text-xs font-medium ${
            statusToast.ok
              ? 'border-[#c5dccb] bg-[#f0f7f2] text-[var(--green)]'
              : 'border-[#e7c3be] bg-[#fdf4f3] text-[#9e3124]'
          }`}
        >
          <span>{statusToast.text}</span>
          <button
            type="button"
            onClick={() => setStatusToast(null)}
            aria-label="关闭提示"
            className="cursor-pointer opacity-70 hover:opacity-100"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Compact Summary Metrics Bar */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { label: '风格 Skill 总数', value: counts.total, fullOnMobile: true },
          { label: '已启用上线', value: counts.enabled, fullOnMobile: false },
          { label: 'handraw-style', value: counts.handrawStyle, fullOnMobile: false },
          { label: 'gemskills', value: counts.gemskills, fullOnMobile: false },
          { label: '自定义扩展', value: counts.custom, fullOnMobile: false },
        ].map((metric) => (
          <div
            key={metric.label}
            className={`rounded-xl border border-[var(--border)] bg-white px-4 py-3 ${
              metric.fullOnMobile ? 'col-span-2 sm:col-span-1' : ''
            }`}
          >
            <p className="text-[11px] text-[var(--muted)]">{metric.label}</p>
            <p className="font-tabular mt-1 text-xl font-bold text-[var(--ink)]">{metric.value}</p>
          </div>
        ))}
      </div>

      {/* Main Master-Detail Split Layout */}
      <div className="mt-6 grid items-start gap-6 lg:grid-cols-12">
        {/* Left List Column */}
        <aside className="flex flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-white lg:col-span-4 lg:max-h-[calc(100dvh-140px)]">
          <div className="shrink-0 space-y-3 border-b border-[var(--border)] p-4">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted)]"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="搜索风格 Skill"
                placeholder="搜索编号、名称、来源或指令关键词…"
                className="w-full rounded-xl border border-[var(--border)] bg-[#fafbf8] py-2 pl-9 pr-3 text-xs text-[var(--ink)] placeholder:text-[#96a39b]"
              />
            </div>

            <div className="flex flex-wrap gap-1.5">
              {STYLE_SOURCE_REPOS.map((src) => (
                <button
                  key={src.id}
                  type="button"
                  onClick={() => {
                    setSourceFilter(src.id);
                    setCategoryFilter('all');
                  }}
                  className={`cursor-pointer whitespace-nowrap rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    sourceFilter === src.id
                      ? 'bg-[var(--green)] text-white'
                      : 'bg-[var(--light)] text-[var(--ink-soft)] hover:bg-[#e3ece0]'
                  }`}
                >
                  {src.label}
                </button>
              ))}
            </div>

            {/* Scene & Family dropdown filters */}
            <div className="grid grid-cols-2 gap-2">
              <select
                aria-label="按应用场景筛选"
                value={sceneFilter}
                onChange={(e) => setSceneFilter(e.target.value as PurposeKind | 'all')}
                className="w-full rounded-lg border border-[var(--border)] bg-[#fafbf8] px-2.5 py-1.5 text-[11px] text-[var(--ink)]"
              >
                <option value="all">全部应用场景</option>
                {PURPOSES.map((p) => (
                  <option key={p.id} value={p.id}>
                    适配 · {p.label}
                  </option>
                ))}
              </select>

              <select
                aria-label="按风格流派筛选"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as ConcreteStyleCategory | 'all')}
                className="w-full rounded-lg border border-[var(--border)] bg-[#fafbf8] px-2.5 py-1.5 text-[11px] text-[var(--ink)]"
              >
                <option value="all">全部 19 个风格家族</option>
                {visibleCategoryOptions.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-between text-[11px] text-[var(--muted)]">
              <div className="inline-flex gap-1">
                {[
                  { id: 'all' as const, label: '全部状态' },
                  { id: 'enabled' as const, label: '仅已启用' },
                  { id: 'disabled' as const, label: '已停用' },
                ].map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setStatusFilter(st.id)}
                    className={`cursor-pointer rounded px-2 py-0.5 transition-colors ${
                      statusFilter === st.id
                        ? 'bg-[#e6ede3] font-semibold text-[var(--ink)]'
                        : 'hover:text-[var(--ink)]'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
              <span className="font-tabular">{filteredSkills.length} 项</span>
            </div>
          </div>

          <div className="subtle-scroll min-h-[280px] flex-1 divide-y divide-[#eef1ea] overflow-y-auto">
            {pagedSkills.length === 0 ? (
              <div className="p-8 text-center text-xs text-[var(--muted)]">
                没有匹配的风格 Skill
              </div>
            ) : (
              pagedSkills.map((item) => {
                const active = selectedSkill?.id === item.id;
                const overrideCount = Object.values(item.sceneOverrides ?? {}).filter((v) => v?.trim()).length;
                return (
                  <div
                    key={item.id}
                    className={`flex items-center gap-3 px-3.5 py-3 transition-colors ${
                      active ? 'bg-[#f2f7f1]' : 'hover:bg-[#fafbf8]'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedId(item.id)}
                      className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left"
                    >
                      <StyleArtwork
                        style={item}
                        className={`h-11 w-11 shrink-0 rounded-lg ${!item.enabled ? 'opacity-45 grayscale' : ''}`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-xs font-semibold text-[var(--ink)]">
                            {item.title}
                          </span>
                          {item.featured && (
                            <Star
                              className="h-3 w-3 shrink-0 fill-[#d69b38] text-[#d69b38]"
                              aria-label="精选推荐"
                            />
                          )}
                        </div>
                        <p className="mt-0.5 truncate font-tabular text-[11px] text-[var(--muted)]">
                          {item.id} · {item.recommendedKinds.length}场景
                          {overrideCount > 0 ? ` · ${overrideCount}专属规则` : ''}
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={item.enabled}
                      aria-label={`${item.enabled ? '停用' : '启用'} ${item.title}`}
                      onClick={() => handleQuickToggle(item, 'enabled')}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
                        item.enabled ? 'bg-[var(--green)]' : 'bg-[#cfd6d0]'
                      }`}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                          item.enabled ? 'translate-x-[18px]' : 'translate-x-[3px]'
                        }`}
                      />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Left list pagination footer */}
          {totalPages > 1 && (
            <div className="flex shrink-0 items-center justify-between border-t border-[var(--border)] bg-[#fafbf8] px-3.5 py-2.5 text-[11px] text-[var(--muted)]">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex cursor-pointer items-center gap-0.5 rounded-lg border border-[var(--border)] bg-white px-2.5 py-1 font-medium text-[var(--ink)] hover:bg-[var(--light)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
                <span>上一页</span>
              </button>
              <span className="font-tabular">
                第 {safePage} / {totalPages} 页
              </span>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="inline-flex cursor-pointer items-center gap-0.5 rounded-lg border border-[var(--border)] bg-white px-2.5 py-1 font-medium text-[var(--ink)] hover:bg-[var(--light)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span>下一页</span>
                <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          )}
        </aside>

        {/* Right Detail Editor Panel */}
        <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white lg:col-span-8">
          {!formState ? (
            <div className="p-12 text-center text-sm text-[var(--muted)]">
              请从左侧选择一个插画风格 Skill 进行配置
            </div>
          ) : (
            <form onSubmit={handleSaveSkill} className="flex flex-col">
              {/* Editor Top Banner */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border)] bg-[#fafbf8] px-6 py-4">
                <div className="flex items-center gap-3.5">
                  <StyleArtwork style={formState} className="h-14 w-14 shrink-0 rounded-xl border border-black/5" />
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-semibold text-[var(--ink)]">{formState.title}</h2>
                      <span className="font-tabular text-xs text-[var(--muted)]">{formState.id}</span>
                      <span className="text-[11px] text-[var(--green)]">· {formState.sourceRepo}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-[var(--muted)]">
                      {formState.englishName}
                      {formState.updatedAt ? ` · 最近更新 ${formState.updatedAt}` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {isDirty && (
                    <button
                      type="submit"
                      disabled={saving}
                      className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-[var(--green)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--green-hover)] disabled:opacity-50"
                    >
                      <Save className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>{saving ? '保存中…' : '保存改动'}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleQuickToggle(formState, 'featured')}
                    className={`inline-flex cursor-pointer items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                      formState.featured
                        ? 'border-[#d69b38] bg-[#fdf8ed] text-[#9b6c1c]'
                        : 'border-[var(--border)] bg-white text-[var(--ink-soft)] hover:bg-[var(--light)]'
                    }`}
                  >
                    <Star className={`h-3.5 w-3.5 ${formState.featured ? 'fill-current' : ''}`} />
                    <span>{formState.featured ? '首页精选' : '设为精选'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExportSkillMd(formState)}
                    className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 text-xs font-medium text-[var(--ink)] hover:bg-[var(--light)]"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>导出 SKILL.md</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onTryInWorkbench(formState.id)}
                    className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-[var(--green)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--green)] hover:bg-[var(--light)]"
                  >
                    <span>在工作台试用</span>
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </button>
                  {!BUILTIN_IDS.has(formState.id) && (
                    <button
                      type="button"
                      disabled={busyAction}
                      onClick={() => handleDeleteSkill(formState)}
                      aria-label={`删除 ${formState.title}`}
                      className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-[#e7c3be] bg-white px-3 py-1.5 text-xs font-medium text-[#9e3124] hover:bg-[#fdf4f3]"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>删除</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Editor Form Body */}
              <div className="space-y-5 p-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="skill-title" className="mb-1 block text-xs font-semibold text-[var(--ink)]">
                      风格中文名称
                    </label>
                    <input
                      id="skill-title"
                      type="text"
                      value={formState.title}
                      onChange={(e) => patchForm('title', e.target.value)}
                      className="w-full rounded-xl border border-[var(--border)] bg-white px-3.5 py-2 text-sm text-[var(--ink)]"
                    />
                  </div>
                  <div>
                    <label htmlFor="skill-en" className="mb-1 block text-xs font-semibold text-[var(--ink)]">
                      英文名称（用于 Midjourney 提示词）
                    </label>
                    <input
                      id="skill-en"
                      type="text"
                      value={formState.englishName}
                      onChange={(e) => patchForm('englishName', e.target.value)}
                      className="w-full rounded-xl border border-[var(--border)] bg-white px-3.5 py-2 text-sm text-[var(--ink)]"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label htmlFor="skill-category" className="mb-1 block text-xs font-semibold text-[var(--ink)]">
                      画风分类
                    </label>
                    <select
                      id="skill-category"
                      value={formState.category}
                      onChange={(e) =>
                        patchForm('category', e.target.value as ConcreteStyleCategory)
                      }
                      className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-xs text-[var(--ink)]"
                    >
                      {EDITABLE_CATEGORIES.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="skill-ratio" className="mb-1 block text-xs font-semibold text-[var(--ink)]">
                      默认推荐画幅
                    </label>
                    <select
                      id="skill-ratio"
                      value={formState.defaultRatio || '3:4'}
                      onChange={(e) => patchForm('defaultRatio', e.target.value)}
                      className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-xs text-[var(--ink)]"
                    >
                      {ASPECT_RATIOS.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="skill-color" className="mb-1 block text-xs font-semibold text-[var(--ink)]">
                      默认搭配主色
                    </label>
                    <select
                      id="skill-color"
                      value={formState.defaultColorId || 'C-10'}
                      onChange={(e) => patchForm('defaultColorId', e.target.value)}
                      className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-xs text-[var(--ink)]"
                    >
                      {COLOR_PALETTES.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.id} · {c.name} ({c.hex})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Core Skill System Prompt */}
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <label
                      htmlFor="skill-system-prompt"
                      className="text-xs font-semibold text-[var(--ink)]"
                    >
                      核心 Skill 系统指令（直接注入 AI 润色与结构化提示词）
                    </label>
                    <span className="font-tabular text-[11px] text-[var(--muted)]">
                      {formState.skillSystemPrompt.length} / 1200
                    </span>
                  </div>
                  <textarea
                    id="skill-system-prompt"
                    rows={4}
                    value={formState.skillSystemPrompt}
                    onChange={(e) => patchForm('skillSystemPrompt', e.target.value)}
                    placeholder="定义该画风的笔触执行逻辑、材质表现、留白与光影规则…"
                    className="w-full rounded-xl border border-[var(--border)] bg-[#fcfdfb] px-3.5 py-2.5 text-sm leading-relaxed text-[var(--ink)]"
                  />
                </div>

                {/* Negative Prompt */}
                <div>
                  <label htmlFor="skill-negative" className="mb-1 block text-xs font-semibold text-[var(--ink)]">
                    负向规避规则（Negative Prompt / 禁止元素）
                  </label>
                  <input
                    id="skill-negative"
                    type="text"
                    value={formState.negativePrompt}
                    onChange={(e) => patchForm('negativePrompt', e.target.value)}
                    placeholder="例如：3D渲染、塑料光泽、高饱和霓虹色、杂乱水印"
                    className="w-full rounded-xl border border-[var(--border)] bg-white px-3.5 py-2 text-xs text-[var(--ink)]"
                  />
                </div>

                {/* Visual Traits CN / EN */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="skill-traits-cn" className="mb-1 block text-xs font-semibold text-[var(--ink)]">
                      中文视觉笔触特征
                    </label>
                    <textarea
                      id="skill-traits-cn"
                      rows={3}
                      value={formState.visualTraitsCn}
                      onChange={(e) => patchForm('visualTraitsCn', e.target.value)}
                      className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-xs leading-relaxed text-[var(--ink)]"
                    />
                  </div>
                  <div>
                    <label htmlFor="skill-traits-en" className="mb-1 block text-xs font-semibold text-[var(--ink)]">
                      英文视觉特征（Midjourney / Flux）
                    </label>
                    <textarea
                      id="skill-traits-en"
                      rows={3}
                      value={formState.visualTraitsEn}
                      onChange={(e) => patchForm('visualTraitsEn', e.target.value)}
                      className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-xs leading-relaxed text-[var(--ink)]"
                    />
                  </div>
                </div>

                {/* Description & Reference Artist */}
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="sm:col-span-2">
                    <label htmlFor="skill-desc" className="mb-1 block text-xs font-semibold text-[var(--ink)]">
                      画廊展示简介
                    </label>
                    <input
                      id="skill-desc"
                      type="text"
                      value={formState.description}
                      onChange={(e) => patchForm('description', e.target.value)}
                      className="w-full rounded-xl border border-[var(--border)] bg-white px-3.5 py-2 text-xs text-[var(--ink)]"
                    />
                  </div>
                  <div>
                    <label htmlFor="skill-artist" className="mb-1 block text-xs font-semibold text-[var(--ink)]">
                      参考美学流派/作者（安全版自动剥离）
                    </label>
                    <input
                      id="skill-artist"
                      type="text"
                      value={formState.referenceArtist ?? ''}
                      onChange={(e) => patchForm('referenceArtist', e.target.value || undefined)}
                      placeholder="可选"
                      className="w-full rounded-xl border border-[var(--border)] bg-white px-3.5 py-2 text-xs text-[var(--ink)]"
                    />
                  </div>
                </div>

                {/* Recommended Purpose Kinds */}
                <div>
                  <span className="mb-1.5 block text-xs font-semibold text-[var(--ink)]">
                    适配创作场景（勾选后该风格会在对应场景下被优先推荐）
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {PURPOSES.map((p) => {
                      const checked = formState.recommendedKinds.includes(p.id);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => toggleRecommendedKind(p.id)}
                          aria-pressed={checked}
                          className={`inline-flex cursor-pointer items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                            checked
                              ? 'border-[var(--green)] bg-[var(--light)] text-[var(--green)]'
                              : 'border-[var(--border)] bg-white text-[var(--muted)] hover:text-[var(--ink)]'
                          }`}
                        >
                          {checked && <Check className="h-3 w-3" aria-hidden="true" />}
                          <span>{p.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Per-Scene Custom Skill Overrides */}
                <div className="rounded-xl border border-[var(--border)] bg-[#fafbf8] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-[var(--ink)]">
                      分场景专属画面规则（Scene Overrides · 可按不同应用场景微调此画风出图要求）
                    </span>
                    <span className="text-[11px] text-[var(--muted)]">
                      留空则自动继承场景默认规则
                    </span>
                  </div>

                  <div className="mt-2.5 flex flex-wrap gap-1.5" role="tablist" aria-label="分场景规则切换">
                    {PURPOSES.map((p) => {
                      const isActive = activeOverrideScene === p.id;
                      const hasCustom = Boolean(formState.sceneOverrides?.[p.id]?.trim());
                      return (
                        <button
                          key={p.id}
                          type="button"
                          role="tab"
                          aria-selected={isActive}
                          onClick={() => setActiveOverrideScene(p.id)}
                          className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors ${
                            isActive
                              ? 'bg-[var(--green)] text-white'
                              : 'border border-[var(--border)] bg-white text-[var(--ink-soft)] hover:bg-[var(--light)]'
                          }`}
                        >
                          <span>{p.label}</span>
                          {hasCustom && (
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                isActive ? 'bg-[#ffe094]' : 'bg-[var(--green)]'
                              }`}
                              aria-label="已配置专属规则"
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <p className="mt-2.5 text-[11px] leading-relaxed text-[var(--muted)]">
                    场景基准规则：
                    {PURPOSES.find((p) => p.id === activeOverrideScene)?.sceneRuleCn}
                  </p>

                  <textarea
                    id="skill-scene-override"
                    aria-label={`分场景专属规则-${activeOverrideScene}`}
                    rows={2}
                    value={formState.sceneOverrides?.[activeOverrideScene] ?? ''}
                    onChange={(e) => patchSceneOverride(activeOverrideScene, e.target.value)}
                    placeholder={`例如：当此画风用于「${
                      PURPOSES.find((p) => p.id === activeOverrideScene)?.label ?? ''
                    }」时，额外强调的主体留白、分镜节奏、材质精度或文字摆放要求…`}
                    className="mt-2 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-xs leading-relaxed text-[var(--ink)]"
                  />
                </div>

                {/* Raster Bitmap Cover Picker */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="skill-image" className="mb-1 block text-xs font-semibold text-[var(--ink)]">
                      精选预览位图（仅限 .webp / .png / .jpg）
                    </label>
                    <select
                      id="skill-image"
                      value={
                        FEATURED_COVER_SAMPLES.some((st) => st.image === formState.image)
                          ? formState.image
                          : '__custom__'
                      }
                      onChange={(e) => {
                        if (e.target.value !== '__custom__') {
                          patchForm('image', e.target.value);
                        }
                      }}
                      className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-xs text-[var(--ink)]"
                    >
                      {!FEATURED_COVER_SAMPLES.some((st) => st.image === formState.image) && (
                        <option value="__custom__">当前专属官方位图 · {formState.id}</option>
                      )}
                      {FEATURED_COVER_SAMPLES.map((st) => (
                        <option key={st.id} value={st.image}>
                          精选位图 · {st.id} {st.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="skill-image-url" className="mb-1 block text-xs font-semibold text-[var(--ink)]">
                      位图地址（支持官方 Raw 位图或自定义 URL）
                    </label>
                    <input
                      id="skill-image-url"
                      type="text"
                      value={formState.image}
                      onChange={(e) => patchForm('image', e.target.value)}
                      placeholder="https://.../*.webp 或 /src/assets/images/*.jpg"
                      className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 font-mono text-[11px] text-[var(--ink)]"
                    />
                  </div>
                </div>
              </div>

              {/* Sticky Save Footer */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] bg-[#fafbf8] px-6 py-4">
                <span className="text-xs text-[var(--muted)]">
                  {isDirty ? '存在未保存的配置改动' : '当前配置已与服务端同步'}
                </span>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-[var(--green)] px-5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[var(--green-hover)] disabled:opacity-50"
                >
                  <Save className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{saving ? '保存中…' : '保存 Skill 配置'}</span>
                </button>
              </div>
            </form>
          )}
        </section>
      </div>

      {/* Create Custom Style Skill Modal */}
      {createOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-skill-heading"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#183628]/45 p-4 backdrop-blur-xs"
          onClick={() => setCreateOpen(false)}
        >
          <div
            className="flex max-h-[88dvh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
              <h2 id="create-skill-heading" className="text-base font-semibold text-[var(--ink)]">
                新建自定义插画风格 Skill
              </h2>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                aria-label="关闭新建弹窗"
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-[var(--border)] text-[var(--ink)] hover:bg-[var(--light)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSkill} className="subtle-scroll flex-1 space-y-4 overflow-y-auto p-6">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="new-skill-title" className="mb-1 block text-xs font-semibold text-[var(--ink)]">
                    风格中文名 *
                  </label>
                  <input
                    id="new-skill-title"
                    type="text"
                    required
                    value={newSkillForm.title}
                    onChange={(e) => setNewSkillForm({ ...newSkillForm, title: e.target.value })}
                    placeholder="如：敦煌矿物岩彩"
                    className="w-full rounded-xl border border-[var(--border)] px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="new-skill-en" className="mb-1 block text-xs font-semibold text-[var(--ink)]">
                    英文名
                  </label>
                  <input
                    id="new-skill-en"
                    type="text"
                    value={newSkillForm.englishName}
                    onChange={(e) => setNewSkillForm({ ...newSkillForm, englishName: e.target.value })}
                    placeholder="Dunhuang Mineral Pigment"
                    className="w-full rounded-xl border border-[var(--border)] px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label htmlFor="new-skill-id" className="mb-1 block text-xs font-semibold text-[var(--ink)]">
                    编号（留空自动生成）
                  </label>
                  <input
                    id="new-skill-id"
                    type="text"
                    value={newSkillForm.id}
                    onChange={(e) => setNewSkillForm({ ...newSkillForm, id: e.target.value })}
                    placeholder="CS-001"
                    className="w-full rounded-xl border border-[var(--border)] px-3 py-2 text-xs font-tabular"
                  />
                </div>
                <div>
                  <label htmlFor="new-skill-cat" className="mb-1 block text-xs font-semibold text-[var(--ink)]">
                    画风分类
                  </label>
                  <select
                    id="new-skill-cat"
                    value={newSkillForm.category}
                    onChange={(e) =>
                      setNewSkillForm({
                        ...newSkillForm,
                        category: e.target.value as ConcreteStyleCategory,
                      })
                    }
                    className="w-full rounded-xl border border-[var(--border)] px-3 py-2 text-xs"
                  >
                    {EDITABLE_CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="new-skill-img" className="mb-1 block text-xs font-semibold text-[var(--ink)]">
                    封面位图
                  </label>
                  <select
                    id="new-skill-img"
                    value={newSkillForm.image}
                    onChange={(e) => setNewSkillForm({ ...newSkillForm, image: e.target.value })}
                    className="w-full rounded-xl border border-[var(--border)] px-3 py-2 text-xs"
                  >
                    {FEATURED_COVER_SAMPLES.map((st) => (
                      <option key={st.id} value={st.image}>
                        {st.id} · {st.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="new-skill-traits" className="mb-1 block text-xs font-semibold text-[var(--ink)]">
                  视觉笔触特征（中文）
                </label>
                <input
                  id="new-skill-traits"
                  type="text"
                  value={newSkillForm.visualTraitsCn}
                  onChange={(e) => setNewSkillForm({ ...newSkillForm, visualTraitsCn: e.target.value })}
                  placeholder="矿物石青石绿颜料颗粒、金箔点缀、手绘麻布底纹"
                  className="w-full rounded-xl border border-[var(--border)] px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label htmlFor="new-skill-prompt" className="mb-1 block text-xs font-semibold text-[var(--ink)]">
                  核心 Skill 系统指令 *
                </label>
                <textarea
                  id="new-skill-prompt"
                  rows={4}
                  required
                  value={newSkillForm.skillSystemPrompt}
                  onChange={(e) =>
                    setNewSkillForm({ ...newSkillForm, skillSystemPrompt: e.target.value })
                  }
                  placeholder="写明模型生成提示词时必须遵守的画风笔触、材质肌理与构图留白规则…"
                  className="w-full rounded-xl border border-[var(--border)] px-3 py-2 text-xs leading-relaxed"
                />
              </div>

              <div>
                <label htmlFor="new-skill-neg" className="mb-1 block text-xs font-semibold text-[var(--ink)]">
                  负向规避规则
                </label>
                <input
                  id="new-skill-neg"
                  type="text"
                  value={newSkillForm.negativePrompt}
                  onChange={(e) => setNewSkillForm({ ...newSkillForm, negativePrompt: e.target.value })}
                  className="w-full rounded-xl border border-[var(--border)] px-3 py-2 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-[var(--border)] pt-4">
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  className="cursor-pointer rounded-xl border border-[var(--border)] px-4 py-2 text-xs font-medium text-[var(--ink)] hover:bg-[var(--light)]"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={busyAction}
                  className="cursor-pointer rounded-xl bg-[var(--green)] px-5 py-2 text-xs font-semibold text-white hover:bg-[var(--green-hover)] disabled:opacity-50"
                >
                  {busyAction ? '创建中…' : '创建并上线'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import JSON / SKILL.md Modal */}
      {importOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="import-skill-heading"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#183628]/45 p-4 backdrop-blur-xs"
          onClick={() => setImportOpen(false)}
        >
          <div
            className="flex max-h-[86dvh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
              <div>
                <h2 id="import-skill-heading" className="text-base font-semibold text-[var(--ink)]">
                  导入风格 Skill（SKILL.md / JSON）
                </h2>
                <p className="mt-0.5 text-xs text-[var(--muted)]">
                  兼容 handraw-style 与 gemskills 的标准 SKILL.md 前置元数据或 JSON 配置数组
                </p>
              </div>
              <button
                type="button"
                onClick={() => setImportOpen(false)}
                aria-label="关闭导入弹窗"
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-[var(--border)] text-[var(--ink)] hover:bg-[var(--light)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleImportSubmit} className="space-y-4 p-6">
              <div className="flex items-center justify-between">
                <label htmlFor="import-raw-textarea" className="text-xs font-semibold text-[var(--ink)]">
                  粘贴配置内容
                </label>
                <button
                  type="button"
                  onClick={() => setImportRaw(SAMPLE_SKILL_MD)}
                  className="cursor-pointer text-xs font-medium text-[var(--green)] hover:underline underline-offset-4"
                >
                  填入 SKILL.md 示例模板
                </button>
              </div>
              <textarea
                id="import-raw-textarea"
                rows={11}
                value={importRaw}
                onChange={(e) => setImportRaw(e.target.value)}
                placeholder="粘贴 JSON 对象/数组，或带 --- 前置字段的 SKILL.md 文本…"
                className="subtle-scroll w-full rounded-xl border border-[var(--border)] bg-[#fafbf8] p-3 font-mono text-xs leading-5 text-[var(--ink)]"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setImportOpen(false)}
                  className="cursor-pointer rounded-xl border border-[var(--border)] px-4 py-2 text-xs font-medium text-[var(--ink)] hover:bg-[var(--light)]"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={busyAction}
                  className="cursor-pointer rounded-xl bg-[var(--green)] px-5 py-2 text-xs font-semibold text-white hover:bg-[var(--green-hover)] disabled:opacity-50"
                >
                  {busyAction ? '解析导入中…' : '解析并导入'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
