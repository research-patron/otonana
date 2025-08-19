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

// 構造化されたAIレスポンス（新方式）
export interface StructuredAIResponse {
  title: string;
  meta_description: string;
  categories: string[];
  tags: string[];
  text: string; // 純粋な記事本文（markdownまたはHTML）
  
  // オプショナルフィールド（将来の拡張用）
  seo_keywords?: string[];
  reading_time?: number;
  target_audience?: string;
  tone?: string;
}

// レガシーAI提案形式（既存互換性のため保持）
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
  
  // 新機能との統合
  structuredResponse?: StructuredAIResponse;
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

// Ultrathink AI提案機能関連の型定義
export interface ArticleCSVData {
  id: number;
  title: string;
  slug: string;
  url: string;
  status: 'publish' | 'draft' | 'private' | 'pending' | 'future';
  categories: Array<{
    id: number;
    name: string;
    slug: string;
  }>;
  tags: Array<{
    id: number;
    name: string;
    slug: string;
  }>;
  metaDescription: string;
  publishedDate: string;
  modifiedDate: string;
  wordCount: number;
  seoScore?: number;
}

export interface CSVManagerState {
  siteId: string;
  lastUpdated: string;
  totalArticles: number;
  csvData: ArticleCSVData[];
  selectedCategoryIds: number[];
  includeStatuses: Array<'publish' | 'draft' | 'private' | 'pending' | 'future'>;
}

export interface UltrathinkConfig {
  autoUpdateCSV: boolean;
  csvUpdateInterval: number; // 時間（分）
  includeAllStatuses: boolean;
  maxArticlesPerCategory: number;
  defaultPromptTemplate: string;
  csvStorageKey: string;
}

export interface UltrathinkAIRequest {
  userInput: string;
  csvData: ArticleCSVData[];
  selectedCategories: WordPressCategory[];
  fileContent?: {
    text: string;
    filename: string;
    wordCount: number;
  };
  promptTemplate?: PromptTemplate;
  analysisContext?: {
    competitorAnalysis?: string;
    targetKeywords?: string[];
    contentGaps?: string[];
  };
}

export interface UltrathinkAIResponse extends AISuggestion {
  csvAnalysis: {
    totalArticlesAnalyzed: number;
    categoryDistribution: Record<string, number>;
    commonTopics: string[];
    contentGaps: string[];
    recommendedCategories: string[];
    recommendedTags: string[];
  };
  competitiveInsights?: {
    missingTopics: string[];
    improvementOpportunities: string[];
    contentStrategies: string[];
  };
  originalCsvData: ArticleCSVData[];
}

export interface CSVExportOptions {
  format: 'csv' | 'excel' | 'json';
  includeMetadata: boolean;
  includeAnalysis: boolean;
  dateRange?: {
    from: string;
    to: string;
  };
  filterByStatus?: Array<'publish' | 'draft' | 'private' | 'pending' | 'future'>;
}

// 品質チェック関連の型定義
export interface QualityCheckConfig {
  siteId: string;
  filters: {
    categoryIds?: number[];
    excludedPostIds?: number[];
    statusFilter: Array<'publish' | 'draft' | 'private' | 'pending' | 'future'>;
    dateRange?: {
      from: string;
      to: string;
    };
  };
  scoring: {
    scoreThreshold: number; // 最低品質スコア (0-100)
    ageWeight: number; // 古さの重み (0.0-1.0)
    aiTextWeight: number; // AI文章検出の重み (0.0-1.0)
    misinformationWeight: number; // 誤情報リスクの重み (0.0-1.0)
  };
  textlintRules: {
    aiWritingDetection: boolean;
    excessiveBulletPoints: boolean;
    aiPhrasePatterns: boolean;
  };
  geminiAnalysis: {
    checkMisinformation: boolean;
    checkRecency: boolean;
    checkLogicalConsistency: boolean;
    checkSEO: boolean;
    checkReadability: boolean;
  };
}

