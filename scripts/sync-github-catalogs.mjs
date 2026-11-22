import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const HANDRAW_RAW = 'https://raw.githubusercontent.com/yang0/handraw-style/main';
const GEMSKILLS_RAW = 'https://raw.githubusercontent.com/b-open-io/gemskills/master';

// Map handraw-style FA-FI families to canonical categories, scenes, defaults & palette previews
const HANDRAW_FAMILY_META = {
  FA: {
    category: 'fa-editorial',
    labelCn: '国际社论幽默',
    recommendedKinds: ['comic', 'social-card', 'infographic'],
    defaultRatio: '3:4',
    defaultColorId: 'C-32',
    palettePreview: ['#28312E', '#DC6F42', '#F5F1E6'],
    negativePrompt: '3D塑料渲染、写实照片摄影、杂乱高饱和背景、廉价商业矢量小人',
  },
  FB: {
    category: 'fb-storybook',
    labelCn: '经典绘本叙事',
    recommendedKinds: ['pure-image', 'social-card', 'ip-character'],
    defaultRatio: '4:3',
    defaultColorId: 'C-10',
    palettePreview: ['#849E87', '#ECC978', '#F5F1E6'],
    negativePrompt: '冰冷工业金属、塑料光泽、高对比刺眼霓虹、杂乱水印文字',
  },
  FC: {
    category: 'fc-graphic',
    labelCn: '现代平面艺术',
    recommendedKinds: ['infographic', 'social-card', 'ecommerce'],
    defaultRatio: '3:4',
    defaultColorId: 'C-01',
    palettePreview: ['#002FA7', '#D9682B', '#F5F1E6'],
    negativePrompt: '模糊脏色涂抹、写实人像皮肤、过度繁琐装饰、低分辨率噪点',
  },
  FD: {
    category: 'fd-japanese',
    labelCn: '日本当代插画',
    recommendedKinds: ['social-card', 'ecommerce', 'pure-image'],
    defaultRatio: '3:4',
    defaultColorId: 'C-08',
    palettePreview: ['#4A93B2', '#E28C7D', '#FAF7F0'],
    negativePrompt: '油腻写实3D、暗黑重阴影、繁杂背景堆砌、生硬荧光配色',
  },
  FE: {
    category: 'fe-guofeng',
    labelCn: '新国风与传统工艺',
    recommendedKinds: ['pure-image', 'social-card', 'ecommerce'],
    defaultRatio: '3:4',
    defaultColorId: 'C-15',
    palettePreview: ['#235A40', '#C94736', '#EFE9DC'],
    negativePrompt: '廉价网游荧光特效、西式塑料3D、过度饱和RGB、杂乱现代水印',
  },
  FF: {
    category: 'ff-tactile3d',
    labelCn: '3D黏土毛毡与纸雕',
    recommendedKinds: ['ip-character', 'ecommerce', 'social-card'],
    defaultRatio: '1:1',
    defaultColorId: 'C-21',
    palettePreview: ['#E28C7D', '#849E87', '#F5F1E6'],
    negativePrompt: '尖锐机械冷光、反光廉价塑料、纯平面无体积感、杂乱暗背景',
  },
  FG: {
    category: 'fg-anime',
    labelCn: '动漫与赛璐璐',
    recommendedKinds: ['comic', 'ip-character', 'pure-image'],
    defaultRatio: '4:3',
    defaultColorId: 'C-08',
    palettePreview: ['#4A93B2', '#ECC978', '#28312E'],
    negativePrompt: '写实照片皮肤、廉价3D建模、僵硬对称姿势、崩坏比例',
  },
  FH: {
    category: 'fh-experimental',
    labelCn: '先锋实验与综合媒介',
    recommendedKinds: ['pure-image', 'social-card', 'infographic'],
    defaultRatio: '3:4',
    defaultColorId: 'C-20',
    palettePreview: ['#B8336A', '#1D3E53', '#EFE9DC'],
    negativePrompt: '平庸商务模板、单调光滑渐变、毫无肌理感的纯平矢量',
  },
  FI: {
    category: 'fi-photography',
    labelCn: '写实摄影与视觉大片',
    recommendedKinds: ['ecommerce', 'pure-image', 'social-card'],
    defaultRatio: '3:4',
    defaultColorId: 'C-31',
    palettePreview: ['#576773', '#C48147', '#EFE9DC'],
    negativePrompt: '卡通简笔画轮廓、廉价过度磨皮、畸变镜头、塑料假光影',
  },
};

