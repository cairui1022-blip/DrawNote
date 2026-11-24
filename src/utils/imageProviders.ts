import type {
  ImageModelAdminConfig,
  ImageModelPublicConfig,
  ImageProviderType,
  ServerUserQuota,
} from '../types';

export const DEFAULT_FREE_IMAGE_CREDITS = 5;
export const SUPPORTED_IMAGE_RATIOS = ['3:4', '1:1', '4:3', '9:16', '16:9', '2:3', '3:2'];

export interface StoredImageModelRecord {
  id: string;
  label: string;
  provider: ImageProviderType;
  modelName: string;
  baseUrl: string;
  apiKey: string;
  enabled: boolean;
  isDefault: boolean;
  supportedRatios: string[];
  updatedAt?: string;
}

export interface ProviderPresetMeta {
  provider: ImageProviderType;
  displayName: string;
  badge: string;
  defaultLabel: string;
  defaultBaseUrl: string;
  defaultModelName: string;
  suggestedModels: string[];
  apiKeyPlaceholder: string;
  docsHint: string;
}

export const IMAGE_PROVIDER_PRESETS: Record<ImageProviderType, ProviderPresetMeta> = {
  qwen: {
    provider: 'qwen',
    displayName: '通义万相 / Qwen-Image',
    badge: '阿里云 DashScope',
    defaultLabel: '通义千问 Qwen 生图',
    defaultBaseUrl: 'https://dashscope.aliyuncs.com/api/v1',
    defaultModelName: 'qwen-image-2.0',
    suggestedModels: [
      'qwen-image-2.0',
      'qwen-image-2.0-pro',
      'wan2.5-t2i-preview',
      'wan2.2-t2i-flash',
      'wanx2.1-t2i-turbo',
    ],
    apiKeyPlaceholder: 'sk-xxxxxxxxxxxxxxxxxxxxxxxx',
    docsHint: '填写阿里云百炼 / DashScope API Key（推荐使用 qwen-image-2.0，兼容 wan2.x / wanx 异步任务接口）。',
  },
  jimeng: {
    provider: 'jimeng',
    displayName: '即梦 / Doubao Seedream',
    badge: '火山方舟 Ark',
    defaultLabel: '即梦 Seedream 生图',
    defaultBaseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    defaultModelName: 'doubao-seedream-3-0-t2i-250415',
    suggestedModels: [
      'doubao-seedream-3-0-t2i-250415',
      'doubao-seedream-4-0-250828',
      'jimeng-3.0',
    ],
    apiKeyPlaceholder: 'ark-xxxxxxxx-xxxx-xxxx-xxxx',
    docsHint: '填写火山方舟 Ark API Key（或兼容即梦中转网关 Key + Base URL）。',
  },
  gemini: {
    provider: 'gemini',
    displayName: 'Google Imagen / Gemini',
    badge: 'Google AI',
    defaultLabel: 'Google Imagen 3 生图',
    defaultBaseUrl: 'https://generativelanguage.googleapis.com',
    defaultModelName: 'imagen-3.0-generate-002',
    suggestedModels: ['imagen-3.0-generate-002', 'gemini-2.5-flash-image'],
    apiKeyPlaceholder: 'AIzaSy...（留空可复用服务端 GEMINI_API_KEY）',
    docsHint: '可使用独立配置的 Gemini Key，或留空自动继承服务端环境变量 GEMINI_API_KEY。',
  },
  'openai-compatible': {
    provider: 'openai-compatible',
    displayName: '自定义 OpenAI 兼容生图',
    badge: 'OpenAI Images API',
    defaultLabel: '自定义生图接口',
    defaultBaseUrl: 'https://api.openai.com/v1',
    defaultModelName: 'gpt-image-1',
    suggestedModels: ['gpt-image-1', 'dall-e-3', 'flux-pro'],
    apiKeyPlaceholder: 'sk-...',
    docsHint: '兼容所有标准 POST /images/generations（Bearer Token 鉴权）的第三方生图网关。',
  },
};