export interface TextlintResult {
  messages: Array<{
    ruleId: string;
    severity: number;
    message: string;
    line: number;
    column: number;
    type: 'lint' | 'parse';
  }>;
  filePath?: string;
  output?: string;
}

export interface GeminiQualityAnalysis {
  misinformationRisk: {
    score: number; // 0-100
    issues: string[];
    recommendations: string[];
  };
  recencyCheck: {
    score: number; // 0-100
    outdatedInfo: string[];
    updateSuggestions: string[];
  };
  logicalConsistency: {
    score: number; // 0-100
    inconsistencies: string[];
    improvements: string[];
  };
  seoAnalysis: {
    metaDescriptionScore: number;
    headingStructureScore: number;
    brokenLinks: string[];
    recommendations: string[];
  };
  readabilityScore: {
    score: number; // 0-100
    sentenceLengthIssues: number;
    complexTermsCount: number;
    missingAltTexts: number;
    suggestions: string[];
  };
}

export interface QualityCheckResult {
  postId: number;
  title: string;
  url: string;
  status: 'publish' | 'draft' | 'private' | 'pending' | 'future';
  lastModified: string;
  categories: Array<{
    id: number;
    name: string;
  }>;
  
  // スコア情報
  overallScore: number; // 0-100の総合スコア
  ageScore: number; // 古さスコア
  aiTextScore: number; // AI文章検出スコア
  misinformationScore: number; // 誤情報リスクスコア
  
  // 分析結果
  textlintResult: TextlintResult;
  geminiAnalysis: GeminiQualityAnalysis;
  
  // 推奨アクション
  priority: 'high' | 'medium' | 'low';
  rewriteReasons: string[];
  recommendedActions: string[];
  
  // 処理情報
  checkedAt: string;
  processingTime: number; // ミリ秒
  error?: string;
}

export interface QualityCheckProgress {
  total: number;
  current: number;
  currentTitle: string;
  percentage: number;
  status: 'idle' | 'fetching' | 'analyzing' | 'completed' | 'error' | 'cancelled';
  errors: string[];
  timeElapsed?: number;
}

export interface QualityCheckReport {
  siteId: string;
  siteName: string;
  generatedAt: string;
  config: QualityCheckConfig;
  
  // サマリー情報
  summary: {
    totalPosts: number;
    postsChecked: number;
    highPriorityIssues: number;
    mediumPriorityIssues: number;
    lowPriorityIssues: number;
    averageScore: number;
    processingTime: number; // ミリ秒
  };
  
  // 結果データ
  results: QualityCheckResult[];
  
  // 統計情報
  statistics: {
    scoreDistribution: {
      range: string; // "0-20", "21-40", etc.
      count: number;
    }[];
    commonIssues: {
      issue: string;
      frequency: number;
    }[];
    categoryBreakdown: {
      categoryName: string;
      postsCount: number;
      averageScore: number;
    }[];
  };
  
  // エクスポート設定
  exportFormat: 'csv' | 'json';
  fileName: string;
}

// リライト提案機能関連の型定義
export interface RewriteSuggestion {
  id: string;
  postId: number;
  postTitle: string;
  originalIssues: string[]; // 元の品質問題
  
  // 修正提案
  suggestions: {
    id: string;
    type: 'title' | 'content' | 'meta_description' | 'heading' | 'paragraph' | 'sentence';
    originalText: string;
    suggestedText: string;
    reason: string; // 修正理由
    priority: 'high' | 'medium' | 'low';
    
    // 位置情報（content内の場合）
    position?: {
      start: number;
      end: number;
      selector?: string; // CSS selector or XPath
    };
  }[];
  
  // 生成情報
  generatedAt: string;
  generatedBy: 'gemini-2.5-pro' | 'gemini-2.5-flash';
  processingTime: number; // ミリ秒
  tokensUsed: number;
  
