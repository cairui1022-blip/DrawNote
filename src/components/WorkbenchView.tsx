import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUpRight,
  BarChart3,
  Bell,
  Bookmark,
  BookmarkPlus,
  BookOpenText,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  Image as ImageIcon,
  LayoutGrid,
  LayoutTemplate,
  Palette,
  Pencil,
  Pin,
  RefreshCw,
  ShoppingBag,
  Smile,
  Sparkles,
  Trash2,
  Wand2,
  X,
} from 'lucide-react';
import {
  ASPECT_RATIOS,
  COLOR_PALETTES,
  INSPIRATION_PRESETS,
  LAYOUTS,
  PURPOSES,
  STYLES,
} from '../data/catalog';
import {
  applyQuickRefinementToPrompt,
  applyUserTemplateToDraft,
  buildStructuredPrompt,
  getLayoutsForKind,
  pickRecommendedStyleForKind,
  PROMPT_REFINEMENT_OPTIONS,
  resolveInitialWorkbenchMode,
  summarizeDraftConditions,
  type PromptRefinementId,
} from '../utils/promptEngine';
import { LayoutSchematic, StyleArtwork } from './CatalogArtwork';
import { RecipeMoodboard } from './RecipeMoodboard';
import { VisualPickerModal, type PickerSlot } from './VisualPickerModal';
import type {
  CreationDraft,
  InspirationPreset,
  PromptFormat,
  PromptHistoryRecord,
  PurposeKind,
  StyleItem,
  UserSession,
  UserTemplate,
  WorkbenchMode,
} from '../types';

interface WorkbenchViewProps {
  session: UserSession;
  styles: StyleItem[];
  draft: CreationDraft;
  onChangeDraft: (next: CreationDraft) => void;
  lastPrompt: {
    text: string;
    format: PromptFormat;
    usedAi: boolean;
  } | null;
  onPromptGenerated: (record: PromptHistoryRecord) => void;
  templates: UserTemplate[];
  onSaveTemplate: (template: UserTemplate) => void;
  onDeleteTemplate: (id: string) => void;
  onTogglePinTemplate: (id: string) => void;
  favoriteStyleIds: string[];
  recentStyleIds: string[];
  onToggleFavoriteStyle: (styleId: string) => void;
  onRecordRecentStyle: (styleId: string) => void;
  onToggleWaitlist: () => void;
  onOpenTasks: () => void;
  onNotify: (text: string, tone?: 'success' | 'info') => void;
  isAdmin: boolean;
  onOpenSkillAdmin?: () => void;
}

interface SessionVersion {
  id: string;
  label: string;
  text: string;
  format: PromptFormat;
  usedAi: boolean;
}

const FORMAT_OPTIONS: Array<{ id: PromptFormat; label: string; hint: string }> = [
  { id: 'cn_natural', label: '中文通用', hint: '适配即梦 / 豆包 / GPT-4o' },
  { id: 'en_mj', label: 'Midjourney 英文', hint: '自动附带 --ar 画幅参数' },
  { id: 'safe_style', label: '去作者名安全版', hint: '纯视觉笔触描述，防审核拦截' },
];

const SCENE_ICONS: Record<PurposeKind, typeof LayoutTemplate> = {
  'social-card': LayoutTemplate,
  infographic: BarChart3,
  comic: BookOpenText,
  'ip-character': Smile,
  ecommerce: ShoppingBag,
  'pure-image': ImageIcon,
};

function getTinyRatioDims(ratio: string): { w: number; h: number } {
  const [rw, rh] = ratio.split(':').map(Number);
  if (!rw || !rh) return { w: 12, h: 16 };
  const max = 16;
  if (rw >= rh) {
    return { w: max, h: Math.max(8, Math.round((max * rh) / rw)) };
  }
  return { w: Math.max(8, Math.round((max * rw) / rh)), h: max };
}