// Map gemskills 10 categories to canonical categories, Chinese labels, scenes & defaults
const GEMSKILLS_CAT_META = {
  traditional: {
    category: 'gs-traditional',
    labelCn: '经典艺术流派',
    recommendedKinds: ['pure-image', 'social-card', 'ecommerce'],
    defaultRatio: '4:3',
    defaultColorId: 'C-29',
    palettePreview: ['#C48147', '#1D3E53', '#EFE9DC'],
  },
  digital: {
    category: 'gs-digital',
    labelCn: '数字视觉与未来',
    recommendedKinds: ['pure-image', 'social-card', 'ip-character'],
    defaultRatio: '16:9',
    defaultColorId: 'C-01',
    palettePreview: ['#002FA7', '#B8336A', '#1D3E53'],
  },
  cultural: {
    category: 'gs-cultural',
    labelCn: '影视动漫文化',
    recommendedKinds: ['comic', 'ip-character', 'pure-image'],
    defaultRatio: '3:4',
    defaultColorId: 'C-15',
    palettePreview: ['#C94736', '#ECC978', '#28312E'],
  },
  illustration: {
    category: 'gs-illustration',
    labelCn: '国际插画绘本',
    recommendedKinds: ['social-card', 'comic', 'ip-character', 'pure-image'],
    defaultRatio: '3:4',
    defaultColorId: 'C-10',
    palettePreview: ['#849E87', '#DC6F42', '#F5F1E6'],
  },
  photography: {
    category: 'gs-photography',
    labelCn: '胶片与风格摄影',
    recommendedKinds: ['ecommerce', 'pure-image', 'social-card'],
    defaultRatio: '3:4',
    defaultColorId: 'C-31',
    palettePreview: ['#576773', '#C9A23F', '#EFE9DC'],
  },
  design: {
    category: 'gs-design',
    labelCn: '平面与信息设计',
    recommendedKinds: ['infographic', 'social-card', 'ecommerce'],
    defaultRatio: '3:4',
    defaultColorId: 'C-14',
    palettePreview: ['#235A40', '#D9682B', '#F5F1E6'],
  },
  retro: {
    category: 'gs-retro',
    labelCn: '年代复古美学',
    recommendedKinds: ['social-card', 'ecommerce', 'pure-image'],
    defaultRatio: '3:4',
    defaultColorId: 'C-28',
    palettePreview: ['#C9A23F', '#0E6E87', '#EFE9DC'],
  },
  technique: {
    category: 'gs-technique',
    labelCn: '手绘媒介技法',
    recommendedKinds: ['social-card', 'pure-image', 'infographic'],
    defaultRatio: '3:4',
    defaultColorId: 'C-12',
    palettePreview: ['#7A8247', '#C48147', '#F5F1E6'],
  },
  decorative: {
    category: 'gs-decorative',
    labelCn: '装饰纹样与民俗',
    recommendedKinds: ['ecommerce', 'social-card', 'pure-image'],
    defaultRatio: '1:1',
    defaultColorId: 'C-06',
    palettePreview: ['#0E6E87', '#C94F6D', '#EFE9DC'],
  },
  creative: {
    category: 'gs-creative',
    labelCn: '创意材质与工艺',
    recommendedKinds: ['ip-character', 'ecommerce', 'infographic', 'pure-image'],
    defaultRatio: '1:1',
    defaultColorId: 'C-26',
    palettePreview: ['#DC6F42', '#4B8B6B', '#F5F1E6'],
  },
};

