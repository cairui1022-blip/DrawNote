import test from 'node:test';
import assert from 'node:assert/strict';
import { COLOR_PALETTES, LAYOUTS, PURPOSES, STYLES, UNIFIED_STYLE_TAGS } from '../data/catalog';
import {
  applyQuickRefinementToPrompt,
  applyUserTemplateToDraft,
  buildStructuredPrompt,
  cleanPromptText,
  filterStyles,
  formatStyleSkillMarkdown,
  getLayoutsForKind,
  getPaginationWindow,
  isValidRasterImageUrl,
  maskEmail,
  parseImportedSkillPayload,
  pickRandomInspirationStyle,
  pickRecommendedStyleForKind,
  rankStylesForGallery,
  resolveInitialWorkbenchMode,
  summarizeDraftConditions,
  validateAccountUsername,
} from './promptEngine';
import type { CreationDraft, StyleItem, UserTemplate } from '../types';

const sampleDraft: CreationDraft = {
  kind: 'social-card',
  topic: '秋天独居女孩的周末治愈清单：早起手冲桂花拿铁、买一束向日葵',
  layoutId: 'SC-001',
  styleId: 'FA-001',
  primaryColorId: 'C-10',
  accentColorIds: ['C-27'],
  ratio: '3:4',
};

test('cleanPromptText strips leaked internal instructions and fixes double punctuation', () => {
  const dirty =
    '核心风格特征：精细水彩、柔和纸张感。。\n如原模板含示例比例，以此明确指定比例为准，保留构图机制。\n【根据主题设计画面隐喻；原文是用户意图，保留姓名、数据与事实。】';
  const cleaned = cleanPromptText(dirty);
  assert.equal(cleaned.includes('。。'), false);
  assert.equal(cleaned.includes('如原模板含示例比例'), false);
  assert.equal(cleaned.includes('根据主题设计画面隐喻'), false);
  assert.equal(cleaned, '核心风格特征：精细水彩、柔和纸张感。');
});

test('resolveInitialWorkbenchMode defaults to prompt when no image models exist', () => {
  assert.equal(resolveInitialWorkbenchMode([], null, false), 'prompt');
  assert.equal(resolveInitialWorkbenchMode(['imagen-fast'], null, false), 'image');
  assert.equal(resolveInitialWorkbenchMode([], 'image', true), 'image');
});

test('maskEmail masks local part while preserving domain', () => {
  assert.equal(maskEmail('hd71018@euploading.com'), 'hd***@euploading.com');
  assert.equal(maskEmail('ab@example.com'), 'a***@example.com');
});

test('buildStructuredPrompt injects live Skill overrides, scene rules, and per-scene overrides across formats', () => {
  const draftWithPeriod: CreationDraft = {
    ...sampleDraft,
    topic: `${sampleDraft.topic}。`,
  };
  const customStyles: StyleItem[] = STYLES.map((s) =>
    s.id === 'FA-001'
      ? {
          ...s,
          skillSystemPrompt: '【测试自定义Skill】强化晨雾水色扩散并保留手工毛边',
          negativePrompt: '禁止荧光紫',
          sceneOverrides: {
            'social-card': '社媒封面顶部预留32%暖白留白区供标题排版',
          },
        }
      : s
  );

  const cn = buildStructuredPrompt(draftWithPeriod, 'cn_natural', customStyles);
  assert.ok(cn.includes('3:4'));
  assert.ok(cn.includes('鼠尾草绿'));
  assert.ok(cn.includes('强化晨雾水色扩散并保留手工毛边'));
  assert.ok(cn.includes('社媒封面顶部预留32%暖白留白区供标题排版'));
  assert.ok(cn.includes('社媒图文卡片规则'));
  assert.ok(cn.includes('禁止荧光紫'));
  assert.equal(cn.includes('。。'), false);

  const mj = buildStructuredPrompt(draftWithPeriod, 'en_mj', customStyles);
  assert.ok(mj.includes('--ar 3:4'));
  assert.ok(mj.includes('Sage Green'));
  assert.equal(mj.includes('。.'), false);

  const safe = buildStructuredPrompt(draftWithPeriod, 'safe_style', customStyles);
  assert.equal(safe.includes('Beatrix Potter'), false);
  assert.ok(safe.includes('不含任何艺术家真名'));
  assert.ok(safe.includes('强化晨雾水色扩散并保留手工毛边'));
  assert.ok(safe.includes('社媒封面顶部预留32%暖白留白区供标题排版'));
});