export function createDefaultStoredImageModels(): StoredImageModelRecord[] {
  return [
    {
      id: 'qwen-default',
      label: IMAGE_PROVIDER_PRESETS.qwen.defaultLabel,
      provider: 'qwen',
      modelName: IMAGE_PROVIDER_PRESETS.qwen.defaultModelName,
      baseUrl: IMAGE_PROVIDER_PRESETS.qwen.defaultBaseUrl,
      apiKey: '',
      enabled: false,
      isDefault: true,
      supportedRatios: [...SUPPORTED_IMAGE_RATIOS],
    },
    {
      id: 'jimeng-default',
      label: IMAGE_PROVIDER_PRESETS.jimeng.defaultLabel,
      provider: 'jimeng',
      modelName: IMAGE_PROVIDER_PRESETS.jimeng.defaultModelName,
      baseUrl: IMAGE_PROVIDER_PRESETS.jimeng.defaultBaseUrl,
      apiKey: '',
      enabled: false,
      isDefault: false,
      supportedRatios: [...SUPPORTED_IMAGE_RATIOS],
    },
  ];
}

export function maskApiKey(apiKey?: string): string {
  const clean = (apiKey ?? '').trim();
  if (!clean) return '';
  if (clean.length <= 8) return '****';
  return `${clean.slice(0, 4)}****${clean.slice(-4)}`;
}

export function resolveModelKeyStatus(
  record: StoredImageModelRecord,
  envGeminiKey?: string
): {
  effectiveKey: string;
  keySource: 'stored' | 'env' | 'none';
} {
  const stored = (record.apiKey ?? '').trim();
  if (stored) {
    return { effectiveKey: stored, keySource: 'stored' };
  }
  const envClean = (envGeminiKey ?? '').trim();
  if (
    record.provider === 'gemini' &&
    envClean &&
    envClean !== 'MY_GEMINI_API_KEY'
  ) {
    return { effectiveKey: envClean, keySource: 'env' };
  }
  return { effectiveKey: '', keySource: 'none' };
}

export function toAdminImageModel(
  record: StoredImageModelRecord,
  envGeminiKey?: string
): ImageModelAdminConfig {
  const { effectiveKey, keySource } = resolveModelKeyStatus(record, envGeminiKey);
  return {
    id: record.id,
    label: record.label,
    provider: record.provider,
    modelName: record.modelName,
    baseUrl: record.baseUrl,
    enabled: record.enabled,
    isDefault: record.isDefault,
    supportedRatios: record.supportedRatios,
    hasApiKey: Boolean(effectiveKey),
    apiKeyMasked:
      keySource === 'stored'
        ? maskApiKey(record.apiKey)
        : keySource === 'env'
        ? '环境变量 GEMINI_API_KEY'
        : '',
    keySource,
    updatedAt: record.updatedAt,
  };
}

export function toPublicImageModel(record: StoredImageModelRecord): ImageModelPublicConfig {
  return {
    id: record.id,
    label: record.label,
    provider: record.provider,
    modelName: record.modelName,
    isDefault: record.isDefault,
    supportedRatios: record.supportedRatios,
  };
}

export function isPrivateOrLoopbackIp(rawIp: string): boolean {
  const ip = rawIp.trim().toLowerCase().replace(/^\[|\]$/g, '');
  if (!ip) return true;

  // Handle IPv4-mapped IPv6 addresses like ::ffff:127.0.0.1
  const v4Mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (v4Mapped) {
    return isPrivateOrLoopbackIp(v4Mapped[1]);
  }

  const ipv4Match = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const octets = ipv4Match.slice(1).map(Number);
    if (octets.some((o) => !Number.isInteger(o) || o < 0 || o > 255)) {
      return true;
    }
    const [a, b] = octets;
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    if (a >= 224) return true; // Multicast / reserved
    return false;
  }

  // IPv6 loopback, unspecified, ULA (fc00::/7), link-local (fe80::/10)
  if (ip === '::1' || ip === '::' || ip === '0:0:0:0:0:0:0:1') return true;
  if (ip.startsWith('fc') || ip.startsWith('fd')) return true;
  if (ip.startsWith('fe8') || ip.startsWith('fe9') || ip.startsWith('fea') || ip.startsWith('feb')) {
    return true;
  }
  return false;
}

export function validateProviderEndpointUrl(rawUrl: string): {
  ok: boolean;
  normalizedUrl: string;
  error?: string;
} {
  const trimmed = rawUrl.trim().replace(/\/+$/, '');
  if (!trimmed) {
    return { ok: false, normalizedUrl: '', error: '请填写接口 Base URL。' };
  }
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false, normalizedUrl: '', error: 'Base URL 格式无效，请填写完整的 https:// 地址。' };
  }

  if (parsed.protocol !== 'https:') {
    return {
      ok: false,
      normalizedUrl: '',
      error: '为保障服务端 API Key 传输安全，仅允许使用 https:// 协议地址。',
    };
  }
  if (parsed.username || parsed.password) {
    return {
      ok: false,
      normalizedUrl: '',
      error: '接口地址不得包含内嵌用户名或密码。',
    };
  }

  const host = parsed.hostname.toLowerCase();
  if (
    !host ||
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host === 'metadata.google.internal' ||
    /^\d+$/.test(host) ||
    /^0x[0-9a-f]+$/i.test(host) ||
    isPrivateOrLoopbackIp(host)
  ) {
    return {
      ok: false,
      normalizedUrl: '',
      error: '禁止使用本地回环或内网地址作为生图接口 Base URL。',
    };
  }

  return { ok: true, normalizedUrl: parsed.toString().replace(/\/+$/, '') };
}

