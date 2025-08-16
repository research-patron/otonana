import type { 
  PromptHistory, 
  PromptHistoryFilter, 
  PromptHistoryStats,
  AISuggestion,
  SEOMetrics,
  DraftArticle
} from '../types';
import { analyzeSEO } from './seoMetrics';

/**
 * プロンプト履歴管理サービス
 * ローカルストレージを使用してプロンプト履歴の管理、検索、統計を提供
 */

const STORAGE_KEY = 'promptHistory';

/**
 * ローカルストレージからプロンプト履歴を取得
 */
export const getPromptHistory = (): PromptHistory[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    
    const history = JSON.parse(stored);
    return Array.isArray(history) ? history : [];
  } catch (error) {
    console.error('Failed to load prompt history:', error);
    return [];
  }
};

/**
 * ローカルストレージにプロンプト履歴を保存
 */
export const savePromptHistory = (history: PromptHistory[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch (error) {
    console.error('Failed to save prompt history:', error);
  }
};

// 重複防止のためのキャッシュ
let lastPromptHistoryId: string | null = null;
let lastPromptTimestamp: number = 0;

/**
 * 新しいプロンプト履歴を追加
 */
export const addPromptHistory = (data: {
  originalPrompt: string;
  userInput: string;
  fileInfo?: {
    filename: string;
    fileSize: number;
    wordCount: number;
  };
  modelUsed: string;
  temperature?: number;
  maxTokens?: number;
  suggestion: AISuggestion;
  processingTime?: number;
  tokensUsed: number;
  estimatedCost: number;
  siteId: string;
  userId?: string;
}): PromptHistory => {
  const now = Date.now();
  
  // 重複チェック: 同じプロンプトが5秒以内に追加される場合は重複とみなす
  const isDuplicate = 
    lastPromptTimestamp > 0 && 
    (now - lastPromptTimestamp) < 5000;
  
  if (isDuplicate && lastPromptHistoryId) {
    console.log('Duplicate prompt history detected, returning existing:', lastPromptHistoryId);
    const history = getPromptHistory();
    const existing = history.find(item => item.id === lastPromptHistoryId);
    if (existing) {
      return existing;
    }
  }
  
  const history = getPromptHistory();
  
  // より厳密な重複チェック
  const recentDuplicate = history.find(item => 
    item.originalPrompt === data.originalPrompt &&
    item.siteId === data.siteId &&
    item.modelUsed === data.modelUsed &&
    (now - new Date(item.generatedAt).getTime()) < 30000 // 30秒以内
  );
  
  if (recentDuplicate) {
    console.log('Recent duplicate found, returning existing:', recentDuplicate.id);
    lastPromptHistoryId = recentDuplicate.id;
    lastPromptTimestamp = now;
    return recentDuplicate;
  }
  
  const newHistory: PromptHistory = {
    id: `prompt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    originalPrompt: data.originalPrompt,
    userInput: data.userInput,
    fileInfo: data.fileInfo,
    modelUsed: data.modelUsed,
    temperature: data.temperature,
    maxTokens: data.maxTokens,
    suggestion: data.suggestion,
    generatedAt: new Date().toISOString(),
    processingTime: data.processingTime,
    resultingArticles: [],
    tokensUsed: data.tokensUsed,
    estimatedCost: data.estimatedCost,
    siteId: data.siteId,
    userId: data.userId,
  };

  history.unshift(newHistory); // 最新が最初に来るように
  savePromptHistory(history);
  
  // キャッシュを更新
  lastPromptHistoryId = newHistory.id;
  lastPromptTimestamp = now;
  
  console.log('New prompt history added:', newHistory.id);
  return newHistory;
};

/**
 * プロンプト履歴を更新
 */
export const updatePromptHistory = (id: string, updates: Partial<PromptHistory>): boolean => {
  const history = getPromptHistory();
  const index = history.findIndex(item => item.id === id);
  
  if (index === -1) return false;
  
  history[index] = { ...history[index], ...updates };
  savePromptHistory(history);
  
  return true;
};

/**
 * プロンプト履歴を削除
 */
export const deletePromptHistory = (id: string): boolean => {
  const history = getPromptHistory();
  const filtered = history.filter(item => item.id !== id);
  
  if (filtered.length === history.length) return false;
  
  savePromptHistory(filtered);
  return true;
};

/**
 * プロンプト履歴に関連記事を追加
 */
export const addResultingArticle = (
  promptId: string, 
  article: {
    articleId: string;
    title: string;
    status: 'draft' | 'ready_to_publish' | 'published';
    createdAt: string;
  }
): boolean => {
  const history = getPromptHistory();
  const index = history.findIndex(item => item.id === promptId);
  
  if (index === -1) return false;
  
  // 重複チェック
  const exists = history[index].resultingArticles.some(
    existing => existing.articleId === article.articleId
  );
  
  if (!exists) {
    history[index].resultingArticles.push(article);
    savePromptHistory(history);
  }
  
  return true;
};

/**
 * プロンプト履歴にSEO評価を追加
 */
export const addSEOMetricsToHistory = (
  promptId: string, 
  seoMetrics: SEOMetrics
): boolean => {
  return updatePromptHistory(promptId, { seoMetrics });
};

/**
 * プロンプト履歴にユーザー評価を追加
 */
export const addUserRating = (
  promptId: string, 
  rating: number, 
  notes?: string
): boolean => {
  return updatePromptHistory(promptId, { 
    userRating: rating,
    userNotes: notes 
  });
};

/**
 * プロンプト履歴の検索・フィルタリング
 */
export const filterPromptHistory = (
  filter: PromptHistoryFilter = {}
): PromptHistory[] => {
  let history = getPromptHistory();
  
  // 日付範囲フィルター
  if (filter.dateRange) {
    const fromDate = new Date(filter.dateRange.from);
    const toDate = new Date(filter.dateRange.to);
    
    history = history.filter(item => {
      const itemDate = new Date(item.generatedAt);
      return itemDate >= fromDate && itemDate <= toDate;
    });
  }
  
  // サイトIDフィルター
  if (filter.siteId) {
    history = history.filter(item => item.siteId === filter.siteId);
  }
  
  // モデルフィルター
  if (filter.modelUsed) {
    history = history.filter(item => item.modelUsed === filter.modelUsed);
  }
  
  // SEOスコア範囲フィルター
  if (filter.minSeoScore !== undefined || filter.maxSeoScore !== undefined) {
    history = history.filter(item => {
      if (!item.seoMetrics) return false;
      
      const score = item.seoMetrics.overallScore;
      let valid = true;
      
      if (filter.minSeoScore !== undefined) {
        valid = valid && score >= filter.minSeoScore;
      }
      
      if (filter.maxSeoScore !== undefined) {
        valid = valid && score <= filter.maxSeoScore;
      }
      
      return valid;
    });
  }
  
  // 記事生成の有無フィルター
  if (filter.hasArticles !== undefined) {
    history = history.filter(item => {
      const hasArticles = item.resultingArticles.length > 0;
      return filter.hasArticles ? hasArticles : !hasArticles;
    });
  }
  
  // ユーザー評価フィルター
  if (filter.userRating !== undefined) {
    history = history.filter(item => item.userRating === filter.userRating);
  }
  
  return history;
};

/**
 * プロンプト履歴の統計を計算
 */
export const calculatePromptHistoryStats = (
  siteId?: string
): PromptHistoryStats => {
  let history = getPromptHistory();
  
  // サイト別フィルタリング
  if (siteId) {
    history = history.filter(item => item.siteId === siteId);
  }
  
  const totalPrompts = history.length;
  const successfulPrompts = history.filter(item => 
    item.resultingArticles.length > 0
  ).length;
  
  // SEOスコア平均計算
  const historyWithSEO = history.filter(item => item.seoMetrics);
  const averageSeoScore = historyWithSEO.length > 0
    ? historyWithSEO.reduce((sum, item) => sum + (item.seoMetrics!.overallScore), 0) / historyWithSEO.length
    : 0;
  
  // 平均文字数計算
  const averageWordCount = history.length > 0
    ? history.reduce((sum, item) => {
        const content = item.suggestion.fullArticle;
        if (!content) return sum;
        const fullText = `${content.introduction} ${content.mainContent} ${content.conclusion}`;
        return sum + fullText.length;
      }, 0) / history.length
    : 0;
  
  // 総記事数計算
  const totalArticlesCreated = history.reduce((sum, item) => 
    sum + item.resultingArticles.length, 0
  );
  
  // 総トークン数・コスト計算
  const totalTokensUsed = history.reduce((sum, item) => sum + item.tokensUsed, 0);
  const totalCost = history.reduce((sum, item) => sum + item.estimatedCost, 0);
  
  // モデル別統計
  const modelStats: Record<string, any> = {};
  history.forEach(item => {
    if (!modelStats[item.modelUsed]) {
      modelStats[item.modelUsed] = {
        usage: 0,
        totalProcessingTime: 0,
        totalCost: 0,
        totalSeoScore: 0,
        seoCount: 0,
      };
    }
    
    modelStats[item.modelUsed].usage++;
    if (item.processingTime) {
      modelStats[item.modelUsed].totalProcessingTime += item.processingTime;
    }
    modelStats[item.modelUsed].totalCost += item.estimatedCost;
    
    if (item.seoMetrics) {
      modelStats[item.modelUsed].totalSeoScore += item.seoMetrics.overallScore;
      modelStats[item.modelUsed].seoCount++;
    }
  });
  
  // モデル別統計の平均計算
  Object.keys(modelStats).forEach(model => {
    const stats = modelStats[model];
    stats.averageProcessingTime = stats.usage > 0 ? stats.totalProcessingTime / stats.usage : 0;
    stats.averageCost = stats.usage > 0 ? stats.totalCost / stats.usage : 0;
    stats.averageSeoScore = stats.seoCount > 0 ? stats.totalSeoScore / stats.seoCount : 0;
    
    // 不要なプロパティを削除
    delete stats.totalProcessingTime;
    delete stats.totalCost;
    delete stats.totalSeoScore;
    delete stats.seoCount;
  });
  
  // 月別統計
  const monthlyStats: Record<string, any> = {};
  history.forEach(item => {
    const date = new Date(item.generatedAt);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    if (!monthlyStats[monthKey]) {
      monthlyStats[monthKey] = {
        promptCount: 0,
        articlesCreated: 0,
        tokensUsed: 0,
        cost: 0,
      };
    }
    
    monthlyStats[monthKey].promptCount++;
    monthlyStats[monthKey].articlesCreated += item.resultingArticles.length;
    monthlyStats[monthKey].tokensUsed += item.tokensUsed;
    monthlyStats[monthKey].cost += item.estimatedCost;
  });
  
  return {
    totalPrompts,
    successfulPrompts,
    averageSeoScore: Math.round(averageSeoScore),
    averageWordCount: Math.round(averageWordCount),
    totalArticlesCreated,
    totalTokensUsed,
    totalCost,
    modelStats,
    monthlyStats,
  };
};

/**
 * DraftArticleからPromptHistory情報を取得して関連付け
 */
export const linkArticleToPromptHistory = (
  draft: DraftArticle,
  promptId?: string
): void => {
  let targetPromptId = promptId;
  
  // プロンプトIDが指定されていない場合は、aiSuggestionIdから検索
  if (!targetPromptId && draft.aiSuggestionId) {
    const history = getPromptHistory();
    const foundHistory = history.find(item => 
      item.id === draft.aiSuggestionId || 
      item.suggestion === draft.aiSuggestionId // 旧形式対応
    );
    
    if (foundHistory) {
      targetPromptId = foundHistory.id;
    }
  }
  
  if (targetPromptId) {
    addResultingArticle(targetPromptId, {
      articleId: draft.id,
      title: draft.title,
      status: draft.status,
      createdAt: draft.createdAt,
    });
    
    // SEO評価が存在する場合は追加
    if (draft.seoScore && draft.keywords) {
      // DraftArticleの情報からSEOMetricsを構築（簡易版）
      const seoMetrics: SEOMetrics = {
        id: `seo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        articleId: draft.id,
        titleLength: draft.title.length,
        metaDescriptionLength: draft.metaDescription.length,
        wordCount: draft.wordCount || 0,
        headingCount: { h1: 0, h2: 0, h3: 0, h4: 0, h5: 0, h6: 0 }, // 簡易設定
        keywords: draft.keywords.map(term => ({ term, frequency: 1, density: 0.1 })),
        overallScore: draft.seoScore,
        titleScore: 0,
        metaDescriptionScore: 0,
        contentStructureScore: 0,
        keywordOptimizationScore: 0,
        recommendations: [],
        calculatedAt: new Date().toISOString(),
      };
      
      addSEOMetricsToHistory(targetPromptId, seoMetrics);
    }
  }
};

