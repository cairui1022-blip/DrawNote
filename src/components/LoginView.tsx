import { useEffect, useState } from 'react';
import { ArrowLeft, MailCheck, UserCheck } from 'lucide-react';
import { maskEmail, validateAccountUsername } from '../utils/promptEngine';
import type { AuthMethod } from '../types';

interface LoginViewProps {
  presetNotice?: string;
  existingUsernames: string[];
  onSuccess: (payload: { authType: AuthMethod; identifier: string }) => void;
  onOpenPolicy: () => void;
  onOpenAdmin: () => void;
}

function generateSixDigitCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function LoginView({
  presetNotice,
  existingUsernames,
  onSuccess,
  onOpenPolicy,
  onOpenAdmin,
}: LoginViewProps) {
  const [authTab, setAuthTab] = useState<AuthMethod>('username');
  const [username, setUsername] = useState('');
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [sentCode, setSentCode] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => {
      setCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  const trimmedUsername = username.trim();
  const isReturningUsername =
    trimmedUsername.length >= 2 &&
    existingUsernames.some((name) => name.toLowerCase() === trimmedUsername.toLowerCase());

  const handleUsernameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const check = validateAccountUsername(username);
    if (!check.ok) {
      setErrorMsg(check.error || '请输入有效的账号名。');
      return;
    }
    setErrorMsg('');
    onSuccess({ authType: 'username', identifier: check.normalized });
  };

  const handleRequestCode = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned)) {
      setErrorMsg('请输入有效的邮箱地址，例如 you@example.com');
      return;
    }
    setErrorMsg('');
    const nextCode = generateSixDigitCode();
    setSentCode(nextCode);
    setCodeInput('');
    setCooldown(60);
    setStep('otp');
  };

  const handleResend = () => {
    if (cooldown > 0) return;
    const nextCode = generateSixDigitCode();
    setSentCode(nextCode);
    setCooldown(60);
    setErrorMsg('');
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (codeInput.trim().length !== 6) {
      setErrorMsg('请输入完整的 6 位数字验证码。');
      return;
    }
    if (codeInput.trim() !== sentCode) {
      setErrorMsg('验证码不匹配，请核对最新发送的 6 位数字。');
      return;
    }
    setErrorMsg('');
    onSuccess({ authType: 'email', identifier: email.trim().toLowerCase() });
  };

  return (
    <div className="washi-grid flex min-h-[calc(100vh-140px)] flex-col items-center justify-center px-5 py-12">
      <div className="specimen-shadow w-full max-w-md rounded-[6px] border border-[var(--border)] bg-[var(--paper)] p-7 sm:p-9">
        {presetNotice && (
          <p className="mb-4 rounded-[4px] border border-[var(--seal)]/25 bg-[var(--accent-soft)] px-3.5 py-2.5 text-xs text-[var(--seal)]">
            {presetNotice}
          </p>
        )}

        {step === 'email' && (
          <>
            <p className="font-tabular text-[11px] font-semibold tracking-[0.1em] text-[var(--seal)]">
              DRAWNOTE STUDIO · 创作画室通行证
            </p>
            <h1 className="mt-1.5 font-editorial text-2xl font-bold text-[var(--ink)]">
              进入你的创作空间
            </h1>

            <div
              role="tablist"
              aria-label="登录与注册方式"
              className="mt-5 flex items-center gap-6 border-b border-[var(--border)]"
            >
              <button
                type="button"
                role="tab"
                aria-selected={authTab === 'username'}
                onClick={() => {
                  setAuthTab('username');
                  setErrorMsg('');
                }}
                className={`-mb-px min-h-[40px] cursor-pointer whitespace-nowrap border-b-2 pb-2.5 text-[13px] font-semibold transition-colors sm:min-h-0 sm:text-xs ${
                  authTab === 'username'
                    ? 'border-[var(--seal)] text-[var(--seal)]'
                    : 'border-transparent text-[var(--muted)] hover:text-[var(--ink)]'
                }`}
              >
                账号名注册 / 登录
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={authTab === 'email'}
                onClick={() => {
                  setAuthTab('email');
                  setErrorMsg('');
                }}
                className={`-mb-px min-h-[40px] cursor-pointer whitespace-nowrap border-b-2 pb-2.5 text-[13px] font-semibold transition-colors sm:min-h-0 sm:text-xs ${
                  authTab === 'email'
                    ? 'border-[var(--seal)] text-[var(--seal)]'
                    : 'border-transparent text-[var(--muted)] hover:text-[var(--ink)]'
                }`}
              >
                邮箱验证码
              </button>
            </div>
          </>
        )}

        {authTab === 'username' && step === 'email' && (
          <form onSubmit={handleUsernameSubmit} noValidate className="mt-6">
            <div>
              <label
                htmlFor="login-username"
                className="mb-2 block text-xs font-semibold text-[var(--ink)]"
              >
                账号名
              </label>
              <input
                id="login-username"
                type="text"
                autoComplete="username"
                autoFocus
                maxLength={24}
                required
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setErrorMsg('');
                }}
                placeholder="输入 2–24 位中英文、数字或下划线（如 林间画师）"
                className="w-full rounded-[4px] border border-[var(--border)] bg-[var(--paper)] px-3.5 py-2.5 text-base text-[var(--ink)] placeholder:text-[#9b9991] sm:text-sm"
              />
              <p className="mt-2 flex items-center gap-1.5 text-xs text-[var(--muted)]">
                <UserCheck className="h-3.5 w-3.5 shrink-0 text-[var(--seal)]" aria-hidden="true" />
                <span>
                  {isReturningUsername
                    ? '已识别本机已有账号，点击即可恢复你的额度与创作记录。'
                    : '无需邮箱验证，输入账号名即可完成注册并自动赠送 5 次生图额度。'}
                </span>
              </p>
            </div>

            {existingUsernames.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                <span className="text-[var(--muted)]">最近使用：</span>
                {existingUsernames.slice(0, 4).map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => {
                      setUsername(name);
                      setErrorMsg('');
                    }}
                    className="cursor-pointer rounded-[3px] border border-[var(--border)] bg-[var(--bg)] px-2.5 py-1 text-xs text-[var(--ink)] transition-colors hover:border-[var(--ink)]"
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}

            {errorMsg && (
              <p role="alert" className="mt-3 text-xs font-medium text-[var(--seal)]">
                {errorMsg}
              </p>
            )}

            <button
              type="submit"
              className="mt-5 w-full cursor-pointer rounded-[4px] bg-[var(--ink)] px-5 py-3 text-sm font-semibold text-[#fbf9f4] transition-colors hover:bg-[#2e2e2b]"
            >
              {isReturningUsername ? '登录进入创作画案' : '注册并进入创作画案'}
            </button>

            <p className="mt-4 text-xs leading-relaxed text-[var(--muted)]">
              注册或登录即表示你已阅读
              <button
                type="button"
                onClick={onOpenPolicy}
                className="mx-1 cursor-pointer font-medium text-[var(--ink)] underline underline-offset-4 hover:text-[var(--seal)]"
              >
                使用与隐私说明
              </button>
              。新账号首次建档即赠送 5 次生图额度，提示词功能不限次免费使用。
            </p>
          </form>
        )}

        {authTab === 'email' && step === 'email' && (
          <form onSubmit={handleRequestCode} noValidate className="mt-6">
            <div>
              <label htmlFor="login-email" className="mb-2 block text-xs font-semibold text-[var(--ink)]">
                邮箱地址
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                autoFocus
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErrorMsg('');
                }}
                placeholder="you@example.com"
                className="w-full rounded-[4px] border border-[var(--border)] bg-[var(--paper)] px-3.5 py-2.5 text-base text-[var(--ink)] placeholder:text-[#9b9991] sm:text-sm"
              />
            </div>

            {errorMsg && (
              <p role="alert" className="mt-3 text-xs font-medium text-[var(--seal)]">
                {errorMsg}
              </p>
            )}

            <button
              type="submit"
              className="mt-5 w-full cursor-pointer rounded-[4px] bg-[var(--ink)] px-5 py-3 text-sm font-semibold text-[#fbf9f4] transition-colors hover:bg-[#2e2e2b]"
            >
              获取验证码
            </button>

            <p className="mt-4 text-xs leading-relaxed text-[var(--muted)]">
              登录即表示你已阅读
              <button
                type="button"
                onClick={onOpenPolicy}
                className="mx-1 cursor-pointer font-medium text-[var(--ink)] underline underline-offset-4 hover:text-[var(--seal)]"
              >
                使用与隐私说明
              </button>
              。新验证建档一次赠送 5 次生图额度，提示词功能不限次免费使用。
            </p>
          </form>
        )}

        {authTab === 'email' && step === 'otp' && (
          <form onSubmit={handleVerify} noValidate>
            <button
              type="button"
              onClick={() => {
                setStep('email');
                setErrorMsg('');
              }}
              className="mb-4 inline-flex cursor-pointer items-center gap-1 text-xs font-medium text-[var(--muted)] hover:text-[var(--ink)]"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              <span>更换邮箱或切换方式</span>
            </button>

            <h1 className="font-editorial text-2xl font-bold text-[var(--ink)]">
              查看邮箱验证码
            </h1>

            <p className="mt-2 flex items-center gap-1.5 text-sm text-[var(--ink-soft)]">
              <MailCheck className="h-4 w-4 shrink-0 text-[var(--seal)]" aria-hidden="true" />
              <span>
                验证码已发送至 <strong className="font-semibold text-[var(--ink)]">{maskEmail(email)}</strong>
              </span>
            </p>

            <div className="mt-4 rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 text-xs text-[var(--ink-soft)]">
              <div className="flex items-center justify-between gap-2">
                <span>
                  演示发信预览 · 主题：
                  <span className="font-tabular font-semibold text-[var(--seal)]">
                    [{sentCode}] 画语 DrawNote 登录验证码
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setCodeInput(sentCode);
                    setErrorMsg('');
                  }}
                  className="shrink-0 cursor-pointer font-semibold text-[var(--ink)] underline underline-offset-2 hover:text-[var(--seal)]"
                >
                  一键填入
                </button>
              </div>
            </div>

            <div className="mt-5">
              <label htmlFor="login-otp" className="mb-2 block text-xs font-semibold text-[var(--ink)]">
                6 位验证码
              </label>
              <input
                id="login-otp"
                type="text"
                inputMode="numeric"
                maxLength={6}
                autoFocus
                value={codeInput}
                onChange={(e) => {
                  setCodeInput(e.target.value.replace(/\D/g, '').slice(0, 6));
                  setErrorMsg('');
                }}
                placeholder="输入 6 位数字验证码"
                className="font-tabular w-full rounded-[4px] border border-[var(--border)] bg-[var(--paper)] px-3.5 py-2.5 text-base tracking-[0.25em] text-[var(--ink)] placeholder:tracking-normal placeholder:text-sm placeholder:text-[#9b9991]"
              />
            </div>

            {errorMsg && (
              <p role="alert" className="mt-3 text-xs font-medium text-[var(--seal)]">
                {errorMsg}
              </p>
            )}

            <button
              type="submit"
              className="mt-5 w-full cursor-pointer rounded-[4px] bg-[var(--ink)] px-5 py-3 text-sm font-semibold text-[#fbf9f4] transition-colors hover:bg-[#2e2e2b]"
            >
              验证并登录
            </button>

            <div className="mt-4 flex items-center justify-between text-xs text-[var(--muted)]">
              <span>验证码 5 分钟内有效</span>
              <button
                type="button"
                disabled={cooldown > 0}
                onClick={handleResend}
                className="cursor-pointer font-medium text-[var(--seal)] disabled:cursor-not-allowed disabled:text-[var(--muted)]"
              >
                {cooldown > 0 ? `重新发送 (${cooldown}s)` : '重新发送验证码'}
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="mt-4 text-center">
        <button
          type="button"
          onClick={onOpenAdmin}
          className="cursor-pointer text-xs text-[var(--muted)] transition-colors hover:text-[var(--seal)] hover:underline underline-offset-4"
        >
          管理员请前往独立管理后台登录 ↗
        </button>
      </div>
    </div>
  );
}