export function sanitizeModelId(raw?: string): string {
  const cleaned = (raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  if (cleaned.length >= 2 && cleaned.length <= 40) {
    return cleaned;
  }
  return `img-${Date.now().toString(36)}`;
}

export function mapRatioToDimensions(
  ratio: string,
  provider: ImageProviderType,
  modelName = ''
): { asterisk: string; x: string } {
  const normalized = ratio.trim();
  const isQwenNative =
    provider === 'qwen' && /qwen-image/i.test(modelName);

  if (isQwenNative) {
    const qwenMap: Record<string, [number, number]> = {
      '1:1': [1328, 1328],
      '3:4': [1140, 1472],
      '4:3': [1472, 1140],
      '9:16': [928, 1664],
      '16:9': [1664, 928],
      '2:3': [960, 1440],
      '3:2': [1440, 960],
    };
    const [w, h] = qwenMap[normalized] ?? qwenMap['3:4'];
    return { asterisk: `${w}*${h}`, x: `${w}x${h}` };
  }

  if (provider === 'qwen') {
    const wanxMap: Record<string, [number, number]> = {
      '1:1': [1024, 1024],
      '3:4': [768, 1024],
      '4:3': [1024, 768],
      '9:16': [720, 1280],
      '16:9': [1280, 720],
      '2:3': [768, 1152],
      '3:2': [1152, 768],
    };
    const [w, h] = wanxMap[normalized] ?? wanxMap['3:4'];
    return { asterisk: `${w}*${h}`, x: `${w}x${h}` };
  }

  // Jimeng / Doubao Seedream & standard OpenAI-compatible sizes
  const standardMap: Record<string, [number, number]> = {
    '1:1': [1024, 1024],
    '3:4': [864, 1152],
    '4:3': [1152, 864],
    '9:16': [720, 1280],
    '16:9': [1280, 720],
    '2:3': [896, 1280],
    '3:2': [1280, 896],
  };
  const [w, h] = standardMap[normalized] ?? standardMap['3:4'];
  return { asterisk: `${w}*${h}`, x: `${w}x${h}` };
}

export interface ProviderRequestSpec {
  endpoint: string;
  headers: Record<string, string>;
  body: Record<string, unknown>;
  isAsyncTask: boolean;
  taskStatusUrlTemplate?: string;
}

export function buildProviderRequestSpec(params: {
  provider: ImageProviderType;
  baseUrl: string;
  apiKey: string;
  modelName: string;
  prompt: string;
  ratio: string;
  negativePrompt?: string;
}): ProviderRequestSpec {
  const cleanBase = params.baseUrl.trim().replace(/\/+$/, '');
  const dims = mapRatioToDimensions(params.ratio, params.provider, params.modelName);

  if (params.provider === 'qwen') {
    // Support OpenAI-compatible DashScope endpoint if user explicitly configured /compatible-mode
    if (cleanBase.includes('/compatible-mode')) {
      return {
        endpoint: `${cleanBase}/images/generations`,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${params.apiKey}`,
        },
        body: {
          model: params.modelName,
          prompt: params.prompt,
          size: dims.asterisk,
          n: 1,
        },
        isAsyncTask: false,
      };
    }

    // Qwen-Image synchronous multimodal-generation API
    if (/qwen-image/i.test(params.modelName)) {
      return {
        endpoint: `${cleanBase}/services/aigc/multimodal-generation/generation`,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${params.apiKey}`,
        },
        body: {
          model: params.modelName,
          input: {
            messages: [
              {
                role: 'user',
                content: [{ text: params.prompt }],
              },
            ],
          },
          parameters: {
            size: dims.asterisk,
            n: 1,
            prompt_extend: false,
            watermark: false,
            ...(params.negativePrompt ? { negative_prompt: params.negativePrompt } : {}),
          },
        },
        isAsyncTask: false,
      };
    }

    // DashScope Wanx async text2image synthesis API
    return {
      endpoint: `${cleanBase}/services/aigc/text2image/image-synthesis`,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${params.apiKey}`,
        'X-DashScope-Async': 'enable',
      },
      body: {
        model: params.modelName,
        input: {
          prompt: params.prompt,
          ...(params.negativePrompt ? { negative_prompt: params.negativePrompt } : {}),
        },
        parameters: {
          size: dims.asterisk,
          n: 1,
        },
      },
      isAsyncTask: true,
      taskStatusUrlTemplate: `${cleanBase}/tasks/{taskId}`,
    };
  }

  // Jimeng (Volcengine Ark / OpenAI-compatible) & generic OpenAI-compatible
  return {
    endpoint: cleanBase.endsWith('/images/generations')
      ? cleanBase
      : `${cleanBase}/images/generations`,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${params.apiKey}`,
    },
    body: {
      model: params.modelName,
      prompt: params.prompt,
      size: dims.x,
      n: 1,
      response_format: 'url',
    },
    isAsyncTask: false,
  };
}

