import { useState } from 'react';
import { ArrowUpRight, Check, Copy, LogOut, RotateCcw } from 'lucide-react';
import { PURPOSES, STYLES } from '../data/catalog';
import type { CreationDraft, PromptHistoryRecord, StyleItem, UserSession } from '../types';

export type AccountTab = 'credits' | 'tasks' | 'invites' | 'orders';

interface AccountViewProps {
  session: UserSession;
  styles: StyleItem[];
  activeTab: AccountTab;
  history: PromptHistoryRecord[];
  onChangeTab: (tab: AccountTab) => void;
  onReplayDraft: (draft: CreationDraft, promptRecord: PromptHistoryRecord) => void;
  onRedeemCode: (code: string) => { ok: boolean; message: string };
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
  onChangeTab,
  onReplayDraft,
  onRedeemCode,
  onReturnWorkbench,
  onLogout,
}: AccountViewProps) {
  const [taskFilter, setTaskFilter] = useState<'all' | 'prompt' | 'image'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [redeemInput, setRedeemInput] = useState('');
  const [redeemFeedback, setRedeemFeedback] = useState<{ ok: boolean; message: string } | null>(
    null
  );
  const [inviteCopied, setInviteCopied] = useState(false);

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

  const handleRedeemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = onRedeemCode(redeemInput);
    setRedeemFeedback(res);
    if (res.ok) setRedeemInput('');
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

      {/* Account Tabs */}
      <nav
        aria-label="账户子导航"
        className="mt-8 flex items-center gap-7 overflow-x-auto border-b border-[var(--border)] text-sm"
      >
        {[
          { id: 'credits' as const, label: '额度明细' },
          { id: 'tasks' as const, label: `任务记录 (${history.length})` },
          { id: 'invites' as const, label: '邀请好友' },
          { id: 'orders' as const, label: '充值与兑换' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChangeTab(tab.id)}
            className={`-mb-px cursor-pointer whitespace-nowrap border-b-2 pb-3 font-medium transition-colors ${
              activeTab === tab.id
                ? 'border-[var(--seal)] font-semibold text-[var(--seal)]'
                : 'border-transparent text-[var(--muted)] hover:text-[var(--ink)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
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
                          <span>{FORMAT_LABELS[item.format] ?? '中文通用'}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-tabular">{item.draft.ratio}</span>
                        </div>
                        <span className="font-tabular">{item.createdAt}</span>
                      </div>

                      <p className="mt-3 whitespace-pre-wrap rounded-[4px] border border-[var(--border)] bg-[var(--bg)] p-3.5 text-xs leading-6 text-[var(--ink-soft)]">
                        {item.promptText}
                      </p>

                      <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
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

        {activeTab === 'invites' && (
          <div className="rounded-[4px] border border-[var(--border)] bg-[var(--paper)] p-6">
            <h2 className="font-editorial text-base font-bold text-[var(--ink)]">
              邀请好友，提前锁定更多生图额度
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
              好友通过你的链接注册验证后即享有 5 次新用户生图额度；待站内生图服务正式开放、好友完成首次生图后，你将自动获赠 5 次生图额度。
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleCopyInvite}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-[4px] bg-[var(--ink)] px-5 py-2.5 text-xs font-semibold text-[#fbf9f4] hover:bg-[#2e2e2b]"
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
        )}

        {activeTab === 'orders' && (
          <div className="space-y-4">
            <div className="rounded-[4px] border border-[var(--border)] bg-[var(--paper)] p-6">
              <h2 className="font-editorial text-base font-bold text-[var(--ink)]">兑换码</h2>
              <p className="mt-1 text-xs text-[var(--muted)]">
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
                  className="font-tabular flex-1 rounded-[4px] border border-[var(--border)] bg-[var(--paper)] px-4 py-2.5 text-sm text-[var(--ink)]"
                />
                <button
                  type="submit"
                  className="cursor-pointer whitespace-nowrap rounded-[4px] bg-[var(--ink)] px-5 py-2.5 text-xs font-semibold text-[#fbf9f4] hover:bg-[#2e2e2b]"
                >
                  兑换次数
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

            <div className="rounded-[4px] border border-[var(--border)] bg-[var(--paper)] p-6">
              <h2 className="font-editorial text-base font-bold text-[var(--ink)]">在线充值</h2>
              <p className="mt-1.5 text-sm text-[var(--muted)]">
                充值套餐将随站内生图服务同步开放。当前提示词功能完全免费不限次数，生图额度可通过新用户赠送、邀请好友或兑换码获取。
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
