import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { createServer as createViteServer } from 'vite';
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
import type {
  ConcreteStyleCategory,
  CreationDraft,
  PromptFormat,
  PurposeKind,
  StyleItem,
  StyleSourceRepo,
} from './src/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';

const DATA_DIR = path.resolve(__dirname, 'data');
const OVERRIDES_PATH = path.join(DATA_DIR, 'skills-overrides.json');
const ADMIN_AUTH_PATH = path.join(DATA_DIR, 'admin-auth.json');
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

function loadOverrides(): SkillOverridesStore {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
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
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(OVERRIDES_PATH, JSON.stringify(next, null, 2), 'utf-8');
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

function getAiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
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
      aiAvailable: Boolean(getAiClient()),
      availableImageModels: [],
      skillsCount: live.length,
      layoutsCount: LAYOUTS.length,
      colorsCount: COLOR_PALETTES.length,
    });
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
      const { draft, format = 'cn_natural', mode = 'ai' } = req.body as {
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

      const ai = getAiClient();
      if (!ai) {
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

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: userBrief,
        config: {
          systemInstruction: `你是 画语 DrawNote 的资深视觉导演与提示词架构师。你的任务是将用户的创作意图与应用场景画面纪律、已选定的画风 Skill 规范、版式、配色润色成真正可直接出图的专业提示词；对于用户未锁定的维度则保持自然和谐发挥。\n${formatInstruction}`,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
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

  if (isProduction) {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);

    app.use('*', async (req, res, next) => {
      try {
        const templatePath = path.resolve(__dirname, 'index.html');
        let html = fs.readFileSync(templatePath, 'utf-8');
        html = await vite.transformIndexHtml(req.originalUrl, html);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
      } catch (e) {
        next(e);
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Handraw server running at http://localhost:${PORT}`);
  });
}

startServer();