test('full catalog imports ALL 542 raster styles (372 handraw-style + 170 gemskills), 170 raster layouts, and 36 colors', () => {
  assert.equal(STYLES.length, 542);
  assert.equal(
    STYLES.filter((s) => s.sourceRepo === 'handraw-style').length,
    372
  );
  assert.equal(
    STYLES.filter((s) => s.sourceRepo === 'gemskills').length,
    170
  );
  assert.equal(LAYOUTS.length, 170);
  assert.equal(COLOR_PALETTES.length, 36);
  assert.equal(COLOR_PALETTES[0].id, 'C-01');
  assert.equal(COLOR_PALETTES[0].name, '克莱因蓝');
  assert.equal(COLOR_PALETTES[9].id, 'C-10');
  assert.equal(COLOR_PALETTES[9].name, '鼠尾草绿');
  assert.equal(COLOR_PALETTES[35].id, 'C-36');
  assert.equal(COLOR_PALETTES[35].name, '米驼色');

  for (const style of STYLES) {
    assert.ok(
      isValidRasterImageUrl(style.image),
      `Expected raster bitmap image for ${style.id}, got ${style.image}`
    );
    assert.ok(style.skillSystemPrompt.length > 10, `Expected skillSystemPrompt for ${style.id}`);
    assert.ok(style.recommendedKinds.length > 0, `Expected at least 1 scene for ${style.id}`);
  }

  for (const layout of LAYOUTS) {
    assert.ok(
      typeof layout.image === 'string' && isValidRasterImageUrl(layout.image),
      `Expected raster bitmap image for layout ${layout.id}, got ${layout.image}`
    );
  }
});

test('getLayoutsForKind returns exact canonical counts for all 6 application scenes', () => {
  assert.deepEqual(getLayoutsForKind('pure-image'), []);
  assert.equal(getLayoutsForKind('social-card').length, 24);
  assert.equal(getLayoutsForKind('infographic').length, 38);
  assert.equal(getLayoutsForKind('comic').length, 71);
  assert.equal(getLayoutsForKind('ip-character').length, 13);
  assert.equal(getLayoutsForKind('ecommerce').length, 24);
});

test('pickRecommendedStyleForKind preserves compatible style and auto-switches incompatible style per scene', () => {
  // FI-001 (写实摄影) fits ecommerce, not comic
  assert.equal(pickRecommendedStyleForKind('ecommerce', STYLES, 'FI-001').id, 'FI-001');
  const switchedForComic = pickRecommendedStyleForKind('comic', STYLES, 'FI-001');
  assert.notEqual(switchedForComic.id, 'FI-001');
  assert.ok(switchedForComic.recommendedKinds.includes('comic'));

  // Every purpose resolves to a valid enabled style matching that purpose
  for (const purpose of PURPOSES) {
    const picked = pickRecommendedStyleForKind(purpose.id, STYLES);
    assert.ok(picked.recommendedKinds.includes(purpose.id));
  }
});

test('filterStyles supports sceneKind, sourceRepo, category, keyword query, and featured ordering', () => {
  const gemskillsStyles = filterStyles(STYLES, {
    category: 'all',
    sourceRepo: 'gemskills',
    query: '',
  });
  assert.equal(gemskillsStyles.length, 170);
  assert.ok(gemskillsStyles.every((s) => s.sourceRepo === 'gemskills'));

  const handrawStyles = filterStyles(STYLES, {
    category: 'all',
    sourceRepo: 'handraw-style',
    query: '',
  });
  assert.equal(handrawStyles.length, 372);

  const comicSceneStyles = filterStyles(STYLES, {
    category: 'all',
    sceneKind: 'comic',
    query: '',
  });
  assert.ok(comicSceneStyles.length >= 150 && comicSceneStyles.length < 542);
  assert.ok(comicSceneStyles.every((s) => s.recommendedKinds.includes('comic')));
  // Featured styles should surface first
  assert.equal(comicSceneStyles[0].featured, true);

  const searchResult = filterStyles(STYLES, { category: 'all', query: 'Woodblock' });
  assert.ok(searchResult.some((s) => s.id === 'GS-woodblock-print'));
});

test('formatStyleSkillMarkdown and parseImportedSkillPayload round-trip cleanly and reject SVG images', () => {
  const target = STYLES.find((s) => s.id === 'GS-woodblock-print')!;
  const md = formatStyleSkillMarkdown(target);
  assert.ok(md.includes('id: GS-woodblock-print'));
  assert.ok(md.includes('## Skill System Instructions'));

  const parsed = parseImportedSkillPayload(md);
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].id, 'GS-woodblock-print');
  assert.equal(parsed[0].title, target.title);
  assert.equal(parsed[0].skillSystemPrompt, target.skillSystemPrompt);

  assert.equal(isValidRasterImageUrl('/src/assets/images/foo.jpg'), true);
  assert.equal(isValidRasterImageUrl('/assets/aistudio/sample_1200x896.jpg'), true);
  assert.equal(isValidRasterImageUrl('https://raw.githubusercontent.com/yang0/handraw-style/main/images/individual/FA/FA-001.webp'), true);
  assert.equal(isValidRasterImageUrl('/src/assets/images/foo.svg'), false);
  assert.equal(isValidRasterImageUrl('/assets/aistudio/foo.svg'), false);
  assert.equal(isValidRasterImageUrl('javascript:alert(1)'), false);
});

