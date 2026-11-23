import { BookOpen, Clock, Palette, ShieldCheck, User } from 'lucide-react';
import type { UserSession } from '../types';

export type AppRoute = 'landing' | 'login' | 'workbench' | 'admin' | 'account' | 'policy';

interface TopBarProps {
  route: AppRoute;
  session: UserSession | null;
  isAdmin: boolean;
  onNavigate: (
    route: AppRoute,
    options?: { anchor?: string; accountTab?: 'credits' | 'tasks' | 'invites' | 'orders' }
  ) => void;
}

export function TopBar({ route, session, isAdmin, onNavigate }: TopBarProps) {
  const totalCredits = session
    ? session.creditsGift + session.creditsRedeem + session.creditsPaid
    : 0;

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[#fbf9f4]/95 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between gap-4 px-4 md:h-16 md:gap-8 md:px-8">
        {/* Zone 1: Editorial Wordmark + Miniature Cinnabar Artist Seal Stamp */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            onNavigate('landing');
          }}
          className="group flex shrink-0 items-center gap-2 whitespace-nowrap transition-opacity hover:opacity-85"
          aria-label="画语 DrawNote 首页"
        >
          <span className="flex items-baseline gap-1.5 leading-none">
            <span className="font-editorial text-[19px] font-bold tracking-tight text-[var(--ink)]">
              画语
            </span>
            <span className="font-editorial text-[16px] font-medium tracking-tight text-[var(--ink-soft)]">
              DrawNote
            </span>
          </span>
          {/* Traditional square cinnabar artist seal stamp (落款朱砂印) */}
          <span
            aria-hidden="true"
            className="inline-flex h-[21px] w-[21px] shrink-0 items-center justify-center rounded-[2px] border border-[var(--seal)] bg-[var(--accent-soft)] text-[var(--seal)] transition-transform group-hover:scale-[1.04]"
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect
                x="1.25"
                y="1.25"
                width="13.5"
                height="13.5"
                rx="0.75"
                stroke="currentColor"
                strokeWidth="0.9"
                strokeOpacity="0.65"
              />
              <path
                d="M4.2 4.5H11.8M8 4.5V11.8M5 7.4H11M5 10.2H11M5.2 7.4V10.5M10.8 7.4V10.5"
                stroke="currentColor"
                strokeWidth="1.15"
                strokeLinecap="square"
              />
            </svg>
          </span>
        </a>

        {/* Zone 2: Clean single-line editorial navigation links (Desktop) */}
        <nav
          aria-label="主要导航"
          className="hidden items-center gap-8 text-[14px] font-medium text-[var(--ink-soft)] md:flex"
        >
          <button
            type="button"
            onClick={() => onNavigate('landing', { anchor: 'artworks' })}
            className={`shrink-0 cursor-pointer whitespace-nowrap pb-0.5 transition-colors hover:text-[var(--ink)] ${
              route === 'landing'
                ? 'border-b-[1.5px] border-[var(--seal)] font-semibold text-[var(--ink)]'
                : ''
            }`}
          >
            画风图鉴
          </button>
          <button
            type="button"
            onClick={() => onNavigate(session ? 'workbench' : 'login')}
            className={`shrink-0 cursor-pointer whitespace-nowrap pb-0.5 transition-colors hover:text-[var(--ink)] ${
              route === 'workbench'
                ? 'border-b-[1.5px] border-[var(--seal)] font-semibold text-[var(--ink)]'
                : ''
            }`}
          >
            创作画案
          </button>
          {session && (
            <button
              type="button"
              onClick={() => onNavigate('account', { accountTab: 'tasks' })}
              className={`shrink-0 cursor-pointer whitespace-nowrap pb-0.5 transition-colors hover:text-[var(--ink)] ${
                route === 'account'
                  ? 'border-b-[1.5px] border-[var(--seal)] font-semibold text-[var(--ink)]'
                  : ''
              }`}
            >
              任务记录
            </button>
          )}
          {isAdmin && (
            <button
              type="button"
              onClick={() => onNavigate('admin')}
              className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-[4px] border border-[var(--seal)]/35 bg-[var(--accent-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--seal)] transition-colors hover:border-[var(--seal)] hover:bg-[#fae7e3]"
            >
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Skill 后台</span>
            </button>
          )}
        </nav>

        {/* Zone 3: Single crisp Sumi Ink primary action or account trigger */}
        <div className="flex shrink-0 items-center gap-3">
          {session ? (
            <button
              type="button"
              onClick={() => onNavigate('account', { accountTab: 'credits' })}
              className="flex shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap rounded-[4px] border border-[var(--border)] bg-[var(--paper)] px-3 py-1.5 text-xs font-medium text-[var(--ink)] transition-colors hover:border-[var(--ink)] hover:bg-[var(--surface-alt)] md:px-3.5 md:py-2"
              aria-label={`我的账户，当前可用生图次数 ${totalCredits} 次`}
            >
              <User className="h-3.5 w-3.5 text-[var(--seal)]" aria-hidden="true" />
              <span className="font-tabular font-semibold text-[var(--ink)]">
                可用 {totalCredits} 次
              </span>
              <span aria-hidden="true" className="hidden text-[#cfc9bc] sm:inline">
                /
              </span>
              <span className="hidden text-[var(--ink-soft)] sm:inline">我的账户</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onNavigate('login')}
              className="shrink-0 cursor-pointer whitespace-nowrap rounded-[4px] bg-[var(--ink)] px-4 py-2 text-xs font-medium text-[#fbf9f4] transition-colors hover:bg-[#2e2e2b] md:px-5 md:py-2 md:text-[13px]"
            >
              开始创作
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

interface MobileBottomNavProps {
  route: AppRoute;
  accountTab?: 'credits' | 'tasks' | 'invites' | 'orders';
  session: UserSession | null;
  isAdmin: boolean;
  onNavigate: (
    route: AppRoute,
    options?: { anchor?: string; accountTab?: 'credits' | 'tasks' | 'invites' | 'orders' }
  ) => void;
}

export function MobileBottomNav({
  route,
  accountTab,
  session,
  isAdmin,
  onNavigate,
}: MobileBottomNavProps) {
  const items: Array<{
    id: string;
    label: string;
    active: boolean;
    icon: typeof BookOpen;
    onClick: () => void;
  }> = [
    {
      id: 'gallery',
      label: '图鉴',
      active: route === 'landing',
      icon: BookOpen,
      onClick: () => onNavigate('landing', { anchor: 'artworks' }),
    },
    {
      id: 'workbench',
      label: '画案',
      active: route === 'workbench',
      icon: Palette,
      onClick: () => onNavigate(session ? 'workbench' : 'login'),
    },
    {
      id: 'tasks',
      label: '记录',
      active: route === 'account' && accountTab === 'tasks',
      icon: Clock,
      onClick: () => onNavigate(session ? 'account' : 'login', { accountTab: 'tasks' }),
    },
    {
      id: 'account',
      label: session ? '账户' : '登录',
      active:
        (route === 'account' && accountTab !== 'tasks') || (!session && route === 'login'),
      icon: User,
      onClick: () => onNavigate(session ? 'account' : 'login', { accountTab: 'credits' }),
    },
  ];

  if (isAdmin) {
    items.push({
      id: 'admin',
      label: '后台',
      active: route === 'admin',
      icon: ShieldCheck,
      onClick: () => onNavigate('admin'),
    });
  }

  return (
    <nav
      aria-label="移动端快捷导航"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--border)] bg-[#fbf9f4]/96 backdrop-blur-md md:hidden"
    >
      <div
        className={`mx-auto grid h-[56px] max-w-lg items-center ${
          items.length === 5 ? 'grid-cols-5' : 'grid-cols-4'
        }`}
      >
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={item.onClick}
              aria-current={item.active ? 'page' : undefined}
              className={`relative flex min-h-[44px] cursor-pointer flex-col items-center justify-center gap-0.5 px-1 transition-colors ${
                item.active
                  ? 'font-semibold text-[var(--seal)]'
                  : 'text-[var(--muted)] hover:text-[var(--ink)]'
              }`}
            >
              {item.active && (
                <span
                  aria-hidden="true"
                  className="absolute inset-x-4 top-0 h-[2px] bg-[var(--seal)]"
                />
              )}
              <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
              <span className="whitespace-nowrap text-[10px] leading-none">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export function SiteFooter({ onNavigate }: { onNavigate: (route: AppRoute) => void }) {
  return (
    <footer className="border-t border-[var(--border)] bg-[var(--surface-alt)] pb-[58px] md:pb-0">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-4 px-5 py-6 text-xs text-[var(--muted)] md:px-8">
        <span className="font-editorial text-[var(--ink-soft)]">
          © 画语 DrawNote · 独立插画风格年鉴与提示词画室
        </span>
        <div className="flex items-center gap-6">
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
            className="cursor-pointer whitespace-nowrap text-[#9b9991] transition-colors hover:text-[var(--seal)] hover:underline underline-offset-4"
          >
            管理员入口
          </button>
        </div>
      </div>
    </footer>
  );
}
