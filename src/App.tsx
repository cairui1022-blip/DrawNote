import { useEffect, useMemo, useState } from 'react';
import { AccountView, type AccountTab } from './components/AccountView';
import { AdminConsoleView } from './components/AdminConsoleView';
import { LandingView } from './components/LandingView';
import { LoginView } from './components/LoginView';
import { PolicyView } from './components/PolicyView';
import { ToastBanner, type ToastMessage } from './components/ToastBanner';
import { MobileBottomNav, SiteFooter, TopBar, type AppRoute } from './components/TopBar';
import { WorkbenchView } from './components/WorkbenchView';
import { LAYOUTS, PURPOSES, STYLES } from './data/catalog';
import {
  applyUserTemplateToDraft,
  getLayoutsForKind,
  pickRecommendedStyleForKind,
} from './utils/promptEngine';
import type {
  AdminUser,
  AuthMethod,
  CreationDraft,
  ImageModelPublicConfig,
  PromptFormat,
  PromptHistoryRecord,
  PurposeKind,
  ServerUserQuota,
  StyleItem,
  UserSession,
  UserTemplate,
} from './types';

const STORAGE_PREFIX = 'handraw_v7_';

const DEFAULT_DRAFT: CreationDraft = {
  kind: 'social-card',
  topic: '',
  layoutId: 'SC-001',
  styleId: 'FA-001',
  primaryColorId: '',
  accentColorIds: [],
  ratio: '3:4',
};

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function saveJson<T>(key: string, value: T): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch {
    // Ignore storage quota errors
  }
}

function buildAccountKey(authType: AuthMethod, identifier: string): string {
  return `${authType}:${identifier.trim().toLowerCase()}`;
}

function normalizeLegacySession(raw: Partial<UserSession> | null): UserSession | null {
  if (!raw) return null;
  if (raw.accountKey && raw.displayName && raw.authType) {
    return raw as UserSession;
  }
  const email = raw.email || 'creator@handraw.app';
  return {
    accountKey: buildAccountKey('email', email),
    authType: 'email',
    displayName: email,
    email,
    creditsGift: raw.creditsGift ?? 5,
    creditsRedeem: raw.creditsRedeem ?? 0,
    creditsPaid: raw.creditsPaid ?? 0,
    creditsReserved: raw.creditsReserved ?? 0,
    creditsRefundFrozen: raw.creditsRefundFrozen ?? 0,
    joinedAt: raw.joinedAt ?? new Date().toLocaleString('zh-CN', { hour12: false }),
    waitlistSubscribed: Boolean(raw.waitlistSubscribed),
    redeemedCodes: raw.redeemedCodes ?? [],
    creditLogs: raw.creditLogs ?? [],
  };
}

function createNewSession(authType: AuthMethod, identifier: string): UserSession {
  const now = new Date().toLocaleString('zh-CN', { hour12: false });
  const cleanId = identifier.trim();
  const accountKey = buildAccountKey(authType, cleanId);
  return {
    accountKey,
    authType,
    displayName: cleanId,
    email: authType === 'email' ? cleanId : undefined,
    username: authType === 'username' ? cleanId : undefined,
    creditsGift: 5,
    creditsRedeem: 0,
    creditsPaid: 0,
    creditsReserved: 0,
    creditsRefundFrozen: 0,
    joinedAt: now,
    waitlistSubscribed: false,
    redeemedCodes: [],
    creditLogs: [
      {
        id: `log_welcome_${Date.now()}`,
        title: '新用户赠送',
        detail: authType === 'username' ? '账号名首次注册建档' : '邮箱首次验证建档',
        delta: '可用 +5',
        createdAt: now,
      },
    ],
  };
}

