import {
  ALL_PANORAMA_IDS,
  ASPECT_RATIOS,
  COLOR_PALETTES,
  DEFAULT_STYLE_BY_KIND,
  FEATURED_SHOWCASE_IDS,
  LAYOUTS,
  PURPOSES,
  SCENE_CATEGORY_PRIORITY,
  SCENE_SHOWCASE_IDS,
  STYLES,
  VALID_CONCRETE_CATEGORIES,
} from '../data/catalog';
import type {
  ConcreteStyleCategory,
  CreationDraft,
  LayoutItem,
  PromptFormat,
  PurposeKind,
  StyleCategory,
  StyleItem,
  StyleSourceRepo,
  WorkbenchMode,
} from '../types';

const VALID_CATEGORY_SET = new Set<ConcreteStyleCategory>(VALID_CONCRETE_CATEGORIES);

/**
 * Strips leaked internal pipeline directives and normalizes duplicate punctuation.
 */
export function cleanPromptText(raw: string): string {
  return raw
    .replace(/【[^】]*(?:根据主题设计画面隐喻|原文是用户意图|保留姓名、数据与事实)[^】]*】/g, '')
    .replace(/如原模板含示例比例，以此明确指定比例为准[，,。.]*保留构图机制[。.]*/g, '')
    .replace(/主题\s*\/\s*用户资料（原文保留）[:：]\s*/g, '')
    .replace(/。{2,}/g, '。')
    .replace(/\.{4,}/g, '...')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Dynamically choose default workbench mode based on available image models.
 */
export function resolveInitialWorkbenchMode(
  availableModels: string[],
  savedMode: WorkbenchMode | null,
  modeExplicit: boolean
): WorkbenchMode {
  if (modeExplicit && savedMode) {
    return savedMode;
  }
  return availableModels.length > 0 ? 'image' : 'prompt';
}

/**
 * Mask email address for OTP verification step echo.
 */
export function maskEmail(email: string): string {
  const trimmed = email.trim();
  const atIndex = trimmed.indexOf('@');
  if (atIndex <= 0) return trimmed;
  const local = trimmed.slice(0, atIndex);
  const domain = trimmed.slice(atIndex);
  if (local.length <= 2) {
    return `${local[0]}***${domain}`;
  }
  return `${local.slice(0, 2)}***${domain}`;
}

/**
 * Validates and normalizes a username for 1-step account-name registration / login.
 */
export function validateAccountUsername(raw: string): {
  ok: boolean;
  normalized: string;
  error?: string;
} {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, normalized: '', error: '请输入你想使用的账号名。' };
  }
  if (trimmed.length < 2 || trimmed.length > 24) {
    return { ok: false, normalized: trimmed, error: '账号名长度需在 2–24 个字符之间。' };
  }
  if (!/^[\u4e00-\u9fa5A-Za-z0-9_-]+$/.test(trimmed)) {
    return {
      ok: false,
      normalized: trimmed,
      error: '账号名仅支持中英文、数字、下划线或短横线，不能包含空格或特殊符号。',
    };
  }
  return { ok: true, normalized: trimmed };
}

/**
 * Returns layouts compatible with the selected creation purpose.
 */
export function getLayoutsForKind(kind: PurposeKind, layouts: LayoutItem[] = LAYOUTS): LayoutItem[] {
  if (kind === 'pure-image') return [];
  const exact = layouts.filter((item) => item.kinds.includes(kind));
  return exact.length > 0 ? exact : layouts;
}

/**
 * Pick the best-fit enabled style when switching to a new application scene.
 */
export function pickRecommendedStyleForKind(
  kind: PurposeKind,
  styles: StyleItem[],
  currentStyleId?: string
): StyleItem {
  const pool = styles.length > 0 ? styles : STYLES;
  if (currentStyleId) {
    const current = pool.find((s) => s.id === currentStyleId);
    if (current && current.recommendedKinds.includes(kind)) {
      return current;
    }
  }
  const preferredId = DEFAULT_STYLE_BY_KIND[kind];
  const preferred = pool.find((s) => s.id === preferredId);
  if (preferred) return preferred;
  const featuredMatch = pool.find((s) => s.featured && s.recommendedKinds.includes(kind));
  if (featuredMatch) return featuredMatch;
  const anyMatch = pool.find((s) => s.recommendedKinds.includes(kind));
  return anyMatch ?? pool[0];
}

