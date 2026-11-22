import { ShieldCheck, User } from 'lucide-react';
import type { UserSession } from '../types';

export type AppRoute = 'landing' | 'login' | 'workbench' | 'admin' | 'account' | 'policy';

interface TopBarProps {
  route: AppRoute;
  session: UserSession | null;
  isAdmin: boolean;
  onNavigate: (route: AppRoute, options?: { anchor?: string; accountTab?: 'credits' | 'tasks' | 'invites' | 'orders' }) => void;
}

export function TopBar({ route, session, isAdmin, onNavigate }: TopBarProps) {
  const totalCredits = session
    ? session.creditsGift + session.creditsRedeem + session.creditsPaid
    : 0;

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1360px] items-center justify-between gap-8 px-5 md:px-8">
        {/* Zone 1: Bespoke 画语 DrawNote Emblem + Wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            onNavigate('landing');
          }}
          className="group flex shrink-0 items-center gap-2.5 whitespace-nowrap hover:opacity-90"
          aria-label="画语 DrawNote 首页"
        >
          <span
            aria-hidden="true"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--green)] text-white shadow-xs transition-transform group-hover:scale-[1.03]"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Speech-note frame symbolizing "语" (words) + canvas */}
              <path
                d="M5.5 4.75H16.5C18.0188 4.75 19.25 5.98122 19.25 7.5V14.5C19.25 16.0188 18.0188 17.25 16.5 17.25H10.6L6.75 20.15V17.25H5.5C3.98122 17.25 2.75 16.0188 2.75 14.5V7.5C2.75 5.98122 3.98122 4.75 5.5 4.75Z"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinejoin="round"
              />
              {/* Expressive brush/pen stroke symbolizing "画" (drawing) */}
              <path
                d="M7.2 13.4C8.9 10.6 11.2 9.4 13.7 11.1C14.7 11.8 15.6 10.2 16.1 8.8"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
              <circle cx="15.9" cy="8.5" r="1.25" fill="#F2D794" />
            </svg>
          </span>
          <span className="flex flex-col leading-none">
            <span className="flex items-baseline gap-1.5">
              <span className="font-editorial text-[17px] font-bold tracking-tight text-[var(--ink)]">
                画语
              </span>
              <span className="text-xs font-semibold tracking-wide text-[var(--green)]">
                DrawNote
              </span>
            </span>
            <span className="mt-0.5 hidden text-[10px] tracking-wide text-[var(--muted)] sm:block">
              一句话，画成一幅画
            </span>
          </span>
        </a>

        {/* Zone 2: Clean single-line navigation links */}
        <nav aria-label="主要导航" className="hidden items-center gap-7 text-sm font-medium text-[var(--ink-soft)] md:flex">
          <button
            type="button"
            onClick={() => onNavigate('landing', { anchor: 'artworks' })}
            className={`whitespace-nowrap shrink-0 cursor-pointer transition-colors hover:text-[var(--ink)] hover:underline underline-offset-4 ${
              route === 'landing' ? 'text-[var(--ink)]' : ''
            }`}
          >
            画风图鉴
          </button>
          <button
            type="button"
            onClick={() => onNavigate(session ? 'workbench' : 'login')}
            className={`whitespace-nowrap shrink-0 cursor-pointer transition-colors hover:text-[var(--ink)] hover:underline underline-offset-4 ${
              route === 'workbench' ? 'font-semibold text-[var(--green)]' : ''
            }`}
          >
            创作工作台
          </button>
          {session && (
            <button
              type="button"
              onClick={() => onNavigate('account', { accountTab: 'tasks' })}
              className={`whitespace-nowrap shrink-0 cursor-pointer transition-colors hover:text-[var(--ink)] hover:underline underline-offset-4 ${
                route === 'account' ? 'font-semibold text-[var(--green)]' : ''
              }`}
            >
              任务记录
            </button>
          )}
          {isAdmin && (
            <button
              type="button"
              onClick={() => onNavigate('admin')}
              className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border border-[#c3d6c7] bg-[#eef5ef] px-3 py-1 text-xs font-semibold text-[var(--green)] transition-colors hover:border-[var(--green)] hover:bg-[#e1efe3]"
            >
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Skill 后台</span>
            </button>
          )}
        </nav>

        {/* Zone 3: Single clear primary action or account trigger */}
        <div className="flex shrink-0 items-center gap-3">
          {session ? (
            <button
              type="button"
              onClick={() => onNavigate('account', { accountTab: 'credits' })}
              className="flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer rounded-full border border-[var(--border)] bg-white px-3.5 py-2 text-xs font-medium text-[var(--ink)] transition-colors hover:border-[var(--green)] hover:bg-[var(--light)]"
              aria-label={`我的账户，当前可用生图次数 ${totalCredits} 次`}
            >
              <User className="h-3.5 w-3.5 text-[var(--green)]" aria-hidden="true" />
              <span className="font-tabular font-semibold text-[var(--green)]">可用 {totalCredits} 次</span>
              <span aria-hidden="true" className="text-[#b8c4bc]">·</span>
              <span>我的账户</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onNavigate('login')}
              className="whitespace-nowrap shrink-0 cursor-pointer rounded-full bg-[var(--green)] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--green-hover)]"
            >
              登录开始创作
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

export function SiteFooter({ onNavigate }: { onNavigate: (route: AppRoute) => void }) {
  return (
    <footer className="border-t border-[var(--border)] bg-[var(--bg)]">
      <div className="mx-auto flex max-w-[1360px] flex-wrap items-center justify-between gap-4 px-5 py-6 text-xs text-[var(--muted)] md:px-8">
        <span>© 画语 DrawNote · 把一句话，画成一幅画</span>
        <div className="flex items-center gap-5">
          <button
            type="button"
            onClick={() => onNavigate('policy')}
            className="cursor-pointer whitespace-nowrap transition-colors hover:text-[var(--ink)] hover:underline underline-offset-4"
          >
            使用与隐私说明
          </button>
          <button
            type="button"
            onClick={() => onNavigate('landing')}
            className="cursor-pointer whitespace-nowrap transition-colors hover:text-[var(--ink)] hover:underline underline-offset-4"
          >
            画风图鉴
          </button>
          <button
            type="button"
            onClick={() => onNavigate('admin')}
            className="cursor-pointer whitespace-nowrap text-[#96a39b] transition-colors hover:text-[var(--green)] hover:underline underline-offset-4"
          >
            管理员入口
          </button>
        </div>
      </div>
    </footer>
  );
}
