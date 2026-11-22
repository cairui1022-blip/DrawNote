import { useEffect, useState } from 'react';
import { ArrowLeft, KeyRound, Lock, LogOut, ShieldCheck } from 'lucide-react';
import { SkillAdminView } from './SkillAdminView';
import type { AdminStatus, AdminUser, StyleItem } from '../types';

interface AdminConsoleViewProps {
  adminToken: string | null;
  adminUser: AdminUser | null;
  skills: StyleItem[];
  onAdminAuthenticated: (token: string, user: AdminUser) => void;
  onAdminLogout: () => void;
  onSkillsUpdated: (nextSkills: StyleItem[]) => void;
  onBackToSite: () => void;
  onTryInWorkbench: (styleId: string) => void;
}

export function AdminConsoleView({
  adminToken,
  adminUser,
  skills,
  onAdminAuthenticated,
  onAdminLogout,
  onSkillsUpdated,
  onBackToSite,
  onTryInWorkbench,
}: AdminConsoleViewProps) {
  const [status, setStatus] = useState<AdminStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (adminToken) {
      setLoadingStatus(false);
      return;
    }
    let cancelled = false;
    setLoadingStatus(true);
    fetch('/api/admin/status')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: AdminStatus | null) => {
        if (cancelled) return;
        if (data) {
          setStatus(data);
          if (data.adminUsername) {
            setUsername(data.adminUsername);
          }
        }
      })
      .catch(() => {
        if (!cancelled) {
          setErrorMsg('无法连接后台认证服务，请刷新重试。');
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingStatus(false);
      });
    return () => {
      cancelled = true;
    };
  }, [adminToken]);

  const handleSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (username.trim().length < 3) {
      setErrorMsg('管理员账号需至少 3 位字符。');
      return;
    }
    if (password.length < 8) {
      setErrorMsg('管理员密码长度至少为 8 位。');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('两次输入的密码不一致，请重新确认。');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.message || '初始化管理员账号失败。');
        return;
      }
      setPassword('');
      setConfirmPassword('');
      onAdminAuthenticated(data.token, data.admin);
    } catch {
      setErrorMsg('网络请求异常，请稍后重试。');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!username.trim() || !password) {
      setErrorMsg('请输入管理员账号与密码。');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.message || '管理员账号或密码不正确。');
        return;
      }
      setPassword('');
      onAdminAuthenticated(data.token, data.admin);
    } catch {
      setErrorMsg('登录请求异常，请检查网络后重试。');
    } finally {
      setSubmitting(false);
    }
  };

  // Dedicated Admin Portal Top Bar (visually separated from public creator frontend)
  const adminHeader = (
    <header className="sticky top-0 z-30 border-b border-[#253b31] bg-[#162921] text-white">
      <div className="mx-auto flex h-15 max-w-[1360px] items-center justify-between gap-4 px-5 md:px-8">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#254d3b] text-[#d6efe0]">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="leading-tight">
            <span className="block text-sm font-semibold tracking-tight text-white">
              画语 DrawNote · Skill 管理后台
            </span>
            <span className="block text-[11px] text-[#9eb7aa]">
              独立后台控制台 · 仅限管理员访问
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {adminUser && (
            <span className="hidden items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-[#e4f2ea] sm:inline-flex">
              <KeyRound className="h-3 w-3 text-[#a6d9bc]" aria-hidden="true" />
              <span>管理员：{adminUser.username}</span>
            </span>
          )}
          <button
            type="button"
            onClick={onBackToSite}
            className="inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/20"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span>返回前台</span>
          </button>
          {adminToken && (
            <button
              type="button"
              onClick={onAdminLogout}
              className="inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg border border-[#d68c82]/40 bg-[#4c2420]/70 px-3 py-1.5 text-xs font-medium text-[#ffd8d3] transition-colors hover:bg-[#662f29]"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
              <span>退出管理员</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );

  // Authenticated Admin Console
  if (adminToken && adminUser) {
    return (
      <div className="flex min-h-screen flex-col bg-[#f4f5f0]">
        {adminHeader}
        <main className="flex-1">
          <SkillAdminView
            adminToken={adminToken}
            skills={skills}
            onSkillsUpdated={onSkillsUpdated}
            onTryInWorkbench={onTryInWorkbench}
            onAdminUnauthorized={onAdminLogout}
          />
        </main>
      </div>
    );
  }

  // Unauthenticated Gate: First-run Setup OR Admin Login
  return (
    <div className="flex min-h-screen flex-col bg-[#f2f4ef]">
      {adminHeader}

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-12">
        <div className="rounded-2xl border border-[var(--border)] bg-white p-7 shadow-sm sm:p-8">
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#edf4ee] text-[var(--green)]">
              <Lock className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-[11px] font-semibold tracking-wider text-[var(--green)]">
                ADMIN ACCESS ONLY
              </p>
              <h1 className="text-lg font-semibold text-[var(--ink)]">
                {loadingStatus
                  ? '正在检查管理员状态…'
                  : status?.initialized
                  ? '管理员后台登录'
                  : '创建管理员账号（首次初始化）'}
              </h1>
            </div>
          </div>

          {loadingStatus ? (
            <p className="mt-5 text-xs text-[var(--muted)]">请稍候，正在校验服务端管理员配置…</p>
          ) : !status?.initialized ? (
            <form onSubmit={handleSetupSubmit} noValidate className="mt-5 space-y-4">
              <p className="rounded-xl border border-[#d6e2d5] bg-[#f5f9f4] px-3.5 py-2.5 text-xs leading-relaxed text-[var(--ink-soft)]">
                当前系统尚未创建管理员账号。请设置专属管理员账号与密码（至少 8 位），创建完成后将自动锁定初始化入口，仅管理员凭此账号登录可进入 Skill 后台。
              </p>

              <div>
                <label
                  htmlFor="admin-setup-username"
                  className="mb-1.5 block text-xs font-semibold text-[var(--ink)]"
                >
                  管理员账号名
                </label>
                <input
                  id="admin-setup-username"
                  type="text"
                  autoComplete="username"
                  autoFocus
                  required
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setErrorMsg('');
                  }}
                  placeholder="例如：admin"
                  className="w-full rounded-xl border border-[var(--border)] bg-white px-3.5 py-2.5 text-sm text-[var(--ink)]"
                />
              </div>

              <div>
                <label
                  htmlFor="admin-setup-password"
                  className="mb-1.5 block text-xs font-semibold text-[var(--ink)]"
                >
                  设置管理员密码（至少 8 位）
                </label>
                <input
                  id="admin-setup-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setErrorMsg('');
                  }}
                  placeholder="请输入 8 位以上强密码"
                  className="w-full rounded-xl border border-[var(--border)] bg-white px-3.5 py-2.5 text-sm text-[var(--ink)]"
                />
              </div>

              <div>
                <label
                  htmlFor="admin-setup-confirm"
                  className="mb-1.5 block text-xs font-semibold text-[var(--ink)]"
                >
                  确认管理员密码
                </label>
                <input
                  id="admin-setup-confirm"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setErrorMsg('');
                  }}
                  placeholder="再次输入管理员密码"
                  className="w-full rounded-xl border border-[var(--border)] bg-white px-3.5 py-2.5 text-sm text-[var(--ink)]"
                />
              </div>

              {errorMsg && (
                <p role="alert" className="text-xs font-medium text-[#b43c2e]">
                  {errorMsg}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full cursor-pointer rounded-xl bg-[var(--green)] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--green-hover)] disabled:opacity-60"
              >
                {submitting ? '正在创建管理员账号…' : '创建管理员并进入 Skill 后台'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleLoginSubmit} noValidate className="mt-5 space-y-4">
              <p className="text-xs leading-relaxed text-[var(--muted)]">
                Skill 后台与前台创作空间已完全隔离。普通用户账号无法进入，请使用管理员凭据验证身份。
              </p>

              <div>
                <label
                  htmlFor="admin-login-username"
                  className="mb-1.5 block text-xs font-semibold text-[var(--ink)]"
                >
                  管理员账号
                </label>
                <input
                  id="admin-login-username"
                  type="text"
                  autoComplete="username"
                  autoFocus
                  required
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setErrorMsg('');
                  }}
                  placeholder="输入管理员账号"
                  className="w-full rounded-xl border border-[var(--border)] bg-white px-3.5 py-2.5 text-sm text-[var(--ink)]"
                />
              </div>

              <div>
                <label
                  htmlFor="admin-login-password"
                  className="mb-1.5 block text-xs font-semibold text-[var(--ink)]"
                >
                  管理员密码
                </label>
                <input
                  id="admin-login-password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setErrorMsg('');
                  }}
                  placeholder="输入管理员密码"
                  className="w-full rounded-xl border border-[var(--border)] bg-white px-3.5 py-2.5 text-sm text-[var(--ink)]"
                />
              </div>

              {errorMsg && (
                <p role="alert" className="text-xs font-medium text-[#b43c2e]">
                  {errorMsg}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full cursor-pointer rounded-xl bg-[var(--green)] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--green-hover)] disabled:opacity-60"
              >
                {submitting ? '正在验证身份…' : '登录管理后台'}
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
