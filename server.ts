import 'dotenv/config';
import crypto from 'crypto';
import dns from 'dns/promises';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  COLOR_PALETTES,
  LAYOUTS,
  PURPOSES,
  STYLES,
  VALID_CONCRETE_CATEGORIES,
} from './src/data/catalog';
import {
  buildStructuredPrompt,
  cleanPromptText,
  isValidRasterImageUrl,
  parseImportedSkillPayload,
} from './src/utils/promptEngine';
import { AdminAuthManager } from './src/utils/adminAuth';
import {
  buildProviderRequestSpec,
  createDefaultQuotaRecord,
  createDefaultStoredImageModels,
  extractImageCandidateFromPayload,
  IMAGE_PROVIDER_PRESETS,
  isPrivateOrLoopbackIp,
  redeemCodeOnQuota,
  refundOneCredit,
  reserveOneCredit,
  resolveModelKeyStatus,
  sanitizeModelId,
  SUPPORTED_IMAGE_RATIOS,
  toAdminImageModel,
  toPublicImageModel,
  validateProviderEndpointUrl,
  type CreditBucketSource,
  type StoredImageModelRecord,
} from './src/utils/imageProviders';
import type {
  ConcreteStyleCategory,
  CreationDraft,
  ImageModelUpsertInput,
  ImageProviderType,
  PromptFormat,
  PurposeKind,
  ServerUserQuota,
  StyleItem,
  StyleSourceRepo,
} from './src/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function readCliFlag(name: string): string | undefined {
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === `--${name}` && args[i + 1] && !args[i + 1].startsWith('--')) {
      return args[i + 1];
    }
    if (arg.startsWith(`--${name}=`)) {
      return arg.slice(name.length + 3);
    }
  }
  return undefined;
}

const cliPort = Number(readCliFlag('port') || process.env.npm_config_port);
const envPort = Number(process.env.PORT);
const nginxPort = Number(process.env.NGINX_PORT);
const defaultPort = Number(process.env.DEFAULT_APP_PORT || 3000);
const PORT =
  Number.isFinite(cliPort) && cliPort > 0
    ? cliPort
    : Number.isFinite(envPort) && envPort > 0 && envPort !== nginxPort
      ? envPort
      : defaultPort;
const HOST = readCliFlag('host') || '0.0.0.0';
const isProduction = process.env.NODE_ENV === 'production';

const DATA_DIR = path.resolve(__dirname, 'data');
const OVERRIDES_PATH = path.join(DATA_DIR, 'skills-overrides.json');
const ADMIN_AUTH_PATH = path.join(DATA_DIR, 'admin-auth.json');
const IMAGE_MODELS_PATH = path.join(DATA_DIR, 'image-models.json');
const USER_QUOTAS_PATH = path.join(DATA_DIR, 'user-quotas.json');
const GENERATED_IMAGES_DIR = path.join(DATA_DIR, 'generated-images');
const BUILTIN_IDS = new Set(STYLES.map((s) => s.id));
const VALID_STYLE_CATEGORIES = new Set<ConcreteStyleCategory>(VALID_CONCRETE_CATEGORIES);
const VALID_PURPOSE_KINDS = new Set<PurposeKind>([
  'social-card',
  'infographic',
  'comic',
  'ip-character',
  'ecommerce',
  'pure-image',
]);

interface SkillOverridesStore {
  patches: Record<string, Partial<StyleItem>>;
  custom: StyleItem[];
}

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadOverrides(): SkillOverridesStore {
  ensureDataDir();
  if (!fs.existsSync(OVERRIDES_PATH)) {
    const empty: SkillOverridesStore = { patches: {}, custom: [] };
    fs.writeFileSync(OVERRIDES_PATH, JSON.stringify(empty, null, 2), 'utf-8');
    return empty;
  }
  try {
    const raw = JSON.parse(fs.readFileSync(OVERRIDES_PATH, 'utf-8')) as Partial<SkillOverridesStore>;
    return {
      patches: raw.patches && typeof raw.patches === 'object' ? raw.patches : {},
      custom: Array.isArray(raw.custom) ? raw.custom : [],
    };
  } catch {
    return { patches: {}, custom: [] };
  }
}

let overridesStore: SkillOverridesStore = loadOverrides();

function saveOverrides(next: SkillOverridesStore): void {
  overridesStore = next;
  ensureDataDir();
  fs.writeFileSync(OVERRIDES_PATH, JSON.stringify(next, null, 2), 'utf-8');
}

function sanitizeImageProvider(raw: unknown): ImageProviderType {
  if (raw === 'qwen' || raw === 'jimeng' || raw === 'gemini' || raw === 'openai-compatible') {
    return raw;
  }
  return 'qwen';
}

function loadImageModels(): StoredImageModelRecord[] {
  ensureDataDir();
  if (!fs.existsSync(IMAGE_MODELS_PATH)) {
    const initial = createDefaultStoredImageModels();
    fs.writeFileSync(IMAGE_MODELS_PATH, JSON.stringify(initial, null, 2), 'utf-8');
    return initial;
  }
  try {
    const raw = JSON.parse(fs.readFileSync(IMAGE_MODELS_PATH, 'utf-8'));
    if (!Array.isArray(raw)) return createDefaultStoredImageModels();
    return raw.map((item: Partial<StoredImageModelRecord>, idx: number) => {
      const provider = sanitizeImageProvider(item.provider);
      const preset = IMAGE_PROVIDER_PRESETS[provider];
      return {
        id: sanitizeModelId(item.id || `${provider}-${idx + 1}`),
        label:
          typeof item.label === 'string' && item.label.trim()
            ? item.label.trim().slice(0, 48)
            : preset.defaultLabel,
        provider,
        modelName:
          typeof item.modelName === 'string' && item.modelName.trim()
            ? item.modelName.trim().slice(0, 80)
            : preset.defaultModelName,
        baseUrl:
          typeof item.baseUrl === 'string' && item.baseUrl.trim()
            ? item.baseUrl.trim().replace(/\/+$/, '')
            : preset.defaultBaseUrl,
        apiKey: typeof item.apiKey === 'string' ? item.apiKey.trim() : '',
        enabled: Boolean(item.enabled),
        isDefault: Boolean(item.isDefault),
        supportedRatios:
          Array.isArray(item.supportedRatios) && item.supportedRatios.length > 0
            ? item.supportedRatios.filter((r): r is string => typeof r === 'string')
            : [...SUPPORTED_IMAGE_RATIOS],
        updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : undefined,
      };
    });
  } catch {
    return createDefaultStoredImageModels();
  }
}

let imageModelsStore: StoredImageModelRecord[] = loadImageModels();

function saveImageModels(next: StoredImageModelRecord[]): void {
  imageModelsStore = next;
  ensureDataDir();
  fs.writeFileSync(IMAGE_MODELS_PATH, JSON.stringify(next, null, 2), 'utf-8');
}

function getEnabledPublicImageModels() {
  const envGeminiKey = process.env.GEMINI_API_KEY;
  return imageModelsStore
    .filter((m) => {
      if (!m.enabled) return false;
      const { effectiveKey } = resolveModelKeyStatus(m, envGeminiKey);
      return Boolean(effectiveKey);
    })
    .map(toPublicImageModel);
}

function loadUserQuotas(): Record<string, ServerUserQuota> {
  ensureDataDir();
  if (!fs.existsSync(USER_QUOTAS_PATH)) {
    fs.writeFileSync(USER_QUOTAS_PATH, JSON.stringify({}, null, 2), 'utf-8');
    return {};
  }
  try {
    const raw = JSON.parse(fs.readFileSync(USER_QUOTAS_PATH, 'utf-8'));
    return raw && typeof raw === 'object' ? (raw as Record<string, ServerUserQuota>) : {};
  } catch {
    return {};
  }
}

