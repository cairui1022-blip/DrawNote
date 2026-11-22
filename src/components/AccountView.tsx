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
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-editorial text-2xl font-semibold text-[var(--ink)] sm:text-3xl">
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
            className="inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full bg-[var(--green)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--green-hover)]"
          >
            <span>返回创作工作台</span>
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border border-[var(--border)] bg-white px-4 py-2 text-xs font-medium text-[var(--ink)] hover:bg-[var(--light)]"
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
            <span>退出登录</span>
          </button>
        </div>
      </div>

      {/* Task 10: Clean Credit Summary (internal reserved/refund fields hidden when 0) */}
      <section className="mt-6 rounded-2xl border border-[var(--border)] bg-white p-6">
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
              className="cursor-pointer font-medium text-[var(--green)] hover:underline underline-offset-4"
            >
              使用兑换码 ↗
            </button>
          </div>
        </div>
      </section>

      {/* Account Tabs */}
      <nav
        aria-label="账户子导航"
        className="mt-8 flex items-center gap-6 overflow-x-auto border-b border-[var(--border)] pb-3 text-sm"
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
            className={`cursor-pointer whitespace-nowrap pb-1 font-medium transition-colors ${
              activeTab === tab.id
                ? 'border-b-2 border-[var(--green)] font-semibold text-[var(--ink)]'
                : 'text-[var(--muted)] hover:text-[var(--ink)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Tab Content */}
      <div className="mt-6">
        {/* Credits Tab (No duplicate Redeem Card! Task 10) */}
        {activeTab === 'credits' && (
          <div className="space-y-3">
            {session.creditLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-white px-5 py-4"
              >
                <div>
                  <h3 className="text-sm font-semibold text-[var(--ink)]">{log.title}</h3>
                  <p className="mt-0.5 text-xs text-[var(--muted)]">
                    {log.createdAt} · {log.detail}
                  </p>
                </div>
                <span className="font-tabular text-sm font-semibold text-[var(--green)]">
                  {log.delta}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Task 5: Full Task History with Type Filter, Copy & One-Click Replay */}
        {activeTab === 'tasks' && (
          <div>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="inline-flex gap-1 rounded-xl bg-[var(--light)] p-1">
                {[
                  { id: 'all' as const, label: '全部' },
                  { id: 'prompt' as const, label: '提示词' },
                  { id: 'image' as const, label: '图片' },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setTaskFilter(f.id)}
                    className={`cursor-pointer whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                      taskFilter === f.id
                        ? 'bg-white text-[var(--ink)] shadow-xs'
                        : 'text-[var(--muted)] hover:text-[var(--ink)]'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <span className="text-xs text-[var(--muted)]">
                支持一键复用参数回到工作台继续微调
              </span>
            </div>

            {filteredTasks.length === 0 ? (
              <div className="rounded-2xl border border-[var(--border)] bg-white p-10 text-center">
                <p className="text-sm font-medium text-[var(--ink)]">暂无创作记录</p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  你在工作台生成的提示词与图片都会自动保存在这里，方便随时复盘与复用。
                </p>
                <button
                  type="button"
                  onClick={onReturnWorkbench}
                  className="mt-4 cursor-pointer rounded-full bg-[var(--green)] px-5 py-2 text-xs font-semibold text-white hover:bg-[var(--green-hover)]"
                >
                  去工作台创作一幅
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
                      className="rounded-2xl border border-[var(--border)] bg-white p-5"
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

                      <p className="mt-3 whitespace-pre-wrap rounded-xl bg-[#f8f9f5] p-3.5 text-xs leading-6 text-[var(--ink-soft)]">
                        {item.promptText}
                      </p>

                      <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleCopyTask(item)}
                          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 text-xs font-medium text-[var(--ink)] hover:bg-[var(--light)]"
                        >
                          {copiedId === item.id ? (
                            <>
                              <Check className="h-3.5 w-3.5 text-[var(--green)]" />
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
                          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[var(--green)] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[var(--green-hover)]"
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

        {/* Invites Tab (Honest status notice while image gen is upcoming) */}
        {activeTab === 'invites' && (
          <div className="rounded-2xl border border-[var(--border)] bg-white p-6">
            <h2 className="text-base font-semibold text-[var(--ink)]">
              邀请好友，提前锁定更多生图额度
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
              好友通过你的链接注册验证后即享有 5 次新用户生图额度；待站内生图服务正式开放、好友完成首次生图后，你将自动获赠 5 次生图额度。
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleCopyInvite}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-[var(--green)] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[var(--green-hover)]"
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

        {/* Orders & Redeem Tab (Single unified home for Redeem Code, Task 10) */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-[var(--border)] bg-white p-6">
              <h2 className="text-base font-semibold text-[var(--ink)]">兑换码</h2>
              <p className="mt-1 text-xs text-[var(--muted)]">
                输入活动兑换码即可获赠生图次数（可试用演示码 <span className="font-tabular font-semibold text-[var(--ink)]">HR-2026-DRAW</span>）。
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
                  className="font-tabular flex-1 rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 text-sm text-[var(--ink)]"
                />
                <button
                  type="submit"
                  className="cursor-pointer whitespace-nowrap rounded-xl bg-[var(--green)] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[var(--green-hover)]"
                >
                  兑换次数
                </button>
              </form>

              {redeemFeedback && (
                <p
                  role="status"
                  className={`mt-2.5 text-xs font-medium ${
                    redeemFeedback.ok ? 'text-[var(--green)]' : 'text-[#b43c2e]'
                  }`}
                >
                  {redeemFeedback.message}
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-white p-6">
              <h2 className="text-base font-semibold text-[var(--ink)]">在线充值</h2>
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
