import { useState } from 'react';
import {
  ArrowUpRight,
  Bookmark,
  Check,
  Copy,
  Download,
  LogOut,
  Pencil,
  Pin,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { LAYOUTS, PURPOSES, STYLES } from '../data/catalog';
import { summarizeDraftConditions } from '../utils/promptEngine';
import type {
  CreationDraft,
  PromptHistoryRecord,
  StyleItem,
  UserSession,
  UserTemplate,
} from '../types';

export type AccountTab = 'credits' | 'tasks' | 'templates' | 'invites' | 'orders';

interface AccountViewProps {
  session: UserSession;
  styles: StyleItem[];
  activeTab: AccountTab;
  history: PromptHistoryRecord[];
  templates: UserTemplate[];
  onChangeTab: (tab: AccountTab) => void;
  onReplayDraft: (draft: CreationDraft, promptRecord: PromptHistoryRecord) => void;
  onApplyTemplate: (template: UserTemplate) => void;
  onRenameTemplate: (id: string, name: string) => void;
  onDeleteTemplate: (id: string) => void;
  onTogglePinTemplate: (id: string) => void;
  onRedeemCode: (code: string) => Promise<{ ok: boolean; message: string }>;
  onReturnWorkbench: () => void;
  onLogout: () => void;
}

const FORMAT_LABELS: Record<string, string> = {
  cn_natural: '中文通用',
  en_mj: 'Midjourney 英文',
  safe_style: '去作者名安全版',
};

export function AccountView({
  session,
  styles,
  activeTab,
  history,
  templates,
  onChangeTab,
  onReplayDraft,
  onApplyTemplate,
  onRenameTemplate,
  onDeleteTemplate,
  onTogglePinTemplate,
  onRedeemCode,
  onReturnWorkbench,
  onLogout,
}: AccountViewProps) {
  const [taskFilter, setTaskFilter] = useState<'all' | 'prompt' | 'image'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [editingTemplateName, setEditingTemplateName] = useState('');
  const [redeemInput, setRedeemInput] = useState('');
  const [redeemFeedback, setRedeemFeedback] = useState<{ ok: boolean; message: string } | null>(
    null
  );
  const [inviteCopied, setInviteCopied] = useState(false);

  const sortedTemplates = [...templates].sort((a, b) => {
    if (Boolean(a.pinned) !== Boolean(b.pinned)) {
      return a.pinned ? -1 : 1;
    }
    return b.updatedAt.localeCompare(a.updatedAt);
  });

  const totalCredits = session.creditsGift + session.creditsRedeem + session.creditsPaid;

  const filteredTasks = history.filter((item) => {
    if (taskFilter === 'all') return true;
    return item.type === taskFilter;
  });

  const handleCopyTask = async (record: PromptHistoryRecord) => {
    try {
      await navigator.clipboard.writeText(record.promptText);
      setCopiedId(record.id);
      window.setTimeout(() => setCopiedId(null), 1800);
    } catch {
      // Fallback ignored cleanly
    }
  };

  const [redeemBusy, setRedeemBusy] = useState(false);

  const handleRedeemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (redeemBusy) return;
    setRedeemBusy(true);
    try {
      const res = await onRedeemCode(redeemInput);
      setRedeemFeedback(res);
      if (res.ok) setRedeemInput('');
    } finally {
      setRedeemBusy(false);
    }
  };

  const handleCopyInvite = async () => {
    const inviteSeed =
      session.username || session.email?.split('@')[0] || session.displayName;
    const link = `${window.location.origin}/?invite=${encodeURIComponent(inviteSeed)}`;
    try {
      await navigator.clipboard.writeText(link);
      setInviteCopied(true);
      window.setTimeout(() => setInviteCopied(false), 2000);
    } catch {
      setInviteCopied(true);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-5 py-10 md:px-8">
      {/* Account Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--border-strong)] pb-6">
        <div>
          <p className="font-tabular text-[11px] font-semibold tracking-[0.1em] text-[var(--seal)]">
            CREATOR ARCHIVE · 个人创作档案
          </p>
          <h1 className="mt-1 font-editorial text-2xl font-bold text-[var(--ink)] sm:text-3xl">
            我的创作账户
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {session.authType === 'username' ? `账号名：${session.displayName}` : session.displayName}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onReturnWorkbench}
            className="inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-[4px] bg-[var(--ink)] px-4 py-2 text-xs font-semibold text-[#fbf9f4] transition-colors hover:bg-[#2e2e2b]"
          >
            <span>返回创作画案</span>
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-[4px] border border-[var(--border)] bg-[var(--paper)] px-4 py-2 text-xs font-medium text-[var(--ink)] transition-colors hover:border-[var(--ink)]"
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
            <span>退出登录</span>
          </button>
        </div>
      </div>

      {/* Credit Summary */}
      <section className="mt-6 rounded-[4px] border border-[var(--border)] bg-[var(--paper)] p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-[var(--muted)]">可用生图次数</p>
            <p className="font-tabular mt-1 text-4xl font-bold text-[var(--ink)]">
              {totalCredits}
              <span className="ml-1.5 text-sm font-normal text-[var(--muted)]">次</span>
            </p>
            <p className="mt-2 text-xs text-[var(--muted)]">
              来源构成：赠送 {session.creditsGift} · 兑换码 {session.creditsRedeem} · 充值{' '}
              {session.creditsPaid}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--ink-soft)]">
            {session.creditsReserved > 0 && (
              <span>生图占用：{session.creditsReserved} 次</span>
            )}
            {session.creditsRefundFrozen > 0 && (
              <span>退款冻结：{session.creditsRefundFrozen} 次</span>
            )}
            <button
              type="button"
              onClick={() => onChangeTab('orders')}
              className="cursor-pointer font-medium text-[var(--seal)] hover:underline underline-offset-4"
            >
              使用兑换码 ↗
            </button>
          </div>
        </div>
      </section>

      {/* Account Tabs (4 crisp tabs fitting both desktop and 390px mobile cleanly) */}
      <nav
        aria-label="账户子导航"
        className="mt-7 grid grid-cols-4 border-b border-[var(--border)] text-xs sm:flex sm:items-center sm:gap-8 sm:text-sm"
      >
        {[
          { id: 'tasks' as const, label: `任务记录 (${history.length})`, shortLabel: `记录(${history.length})` },
          { id: 'templates' as const, label: `常用模板 (${templates.length})`, shortLabel: `模板(${templates.length})` },
          { id: 'credits' as const, label: '额度明细', shortLabel: '额度明细' },
          { id: 'orders' as const, label: '兑换与邀请', shortLabel: '兑换邀请' },
        ].map((tab) => {
          const isCurrent =
            activeTab === tab.id || (tab.id === 'orders' && activeTab === 'invites');
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChangeTab(tab.id)}
              className={`-mb-px min-h-[44px] cursor-pointer whitespace-nowrap border-b-2 px-1 pb-2.5 text-center font-medium transition-colors sm:px-0 sm:text-left ${
                isCurrent
                  ? 'border-[var(--seal)] font-semibold text-[var(--seal)]'
                  : 'border-transparent text-[var(--ink-soft)] hover:text-[var(--ink)]'
              }`}
            >
              <span className="sm:hidden">{tab.shortLabel}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'credits' && (
          <div className="divide-y divide-[var(--border)] rounded-[4px] border border-[var(--border)] bg-[var(--paper)]">
            {session.creditLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between gap-4 px-5 py-4"
              >
                <div>
                  <h3 className="text-sm font-semibold text-[var(--ink)]">{log.title}</h3>
                  <p className="mt-0.5 text-xs text-[var(--muted)]">
                    {log.createdAt} · {log.detail}
                  </p>
                </div>
                <span className="font-tabular text-sm font-semibold text-[var(--seal)]">
                  {log.delta}
                </span>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'tasks' && (
          <div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex gap-1 rounded-[4px] border border-[var(--border)] bg-[var(--paper)] p-0.5">
                {[
                  { id: 'all' as const, label: '全部' },
                  { id: 'prompt' as const, label: '提示词' },
                  { id: 'image' as const, label: '图片' },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setTaskFilter(f.id)}
                    className={`cursor-pointer whitespace-nowrap rounded-[3px] px-3 py-1.5 text-xs font-semibold transition-colors ${
                      taskFilter === f.id
                        ? 'bg-[var(--ink)] text-[#fbf9f4]'
                        : 'text-[var(--muted)] hover:text-[var(--ink)]'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <span className="text-xs text-[var(--muted)]">
                支持一键复用参数回到画案继续微调
              </span>
            </div>

            {filteredTasks.length === 0 ? (
              <div className="rounded-[4px] border border-[var(--border)] bg-[var(--paper)] p-10 text-center">
                <p className="text-sm font-medium text-[var(--ink)]">暂无创作记录</p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  你在画案生成的提示词与图片都会自动保存在这里，方便随时复盘与复用。
                </p>
                <button
                  type="button"
                  onClick={onReturnWorkbench}
                  className="mt-4 cursor-pointer rounded-[4px] bg-[var(--ink)] px-5 py-2 text-xs font-semibold text-[#fbf9f4] hover:bg-[#2e2e2b]"
                >
                  去画案创作一幅
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredTasks.map((item) => {
                  const purpose = PURPOSES.find((p) => p.id === item.draft.kind);
                  const style =
                    styles.find((s) => s.id === item.draft.styleId) ??
                    STYLES.find((s) => s.id === item.draft.styleId);
                  return (
                    <article
                      key={item.id}
                      className="rounded-[4px] border border-[var(--border)] bg-[var(--paper)] p-5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--muted)]">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-[var(--ink)]">
                            {purpose?.label ?? '社媒卡片'}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{style?.title ?? '精选画风'}</span>
                          <span aria-hidden="true">·</span>
                          <span>
                            {item.type === 'image'
                              ? item.modelLabel || '站内生图'
                              : FORMAT_LABELS[item.format] ?? '中文通用'}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="font-tabular">{item.draft.ratio}</span>
                        </div>
                        <span className="font-tabular">{item.createdAt}</span>
                      </div>

                      {item.type === 'image' && item.imageUrl && (
                        <div className="mt-3 overflow-hidden rounded-[4px] border border-[var(--border)] bg-[var(--bg)]">
                          <img
                            src={item.imageUrl}
                            alt={item.draft.topic || style?.title || '生成插画作品'}
                            className="max-h-72 w-full object-contain"
                          />
                        </div>
                      )}

                      <p className="mt-3 whitespace-pre-wrap rounded-[4px] border border-[var(--border)] bg-[var(--bg)] p-3.5 text-xs leading-6 text-[var(--ink-soft)]">
                        {item.promptText}
                      </p>

                      <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                        {item.type === 'image' && item.imageUrl && (
                          <a
                            href={item.imageUrl}
                            download={`handraw-${item.id}.png`}
                            className="inline-flex cursor-pointer items-center gap-1.5 rounded-[4px] border border-[var(--border)] bg-[var(--paper)] px-3 py-1.5 text-xs font-medium text-[var(--ink)] hover:border-[var(--ink)]"
                          >
                            <Download className="h-3.5 w-3.5" />
                            <span>下载图片</span>
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => handleCopyTask(item)}
                          className="inline-flex cursor-pointer items-center gap-1.5 rounded-[4px] border border-[var(--border)] bg-[var(--paper)] px-3 py-1.5 text-xs font-medium text-[var(--ink)] hover:border-[var(--ink)]"
                        >
                          {copiedId === item.id ? (
                            <>
                              <Check className="h-3.5 w-3.5 text-[var(--seal)]" />
                              <span>已复制</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3.5 w-3.5" />
                              <span>复制提示词</span>
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => onReplayDraft(item.draft, item)}
                          className="inline-flex cursor-pointer items-center gap-1.5 rounded-[4px] bg-[var(--ink)] px-3.5 py-1.5 text-xs font-semibold text-[#fbf9f4] hover:bg-[#2e2e2b]"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          <span>复用参数继续创作</span>
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'templates' && (
          <div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Bookmark className="h-4 w-4 text-[var(--seal)]" aria-hidden="true" />
                <h2 className="text-sm font-semibold text-[var(--ink)]">我的常用模板</h2>
              </div>
              <span className="text-xs text-[var(--muted)]">
                在创作画案生成提示词后可保存至此，支持一键套用回到画案
              </span>
            </div>

            {sortedTemplates.length === 0 ? (
              <div className="rounded-[4px] border border-[var(--border)] bg-[var(--paper)] p-10 text-center">
                <p className="text-sm font-medium text-[var(--ink)]">暂无已保存的常用模板</p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  在创作画案完成提示词生成后，点击底部的「保存模板」即可收录到这里，方便下次一键套用。
                </p>
                <button
                  type="button"
                  onClick={onReturnWorkbench}
                  className="mt-4 cursor-pointer rounded-[4px] bg-[var(--ink)] px-5 py-2 text-xs font-semibold text-[#fbf9f4] hover:bg-[#2e2e2b]"
                >
                  去画案生成并保存模板
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {sortedTemplates.map((tpl) => {
                  const summary = summarizeDraftConditions(
                    { ...tpl.draft, topic: '' },
                    styles.length > 0 ? styles : STYLES,
                    LAYOUTS
                  );
                  const isEditing = editingTemplateId === tpl.id;
                  return (
                    <article
                      key={tpl.id}
                      className="rounded-[4px] border border-[var(--border)] bg-[var(--paper)] p-5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          {isEditing ? (
                            <form
                              onSubmit={(e) => {
                                e.preventDefault();
                                const clean = editingTemplateName.trim();
                                if (clean) {
                                  onRenameTemplate(tpl.id, clean);
                                }
                                setEditingTemplateId(null);
                              }}
                              className="flex flex-wrap items-center gap-2"
                            >
                              <input
                                type="text"
                                autoFocus
                                maxLength={36}
                                value={editingTemplateName}
                                onChange={(e) => setEditingTemplateName(e.target.value)}
                                aria-label="模板新名称"
                                className="min-w-[180px] flex-1 rounded-[4px] border border-[var(--border)] bg-[var(--paper)] px-3 py-1.5 text-sm text-[var(--ink)]"
                              />
                              <button
                                type="submit"
                                className="cursor-pointer rounded-[4px] bg-[var(--ink)] px-3 py-1.5 text-xs font-semibold text-[#fbf9f4]"
                              >
                                保存
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingTemplateId(null)}
                                className="cursor-pointer rounded-[4px] border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--ink-soft)]"
                              >
                                取消
                              </button>
                            </form>
                          ) : (
                            <div className="flex flex-wrap items-center gap-2">
                              {tpl.pinned && (
                                <Pin
                                  className="h-3.5 w-3.5 shrink-0 fill-[var(--seal)] text-[var(--seal)]"
                                  aria-label="已置顶"
                                />
                              )}
                              <h3 className="text-sm font-semibold text-[var(--ink)]">
                                {tpl.name}
                              </h3>
                              <span className="rounded-[3px] bg-[var(--light)] px-2 py-0.5 text-[11px] font-medium text-[var(--ink-soft)]">
                                {FORMAT_LABELS[tpl.format] ?? '中文通用'}
                              </span>
                            </div>
                          )}

                          <p className="mt-1.5 text-xs leading-relaxed text-[var(--muted)]">
                            {summary}
                          </p>
                          {tpl.draft.topicPrefix && (
                            <p className="mt-1.5 rounded-[3px] border border-[var(--border)] bg-[var(--bg)] px-2.5 py-1.5 text-xs text-[var(--ink-soft)]">
                              默认主题：{tpl.draft.topicPrefix}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onTogglePinTemplate(tpl.id)}
                            title={tpl.pinned ? '取消置顶' : '置顶模板'}
                            aria-label={tpl.pinned ? `取消置顶 ${tpl.name}` : `置顶 ${tpl.name}`}
                            className={`inline-flex cursor-pointer items-center gap-1 rounded-[4px] border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                              tpl.pinned
                                ? 'border-[var(--seal)] bg-[var(--accent-soft)] text-[var(--seal)]'
                                : 'border-[var(--border)] bg-[var(--paper)] text-[var(--ink-soft)] hover:border-[var(--ink)]'
                            }`}
                          >
                            <Pin className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>{tpl.pinned ? '已置顶' : '置顶'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingTemplateId(tpl.id);
                              setEditingTemplateName(tpl.name);
                            }}
                            aria-label={`重命名 ${tpl.name}`}
                            className="inline-flex cursor-pointer items-center gap-1 rounded-[4px] border border-[var(--border)] bg-[var(--paper)] px-2.5 py-1.5 text-xs font-medium text-[var(--ink-soft)] hover:border-[var(--ink)]"
                          >
                            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>重命名</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteTemplate(tpl.id)}
                            aria-label={`删除 ${tpl.name}`}
                            className="inline-flex cursor-pointer items-center gap-1 rounded-[4px] border border-[#e7c3be] bg-[var(--paper)] px-2.5 py-1.5 text-xs font-medium text-[#9e3124] hover:bg-[#fdf4f3]"
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>删除</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onApplyTemplate(tpl)}
                            className="inline-flex cursor-pointer items-center gap-1.5 rounded-[4px] bg-[var(--ink)] px-3.5 py-1.5 text-xs font-semibold text-[#fbf9f4] hover:bg-[var(--seal)]"
                          >
                            <span>套用创作</span>
                            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {(activeTab === 'orders' || activeTab === 'invites') && (
          <div className="space-y-4">
            <div className="rounded-[4px] border border-[var(--border)] bg-[var(--paper)] p-5 sm:p-6">
              <h2 className="font-editorial text-base font-bold text-[var(--ink)]">兑换码</h2>
              <p className="mt-1.5 text-xs leading-relaxed text-[var(--muted)]">
                输入活动兑换码即可获赠生图次数（可试用演示码{' '}
                <span className="font-tabular font-semibold text-[var(--ink)]">HR-2026-DRAW</span>）。
              </p>

              <form onSubmit={handleRedeemSubmit} className="mt-4 flex flex-col gap-2.5 sm:flex-row">
                <label htmlFor="redeem-code-input" className="sr-only">
                  输入兑换码
                </label>
                <input
                  id="redeem-code-input"
                  type="text"
                  value={redeemInput}
                  onChange={(e) => {
                    setRedeemInput(e.target.value.toUpperCase());
                    setRedeemFeedback(null);
                  }}
                  placeholder="HR-XXXX-XXXX"
                  className="font-tabular flex-1 rounded-[4px] border border-[var(--border)] bg-[var(--paper)] px-4 py-2.5 text-base text-[var(--ink)] sm:text-sm"
                />
                <button
                  type="submit"
                  disabled={redeemBusy}
                  className="min-h-[44px] cursor-pointer whitespace-nowrap rounded-[4px] bg-[var(--ink)] px-5 py-2.5 text-xs font-semibold text-[#fbf9f4] hover:bg-[#2e2e2b] disabled:opacity-50 sm:min-h-0"
                >
                  {redeemBusy ? '兑换中…' : '兑换次数'}
                </button>
              </form>

              {redeemFeedback && (
                <p
                  role="status"
                  className={`mt-2.5 text-xs font-medium ${
                    redeemFeedback.ok ? 'text-[var(--ink)]' : 'text-[var(--seal)]'
                  }`}
                >
                  {redeemFeedback.message}
                </p>
              )}
            </div>

            <div className="rounded-[4px] border border-[var(--border)] bg-[var(--paper)] p-5 sm:p-6">
              <h2 className="font-editorial text-base font-bold text-[var(--ink)]">
                邀请好友 · 锁定更多生图额度
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                好友通过你的链接注册验证后即享有 5 次新用户生图额度；待站内生图服务正式开放、好友完成首次生图后，你将自动获赠 5 次生图额度。
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleCopyInvite}
                  className="inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-[4px] bg-[var(--ink)] px-5 py-2.5 text-xs font-semibold text-[#fbf9f4] hover:bg-[#2e2e2b] sm:min-h-0"
                >
                  {inviteCopied ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      <span>邀请链接已复制</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>复制专属邀请链接</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="rounded-[4px] border border-[var(--border)] bg-[var(--paper)] p-5 sm:p-6">
              <h2 className="font-editorial text-base font-bold text-[var(--ink)]">在线充值</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-[var(--muted)]">
                充值套餐将随站内生图服务同步开放。当前提示词功能完全免费不限次数，生图额度可通过新用户赠送、邀请好友或兑换码获取。
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