// Curated featured style IDs spanning all 6 application scenes and both repos
const FEATURED_IDS = new Set([
  'FA-001', 'FA-003', 'FA-012', 'FA-013',
  'FB-001', 'FB-005', 'FB-020',
  'FC-003', 'FC-011',
  'FD-001', 'FD-003', 'FD-010',
  'FE-001', 'FE-003', 'FE-012',
  'FF-001', 'FF-003',
  'FG-001', 'FG-005',
  'FH-001',
  'FI-001', 'FI-005',
  'GS-studio-ghibli', 'GS-moebius-ligne-claire', 'GS-botanical-illustration',
  'GS-risograph', 'GS-claymation', 'GS-art-nouveau', 'GS-woodblock-print',
  'GS-swiss-style', 'GS-exploded-blueprint', 'GS-cinematic-golden-hour',
]);

// Refine scene fit per individual style traits/keywords so scene matching is genuinely intelligent
function refineScenesForStyle(baseKinds, text) {
  const s = text.toLowerCase();
  const kinds = new Set(baseKinds);
  if (/infographic|blueprint|diagram|swiss|bauhaus|flat|risograph|botanical|technical|conceptual|信息图|科普|图解|概念|清单|建筑|平面/.test(s)) {
    kinds.add('infographic');
  }
  if (/comic|manga|cartoon|doodle|ligne claire|strip|humor|anime|漫画|吐槽|冷幽默|分镜|动画|赛璐璐/.test(s)) {
    kinds.add('comic');
  }
  if (/clay|felt|wool|chibi|kawaii|sticker|toy|vinyl|knitted|origami|character|ip|黏土|毛毡|玩偶|盲盒|贴纸|萌|Q版|角色/.test(s)) {
    kinds.add('ip-character');
  }
  if (/photo|product|editorial|luxury|minimal|botanical|packaging|fashion|gouache|摄影|产品|大片|穿搭|时尚|好物|包装|静物|美食/.test(s)) {
    kinds.add('ecommerce');
  }
  return Array.from(kinds);
}

function buildChineseTitleFromHandraw(id, englishName, artist, traits) {
  // Prefer a clean Chinese display title: if artist has Chinese characters before '/', or derive concise Chinese phrase from traits
  if (artist && /[\u4e00-\u9fa5]/.test(artist)) {
    const cnPart = artist.split('/')[0].trim();
    if (cnPart.length >= 2 && cnPart.length <= 16) {
      return cnPart;
    }
  }
  if (traits) {
    const firstChunk = traits.split(/[；。]/)[0].trim();
    const parts = firstChunk.split(/[、，,]/).map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 2) {
      const candidate = `${parts[0]}·${parts[1]}`;
      if (candidate.length <= 16) return candidate;
    }
    if (parts[0] && parts[0].length >= 2 && parts[0].length <= 14) {
      return parts[0];
    }
  }
  return englishName;
}