  // 承認状態
  approvalState: SuggestionApprovalState;
}

export interface SuggestionApprovalState {
  overallStatus: 'pending' | 'partially_approved' | 'fully_approved' | 'rejected';
  individualApprovals: Record<string, {
    status: 'approved' | 'rejected' | 'modified' | 'pending';
    modifiedText?: string; // ユーザーが手動で変更した場合
    modifiedAt?: string;
  }>;
  finalContent?: string; // 最終的に生成されるコンテンツ
  approvedAt?: string;
  approvedBy?: string; // 将来の拡張用
}

export interface BeforeAfterContent {
  id: string;
  postId: number;
  
  // 元コンテンツ
  original: {
    title: string;
    content: string;
    metaDescription: string;
    excerpt?: string;
  };
  
  // 提案されたコンテンツ
  suggested: {
    title: string;
    content: string;
    metaDescription: string;
    excerpt?: string;
  };
  
  // 最終コンテンツ（承認後）
  final?: {
    title: string;
    content: string;
    metaDescription: string;
    excerpt?: string;
  };
  
  // 変更統計
  changes: {
    totalSuggestions: number;
    approvedSuggestions: number;
    rejectedSuggestions: number;
    modifiedSuggestions: number;
    estimatedImprovementScore: number; // 予想される品質改善スコア
  };
}

export interface ImportedQualityReport extends QualityCheckReport {
  // インポート情報
  importedAt: string;
  importedFrom: string; // ファイル名
  importVersion: string; // バージョン管理用
  
  // 追加のメタデータ
  originalGeneratedAt: string; // 元々の生成日時
  importNotes?: string;
  
  // リライト提案関連
  hasRewriteSuggestions: boolean;
  rewriteSuggestions?: RewriteSuggestion[];
  
  // インポート時の検証結果
  validationResults: {
    isValid: boolean;
    warnings: string[];
    errors: string[];
    missingFields: string[];
  };
}

export interface RewriteBatchOperation {
  id: string;
  reportId: string;
  createdAt: string;
  
  // 対象記事
  targetPosts: {
    postId: number;
    title: string;
    selected: boolean;
    suggestionCount: number;
  }[];
  
  // バッチ操作の設定
  operation: {
    type: 'generate_suggestions' | 'approve_all' | 'apply_approved' | 'export_final';
    filterCriteria?: {
      minPriority?: 'high' | 'medium' | 'low';
      maxSuggestions?: number;
      includeTypes?: Array<'title' | 'content' | 'meta_description' | 'heading' | 'paragraph' | 'sentence'>;
    };
  };
  
  // 進行状況
  progress: {
    total: number;
    completed: number;
    failed: number;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
    errors: string[];
  };
  
  // 結果
  results?: {
    successfulOperations: number;
    failedOperations: number;
    generatedSuggestions?: number;
    appliedSuggestions?: number;
    finalContent?: BeforeAfterContent[];
  };
}

// CSVインポート関連
export interface CSVImportConfig {
  fileEncoding: 'UTF-8' | 'Shift_JIS' | 'auto';
  delimiter: ',' | ';' | '\t' | 'auto';
  hasHeader: boolean;
  skipEmptyLines: boolean;
  
  // 列マッピング設定
  columnMapping: {
    postId: number | string;
    title: number | string;
    url: number | string;
    status: number | string;
    overallScore: number | string;
    rewriteReasons: number | string;
    recommendedActions: number | string;
    // その他の列も必要に応じて追加
  };
}

export interface CSVImportResult {
  isSuccess: boolean;
  importedReport?: ImportedQualityReport;
  errors: string[];
  warnings: string[];
  
  // インポート統計
  stats: {
    totalRows: number;
    successfulRows: number;
    skippedRows: number;
    errorRows: number;
  };
  
  // データ品質情報
  dataQuality: {
    duplicateEntries: number;
    missingRequiredFields: string[];
    invalidDataTypes: string[];
  };
}