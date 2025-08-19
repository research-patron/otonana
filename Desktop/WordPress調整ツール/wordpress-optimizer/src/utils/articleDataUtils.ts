import type { ArticleCSVData, WordPressPost, WordPressCategory, WordPressTag } from '../types';

// 日付ユーティリティ
export const formatDate = (dateString: string, format: 'short' | 'long' | 'relative' = 'short'): string => {
  const date = new Date(dateString);
  
  if (isNaN(date.getTime())) {
    return '無効な日付';
  }

  switch (format) {
    case 'short':
      return date.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
    
    case 'long':
      return date.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'short',
      });
    
    case 'relative':
      const now = new Date();
      const diffTime = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) return '今日';
      if (diffDays === 1) return '昨日';
      if (diffDays < 7) return `${diffDays}日前`;
      if (diffDays < 30) return `${Math.floor(diffDays / 7)}週間前`;
      if (diffDays < 365) return `${Math.floor(diffDays / 30)}ヶ月前`;
      return `${Math.floor(diffDays / 365)}年前`;
    
    default:
      return date.toLocaleDateString('ja-JP');
  }
};

// 文字数をフォーマット
export const formatWordCount = (count: number): string => {
  if (count < 1000) return `${count}文字`;
  if (count < 10000) return `${(count / 1000).toFixed(1)}k文字`;
  return `${Math.floor(count / 1000)}k文字`;
};

// 記事ステータスを日本語化
export const getStatusLabel = (status: string): string => {
  const statusMap: Record<string, string> = {
    publish: '公開済み',
    draft: '下書き',
    private: '非公開',
    pending: '承認待ち',
    future: '予約投稿',
  };
  return statusMap[status] || status;
};

// 記事ステータスの色を取得
export const getStatusColor = (status: string): 'success' | 'warning' | 'error' | 'info' | 'default' => {
  const colorMap: Record<string, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
    publish: 'success',
    draft: 'warning',
    private: 'error',
    pending: 'info',
    future: 'info',
  };
  return colorMap[status] || 'default';
};

// テキスト解析ユーティリティ
export const analyzeText = (text: string): {
  wordCount: number;
  characterCount: number;
  paragraphCount: number;
  readingTime: number; // 分
  keywords: string[];
} => {
  const plainText = text.replace(/<[^>]*>/g, '').trim();
  
  // 文字数と単語数
  const characterCount = plainText.length;
  const wordCount = plainText.split(/\s+/).filter(word => word.length > 0).length;
  
  // 段落数
  const paragraphCount = plainText.split(/\n\s*\n/).filter(p => p.trim().length > 0).length;
  
  // 読了時間（日本語：400文字/分で計算）
  const readingTime = Math.ceil(characterCount / 400);
  
  // キーワード抽出（簡易版）
  const words = plainText
    .toLowerCase()
    .split(/[\s\-_・、。！？\(\)\[\]「」『』]+/)
    .filter(word => word.length >= 2 && word.length <= 10);
  
  const wordFreq: Record<string, number> = {};
  words.forEach(word => {
    wordFreq[word] = (wordFreq[word] || 0) + 1;
  });
  
  const keywords = Object.entries(wordFreq)
    .filter(([word, freq]) => freq >= 2)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([word]) => word);

  return {
    wordCount,
    characterCount,
    paragraphCount,
    readingTime,
    keywords,
  };
};