let userQuotasStore: Record<string, ServerUserQuota> = loadUserQuotas();

function saveUserQuotas(next: Record<string, ServerUserQuota>): void {
  userQuotasStore = next;
  ensureDataDir();
  fs.writeFileSync(USER_QUOTAS_PATH, JSON.stringify(next, null, 2), 'utf-8');
}

function sanitizeAccountKey(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim().toLowerCase();
  if (trimmed.length < 4 || trimmed.length > 120) return null;
  if (!/^(email|username):[^\s/\\]+$/.test(trimmed)) return null;
  return trimmed;
}

function getOrCreateUserQuota(accountKey: string): ServerUserQuota {
  const existing = userQuotasStore[accountKey];
  if (existing) {
    return existing;
  }
  const created = createDefaultQuotaRecord(accountKey);
  saveUserQuotas({
    ...userQuotasStore,
    [accountKey]: created,
  });
  return created;
}

async function assertPublicEndpointSafe(rawUrl: string): Promise<string> {
  const check = validateProviderEndpointUrl(rawUrl);
  if (!check.ok) {
    throw new Error(check.error || '目标接口地址未通过安全校验。');
  }
  const hostname = new URL(check.normalizedUrl).hostname;
  try {
    const records = await dns.lookup(hostname, { all: true });
    if (!records.length || records.some((r) => isPrivateOrLoopbackIp(r.address))) {
      throw new Error('目标域名解析到了受限内网地址，已拦截请求。');
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes('内网')) {
      throw err;
    }
    throw new Error(`无法解析目标服务域名 (${hostname})，请检查 Base URL 是否正确。`);
  }
  return check.normalizedUrl;
}

function persistGeneratedImageBuffer(buffer: Buffer, mimeType: string): string {
  if (!fs.existsSync(GENERATED_IMAGES_DIR)) {
    fs.mkdirSync(GENERATED_IMAGES_DIR, { recursive: true });
  }
  const lowerMime = mimeType.toLowerCase();
  const ext = lowerMime.includes('jpeg') || lowerMime.includes('jpg')
    ? 'jpg'
    : lowerMime.includes('webp')
    ? 'webp'
    : 'png';
  const filename = `img_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.${ext}`;
  fs.writeFileSync(path.join(GENERATED_IMAGES_DIR, filename), buffer);
  return `/api/generated-images/${filename}`;
}

async function downloadSafeRemoteImage(remoteUrl: string): Promise<{ buffer: Buffer; mimeType: string }> {
  const safeUrl = await assertPublicEndpointSafe(remoteUrl);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const resp = await fetch(safeUrl, { signal: controller.signal });
    if (!resp.ok) {
      throw new Error(`下载生成图片失败（HTTP ${resp.status}）`);
    }
    const contentType = resp.headers.get('content-type') || 'image/png';
    if (!contentType.toLowerCase().startsWith('image/')) {
      throw new Error('上游返回的图片地址响应类型不是有效图像。');
    }
    const arrayBuf = await resp.arrayBuffer();
    if (arrayBuf.byteLength === 0 || arrayBuf.byteLength > 15 * 1024 * 1024) {
      throw new Error('生成的图片文件大小超出限制（最大 15MB）。');
    }
    return { buffer: Buffer.from(arrayBuf), mimeType: contentType };
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('下载生成图片超时，请稍后重试。');
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

async function callUpstreamImageProvider(params: {
  model: StoredImageModelRecord;
  apiKey: string;
  prompt: string;
  ratio: string;
  negativePrompt?: string;
}): Promise<{ buffer: Buffer; mimeType: string }> {
  const { model, apiKey, prompt, ratio, negativePrompt } = params;

  if (model.provider === 'gemini') {
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey });
    if (/imagen/i.test(model.modelName)) {
      const response = await ai.models.generateImages({
        model: model.modelName,
        prompt,
        config: {
          numberOfImages: 1,
          aspectRatio: ratio,
          outputMimeType: 'image/png',
        },
      });
      const b64 = response.generatedImages?.[0]?.image?.imageBytes;
      if (!b64) {
        throw new Error('Gemini Imagen 未返回有效图像数据。');
      }
      return { buffer: Buffer.from(b64, 'base64'), mimeType: 'image/png' };
    }
    const response = await ai.models.generateContent({
      model: model.modelName,
      contents: prompt,
      config: {
        responseModalities: ['IMAGE'],
      },
    });
    const parts = response.candidates?.[0]?.content?.parts ?? [];
    for (const part of parts) {
      if (part.inlineData?.data) {
        return {
          buffer: Buffer.from(part.inlineData.data, 'base64'),
          mimeType: part.inlineData.mimeType || 'image/png',
        };
      }
    }
    throw new Error('Gemini 模型未返回图片内容，请确认模型名称支持生图。');
  }

  const safeBaseUrl = await assertPublicEndpointSafe(
    model.baseUrl || IMAGE_PROVIDER_PRESETS[model.provider].defaultBaseUrl
  );
  const spec = buildProviderRequestSpec({
    provider: model.provider,
    baseUrl: safeBaseUrl,
    apiKey,
    modelName: model.modelName,
    prompt,
    ratio,
    negativePrompt,
  });

  const safeEndpoint = await assertPublicEndpointSafe(spec.endpoint);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 35_000);
  let payload: unknown;
  try {
    const resp = await fetch(safeEndpoint, {
      method: 'POST',
      headers: spec.headers,
      body: JSON.stringify(spec.body),
      signal: controller.signal,
    });
    const text = await resp.text();
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { message: text.slice(0, 240) };
    }
    if (!resp.ok) {
      const extracted = extractImageCandidateFromPayload(payload);
      throw new Error(
        extracted.errorMessage || `生图服务返回错误 (${resp.status})`
      );
    }
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('生图上游接口响应超时，请稍后重试或切换模型。');
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }

  let candidate = extractImageCandidateFromPayload(payload);

  // Poll DashScope async task if needed (e.g. wanx2.1-t2i-turbo / wan2.2-t2i-flash)
  if (!candidate.url && !candidate.base64 && candidate.taskId && spec.taskStatusUrlTemplate) {
    const pollUrl = await assertPublicEndpointSafe(
      spec.taskStatusUrlTemplate.replace('{taskId}', encodeURIComponent(candidate.taskId))
    );
    const deadline = Date.now() + 30_000;
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 1500));
      const pollResp = await fetch(pollUrl, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      const pollData = await pollResp.json();
      const polled = extractImageCandidateFromPayload(pollData);
      if (polled.url || polled.base64) {
        candidate = polled;
        break;
      }
      if (polled.taskStatus === 'FAILED' || polled.taskStatus === 'CANCELED') {
        throw new Error(polled.errorMessage || '异步生图任务执行失败。');
      }
    }
  }

  if (candidate.base64) {
    return {
      buffer: Buffer.from(candidate.base64, 'base64'),
      mimeType: candidate.mimeType || 'image/png',
    };
  }
  if (candidate.url) {
    return downloadSafeRemoteImage(candidate.url);
  }
  throw new Error(candidate.errorMessage || '生图服务未返回可用的图片结果。');
}