test('validateAccountUsername accepts valid Chinese/English usernames and rejects invalid input', () => {
  assert.deepEqual(validateAccountUsername('  林间画师_01  '), {
    ok: true,
    normalized: '林间画师_01',
  });
  assert.equal(validateAccountUsername('handraw-pro').ok, true);
  assert.equal(validateAccountUsername('a').ok, false);
  assert.equal(validateAccountUsername('has space').ok, false);
  assert.equal(validateAccountUsername('user@example.com').ok, false);
});

test('buildStructuredPrompt honors optional empty layoutId, styleId, and primaryColorId across all 3 formats', () => {
  const freeformDraft: CreationDraft = {
    kind: 'social-card',
    topic: '夏夜阳台吹风听蝉鸣的松弛瞬间',
    layoutId: '',
    styleId: '',
    primaryColorId: '',
    accentColorIds: [],
    ratio: '3:4',
  };

  const cn = buildStructuredPrompt(freeformDraft, 'cn_natural', STYLES);
  assert.ok(cn.includes('不限定固定版式'));
  assert.ok(cn.includes('不指定固定流派'));
  assert.ok(cn.includes('跟随画风与主题意境自然配色'));
  assert.equal(cn.includes('FA-001'), false);
  assert.equal(cn.includes('鼠尾草绿'), false);

  const mj = buildStructuredPrompt(freeformDraft, 'en_mj', STYLES);
  assert.ok(mj.includes('flexible editorial composition'));
  assert.ok(mj.includes('naturally tailored to the scene mood'));
  assert.ok(mj.includes('organically following the subject mood'));
  assert.equal(mj.includes('FA-001'), false);
  assert.equal(mj.includes('Sage Green'), false);

  const safe = buildStructuredPrompt(freeformDraft, 'safe_style', STYLES);
  assert.ok(safe.includes('自由构图'));
  assert.ok(safe.includes('不限定单一固定画风'));
  assert.ok(safe.includes('跟随画风与画面意境自然配色'));
  assert.equal(safe.includes('FA-001'), false);
});

test('summarizeDraftConditions and applyUserTemplateToDraft reflect optional defaults and preserve active topic', () => {
  const autoDraft: CreationDraft = {
    kind: 'social-card',
    topic: '',
    layoutId: '',
    styleId: '',
    primaryColorId: '',
    accentColorIds: [],
    ratio: '3:4',
  };
  const autoSummary = summarizeDraftConditions(autoDraft, STYLES, LAYOUTS);
  assert.ok(autoSummary.includes('版式自由'));
  assert.ok(autoSummary.includes('画风自由'));
  assert.ok(autoSummary.includes('配色随画风'));

  const tpl: UserTemplate = {
    id: 'tpl_test_1',
    name: '小红书治愈卡片',
    pinned: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    format: 'cn_natural',
    draft: {
      kind: 'social-card',
      layoutId: 'SC-001',
      styleId: 'FA-001',
      primaryColorId: '',
      accentColorIds: ['C-27'],
      ratio: '3:4',
      topicPrefix: '周末清晨的手冲咖啡',
    },
  };

  // Empty topic adopts template topicPrefix
  const appliedEmpty = applyUserTemplateToDraft(autoDraft, tpl);
  assert.equal(appliedEmpty.topic, '周末清晨的手冲咖啡');
  assert.equal(appliedEmpty.layoutId, 'SC-001');
  assert.equal(appliedEmpty.primaryColorId, '');

  // Existing non-empty topic is preserved
  const appliedWithTopic = applyUserTemplateToDraft(
    { ...autoDraft, topic: '我刚写好的新主题文案' },
    tpl
  );
  assert.equal(appliedWithTopic.topic, '我刚写好的新主题文案');
  assert.equal(appliedWithTopic.styleId, 'FA-001');
});

