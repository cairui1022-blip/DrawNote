import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUpRight,
  Bell,
  Bookmark,
  BookmarkPlus,
  Check,
  Copy,
  Download,
  LayoutGrid,
  Palette,
  Pencil,
  Pin,
  RefreshCw,
  SlidersHorizontal,
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
  applyUserTemplateToDraft,
  buildStructuredPrompt,
  getLayoutsForKind,
  pickRecommendedStyleForKind,
  resolveInitialWorkbenchMode,
  summarizeDraftConditions,
} from '../utils/promptEngine';
import { LayoutSchematic, StyleArtwork } from './CatalogArtwork';
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
  isAdmin: boolean;
  onOpenSkillAdmin?: () => void;
}

const FORMAT_OPTIONS: Array<{ id: PromptFormat; label: string; hint: string }> = [
  { id: 'cn_natural', label: '中文通用', hint: '适配即梦 / 豆包 / GPT-4o' },
  { id: 'en_mj', label: 'Midjourney 英文', hint: '自动附带 --ar 画幅参数' },
  { id: 'safe_style', label: '去作者名安全版', hint: '纯视觉笔触描述，防审核拦截' },
];

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
  isAdmin,
  onOpenSkillAdmin,
}: WorkbenchViewProps) {
  // No available image models -> smart default to 'prompt'
  const availableImageModels: string[] = [];
  const [mode, setMode] = useState<WorkbenchMode>(() =>
    resolveInitialWorkbenchMode(availableImageModels, null, false)
  );
  const [format, setFormat] = useState<PromptFormat>(lastPrompt?.format ?? 'cn_natural');
  const [useAiPolish, setUseAiPolish] = useState(true);
  const [pickerSlot, setPickerSlot] = useState<PickerSlot | null>(null);
  const [accentExpanded, setAccentExpanded] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorBanner, setErrorBanner] = useState<{ message: string; canFallback?: boolean } | null>(
    null
  );
  const [copied, setCopied] = useState(false);

  // Personal Template UX state
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [templateToast, setTemplateToast] = useState<string | null>(null);
  const [templateModal, setTemplateModal] = useState<{
    mode: 'create' | 'rename';
    targetId?: string;
    name: string;
    includeTopic: boolean;
    draftSnapshot: CreationDraft;
    formatSnapshot: PromptFormat;
  } | null>(null);

  const resultPanelRef = useRef<HTMLDivElement>(null);
  const accentPanelRef = useRef<HTMLDivElement>(null);

  const activeStyles = styles.length > 0 ? styles : STYLES;
  const selectedPurpose = PURPOSES.find((p) => p.id === draft.kind) ?? PURPOSES[0];
  const compatibleLayouts = useMemo(() => getLayoutsForKind(draft.kind, LAYOUTS), [draft.kind]);

  // All 3 visual feel dimensions are strictly optional: empty string ('') means Auto / Follow naturally
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

  const showTemplateFeedback = (msg: string) => {
    setTemplateToast(msg);
    window.setTimeout(() => {
      setTemplateToast((prev) => (prev === msg ? null : prev));
    }, 2600);
  };

  const totalCredits = session.creditsGift + session.creditsRedeem + session.creditsPaid;

  const [sceneSwitchHint, setSceneSwitchHint] = useState<string | null>(null);

  const handlePurposeChange = (kind: PurposeKind) => {
    const purpose = PURPOSES.find((p) => p.id === kind) ?? PURPOSES[0];
    const nextLayouts = getLayoutsForKind(kind, LAYOUTS);

    // Respect user's intentional optional/auto ('') state when switching scenes
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
      setSceneSwitchHint(
        `已自动匹配适配「${purpose.label}」的画风「${switchedStyleTitle}」，也可点击右侧 × 改为自由发挥`
      );
    } else {
      setSceneSwitchHint(null);
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
    setSceneSwitchHint(
      `已按「${selectedPurpose.label}」一键搭配${
        selectedPurpose.usesLayout && nextLayouts[0] ? `「${nextLayouts[0].title}」+ ` : ''
      }「${recommendedStyle.title}」，配色保持灵活可选`
    );
  };

  const handleToggleAccent = (colorId: string) => {
    const exists = draft.accentColorIds.includes(colorId);
    let next: string[];
    if (exists) {
      next = draft.accentColorIds.filter((id) => id !== colorId);
    } else if (draft.accentColorIds.length >= 2) {
      next = [draft.accentColorIds[1], colorId];
    } else {
      next = [...draft.accentColorIds, colorId];
    }
    onChangeDraft({ ...draft, accentColorIds: next });
  };

  const handleApplyPreset = (preset: InspirationPreset) => {
    onChangeDraft({ ...preset.draft });
    onRecordRecentStyle(preset.draft.styleId);
    setActiveTemplateId(null);
    setMode('prompt');
    setErrorBanner(null);
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
    showTemplateFeedback(`已将「${preset.title}」存入我的常用模板`);
  };

  const handleApplyUserTemplate = (tpl: UserTemplate) => {
    const nextDraft = applyUserTemplateToDraft(draft, tpl);
    onChangeDraft(nextDraft);
    setFormat(tpl.format);
    setActiveTemplateId(tpl.id);
    if (nextDraft.styleId) {
      onRecordRecentStyle(nextDraft.styleId);
    }
    setSceneSwitchHint(null);
    setErrorBanner(null);
    showTemplateFeedback(`已套用模板「${tpl.name}」`);
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
    showTemplateFeedback(`已用当前参数覆盖更新「${activeTemplate.name}」`);
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
        showTemplateFeedback(`模板已重命名为「${cleanName}」`);
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
      showTemplateFeedback(`已保存常用模板「${cleanName}」`);
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
  };

  return (
    <div className="mx-auto max-w-[1360px] px-4 py-6 md:px-8">
      <div className="grid items-start gap-6 lg:grid-cols-12">
        {/* Left Editor Panel: Sticky Footer on Desktop */}
        <form
          onSubmit={handleFormSubmit}
          className="flex flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-white lg:sticky lg:top-20 lg:col-span-5 lg:max-h-[calc(100dvh-104px)]"
        >
          {/* Fixed Editor Header & Mode Switch */}
          <div className="shrink-0 border-b border-[var(--border)] px-5 pb-4 pt-5">
            <div className="flex items-baseline justify-between gap-2">
              <div>
                <p className="text-xs text-[var(--muted)]">画语创作空间</p>
                <h1 className="mt-0.5 font-editorial text-xl font-semibold text-[var(--ink)]">
                  把一句话，画成一幅画
                </h1>
              </div>
              <span className="text-xs text-[var(--muted)]">私密创作</span>
            </div>

            {/* Mode Segmented Control */}
            <div
              role="group"
              aria-label="生成方式"
              className="mt-3.5 grid grid-cols-2 gap-1 rounded-xl bg-[var(--light)] p-1"
            >
              <button
                type="button"
                aria-pressed={mode === 'prompt'}
                onClick={() => {
                  setMode('prompt');
                  setErrorBanner(null);
                }}
                className={`cursor-pointer whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                  mode === 'prompt'
                    ? 'bg-white text-[var(--ink)] shadow-xs'
                    : 'text-[var(--muted)] hover:text-[var(--ink)]'
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
                className={`cursor-pointer whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                  mode === 'image'
                    ? 'bg-white text-[var(--ink)] shadow-xs'
                    : 'text-[var(--muted)] hover:text-[var(--ink)]'
                }`}
              >
                生成图片 · 即将开放
              </button>
            </div>
          </div>

          {/* Scrollable Form Fields */}
          <div className="subtle-scroll min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
            {mode === 'image' && (
              <div className="rounded-xl border border-[#d6e2d5] bg-[#f4f8f2] p-4">
                <p className="text-sm font-semibold text-[var(--ink)]">
                  站内生图模型即将开放
                </p>
                <p className="mt-1 text-xs leading-relaxed text-[var(--ink-soft)]">
                  你的新用户赠送额度（<span className="font-tabular font-semibold">{totalCredits} 次</span>）已安全保留且永不过期。现在可订阅上线提醒，或立刻使用免费的「生成提示词」配合即梦、Midjourney 出图。
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={onToggleWaitlist}
                    className={`inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors ${
                      session.waitlistSubscribed
                        ? 'border border-[var(--green)] bg-white text-[var(--green)]'
                        : 'bg-[var(--green)] text-white hover:bg-[var(--green-hover)]'
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
                    className="cursor-pointer whitespace-nowrap rounded-lg border border-[var(--border)] bg-white px-3.5 py-2 text-xs font-medium text-[var(--ink)] hover:bg-[var(--light)]"
                  >
                    切回生成提示词
                  </button>
                </div>
              </div>
            )}

            {/* Personal Reusable Templates Strip */}
            <div className="rounded-xl border border-[var(--border)] bg-[#fafbf8] p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Bookmark className="h-3.5 w-3.5 text-[var(--green)]" aria-hidden="true" />
                  <span className="text-xs font-semibold text-[var(--ink)]">
                    我的常用模板
                  </span>
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
                      className="cursor-pointer whitespace-nowrap rounded-md border border-[var(--border)] bg-white px-2 py-1 text-[11px] font-medium text-[var(--ink-soft)] transition-colors hover:border-[var(--green)] hover:text-[var(--green)]"
                    >
                      覆盖更新
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleOpenSaveCurrentTemplate}
                    className="inline-flex cursor-pointer items-center gap-1 whitespace-nowrap rounded-md border border-[#c5d6c7] bg-white px-2.5 py-1 text-[11px] font-semibold text-[var(--green)] transition-colors hover:border-[var(--green)] hover:bg-[#eef5ef]"
                  >
                    <BookmarkPlus className="h-3 w-3" aria-hidden="true" />
                    <span>存当前为模板</span>
                  </button>
                </div>
              </div>

              {templateToast && (
                <p className="mt-2 rounded-lg bg-[#eef5ef] px-2.5 py-1.5 text-[11px] font-medium text-[var(--green)]">
                  {templateToast}
                </p>
              )}

              {sortedTemplates.length === 0 ? (
                <p className="mt-2 text-[11px] leading-relaxed text-[var(--muted)]">
                  调好常用场景、画幅、画风或留空偏好后，点右上角「存当前为模板」，下次创作一键复用。
                </p>
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
                        className={`group flex items-center gap-2 rounded-lg border px-2.5 py-2 transition-colors ${
                          isActive
                            ? 'border-[var(--green)] bg-white ring-1 ring-[var(--green)]/20'
                            : 'border-[var(--border)] bg-white hover:border-[#9eb4a3]'
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
                                className="h-3 w-3 shrink-0 fill-[var(--green)] text-[var(--green)]"
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
                            className={`flex h-6 w-6 cursor-pointer items-center justify-center rounded-md transition-colors ${
                              tpl.pinned
                                ? 'text-[var(--green)] hover:bg-[#eef5ef]'
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
                            className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-md text-[var(--muted)] transition-colors hover:bg-[var(--light)] hover:text-[var(--ink)]"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onDeleteTemplate(tpl.id);
                              if (activeTemplateId === tpl.id) setActiveTemplateId(null);
                              showTemplateFeedback(`已删除模板「${tpl.name}」`);
                            }}
                            title="删除模板"
                            aria-label={`删除 ${tpl.name}`}
                            className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-md text-[var(--muted)] transition-colors hover:bg-[#fdf2f0] hover:text-[#b43b2c]"
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

            {/* Purpose selector */}
            <div>
              <label htmlFor="purpose-select" className="mb-1.5 block text-xs font-semibold text-[var(--ink)]">
                用途场景
              </label>
              <select
                id="purpose-select"
                value={draft.kind}
                onChange={(e) => handlePurposeChange(e.target.value as PurposeKind)}
                className="w-full rounded-xl border border-[var(--border)] bg-white px-3.5 py-2.5 text-sm text-[var(--ink)]"
              >
                {PURPOSES.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label} — {p.shortDesc}
                  </option>
                ))}
              </select>
            </div>

            {/* Topic textarea */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="topic-input" className="text-xs font-semibold text-[var(--ink)]">
                  想画什么？
                </label>
                <span className="font-tabular text-[11px] text-[var(--muted)]">
                  {draft.topic.length} 字
                </span>
              </div>
              <textarea
                id="topic-input"
                rows={4}
                value={draft.topic}
                onChange={(e) => {
                  onChangeDraft({ ...draft, topic: e.target.value });
                  if (errorBanner) setErrorBanner(null);
                }}
                placeholder="描述你的主题、希望表达的内容，或粘贴已有文案…"
                className="w-full resize-y rounded-xl border border-[var(--border)] bg-white px-3.5 py-2.5 text-sm leading-relaxed text-[var(--ink)] placeholder:text-[#96a39b]"
              />
            </div>

            {/* Optional Visual Feel Pickers (Layout / Style / Primary Color — ALL Optional) */}
            <div>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xs font-semibold text-[var(--ink)]">画面感觉</span>
                  <span className="text-[11px] text-[var(--muted)]">均为可选 · 留空由系统自由发挥</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={handleSmartPair}
                    className="inline-flex cursor-pointer items-center gap-1 text-[11px] font-semibold text-[var(--green)] hover:underline underline-offset-2"
                  >
                    <Wand2 className="h-3 w-3" aria-hidden="true" />
                    <span>智能搭配</span>
                  </button>
                  {isAdmin && onOpenSkillAdmin && (
                    <button
                      type="button"
                      onClick={onOpenSkillAdmin}
                      className="cursor-pointer text-[11px] font-medium text-[var(--muted)] hover:text-[var(--green)] hover:underline underline-offset-2"
                    >
                      管理 Skill ↗
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-2.5">
                {/* 1. Layout Slot (Optional) */}
                {selectedPurpose.usesLayout &&
                  (selectedLayout ? (
                    <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-white p-2.5 transition-colors hover:border-[var(--green)] hover:bg-[#fafcf9]">
                      <button
                        type="button"
                        onClick={() => setPickerSlot('layout')}
                        className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left"
                      >
                        <LayoutSchematic
                          layout={selectedLayout}
                          className="h-12 w-12 shrink-0 rounded-lg p-1"
                        />
                        <div className="min-w-0 flex-1">
                          <span className="block text-[11px] text-[var(--muted)]">
                            版式结构 · 已锁定
                          </span>
                          <span className="block truncate text-sm font-semibold text-[var(--ink)]">
                            {selectedLayout.title}
                          </span>
                        </div>
                        <span className="shrink-0 text-xs text-[var(--green)]">更换</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onChangeDraft({ ...draft, layoutId: '' })}
                        title="清空版式，改为自由构图"
                        aria-label="清空版式，改为自由构图"
                        className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-lg text-[var(--muted)] transition-colors hover:bg-[var(--light)] hover:text-[var(--ink)]"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setPickerSlot('layout')}
                      className="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-dashed border-[#c7d3c8] bg-[#fafbf8] p-2.5 text-left transition-colors hover:border-[var(--green)] hover:bg-[#f4f8f2]"
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-dashed border-[#cdd7ce] bg-white text-[var(--muted)]">
                        <LayoutGrid className="h-4 w-4" aria-hidden="true" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="block text-[11px] text-[var(--muted)]">
                          版式结构（可选）
                        </span>
                        <span className="block truncate text-xs font-medium text-[var(--ink-soft)]">
                          自由构图 · 随文案字数自动排版
                        </span>
                      </div>
                      <span className="shrink-0 text-xs font-medium text-[var(--green)]">指定</span>
                    </button>
                  ))}

                {sceneSwitchHint && (
                  <p className="rounded-lg border border-[#d6e2d5] bg-[#f4f8f2] px-3 py-2 text-[11px] leading-relaxed text-[var(--green)]">
                    {sceneSwitchHint}
                  </p>
                )}

                {/* 2. Style Slot (Optional) */}
                {selectedStyle ? (
                  <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-white p-2.5 transition-colors hover:border-[var(--green)] hover:bg-[#fafcf9]">
                    <button
                      type="button"
                      onClick={() => setPickerSlot('style')}
                      className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left"
                    >
                      <StyleArtwork style={selectedStyle} className="h-12 w-12 shrink-0 rounded-lg" />
                      <div className="min-w-0 flex-1">
                        <span className="block text-[11px] text-[var(--muted)]">
                          画风材质 · {selectedStyle.id}
                          {selectedStyle.recommendedKinds.includes(draft.kind)
                            ? ` · 适配${selectedPurpose.label}`
                            : ' · 跨场景自选'}
                        </span>
                        <span className="block truncate text-sm font-semibold text-[var(--ink)]">
                          {selectedStyle.title}
                        </span>
                      </div>
                      <span className="shrink-0 text-xs text-[var(--green)]">更换</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onChangeDraft({ ...draft, styleId: '' });
                        setSceneSwitchHint(null);
                      }}
                      title="清空画风，改为自由发挥"
                      aria-label="清空画风，改为自由发挥"
                      className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-lg text-[var(--muted)] transition-colors hover:bg-[var(--light)] hover:text-[var(--ink)]"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setPickerSlot('style')}
                    className="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-dashed border-[#c7d3c8] bg-[#fafbf8] p-2.5 text-left transition-colors hover:border-[var(--green)] hover:bg-[#f4f8f2]"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-dashed border-[#cdd7ce] bg-white text-[var(--muted)]">
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
                    <span className="shrink-0 text-xs font-medium text-[var(--green)]">指定</span>
                  </button>
                )}

                {/* 3. Color Slot (Optional — Defaults to Auto / Follow Style Natural Palette) */}
                {selectedPrimaryColor ? (
                  <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-white p-2.5 transition-colors hover:border-[var(--green)] hover:bg-[#fafcf9]">
                    <button
                      type="button"
                      onClick={() => setPickerSlot('color')}
                      className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left"
                    >
                      <div
                        className="flex h-12 w-12 shrink-0 flex-col overflow-hidden rounded-lg border border-black/10"
                        aria-hidden="true"
                      >
                        <span
                          className="w-full flex-1"
                          style={{ backgroundColor: selectedPrimaryColor.hex }}
                        />
                        <div className="flex h-3.5 w-full">
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
                              style={{ backgroundColor: selectedPrimaryColor.secondaryHex }}
                            />
                          )}
                        </div>
                      </div>

                      <div className="min-w-0 flex-1">
                        <span className="block text-[11px] text-[var(--muted)]">
                          色彩搭配 · 已锁定主色
                        </span>
                        <span className="block truncate text-sm font-semibold text-[var(--ink)]">
                          {selectedPrimaryColor.name}
                          {selectedAccentColors.length > 0
                            ? ` + ${selectedAccentColors.map((c) => c.name).join(' / ')}`
                            : ''}
                        </span>
                      </div>
                      <span className="shrink-0 text-xs text-[var(--green)]">更换</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onChangeDraft({ ...draft, primaryColorId: '' })}
                      title="清空主色，跟随画风原色"
                      aria-label="清空主色，跟随画风原色"
                      className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-lg text-[var(--muted)] transition-colors hover:bg-[var(--light)] hover:text-[var(--ink)]"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setPickerSlot('color')}
                    className="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-dashed border-[#c7d3c8] bg-[#fafbf8] p-2.5 text-left transition-colors hover:border-[var(--green)] hover:bg-[#f4f8f2]"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-dashed border-[#cdd7ce] bg-white text-[var(--muted)]">
                      {selectedAccentColors.length > 0 ? (
                        <div className="flex h-7 w-7 overflow-hidden rounded-full border border-black/10">
                          {selectedAccentColors.map((ac) => (
                            <span
                              key={ac.id}
                              className="flex-1"
                              style={{ backgroundColor: ac.hex }}
                            />
                          ))}
                        </div>
                      ) : (
                        <Palette className="h-4 w-4" aria-hidden="true" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="block text-[11px] text-[var(--muted)]">
                        色彩搭配（可选）
                      </span>
                      <span className="block truncate text-xs font-medium text-[var(--ink-soft)]">
                        {selectedAccentColors.length > 0
                          ? `跟随画风原色 + 点缀 ${selectedAccentColors.map((c) => c.name).join(' / ')}`
                          : '跟随画风原色（不强行偏色）'}
                      </span>
                    </div>
                    <span className="shrink-0 text-xs font-medium text-[var(--green)]">指定</span>
                  </button>
                )}
              </div>

              {/* Visual HEX Swatch Grid for Accent Colors */}
              <div className="mt-3">
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    aria-expanded={accentExpanded}
                    onClick={() => {
                      setAccentExpanded((prev) => {
                        const next = !prev;
                        if (next) {
                          window.requestAnimationFrame(() => {
                            accentPanelRef.current?.scrollIntoView({
                              behavior: 'smooth',
                              block: 'nearest',
                            });
                          });
                        }
                        return next;
                      });
                    }}
                    className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-[var(--ink-soft)] hover:text-[var(--green)]"
                  >
                    <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>
                      点缀色色板（可选，最多 2 种 · 已选 {draft.accentColorIds.length} 种）
                    </span>
                  </button>
                  {draft.accentColorIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => onChangeDraft({ ...draft, accentColorIds: [] })}
                      className="cursor-pointer text-[11px] text-[var(--muted)] hover:text-[var(--ink)]"
                    >
                      清空点缀色
                    </button>
                  )}
                </div>

                {accentExpanded && (
                  <div
                    ref={accentPanelRef}
                    className="mt-2.5 rounded-xl border border-[var(--border)] bg-[#fafbf8] p-3"
                  >
                    <div className="flex flex-wrap gap-2">
                      {COLOR_PALETTES.map((c) => {
                        const active = draft.accentColorIds.includes(c.id);
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => handleToggleAccent(c.id)}
                            title={`${c.name} (${c.hex})`}
                            aria-pressed={active}
                            aria-label={`点缀色 ${c.name}`}
                            className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] transition-colors ${
                              active
                                ? 'border-[var(--green)] bg-white font-semibold text-[var(--ink)] ring-1 ring-[var(--green)]'
                                : 'border-[var(--border)] bg-white/80 text-[var(--ink-soft)] hover:border-[#9eb4a3]'
                            }`}
                          >
                            <span
                              className="h-3 w-3 shrink-0 rounded-full border border-black/15"
                              style={{ backgroundColor: c.hex }}
                            />
                            <span>{c.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Aspect Ratio & Prompt Polish Engine Option */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="ratio-select" className="mb-1.5 block text-xs font-semibold text-[var(--ink)]">
                  画幅比例
                </label>
                <select
                  id="ratio-select"
                  value={draft.ratio}
                  onChange={(e) => onChangeDraft({ ...draft, ratio: e.target.value })}
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
                <span className="mb-1.5 block text-xs font-semibold text-[var(--ink)]">
                  生成引擎
                </span>
                <div className="grid grid-cols-2 gap-1 rounded-xl border border-[var(--border)] bg-[#fafbf8] p-1">
                  <button
                    type="button"
                    onClick={() => setUseAiPolish(true)}
                    className={`cursor-pointer whitespace-nowrap rounded-lg px-2 py-1.5 text-[11px] font-semibold transition-colors ${
                      useAiPolish
                        ? 'bg-white text-[var(--green)] shadow-xs'
                        : 'text-[var(--muted)] hover:text-[var(--ink)]'
                    }`}
                  >
                    AI 润色
                  </button>
                  <button
                    type="button"
                    onClick={() => setUseAiPolish(false)}
                    className={`cursor-pointer whitespace-nowrap rounded-lg px-2 py-1.5 text-[11px] font-semibold transition-colors ${
                      !useAiPolish
                        ? 'bg-white text-[var(--green)] shadow-xs'
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
          <div className="shrink-0 border-t border-[var(--border)] bg-[#fafbf8] px-5 py-3.5">
            {errorBanner && (
              <div
                role="alert"
                className="mb-3 rounded-xl border border-[#e7c3be] bg-[#fdf4f3] px-3 py-2 text-xs text-[#9e3124]"
              >
                <p>{errorBanner.message}</p>
                {errorBanner.canFallback && (
                  <button
                    type="button"
                    onClick={() => {
                      setUseAiPolish(false);
                      runPromptGeneration(format, 'structured');
                    }}
                    className="mt-1.5 cursor-pointer font-semibold text-[var(--green)] underline underline-offset-2"
                  >
                    改用极速结构化模板立即生成
                  </button>
                )}
              </div>
            )}

            {/* Live Condition Summary */}
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
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[var(--green)] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--green-hover)] disabled:cursor-not-allowed disabled:opacity-60"
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
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-[var(--green)] bg-white px-5 py-3 text-sm font-semibold text-[var(--green)] transition-colors hover:bg-[var(--light)]"
              >
                <span>生图暂未开放 · 切换生成提示词</span>
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </form>

        {/* Right Output Panel */}
        <section
          ref={resultPanelRef}
          aria-label="创作结果"
          className="scroll-mt-20 flex min-h-[540px] flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface-alt)] p-5 sm:p-6 lg:col-span-7 lg:min-h-[calc(100dvh-104px)]"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#dde3d8] pb-4">
            <div>
              <h2 className="text-sm font-semibold text-[var(--ink)]">创作结果</h2>
              <p className="mt-0.5 text-xs text-[var(--muted)]">
                {lastPrompt
                  ? lastPrompt.usedAi
                    ? '已完成 AI 画面润色 · 可自由切换多平台格式或直接编辑'
                    : '已按结构化视觉规则生成 · 零冗余元指令'
                  : '只写一句主题即可生成，也可按需锁定版式、画风或配色'}
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenTasks}
              className="inline-flex cursor-pointer items-center gap-1 whitespace-nowrap text-xs font-medium text-[var(--green)] hover:underline underline-offset-4"
            >
              <span>任务记录</span>
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>

          {!lastPrompt ? (
            /* Productive Empty State with 3 One-Tap Inspiration Templates */
            <div className="flex flex-1 flex-col justify-center py-8">
              <div className="mx-auto max-w-lg text-center">
                <Sparkles className="mx-auto h-7 w-7 text-[var(--green)]/70" aria-hidden="true" />
                <h3 className="mt-3 font-editorial text-xl font-semibold text-[var(--ink)]">
                  从一句话开始，或直接试试精选案例
                </h3>
                <p className="mt-2 text-sm text-[var(--muted)] text-balance">
                  点击下方任一案例可一键填入画布，也可顺手收藏为你的个人常用模板。
                </p>
              </div>

              <div className="mt-7 grid gap-3 sm:grid-cols-3">
                {INSPIRATION_PRESETS.map((preset) => (
                  <div
                    key={preset.id}
                    className="group flex flex-col justify-between rounded-xl border border-[var(--border)] bg-white p-4 text-left transition-colors hover:border-[var(--green)] hover:bg-[#fcfdfb]"
                  >
                    <button
                      type="button"
                      onClick={() => handleApplyPreset(preset)}
                      className="flex-1 cursor-pointer text-left"
                    >
                      <span className="text-[11px] font-medium text-[var(--green)]">
                        {preset.purposeLabel}
                      </span>
                      <h4 className="mt-1.5 text-sm font-semibold text-[var(--ink)]">
                        {preset.title}
                      </h4>
                      <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
                        {preset.subtitle}
                      </p>
                    </button>

                    <div className="mt-4 flex items-center justify-between gap-2 border-t border-[#f0efe8] pt-3">
                      <button
                        type="button"
                        onClick={() => handleApplyPreset(preset)}
                        className="inline-flex cursor-pointer items-center gap-1 text-xs font-semibold text-[var(--green)] hover:underline underline-offset-2"
                      >
                        <span>一键填入</span>
                        <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSavePresetAsTemplate(preset)}
                        className="inline-flex cursor-pointer items-center gap-1 text-[11px] font-medium text-[var(--muted)] hover:text-[var(--green)]"
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
            /* Populated Prompt Result with 3-Platform Format Switcher */
            <div className="mt-4 flex flex-1 flex-col">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div
                  role="tablist"
                  aria-label="目标工具提示词格式"
                  className="inline-flex flex-wrap gap-1 rounded-xl bg-[#e5ebe0] p-1"
                >
                  {FORMAT_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      role="tab"
                      aria-selected={format === opt.id}
                      onClick={() => handleSwitchResultFormat(opt.id)}
                      className={`cursor-pointer whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                        format === opt.id
                          ? 'bg-white text-[var(--ink)] shadow-xs'
                          : 'text-[var(--ink-soft)] hover:text-[var(--ink)]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <span className="text-xs text-[var(--muted)]">
                  {FORMAT_OPTIONS.find((o) => o.id === format)?.hint}
                </span>
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
                rows={13}
                className="subtle-scroll mt-3 w-full flex-1 rounded-xl border border-[var(--border)] bg-white p-4 text-sm leading-7 text-[var(--ink)]"
              />

              {/* Grouped Bottom Action Bar */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
                  <span>本次消耗 0 次</span>
                  <span aria-hidden="true">·</span>
                  <span>已自动保存至任务记录</span>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => runPromptGeneration(format, useAiPolish ? 'ai' : 'structured')}
                    disabled={isGenerating}
                    className="inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg border border-[var(--border)] bg-white px-3.5 py-2 text-xs font-medium text-[var(--ink)] hover:bg-[var(--light)] disabled:opacity-50"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isGenerating ? 'animate-spin' : ''}`} aria-hidden="true" />
                    <span>重新生成</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportTxt}
                    className="inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg border border-[var(--border)] bg-white px-3.5 py-2 text-xs font-medium text-[var(--ink)] hover:bg-[var(--light)]"
                  >
                    <Download className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>导出 TXT</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyPrompt}
                    className="inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg bg-[var(--green)] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[var(--green-hover)]"
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
        favoriteStyleIds={favoriteStyleIds}
        recentStyleIds={recentStyleIds}
        onToggleFavoriteStyle={onToggleFavoriteStyle}
        onSelect={(slot, id) => {
          if (slot === 'layout') {
            onChangeDraft({ ...draft, layoutId: id });
          } else if (slot === 'style') {
            onChangeDraft({ ...draft, styleId: id });
            if (id) onRecordRecentStyle(id);
            setSceneSwitchHint(null);
          } else if (slot === 'color') {
            onChangeDraft({ ...draft, primaryColorId: id });
          }
        }}
        onClose={() => setPickerSlot(null)}
      />

      {/* Save / Rename Personal Template Modal */}
      {templateModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="template-modal-heading"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#183628]/45 p-4 backdrop-blur-xs"
          onClick={() => setTemplateModal(null)}
        >
          <form
            onSubmit={handleSubmitTemplateModal}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-white p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between gap-3">
              <h2
                id="template-modal-heading"
                className="text-base font-semibold text-[var(--ink)]"
              >
                {templateModal.mode === 'rename' ? '重命名模板' : '保存为我的常用模板'}
              </h2>
              <button
                type="button"
                onClick={() => setTemplateModal(null)}
                aria-label="关闭模板弹窗"
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-[var(--border)] text-[var(--ink)] hover:bg-[var(--light)]"
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
                className="w-full rounded-xl border border-[var(--border)] bg-white px-3.5 py-2.5 text-sm text-[var(--ink)]"
              />
            </div>

            {templateModal.mode === 'create' && (
              <>
                <div className="mt-4 rounded-xl border border-[var(--border)] bg-[#fafbf8] p-3">
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
                      className="mt-0.5 rounded border-[var(--border)] accent-[var(--green)]"
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
                className="cursor-pointer rounded-lg border border-[var(--border)] bg-white px-4 py-2 text-xs font-medium text-[var(--ink)] hover:bg-[var(--light)]"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={!templateModal.name.trim()}
                className="cursor-pointer rounded-lg bg-[var(--green)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--green-hover)] disabled:opacity-50"
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