async function testImageModelConnectivity(params: {
  model: StoredImageModelRecord;
  apiKey: string;
}): Promise<{ latencyMs: number; note: string }> {
  const startedAt = Date.now();
  const { model, apiKey } = params;
  const testPrompt = 'a simple red circle on cream paper, minimal flat illustration';

  if (model.provider === 'gemini') {
    await callUpstreamImageProvider({
      model,
      apiKey,
      prompt: testPrompt,
      ratio: '1:1',
    });
    return {
      latencyMs: Date.now() - startedAt,
      note: '模型鉴权与生图响应正常',
    };
  }

  const safeBaseUrl = await assertPublicEndpointSafe(
    model.baseUrl || IMAGE_PROVIDER_PRESETS[model.provider].defaultBaseUrl
  );
  const spec = buildProviderRequestSpec({
    provider: model.provider,
    baseUrl: safeBaseUrl,
    apiKey,
    modelName: model.modelName,
    prompt: testPrompt,
    ratio: '1:1',
  });
  const safeEndpoint = await assertPublicEndpointSafe(spec.endpoint);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25_000);
  let payload: unknown;
  try {
    const resp = await fetch(safeEndpoint, {
      method: 'POST',
      headers: spec.headers,
      body: JSON.stringify(spec.body),
      signal: controller.signal,
    });
    const text = await resp.text();
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { message: text.slice(0, 240) };
    }
    if (!resp.ok) {
      const extracted = extractImageCandidateFromPayload(payload);
      throw new Error(
        extracted.errorMessage || `上游返回 HTTP ${resp.status}`
      );
    }
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('连接超时（25s），请检查 Base URL 网络连通性。');
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }

  const candidate = extractImageCandidateFromPayload(payload);
  if (candidate.url || candidate.base64) {
    return {
      latencyMs: Date.now() - startedAt,
      note: '鉴权与同步生图链路正常',
    };
  }
  if (candidate.taskId && spec.taskStatusUrlTemplate) {
    const pollUrl = await assertPublicEndpointSafe(
      spec.taskStatusUrlTemplate.replace('{taskId}', encodeURIComponent(candidate.taskId))
    );
    const deadline = Date.now() + 10_000;
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 1200));
      const pollResp = await fetch(pollUrl, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      const pollData = await pollResp.json();
      const polled = extractImageCandidateFromPayload(pollData);
      if (polled.url || polled.base64) {
        return {
          latencyMs: Date.now() - startedAt,
          note: '鉴权与异步生图链路正常',
        };
      }
      if (polled.taskStatus === 'FAILED' || polled.taskStatus === 'CANCELED') {
        throw new Error(polled.errorMessage || '异步生图任务执行失败。');
      }
    }
    return {
      latencyMs: Date.now() - startedAt,
      note: '鉴权成功，异步生图任务已进入队列',
    };
  }
  throw new Error(candidate.errorMessage || '接口未返回有效的生图结果或任务 ID。');
}

function getLiveSkills(): StyleItem[] {
  const patchedBuiltins = STYLES.map((base) => {
    const patch = overridesStore.patches[base.id];
    if (!patch) return base;
    return {
      ...base,
      ...patch,
      recommendedKinds: patch.recommendedKinds ?? base.recommendedKinds,
      palettePreview: patch.palettePreview ?? base.palettePreview,
      sceneOverrides: patch.sceneOverrides ?? base.sceneOverrides,
    };
  });
  return [...overridesStore.custom, ...patchedBuiltins];
}

function summarizeSkills(skills: StyleItem[]) {
  const byScene: Record<PurposeKind, number> = {
    'social-card': 0,
    infographic: 0,
    comic: 0,
    'ip-character': 0,
    ecommerce: 0,
    'pure-image': 0,
  };
  for (const s of skills) {
    if (!s.enabled) continue;
    for (const k of s.recommendedKinds) {
      if (k in byScene) byScene[k] += 1;
    }
  }
  return {
    skills,
    counts: {
      total: skills.length,
      enabled: skills.filter((s) => s.enabled).length,
      handrawStyle: skills.filter((s) => s.sourceRepo === 'handraw-style').length,
      gemskills: skills.filter((s) => s.sourceRepo === 'gemskills').length,
      custom: skills.filter((s) => s.sourceRepo === 'custom').length,
      byScene,
    },
  };
}

function sanitizeCategory(raw: unknown): ConcreteStyleCategory {
  if (typeof raw === 'string' && VALID_STYLE_CATEGORIES.has(raw as ConcreteStyleCategory)) {
    return raw as ConcreteStyleCategory;
  }
  return 'fa-editorial';
}

function sanitizeSourceRepo(raw: unknown, fallback: StyleSourceRepo = 'custom'): StyleSourceRepo {
  if (raw === 'handraw-style' || raw === 'gemskills' || raw === 'custom') {
    return raw;
  }
  return fallback;
}

function sanitizeRecommendedKinds(raw: unknown): PurposeKind[] {
  if (!Array.isArray(raw)) return ['social-card', 'pure-image'];
  const clean = raw.filter(
    (k): k is PurposeKind => typeof k === 'string' && VALID_PURPOSE_KINDS.has(k as PurposeKind)
  );
  return clean.length > 0 ? clean : ['social-card', 'pure-image'];
}

function sanitizeSceneOverrides(raw: unknown): Partial<Record<PurposeKind, string>> | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const out: Partial<Record<PurposeKind, string>> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (VALID_PURPOSE_KINDS.has(k as PurposeKind) && typeof v === 'string' && v.trim()) {
      out[k as PurposeKind] = v.trim().slice(0, 600);
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function sanitizePalette(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const hexRegex = /^#[0-9a-fA-F]{6}$/;
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item === 'string' && hexRegex.test(item.trim())) {
      const upper = item.trim().toUpperCase();
      if (!out.includes(upper)) out.push(upper);
    }
    if (out.length >= 3) break;
  }
  return out;
}

function sanitizeStyleId(raw: unknown): string {
  const cleaned =
    typeof raw === 'string' ? raw.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '') : '';
  if (cleaned.length >= 2 && cleaned.length <= 36) {
    return cleaned;
  }
  return `CS-${Date.now().toString().slice(-5)}`;
}

function isAiConfigured(): boolean {
  const apiKey = process.env.GEMINI_API_KEY;
  return Boolean(apiKey && apiKey !== 'MY_GEMINI_API_KEY');
}