export interface ExtractedImageCandidate {
  url?: string;
  base64?: string;
  mimeType?: string;
  taskId?: string;
  taskStatus?: string;
  errorMessage?: string;
}

export function extractImageCandidateFromPayload(payload: unknown): ExtractedImageCandidate {
  if (!payload || typeof payload !== 'object') {
    return {};
  }
  const obj = payload as Record<string, unknown>;

  // OpenAI / Volcengine Ark / Jimeng format: { data: [{ url, b64_json }] }
  if (Array.isArray(obj.data) && obj.data.length > 0) {
    const first = obj.data[0] as Record<string, unknown> | undefined;
    if (first) {
      if (typeof first.url === 'string' && first.url.trim()) {
        return { url: first.url.trim() };
      }
      if (typeof first.b64_json === 'string' && first.b64_json.trim()) {
        return { base64: first.b64_json.trim(), mimeType: 'image/png' };
      }
    }
  }

  // DashScope formats under `output`
  if (obj.output && typeof obj.output === 'object') {
    const output = obj.output as Record<string, unknown>;

    // Qwen-Image multimodal-generation sync response
    if (Array.isArray(output.choices)) {
      for (const choice of output.choices) {
        const message = (choice as Record<string, unknown>)?.message as
          | Record<string, unknown>
          | undefined;
        const content = message?.content;
        if (Array.isArray(content)) {
          for (const part of content) {
            const p = part as Record<string, unknown>;
            if (typeof p?.image === 'string' && p.image.trim()) {
              return { url: p.image.trim() };
            }
          }
        }
      }
    }

    // Wanx image-synthesis results
    if (Array.isArray(output.results) && output.results.length > 0) {
      const first = output.results[0] as Record<string, unknown> | undefined;
      if (first && typeof first.url === 'string' && first.url.trim()) {
        return { url: first.url.trim() };
      }
    }

    // Async task metadata
    if (typeof output.task_id === 'string' && output.task_id.trim()) {
      return {
        taskId: output.task_id.trim(),
        taskStatus:
          typeof output.task_status === 'string' ? output.task_status.trim() : undefined,
        errorMessage:
          typeof output.message === 'string' ? output.message : undefined,
      };
    }
  }

  // Direct image_url or error payloads
  if (typeof obj.image_url === 'string' && obj.image_url.trim()) {
    return { url: obj.image_url.trim() };
  }
  if (typeof obj.message === 'string' && obj.message.trim()) {
    return { errorMessage: obj.message.trim() };
  }
  const errObj = obj.error as Record<string, unknown> | undefined;
  if (errObj && typeof errObj.message === 'string') {
    return { errorMessage: errObj.message };
  }
  return {};
}

// --- Server-Side User Image Quota Helpers ---

export function computeTotalCredits(
  q: Pick<ServerUserQuota, 'creditsGift' | 'creditsRedeem' | 'creditsPaid'>
): number {
  return Math.max(0, q.creditsGift) + Math.max(0, q.creditsRedeem) + Math.max(0, q.creditsPaid);
}

export function createDefaultQuotaRecord(
  accountKey: string,
  now = new Date().toLocaleString('zh-CN', { hour12: false })
): ServerUserQuota {
  return {
    accountKey,
    creditsGift: DEFAULT_FREE_IMAGE_CREDITS,
    creditsRedeem: 0,
    creditsPaid: 0,
    totalCredits: DEFAULT_FREE_IMAGE_CREDITS,
    usedCount: 0,
    redeemedCodes: [],
    creditLogs: [
      {
        id: `log_welcome_${Date.now()}`,
        title: '新用户赠送',
        detail: `首次登录建档，获赠 ${DEFAULT_FREE_IMAGE_CREDITS} 次生图额度`,
        delta: `可用 +${DEFAULT_FREE_IMAGE_CREDITS}`,
        createdAt: now,
      },
    ],
  };
}