/**
 * Interleaves styles across categories in round-robin order so panoramic "all" views
 * showcase diverse visual styles instead of clustering 40 consecutive items from one category.
 */
function interleaveByCategory(items: StyleItem[]): StyleItem[] {
  const buckets = new Map<ConcreteStyleCategory, StyleItem[]>();
  for (const item of items) {
    const list = buckets.get(item.category);
    if (list) {
      list.push(item);
    } else {
      buckets.set(item.category, [item]);
    }
  }
  const queues = Array.from(buckets.values());
  const result: StyleItem[] = [];
  let added = true;
  while (added) {
    added = false;
    for (const q of queues) {
      const next = q.shift();
      if (next) {
        result.push(next);
        added = true;
      }
    }
  }
  return result;
}

/**
 * Ranks filtered styles for a given scene and style tag so every scene tab
 * (社媒卡片 / 信息图 / 漫画分镜 / IP角色 / 电商图片 / 纯图创作) and every tag tab
 * under 全部场景 surfaces its own distinct, authentic visual representatives first.
 */
export function rankStylesForGallery(
  matched: StyleItem[],
  options: {
    sceneKind?: PurposeKind | 'all';
    tagId?: string;
    isFeaturedFilter?: boolean;
  } = {}
): StyleItem[] {
  const { sceneKind = 'all', tagId = 'all', isFeaturedFilter = false } = options;

  if (sceneKind !== 'all') {
    const leadOrder = new Map(
      (SCENE_SHOWCASE_IDS[sceneKind] ?? []).map((id, idx) => [id, idx])
    );
    const catOrder = new Map(
      (SCENE_CATEGORY_PRIORITY[sceneKind] ?? []).map((cat, idx) => [cat, idx])
    );
    return [...matched].sort((a, b) => {
      const aLead = leadOrder.has(a.id) ? leadOrder.get(a.id)! : 9999;
      const bLead = leadOrder.has(b.id) ? leadOrder.get(b.id)! : 9999;
      if (aLead !== bLead) return aLead - bLead;

      const aCat = catOrder.has(a.category) ? catOrder.get(a.category)! : 999;
      const bCat = catOrder.has(b.category) ? catOrder.get(b.category)! : 999;
      if (aCat !== bCat) return aCat - bCat;

      return Number(Boolean(b.featured)) - Number(Boolean(a.featured));
    });
  }

  // All-scenes mode: differentiate "全部风格" panoramic mosaic vs "编辑精选" vs specific tags
  if (isFeaturedFilter || tagId === 'featured') {
    const featOrder = new Map(FEATURED_SHOWCASE_IDS.map((id, idx) => [id, idx]));
    return [...matched].sort((a, b) => {
      const aRank = featOrder.has(a.id) ? featOrder.get(a.id)! : 9999;
      const bRank = featOrder.has(b.id) ? featOrder.get(b.id)! : 9999;
      if (aRank !== bRank) return aRank - bRank;
      return Number(Boolean(b.featured)) - Number(Boolean(a.featured));
    });
  }

  if (tagId === 'all') {
    const panoramaOrder = new Map(ALL_PANORAMA_IDS.map((id, idx) => [id, idx]));
    const leads: StyleItem[] = [];
    const rest: StyleItem[] = [];
    for (const item of matched) {
      if (panoramaOrder.has(item.id)) {
        leads.push(item);
      } else {
        rest.push(item);
      }
    }
    leads.sort((a, b) => panoramaOrder.get(a.id)! - panoramaOrder.get(b.id)!);
    const sortedRest = [...rest].sort(
      (a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured))
    );
    return [...leads, ...interleaveByCategory(sortedRest)];
  }

  // Specific unified style tag (may combine 2-3 categories): prioritize featured, then interleave categories
  const featuredItems = matched.filter((s) => s.featured);
  const regularItems = matched.filter((s) => !s.featured);
  return [...interleaveByCategory(featuredItems), ...interleaveByCategory(regularItems)];
}