async function getAiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  const { GoogleGenAI, ThinkingLevel } = await import('@google/genai');
  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
  return { ai, ThinkingLevel };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  const adminAuth = new AdminAuthManager(ADMIN_AUTH_PATH, process.env.SESSION_SECRET);

  const extractBearerToken = (req: express.Request): string => {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) return '';
    return header.slice(7).trim();
  };

  const requireAdminAuth: express.RequestHandler = (req, res, next) => {
    const token = extractBearerToken(req);
    const verified = adminAuth.verifyToken(token);
    if (!verified) {
      res.status(401).json({ message: '此操作仅限已登录的管理员账号执行，请先登录管理后台。' });
      return;
    }
    next();
  };

  // --- Dedicated Admin Auth Endpoints ---
  app.get('/api/admin/status', (_req, res) => {
    res.json(adminAuth.getStatus());
  });

  app.post('/api/admin/setup', (req, res) => {
    const { username = '', password = '' } = req.body as {
      username?: string;
      password?: string;
    };
    const result = adminAuth.claimInitialAdmin(
      typeof username === 'string' ? username : '',
      typeof password === 'string' ? password : ''
    );
    if (!result.ok) {
      res.status(result.status).json({ message: result.error });
      return;
    }
    res.status(201).json({
      token: result.token,
      admin: { username: result.username, role: 'admin' as const },
    });
  });

  app.post('/api/admin/login', (req, res) => {
    const { username = '', password = '' } = req.body as {
      username?: string;
      password?: string;
    };
    const result = adminAuth.login(
      typeof username === 'string' ? username : '',
      typeof password === 'string' ? password : ''
    );
    if (!result.ok) {
      res.status(result.status).json({ message: result.error });
      return;
    }
    res.json({
      token: result.token,
      admin: { username: result.username, role: 'admin' as const },
    });
  });

  app.get('/api/admin/me', (req, res) => {
    const token = extractBearerToken(req);
    const verified = adminAuth.verifyToken(token);
    if (!verified) {
      res.status(401).json({ authenticated: false });
      return;
    }
    res.json({
      authenticated: true,
      admin: { username: verified.sub, role: 'admin' as const },
    });
  });

  app.post('/api/admin/logout', (req, res) => {
    const token = extractBearerToken(req);
    if (token) {
      adminAuth.revokeToken(token);
    }
    res.json({ ok: true });
  });

  app.get('/api/health', (_req, res) => {
    const live = getLiveSkills();
    res.json({
      ok: true,
      aiAvailable: isAiConfigured(),
      availableImageModels: getEnabledPublicImageModels(),
      skillsCount: live.length,
      layoutsCount: LAYOUTS.length,
      colorsCount: COLOR_PALETTES.length,
    });
  });

  // --- Admin Server-Side Image Model & API Key Configuration ---
  app.get('/api/admin/image-models', requireAdminAuth, (_req, res) => {
    const envGeminiKey = process.env.GEMINI_API_KEY;
    res.json({
      models: imageModelsStore.map((m) => toAdminImageModel(m, envGeminiKey)),
    });
  });

  app.post('/api/admin/image-models', requireAdminAuth, (req, res) => {
    const body = req.body as Partial<ImageModelUpsertInput>;
    const provider = sanitizeImageProvider(body.provider);
    const preset = IMAGE_PROVIDER_PRESETS[provider];
    const label = typeof body.label === 'string' ? body.label.trim().slice(0, 48) : '';
    const modelName = typeof body.modelName === 'string' ? body.modelName.trim().slice(0, 80) : '';
    if (!label || !modelName) {
      res.status(400).json({ message: '请填写模型显示名称与模型 ID（modelName）。' });
      return;
    }

    const baseUrlRaw =
      typeof body.baseUrl === 'string' && body.baseUrl.trim()
        ? body.baseUrl.trim()
        : preset.defaultBaseUrl;
    const urlCheck = validateProviderEndpointUrl(baseUrlRaw);
    if (!urlCheck.ok) {
      res.status(400).json({ message: urlCheck.error });
      return;
    }

    const apiKey = typeof body.apiKey === 'string' ? body.apiKey.trim() : '';
    const candidateId = sanitizeModelId(body.id || `${provider}-${Date.now().toString(36)}`);
    const uniqueId = imageModelsStore.some((m) => m.id === candidateId)
      ? `${candidateId}-${Math.floor(Math.random() * 90 + 10)}`
      : candidateId;

    const candidateRecord: StoredImageModelRecord = {
      id: uniqueId,
      label,
      provider,
      modelName,
      baseUrl: urlCheck.normalizedUrl,
      apiKey,
      enabled: Boolean(body.enabled),
      isDefault: Boolean(body.isDefault) || imageModelsStore.length === 0,
      supportedRatios: [...SUPPORTED_IMAGE_RATIOS],
      updatedAt: new Date().toLocaleString('zh-CN', { hour12: false }),
    };

    const keyCheck = resolveModelKeyStatus(candidateRecord, process.env.GEMINI_API_KEY);
    if (candidateRecord.enabled && !keyCheck.effectiveKey) {
      res.status(400).json({ message: '请先填写有效的 API Key 后再启用该生图模型。' });
      return;
    }

    const nextList = candidateRecord.isDefault
      ? [candidateRecord, ...imageModelsStore.map((m) => ({ ...m, isDefault: false }))]
      : [candidateRecord, ...imageModelsStore];

    saveImageModels(nextList);
    res.status(201).json({
      model: toAdminImageModel(candidateRecord, process.env.GEMINI_API_KEY),
      models: nextList.map((m) => toAdminImageModel(m, process.env.GEMINI_API_KEY)),
      availableImageModels: getEnabledPublicImageModels(),
    });
  });

  app.put('/api/admin/image-models/:id', requireAdminAuth, (req, res) => {
    const targetId = req.params.id;
    const existing = imageModelsStore.find((m) => m.id === targetId);
    if (!existing) {
      res.status(404).json({ message: '未找到对应的生图模型配置。' });
      return;
    }

    const body = req.body as Partial<ImageModelUpsertInput> & { clearApiKey?: boolean };
    const provider =
      body.provider !== undefined ? sanitizeImageProvider(body.provider) : existing.provider;
    const preset = IMAGE_PROVIDER_PRESETS[provider];

    let normalizedBaseUrl = existing.baseUrl;
    if (typeof body.baseUrl === 'string' && body.baseUrl.trim()) {
      const urlCheck = validateProviderEndpointUrl(body.baseUrl);
      if (!urlCheck.ok) {
        res.status(400).json({ message: urlCheck.error });
        return;
      }
      normalizedBaseUrl = urlCheck.normalizedUrl;
    } else if (!normalizedBaseUrl) {
      normalizedBaseUrl = preset.defaultBaseUrl;
    }

    const nextApiKey = body.clearApiKey
      ? ''
      : typeof body.apiKey === 'string' && body.apiKey.trim()
      ? body.apiKey.trim()
      : existing.apiKey;

    const nextEnabled = typeof body.enabled === 'boolean' ? body.enabled : existing.enabled;
    const nextIsDefault = typeof body.isDefault === 'boolean' ? body.isDefault : existing.isDefault;

    const updated: StoredImageModelRecord = {
      ...existing,
      provider,
      label:
        typeof body.label === 'string' && body.label.trim()
          ? body.label.trim().slice(0, 48)
          : existing.label,
      modelName:
        typeof body.modelName === 'string' && body.modelName.trim()
          ? body.modelName.trim().slice(0, 80)
          : existing.modelName,
      baseUrl: normalizedBaseUrl,
      apiKey: nextApiKey,
      enabled: body.clearApiKey ? false : nextEnabled,
      isDefault: nextIsDefault,
      updatedAt: new Date().toLocaleString('zh-CN', { hour12: false }),
    };

    const keyCheck = resolveModelKeyStatus(updated, process.env.GEMINI_API_KEY);
    if (updated.enabled && !keyCheck.effectiveKey) {
      res.status(400).json({ message: '请先配置服务端 API Key，再开启启用开关。' });
      return;
    }

    const nextList = imageModelsStore.map((m) => {
      if (m.id === targetId) return updated;
      return updated.isDefault ? { ...m, isDefault: false } : m;
    });

    saveImageModels(nextList);
    res.json({
      model: toAdminImageModel(updated, process.env.GEMINI_API_KEY),
      models: nextList.map((m) => toAdminImageModel(m, process.env.GEMINI_API_KEY)),
      availableImageModels: getEnabledPublicImageModels(),
    });
  });

  app.delete('/api/admin/image-models/:id', requireAdminAuth, (req, res) => {
    const targetId = req.params.id;
    if (!imageModelsStore.some((m) => m.id === targetId)) {
      res.status(404).json({ message: '未找到要删除的模型配置。' });
      return;
    }
    let nextList = imageModelsStore.filter((m) => m.id !== targetId);
    if (nextList.length > 0 && !nextList.some((m) => m.isDefault)) {
      nextList = nextList.map((m, idx) => (idx === 0 ? { ...m, isDefault: true } : m));
    }
    saveImageModels(nextList);
    res.json({
      models: nextList.map((m) => toAdminImageModel(m, process.env.GEMINI_API_KEY)),
      availableImageModels: getEnabledPublicImageModels(),
    });
  });

  app.post('/api/admin/image-models/test', requireAdminAuth, async (req, res) => {
    const body = req.body as Partial<ImageModelUpsertInput> & { editingId?: string };
    const existing = body.editingId
      ? imageModelsStore.find((m) => m.id === body.editingId)
      : undefined;
    const provider = sanitizeImageProvider(body.provider ?? existing?.provider);
    const preset = IMAGE_PROVIDER_PRESETS[provider];
    const modelName =
      typeof body.modelName === 'string' && body.modelName.trim()
        ? body.modelName.trim().slice(0, 80)
        : existing?.modelName ?? '';
    if (!modelName) {
      res.status(400).json({ ok: false, message: '请先填写模型 ID（modelName）。' });
      return;
    }

    const baseUrlRaw =
      typeof body.baseUrl === 'string' && body.baseUrl.trim()
        ? body.baseUrl.trim()
        : existing?.baseUrl || preset.defaultBaseUrl;
    const urlCheck = validateProviderEndpointUrl(baseUrlRaw);
    if (!urlCheck.ok) {
      res.status(400).json({ ok: false, message: urlCheck.error });
      return;
    }

    const rawInputKey = typeof body.apiKey === 'string' ? body.apiKey.trim() : '';
    const candidateRecord: StoredImageModelRecord = {
      id: existing?.id ?? 'draft-test',
      label: (typeof body.label === 'string' && body.label.trim()) || existing?.label || modelName,
      provider,
      modelName,
      baseUrl: urlCheck.normalizedUrl,
      apiKey: rawInputKey || existing?.apiKey || '',
      enabled: true,
      isDefault: false,
      supportedRatios: [...SUPPORTED_IMAGE_RATIOS],
    };
    const { effectiveKey } = resolveModelKeyStatus(candidateRecord, process.env.GEMINI_API_KEY);
    if (!effectiveKey) {
      res.status(400).json({ ok: false, message: '请先填写 API Key 再进行连通性验证。' });
      return;
    }

    const startedAt = Date.now();
    try {
      const result = await testImageModelConnectivity({
        model: candidateRecord,
        apiKey: effectiveKey,
      });
      res.json({
        ok: true,
        latencyMs: result.latencyMs,
        modelName: candidateRecord.modelName,
        provider: candidateRecord.provider,
        message: `连通性验证通过（耗时 ${(result.latencyMs / 1000).toFixed(1)}s · ${result.note}）`,
      });
    } catch (err) {
      const reason = err instanceof Error ? err.message : '未知连接异常';
      res.status(422).json({
        ok: false,
        latencyMs: Date.now() - startedAt,
        modelName: candidateRecord.modelName,
        provider: candidateRecord.provider,
        message: `连通性验证失败：${reason}`,
      });
    }
  });

  app.post('/api/admin/image-models/:id/test', requireAdminAuth, async (req, res) => {
    const targetId = req.params.id;
    const target = imageModelsStore.find((m) => m.id === targetId);
    if (!target) {
      res.status(404).json({ ok: false, message: '未找到对应的生图模型配置。' });
      return;
    }
    const { effectiveKey } = resolveModelKeyStatus(target, process.env.GEMINI_API_KEY);
    if (!effectiveKey) {
      res.status(400).json({ ok: false, message: '该模型尚未配置 API Key，请先填写后再验证。' });
      return;
    }

    const startedAt = Date.now();
    try {
      const result = await testImageModelConnectivity({
        model: target,
        apiKey: effectiveKey,
      });
      res.json({
        ok: true,
        latencyMs: result.latencyMs,
        modelName: target.modelName,
        provider: target.provider,
        message: `连通性验证通过（耗时 ${(result.latencyMs / 1000).toFixed(1)}s · ${result.note}）`,
      });
    } catch (err) {
      const reason = err instanceof Error ? err.message : '未知连接异常';
      res.status(422).json({
        ok: false,
        latencyMs: Date.now() - startedAt,
        modelName: target.modelName,
        provider: target.provider,
        message: `连通性验证失败：${reason}`,
      });
    }
  });

  // --- Server-Side User Image Quota (5 Free Credits per User) ---
  app.get('/api/quota', (req, res) => {
    const accountKey = sanitizeAccountKey(req.query.accountKey);
    if (!accountKey) {
      res.status(400).json({ message: '无效的用户账户标识。' });
      return;
    }
    const quota = getOrCreateUserQuota(accountKey);
    res.json({ quota });
  });

  app.post('/api/quota/redeem', (req, res) => {
    const { accountKey: rawKey, code = '' } = req.body as {
      accountKey?: string;
      code?: string;
    };
    const accountKey = sanitizeAccountKey(rawKey);
    if (!accountKey) {
      res.status(400).json({ ok: false, message: '请先登录有效账号。' });
      return;
    }
    const current = getOrCreateUserQuota(accountKey);
    const result = redeemCodeOnQuota(current, typeof code === 'string' ? code : '');
    if (!result.ok) {
      res.status(400).json({ ok: false, message: result.message, quota: current });
      return;
    }
    saveUserQuotas({
      ...userQuotasStore,
      [accountKey]: result.nextQuota,
    });
    res.json({ ok: true, message: result.message, quota: result.nextQuota });
  });

  app.get('/api/generated-images/:filename', (req, res) => {
    const { filename } = req.params;
    if (!/^img_[a-zA-Z0-9_]+\.(png|jpg|webp)$/.test(filename)) {
      res.status(400).end();
      return;
    }
    const fullPath = path.join(GENERATED_IMAGES_DIR, filename);
    if (!fs.existsSync(fullPath)) {
      res.status(404).end();
      return;
    }
    res.sendFile(fullPath);
  });

  // --- Skill Management Backend API (Public read; Admin-only mutations) ---
  app.get('/api/skills', (_req, res) => {
    res.json(summarizeSkills(getLiveSkills()));
  });

  app.post('/api/skills', requireAdminAuth, (req, res) => {
    const body = req.body as Partial<StyleItem>;
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    if (!title || title.length > 48) {
      res.status(400).json({ message: '请填写 1–48 字的风格中文名称。' });
      return;
    }

    const currentAll = getLiveSkills();
    const rawId = sanitizeStyleId(body.id);
    const id = currentAll.some((s) => s.id === rawId)
      ? `${rawId}-${Math.floor(Math.random() * 90 + 10)}`
      : rawId;

    const candidateImage =
      typeof body.image === 'string' && isValidRasterImageUrl(body.image)
        ? body.image.trim()
        : STYLES[0].image;

    const newSkill: StyleItem = {
      id,
      title,
      englishName:
        typeof body.englishName === 'string' && body.englishName.trim()
          ? body.englishName.trim().slice(0, 80)
          : title,
      category: sanitizeCategory(body.category),
      sourceRepo: sanitizeSourceRepo(body.sourceRepo, 'custom'),
      enabled: typeof body.enabled === 'boolean' ? body.enabled : true,
      featured: Boolean(body.featured),
      referenceArtist:
        typeof body.referenceArtist === 'string' && body.referenceArtist.trim()
          ? body.referenceArtist.trim().slice(0, 60)
          : undefined,
      description:
        typeof body.description === 'string' && body.description.trim()
          ? body.description.trim().slice(0, 300)
          : '自定义配置的插画风格 Skill。',
      visualTraitsCn:
        typeof body.visualTraitsCn === 'string' && body.visualTraitsCn.trim()
          ? body.visualTraitsCn.trim().slice(0, 400)
          : `${title}手绘插画质感、自然纸面肌理与克制构图`,
      visualTraitsEn:
        typeof body.visualTraitsEn === 'string' && body.visualTraitsEn.trim()
          ? body.visualTraitsEn.trim().slice(0, 400)
          : 'crafted editorial hand-drawn illustration with tactile paper grain and balanced composition',
      skillSystemPrompt:
        typeof body.skillSystemPrompt === 'string' && body.skillSystemPrompt.trim()
          ? body.skillSystemPrompt.trim().slice(0, 1200)
          : `严格遵循「${title}」的笔触材质、构图留白与自然光影秩序。`,
      negativePrompt:
        typeof body.negativePrompt === 'string' && body.negativePrompt.trim()
          ? body.negativePrompt.trim().slice(0, 400)
          : '3D渲染、塑料光泽、高饱和霓虹色、杂乱水印',
      sceneOverrides: sanitizeSceneOverrides(body.sceneOverrides),
      defaultRatio:
        typeof body.defaultRatio === 'string' && body.defaultRatio.trim()
          ? body.defaultRatio.trim()
          : '3:4',
      defaultColorId:
        typeof body.defaultColorId === 'string' &&
        COLOR_PALETTES.some((c) => c.id === body.defaultColorId)
          ? body.defaultColorId
          : 'C-10',
      recommendedKinds: sanitizeRecommendedKinds(body.recommendedKinds),
      image: candidateImage,
      palettePreview: sanitizePalette(body.palettePreview),
      updatedAt: new Date().toLocaleString('zh-CN', { hour12: false }),
    };

    saveOverrides({
      ...overridesStore,
      custom: [newSkill, ...overridesStore.custom],
    });
    res.status(201).json({ skill: newSkill, ...summarizeSkills(getLiveSkills()) });
  });

  app.put('/api/skills/:id', requireAdminAuth, (req, res) => {
    const targetId = req.params.id;
    const all = getLiveSkills();
    const current = all.find((s) => s.id === targetId);
    if (!current) {
      res.status(404).json({ message: '未找到对应的风格 Skill 配置。' });
      return;
    }

    const patch = req.body as Partial<StyleItem>;
    if (patch.image !== undefined && !isValidRasterImageUrl(patch.image)) {
      res.status(400).json({ message: '封面图片仅支持位图格式（.jpg / .png / .webp），禁止矢量 SVG。' });
      return;
    }

    const updated: StyleItem = {
      ...current,
      title:
        typeof patch.title === 'string' && patch.title.trim()
          ? patch.title.trim().slice(0, 48)
          : current.title,
      englishName:
        typeof patch.englishName === 'string' && patch.englishName.trim()
          ? patch.englishName.trim().slice(0, 80)
          : current.englishName,
      category: patch.category !== undefined ? sanitizeCategory(patch.category) : current.category,
      sourceRepo:
        patch.sourceRepo !== undefined
          ? sanitizeSourceRepo(patch.sourceRepo, current.sourceRepo)
          : current.sourceRepo,
      enabled: typeof patch.enabled === 'boolean' ? patch.enabled : current.enabled,
      featured: typeof patch.featured === 'boolean' ? patch.featured : current.featured,
      referenceArtist:
        patch.referenceArtist !== undefined
          ? typeof patch.referenceArtist === 'string' && patch.referenceArtist.trim()
            ? patch.referenceArtist.trim().slice(0, 60)
            : undefined
          : current.referenceArtist,
      description:
        typeof patch.description === 'string'
          ? patch.description.trim().slice(0, 300)
          : current.description,
      visualTraitsCn:
        typeof patch.visualTraitsCn === 'string' && patch.visualTraitsCn.trim()
          ? patch.visualTraitsCn.trim().slice(0, 400)
          : current.visualTraitsCn,
      visualTraitsEn:
        typeof patch.visualTraitsEn === 'string' && patch.visualTraitsEn.trim()
          ? patch.visualTraitsEn.trim().slice(0, 400)
          : current.visualTraitsEn,
      skillSystemPrompt:
        typeof patch.skillSystemPrompt === 'string'
          ? patch.skillSystemPrompt.trim().slice(0, 1200)
          : current.skillSystemPrompt,
      negativePrompt:
        typeof patch.negativePrompt === 'string'
          ? patch.negativePrompt.trim().slice(0, 400)
          : current.negativePrompt,
      sceneOverrides:
        patch.sceneOverrides !== undefined
          ? sanitizeSceneOverrides(patch.sceneOverrides)
          : current.sceneOverrides,
      defaultRatio:
        typeof patch.defaultRatio === 'string' && patch.defaultRatio.trim()
          ? patch.defaultRatio.trim()
          : current.defaultRatio,
      defaultColorId:
        typeof patch.defaultColorId === 'string' &&
        COLOR_PALETTES.some((c) => c.id === patch.defaultColorId)
          ? patch.defaultColorId
          : current.defaultColorId,
      recommendedKinds:
        patch.recommendedKinds !== undefined
          ? sanitizeRecommendedKinds(patch.recommendedKinds)
          : current.recommendedKinds,
      image: typeof patch.image === 'string' ? patch.image.trim() : current.image,
      palettePreview:
        patch.palettePreview !== undefined
          ? sanitizePalette(patch.palettePreview)
          : current.palettePreview,
      updatedAt: new Date().toLocaleString('zh-CN', { hour12: false }),
    };

    if (BUILTIN_IDS.has(targetId)) {
      saveOverrides({
        ...overridesStore,
        patches: {
          ...overridesStore.patches,
          [targetId]: updated,
        },
      });
    } else {
      saveOverrides({
        ...overridesStore,
        custom: overridesStore.custom.map((s) => (s.id === targetId ? updated : s)),
      });
    }

    res.json({ skill: updated, ...summarizeSkills(getLiveSkills()) });
  });

  app.delete('/api/skills/:id', requireAdminAuth, (req, res) => {
    const targetId = req.params.id;
    if (BUILTIN_IDS.has(targetId)) {
      res.status(400).json({ message: '内置精选风格不支持删除，可直接关闭启用开关将其从前端隐藏。' });
      return;
    }
    if (!overridesStore.custom.some((s) => s.id === targetId)) {
      res.status(404).json({ message: '未找到要删除的自定义风格 Skill。' });
      return;
    }
    saveOverrides({
      ...overridesStore,
      custom: overridesStore.custom.filter((s) => s.id !== targetId),
    });
    res.json(summarizeSkills(getLiveSkills()));
  });

  app.post('/api/skills/import', requireAdminAuth, (req, res) => {
    try {
      const { payload } = req.body as { payload?: string };
      if (!payload || typeof payload !== 'string' || !payload.trim()) {
        res.status(400).json({ message: '请粘贴有效的 JSON 或 SKILL.md 内容。' });
        return;
      }

      const parsedItems = parseImportedSkillPayload(payload);
      if (parsedItems.length === 0) {
        res.status(400).json({ message: '未在导入内容中解析到有效的风格 Skill 项。' });
        return;
      }

      const nextPatches = { ...overridesStore.patches };
      const nextCustom = [...overridesStore.custom];
      let importedCount = 0;
      const now = new Date().toLocaleString('zh-CN', { hour12: false });

      for (const item of parsedItems.slice(0, 30)) {
        const title = item.title?.trim();
        if (!title) continue;
        const id = sanitizeStyleId(
          item.id || `IMP-${Date.now().toString().slice(-4)}-${importedCount + 1}`
        );
        const safeImage =
          item.image && isValidRasterImageUrl(item.image) ? item.image.trim() : STYLES[0].image;

        if (BUILTIN_IDS.has(id)) {
          const base = STYLES.find((s) => s.id === id)!;
          nextPatches[id] = {
            ...base,
            ...(nextPatches[id] || {}),
            title,
            englishName: item.englishName || base.englishName,
            category: item.category ? sanitizeCategory(item.category) : base.category,
            description: item.description || base.description,
            visualTraitsCn: item.visualTraitsCn || base.visualTraitsCn,
            visualTraitsEn: item.visualTraitsEn || base.visualTraitsEn,
            skillSystemPrompt: item.skillSystemPrompt || base.skillSystemPrompt,
            negativePrompt: item.negativePrompt || base.negativePrompt,
            updatedAt: now,
          };
        } else {
          const customEntry: StyleItem = {
            id,
            title: title.slice(0, 48),
            englishName: (item.englishName || title).slice(0, 80),
            category: sanitizeCategory(item.category),
            sourceRepo: sanitizeSourceRepo(item.sourceRepo, 'custom'),
            enabled: item.enabled ?? true,
            featured: Boolean(item.featured),
            referenceArtist: item.referenceArtist,
            description: (item.description || '通过 Skill 后台导入的插画风格配置。').slice(0, 300),
            visualTraitsCn: (item.visualTraitsCn || `${title}手绘插画笔触与纸面质感`).slice(0, 400),
            visualTraitsEn: (item.visualTraitsEn || `${item.englishName || title} editorial illustration`).slice(0, 400),
            skillSystemPrompt: (
              item.skillSystemPrompt || `按照「${title}」的插画笔触与构图秩序完成画面细节。`
            ).slice(0, 1200),
            negativePrompt: (item.negativePrompt || '3D渲染、塑料光泽、高饱和霓虹色').slice(0, 400),
            defaultRatio: item.defaultRatio || '3:4',
            defaultColorId:
              item.defaultColorId && COLOR_PALETTES.some((c) => c.id === item.defaultColorId)
                ? item.defaultColorId
                : 'C-10',
            recommendedKinds: sanitizeRecommendedKinds(item.recommendedKinds),
            image: safeImage,
            palettePreview: sanitizePalette(item.palettePreview),
            updatedAt: now,
          };
          const idx = nextCustom.findIndex((c) => c.id === id);
          if (idx >= 0) {
            nextCustom[idx] = customEntry;
          } else {
            nextCustom.unshift(customEntry);
          }
        }
        importedCount += 1;
      }

      if (importedCount === 0) {
        res.status(400).json({ message: '导入数据缺少 title 字段，未能入库。' });
        return;
      }

      saveOverrides({ patches: nextPatches, custom: nextCustom });
      res.json({ importedCount, ...summarizeSkills(getLiveSkills()) });
    } catch (err) {
      const message = err instanceof Error ? err.message : '导入解析失败，请检查格式。';
      res.status(400).json({ message });
    }
  });

  app.post('/api/skills/reset', requireAdminAuth, (_req, res) => {
    saveOverrides({ patches: {}, custom: [] });
    res.json(summarizeSkills(getLiveSkills()));
  });

  // --- Prompt Generation Endpoint (reads LIVE configured Skills + Scene Rules + Scene Overrides) ---
  app.post('/api/prompts', async (req, res) => {
    try {
      const { draft, format = 'cn_natural', mode = 'structured' } = req.body as {
        draft?: CreationDraft;
        format?: PromptFormat;
        mode?: 'ai' | 'structured';
      };

      if (!draft || !draft.topic || !draft.topic.trim()) {
        res.status(400).json({ message: '请先输入你想画的内容主题或文案。' });
        return;
      }

      const safeFormat: PromptFormat =
        format === 'en_mj' || format === 'safe_style' ? format : 'cn_natural';
      const liveSkills = getLiveSkills();

      if (mode === 'structured') {
        const prompt = buildStructuredPrompt(draft, safeFormat, liveSkills);
        res.json({ prompt, usedAi: false, format: safeFormat });
        return;
      }

      const gemini = await getAiClient();
      if (!gemini) {
        res.status(503).json({
          code: 'AI_UNAVAILABLE',
          message: '当前环境未启用 AI 润色密钥，可一键使用「结构化模板生成」立即产出提示词。',
        });
        return;
      }

      const purpose = PURPOSES.find((p) => p.id === draft.kind) ?? PURPOSES[0];
      const layout =
        draft.kind === 'pure-image' || !draft.layoutId
          ? null
          : LAYOUTS.find((l) => l.id === draft.layoutId) ?? null;
      const style = draft.styleId
        ? liveSkills.find((s) => s.id === draft.styleId) ?? null
        : null;
      const primaryColor = draft.primaryColorId
        ? COLOR_PALETTES.find((c) => c.id === draft.primaryColorId) ?? null
        : null;
      const accentColors = (draft.accentColorIds || [])
        .map((id) => COLOR_PALETTES.find((c) => c.id === id))
        .filter((c): c is NonNullable<typeof c> => Boolean(c));
      const ratio = draft.ratio || style?.defaultRatio || purpose.recommendedRatio || '3:4';
      const sceneOverride = style?.sceneOverrides?.[draft.kind]?.trim();

      const formatInstruction =
        safeFormat === 'en_mj'
          ? `Output ONE cohesive, vivid, publication-ready English prompt tailored for Midjourney / Flux. Describe concrete visual composition, lighting, brushwork/material texture, and color harmony. End the prompt with "--ar ${ratio} --stylize 250". Do NOT include markdown headings or explanations.`
          : safeFormat === 'safe_style'
          ? `输出一段可直接复制的中文生图提示词（分 3–4 个自然段）。严格禁止出现任何真实艺术家/插画师人名，只用纯视觉笔触、构图、纸张材质与光影语言描述画风。不要输出任何解释或前缀。`
          : `输出一段可直接复制到即梦、豆包或 GPT-4o 使用的高质量中文自然语言生图提示词（分 3–4 个自然段）。将用户的简短想法具体化为生动的画面主体、版面文字层级、笔触质感、色彩层次与光线氛围。禁止输出内部元指令或多余解释。`;

      const userBrief = [
        `用途场景：${purpose.label}（画幅 ${ratio}）`,
        `场景画面纪律：${purpose.sceneRuleCn}`,
        `用户主题/文案：${draft.topic.trim()}`,
        layout
          ? `版式要求（${layout.id} ${layout.title}）：${layout.promptStructureCn}`
          : draft.kind === 'pure-image'
          ? '版式要求：纯图无文字插画构图'
          : '版式要求：用户未锁定固定版式，请按文案字数与视觉动线自由规划构图与留白',
        style
          ? `画风（${style.id} ${style.title}）：${style.visualTraitsCn}`
          : '画风要求：用户未锁定具体画风，请顺应主题意境与场景气质自然发挥出细腻耐看的插画质感',
        style?.skillSystemPrompt ? `画风专属 Skill 指令：${style.skillSystemPrompt}` : '',
        sceneOverride ? `该画风针对「${purpose.label}」的专项适配规则：${sceneOverride}` : '',
        style?.negativePrompt ? `规避元素（负向约束）：${style.negativePrompt}` : '',
        safeFormat === 'safe_style' || !style?.referenceArtist
          ? '参考作者：无（禁止出现人名）'
          : `美学参考气质：${style.referenceArtist}`,
        primaryColor
          ? `主色调：${primaryColor.name} (${primaryColor.englishName}, ${primaryColor.hex}) - ${primaryColor.mood}`
          : '主色调：未锁定（跟随画风原色与画面意境自然配色）',
        accentColors.length
          ? `点缀色：${accentColors.map((c) => `${c.name} (${c.hex})`).join('、')}`
          : '点缀色：无',
      ]
        .filter(Boolean)
        .join('\n');

      const response = await gemini.ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: userBrief,
        config: {
          systemInstruction: `你是 画语 DrawNote 的资深视觉导演与提示词架构师。你的任务是将用户的创作意图与应用场景画面纪律、已选定的画风 Skill 规范、版式、配色润色成真正可直接出图的专业提示词；对于用户未锁定的维度则保持自然和谐发挥。\n${formatInstruction}`,
          thinkingConfig: { thinkingLevel: gemini.ThinkingLevel.LOW },
        },
      });

      const polished = cleanPromptText(response.text ?? '');
      if (!polished) {
        res.status(502).json({
          code: 'EMPTY_AI_RESPONSE',
          message: 'AI 润色暂未返回内容，请重试或切换为结构化模板生成。',
        });
        return;
      }

      res.json({ prompt: polished, usedAi: true, format: safeFormat });
    } catch (err) {
      const message = err instanceof Error ? err.message : '提示词生成失败，请稍后重试。';
      res.status(502).json({
        code: 'AI_REQUEST_FAILED',
        message: `AI 润色请求异常：${message}`,
      });
    }
  });

  // --- Server-Side Image Generation Endpoint (5-Credit Quota + Admin Key) ---
  app.post('/api/images/generate', async (req, res) => {
    let reservedAccountKey: string | null = null;
    let creditSource: CreditBucketSource | null = null;
    try {
      const {
        accountKey: rawKey,
        draft,
        modelId,
        format = 'cn_natural',
      } = req.body as {
        accountKey?: string;
        draft?: Partial<CreationDraft>;
        modelId?: string;
        format?: PromptFormat;
      };

      const accountKey = sanitizeAccountKey(rawKey);
      if (!accountKey) {
        res.status(401).json({ message: '请先登录账号后再使用站内生图功能。' });
        return;
      }
      if (!draft || typeof draft.topic !== 'string' || !draft.topic.trim()) {
        res.status(400).json({ message: '请先填写想画的主题或文案内容。' });
        return;
      }

      const enabledModels = imageModelsStore.filter((m) => {
        if (!m.enabled) return false;
        const { effectiveKey } = resolveModelKeyStatus(m, process.env.GEMINI_API_KEY);
        return Boolean(effectiveKey);
      });

      const selectedModel =
        (modelId ? enabledModels.find((m) => m.id === modelId) : undefined) ??
        enabledModels.find((m) => m.isDefault) ??
        enabledModels[0];

      if (!selectedModel) {
        res.status(503).json({
          code: 'IMAGE_MODEL_UNCONFIGURED',
          message: '管理员尚未配置并启用生图模型 Key，请先在后台「生图模型与 Key」完成配置。',
        });
        return;
      }

      const { effectiveKey } = resolveModelKeyStatus(selectedModel, process.env.GEMINI_API_KEY);
      if (!effectiveKey) {
        res.status(503).json({
          code: 'IMAGE_MODEL_UNCONFIGURED',
          message: '所选生图模型未配置有效 API Key。',
        });
        return;
      }

      const liveSkills = getLiveSkills();
      const safeFormat: PromptFormat =
        format === 'en_mj' || format === 'safe_style' ? format : 'cn_natural';
      const safeKind: PurposeKind =
        draft.kind && VALID_PURPOSE_KINDS.has(draft.kind) ? draft.kind : 'social-card';
      const normalizedDraft: CreationDraft = {
        kind: safeKind,
        topic: draft.topic.trim(),
        layoutId: typeof draft.layoutId === 'string' ? draft.layoutId : '',
        styleId: typeof draft.styleId === 'string' ? draft.styleId : '',
        primaryColorId: typeof draft.primaryColorId === 'string' ? draft.primaryColorId : '',
        accentColorIds: Array.isArray(draft.accentColorIds)
          ? draft.accentColorIds.filter((x): x is string => typeof x === 'string')
          : [],
        ratio: typeof draft.ratio === 'string' ? draft.ratio : '3:4',
      };
      const selectedStyle = normalizedDraft.styleId
        ? liveSkills.find((s) => s.id === normalizedDraft.styleId) ?? null
        : null;
      const purpose = PURPOSES.find((p) => p.id === normalizedDraft.kind) ?? PURPOSES[0];
      const ratio =
        normalizedDraft.ratio || selectedStyle?.defaultRatio || purpose.recommendedRatio || '3:4';
      const promptText = buildStructuredPrompt(normalizedDraft, safeFormat, liveSkills);

      // Reserve 1 credit synchronously BEFORE any async network call
      const currentQuota = getOrCreateUserQuota(accountKey);
      const reservation = reserveOneCredit(currentQuota, selectedModel.label);
      if (!reservation.ok) {
        res.status(402).json({
          code: 'QUOTA_EXHAUSTED',
          message: reservation.error,
          quota: currentQuota,
        });
        return;
      }
      saveUserQuotas({
        ...userQuotasStore,
        [accountKey]: reservation.nextQuota,
      });
      reservedAccountKey = accountKey;
      creditSource = reservation.source;

      const { buffer, mimeType } = await callUpstreamImageProvider({
        model: selectedModel,
        apiKey: effectiveKey,
        prompt: promptText,
        ratio,
        negativePrompt: selectedStyle?.negativePrompt,
      });

      const imageUrl = persistGeneratedImageBuffer(buffer, mimeType);
      const latestQuota = userQuotasStore[accountKey] ?? reservation.nextQuota;
      res.json({
        imageUrl,
        promptText,
        modelId: selectedModel.id,
        modelLabel: selectedModel.label,
        provider: selectedModel.provider,
        ratio,
        quota: latestQuota,
      });
    } catch (err) {
      const reason = err instanceof Error ? err.message : '生图服务调用失败';
      if (reservedAccountKey && creditSource) {
        const latest = getOrCreateUserQuota(reservedAccountKey);
        const refunded = refundOneCredit(latest, creditSource, reason);
        saveUserQuotas({
          ...userQuotasStore,
          [reservedAccountKey]: refunded,
        });
        res.status(422).json({
          code: 'IMAGE_GENERATION_FAILED',
          message: `生图失败（已自动退回 1 次额度）：${reason}`,
          refunded: true,
          quota: refunded,
        });
        return;
      }
      res.status(500).json({
        code: 'IMAGE_GENERATION_ERROR',
        message: `生图请求处理异常：${reason}`,
      });
    }
  });

  if (isProduction) {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const disableHmr = process.env.DISABLE_HMR === 'true';
    const vitePromise = import('vite')
      .then(({ createServer: createViteServer }) =>
        createViteServer({
          server: {
            middlewareMode: true,
            hmr: disableHmr ? false : undefined,
            ws: disableHmr ? false : undefined,
            watch: disableHmr ? null : undefined,
          },
          appType: 'spa',
        })
      )
      .catch((err) => {
        console.error('Failed to initialize Vite dev middleware:', err);
        process.exit(1);
      });

    app.use(async (req, res, next) => {
      try {
        const vite = await vitePromise;
        vite.middlewares(req, res, next);
      } catch (err) {
        next(err);
      }
    });

    app.use('*', async (req, res, next) => {
      try {
        const vite = await vitePromise;
        const templatePath = path.resolve(__dirname, 'index.html');
        let html = fs.readFileSync(templatePath, 'utf-8');
        html = await vite.transformIndexHtml(req.originalUrl, html);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
      } catch (e) {
        next(e);
      }
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`Handraw server running at http://${HOST}:${PORT}`);
  });
}

startServer();