export type CreditBucketSource = 'gift' | 'redeem' | 'paid';

export function reserveOneCredit(
  quota: ServerUserQuota,
  modelLabel: string,
  now = new Date().toLocaleString('zh-CN', { hour12: false })
):
  | { ok: true; nextQuota: ServerUserQuota; source: CreditBucketSource }
  | { ok: false; error: string } {
  const total = computeTotalCredits(quota);
  if (total < 1) {
    return {
      ok: false,
      error: '当前账号的 5 次体验生图额度已用完，可在「我的账户 -> 兑换与邀请」输入兑换码补充次数。',
    };
  }

  let source: CreditBucketSource = 'gift';
  let creditsGift = quota.creditsGift;
  let creditsRedeem = quota.creditsRedeem;
  let creditsPaid = quota.creditsPaid;

  if (creditsGift >= 1) {
    creditsGift -= 1;
    source = 'gift';
  } else if (creditsRedeem >= 1) {
    creditsRedeem -= 1;
    source = 'redeem';
  } else {
    creditsPaid = Math.max(0, creditsPaid - 1);
    source = 'paid';
  }

  const nextQuota: ServerUserQuota = {
    ...quota,
    creditsGift,
    creditsRedeem,
    creditsPaid,
    totalCredits: creditsGift + creditsRedeem + creditsPaid,
    usedCount: quota.usedCount + 1,
    creditLogs: [
      {
        id: `log_img_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        title: `站内生图 (${modelLabel})`,
        detail: '调用服务端生图模型',
        delta: '可用 -1',
        createdAt: now,
      },
      ...quota.creditLogs,
    ].slice(0, 60),
  };

  return { ok: true, nextQuota, source };
}

export function refundOneCredit(
  quota: ServerUserQuota,
  source: CreditBucketSource,
  reason: string,
  now = new Date().toLocaleString('zh-CN', { hour12: false })
): ServerUserQuota {
  const creditsGift = quota.creditsGift + (source === 'gift' ? 1 : 0);
  const creditsRedeem = quota.creditsRedeem + (source === 'redeem' ? 1 : 0);
  const creditsPaid = quota.creditsPaid + (source === 'paid' ? 1 : 0);

  return {
    ...quota,
    creditsGift,
    creditsRedeem,
    creditsPaid,
    totalCredits: creditsGift + creditsRedeem + creditsPaid,
    usedCount: Math.max(0, quota.usedCount - 1),
    creditLogs: [
      {
        id: `log_refund_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        title: '生图失败自动退回',
        detail: reason.slice(0, 80),
        delta: '可用 +1',
        createdAt: now,
      },
      ...quota.creditLogs,
    ].slice(0, 60),
  };
}

export function redeemCodeOnQuota(
  quota: ServerUserQuota,
  rawCode: string,
  now = new Date().toLocaleString('zh-CN', { hour12: false })
):
  | { ok: true; nextQuota: ServerUserQuota; message: string }
  | { ok: false; message: string } {
  const code = rawCode.trim().toUpperCase();
  if (!code) {
    return { ok: false, message: '请输入有效的兑换码。' };
  }
  if (quota.redeemedCodes.includes(code)) {
    return { ok: false, message: '该兑换码已在本账号使用过，每个码限用一次。' };
  }
  if (code !== 'HR-2026-DRAW' && !/^HR-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code)) {
    return { ok: false, message: '兑换码格式无效，可试用活动演示码 HR-2026-DRAW。' };
  }

  const creditsRedeem = quota.creditsRedeem + 5;
  const nextQuota: ServerUserQuota = {
    ...quota,
    creditsRedeem,
    totalCredits: quota.creditsGift + creditsRedeem + quota.creditsPaid,
    redeemedCodes: [...quota.redeemedCodes, code],
    creditLogs: [
      {
        id: `log_redeem_${Date.now()}`,
        title: `兑换码奖励 (${code})`,
        detail: '活动兑换码入账',
        delta: '可用 +5',
        createdAt: now,
      },
      ...quota.creditLogs,
    ].slice(0, 60),
  };

  return {
    ok: true,
    nextQuota,
    message: '兑换成功，已增加 5 次可用生图额度。',
  };
}