const GEM_CN_MAP = {
  'impressionism': '印象派光影油画',
  'post-impressionism': '后印象派笔触',
  'expressionism': '表现主义情感画',
  'surrealism': '超现实梦境艺术',
  'art-nouveau': '新艺术植物装饰',
  'art-deco': '装饰艺术几何风',
  'pop-art': '波普艺术网点风',
  'abstract-expressionism': '抽象表现主义',
  'fauvism': '野兽派浓烈色彩',
  'baroque-dramatic': '巴洛克戏剧光影',
  'romanticism': '浪漫主义史诗风景',
  'minimalism': '极简主义美学',
  'renaissance': '文艺复兴古典油画',
  'rococo': '洛可可优雅粉彩',
  'pointillism': '点彩派光学油画',
  'cyberpunk': '赛博朋克霓虹都市',
  'synthwave': '合成波复古未来',
  'vaporwave': '蒸汽波粉紫怀旧',
  'solarpunk': '太阳朋克生态未来',
  'glitch-art': '故障艺术数字错位',
  'low-poly': '低多边形几何3D',
  'pixel-art': '复古像素微世界',
  'isometric': '等距轴测微缩建筑',
  'neon-noir': '霓虹黑色电影',
  'studio-ghibli': '吉卜力田园物语',
  'moebius-ligne-claire': '欧漫清线幻想',
  'comic-book': '美式复古漫画',
  'children-book': '经典儿童绘本',
  'concept-art': '影视场景概念艺术',
  'botanical-illustration': '博物手绘植物图鉴',
  'editorial-illustration': '国际报刊社论插画',
  'fantasy-art': '奇幻史诗插画',
  'kawaii': '日系软萌卡哇伊',
  'anime-manga': '经典日系动漫画风',
  'ink-illustration': '精细钢笔墨线插画',
  'risograph': '孔版丝网印刷海报',
  'swiss-style': '瑞士国际网格平面',
  'bauhaus': '包豪斯现代几何',
  'flat-design': '现代扁平信息设计',
  'exploded-blueprint': '工程爆炸解剖蓝图',
  'brutalism': '粗野主义先锋排版',
  'neo-brutalism': '新粗野主义明快撞色',
  'memphis-design': '孟菲斯复古几何',
  'mid-century-modern': '中世纪现代复古风',
  'retro-futurism': '复古未来主义海报',
  'vintage-pulp': '复古廉价小说封面',
  'watercolor-loose': '松散透明水彩',
  'watercolor-botanical': '水彩植物标本',
  'ink-wash-sumi': '东方水墨写意',
  'pencil-sketch': '细腻铅笔素描',
  'charcoal-dramatic': '木炭画戏剧明暗',
  'oil-impasto': '厚涂刀画油画',
  'paper-collage': '手工拼贴艺术',
  'linocut-print': '手工麻胶版画',
  'screen-print': '丝网版画套印',
  'pastel-soft': '柔和色粉画',
  'woodblock-print': '传统木刻版画',
  'ukiyo-e': '江户浮世绘木版',
  'claymation': '定格黏土动画风',
  'origami-paper': '手工折纸立体纸艺',
  'knitted-yarn': '温暖毛线编织风',
  'diorama-miniature': '微缩生态景观模型',
  'da-vinci-sketch': '达芬奇手稿解剖图',
  'stained-glass': '教堂彩绘玻璃艺术',
  'chalkboard': '复古黑板粉笔手绘',
  'cinematic-golden-hour': '电影级黄金时刻摄影',
  'film-noir-bw': '黑白黑色电影摄影',
  'kodachrome': '柯达复古胶片摄影',
  'polaroid': '拍立得即时相纸',
  'tilt-shift': '移轴微缩景观摄影',
  'wes-anderson': '韦斯安德森对称美学',
  'spider-verse': '蜘蛛宇宙半调潮漫',
  'scandinavian-folk': '北欧民间装饰插画',
  'japanese-wave': '日式青海波纹样',
};

function layoutPrefixToKind(prefix) {
  switch (prefix) {
    case 'SC': return ['social-card'];
    case 'IG': return ['infographic'];
    case 'SB': return ['comic'];
    case 'IP': return ['ip-character'];
    case 'EC': return ['ecommerce'];
    default: return ['social-card'];
  }
}

function layoutPrefixToSchematic(prefix, idx) {
  const map = {
    SC: ['top-text', 'bottom-text', 'split-vertical', 'bubble-ip', 'quote-card', 'three-tier', 'split-list', 'center-icons'],
    IG: ['center-grid', 'list-card', 'pyramid', 'annotated-center', 'alternating-rows', 'two-col-compare'],
    SB: ['four-panel', 'two-panel-vs', 'three-panel', 'six-panel'],
    IP: ['character-sheet', 'turnaround', 'sticker-grid'],
    EC: ['hero-product', 'feature-compare', 'detail-zoom'],
  };
  const arr = map[prefix] || ['top-text'];
  return arr[idx % arr.length];
}