test('rankStylesForGallery surfaces distinct Page-1 styles for social-card vs infographic and across all tags under all-scenes', () => {
  const socialTop12 = filterStyles(STYLES, {
    category: 'all',
    sceneKind: 'social-card',
    query: '',
  })
    .slice(0, 12)
    .map((s) => s.id);

  const infoTop12 = filterStyles(STYLES, {
    category: 'all',
    sceneKind: 'infographic',
    query: '',
  })
    .slice(0, 12)
    .map((s) => s.id);

  // Zero overlap between Page 1 of 社媒卡片 and Page 1 of 信息图
  const overlapSocialInfo = socialTop12.filter((id) => infoTop12.includes(id));
  assert.deepEqual(overlapSocialInfo, []);
  assert.equal(infoTop12[0], 'GS-exploded-blueprint');
  assert.equal(socialTop12[0], 'FB-001');

  // Under 全部场景, every unified tag tab produces a distinct Page-1 showcase (including 全部风格 vs 编辑精选)
  const seenSignatures = new Set<string>();
  const allTop12 = rankStylesForGallery(STYLES, { sceneKind: 'all', tagId: 'all' })
    .slice(0, 12)
    .map((s) => s.id);
  const featuredTop12 = rankStylesForGallery(
    STYLES.filter((s) => s.featured),
    { sceneKind: 'all', tagId: 'featured', isFeaturedFilter: true }
  )
    .slice(0, 12)
    .map((s) => s.id);
  assert.deepEqual(
    allTop12.filter((id) => featuredTop12.includes(id)),
    []
  );

  for (const tag of UNIFIED_STYLE_TAGS) {
    const filtered = STYLES.filter((s) => {
      if (tag.featuredOnly && !s.featured) return false;
      if (tag.categories && !tag.categories.includes(s.category)) return false;
      return true;
    });
    const ranked = rankStylesForGallery(filtered, {
      sceneKind: 'all',
      tagId: tag.id,
      isFeaturedFilter: Boolean(tag.featuredOnly),
    });
    const sig = ranked
      .slice(0, 12)
      .map((s) => s.id)
      .join(',');
    assert.ok(ranked.length > 0, `Expected non-empty styles for tag ${tag.id}`);
    assert.equal(
      seenSignatures.has(sig),
      false,
      `Expected unique Page-1 gallery for tag ${tag.id}`
    );
    seenSignatures.add(sig);
  }
});

test('getPaginationWindow returns compact jumpable page tokens with ellipsis', () => {
  assert.deepEqual(getPaginationWindow(0, 1), [0]);
  assert.deepEqual(getPaginationWindow(2, 5), [0, 1, 2, 3, 4]);
  assert.deepEqual(getPaginationWindow(0, 46), [0, 1, 2, 3, 'ellipsis', 45]);
  assert.deepEqual(getPaginationWindow(20, 46), [0, 'ellipsis', 19, 20, 21, 'ellipsis', 45]);
  assert.deepEqual(getPaginationWindow(45, 46), [0, 'ellipsis', 42, 43, 44, 45]);
});

test('applyQuickRefinementToPrompt inserts modifier cleanly for CN and MJ formats without duplicating', () => {
  const cnBase = '一幅治愈系秋季手冲咖啡插画。';
  const cnOnce = applyQuickRefinementToPrompt(cnBase, 'more-whitespace', 'cn_natural');
  assert.ok(cnOnce.includes('微调要求（更克制留白）'));
  const cnTwice = applyQuickRefinementToPrompt(cnOnce, 'more-whitespace', 'cn_natural');
  assert.equal(cnTwice, cnOnce);

  const mjBase = 'Warm autumn pour-over coffee illustration --ar 3:4 --stylize 250';
  const mjRefined = applyQuickRefinementToPrompt(mjBase, 'richer-lighting', 'en_mj');
  assert.ok(mjRefined.includes('luminous natural rim lighting'));
  assert.ok(mjRefined.endsWith('--ar 3:4 --stylize 250'));
});

test('pickRandomInspirationStyle selects from pool and avoids excluded id when alternatives exist', () => {
  const smallPool = STYLES.slice(0, 3);
  const picked = pickRandomInspirationStyle(smallPool, smallPool[0].id, () => 0);
  assert.ok(picked);
  assert.notEqual(picked.id, smallPool[0].id);
  assert.equal(pickRandomInspirationStyle([], undefined), null);
});

test('Updated FB storybook styles reference local /assets/aistudio raster artwork and 3-color palettes', () => {
  const updatedFbIds = [
    ...Array.from({ length: 18 }, (_, i) => `FB-${String(i + 1).padStart(3, '0')}`),
    'FB-019',
    'FB-020',
    'FB-021',
    'FB-022',
    'FB-023',
    'FB-024',
    'FB-025',
    'FB-026',
    'FB-027',
    'FB-028',
    'FB-029',
    'FB-030',
    'FB-031',
    'FB-032',
    'FB-035',
    'FB-039',
    'FB-041',
  ];
  for (const id of updatedFbIds) {
    const style = STYLES.find((s) => s.id === id);
    assert.ok(style, `Missing style ${id}`);
    assert.ok(
      style.image.startsWith(`/assets/aistudio/${id}`),
      `Expected ${id} image to use /assets/aistudio/${id}*, got ${style.image}`
    );
    assert.ok(Array.isArray(style.palettePreview) && style.palettePreview.length === 3);
  }
});




