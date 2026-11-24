export type PurposeKind =
  | 'social-card'
  | 'infographic'
  | 'comic'
  | 'ip-character'
  | 'ecommerce'
  | 'pure-image';

export type WorkbenchMode = 'image' | 'prompt';

export type PromptFormat = 'cn_natural' | 'en_mj' | 'safe_style';

export type StyleSourceRepo = 'handraw-style' | 'gemskills' | 'custom';

export type ConcreteStyleCategory =
  | 'fa-editorial'
  | 'fb-storybook'
  | 'fc-graphic'
  | 'fd-japanese'
  | 'fe-guofeng'
  | 'ff-tactile3d'
  | 'fg-anime'
  | 'fh-experimental'
  | 'fi-photography'
  | 'gs-traditional'
  | 'gs-digital'
  | 'gs-cultural'
  | 'gs-illustration'
  | 'gs-photography'
  | 'gs-design'
  | 'gs-retro'
  | 'gs-technique'
  | 'gs-decorative'
  | 'gs-creative';

export type StyleCategory = 'all' | 'featured' | ConcreteStyleCategory;

export type ColorGroup = 'blue' | 'green' | 'red-pink' | 'yellow-orange' | 'purple' | 'neutral';

export type LayoutSchematicKind =
  | 'top-text'
  | 'bottom-text'
  | 'split-vertical'
  | 'bubble-ip'
  | 'quote-card'
  | 'three-tier'
  | 'split-list'
  | 'center-icons'
  | 'center-grid'
  | 'list-card'
  | 'pyramid'
  | 'annotated-center'
  | 'alternating-rows'
  | 'two-col-compare'
  | 'four-panel'
  | 'two-panel-vs'
  | 'three-panel'
  | 'six-panel'
  | 'character-sheet'
  | 'turnaround'
  | 'sticker-grid'
  | 'hero-product'
  | 'feature-compare'
  | 'detail-zoom';

export interface PurposeOption {
  id: PurposeKind;
  label: string;
  shortDesc: string;
  recommendedRatio: string;
  usesLayout: boolean;
  sceneRuleCn: string;
  sceneRuleEn: string;
  styleGuidanceCn: string;
}

export interface LayoutItem {
  id: string;
  title: string;
  kinds: PurposeKind[];
  description: string;
  promptStructureCn: string;
  promptStructureEn: string;
  fixedRatio?: string;
  schematic: LayoutSchematicKind;
  image?: string;
}

export interface StyleItem {
  id: string;
  title: string;
  englishName: string;
  category: ConcreteStyleCategory;
  sourceRepo: StyleSourceRepo;
  enabled: boolean;
  featured?: boolean;
  referenceArtist?: string;
  description: string;
  visualTraitsCn: string;
  visualTraitsEn: string;
  skillSystemPrompt: string;
  negativePrompt: string;
  sceneOverrides?: Partial<Record<PurposeKind, string>>;
  defaultRatio?: string;
  defaultColorId?: string;
  recommendedKinds: PurposeKind[];
  image: string;
  palettePreview: string[];
  updatedAt?: string;
}

export interface ColorPaletteItem {
  id: string;
  name: string;
  englishName: string;
  hex: string;
  secondaryHex: string;
  paperHex: string;
  group: ColorGroup;
  mood: string;
}

export interface CreationDraft {
  kind: PurposeKind;
  topic: string;
  layoutId: string;
  styleId: string;
  primaryColorId: string;
  accentColorIds: string[];
  ratio: string;
}

export interface PromptHistoryRecord {
  id: string;
  type: 'prompt' | 'image';
  createdAt: string;
  format: PromptFormat;
  usedAi: boolean;
  promptText: string;
  imageUrl?: string;
  modelLabel?: string;
  draft: CreationDraft;
}

export interface InspirationPreset {
  id: string;
  title: string;
  subtitle: string;
  purposeLabel: string;
  draft: CreationDraft;
}

export interface UserTemplate {
  id: string;
  name: string;
  pinned?: boolean;
  createdAt: string;
  updatedAt: string;
  format: PromptFormat;
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

export type AuthMethod = 'email' | 'username';

export interface CreditLogEntry {
  id: string;
  title: string;
  detail: string;
  delta: string;
  createdAt: string;
}

export interface UserSession {
  accountKey: string;
  authType: AuthMethod;
  displayName: string;
  email?: string;
  username?: string;
  creditsGift: number;
  creditsRedeem: number;
  creditsPaid: number;
  creditsReserved: number;
  creditsRefundFrozen: number;
  joinedAt: string;
  waitlistSubscribed: boolean;
  redeemedCodes: string[];
  creditLogs: CreditLogEntry[];
}

export interface AdminUser {
  username: string;
  role: 'admin';
}

export interface AdminStatus {
  initialized: boolean;
  envConfigured: boolean;
  adminUsername?: string;
}

export type ImageProviderType = 'qwen' | 'jimeng' | 'gemini' | 'openai-compatible';

export interface ImageModelPublicConfig {
  id: string;
  label: string;
  provider: ImageProviderType;
  modelName: string;
  isDefault: boolean;
  supportedRatios: string[];
}

export interface ImageModelAdminConfig extends ImageModelPublicConfig {
  baseUrl: string;
  enabled: boolean;
  hasApiKey: boolean;
  apiKeyMasked: string;
  keySource: 'stored' | 'env' | 'none';
  updatedAt?: string;
}

export interface ImageModelUpsertInput {
  id?: string;
  label: string;
  provider: ImageProviderType;
  modelName: string;
  baseUrl?: string;
  apiKey?: string;
  enabled: boolean;
  isDefault?: boolean;
  supportedRatios?: string[];
}

export interface ServerUserQuota {
  accountKey: string;
  creditsGift: number;
  creditsRedeem: number;
  creditsPaid: number;
  totalCredits: number;
  usedCount: number;
  redeemedCodes: string[];
  creditLogs: CreditLogEntry[];
}