async function main() {
  console.log('Fetching full catalogs from GitHub...');
  const [rStyles, rReorg, rLayouts, rGem] = await Promise.all([
    fetch(`${HANDRAW_RAW}/STYLES.md`),
    fetch(`${HANDRAW_RAW}/styles_200_reorganized.md`),
    fetch(`${HANDRAW_RAW}/LAYOUTS.md`),
    fetch(`${GEMSKILLS_RAW}/skills/browsing-styles/assets/styles.json`),
  ]);

  if (!rStyles.ok || !rReorg.ok || !rLayouts.ok || !rGem.ok) {
    throw new Error('Failed to fetch one or more source files from GitHub');
  }

  const [stylesMd, reorgMd, layoutsMd, gemJson] = await Promise.all([
    rStyles.text(),
    rReorg.text(),
    rLayouts.text(),
    rGem.json(),
  ]);

  // 1. Parse supplementary traits from styles_200_reorganized.md so all 372 styles have traits
  const reorgTraitsMap = new Map();
  for (const line of reorgMd.split('\n')) {
    const m = line.match(/^\|\s*(F[A-I]-\d{3})\s*·\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|/);
    if (m) {
      reorgTraitsMap.set(m[1].trim(), {
        artist: m[2].trim(),
        englishName: m[3].trim(),
        traits: m[4].trim(),
      });
    }
  }

  // 2. Parse ALL 372 handraw-style entries from STYLES.md
  const styleCells = stylesMd.split('|').filter((c) => /\*\*F[A-I]-\d{3}\*\*/.test(c));
  const handrawStyles = [];
  const seenStyleIds = new Set();

  for (const cell of styleCells) {
    const imgMatch = cell.match(/<img\s+src='([^']+)'/);
    const idMatch = cell.match(/\*\*(F[A-I]-\d{3})\*\*/);
    if (!idMatch) continue;
    const id = idMatch[1];
    if (seenStyleIds.has(id)) continue;
    seenStyleIds.add(id);

    const family = id.slice(0, 2);
    const fmeta = HANDRAW_FAMILY_META[family] || HANDRAW_FAMILY_META.FA;

    const enMatch = cell.match(/\*\*F[A-I]-\d{3}\*\*[^·]*·\s*([^<\n]+)/);
    const artistMatch = cell.match(/<sub>参考:\s*([^<]+)<\/sub>/);
    const detailsMatch = cell.match(/<details><summary>[^<]*<\/summary><br>([\s\S]*?)<\/details>/);

    const reorg = reorgTraitsMap.get(id);
    const englishName = (enMatch ? enMatch[1].trim() : reorg?.englishName || id);
    const referenceArtist = (artistMatch ? artistMatch[1].trim() : reorg?.artist || '') || undefined;
    const rawTraits = detailsMatch
      ? detailsMatch[1].replace(/<[^>]+>/g, '').trim()
      : reorg?.traits || `${fmeta.labelCn}风格，呈现 ${englishName} 典型视觉笔触与构图氛围。`;

    const title = buildChineseTitleFromHandraw(id, englishName, referenceArtist, rawTraits);
    const imageRel = imgMatch ? imgMatch[1].trim() : `images/individual/${family}/${id}.webp`;
    const imageUrl = `${HANDRAW_RAW}/${imageRel}`;
    const recommendedKinds = refineScenesForStyle(
      fmeta.recommendedKinds,
      `${englishName} ${rawTraits} ${fmeta.labelCn}`
    );

    handrawStyles.push({
      id,
      title,
      englishName,
      category: fmeta.category,
      sourceRepo: 'handraw-style',
      enabled: true,
      featured: FEATURED_IDS.has(id),
      referenceArtist,
      description: `${fmeta.labelCn}（${id}）· ${rawTraits.slice(0, 96)}${rawTraits.length > 96 ? '…' : ''}`,
      visualTraitsCn: rawTraits,
      visualTraitsEn: `${englishName} illustration style, ${fmeta.labelCn} aesthetic with authentic brushwork, balanced composition and tactile surface texture`,
      skillSystemPrompt: `严格遵循 ${id}（${englishName}）视觉语言：${rawTraits} 保持画面呼吸感与统一媒介材质，切忌退化为千篇一律的普通数码光滑画风。`,
      negativePrompt: fmeta.negativePrompt,
      defaultRatio: fmeta.defaultRatio,
      defaultColorId: fmeta.defaultColorId,
      recommendedKinds,
      image: imageUrl,
      palettePreview: fmeta.palettePreview,
    });
  }

  // 3. Parse ALL 170 gemskills styles
  const gemRawList = Array.isArray(gemJson) ? gemJson : (gemJson.styles || []);
  const gemskillsStyles = [];

  for (const item of gemRawList) {
    const slug = String(item.id || '').trim();
    if (!slug) continue;
    const id = `GS-${slug}`;
    const gmeta = GEMSKILLS_CAT_META[item.category] || GEMSKILLS_CAT_META.illustration;
    const englishName = String(item.name || slug).trim();
    const title = GEM_CN_MAP[slug] || `${englishName}（${gmeta.labelCn}）`;
    const promptHints = String(item.promptHints || '').trim();
    const tilePrompt = String(item.tilePrompt || '').trim();
    const recommendedKinds = refineScenesForStyle(
      gmeta.recommendedKinds,
      `${slug} ${englishName} ${promptHints}`
    );

    gemskillsStyles.push({
      id,
      title,
      englishName,
      category: gmeta.category,
      sourceRepo: 'gemskills',
      enabled: true,
      featured: FEATURED_IDS.has(id),
      referenceArtist: item.category === 'cultural' ? englishName : undefined,
      description: `${gmeta.labelCn} · ${promptHints.slice(0, 100)}${promptHints.length > 100 ? '…' : ''}`,
      visualTraitsCn: `${title}，核心质感：${promptHints}`,
      visualTraitsEn: promptHints || englishName,
      skillSystemPrompt: `按照 gemskills 风格规范（${englishName}）执行画面渲染与笔触材质：${promptHints}。参考场景构图逻辑：${tilePrompt.slice(0, 220)}`,
      negativePrompt: '杂乱水印、低质量畸变、偏离目标媒介质感的通用数码平滑渲染',
      defaultRatio: gmeta.defaultRatio,
      defaultColorId: gmeta.defaultColorId,
      recommendedKinds,
      image: `${GEMSKILLS_RAW}/skills/browsing-styles/assets/tiles/${slug}.png`,
      palettePreview: gmeta.palettePreview,
    });
  }

  // 4. Parse ALL 170 layouts from yang0/handraw-style/LAYOUTS.md
  const layoutRegex = /<img\s+src='([^']+)'[^>]*alt='([^']*)'><br>\*\*([A-Z]{2}-\d{3})\*\*\s*·\s*([^<\n]+)<br><details><summary>[^<]*<\/summary><br>([\s\S]*?)<\/details>/g;
  const allLayouts = [];
  const seenLayoutIds = new Set();
  let lm;
  let idx = 0;
  while ((lm = layoutRegex.exec(layoutsMd)) !== null) {
    const imgRel = lm[1].trim();
    const id = lm[3].trim();
    if (seenLayoutIds.has(id)) continue;
    seenLayoutIds.add(id);

    const title = lm[4].trim();
    const rawPrompt = lm[5].replace(/<[^>]+>/g, '').trim();
    const prefix = id.split('-')[0];
    const kinds = layoutPrefixToKind(prefix);
    const cleanDesc = rawPrompt.replace(/^[^。]*。/, '').trim() || rawPrompt;

    allLayouts.push({
      id,
      title,
      kinds,
      description: cleanDesc.slice(0, 90) + (cleanDesc.length > 90 ? '…' : ''),
      promptStructureCn: rawPrompt,
      promptStructureEn: `${id} ${title} structured editorial layout matching ${kinds[0]} visual hierarchy`,
      schematic: layoutPrefixToSchematic(prefix, idx),
      image: `${HANDRAW_RAW}/${imgRel}`,
    });
    idx += 1;
  }

  const combinedStyles = [...handrawStyles, ...gemskillsStyles];

  const outDir = path.join(ROOT, 'src', 'data');
  fs.writeFileSync(
    path.join(outDir, 'fullStyles.json'),
    JSON.stringify(combinedStyles, null, 2),
    'utf-8'
  );
  fs.writeFileSync(
    path.join(outDir, 'fullLayouts.json'),
    JSON.stringify(allLayouts, null, 2),
    'utf-8'
  );

  console.log(`Generated src/data/fullStyles.json: ${combinedStyles.length} styles (${handrawStyles.length} handraw-style + ${gemskillsStyles.length} gemskills)`);
  console.log(`Generated src/data/fullLayouts.json: ${allLayouts.length} layouts`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
