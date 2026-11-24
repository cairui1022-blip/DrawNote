import { useEffect, useState } from 'react';
import {
  Activity,
  Check,
  KeyRound,
  Loader2,
  Plus,
  ShieldCheck,
  Sparkles,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import { IMAGE_PROVIDER_PRESETS } from '../utils/imageProviders';
import type {
  ImageModelAdminConfig,
  ImageModelPublicConfig,
  ImageProviderType,
} from '../types';

interface ImageModelsAdminPanelProps {
  adminToken: string;
  onAvailableModelsChanged: (models: ImageModelPublicConfig[]) => void;
  onAdminUnauthorized?: () => void;
}

const PROVIDER_ORDER: ImageProviderType[] = ['qwen', 'jimeng', 'gemini', 'openai-compatible'];

interface ModelFormState {
  editingId: string | null;
  provider: ImageProviderType;
  label: string;
  modelName: string;
  baseUrl: string;
  apiKey: string;
  clearApiKey: boolean;
  enabled: boolean;
  isDefault: boolean;
}

function buildEmptyForm(provider: ImageProviderType = 'qwen'): ModelFormState {
  const preset = IMAGE_PROVIDER_PRESETS[provider];
  return {
    editingId: null,
    provider,
    label: preset.defaultLabel,
    modelName: preset.defaultModelName,
    baseUrl: preset.defaultBaseUrl,
    apiKey: '',
    clearApiKey: false,
    enabled: true,
    isDefault: false,
  };
}

export function ImageModelsAdminPanel({
  adminToken,
  onAvailableModelsChanged,
  onAdminUnauthorized,
}: ImageModelsAdminPanelProps) {
  const [models, setModels] = useState<ImageModelAdminConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [formModal, setFormModal] = useState<ModelFormState | null>(null);
  const [testingModelId, setTestingModelId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<
    Record<string, { ok: boolean; message: string; testedAt: string }>
  >({});
  const [modalTesting, setModalTesting] = useState(false);
  const [modalTestResult, setModalTestResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  const authHeaders = (json = false): Record<string, string> => ({
    ...(json ? { 'Content-Type': 'application/json' } : {}),
    Authorization: `Bearer ${adminToken}`,
  });

  const showFeedback = (ok: boolean, text: string) => {
    setFeedback({ ok, text });
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch('/api/admin/image-models', { headers: authHeaders(false) })
      .then(async (res) => {
        if (res.status === 401) {
          onAdminUnauthorized?.();
          return null;
        }
        return res.ok ? res.json() : null;
      })
      .then((data) => {
        if (!cancelled && data && Array.isArray(data.models)) {
          setModels(data.models);
        }
      })
      .catch(() => {
        if (!cancelled) showFeedback(false, '加载生图模型配置失败，请刷新重试。');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [adminToken]);

  const openEditModal = (model: ImageModelAdminConfig) => {
    setModalTestResult(null);
    setFormModal({
      editingId: model.id,
      provider: model.provider,
      label: model.label,
      modelName: model.modelName,
      baseUrl: model.baseUrl,
      apiKey: '',
      clearApiKey: false,
      enabled: model.enabled,
      isDefault: model.isDefault,
    });
  };

  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formModal) return;
    setSaving(true);
    setFeedback(null);
    try {
      const isEdit = Boolean(formModal.editingId);
      const url = isEdit
        ? `/api/admin/image-models/${encodeURIComponent(formModal.editingId!)}`
        : '/api/admin/image-models';
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: authHeaders(true),
        body: JSON.stringify({
          provider: formModal.provider,
          label: formModal.label.trim(),
          modelName: formModal.modelName.trim(),
          baseUrl: formModal.baseUrl.trim(),
          apiKey: formModal.apiKey.trim() || undefined,
          clearApiKey: formModal.clearApiKey,
          enabled: formModal.enabled,
          isDefault: formModal.isDefault,
        }),
      });
      if (res.status === 401) {
        onAdminUnauthorized?.();
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        showFeedback(false, data.message || '保存生图模型配置失败。');
        return;
      }
      setModels(data.models);
      if (Array.isArray(data.availableImageModels)) {
        onAvailableModelsChanged(data.availableImageModels);
      }
      if (data.model?.id) {
        setTestResults((prev) => {
          const next = { ...prev };
          delete next[data.model.id];
          return next;
        });
      }
      setFormModal(null);
      setModalTestResult(null);
      showFeedback(true, `已保存「${data.model.label}」服务端模型与密钥配置，可点击「验证连通性」确认可用。`);
    } catch {
      showFeedback(false, '网络请求异常，未能保存生图模型配置。');
    } finally {
      setSaving(false);
    }
  };

  const handleTestSavedModel = async (model: ImageModelAdminConfig) => {
    setTestingModelId(model.id);
    setFeedback(null);
    try {
      const res = await fetch(`/api/admin/image-models/${encodeURIComponent(model.id)}/test`, {
        method: 'POST',
        headers: authHeaders(false),
      });
      if (res.status === 401) {
        onAdminUnauthorized?.();
        return;
      }
      const raw = await res.text();
      let data: { ok?: boolean; message?: string } = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        data = {};
      }
      const ok = Boolean(res.ok && data.ok);
      const message =
        data.message || (ok ? '连通性验证通过。' : `验证失败（HTTP ${res.status}）`);
      setTestResults((prev) => ({
        ...prev,
        [model.id]: {
          ok,
          message,
          testedAt: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
        },
      }));
      showFeedback(ok, `「${model.label}」${message}`);
    } catch {
      const message = '连通性验证请求异常，请检查服务状态。';
      setTestResults((prev) => ({
        ...prev,
        [model.id]: {
          ok: false,
          message,
          testedAt: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
        },
      }));
      showFeedback(false, `「${model.label}」${message}`);
    } finally {
      setTestingModelId(null);
    }
  };

  const handleTestModalConfig = async () => {
    if (!formModal) return;
    setModalTesting(true);
    setModalTestResult(null);
    try {
      const res = await fetch('/api/admin/image-models/test', {
        method: 'POST',
        headers: authHeaders(true),
        body: JSON.stringify({
          editingId: formModal.editingId ?? undefined,
          provider: formModal.provider,
          label: formModal.label.trim(),
          modelName: formModal.modelName.trim(),
          baseUrl: formModal.baseUrl.trim(),
          apiKey: formModal.apiKey.trim() || undefined,
        }),
      });
      if (res.status === 401) {
        onAdminUnauthorized?.();
        return;
      }
      const raw = await res.text();
      let data: { ok?: boolean; message?: string } = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        data = {};
      }
      const ok = Boolean(res.ok && data.ok);
      setModalTestResult({
        ok,
        message: data.message || (ok ? '连通性验证通过。' : `验证失败（HTTP ${res.status}）`),
      });
    } catch {
      setModalTestResult({
        ok: false,
        message: '连通性验证请求异常，请稍后重试。',
      });
    } finally {
      setModalTesting(false);
    }
  };

  const handleQuickPatch = async (
    model: ImageModelAdminConfig,
    patch: { enabled?: boolean; isDefault?: boolean }
  ) => {
    setFeedback(null);
    try {
      const res = await fetch(`/api/admin/image-models/${encodeURIComponent(model.id)}`, {
        method: 'PUT',
        headers: authHeaders(true),
        body: JSON.stringify(patch),
      });
      if (res.status === 401) {
        onAdminUnauthorized?.();
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        showFeedback(false, data.message || '状态更新失败。');
        return;
      }
      setModels(data.models);
      if (Array.isArray(data.availableImageModels)) {
        onAvailableModelsChanged(data.availableImageModels);
      }
      if (patch.enabled !== undefined) {
        showFeedback(true, `已${patch.enabled ? '启用' : '停用'}生图模型「${model.label}」`);
      } else if (patch.isDefault) {
        showFeedback(true, `已将「${model.label}」设为默认生图模型`);
      }
    } catch {
      showFeedback(false, '网络请求失败，请重试。');
    }
  };

  const handleDeleteModel = async (model: ImageModelAdminConfig) => {
    setFeedback(null);
    try {
      const res = await fetch(`/api/admin/image-models/${encodeURIComponent(model.id)}`, {
        method: 'DELETE',
        headers: authHeaders(false),
      });
      if (res.status === 401) {
        onAdminUnauthorized?.();
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        showFeedback(false, data.message || '删除模型失败。');
        return;
      }
      setModels(data.models);
      if (Array.isArray(data.availableImageModels)) {
        onAvailableModelsChanged(data.availableImageModels);
      }
      showFeedback(true, `已移除生图模型配置「${model.label}」`);
    } catch {
      showFeedback(false, '删除请求异常，请重试。');
    }
  };

  const activeCount = models.filter((m) => m.enabled && m.hasApiKey).length;

  return (
    <div className="mt-6 space-y-5">
      {/* Security & Quota Overview */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#d6e2d5] bg-[#f5f9f4] p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--green)] text-white">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-[var(--ink)]">
              服务端生图模型 Key 托管（支持通义千问 Qwen、即梦 Seedream 等）
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-[var(--ink-soft)]">
              所有生图 API Key 均加密隔离保存在服务端，绝不回传至用户浏览器。每位登录用户默认享有{' '}
              <span className="font-semibold text-[var(--green)]">5 次</span>{' '}
              站内生图额度，由服务端强校验扣减并在生图失败时自动退回。当前已上线{' '}
              <span className="font-tabular font-semibold text-[var(--ink)]">{activeCount}</span>{' '}
              个可用生图模型。
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setModalTestResult(null);
            setFormModal(buildEmptyForm('qwen'));
          }}
          className="inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-xl bg-[var(--green)] px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[var(--green-hover)]"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          <span>新增生图模型</span>
        </button>
      </div>

      {feedback && (
        <div
          role="status"
          className={`flex items-center justify-between rounded-xl border px-4 py-2.5 text-xs font-medium ${
            feedback.ok
              ? 'border-[#c5dccb] bg-[#f0f7f2] text-[var(--green)]'
              : 'border-[#e7c3be] bg-[#fdf4f3] text-[#9e3124]'
          }`}
        >
          <span>{feedback.text}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            aria-label="关闭提示"
            className="cursor-pointer opacity-70 hover:opacity-100"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Models List */}
      {loading ? (
        <div className="rounded-2xl border border-[var(--border)] bg-white p-10 text-center text-xs text-[var(--muted)]">
          正在读取服务端生图模型配置…
        </div>
      ) : models.length === 0 ? (
        <div className="rounded-2xl border border-[var(--border)] bg-white p-10 text-center">
          <p className="text-sm font-medium text-[var(--ink)]">暂无生图模型配置</p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            点击右上角「新增生图模型」配置 Qwen、即梦或 Gemini 生图密钥。
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {models.map((model) => {
            const preset = IMAGE_PROVIDER_PRESETS[model.provider];
            const ready = model.enabled && model.hasApiKey;
            return (
              <article
                key={model.id}
                className="flex flex-col justify-between rounded-2xl border border-[var(--border)] bg-white p-5 transition-colors hover:border-[#b9c6bb]"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-sm font-semibold text-[var(--ink)]">
                          {model.label}
                        </h3>
                        <span className="rounded-md bg-[#eef4ef] px-2 py-0.5 text-[11px] font-medium text-[var(--green)]">
                          {preset.badge}
                        </span>
                        {model.isDefault && (
                          <span className="inline-flex items-center gap-0.5 rounded-md bg-[#fdf6e6] px-2 py-0.5 text-[11px] font-medium text-[#9b6c1c]">
                            <Star className="h-3 w-3 fill-current" aria-hidden="true" />
                            <span>默认</span>
                          </span>
                        )}
                      </div>
                      <p className="mt-1 truncate font-mono text-xs text-[var(--muted)]">
                        模型：{model.modelName}
                      </p>
                    </div>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={model.enabled}
                      aria-label={`${model.enabled ? '停用' : '启用'} ${model.label}`}
                      onClick={() => handleQuickPatch(model, { enabled: !model.enabled })}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
                        model.enabled ? 'bg-[var(--green)]' : 'bg-[#cfd6d0]'
                      }`}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                          model.enabled ? 'translate-x-[18px]' : 'translate-x-[3px]'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="mt-3.5 space-y-1.5 rounded-xl border border-[var(--border)] bg-[#fafbf8] p-3 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[var(--muted)]">服务端 API Key</span>
                      {model.hasApiKey ? (
                        <span className="inline-flex items-center gap-1 font-mono text-[11px] font-medium text-[var(--green)]">
                          <KeyRound className="h-3 w-3" aria-hidden="true" />
                          <span>{model.apiKeyMasked}</span>
                        </span>
                      ) : (
                        <span className="text-[11px] font-medium text-[#b45309]">尚未填写 Key</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="shrink-0 text-[var(--muted)]">接口地址</span>
                      <span className="truncate font-mono text-[11px] text-[var(--ink-soft)]">
                        {model.baseUrl}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[var(--muted)]">运行状态</span>
                      <span
                        className={`text-[11px] font-semibold ${
                          ready ? 'text-[var(--green)]' : 'text-[var(--muted)]'
                        }`}
                      >
                        {ready
                          ? '已上线 · 前台工作台可调用生图'
                          : model.hasApiKey
                          ? '已停用 · 仅后台保留'
                          : '待配置 Key 后启用'}
                      </span>
                    </div>
                    {testResults[model.id] && (
                      <div
                        className={`mt-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] leading-relaxed ${
                          testResults[model.id].ok
                            ? 'border-[#c5dccb] bg-[#f0f7f2] text-[var(--green)]'
                            : 'border-[#e7c3be] bg-[#fdf4f3] text-[#9e3124]'
                        }`}
                      >
                        <span className="font-semibold">
                          {testResults[model.id].ok ? '连通正常' : '连通失败'}（{testResults[model.id].testedAt}）：
                        </span>
                        <span>{testResults[model.id].message}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] pt-3.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openEditModal(model)}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[var(--ink)] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[var(--green)]"
                    >
                      <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>{model.hasApiKey ? '修改配置 / Key' : '填写 API Key'}</span>
                    </button>
                    <button
                      type="button"
                      disabled={!model.hasApiKey || testingModelId === model.id}
                      onClick={() => handleTestSavedModel(model)}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--green)] bg-[#f4f8f4] px-2.5 py-1.5 text-xs font-semibold text-[var(--green)] transition-colors hover:bg-[#e5f0e6] disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      {testingModelId === model.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                      ) : (
                        <Activity className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                      <span>{testingModelId === model.id ? '验证中…' : '验证连通性'}</span>
                    </button>
                    {!model.isDefault && (
                      <button
                        type="button"
                        onClick={() => handleQuickPatch(model, { isDefault: true })}
                        className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-[var(--border)] bg-white px-2.5 py-1.5 text-xs font-medium text-[var(--ink-soft)] hover:border-[var(--green)] hover:text-[var(--ink)]"
                      >
                        <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>设为默认</span>
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteModel(model)}
                    aria-label={`删除模型 ${model.label}`}
                    className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-[#e7c3be] bg-white px-2.5 py-1.5 text-xs font-medium text-[#9e3124] hover:bg-[#fdf4f3]"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>删除</span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Add / Edit Image Model Modal */}
      {formModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="image-model-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#183628]/45 p-4 backdrop-blur-xs"
          onClick={() => setFormModal(null)}
        >
          <div
            className="flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
              <h2
                id="image-model-modal-title"
                className="text-base font-semibold text-[var(--ink)]"
              >
                {formModal.editingId ? '编辑生图模型与 Key' : '新增服务端生图模型'}
              </h2>
              <button
                type="button"
                onClick={() => setFormModal(null)}
                aria-label="关闭模型配置弹窗"
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-[var(--border)] text-[var(--ink)] hover:bg-[var(--light)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="subtle-scroll flex-1 space-y-4 overflow-y-auto p-6">
              <div>
                <label
                  htmlFor="img-model-provider"
                  className="mb-1.5 block text-xs font-semibold text-[var(--ink)]"
                >
                  模型平台 / 协议类型
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {PROVIDER_ORDER.map((prov) => {
                    const meta = IMAGE_PROVIDER_PRESETS[prov];
                    const active = formModal.provider === prov;
                    return (
                      <button
                        key={prov}
                        type="button"
                        onClick={() => {
                          setFormModal((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  provider: prov,
                                  label: prev.editingId ? prev.label : meta.defaultLabel,
                                  modelName: meta.defaultModelName,
                                  baseUrl: meta.defaultBaseUrl,
                                }
                              : prev
                          );
                        }}
                        className={`cursor-pointer rounded-xl border px-3 py-2 text-left transition-colors ${
                          active
                            ? 'border-[var(--green)] bg-[#eef5ef] text-[var(--green)]'
                            : 'border-[var(--border)] bg-white text-[var(--ink-soft)] hover:border-[var(--ink)]'
                        }`}
                      >
                        <span className="block text-xs font-semibold">{meta.displayName}</span>
                        <span className="mt-0.5 block text-[11px] opacity-80">{meta.badge}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 rounded-lg bg-[#fafbf8] px-3 py-2 text-[11px] leading-relaxed text-[var(--muted)]">
                  {IMAGE_PROVIDER_PRESETS[formModal.provider].docsHint}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="img-model-label"
                    className="mb-1 block text-xs font-semibold text-[var(--ink)]"
                  >
                    前台显示名称 *
                  </label>
                  <input
                    id="img-model-label"
                    type="text"
                    required
                    value={formModal.label}
                    onChange={(e) => setFormModal({ ...formModal, label: e.target.value })}
                    placeholder="如：通义千问 Qwen 生图"
                    className="w-full rounded-xl border border-[var(--border)] px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label
                    htmlFor="img-model-name"
                    className="mb-1 block text-xs font-semibold text-[var(--ink)]"
                  >
                    模型 ID (modelName) *
                  </label>
                  <input
                    id="img-model-name"
                    type="text"
                    required
                    value={formModal.modelName}
                    onChange={(e) => setFormModal({ ...formModal, modelName: e.target.value })}
                    placeholder="qwen-image-2.0"
                    className="w-full rounded-xl border border-[var(--border)] px-3 py-2 font-mono text-xs"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-[var(--muted)]">常用模型快捷填入：</span>
                {IMAGE_PROVIDER_PRESETS[formModal.provider].suggestedModels.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setFormModal({ ...formModal, modelName: m })}
                    className={`cursor-pointer rounded-md border px-2 py-0.5 font-mono text-[11px] ${
                      formModal.modelName === m
                        ? 'border-[var(--green)] bg-[#eef5ef] text-[var(--green)]'
                        : 'border-[var(--border)] bg-white text-[var(--ink-soft)] hover:border-[var(--ink)]'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>

              <div>
                <label
                  htmlFor="img-model-baseurl"
                  className="mb-1 block text-xs font-semibold text-[var(--ink)]"
                >
                  服务端接口 Base URL（仅允许 https:// 公网地址）
                </label>
                <input
                  id="img-model-baseurl"
                  type="url"
                  required
                  value={formModal.baseUrl}
                  onChange={(e) => setFormModal({ ...formModal, baseUrl: e.target.value })}
                  placeholder={IMAGE_PROVIDER_PRESETS[formModal.provider].defaultBaseUrl}
                  className="w-full rounded-xl border border-[var(--border)] px-3 py-2 font-mono text-xs"
                />
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <label
                    htmlFor="img-model-apikey"
                    className="text-xs font-semibold text-[var(--ink)]"
                  >
                    服务端 API Key
                  </label>
                  {formModal.editingId && (
                    <span className="text-[11px] text-[var(--muted)]">
                      留空则保留当前已存密钥
                    </span>
                  )}
                </div>
                <input
                  id="img-model-apikey"
                  type="password"
                  autoComplete="new-password"
                  value={formModal.apiKey}
                  onChange={(e) =>
                    setFormModal({
                      ...formModal,
                      apiKey: e.target.value,
                      clearApiKey: false,
                    })
                  }
                  placeholder={IMAGE_PROVIDER_PRESETS[formModal.provider].apiKeyPlaceholder}
                  className="w-full rounded-xl border border-[var(--border)] px-3 py-2 font-mono text-xs"
                />
                {formModal.editingId && (
                  <label className="mt-2 flex cursor-pointer items-center gap-2 text-[11px] text-[#9e3124]">
                    <input
                      type="checkbox"
                      checked={formModal.clearApiKey}
                      onChange={(e) =>
                        setFormModal({
                          ...formModal,
                          clearApiKey: e.target.checked,
                          enabled: e.target.checked ? false : formModal.enabled,
                        })
                      }
                    />
                    <span>清除当前已保存的 API Key 并停用该模型</span>
                  </label>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-5 pt-1">
                <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-[var(--ink)]">
                  <input
                    type="checkbox"
                    checked={formModal.enabled}
                    onChange={(e) => setFormModal({ ...formModal, enabled: e.target.checked })}
                    className="accent-[var(--green)]"
                  />
                  <span>保存后立即启用上线</span>
                </label>

                <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-[var(--ink)]">
                  <input
                    type="checkbox"
                    checked={formModal.isDefault}
                    onChange={(e) => setFormModal({ ...formModal, isDefault: e.target.checked })}
                    className="accent-[var(--green)]"
                  />
                  <span>设为默认生图模型</span>
                </label>
              </div>

              {modalTestResult && (
                <div
                  role="status"
                  className={`rounded-xl border px-3.5 py-2.5 text-xs leading-relaxed ${
                    modalTestResult.ok
                      ? 'border-[#c5dccb] bg-[#f0f7f2] text-[var(--green)]'
                      : 'border-[#e7c3be] bg-[#fdf4f3] text-[#9e3124]'
                  }`}
                >
                  {modalTestResult.message}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] pt-4">
                <button
                  type="button"
                  disabled={modalTesting || saving}
                  onClick={handleTestModalConfig}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-[var(--green)] bg-[#f4f8f4] px-3.5 py-2 text-xs font-semibold text-[var(--green)] hover:bg-[#e5f0e6] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {modalTesting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  ) : (
                    <Activity className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  <span>{modalTesting ? '验证连通中…' : '验证连通性'}</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setFormModal(null);
                      setModalTestResult(null);
                    }}
                    className="cursor-pointer rounded-xl border border-[var(--border)] px-4 py-2 text-xs font-medium text-[var(--ink)] hover:bg-[var(--light)]"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={saving || modalTesting}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-[var(--green)] px-5 py-2 text-xs font-semibold text-white hover:bg-[var(--green-hover)] disabled:opacity-50"
                  >
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{saving ? '保存中…' : '保存模型配置'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