export default function App() {
  const [allSkills, setAllSkills] = useState<StyleItem[]>(STYLES);
  const [availableImageModels, setAvailableImageModels] = useState<ImageModelPublicConfig[]>([]);

  const [accountsMap, setAccountsMap] = useState<Record<string, UserSession>>(() =>
    loadJson<Record<string, UserSession>>('accounts', {})
  );

  const [session, setSession] = useState<UserSession | null>(() => {
    const params = new URLSearchParams(window.location.search);
    const existing = normalizeLegacySession(loadJson<Partial<UserSession> | null>('session', null));
    if (existing) return existing;
    if (params.get('autostart') === '1') {
      return createNewSession('username', '林间画师');
    }
    return null;
  });

  // Admin session is held strictly in JS/React memory (never localStorage/sessionStorage)
  const [adminSession, setAdminSession] = useState<{
    token: string;
    user: AdminUser;
  } | null>(null);

  const [route, setRoute] = useState<AppRoute>(() => {
    const pathname = window.location.pathname.replace(/\/+$/, '');
    const params = new URLSearchParams(window.location.search);
    if (pathname === '/admin' || params.get('tab') === 'skills') {
      return 'admin';
    }
    if (params.get('autostart') === '1') {
      return 'workbench';
    }
    return 'landing';
  });

  const [previousRoute, setPreviousRoute] = useState<AppRoute>('landing');
  const [accountTab, setAccountTab] = useState<AccountTab>('tasks');
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [pendingPreset, setPendingPreset] = useState<{
    styleId?: string;
    kind?: PurposeKind;
    layoutId?: string;
  } | null>(null);

  const [draft, setDraft] = useState<CreationDraft>(() =>
    loadJson<CreationDraft>('draft', DEFAULT_DRAFT)
  );
  const [history, setHistory] = useState<PromptHistoryRecord[]>(() => {
    const active = normalizeLegacySession(loadJson<Partial<UserSession> | null>('session', null));
    if (active) {
      const perAccount = loadJson<PromptHistoryRecord[] | null>(`history_${active.accountKey}`, null);
      if (perAccount) return perAccount;
    }
    return loadJson<PromptHistoryRecord[]>('history', []);
  });
  const [lastPrompt, setLastPrompt] = useState<{
    text: string;
    format: PromptFormat;
    usedAi: boolean;
  } | null>(() => loadJson('lastPrompt', null));

  const [favoriteStyleIds, setFavoriteStyleIds] = useState<string[]>(() =>
    loadJson<string[]>('favoriteStyles', [
      'FA-001',
      'FB-001',
      'GS-studio-ghibli',
      'GS-botanical-illustration',
    ])
  );
  const [templates, setTemplates] = useState<UserTemplate[]>(() => {
    const active = normalizeLegacySession(loadJson<Partial<UserSession> | null>('session', null));
    if (active) {
      const perAccount = loadJson<UserTemplate[] | null>(`templates_${active.accountKey}`, null);
      if (perAccount) return perAccount;
    }
    return loadJson<UserTemplate[]>('templates', []);
  });
  const [recentStyleIds, setRecentStyleIds] = useState<string[]>(() =>
    loadJson<string[]>('recentStyles', ['FA-001'])
  );

  // Sync live style Skills and active image models from backend store on mount
  useEffect(() => {
    let cancelled = false;
    fetch('/api/skills')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data && Array.isArray(data.skills) && data.skills.length > 0) {
          setAllSkills(data.skills);
        }
      })
      .catch(() => {
        // Fallback silently to bundled STYLES if offline
      });
    fetch('/api/health')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data && Array.isArray(data.availableImageModels)) {
          setAvailableImageModels(data.availableImageModels);
        }
      })
      .catch(() => {
        // Ignore health fetch failure
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const applyServerQuotaToSession = (quota: ServerUserQuota) => {
    setSession((prev) => {
      if (!prev || prev.accountKey !== quota.accountKey) return prev;
      return {
        ...prev,
        creditsGift: quota.creditsGift,
        creditsRedeem: quota.creditsRedeem,
        creditsPaid: quota.creditsPaid,
        redeemedCodes: quota.redeemedCodes,
        creditLogs: quota.creditLogs,
      };
    });
  };

  // Sync authoritative 5-credit quota from server whenever active user changes
  useEffect(() => {
    const accountKey = session?.accountKey;
    if (!accountKey) return;
    let cancelled = false;
    fetch(`/api/quota?accountKey=${encodeURIComponent(accountKey)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.quota) {
          applyServerQuotaToSession(data.quota as ServerUserQuota);
        }
      })
      .catch(() => {
        // Ignore offline quota sync error
      });
    return () => {
      cancelled = true;
    };
  }, [session?.accountKey]);

  // Sync browser /admin URL path cleanly via History API (SPA navigation preserves in-memory admin session)
  useEffect(() => {
    const targetPath = route === 'admin' ? '/admin' : '/';
    if (window.location.pathname !== targetPath) {
      window.history.pushState({ route }, '', targetPath);
    }
  }, [route]);

  useEffect(() => {
    const onPopState = () => {
      const pathname = window.location.pathname.replace(/\/+$/, '');
      if (pathname === '/admin') {
        setRoute('admin');
      } else {
        setRoute((prev) => (prev === 'admin' ? 'landing' : prev));
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const enabledSkills = useMemo(() => {
    const active = allSkills.filter((s) => s.enabled);
    return active.length > 0 ? active : allSkills;
  }, [allSkills]);

  // Keep draft.styleId pointing to an enabled style if the locked one was disabled or deleted (allow '' for optional/auto)
  useEffect(() => {
    if (draft.styleId && !enabledSkills.some((s) => s.id === draft.styleId) && enabledSkills[0]) {
      setDraft((prev) => ({ ...prev, styleId: enabledSkills[0].id }));
    }
  }, [enabledSkills, draft.styleId]);

  useEffect(() => {
    saveJson('accounts', accountsMap);
  }, [accountsMap]);

  useEffect(() => {
    saveJson('session', session);
    if (session) {
      setAccountsMap((prev) => {
        if (prev[session.accountKey] === session) return prev;
        return { ...prev, [session.accountKey]: session };
      });
    }
  }, [session]);

  useEffect(() => {
    saveJson('draft', draft);
  }, [draft]);

  useEffect(() => {
    if (session) {
      saveJson(`history_${session.accountKey}`, history);
    }
    saveJson('history', history);
  }, [history, session]);

  useEffect(() => {
    saveJson('lastPrompt', lastPrompt);
  }, [lastPrompt]);

  useEffect(() => {
    saveJson('favoriteStyles', favoriteStyleIds);
  }, [favoriteStyleIds]);

  useEffect(() => {
    if (session) {
      saveJson(`templates_${session.accountKey}`, templates);
    }
    saveJson('templates', templates);
  }, [templates, session]);

  useEffect(() => {
    saveJson('recentStyles', recentStyleIds);
  }, [recentStyleIds]);

  const showToast = (text: string, tone: 'success' | 'info' = 'success') => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToast({ id, text, tone });
    window.setTimeout(() => {
      setToast((prev) => (prev?.id === id ? null : prev));
    }, 2800);
  };

  const handleToggleFavoriteStyle = (id: string) => {
    setFavoriteStyleIds((prev) => {
      const exists = prev.includes(id);
      const targetTitle = allSkills.find((s) => s.id === id)?.title;
      showToast(
        exists
          ? `已取消收藏${targetTitle ? `「${targetTitle}」` : ''}`
          : `已收藏画风${targetTitle ? `「${targetTitle}」` : ''}`,
        exists ? 'info' : 'success'
      );
      return exists ? prev.filter((item) => item !== id) : [id, ...prev];
    });
  };

  const applyPresetToDraft = (preset: {
    styleId?: string;
    kind?: PurposeKind;
    layoutId?: string;
  }) => {
    setDraft((prev) => {
      const targetStyle = preset.styleId
        ? enabledSkills.find((s) => s.id === preset.styleId)
        : undefined;
      const nextKind: PurposeKind =
        preset.kind ??
        (targetStyle && !targetStyle.recommendedKinds.includes(prev.kind)
          ? targetStyle.recommendedKinds[0] ?? prev.kind
          : prev.kind);
      const purpose = PURPOSES.find((p) => p.id === nextKind) ?? PURPOSES[0];
      const layouts = getLayoutsForKind(nextKind, LAYOUTS);
      const kindChanged = nextKind !== prev.kind;
      const nextStyleId =
        preset.styleId ?? pickRecommendedStyleForKind(nextKind, enabledSkills, prev.styleId).id;
      const explicitLayoutValid =
        preset.layoutId && layouts.some((l) => l.id === preset.layoutId)
          ? preset.layoutId
          : undefined;
      const validCurrentLayout = layouts.some((l) => l.id === prev.layoutId);
      return {
        ...prev,
        kind: nextKind,
        layoutId: !purpose.usesLayout
          ? ''
          : explicitLayoutValid ??
            (kindChanged || !validCurrentLayout ? layouts[0]?.id ?? '' : prev.layoutId),
        styleId: nextStyleId,
        ratio: kindChanged ? purpose.recommendedRatio : prev.ratio,
      };
    });
    if (preset.styleId) {
      setRecentStyleIds((prev) => [preset.styleId!, ...prev.filter((id) => id !== preset.styleId)].slice(0, 6));
    }
  };

  const handleNavigate = (
    next: AppRoute,
    options?: { anchor?: string; accountTab?: AccountTab }
  ) => {
    if (next === 'admin') {
      setPreviousRoute(route);
      setRoute('admin');
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
      return;
    }
    if ((next === 'workbench' || next === 'account') && !session) {
      setPreviousRoute(route);
      setRoute('login');
      return;
    }
    setPreviousRoute(route);
    setRoute(next);
    if (options?.accountTab) {
      setAccountTab(options.accountTab === 'invites' ? 'orders' : options.accountTab);
    }
    if (options?.anchor) {
      window.setTimeout(() => {
        document.getElementById(options.anchor!)?.scrollIntoView({ behavior: 'smooth' });
      }, 60);
    } else {
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    }
  };

  const handleAdminLogout = () => {
    if (adminSession?.token) {
      fetch('/api/admin/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminSession.token}` },
      }).catch(() => {
        // Ignore network errors on logout
      });
    }
    setAdminSession(null);
  };

  const handleStartCreation = (preset?: {
    styleId?: string;
    kind?: PurposeKind;
    layoutId?: string;
  }) => {
    if (preset) {
      applyPresetToDraft(preset);
    }
    if (session) {
      setRoute('workbench');
      if (preset?.layoutId) {
        const layTitle = LAYOUTS.find((l) => l.id === preset.layoutId)?.title;
        if (layTitle) {
          showToast(`已锁定版式「${layTitle}」进入创作工作台`);
        }
      }
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    } else {
      setPendingPreset(preset ?? null);
      setPreviousRoute('landing');
      setRoute('login');
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    }
  };

  const handleLoginSuccess = ({
    authType,
    identifier,
  }: {
    authType: AuthMethod;
    identifier: string;
  }) => {
    const accountKey = buildAccountKey(authType, identifier);
    const existingAccount = accountsMap[accountKey];
    const nextSession = existingAccount ?? createNewSession(authType, identifier);
    setSession(nextSession);
    setAccountsMap((prev) => ({ ...prev, [accountKey]: nextSession }));
    const savedAccountHistory = loadJson<PromptHistoryRecord[]>(`history_${accountKey}`, []);
    setHistory(savedAccountHistory);
    const savedAccountTemplates = loadJson<UserTemplate[]>(`templates_${accountKey}`, []);
    setTemplates(savedAccountTemplates);
    setLastPrompt(null);
    if (pendingPreset) {
      applyPresetToDraft(pendingPreset);
      setPendingPreset(null);
    }
    setRoute('workbench');
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  };

  const handleSaveTemplate = (template: UserTemplate) => {
    setTemplates((prev) => {
      const idx = prev.findIndex((t) => t.id === template.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...template, pinned: prev[idx].pinned ?? template.pinned };
        return next;
      }
      return [template, ...prev].slice(0, 30);
    });
  };

  const handleRenameTemplate = (id: string, name: string) => {
    const cleanName = name.trim();
    if (!cleanName) return;
    setTemplates((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, name: cleanName, updatedAt: new Date().toISOString() } : t
      )
    );
    showToast(`模板已重命名为「${cleanName}」`);
  };

  const handleDeleteTemplate = (id: string) => {
    setTemplates((prev) => prev.filter((t) => t.id !== id));
    showToast('已删除常用模板', 'info');
  };

  const handleTogglePinTemplate = (id: string) => {
    setTemplates((prev) =>
      prev.map((t) => (t.id === id ? { ...t, pinned: !t.pinned } : t))
    );
  };

  const handleLogout = () => {
    setSession(null);
    setLastPrompt(null);
    setRoute('landing');
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  };

  const handlePromptGenerated = (record: PromptHistoryRecord) => {
    setLastPrompt({
      text: record.promptText,
      format: record.format,
      usedAi: record.usedAi,
    });
    if (!record.id.startsWith('edit_')) {
      setHistory((prev) => [record, ...prev].slice(0, 50));
    }
  };

  const handleRedeemCode = async (rawCode: string): Promise<{ ok: boolean; message: string }> => {
    const code = rawCode.trim().toUpperCase();
    if (!code) {
      return { ok: false, message: '请输入有效的兑换码。' };
    }
    if (!session) return { ok: false, message: '请先登录账号。' };
    try {
      const res = await fetch('/api/quota/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountKey: session.accountKey,
          code,
        }),
      });
      const data = await res.json();
      if (data.quota) {
        applyServerQuotaToSession(data.quota as ServerUserQuota);
      }
      if (!res.ok || !data.ok) {
        return { ok: false, message: data.message || '兑换失败，请检查兑换码。' };
      }
      return { ok: true, message: data.message || '兑换成功，已增加 5 次可用生图额度。' };
    } catch {
      return { ok: false, message: '网络请求异常，请稍后重试。' };
    }
  };

  const existingUsernames = Object.values(accountsMap)
    .filter((acc) => acc.authType === 'username' && acc.username)
    .map((acc) => acc.username!);

  const presetNotice = pendingPreset?.styleId
    ? `登录后将自动为你预选画风「${
        allSkills.find((s) => s.id === pendingPreset.styleId)?.title ?? '精选画风'
      }」`
    : pendingPreset?.layoutId
    ? `登录后将自动锁定版式「${
        LAYOUTS.find((l) => l.id === pendingPreset.layoutId)?.title ?? pendingPreset.layoutId
      }」`
    : pendingPreset?.kind
    ? `登录后将直接进入「${
        PURPOSES.find((p) => p.id === pendingPreset.kind)?.label ?? '创作'
      }」场景`
    : undefined;

  // Separate Admin Portal shell: completely isolated from creator TopBar/Footer
  if (route === 'admin') {
    return (
      <AdminConsoleView
        adminToken={adminSession?.token ?? null}
        adminUser={adminSession?.user ?? null}
        skills={allSkills}
        onAdminAuthenticated={(token, user) => {
          setAdminSession({ token, user });
        }}
        onAdminLogout={handleAdminLogout}
        onSkillsUpdated={(next) => setAllSkills(next)}
        onAvailableImageModelsChanged={setAvailableImageModels}
        onBackToSite={() => {
          setRoute(session ? 'workbench' : 'landing');
          window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
        }}
        onTryInWorkbench={(styleId) => {
          applyPresetToDraft({ styleId });
          if (session) {
            setRoute('workbench');
          } else {
            setPendingPreset({ styleId });
            setRoute('login');
          }
          window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
        }}
      />
    );
  }

  const isAdmin = Boolean(adminSession);

  return (
    <div className="flex min-h-screen w-full min-w-0 flex-col overflow-x-clip bg-[var(--bg)] text-[var(--ink)]">
      <TopBar route={route} session={session} isAdmin={isAdmin} onNavigate={handleNavigate} />

      <main className="min-w-0 flex-1">
        {route === 'landing' && (
          <LandingView
            isLoggedIn={Boolean(session)}
            styles={enabledSkills}
            favoriteStyleIds={favoriteStyleIds}
            onToggleFavoriteStyle={handleToggleFavoriteStyle}
            onStartCreation={handleStartCreation}
          />
        )}

        {route === 'login' && (
          <LoginView
            presetNotice={presetNotice}
            existingUsernames={existingUsernames}
            onSuccess={handleLoginSuccess}
            onOpenPolicy={() => handleNavigate('policy')}
            onOpenAdmin={() => handleNavigate('admin')}
          />
        )}

        {route === 'workbench' && session && (
          <WorkbenchView
            session={session}
            styles={enabledSkills}
            availableImageModels={availableImageModels}
            onQuotaUpdated={applyServerQuotaToSession}
            draft={draft}
            onChangeDraft={setDraft}
            lastPrompt={lastPrompt}
            onPromptGenerated={handlePromptGenerated}
            onSaveTemplate={handleSaveTemplate}
            favoriteStyleIds={favoriteStyleIds}
            recentStyleIds={recentStyleIds}
            onToggleFavoriteStyle={handleToggleFavoriteStyle}
            onRecordRecentStyle={(id) => {
              if (!id) return;
              setRecentStyleIds((prev) => [id, ...prev.filter((item) => item !== id)].slice(0, 6));
            }}
            onToggleWaitlist={() =>
              setSession((prev) =>
                prev ? { ...prev, waitlistSubscribed: !prev.waitlistSubscribed } : prev
              )
            }
            onOpenTasks={() => handleNavigate('account', { accountTab: 'tasks' })}
            onNotify={showToast}
            isAdmin={isAdmin}
            onOpenSkillAdmin={isAdmin ? () => handleNavigate('admin') : undefined}
          />
        )}

        {route === 'account' && session && (
          <AccountView
            session={session}
            styles={allSkills}
            activeTab={accountTab}
            history={history}
            templates={templates}
            onChangeTab={setAccountTab}
            onReplayDraft={(replayedDraft, record) => {
              setDraft({ ...replayedDraft, accentColorIds: [...replayedDraft.accentColorIds] });
              setLastPrompt({
                text: record.promptText,
                format: record.format,
                usedAi: record.usedAi,
              });
              setRoute('workbench');
              window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
            }}
            onApplyTemplate={(tpl) => {
              const nextDraft = applyUserTemplateToDraft(draft, tpl);
              setDraft(nextDraft);
              setLastPrompt((prev) => (prev ? { ...prev, format: tpl.format } : null));
              if (nextDraft.styleId) {
                setRecentStyleIds((prev) =>
                  [nextDraft.styleId, ...prev.filter((item) => item !== nextDraft.styleId)].slice(0, 6)
                );
              }
              setRoute('workbench');
              showToast(`已套用常用模板「${tpl.name}」`);
              window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
            }}
            onRenameTemplate={handleRenameTemplate}
            onDeleteTemplate={handleDeleteTemplate}
            onTogglePinTemplate={handleTogglePinTemplate}
            onRedeemCode={handleRedeemCode}
            onReturnWorkbench={() => handleNavigate('workbench')}
            onLogout={handleLogout}
          />
        )}

        {route === 'policy' && (
          <PolicyView onBack={() => setRoute(previousRoute === 'policy' ? 'landing' : previousRoute)} />
        )}
      </main>

      <SiteFooter onNavigate={(next) => handleNavigate(next)} />
      <MobileBottomNav
        route={route}
        session={session}
        isAdmin={isAdmin}
        onNavigate={handleNavigate}
      />
      <ToastBanner toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
