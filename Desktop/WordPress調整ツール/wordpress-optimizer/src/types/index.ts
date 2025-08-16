// WordPress関連の型定義
export interface WordPressSite {
  id: string;
  url: string;
  authMethod: 'application-passwords' | 'basic';
  username: string;
  password: string;
  customHeaders?: Record<string, string>;
  restApiUrl?: string;
  name?: string;
  isConnected?: boolean;
  lastChecked?: string;
}

export interface WordPressPost {
  id: number;
  title: {
    rendered: string;
  };
  content: {
    rendered: string;
  };
  excerpt: {
    rendered: string;
  };
  categories: number[];
  tags: number[];
  date: string;
  modified: string;
  status: 'publish' | 'draft' | 'private' | 'pending' | 'future';
  meta?: Record<string, any>;
  link: string;
  slug: string;
  yoast_head_json?: {
    title?: string;
    description?: string;
    og_title?: string;
    og_description?: string;
  };
}

export interface WordPressCategory {
  id: number;
  name: string;
  slug: string;
  parent: number;
  count: number;
}

export interface WordPressTag {
  id: number;
  name: string;
  slug: string;
  count: number;
}

// AI提案関連の型定義
export interface AISuggestion {
  titles: string[];
  categories: {
    existing: number[];
    new: string[];
  };
  tags: {
    existing: number[];
    new: string[];
  };
  structure: {
    headings: Array<{
      level: number;
      text: string;
      description: string;
    }>;
  };
  metaDescriptions: string[];
  content?: string;
  fullArticle?: {
    introduction: string;
    mainContent: string;
    conclusion: string;
  };
}

// ローカルストレージデータの型定義
export interface AppConfig {
  geminiApiKey: string; // 暗号化済み
  selectedModel: 'gemini-2.5-pro' | 'gemini-2.5-flash';
  sites: WordPressSite[];
  currentSiteId?: string;
  prompts: {
    system: string;
    templates: PromptTemplate[];
  };
  ui: {
    darkMode: boolean;
    language: 'ja' | 'en';
  };
}

export interface PromptTemplate {
  id: string;
  name: string;
  system: string;
  tone: 'formal' | 'casual' | 'professional';
  targetAudience: string;
  seoFocus: number; // 1-10
  purpose: 'information' | 'problem_solving' | 'entertainment';
}

export interface DraftArticle {
  id: string;
  title: string;
  content: string;
  categories: number[];
  tags: number[];
  metaDescription: string;
  createdAt: string;
  updatedAt: string;
  siteId: string;
  status: 'draft' | 'ready_to_publish';
  
  // AI提案関連の情報
  sourceFile?: string; // 元ファイル名
  originalInput?: string; // 元の入力内容
  usedPrompt?: string; // 使用したプロンプト
  fileMetadata?: string; // ファイル情報（JSON文字列）
  aiSuggestionId?: string; // AI提案のID（履歴追跡用）
  
  // SEO関連の情報
  wordCount?: number; // 文字数
  seoScore?: number; // SEO評価スコア（1-100）
  keywords?: string[]; // 抽出されたキーワード
}

export interface UsageStats {
  apiCalls: {
    daily: Record<string, number>;
    monthly: Record<string, number>;
  };
  tokensUsed: {
    daily: Record<string, number>;
    monthly: Record<string, number>;
  };
  articlesCreated: number;
  lastUsed: string;
  estimatedCost: {
    daily: Record<string, number>;
    monthly: Record<string, number>;
  };
}

// Gemini API関連の型定義
export interface GeminiRequest {
  prompt: string;
  model: string;
  maxTokens?: number;
  temperature?: number;
}

export interface GeminiResponse {
  text: string;
  tokensUsed: number;
  model: string;
  timestamp: string;
}

// エディタ関連の型定義
export interface EditorConfig {
  mode: 'visual' | 'html' | 'markdown';
  wordCount: number;
  autoSave: boolean;
  autoSaveInterval: number;
}