export function WorkbenchView({
  session,
  styles,
  draft,
  onChangeDraft,
  lastPrompt,
  onPromptGenerated,
  templates,
  onSaveTemplate,
  onDeleteTemplate,
  onTogglePinTemplate,
  favoriteStyleIds,
  recentStyleIds,
  onToggleFavoriteStyle,
  onRecordRecentStyle,
  onToggleWaitlist,
  onOpenTasks,
  onNotify,
  isAdmin,
  onOpenSkillAdmin,
}: WorkbenchViewProps) {
  const availableImageModels: string[] = [];
  const [mode, setMode] = useState<WorkbenchMode>(() =>
    resolveInitialWorkbenchMode(availableImageModels, null, false)
  );
  const [format, setFormat] = useState<PromptFormat>(lastPrompt?.format ?? 'cn_natural');
  const [useAiPolish, setUseAiPolish] = useState(true);
  const [pickerSlot, setPickerSlot] = useState<PickerSlot | null>(null);
  const [templatesExpanded, setTemplatesExpanded] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorBanner, setErrorBanner] = useState<{ message: string; canFallback?: boolean } | null>(
    null
  );
  const [copied, setCopied] = useState(false);

  const [sessionVersions, setSessionVersions] = useState<SessionVersion[]>(() =>
    lastPrompt
      ? [
          {
            id: 'v_init',
            label: 'v1',
            text: lastPrompt.text,
            format: lastPrompt.format,
            usedAi: lastPrompt.usedAi,
          },
        ]
      : []
  );
  const [activeVersionId, setActiveVersionId] = useState<string | null>(() =>
    lastPrompt ? 'v_init' : null
  );

  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [templateModal, setTemplateModal] = useState<{
    mode: 'create' | 'rename';
    targetId?: string;
    name: string;
    includeTopic: boolean;
    draftSnapshot: CreationDraft;
    formatSnapshot: PromptFormat;
  } | null>(null);

  const resultPanelRef = useRef<HTMLDivElement>(null);

  const activeStyles = styles.length > 0 ? styles : STYLES;
  const selectedPurpose = PURPOSES.find((p) => p.id === draft.kind) ?? PURPOSES[0];
  const compatibleLayouts = useMemo(() => getLayoutsForKind(draft.kind, LAYOUTS), [draft.kind]);

  const selectedLayout = draft.layoutId
    ? compatibleLayouts.find((l) => l.id === draft.layoutId) ?? null
    : null;
  const selectedStyle = draft.styleId
    ? activeStyles.find((s) => s.id === draft.styleId) ?? null
    : null;
  const selectedPrimaryColor = draft.primaryColorId
    ? COLOR_PALETTES.find((c) => c.id === draft.primaryColorId) ?? null
    : null;
  const selectedAccentColors = draft.accentColorIds
    .map((id) => COLOR_PALETTES.find((c) => c.id === id))
    .filter((c): c is NonNullable<typeof c> => Boolean(c));

  const sortedTemplates = useMemo(() => {
    return [...templates].sort((a, b) => {
      if (Boolean(a.pinned) !== Boolean(b.pinned)) {
        return a.pinned ? -1 : 1;
      }
      return b.updatedAt.localeCompare(a.updatedAt);
    });
  }, [templates]);

  const activeTemplate = useMemo(
    () => templates.find((t) => t.id === activeTemplateId) ?? null,
    [templates, activeTemplateId]
  );

  const conditionSummary = useMemo(
    () => summarizeDraftConditions(draft, activeStyles, LAYOUTS),
    [draft, activeStyles]
  );

  useEffect(() => {
    if (lastPrompt) {
      setFormat(lastPrompt.format);
    }
  }, [lastPrompt]);

  const totalCredits = session.creditsGift + session.creditsRedeem + session.creditsPaid;

  const appendSessionVersion = (entry: Omit<SessionVersion, 'id' | 'label'>) => {
    setSessionVersions((prev) => {
      const nextNum = prev.length + 1;
      const newVer: SessionVersion = {
        ...entry,
        id: `v_${Date.now()}_${nextNum}`,
        label: `v${nextNum}`,
      };
      setActiveVersionId(newVer.id);
      return [...prev, newVer].slice(-6);
    });
  };

  const handlePurposeChange = (kind: PurposeKind) => {
    const purpose = PURPOSES.find((p) => p.id === kind) ?? PURPOSES[0];
    const nextLayouts = getLayoutsForKind(kind, LAYOUTS);

    const nextLayoutId =
      purpose.usesLayout && draft.layoutId ? nextLayouts[0]?.id ?? '' : '';

    let nextStyleId = draft.styleId;
    let switchedStyleTitle: string | null = null;
    if (draft.styleId) {
      const matchedStyle = pickRecommendedStyleForKind(kind, activeStyles, draft.styleId);
      if (matchedStyle.id !== draft.styleId) {
        nextStyleId = matchedStyle.id;
        switchedStyleTitle = matchedStyle.title;
      }
    }

    onChangeDraft({
      ...draft,
      kind,
      layoutId: nextLayoutId,
      styleId: nextStyleId,
      ratio: purpose.recommendedRatio,
    });
    if (switchedStyleTitle) {
      onNotify(
        `已切换至「${purpose.label}」并自动匹配画风「${switchedStyleTitle}」`,
        'info'
      );
    }
    setErrorBanner(null);
  };

  const handleSmartPair = () => {
    const nextLayouts = getLayoutsForKind(draft.kind, LAYOUTS);
    const recommendedStyle = pickRecommendedStyleForKind(draft.kind, activeStyles);
    onChangeDraft({
      ...draft,
      layoutId: selectedPurpose.usesLayout ? nextLayouts[0]?.id ?? '' : '',
      styleId: recommendedStyle.id,
      ratio: selectedPurpose.recommendedRatio,
    });
    onRecordRecentStyle(recommendedStyle.id);
    onNotify(
      `已按「${selectedPurpose.label}」智能搭配${
        selectedPurpose.usesLayout && nextLayouts[0] ? `「${nextLayouts[0].title}」+ ` : ''
      }「${recommendedStyle.title}」`
    );
  };

  const handleApplyPreset = (preset: InspirationPreset) => {
    onChangeDraft({ ...preset.draft });
    onRecordRecentStyle(preset.draft.styleId);
    setActiveTemplateId(null);
    setMode('prompt');
    setErrorBanner(null);
    onNotify(`已填入灵感案例「${preset.title}」`);
  };

  const handleOpenSaveCurrentTemplate = () => {
    const defaultName = `${selectedPurpose.label}${selectedStyle ? ` · ${selectedStyle.title}` : ' · 自由画风'}`;
    setTemplateModal({
      mode: 'create',
      name: defaultName.slice(0, 24),
      includeTopic: false,
      draftSnapshot: { ...draft, accentColorIds: [...draft.accentColorIds] },
      formatSnapshot: format,
    });
  };

  const handleSavePresetAsTemplate = (preset: InspirationPreset) => {
    const now = new Date().toISOString();
    const tpl: UserTemplate = {
      id: `tpl_${Date.now()}`,
      name: preset.title,
      pinned: false,
      createdAt: now,
      updatedAt: now,
      format,
      draft: {
        kind: preset.draft.kind,
        layoutId: preset.draft.layoutId,
        styleId: preset.draft.styleId,
        primaryColorId: preset.draft.primaryColorId,
        accentColorIds: [...preset.draft.accentColorIds],
        ratio: preset.draft.ratio,
      },
    };
    onSaveTemplate(tpl);
    setActiveTemplateId(tpl.id);
    onNotify(`已将「${preset.title}」存入我的常用模板`);
  };

  const handleApplyUserTemplate = (tpl: UserTemplate) => {
    const nextDraft = applyUserTemplateToDraft(draft, tpl);
    onChangeDraft(nextDraft);
    setFormat(tpl.format);
    setActiveTemplateId(tpl.id);
    if (nextDraft.styleId) {
      onRecordRecentStyle(nextDraft.styleId);
    }
    setErrorBanner(null);
    onNotify(`已套用模板「${tpl.name}」`);
  };

  const handleUpdateActiveTemplateWithCurrent = () => {
    if (!activeTemplate) return;
    onSaveTemplate({
      ...activeTemplate,
      updatedAt: new Date().toISOString(),
      format,
      draft: {
        kind: draft.kind,
        layoutId: draft.kind === 'pure-image' ? '' : draft.layoutId,
        styleId: draft.styleId,
        primaryColorId: draft.primaryColorId,
        accentColorIds: [...draft.accentColorIds],
        ratio: draft.ratio,
        topicPrefix: activeTemplate.draft.topicPrefix,
      },
    });
    onNotify(`已用当前参数覆盖更新「${activeTemplate.name}」`);
  };

  const handleSubmitTemplateModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateModal) return;
    const cleanName = templateModal.name.trim();
    if (!cleanName) return;

    const now = new Date().toISOString();
    if (templateModal.mode === 'rename' && templateModal.targetId) {
      const target = templates.find((t) => t.id === templateModal.targetId);
      if (target) {
        onSaveTemplate({
          ...target,
          name: cleanName,
          updatedAt: now,
        });
        onNotify(`模板已重命名为「${cleanName}」`);
      }
    } else {
      const snap = templateModal.draftSnapshot;
      const newTemplate: UserTemplate = {
        id: `tpl_${Date.now()}`,
        name: cleanName,
        pinned: false,
        createdAt: now,
        updatedAt: now,
        format: templateModal.formatSnapshot,
        draft: {
          kind: snap.kind,
          layoutId: snap.kind === 'pure-image' ? '' : snap.layoutId,
          styleId: snap.styleId,
          primaryColorId: snap.primaryColorId,
          accentColorIds: [...snap.accentColorIds],
          ratio: snap.ratio,
          topicPrefix:
            templateModal.includeTopic && snap.topic.trim()
              ? snap.topic.trim()
              : undefined,
        },
      };
      onSaveTemplate(newTemplate);
      setActiveTemplateId(newTemplate.id);
      onNotify(`已保存常用模板「${cleanName}」`);
    }
    setTemplateModal(null);
  };

  const runPromptGeneration = async (
    targetFormat: PromptFormat,
    engineMode: 'ai' | 'structured'
  ) => {
    if (!draft.topic.trim()) {
      setErrorBanner({ message: '请先在左侧写下你想画的主题内容，或点击右侧灵感示例一键填充。' });
      return;
    }
    setIsGenerating(true);
    setErrorBanner(null);
    setCopied(false);

    try {
      const response = await fetch('/api/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          draft,
          format: targetFormat,
          mode: engineMode,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setErrorBanner({
          message: data.message || '提示词生成未完成，请重试。',
          canFallback: engineMode === 'ai',
        });
        return;
      }

      const record: PromptHistoryRecord = {
        id: `pr_${Date.now()}`,
        type: 'prompt',
        createdAt: new Date().toLocaleString('zh-CN', { hour12: false }),
        format: targetFormat,
        usedAi: Boolean(data.usedAi),
        promptText: data.prompt,
        draft: { ...draft, accentColorIds: [...draft.accentColorIds] },
      };
      onPromptGenerated(record);
      appendSessionVersion({
        text: data.prompt,
        format: targetFormat,
        usedAi: Boolean(data.usedAi),
      });
      if (draft.styleId) {
        onRecordRecentStyle(draft.styleId);
      }
      if (window.innerWidth < 1024) {
        resultPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } catch {
      setErrorBanner({
        message: '网络连接异常，可点击下方按钮使用结构化模板立即生成。',
        canFallback: engineMode === 'ai',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode !== 'prompt') return;
    runPromptGeneration(format, useAiPolish ? 'ai' : 'structured');
  };

  const handleQuickRefine = (refinementId: PromptRefinementId) => {
    if (!lastPrompt?.text) return;
    const option = PROMPT_REFINEMENT_OPTIONS.find((item) => item.id === refinementId);
    const refined = applyQuickRefinementToPrompt(lastPrompt.text, refinementId, format);
    if (refined === lastPrompt.text) {
      onNotify(`当前提示词已包含「${option?.label ?? '该微调'}」要求`, 'info');
      return;
    }
    const record: PromptHistoryRecord = {
      id: `pr_refine_${Date.now()}`,
      type: 'prompt',
      createdAt: new Date().toLocaleString('zh-CN', { hour12: false }),
      format,
      usedAi: lastPrompt.usedAi,
      promptText: refined,
      draft: { ...draft, accentColorIds: [...draft.accentColorIds] },
    };
    onPromptGenerated(record);
    appendSessionVersion({
      text: refined,
      format,
      usedAi: lastPrompt.usedAi,
    });
    setCopied(false);
    onNotify(`已按「${option?.label ?? '微调'}」生成新版本`);
  };

  const handleSelectSessionVersion = (ver: SessionVersion) => {
    setActiveVersionId(ver.id);
    setFormat(ver.format);
    onPromptGenerated({
      id: `edit_ver_${Date.now()}`,
      type: 'prompt',
      createdAt: new Date().toLocaleString('zh-CN', { hour12: false }),
      format: ver.format,
      usedAi: ver.usedAi,
      promptText: ver.text,
      draft: { ...draft, accentColorIds: [...draft.accentColorIds] },
    });
    setCopied(false);
  };

  const handleSwitchResultFormat = (nextFormat: PromptFormat) => {
    setFormat(nextFormat);
    if (!draft.topic.trim() || !lastPrompt) return;
    const structured = buildStructuredPrompt(draft, nextFormat, activeStyles);
    const record: PromptHistoryRecord = {
      id: `edit_format_${Date.now()}`,
      type: 'prompt',
      createdAt: new Date().toLocaleString('zh-CN', { hour12: false }),
      format: nextFormat,
      usedAi: false,
      promptText: structured,
      draft: { ...draft, accentColorIds: [...draft.accentColorIds] },
    };
    onPromptGenerated(record);
    setCopied(false);
  };

  const handleCopyPrompt = async () => {
    if (!lastPrompt?.text) return;
    try {
      await navigator.clipboard.writeText(lastPrompt.text);
      setCopied(true);
      onNotify('提示词已复制到剪贴板');
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setErrorBanner({ message: '自动复制受限，请直接全选右侧文本框内容复制。' });
    }
  };

  const handleExportTxt = () => {
    if (!lastPrompt?.text) return;
    const blob = new Blob([lastPrompt.text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `drawnote-prompt-${format}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    onNotify('已导出 TXT 提示词文件');
  };

  return (
    <div className="mx-auto max-w-[1400px] lg:border-x lg:border-[var(--border)]">
      {/* Edge-to-Edge Split Print Studio Layout */}
      <div className="grid items-stretch lg:grid-cols-12">
        {/* Left Editor Rail: Crisp White Print Control Desk */}
        <form
          onSubmit={handleFormSubmit}
          className="flex flex-col border-b border-[var(--border)] bg-[var(--paper)] lg:sticky lg:top-16 lg:col-span-5 lg:h-[calc(100dvh-64px)] lg:border-b-0 lg:border-r"
        >
          {/* Fixed Editor Header & Editorial Underline Mode Switch */}
          <div className="shrink-0 border-b border-[var(--border)] px-5 pt-4 md:px-6">
            <div className="flex items-baseline justify-between gap-2">
              <h1 className="font-editorial text-lg font-bold text-[var(--ink)] sm:text-xl">
                把一句话，画成一幅画
              </h1>
              <span className="font-tabular text-[11px] text-[var(--muted)]">ATELIER</span>
            </div>

            <div
              role="group"
              aria-label="生成方式"
              className="mt-3 flex items-center gap-6"
            >
              <button
                type="button"
                aria-pressed={mode === 'prompt'}
                onClick={() => {
                  setMode('prompt');
                  setErrorBanner(null);
                }}
                className={`-mb-px cursor-pointer whitespace-nowrap border-b-2 pb-2.5 text-xs font-semibold transition-colors ${
                  mode === 'prompt'
                    ? 'border-[var(--seal)] text-[var(--seal)]'
                    : 'border-transparent text-[var(--muted)] hover:text-[var(--ink)]'
                }`}
              >
                生成提示词
              </button>
              <button
                type="button"
                aria-pressed={mode === 'image'}
                onClick={() => {
                  setMode('image');
                  setErrorBanner(null);
                }}
                className={`-mb-px cursor-pointer whitespace-nowrap border-b-2 pb-2.5 text-xs font-semibold transition-colors ${
                  mode === 'image'
                    ? 'border-[var(--seal)] text-[var(--seal)]'
                    : 'border-transparent text-[var(--muted)] hover:text-[var(--ink)]'
                }`}
              >
                生成图片 · 即将开放
              </button>
            </div>
          </div>

          {/* Scrollable Form Fields */}
          <div className="subtle-scroll min-h-0 flex-1 space-y-3.5 overflow-y-auto px-5 py-3.5 md:px-6">
            {mode === 'image' && (
              <div className="rounded-[4px] border border-[var(--border)] bg-[var(--bg)] p-4">
                <p className="font-editorial text-sm font-semibold text-[var(--ink)]">
                  站内生图模型即将开放
                </p>
                <p className="mt-1 text-xs leading-relaxed text-[var(--ink-soft)]">
                  你的新用户赠送额度（<span className="font-tabular font-semibold">{totalCredits} 次</span>）已安全保留且永不过期。现在可订阅上线提醒，或立刻使用免费的「生成提示词」配合即梦、Midjourney 出图。
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={onToggleWaitlist}
                    className={`inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-[4px] px-3.5 py-2 text-xs font-semibold transition-colors ${
                      session.waitlistSubscribed
                        ? 'border border-[var(--seal)] bg-[var(--accent-soft)] text-[var(--seal)]'
                        : 'bg-[var(--ink)] text-[#fbf9f4] hover:bg-[#2e2e2b]'
                    }`}
                  >
                    {session.waitlistSubscribed ? (
                      <>
                        <Check className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>已订阅上线提醒</span>
                      </>
                    ) : (
                      <>
                        <Bell className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>订阅上线提醒</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('prompt')}
                    className="cursor-pointer whitespace-nowrap rounded-[4px] border border-[var(--border)] bg-[var(--paper)] px-3.5 py-2 text-xs font-medium text-[var(--ink)] hover:border-[var(--ink)]"
                  >
                    切回生成提示词
                  </button>
                </div>
              </div>
            )}

            {/* 1. Compact Reusable Templates Strip */}
            <div className="rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Bookmark className="h-3.5 w-3.5 text-[var(--seal)]" aria-hidden="true" />
                  <span className="text-xs font-semibold text-[var(--ink)]">常用模板</span>
                  {templates.length > 0 && (
                    <span className="font-tabular text-[11px] text-[var(--muted)]">
                      ({templates.length})
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  {activeTemplate && (
                    <button
                      type="button"
                      onClick={handleUpdateActiveTemplateWithCurrent}
                      className="cursor-pointer whitespace-nowrap rounded-[3px] border border-[var(--border)] bg-[var(--paper)] px-2 py-1 text-[11px] font-medium text-[var(--ink-soft)] transition-colors hover:border-[var(--ink)] hover:text-[var(--ink)]"
                    >
                      覆盖更新
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleOpenSaveCurrentTemplate}
                    className="inline-flex cursor-pointer items-center gap-1 whitespace-nowrap rounded-[3px] border border-[var(--border)] bg-[var(--paper)] px-2.5 py-1 text-[11px] font-semibold text-[var(--ink)] transition-colors hover:border-[var(--seal)] hover:text-[var(--seal)]"
                  >
                    <BookmarkPlus className="h-3 w-3" aria-hidden="true" />
                    <span>存当前为模板</span>
                  </button>
                  {sortedTemplates.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setTemplatesExpanded((prev) => !prev)}
                      aria-expanded={templatesExpanded}
                      className="inline-flex cursor-pointer items-center gap-0.5 whitespace-nowrap px-1.5 py-1 text-[11px] font-medium text-[var(--muted)] hover:text-[var(--ink)]"
                    >
                      <span>{templatesExpanded ? '收起' : '管理'}</span>
                      {templatesExpanded ? (
                        <ChevronUp className="h-3 w-3" aria-hidden="true" />
                      ) : (
                        <ChevronDown className="h-3 w-3" aria-hidden="true" />
                      )}
                    </button>
                  )}
                </div>
              </div>

              {sortedTemplates.length === 0 ? (
                <p className="mt-1.5 text-[11px] text-[var(--muted)]">
                  调好常用场景、画幅或留空偏好后，点右上角保存即可一键复用。
                </p>
              ) : !templatesExpanded ? (
                <div className="subtle-scroll mt-2 flex items-center gap-1.5 overflow-x-auto pb-0.5">
                  {sortedTemplates.map((tpl) => {
                    const isActive = tpl.id === activeTemplateId;
                    return (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => handleApplyUserTemplate(tpl)}
                        className={`inline-flex shrink-0 cursor-pointer items-center gap-1 whitespace-nowrap rounded-[3px] border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                          isActive
                            ? 'border-[var(--ink)] bg-[var(--ink)] text-[#fbf9f4]'
                            : 'border-[var(--border)] bg-[var(--paper)] text-[var(--ink)] hover:border-[var(--ink)]'
                        }`}
                      >
                        {tpl.pinned && (
                          <Pin
                            className={`h-2.5 w-2.5 shrink-0 ${
                              isActive
                                ? 'fill-[#fbf9f4] text-[#fbf9f4]'
                                : 'fill-[var(--seal)] text-[var(--seal)]'
                            }`}
                            aria-hidden="true"
                          />
                        )}
                        <span className="max-w-[140px] truncate">{tpl.name}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-2.5 space-y-1.5">
                  {sortedTemplates.map((tpl) => {
                    const isActive = tpl.id === activeTemplateId;
                    const tplSummary = summarizeDraftConditions(
                      { ...tpl.draft, topic: '' },
                      activeStyles,
                      LAYOUTS
                    );
                    return (
                      <div
                        key={tpl.id}
                        className={`flex items-center gap-2 rounded-[4px] border px-2.5 py-2 transition-colors ${
                          isActive
                            ? 'border-[var(--seal)] bg-[var(--paper)]'
                            : 'border-[var(--border)] bg-[var(--paper)] hover:border-[#b9b2a4]'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => handleApplyUserTemplate(tpl)}
                          className="min-w-0 flex-1 cursor-pointer text-left"
                        >
                          <div className="flex items-center gap-1.5">
                            {tpl.pinned && (
                              <Pin
                                className="h-3 w-3 shrink-0 fill-[var(--seal)] text-[var(--seal)]"
                                aria-label="已置顶"
                              />
                            )}
                            <span className="truncate text-xs font-semibold text-[var(--ink)]">
                              {tpl.name}
                            </span>
                          </div>
                          <p className="mt-0.5 truncate text-[11px] text-[var(--muted)]">
                            {tplSummary}
                          </p>
                        </button>

                        <div className="flex shrink-0 items-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => onTogglePinTemplate(tpl.id)}
                            title={tpl.pinned ? '取消置顶' : '置顶模板'}
                            aria-label={tpl.pinned ? `取消置顶 ${tpl.name}` : `置顶 ${tpl.name}`}
                            className={`flex h-6 w-6 cursor-pointer items-center justify-center rounded-[3px] transition-colors ${
                              tpl.pinned
                                ? 'text-[var(--seal)] hover:bg-[var(--accent-soft)]'
                                : 'text-[var(--muted)] hover:bg-[var(--light)] hover:text-[var(--ink)]'
                            }`}
                          >
                            <Pin className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setTemplateModal({
                                mode: 'rename',
                                targetId: tpl.id,
                                name: tpl.name,
                                includeTopic: Boolean(tpl.draft.topicPrefix),
                                draftSnapshot: { ...tpl.draft, topic: tpl.draft.topicPrefix ?? '' },
                                formatSnapshot: tpl.format,
                              })
                            }
                            title="重命名模板"
                            aria-label={`重命名 ${tpl.name}`}
                            className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-[3px] text-[var(--muted)] transition-colors hover:bg-[var(--light)] hover:text-[var(--ink)]"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onDeleteTemplate(tpl.id);
                              if (activeTemplateId === tpl.id) setActiveTemplateId(null);
                              onNotify(`已删除模板「${tpl.name}」`);
                            }}
                            title="删除模板"
                            aria-label={`删除 ${tpl.name}`}
                            className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-[3px] text-[var(--muted)] transition-colors hover:bg-[var(--accent-soft)] hover:text-[var(--seal)]"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 2. Topic Textarea */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="topic-input" className="text-xs font-semibold text-[var(--ink)]">
                  想画什么？
                </label>
                <span className="font-tabular text-[11px] text-[var(--muted)]">
                  {draft.topic.length} 字 · ⌘/Ctrl + Enter 生成
                </span>
              </div>
              <textarea
                id="topic-input"
                rows={3}
                value={draft.topic}
                onChange={(e) => {
                  onChangeDraft({ ...draft, topic: e.target.value });
                  if (errorBanner) setErrorBanner(null);
                }}
                onKeyDown={(e) => {
                  if (
                    (e.metaKey || e.ctrlKey) &&
                    e.key === 'Enter' &&
                    mode === 'prompt' &&
                    !isGenerating
                  ) {
                    e.preventDefault();
                    runPromptGeneration(format, useAiPolish ? 'ai' : 'structured');
                  }
                }}
                placeholder="描述你的主题、希望表达的内容，或粘贴已有文案…"
                className="w-full resize-y rounded-[4px] border border-[var(--border)] bg-[var(--paper)] px-3.5 py-2.5 text-sm leading-relaxed text-[var(--ink)] placeholder:text-[#9b9991]"
              />
            </div>

            {/* 3. 6-Scene Selector Grid */}
            <div>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-[var(--ink)]">用途场景</span>
                <span className="truncate text-[11px] text-[var(--muted)]">
                  {selectedPurpose.shortDesc}
                </span>
              </div>
              <div
                role="radiogroup"
                aria-label="选择用途场景"
                className="grid grid-cols-3 gap-1.5"
              >
                {PURPOSES.map((p) => {
                  const Icon = SCENE_ICONS[p.id];
                  const active = draft.kind === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => handlePurposeChange(p.id)}
                      className={`flex cursor-pointer items-center gap-2 rounded-[4px] border px-2.5 py-2 text-left transition-colors ${
                        active
                          ? 'border-[var(--seal)] bg-[var(--accent-soft)] text-[var(--seal)]'
                          : 'border-[var(--border)] bg-[var(--paper)] text-[var(--ink-soft)] hover:border-[var(--ink)] hover:text-[var(--ink)]'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <div className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-semibold">{p.label}</span>
                        <span className="font-tabular block text-[10px] opacity-75">
                          {p.recommendedRatio}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. Optional Visual Feel Pickers */}
            <div>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xs font-semibold text-[var(--ink)]">画面感觉</span>
                  <span className="text-[11px] text-[var(--muted)]">均为可选 · 留空自动发挥</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={handleSmartPair}
                    className="inline-flex cursor-pointer items-center gap-1 text-[11px] font-semibold text-[var(--seal)] hover:underline underline-offset-2"
                  >
                    <Wand2 className="h-3 w-3" aria-hidden="true" />
                    <span>智能搭配</span>
                  </button>
                  {isAdmin && onOpenSkillAdmin && (
                    <button
                      type="button"
                      onClick={onOpenSkillAdmin}
                      className="cursor-pointer text-[11px] font-medium text-[var(--muted)] hover:text-[var(--seal)] hover:underline underline-offset-2"
                    >
                      管理 Skill ↗
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                {/* Layout Slot */}
                {selectedPurpose.usesLayout &&
                  (selectedLayout ? (
                    <div className="flex items-center gap-2 rounded-[4px] border border-[var(--border)] bg-[var(--paper)] p-2 transition-colors hover:border-[var(--ink)]">
                      <button
                        type="button"
                        onClick={() => setPickerSlot('layout')}
                        className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left"
                      >
                        <LayoutSchematic
                          layout={selectedLayout}
                          className="h-11 w-11 shrink-0 rounded-[2px] p-0.5"
                        />
                        <div className="min-w-0 flex-1">
                          <span className="block text-[11px] text-[var(--muted)]">
                            版式结构 · 已锁定
                          </span>
                          <span className="block truncate text-xs font-semibold text-[var(--ink)]">
                            {selectedLayout.title}
                          </span>
                        </div>
                        <span className="shrink-0 text-xs font-medium text-[var(--seal)]">更换</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onChangeDraft({ ...draft, layoutId: '' })}
                        title="清空版式，改为自由构图"
                        aria-label="清空版式，改为自由构图"
                        className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-[3px] text-[var(--muted)] transition-colors hover:bg-[var(--light)] hover:text-[var(--ink)]"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setPickerSlot('layout')}
                      className="flex w-full cursor-pointer items-center gap-3 rounded-[4px] border border-dashed border-[#cfc9bc] bg-[var(--bg)] p-2 text-left transition-colors hover:border-[var(--ink)] hover:bg-[var(--paper)]"
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[2px] border border-dashed border-[#d6d0c3] bg-[var(--paper)] text-[var(--muted)]">
                        <LayoutGrid className="h-4 w-4" aria-hidden="true" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="block text-[11px] text-[var(--muted)]">
                          版式结构（可选）
                        </span>
                        <span className="block truncate text-xs font-medium text-[var(--ink-soft)]">
                          自由构图 · 随文案自动留白排版
                        </span>
                      </div>
                      <span className="shrink-0 text-xs font-medium text-[var(--seal)]">指定</span>
                    </button>
                  ))}

                {/* Style Slot */}
                {selectedStyle ? (
                  <div className="flex items-center gap-2 rounded-[4px] border border-[var(--border)] bg-[var(--paper)] p-2 transition-colors hover:border-[var(--ink)]">
                    <button
                      type="button"
                      onClick={() => setPickerSlot('style')}
                      className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left"
                    >
                      <StyleArtwork
                        style={selectedStyle}
                        className="h-11 w-11 shrink-0 rounded-[2px]"
                      />
                      <div className="min-w-0 flex-1">
                        <span className="block text-[11px] text-[var(--muted)]">
                          画风材质 · {selectedStyle.id}
                          {selectedStyle.recommendedKinds.includes(draft.kind)
                            ? ` · 适配${selectedPurpose.label}`
                            : ' · 跨场景自选'}
                        </span>
                        <span className="block truncate text-xs font-semibold text-[var(--ink)]">
                          {selectedStyle.title}
                        </span>
                      </div>
                      <span className="shrink-0 text-xs font-medium text-[var(--seal)]">更换</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onChangeDraft({ ...draft, styleId: '' })}
                      title="清空画风，改为自由发挥"
                      aria-label="清空画风，改为自由发挥"
                      className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-[3px] text-[var(--muted)] transition-colors hover:bg-[var(--light)] hover:text-[var(--ink)]"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setPickerSlot('style')}
                    className="flex w-full cursor-pointer items-center gap-3 rounded-[4px] border border-dashed border-[#cfc9bc] bg-[var(--bg)] p-2 text-left transition-colors hover:border-[var(--ink)] hover:bg-[var(--paper)]"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[2px] border border-dashed border-[#d6d0c3] bg-[var(--paper)] text-[var(--muted)]">
                      <Sparkles className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="block text-[11px] text-[var(--muted)]">
                        画风材质（可选）
                      </span>
                      <span className="block truncate text-xs font-medium text-[var(--ink-soft)]">
                        自由发挥 · 顺应主题意境自然呈现
                      </span>
                    </div>
                    <span className="shrink-0 text-xs font-medium text-[var(--seal)]">指定</span>
                  </button>
                )}

                {/* Unified Color Slot */}
                {selectedPrimaryColor || selectedAccentColors.length > 0 ? (
                  <div className="flex items-center gap-2 rounded-[4px] border border-[var(--border)] bg-[var(--paper)] p-2 transition-colors hover:border-[var(--ink)]">
                    <button
                      type="button"
                      onClick={() => setPickerSlot('color')}
                      className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left"
                    >
                      <div
                        className="flex h-11 w-11 shrink-0 flex-col overflow-hidden rounded-[2px] border border-black/10"
                        aria-hidden="true"
                      >
                        <span
                          className="w-full flex-1"
                          style={{ backgroundColor: selectedPrimaryColor?.hex ?? '#F4F1EA' }}
                        />
                        <div className="flex h-3 w-full">
                          {selectedAccentColors.length > 0 ? (
                            selectedAccentColors.map((ac) => (
                              <span
                                key={ac.id}
                                className="flex-1"
                                style={{ backgroundColor: ac.hex }}
                              />
                            ))
                          ) : (
                            <span
                              className="flex-1"
                              style={{
                                backgroundColor: selectedPrimaryColor?.secondaryHex ?? '#E5E0D5',
                              }}
                            />
                          )}
                        </div>
                      </div>

                      <div className="min-w-0 flex-1">
                        <span className="block text-[11px] text-[var(--muted)]">
                          色彩搭配 · 主色与点缀色
                        </span>
                        <span className="block truncate text-xs font-semibold text-[var(--ink)]">
                          {selectedPrimaryColor ? selectedPrimaryColor.name : '跟随画风原色'}
                          {selectedAccentColors.length > 0
                            ? ` + ${selectedAccentColors.map((c) => c.name).join(' / ')}`
                            : ''}
                        </span>
                      </div>
                      <span className="shrink-0 text-xs font-medium text-[var(--seal)]">搭配</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onChangeDraft({ ...draft, primaryColorId: '', accentColorIds: [] })
                      }
                      title="清空主色与点缀色，跟随画风原色"
                      aria-label="清空主色与点缀色，跟随画风原色"
                      className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-[3px] text-[var(--muted)] transition-colors hover:bg-[var(--light)] hover:text-[var(--ink)]"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setPickerSlot('color')}
                    className="flex w-full cursor-pointer items-center gap-3 rounded-[4px] border border-dashed border-[#cfc9bc] bg-[var(--bg)] p-2 text-left transition-colors hover:border-[var(--ink)] hover:bg-[var(--paper)]"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[2px] border border-dashed border-[#d6d0c3] bg-[var(--paper)] text-[var(--muted)]">
                      <Palette className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="block text-[11px] text-[var(--muted)]">
                        色彩搭配（可选 · 同屏配主色与点缀色）
                      </span>
                      <span className="block truncate text-xs font-medium text-[var(--ink-soft)]">
                        跟随画风原色（不强行偏色）
                      </span>
                    </div>
                    <span className="shrink-0 text-xs font-medium text-[var(--seal)]">搭配</span>
                  </button>
                )}
              </div>
            </div>

            {/* 5. Aspect Ratio Picker + Engine Toggle */}
            <div className="space-y-3">
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-xs font-semibold text-[var(--ink)]">画幅比例</span>
                  <span className="text-[11px] text-[var(--muted)]">
                    {ASPECT_RATIOS.find((r) => r.value === draft.ratio)?.label ?? draft.ratio}
                  </span>
                </div>
                <div
                  role="radiogroup"
                  aria-label="选择画幅比例"
                  className="grid grid-cols-4 gap-1.5 sm:grid-cols-7"
                >
                  {ASPECT_RATIOS.map((r) => {
                    const active = draft.ratio === r.value;
                    const box = getTinyRatioDims(r.value);
                    return (
                      <button
                        key={r.value}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        aria-label={`画幅 ${r.label}`}
                        onClick={() => onChangeDraft({ ...draft, ratio: r.value })}
                        className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-[4px] border py-1.5 transition-colors ${
                          active
                            ? 'border-[var(--seal)] bg-[var(--accent-soft)] text-[var(--seal)]'
                            : 'border-[var(--border)] bg-[var(--paper)] text-[var(--ink-soft)] hover:border-[var(--ink)]'
                        }`}
                      >
                        <span
                          className="flex h-5 items-center justify-center"
                          aria-hidden="true"
                        >
                          <span
                            className={`border ${
                              active
                                ? 'border-[var(--seal)] bg-[var(--seal)]/15'
                                : 'border-[#9b9991] bg-[var(--bg)]'
                            }`}
                            style={{ width: `${box.w}px`, height: `${box.h}px` }}
                          />
                        </span>
                        <span className="font-tabular text-[10px] font-semibold leading-none">
                          {r.value}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-3 py-2">
                <span className="text-xs font-medium text-[var(--ink-soft)]">生成引擎</span>
                <div className="inline-flex gap-1 rounded-[3px] border border-[var(--border)] bg-[var(--paper)] p-0.5">
                  <button
                    type="button"
                    onClick={() => setUseAiPolish(true)}
                    className={`cursor-pointer whitespace-nowrap rounded-[2px] px-3 py-1 text-[11px] font-semibold transition-colors ${
                      useAiPolish
                        ? 'bg-[var(--ink)] text-[#fbf9f4]'
                        : 'text-[var(--muted)] hover:text-[var(--ink)]'
                    }`}
                  >
                    AI 润色
                  </button>
                  <button
                    type="button"
                    onClick={() => setUseAiPolish(false)}
                    className={`cursor-pointer whitespace-nowrap rounded-[2px] px-3 py-1 text-[11px] font-semibold transition-colors ${
                      !useAiPolish
                        ? 'bg-[var(--ink)] text-[#fbf9f4]'
                        : 'text-[var(--muted)] hover:text-[var(--ink)]'
                    }`}
                  >
                    极速模板
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Sticky Footer Action Bar */}
          <div className="shrink-0 border-t border-[var(--border)] bg-[var(--bg)] px-5 py-3.5 md:px-6">
            {errorBanner && (
              <div
                role="alert"
                className="mb-3 rounded-[4px] border border-[var(--seal)]/30 bg-[var(--accent-soft)] px-3 py-2 text-xs text-[var(--seal)]"
              >
                <p>{errorBanner.message}</p>
                {errorBanner.canFallback && (
                  <button
                    type="button"
                    onClick={() => {
                      setUseAiPolish(false);
                      runPromptGeneration(format, 'structured');
                    }}
                    className="mt-1.5 cursor-pointer font-semibold text-[var(--ink)] underline underline-offset-2"
                  >
                    改用极速结构化模板立即生成
                  </button>
                )}
              </div>
            )}

            <p
              title={conditionSummary}
              className="mb-2 truncate text-[11px] font-medium text-[var(--ink-soft)]"
            >
              当前条件：{conditionSummary}
            </p>

            {mode === 'prompt' ? (
              <button
                type="submit"
                disabled={isGenerating}
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-[4px] bg-[var(--ink)] px-5 py-3 text-sm font-semibold text-[#fbf9f4] transition-colors hover:bg-[#2e2e2b] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
                    <span>{useAiPolish ? '正在润色提示词…' : '正在生成…'}</span>
                  </>
                ) : (
                  <>
                    <span>生成提示词</span>
                    <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setMode('prompt')}
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-[4px] border border-[var(--ink)] bg-[var(--paper)] px-5 py-3 text-sm font-semibold text-[var(--ink)] transition-colors hover:bg-[var(--light)]"
              >
                <span>生图暂未开放 · 切换生成提示词</span>
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </form>

        {/* Right Output Canvas: Washi Grid Editorial Drafting Table */}
        <section
          ref={resultPanelRef}
          aria-label="创作结果"
          className="atelier-grid scroll-mt-16 flex min-h-[540px] flex-col p-5 sm:p-7 lg:col-span-7 lg:min-h-[calc(100dvh-64px)]"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-4">
            <div>
              <h2 className="font-editorial text-base font-bold text-[var(--ink)]">
                创作画案与提示词稿
              </h2>
              <p className="mt-0.5 text-xs text-[var(--muted)]">
                {lastPrompt
                  ? lastPrompt.usedAi
                    ? '已完成 AI 画面润色 · 支持一键快捷微调与版本对比'
                    : '已按结构化视觉规则生成 · 支持一键微调与多平台格式切换'
                  : '左侧调参时下方实时联动配方，写下一句话即可生成专业提示词'}
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenTasks}
              className="inline-flex cursor-pointer items-center gap-1 whitespace-nowrap text-xs font-medium text-[var(--ink)] hover:text-[var(--seal)] hover:underline underline-offset-4"
            >
              <span>全部任务记录</span>
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>

          {/* Live Synced Visual Recipe Moodboard */}
          <div className="mt-4">
            <RecipeMoodboard
              purpose={selectedPurpose}
              ratio={draft.ratio}
              layout={selectedLayout}
              style={selectedStyle}
              primaryColor={selectedPrimaryColor}
              accentColors={selectedAccentColors}
              compact={Boolean(lastPrompt)}
              onOpenPicker={(slot) => setPickerSlot(slot)}
            />
          </div>

          {isGenerating ? (
            <div
              aria-label="正在生成提示词"
              className="mt-4 flex flex-1 flex-col justify-between rounded-[4px] border border-[var(--border)] bg-[var(--paper)] p-5"
            >
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-medium text-[var(--seal)]">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  <span>正在为你融合场景构图、画风笔触与光影细节…</span>
                </div>
                <div className="space-y-2.5 pt-2">
                  <div className="animate-paper-breathe h-3.5 w-4/5 rounded-[2px] bg-[#ebe6dc]" />
                  <div className="animate-paper-breathe h-3.5 w-full rounded-[2px] bg-[#ebe6dc]" />
                  <div className="animate-paper-breathe h-3.5 w-11/12 rounded-[2px] bg-[#ebe6dc]" />
                </div>
                <div className="space-y-2.5 pt-2">
                  <div className="animate-paper-breathe h-3.5 w-3/4 rounded-[2px] bg-[#ebe6dc]" />
                  <div className="animate-paper-breathe h-3.5 w-full rounded-[2px] bg-[#ebe6dc]" />
                  <div className="animate-paper-breathe h-3.5 w-2/3 rounded-[2px] bg-[#ebe6dc]" />
                </div>
              </div>
              <p className="pt-4 text-[11px] text-[var(--muted)]">
                完成后将自动写入本轮版本对比记录
              </p>
            </div>
          ) : !lastPrompt ? (
            <div className="flex flex-1 flex-col justify-center py-7">
              <div className="mx-auto max-w-lg text-center">
                <h3 className="font-editorial text-xl font-bold text-[var(--ink)]">
                  从一句话开始，或直接试试精选案例
                </h3>
                <p className="mt-1.5 text-sm text-[var(--muted)] text-balance">
                  点击下方任一案例可一键填入画案并同步上方配方，也可顺手存为个人常用模板。
                </p>
              </div>

              <div className="mt-6 grid gap-3.5 sm:grid-cols-3">
                {INSPIRATION_PRESETS.map((preset) => (
                  <div
                    key={preset.id}
                    className="group flex flex-col justify-between rounded-[4px] border border-[var(--border)] bg-[var(--paper)] p-4 text-left transition-colors hover:border-[var(--ink)]"
                  >
                    <button
                      type="button"
                      onClick={() => handleApplyPreset(preset)}
                      className="flex-1 cursor-pointer text-left"
                    >
                      <span className="font-tabular text-[11px] font-semibold text-[var(--seal)]">
                        {preset.purposeLabel}
                      </span>
                      <h4 className="mt-1.5 font-editorial text-sm font-bold text-[var(--ink)]">
                        {preset.title}
                      </h4>
                      <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
                        {preset.subtitle}
                      </p>
                    </button>

                    <div className="mt-4 flex items-center justify-between gap-2 border-t border-[var(--border)] pt-3">
                      <button
                        type="button"
                        onClick={() => handleApplyPreset(preset)}
                        className="inline-flex cursor-pointer items-center gap-1 text-xs font-semibold text-[var(--ink)] hover:text-[var(--seal)] hover:underline underline-offset-2"
                      >
                        <span>一键填入</span>
                        <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSavePresetAsTemplate(preset)}
                        className="inline-flex cursor-pointer items-center gap-1 text-[11px] font-medium text-[var(--muted)] hover:text-[var(--seal)]"
                      >
                        <BookmarkPlus className="h-3 w-3" aria-hidden="true" />
                        <span>存为模板</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-4 flex flex-1 flex-col">
              {/* Format Switcher + Session Version Tabs */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div
                  role="tablist"
                  aria-label="目标工具提示词格式"
                  className="inline-flex flex-wrap gap-1 rounded-[4px] border border-[var(--border)] bg-[var(--paper)] p-0.5"
                >
                  {FORMAT_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      role="tab"
                      aria-selected={format === opt.id}
                      onClick={() => handleSwitchResultFormat(opt.id)}
                      className={`cursor-pointer whitespace-nowrap rounded-[3px] px-3 py-1.5 text-xs font-semibold transition-colors ${
                        format === opt.id
                          ? 'bg-[var(--ink)] text-[#fbf9f4]'
                          : 'text-[var(--ink-soft)] hover:text-[var(--ink)]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {sessionVersions.length > 0 && (
                  <div
                    role="tablist"
                    aria-label="本轮提示词版本对比"
                    className="inline-flex items-center gap-1"
                  >
                    <span className="mr-1 text-[11px] text-[var(--muted)]">本轮版本</span>
                    {sessionVersions.map((ver) => {
                      const active = ver.id === activeVersionId;
                      return (
                        <button
                          key={ver.id}
                          type="button"
                          role="tab"
                          aria-selected={active}
                          onClick={() => handleSelectSessionVersion(ver)}
                          className={`font-tabular cursor-pointer rounded-[3px] px-2 py-1 text-[11px] font-semibold transition-colors ${
                            active
                              ? 'bg-[var(--seal)] text-white'
                              : 'border border-[var(--border)] bg-[var(--paper)] text-[var(--ink-soft)] hover:border-[var(--ink)]'
                          }`}
                        >
                          {ver.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Quick Visual Refinement Strip */}
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-medium text-[var(--muted)]">快捷微调：</span>
                {PROMPT_REFINEMENT_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleQuickRefine(opt.id)}
                    className="cursor-pointer whitespace-nowrap rounded-[3px] border border-[var(--border)] bg-[var(--paper)] px-2.5 py-1 text-[11px] font-medium text-[var(--ink-soft)] transition-colors hover:border-[var(--seal)] hover:bg-[var(--accent-soft)] hover:text-[var(--seal)]"
                  >
                    + {opt.label}
                  </button>
                ))}
              </div>

              <label htmlFor="prompt-output" className="sr-only">
                生成的提示词
              </label>
              <textarea
                id="prompt-output"
                value={lastPrompt.text}
                onChange={(e) =>
                  onPromptGenerated({
                    id: `edit_${Date.now()}`,
                    type: 'prompt',
                    createdAt: new Date().toLocaleString('zh-CN', { hour12: false }),
                    format,
                    usedAi: lastPrompt.usedAi,
                    promptText: e.target.value,
                    draft,
                  })
                }
                rows={11}
                className="subtle-scroll mt-3 w-full flex-1 rounded-[4px] border border-[var(--border)] bg-[var(--paper)] p-4 text-sm leading-7 text-[var(--ink)]"
              />

              {/* Grouped Bottom Action Bar */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
                  <span>{FORMAT_OPTIONS.find((o) => o.id === format)?.hint}</span>
                  <span aria-hidden="true">·</span>
                  <span>消耗 0 次</span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleOpenSaveCurrentTemplate}
                    className="inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-[4px] border border-[var(--border)] bg-[var(--paper)] px-3 py-2 text-xs font-medium text-[var(--ink)] hover:border-[var(--ink)]"
                  >
                    <BookmarkPlus className="h-3.5 w-3.5 text-[var(--seal)]" aria-hidden="true" />
                    <span>存为模板</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => runPromptGeneration(format, useAiPolish ? 'ai' : 'structured')}
                    disabled={isGenerating}
                    className="inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-[4px] border border-[var(--border)] bg-[var(--paper)] px-3 py-2 text-xs font-medium text-[var(--ink)] hover:border-[var(--ink)] disabled:opacity-50"
                  >
                    <RefreshCw
                      className={`h-3.5 w-3.5 ${isGenerating ? 'animate-spin' : ''}`}
                      aria-hidden="true"
                    />
                    <span>重新生成</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportTxt}
                    className="inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-[4px] border border-[var(--border)] bg-[var(--paper)] px-3 py-2 text-xs font-medium text-[var(--ink)] hover:border-[var(--ink)]"
                  >
                    <Download className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>导出 TXT</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyPrompt}
                    className="inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-[4px] bg-[var(--ink)] px-4 py-2 text-xs font-semibold text-[#fbf9f4] transition-colors hover:bg-[var(--seal)]"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>已复制提示词</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>复制提示词</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Unified Visual Picker Modal */}
      <VisualPickerModal
        slot={pickerSlot}
        kind={draft.kind}
        styles={activeStyles}
        selectedId={
          pickerSlot === 'layout'
            ? draft.layoutId
            : pickerSlot === 'style'
            ? draft.styleId
            : draft.primaryColorId
        }
        selectedAccentIds={draft.accentColorIds}
        favoriteStyleIds={favoriteStyleIds}
        recentStyleIds={recentStyleIds}
        onToggleFavoriteStyle={onToggleFavoriteStyle}
        onSelect={(slot, id) => {
          if (slot === 'layout') {
            onChangeDraft({ ...draft, layoutId: id });
          } else if (slot === 'style') {
            onChangeDraft({ ...draft, styleId: id });
            if (id) onRecordRecentStyle(id);
          } else if (slot === 'color') {
            onChangeDraft({ ...draft, primaryColorId: id });
          }
        }}
        onApplyColorHarmony={(primaryId, accentIds) => {
          onChangeDraft({
            ...draft,
            primaryColorId: primaryId,
            accentColorIds: accentIds,
          });
          onNotify(
            primaryId || accentIds.length > 0
              ? '已更新色彩配方搭配'
              : '已设为跟随画风原色'
          );
        }}
        onClose={() => setPickerSlot(null)}
      />

      {/* Save / Rename Personal Template Modal */}
      {templateModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="template-modal-heading"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#171716]/55 p-4 backdrop-blur-xs"
          onClick={() => setTemplateModal(null)}
        >
          <form
            onSubmit={handleSubmitTemplateModal}
            onClick={(e) => e.stopPropagation()}
            className="animate-modal-in w-full max-w-md rounded-[6px] border border-[var(--border)] bg-[var(--paper)] p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between gap-3">
              <h2
                id="template-modal-heading"
                className="font-editorial text-base font-bold text-[var(--ink)]"
              >
                {templateModal.mode === 'rename' ? '重命名模板' : '保存为我的常用模板'}
              </h2>
              <button
                type="button"
                onClick={() => setTemplateModal(null)}
                aria-label="关闭模板弹窗"
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-[4px] border border-[var(--border)] text-[var(--ink)] hover:border-[var(--ink)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4">
              <label
                htmlFor="template-name-input"
                className="mb-1.5 block text-xs font-semibold text-[var(--ink)]"
              >
                模板名称
              </label>
              <input
                id="template-name-input"
                type="text"
                autoFocus
                required
                maxLength={36}
                value={templateModal.name}
                onChange={(e) =>
                  setTemplateModal({ ...templateModal, name: e.target.value })
                }
                placeholder="例如：小红书治愈日签、技术信息图常用"
                className="w-full rounded-[4px] border border-[var(--border)] bg-[var(--paper)] px-3.5 py-2.5 text-sm text-[var(--ink)]"
              />
            </div>

            {templateModal.mode === 'create' && (
              <>
                <div className="mt-4 rounded-[4px] border border-[var(--border)] bg-[var(--bg)] p-3">
                  <p className="text-[11px] font-semibold text-[var(--muted)]">将保存以下创作条件</p>
                  <p className="mt-1 text-xs leading-relaxed text-[var(--ink)]">
                    {summarizeDraftConditions(templateModal.draftSnapshot, activeStyles, LAYOUTS)}
                  </p>
                  <p className="mt-1 text-[11px] text-[var(--muted)]">
                    输出格式：{FORMAT_OPTIONS.find((f) => f.id === templateModal.formatSnapshot)?.label}
                  </p>
                </div>

                {templateModal.draftSnapshot.topic.trim().length > 0 && (
                  <label className="mt-3.5 flex cursor-pointer items-start gap-2 text-xs text-[var(--ink-soft)]">
                    <input
                      type="checkbox"
                      checked={templateModal.includeTopic}
                      onChange={(e) =>
                        setTemplateModal({ ...templateModal, includeTopic: e.target.checked })
                      }
                      className="mt-0.5 rounded-[2px] border-[var(--border)] accent-[var(--seal)]"
                    />
                    <span>同时保存当前文案作为默认开头（仅在输入框为空时自动填充）</span>
                  </label>
                )}
              </>
            )}

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setTemplateModal(null)}
                className="cursor-pointer rounded-[4px] border border-[var(--border)] bg-[var(--paper)] px-4 py-2 text-xs font-medium text-[var(--ink)] hover:border-[var(--ink)]"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={!templateModal.name.trim()}
                className="cursor-pointer rounded-[4px] bg-[var(--ink)] px-4 py-2 text-xs font-semibold text-[#fbf9f4] hover:bg-[var(--seal)] disabled:opacity-50"
              >
                {templateModal.mode === 'rename' ? '确认修改' : '保存模板'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