// SEOスコア計算
export const calculateSEOScore = (article: ArticleCSVData): number => {
  let score = 0;
  let maxScore = 100;

  // タイトル長さ (20点)
  const titleLength = article.title.length;
  if (titleLength >= 20 && titleLength <= 35) {
    score += 20;
  } else if (titleLength >= 15 && titleLength <= 45) {
    score += 15;
  } else if (titleLength >= 10 && titleLength <= 50) {
    score += 10;
  }

  // メタディスクリプション (20点)
  const metaLength = article.metaDescription.length;
  if (metaLength >= 120 && metaLength <= 160) {
    score += 20;
  } else if (metaLength >= 100 && metaLength <= 180) {
    score += 15;
  } else if (metaLength >= 80 && metaLength <= 200) {
    score += 10;
  }

  // 文字数 (20点)
  if (article.wordCount >= 2000) {
    score += 20;
  } else if (article.wordCount >= 1500) {
    score += 15;
  } else if (article.wordCount >= 1000) {
    score += 10;
  } else if (article.wordCount >= 500) {
    score += 5;
  }

  // カテゴリー設定 (15点)
  if (article.categories.length >= 1 && article.categories.length <= 3) {
    score += 15;
  } else if (article.categories.length > 0) {
    score += 10;
  }

  // タグ設定 (15点)
  if (article.tags.length >= 3 && article.tags.length <= 8) {
    score += 15;
  } else if (article.tags.length >= 1) {
    score += 10;
  }

  // 更新頻度 (10点)
  const daysSinceModified = Math.floor(
    (new Date().getTime() - new Date(article.modifiedDate).getTime()) / (1000 * 60 * 60 * 24)
  );
  if (daysSinceModified <= 30) {
    score += 10;
  } else if (daysSinceModified <= 90) {
    score += 7;
  } else if (daysSinceModified <= 180) {
    score += 5;
  }

  return Math.round((score / maxScore) * 100);
};

// 記事データの検証
export const validateArticleData = (article: Partial<ArticleCSVData>): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 必須フィールドチェック
  if (!article.id) errors.push('記事IDが必要です');
  if (!article.title || article.title.trim().length === 0) errors.push('タイトルが必要です');
  if (!article.url) errors.push('URLが必要です');

  // 警告チェック
  if (article.title && article.title.length > 60) {
    warnings.push('タイトルが長すぎます（60文字以下推奨）');
  }
  if (article.title && article.title.length < 10) {
    warnings.push('タイトルが短すぎます（10文字以上推奨）');
  }
  if (article.metaDescription && article.metaDescription.length > 160) {
    warnings.push('メタディスクリプションが長すぎます（160文字以下推奨）');
  }
  if (article.metaDescription && article.metaDescription.length < 100) {
    warnings.push('メタディスクリプションが短すぎます（100文字以上推奨）');
  }
  if (article.wordCount && article.wordCount < 1000) {
    warnings.push('記事が短すぎます（1000文字以上推奨）');
  }
  if (article.categories && article.categories.length === 0) {
    warnings.push('カテゴリーが設定されていません');
  }
  if (article.categories && article.categories.length > 3) {
    warnings.push('カテゴリーが多すぎます（3個以下推奨）');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};

// 記事統計を計算
export const calculateArticleStats = (articles: ArticleCSVData[]): {
  totalArticles: number;
  totalWords: number;
  averageWords: number;
  statusDistribution: Record<string, number>;
  categoryDistribution: Record<string, number>;
  averageSEOScore: number;
  recentActivity: { date: string; count: number }[];
} => {
  if (articles.length === 0) {
    return {
      totalArticles: 0,
      totalWords: 0,
      averageWords: 0,
      statusDistribution: {},
      categoryDistribution: {},
      averageSEOScore: 0,
      recentActivity: [],
    };
  }

  const totalWords = articles.reduce((sum, article) => sum + article.wordCount, 0);
  const averageWords = Math.round(totalWords / articles.length);

  // ステータス分布
  const statusDistribution: Record<string, number> = {};
  articles.forEach(article => {
    statusDistribution[article.status] = (statusDistribution[article.status] || 0) + 1;
  });

  // カテゴリー分布
  const categoryDistribution: Record<string, number> = {};
  articles.forEach(article => {
    article.categories.forEach(category => {
      categoryDistribution[category.name] = (categoryDistribution[category.name] || 0) + 1;
    });
  });

  // 平均SEOスコア
  const seoScores = articles.map(article => calculateSEOScore(article));
  const averageSEOScore = Math.round(seoScores.reduce((sum, score) => sum + score, 0) / seoScores.length);

  // 最近の活動（過去30日間、日別）
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentActivity: { date: string; count: number }[] = [];
  for (let i = 0; i < 30; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    const count = articles.filter(article => {
      const articleDate = new Date(article.publishedDate).toISOString().split('T')[0];
      return articleDate === dateStr;
    }).length;

    recentActivity.push({ date: dateStr, count });
  }

  return {
    totalArticles: articles.length,
    totalWords,
    averageWords,
    statusDistribution,
    categoryDistribution,
    averageSEOScore,
    recentActivity: recentActivity.reverse(),
  };
};