// API使用量管理
export interface APIUsageLimit {
  dailyLimit: number;
  monthlyLimit: number;
  currentDaily: number;
  currentMonthly: number;
  alertThreshold: number;
}

// サイト分析結果
export interface SiteAnalysis {
  siteId: string;
  categories: WordPressCategory[];
  tags: WordPressTag[];
  recentPosts: WordPressPost[];
  analyzedAt: string;
  postCount: number;
  averagePostLength: number;
  commonKeywords: string[];
  metaDescriptions: string[];
  titlePatterns: string[];
  contentStructure: {
    averageHeadingCount: number;
    commonHeadingPatterns: string[];
  };
}

// エラーハンドリング
export interface APIError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
}

// フォーム関連
export interface FormValidation {
  isValid: boolean;
  errors: Record<string, string>;
  warnings: Record<string, string>;
}

// 設定エクスポート/インポート
export interface ExportData {
  config: AppConfig;
  drafts: DraftArticle[];
  stats: UsageStats;
  version: string;
  exportedAt: string;
}

// SEO評価関連
export interface SEOMetrics {
  id: string;
  articleId: string; // 記事ID（DraftArticle.id）
  
  // 基本メトリクス
  titleLength: number;
  metaDescriptionLength: number;
  wordCount: number;
  headingCount: {
    h1: number;
    h2: number;
    h3: number;
    h4: number;
    h5: number;
    h6: number;
  };
  
  // キーワード分析
  keywords: Array<{
    term: string;
    frequency: number;
    density: number; // パーセンテージ
  }>;
  
  // SEOスコア（1-100）
  overallScore: number;
  titleScore: number;
  metaDescriptionScore: number;
  contentStructureScore: number;
  keywordOptimizationScore: number;
  
  // 推奨事項
  recommendations: string[];
  
  calculatedAt: string;
}

// プロンプト履歴管理
export interface PromptHistory {
  id: string;
  
  // プロンプト情報
  originalPrompt: string;
  userInput: string; // 元の入力内容
  fileInfo?: {
    filename: string;
    fileSize: number;
    wordCount: number;
  };
  
  // AI設定
  modelUsed: string; // 'gemini-2.5-pro' | 'gemini-2.5-flash'
  temperature?: number;
  maxTokens?: number;
  
  // 生成結果
  suggestion: AISuggestion;
  generatedAt: string;
  processingTime?: number; // ミリ秒
  
  // 関連記事
  resultingArticles: Array<{
    articleId: string;
    title: string;
    status: 'draft' | 'ready_to_publish' | 'published';
    createdAt: string;
  }>;
  
  // 評価・統計
  seoMetrics?: SEOMetrics;
  userRating?: number; // 1-5の評価
  userNotes?: string;
  
  // 使用統計
  tokensUsed: number;
  estimatedCost: number;
  
  siteId: string;
  userId?: string;
}

// プロンプト履歴の検索・フィルタリング用
export interface PromptHistoryFilter {
  dateRange?: {
    from: string;
    to: string;
  };
  siteId?: string;
  modelUsed?: string;
  minSeoScore?: number;
  maxSeoScore?: number;
  hasArticles?: boolean;
  userRating?: number;
}

// プロンプト履歴の統計
export interface PromptHistoryStats {
  totalPrompts: number;
  successfulPrompts: number;
  averageSeoScore: number;
  averageWordCount: number;
  totalArticlesCreated: number;
  totalTokensUsed: number;
  totalCost: number;
  
  // モデル別統計
  modelStats: Record<string, {
    usage: number;
    averageProcessingTime: number;
    averageCost: number;
    averageSeoScore: number;
  }>;
  
  // 月別統計
  monthlyStats: Record<string, {
    promptCount: number;
    articlesCreated: number;
    tokensUsed: number;
    cost: number;
  }>;
}