/**
 * Filter art styles by scene (purpose kind), category, source repo, search query, and favorites.
 * Automatically prioritizes scene-authentic and featured styles.
 */
export function filterStyles(
  styles: StyleItem[],
  options: {
    category: StyleCategory;
    query: string;
    sourceRepo?: StyleSourceRepo | 'all';
    sceneKind?: PurposeKind | 'all';
    favoritesOnly?: boolean;
    favoriteIds?: string[];
  }
): StyleItem[] {
  const q = options.query.trim().toLowerCase();
  const favSet = new Set(options.favoriteIds ?? []);

  const matched = styles.filter((style) => {
    if (options.favoritesOnly && !favSet.has(style.id)) return false;
    if (options.sourceRepo && options.sourceRepo !== 'all' && style.sourceRepo !== options.sourceRepo) {
      return false;
    }
    if (
      options.sceneKind &&
      options.sceneKind !== 'all' &&
      !style.recommendedKinds.includes(options.sceneKind)
    ) {
      return false;
    }
    if (options.category === 'featured' && !style.featured) return false;
    if (
      options.category !== 'all' &&
      options.category !== 'featured' &&
      style.category !== options.category
    ) {
      return false;
    }
    if (!q) return true;
    const haystack = [
      style.id,
      style.title,
      style.englishName,
      style.description,
      style.visualTraitsCn,
      style.visualTraitsEn,
      style.skillSystemPrompt,
      style.sourceRepo,
      style.referenceArtist ?? '',
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });

  // Sort using scene-authentic & diversified ranking when browsing without an explicit search query
  if (!q) {
    return rankStylesForGallery(matched, {
      sceneKind: options.sceneKind ?? 'all',
      tagId: options.category === 'featured' ? 'featured' : options.category === 'all' ? 'all' : options.category,
      isFeaturedFilter: options.category === 'featured',
    });
  }
  return matched;
}

/**
 * Summarizes the active locked vs optional/auto conditions of a creation draft for UI display.
 */
export function summarizeDraftConditions(
  draft: CreationDraft,
  styles: StyleItem[] = STYLES,
  layouts: LayoutItem[] = LAYOUTS
): string {
  const purpose = PURPOSES.find((p) => p.id === draft.kind) ?? PURPOSES[0];
  const ratio = draft.ratio || purpose.recommendedRatio || '3:4';
  const layout =
    draft.kind !== 'pure-image' && draft.layoutId
      ? layouts.find((l) => l.id === draft.layoutId)
      : undefined;
  const style = draft.styleId ? styles.find((s) => s.id === draft.styleId) : undefined;
  const primaryColor = draft.primaryColorId
    ? COLOR_PALETTES.find((c) => c.id === draft.primaryColorId)
    : undefined;
  const accentNames = draft.accentColorIds
    .map((id) => COLOR_PALETTES.find((c) => c.id === id)?.name)
    .filter(Boolean);

  const parts = [purpose.label, ratio];
  if (purpose.usesLayout) {
    parts.push(layout ? `版式:${layout.title}` : '版式自由');
  }
  parts.push(style ? `画风:${style.title}` : '画风自由');
  if (primaryColor) {
    parts.push(
      accentNames.length > 0
        ? `配色:${primaryColor.name}+${accentNames.join('/')}`
        : `配色:${primaryColor.name}`
    );
  } else if (accentNames.length > 0) {
    parts.push(`点缀:${accentNames.join('/')}`);
  } else {
    parts.push('配色随画风');
  }
  return parts.join(' · ');
}

/**
 * Applies a saved UserTemplate onto an existing draft while preserving current topic unless template defines a prefix and topic is empty.
 */
export function applyUserTemplateToDraft(
  currentDraft: CreationDraft,
  template: {
    draft: {
      kind: PurposeKind;
      layoutId: string;
      styleId: string;
      primaryColorId: string;
      accentColorIds: string[];
      ratio: string;
      topicPrefix?: string;
    };
  }
): CreationDraft {
  const keepTopic = currentDraft.topic.trim().length > 0;
  return {
    kind: template.draft.kind,
    topic: keepTopic ? currentDraft.topic : template.draft.topicPrefix ?? currentDraft.topic,
    layoutId: template.draft.kind === 'pure-image' ? '' : template.draft.layoutId,
    styleId: template.draft.styleId,
    primaryColorId: template.draft.primaryColorId,
    accentColorIds: [...template.draft.accentColorIds],
    ratio: template.draft.ratio,
  };
}

/**
 * Deterministic structured prompt builder for all 3 output formats.
 * Respects optional/empty layoutId, styleId, and primaryColorId (auto/freeform)
 * and injects live style Skill rules, scene disciplines, and per-scene Skill overrides.
 */
export function buildStructuredPrompt(
  draft: CreationDraft,
  format: PromptFormat,
  stylesOverride: StyleItem[] = STYLES
): string {
  const activeCatalog = stylesOverride.length > 0 ? stylesOverride : STYLES;
  const purpose = PURPOSES.find((p) => p.id === draft.kind) ?? PURPOSES[0];
  const layout =
    draft.kind === 'pure-image' || !draft.layoutId
      ? undefined
      : LAYOUTS.find((l) => l.id === draft.layoutId);
  const style = draft.styleId
    ? activeCatalog.find((s) => s.id === draft.styleId)
    : undefined;
  const primaryColor = draft.primaryColorId
    ? COLOR_PALETTES.find((c) => c.id === draft.primaryColorId)
    : undefined;
  const accentColors = draft.accentColorIds
    .map((id) => COLOR_PALETTES.find((c) => c.id === id))
    .filter((c): c is NonNullable<typeof c> => Boolean(c));
  const ratio = draft.ratio || style?.defaultRatio || purpose.recommendedRatio || '3:4';
  const ratioLabel = ASPECT_RATIOS.find((r) => r.value === ratio)?.value ?? ratio;
  const topic = draft.topic.trim() || '温暖日常的生活灵感画面';
  const topicNoTrail = topic.replace(/[。.!！?？]+$/g, '');
  const sceneOverrideRule = style?.sceneOverrides?.[draft.kind]?.trim() || '';

  if (format === 'en_mj') {
    const colorLine = primaryColor
      ? accentColors.length
        ? `Color harmony: ${primaryColor.englishName} (${primaryColor.hex}) dominant palette with ${accentColors
            .map((c) => `${c.englishName} (${c.hex})`)
            .join(' and ')} subtle accents.`
        : `Color harmony: ${primaryColor.englishName} (${primaryColor.hex}) harmonious palette on soft paper.`
      : accentColors.length
      ? `Color harmony: natural mood-driven palette accented with ${accentColors
          .map((c) => `${c.englishName} (${c.hex})`)
          .join(' and ')}.`
      : 'Color harmony: natural, cohesive palette organically following the subject mood and illustration medium.';

    const layoutPart = layout
      ? `${layout.promptStructureEn}.`
      : draft.kind === 'pure-image'
      ? 'full-bleed standalone editorial illustration, no embedded text.'
      : 'flexible editorial composition organically arranged to suit the content flow and readable breathing space.';

    const stylePart = style
      ? `Visual style (${style.id}): ${style.visualTraitsEn}.`
      : 'Visual style: expressive crafted illustration medium naturally tailored to the scene mood with refined brushwork and authentic paper texture.';

    const parts = [
      `Editorial ${purpose.id.replace('-', ' ')} illustration depicting: ${topicNoTrail}.`,
      purpose.sceneRuleEn,
      layoutPart,
      stylePart,
      sceneOverrideRule ? `Scene adaptation: ${sceneOverrideRule}.` : '',
      colorLine,
      `Soft natural lighting, crisp tactile craftsmanship, clean balanced negative space --ar ${ratioLabel} --stylize 250`,
    ].filter(Boolean);
    return cleanPromptText(parts.join(' '));
  }

  if (format === 'safe_style') {
    const layoutLine = layout
      ? `【版式构图 · ${layout.id} ${layout.title}】${layout.promptStructureCn}`
      : draft.kind === 'pure-image'
      ? '【版式构图】独立纯图艺术构图，画面无多余文字，保留舒展的留白呼吸感。'
      : '【版式构图】自由构图，请根据文案字数与阅读流向自然安排主视觉位置与文字呼吸留白。';

    const styleLine = style
      ? `【纯视觉画风 · ${style.id}】${style.visualTraitsCn}（纯材质与笔触描述，不含任何艺术家真名，适配主流生图平台审核规范）。`
      : '【纯视觉画风】不限定单一固定画风，结合主题情绪与场景特征自然呈现出具有手绘温度、构图克制且质感细腻的插画画面（不含任何艺术家真名）。';

    const colorLine = primaryColor
      ? `【色彩氛围】以 ${primaryColor.name}（${primaryColor.hex}，${primaryColor.mood}）为主色调${
          accentColors.length
            ? `，辅以 ${accentColors.map((c) => `${c.name}（${c.hex}）`).join('、')} 作为轻盈点缀色`
            : ''
        }，整体光影柔和克制、纸面质感清晰。`
      : accentColors.length
      ? `【色彩氛围】整体色调随画风与主题意境自然定调，局部以 ${accentColors
          .map((c) => `${c.name}（${c.hex}）`)
          .join('、')} 作为点缀提亮。`
      : '【色彩氛围】跟随画风与画面意境自然配色，色调温润和谐、层次克制，不强行偏色。';

    const negativeLine = style?.negativePrompt.trim()
      ? `【画面规避】避免出现：${style.negativePrompt.trim()}。`
      : '';

    const lines = [
      `【创作场景】${purpose.label}（建议画幅 ${ratioLabel}）—— ${purpose.sceneRuleCn}`,
      `【核心内容】围绕「${topicNoTrail}」构建具体的视觉画面与生活细节，让场景元素与情绪自然呼应。`,
      layoutLine,
      styleLine,
      style?.skillSystemPrompt.trim() ? `【Skill 执行规范】${style.skillSystemPrompt.trim()}` : '',
      sceneOverrideRule ? `【${purpose.label}专属画风规则】${sceneOverrideRule}` : '',
      colorLine,
      negativeLine,
    ].filter(Boolean);
    return cleanPromptText(lines.join('\n\n'));
  }

  // Default: cn_natural (即梦 / 豆包 / GPT-4o 中文自然语言)
  const layoutLine = layout
    ? `版式结构（${layout.id} ${layout.title}）：${layout.promptStructureCn}`
    : draft.kind === 'pure-image'
    ? '构图方式：完整独立的纯图插画构图，不添加界面边框或多余文字，注重主体层次与空气感。'
    : '构图方式：不限定固定版式，请结合主题内容与字数自然规划画面重心、留白呼吸感与图文视觉动线。';

  const styleLine = style
    ? `画风与材质细节（${style.id}）：${style.title}${
        style.referenceArtist ? `（参考气质：${style.referenceArtist}）` : ''
      }，呈现${style.visualTraitsCn}。`
    : '画风与材质细节：不指定固定流派，请顺应文案情绪与应用场景，自然呈现出耐看细腻、笔触真实的手绘插画质感。';

  const colorLine = primaryColor
    ? `色彩搭配：以${primaryColor.name}（${primaryColor.englishName} ${primaryColor.hex}）为主基调${
        accentColors.length
          ? `，点缀色选用 ${accentColors.map((c) => `${c.name}（${c.hex}）`).join(' 与 ')}`
          : ''
      }，整体色调温润协调，保留柔和自然光与细微纸张肌理。`
    : accentColors.length
    ? `色彩搭配：整体色调跟随画风原色与主题氛围自然展开，局部融入 ${accentColors
        .map((c) => `${c.name}（${c.hex}）`)
        .join(' 与 ')} 作为轻盈点缀。`
    : '色彩搭配：跟随画风与主题意境自然配色（不强行锁定主色），保持整体色调协调耐看与柔和自然光影。';

  const skillRuleLine = style?.skillSystemPrompt.trim()
    ? `画风 Skill 规范：${style.skillSystemPrompt.trim()}`
    : '';
  const sceneOverrideLine = sceneOverrideRule
    ? `针对「${purpose.label}」的场景微调规则：${sceneOverrideRule}`
    : '';
  const negativeLine = style?.negativePrompt.trim()
    ? `请避免出现：${style.negativePrompt.trim()}。`
    : '';

  const lines = [
    `请创作一幅 ${ratioLabel} 比例的「${purpose.label}」视觉作品。${purpose.sceneRuleCn}`,
    `画面主题与故事内容：${topicNoTrail}。请将文字中的关键物件、动作与生活场景自然融入构图，让图文彼此呼应、主次分明。`,
    layoutLine,
    styleLine,
    skillRuleLine,
    sceneOverrideLine,
    colorLine,
    negativeLine,
  ].filter(Boolean);
  return cleanPromptText(lines.join('\n\n'));
}

/**
 * Export a style configuration into standard Agent SKILL.md format.
 */
export function formatStyleSkillMarkdown(style: StyleItem): string {
  const safeSlug = style.id.toLowerCase().replace(/[^a-z0-9-_]+/g, '-');
  const sceneLines = style.sceneOverrides
    ? Object.entries(style.sceneOverrides)
        .filter(([, v]) => Boolean(v && v.trim()))
        .map(([k, v]) => `- ${k}: ${v!.trim()}`)
    : [];

  return [
    '---',
    `name: handraw-${safeSlug}`,
    `id: ${style.id}`,
    `title: ${style.title}`,
    `englishName: ${style.englishName}`,
    `category: ${style.category}`,
    `sourceRepo: ${style.sourceRepo}`,
    `recommendedKinds: ${style.recommendedKinds.join(', ')}`,
    `defaultRatio: ${style.defaultRatio || '3:4'}`,
    `defaultColorId: ${style.defaultColorId || 'C-10'}`,
    `description: ${style.description}`,
    '---',
    '',
    `# ${style.title} (${style.englishName})`,
    '',
    '## Visual Traits (CN)',
    style.visualTraitsCn,
    '',
    '## Visual Traits (EN)',
    style.visualTraitsEn,
    '',
    '## Skill System Instructions',
    style.skillSystemPrompt,
    '',
    ...(sceneLines.length > 0 ? ['## Scene Overrides', ...sceneLines, ''] : []),
    '## Negative Prompt',
    style.negativePrompt || '3D渲染、塑料光泽、高饱和霓虹色',
    '',
  ].join('\n');
}

/**
 * Validates that an image URL is a safe raster image path (blocks SVG and javascript: URLs).
 */
export function isValidRasterImageUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (/^javascript:/i.test(trimmed)) return false;
  if (/\.svg(\?|#|$)/i.test(trimmed)) return false;
  if (
    trimmed.startsWith('/src/assets/images/') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('http://')
  ) {
    return /\.(jpg|jpeg|png|webp)(\?|#|$)/i.test(trimmed);
  }
  return false;
}

/**
 * Parses either a JSON object/array or a SKILL.md frontmatter document into partial StyleItem payloads.
 */
export function parseImportedSkillPayload(raw: string): Array<Partial<StyleItem>> {
  const trimmed = raw.trim();
  if (!trimmed) return [];

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    const parsed = JSON.parse(trimmed) as unknown;
    const list = Array.isArray(parsed) ? parsed : [parsed];
    return list
      .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
      .map((obj) => {
        const rawCat = typeof obj.category === 'string' ? obj.category : 'fa-editorial';
        const category = VALID_CATEGORY_SET.has(rawCat as ConcreteStyleCategory)
          ? (rawCat as ConcreteStyleCategory)
          : 'fa-editorial';
        const rawSource = typeof obj.sourceRepo === 'string' ? obj.sourceRepo : 'custom';
        const sourceRepo: StyleSourceRepo =
          rawSource === 'handraw-style' || rawSource === 'gemskills' ? rawSource : 'custom';
        return {
          id: typeof obj.id === 'string' ? obj.id.trim() : undefined,
          title: typeof obj.title === 'string' ? obj.title.trim() : undefined,
          englishName: typeof obj.englishName === 'string' ? obj.englishName.trim() : undefined,
          category,
          sourceRepo,
          enabled: typeof obj.enabled === 'boolean' ? obj.enabled : true,
          featured: typeof obj.featured === 'boolean' ? obj.featured : false,
          referenceArtist:
            typeof obj.referenceArtist === 'string' ? obj.referenceArtist.trim() : undefined,
          description: typeof obj.description === 'string' ? obj.description.trim() : undefined,
          visualTraitsCn:
            typeof obj.visualTraitsCn === 'string' ? obj.visualTraitsCn.trim() : undefined,
          visualTraitsEn:
            typeof obj.visualTraitsEn === 'string' ? obj.visualTraitsEn.trim() : undefined,
          skillSystemPrompt:
            typeof obj.skillSystemPrompt === 'string' ? obj.skillSystemPrompt.trim() : undefined,
          negativePrompt:
            typeof obj.negativePrompt === 'string' ? obj.negativePrompt.trim() : undefined,
          defaultRatio:
            typeof obj.defaultRatio === 'string' ? obj.defaultRatio.trim() : undefined,
          defaultColorId:
            typeof obj.defaultColorId === 'string' ? obj.defaultColorId.trim() : undefined,
          image: typeof obj.image === 'string' ? obj.image.trim() : undefined,
        };
      });
  }

  const fmMatch = trimmed.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);
  if (!fmMatch) {
    throw new Error('无法识别导入内容：请提供有效的 JSON 或带 --- 前置元数据的 SKILL.md 文本。');
  }

  const frontmatterLines = fmMatch[1].split('\n');
  const meta: Record<string, string> = {};
  for (const line of frontmatterLines) {
    const idx = line.indexOf(':');
    if (idx > 0) {
      const k = line.slice(0, idx).trim();
      const v = line.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
      meta[k] = v;
    }
  }
  const body = fmMatch[2] || '';
  const extractSection = (heading: string): string | undefined => {
    const regex = new RegExp(`##\\s+${heading}[^\\n]*\\n([\\s\\S]*?)(?=\\n##\\s+|$)`, 'i');
    const m = body.match(regex);
    return m ? m[1].trim() : undefined;
  };

  const rawCat = meta.category || 'fa-editorial';
  const category = VALID_CATEGORY_SET.has(rawCat as ConcreteStyleCategory)
    ? (rawCat as ConcreteStyleCategory)
    : 'fa-editorial';
  const rawSource = meta.sourceRepo || 'custom';
  const sourceRepo: StyleSourceRepo =
    rawSource === 'handraw-style' || rawSource === 'gemskills' ? rawSource : 'custom';

  const title = meta.title || meta.name || '自定义导入画风';
  return [
    {
      id: meta.id || undefined,
      title,
      englishName: meta.englishName || meta.name || title,
      category,
      sourceRepo,
      enabled: true,
      description: meta.description || '从 SKILL.md 导入的插画风格配置。',
      visualTraitsCn: extractSection('Visual Traits \\(CN\\)') || meta.description || title,
      visualTraitsEn: extractSection('Visual Traits \\(EN\\)') || meta.englishName || title,
      skillSystemPrompt:
        extractSection('Skill System Instructions') || body.trim() || meta.description || title,
      negativePrompt: extractSection('Negative Prompt') || '3D渲染、塑料光泽、杂乱水印',
      defaultRatio: meta.defaultRatio || '3:4',
      defaultColorId: meta.defaultColorId || 'C-10',
    },
  ];
}

export type PromptRefinementId =
  | 'more-whitespace'
  | 'richer-lighting'
  | 'journal-tactile'
  | 'crisp-focus';

export interface PromptRefinementOption {
  id: PromptRefinementId;
  label: string;
  clauseCn: string;
  clauseEn: string;
}

export const PROMPT_REFINEMENT_OPTIONS: PromptRefinementOption[] = [
  {
    id: 'more-whitespace',
    label: '更克制留白',
    clauseCn: '整体画面进一步增加 25% 以上的呼吸留白，精简次要装饰元素，构图更舒展通透、重点一眼聚焦。',
    clauseEn: 'generous airy negative space, pared-back secondary details, calm breathing composition',
  },
  {
    id: 'richer-lighting',
    label: '强化光影质感',
    clauseCn: '强化自然侧逆光与柔和投影层次，增添空气透视与细腻暖调光斑，让画面更有立体纵深感。',
    clauseEn: 'luminous natural rim lighting, soft layered cast shadows, warm atmospheric depth',
  },
  {
    id: 'journal-tactile',
    label: '手账绘本感',
    clauseCn: '增强手工水彩纸纹与轻盈手绘笔触肌理，边缘保留自然手写涂抹温度，呈现温柔治愈的手账绘本质感。',
    clauseEn: 'tactile cold-press watercolor paper grain, organic hand-inked edges, warm illustrated notebook charm',
  },
  {
    id: 'crisp-focus',
    label: '主体更清晰',
    clauseCn: '大幅提升核心主体轮廓与细节清晰度，背景适度柔和退后，确保主视觉与信息层级清晰利落。',
    clauseEn: 'crisp focal subject silhouette, sharp hero details, softly receding uncluttered backdrop',
  },
];

/**
 * Applies a quick, deterministic one-click visual refinement modifier to a prompt without duplicating clauses.
 */
export function applyQuickRefinementToPrompt(
  basePrompt: string,
  refinementId: PromptRefinementId,
  format: PromptFormat
): string {
  const clean = basePrompt.trim();
  const option = PROMPT_REFINEMENT_OPTIONS.find((item) => item.id === refinementId);
  if (!clean || !option) return clean;

  if (format === 'en_mj') {
    if (clean.includes(option.clauseEn)) return clean;
    const paramIndex = clean.search(/\s--[a-z]+/i);
    if (paramIndex >= 0) {
      const head = clean.slice(0, paramIndex).replace(/[,\s.]+$/, '');
      const tail = clean.slice(paramIndex).trim();
      return `${head}, ${option.clauseEn} ${tail}`;
    }
    return `${clean.replace(/[,\s.]+$/, '')}, ${option.clauseEn}`;
  }

  if (clean.includes(option.clauseCn)) return clean;
  return `${clean}\n\n微调要求（${option.label}）：${option.clauseCn}`;
}

/**
 * Computes a compact, jumpable 0-indexed page number list with 'ellipsis' separators.
 */
export function getPaginationWindow(
  currentPage: number,
  totalPages: number
): Array<number | 'ellipsis'> {
  if (totalPages <= 1) return [0];
  const clamped = Math.max(0, Math.min(currentPage, totalPages - 1));
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i);
  }
  const pages = new Set<number>([0, totalPages - 1, clamped]);
  if (clamped > 0) pages.add(clamped - 1);
  if (clamped < totalPages - 1) pages.add(clamped + 1);
  if (clamped <= 2) {
    pages.add(1);
    pages.add(2);
    pages.add(3);
  }
  if (clamped >= totalPages - 3) {
    pages.add(totalPages - 2);
    pages.add(totalPages - 3);
    pages.add(totalPages - 4);
  }
  const sorted = Array.from(pages)
    .filter((p) => p >= 0 && p < totalPages)
    .sort((a, b) => a - b);

  const output: Array<number | 'ellipsis'> = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) {
      output.push('ellipsis');
    }
    output.push(sorted[i]);
  }
  return output;
}

/**
 * Picks a surprise inspiration style from the provided pool, avoiding the currently open style when possible.
 */
export function pickRandomInspirationStyle(
  styles: StyleItem[],
  excludeId?: string,
  randomFn: () => number = Math.random
): StyleItem | null {
  if (styles.length === 0) return null;
  if (styles.length === 1) return styles[0];
  const candidates = excludeId ? styles.filter((s) => s.id !== excludeId) : styles;
  const pool = candidates.length > 0 ? candidates : styles;
  const idx = Math.floor(Math.max(0, Math.min(0.999999, randomFn())) * pool.length);
  return pool[idx] ?? pool[0];
}