// 記事の類似性を計算
export const calculateSimilarity = (article1: ArticleCSVData, article2: ArticleCSVData): number => {
  // カテゴリーの一致度
  const categories1 = new Set(article1.categories.map(cat => cat.name));
  const categories2 = new Set(article2.categories.map(cat => cat.name));
  const categoryIntersection = new Set([...categories1].filter(x => categories2.has(x)));
  const categoryUnion = new Set([...categories1, ...categories2]);
  const categoryScore = categoryUnion.size > 0 ? categoryIntersection.size / categoryUnion.size : 0;

  // タグの一致度
  const tags1 = new Set(article1.tags.map(tag => tag.name));
  const tags2 = new Set(article2.tags.map(tag => tag.name));
  const tagIntersection = new Set([...tags1].filter(x => tags2.has(x)));
  const tagUnion = new Set([...tags1, ...tags2]);
  const tagScore = tagUnion.size > 0 ? tagIntersection.size / tagUnion.size : 0;

  // タイトルの類似度（簡易版）
  const title1Words = article1.title.toLowerCase().split(/\s+/);
  const title2Words = article2.title.toLowerCase().split(/\s+/);
  const titleIntersection = title1Words.filter(word => title2Words.includes(word));
  const titleScore = (title1Words.length + title2Words.length) > 0 
    ? (titleIntersection.length * 2) / (title1Words.length + title2Words.length) 
    : 0;

  // 重み付き平均
  return (categoryScore * 0.4 + tagScore * 0.4 + titleScore * 0.2);
};

// 記事をフィルタリング
export const filterArticles = (
  articles: ArticleCSVData[],
  filters: {
    status?: string[];
    categories?: string[];
    tags?: string[];
    dateRange?: { from: string; to: string };
    wordCountRange?: { min: number; max: number };
    searchTerm?: string;
  }
): ArticleCSVData[] => {
  return articles.filter(article => {
    // ステータスフィルター
    if (filters.status && filters.status.length > 0) {
      if (!filters.status.includes(article.status)) return false;
    }

    // カテゴリーフィルター
    if (filters.categories && filters.categories.length > 0) {
      const articleCategories = article.categories.map(cat => cat.name);
      if (!filters.categories.some(cat => articleCategories.includes(cat))) return false;
    }

    // タグフィルター
    if (filters.tags && filters.tags.length > 0) {
      const articleTags = article.tags.map(tag => tag.name);
      if (!filters.tags.some(tag => articleTags.includes(tag))) return false;
    }

    // 日付範囲フィルター
    if (filters.dateRange) {
      const articleDate = new Date(article.publishedDate);
      const fromDate = new Date(filters.dateRange.from);
      const toDate = new Date(filters.dateRange.to);
      if (articleDate < fromDate || articleDate > toDate) return false;
    }

    // 文字数範囲フィルター
    if (filters.wordCountRange) {
      if (article.wordCount < filters.wordCountRange.min || 
          article.wordCount > filters.wordCountRange.max) return false;
    }

    // 検索語フィルター
    if (filters.searchTerm && filters.searchTerm.trim().length > 0) {
      const searchTerm = filters.searchTerm.toLowerCase();
      const searchableText = [
        article.title,
        article.metaDescription,
        ...article.categories.map(cat => cat.name),
        ...article.tags.map(tag => tag.name),
      ].join(' ').toLowerCase();
      
      if (!searchableText.includes(searchTerm)) return false;
    }

    return true;
  });
};

// 記事をソート
export const sortArticles = (
  articles: ArticleCSVData[],
  sortBy: 'date' | 'title' | 'wordCount' | 'seoScore',
  order: 'asc' | 'desc' = 'desc'
): ArticleCSVData[] => {
  return [...articles].sort((a, b) => {
    let compareValue = 0;

    switch (sortBy) {
      case 'date':
        compareValue = new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime();
        break;
      case 'title':
        compareValue = a.title.localeCompare(b.title, 'ja');
        break;
      case 'wordCount':
        compareValue = b.wordCount - a.wordCount;
        break;
      case 'seoScore':
        compareValue = calculateSEOScore(b) - calculateSEOScore(a);
        break;
    }

    return order === 'desc' ? compareValue : -compareValue;
  });
};