/**
 * 特定の期間のプロンプト履歴を取得
 */
export const getPromptHistoryByDateRange = (
  startDate: string,
  endDate: string,
  siteId?: string
): PromptHistory[] => {
  return filterPromptHistory({
    dateRange: { from: startDate, to: endDate },
    siteId,
  });
};

/**
 * 上位評価されたプロンプト履歴を取得
 */
export const getTopRatedPromptHistory = (
  limit: number = 10,
  siteId?: string
): PromptHistory[] => {
  let history = getPromptHistory();
  
  if (siteId) {
    history = history.filter(item => item.siteId === siteId);
  }
  
  return history
    .filter(item => item.userRating !== undefined)
    .sort((a, b) => (b.userRating || 0) - (a.userRating || 0))
    .slice(0, limit);
};

/**
 * 最も成功したプロンプト履歴を取得（記事作成数基準）
 */
export const getMostSuccessfulPromptHistory = (
  limit: number = 10,
  siteId?: string
): PromptHistory[] => {
  let history = getPromptHistory();
  
  if (siteId) {
    history = history.filter(item => item.siteId === siteId);
  }
  
  return history
    .sort((a, b) => b.resultingArticles.length - a.resultingArticles.length)
    .slice(0, limit);
};

export default {
  getPromptHistory,
  savePromptHistory,
  addPromptHistory,
  updatePromptHistory,
  deletePromptHistory,
  addResultingArticle,
  addSEOMetricsToHistory,
  addUserRating,
  filterPromptHistory,
  calculatePromptHistoryStats,
  linkArticleToPromptHistory,
  getPromptHistoryByDateRange,
  getTopRatedPromptHistory,
  getMostSuccessfulPromptHistory,
};