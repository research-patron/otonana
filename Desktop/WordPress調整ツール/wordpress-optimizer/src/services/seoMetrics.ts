import type { SEOMetrics, DraftArticle } from '../types';

/**
 * SEO評価計算サービス
 * 記事のタイトル、メタディスクリプション、コンテンツを分析してSEOスコアを算出
 */

interface SEOAnalysisInput {
  title: string;
  content: string;
  metaDescription: string;
  keywords?: string[];
}

/**
 * HTMLからプレーンテキストを抽出
 */
export const extractPlainText = (html: string): string => {
  if (!html) return '';
  
  // HTMLタグを除去
  const plainText = html.replace(/<[^>]*>/g, ' ');
  
  // 余分な空白を正規化
  return plainText.replace(/\s+/g, ' ').trim();
};

/**
 * 見出し数をカウント
 */
export const countHeadings = (html: string): SEOMetrics['headingCount'] => {
  const headingCount = {
    h1: 0,
    h2: 0,
    h3: 0,
    h4: 0,
    h5: 0,
    h6: 0,
  };

  if (!html) return headingCount;

  for (let i = 1; i <= 6; i++) {
    const regex = new RegExp(`<h${i}[^>]*>.*?</h${i}>`, 'gi');
    const matches = html.match(regex);
    headingCount[`h${i}` as keyof typeof headingCount] = matches?.length || 0;
  }

  return headingCount;
};

/**
 * キーワード分析
 */
export const analyzeKeywords = (text: string, targetKeywords?: string[]): SEOMetrics['keywords'] => {
  if (!text) return [];

  const plainText = text.toLowerCase();
  const words = plainText.match(/\b\w{2,}\b/g) || [];
  const totalWords = words.length;

  // 単語の出現回数をカウント
  const wordCounts: Record<string, number> = {};
  words.forEach(word => {
    if (word.length >= 3) { // 3文字以上の単語のみ
      wordCounts[word] = (wordCounts[word] || 0) + 1;
    }
  });

  // キーワード分析結果を作成
  const keywords: SEOMetrics['keywords'] = [];

  // ターゲットキーワードがある場合は優先的に分析
  if (targetKeywords && targetKeywords.length > 0) {
    targetKeywords.forEach(keyword => {
      const normalizedKeyword = keyword.toLowerCase();
      const frequency = wordCounts[normalizedKeyword] || 0;
      const density = totalWords > 0 ? (frequency / totalWords) * 100 : 0;

      keywords.push({
        term: keyword,
        frequency,
        density: Math.round(density * 100) / 100,
      });
    });
  }

  // 上位出現単語も追加（ターゲットキーワード以外）
  const topWords = Object.entries(wordCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .filter(([word]) => !targetKeywords?.some(tk => tk.toLowerCase() === word));

  topWords.forEach(([word, frequency]) => {
    const density = totalWords > 0 ? (frequency / totalWords) * 100 : 0;
    keywords.push({
      term: word,
      frequency,
      density: Math.round(density * 100) / 100,
    });
  });

  return keywords.slice(0, 15); // 最大15個まで
};

/**
 * タイトルのSEOスコアを計算
 */
export const calculateTitleScore = (title: string): number => {
  if (!title) return 0;

  let score = 0;
  const length = title.length;

  // 文字数評価（30-60文字が理想）
  if (length >= 30 && length <= 60) {
    score += 40;
  } else if (length >= 20 && length <= 80) {
    score += 25;
  } else {
    score += 10;
  }

  // 具体性評価（数字や具体的な単語の存在）
  if (/\d+/.test(title)) score += 15; // 数字
  if (/(方法|やり方|手順|コツ|秘訣)/.test(title)) score += 10; // How-to系
  if (/(まとめ|一覧|比較|ランキング)/.test(title)) score += 10; // まとめ系
  if (/(無料|簡単|効果的|最新|おすすめ)/.test(title)) score += 10; // 訴求系

  // 疑問形・感嘆符の評価
  if (/(？|\?)/.test(title)) score += 10; // 疑問形
  if (/(！|!)/.test(title)) score += 5; // 感嘆符

  // 冗長性のペナルティ
  if (length > 100) score -= 20;
  if (title.includes('...') || title.includes('。。。')) score -= 10;

  return Math.min(Math.max(score, 0), 100);
};

/**
 * メタディスクリプションのSEOスコアを計算
 */
export const calculateMetaDescriptionScore = (metaDescription: string): number => {
  if (!metaDescription) return 0;

  let score = 0;
  const length = metaDescription.length;

  // 文字数評価（120-160文字が理想）
  if (length >= 120 && length <= 160) {
    score += 50;
  } else if (length >= 100 && length <= 180) {
    score += 35;
  } else if (length >= 80 && length <= 200) {
    score += 20;
  } else {
    score += 5;
  }

  // 内容の質評価
  if (/(方法|やり方|解説|紹介|ポイント)/.test(metaDescription)) score += 15; // 具体性
  if (/(詳しく|わかりやすく|簡単に|効果的)/.test(metaDescription)) score += 10; // 訴求力
  if (/(無料|おすすめ|最新|人気)/.test(metaDescription)) score += 10; // 魅力度

  // 構造の評価
  if (metaDescription.includes('。') && metaDescription.split('。').length >= 2) score += 10; // 文の区切り

  return Math.min(Math.max(score, 0), 100);
};

/**
 * コンテンツ構造のSEOスコアを計算
 */
export const calculateContentStructureScore = (content: string, headingCount: SEOMetrics['headingCount']): number => {
  if (!content) return 0;

  let score = 0;
  const plainText = extractPlainText(content);
  const wordCount = plainText.split(/\s+/).length;

  // 文字数評価
  if (wordCount >= 1000 && wordCount <= 3000) {
    score += 30;
  } else if (wordCount >= 500 && wordCount <= 5000) {
    score += 20;
  } else if (wordCount >= 300) {
    score += 10;
  }

  // 見出し構造の評価
  const totalHeadings = Object.values(headingCount).reduce((sum, count) => sum + count, 0);
  if (totalHeadings >= 3 && totalHeadings <= 10) {
    score += 25;
  } else if (totalHeadings >= 1 && totalHeadings <= 15) {
    score += 15;
  }

  // H1タグの評価（1つが理想）
  if (headingCount.h1 === 1) {
    score += 15;
  } else if (headingCount.h1 === 0) {
    score += 5; // H1なしでも記事内容次第
  }

  // H2タグの評価（構造化に重要）
  if (headingCount.h2 >= 2 && headingCount.h2 <= 8) {
    score += 15;
  } else if (headingCount.h2 >= 1) {
    score += 10;
  }

  // 段落構造の評価
  const paragraphs = content.split(/<\/p>/).length - 1;
  if (paragraphs >= 3 && paragraphs <= 20) {
    score += 15;
  } else if (paragraphs >= 1) {
    score += 10;
  }

  return Math.min(Math.max(score, 0), 100);
};

/**
 * キーワード最適化のスコアを計算
 */
export const calculateKeywordOptimizationScore = (keywords: SEOMetrics['keywords']): number => {
  if (!keywords || keywords.length === 0) return 0;

  let score = 0;

  // キーワード密度の評価
  const mainKeywords = keywords.slice(0, 5); // 上位5つのキーワード
  mainKeywords.forEach((keyword, index) => {
    const idealDensity = index === 0 ? 2 : 1; // メインキーワードは2%、その他は1%が理想
    
    if (keyword.density >= idealDensity * 0.5 && keyword.density <= idealDensity * 2) {
      score += 15;
    } else if (keyword.density >= idealDensity * 0.2 && keyword.density <= idealDensity * 3) {
      score += 10;
    } else if (keyword.density > 0) {
      score += 5;
    }
  });

  // キーワードの多様性評価
  if (keywords.length >= 8) {
    score += 20;
  } else if (keywords.length >= 5) {
    score += 15;
  } else if (keywords.length >= 3) {
    score += 10;
  }

  return Math.min(Math.max(score, 0), 100);
};

/**
 * 総合SEOスコアを計算
 */
export const calculateOverallScore = (
  titleScore: number,
  metaDescriptionScore: number,
  contentStructureScore: number,
  keywordOptimizationScore: number
): number => {
  // 重み付け平均
  const weights = {
    title: 0.25,
    metaDescription: 0.2,
    contentStructure: 0.35,
    keywordOptimization: 0.2,
  };

  const weightedScore = 
    (titleScore * weights.title) +
    (metaDescriptionScore * weights.metaDescription) +
    (contentStructureScore * weights.contentStructure) +
    (keywordOptimizationScore * weights.keywordOptimization);

  return Math.round(weightedScore);
};

/**
 * SEO改善の推奨事項を生成
 */
export const generateRecommendations = (
  input: SEOAnalysisInput,
  scores: {
    titleScore: number;
    metaDescriptionScore: number;
    contentStructureScore: number;
    keywordOptimizationScore: number;
  }
): string[] => {
  const recommendations: string[] = [];

  // タイトル関連の推奨事項
  if (scores.titleScore < 50) {
    if (input.title.length < 30) {
      recommendations.push('タイトルをもう少し詳しく（30文字以上）してください');
    }
    if (input.title.length > 80) {
      recommendations.push('タイトルを80文字以内に短縮してください');
    }
    if (!/\d+/.test(input.title)) {
      recommendations.push('タイトルに具体的な数字を含めることを検討してください');
    }
  }

  // メタディスクリプション関連
  if (scores.metaDescriptionScore < 50) {
    if (input.metaDescription.length < 120) {
      recommendations.push('メタディスクリプションをより詳しく（120文字以上）してください');
    }
    if (input.metaDescription.length > 180) {
      recommendations.push('メタディスクリプションを180文字以内に短縮してください');
    }
    if (!input.metaDescription) {
      recommendations.push('メタディスクリプションを設定してください');
    }
  }

  // コンテンツ構造関連
  if (scores.contentStructureScore < 50) {
    const plainText = extractPlainText(input.content);
    const wordCount = plainText.split(/\s+/).length;
    
    if (wordCount < 500) {
      recommendations.push('記事の文字数を増やしてください（500文字以上推奨）');
    }
    
    const headingCount = countHeadings(input.content);
    const totalHeadings = Object.values(headingCount).reduce((sum, count) => sum + count, 0);
    
    if (totalHeadings < 3) {
      recommendations.push('見出し（H2、H3タグ）を追加して記事を構造化してください');
    }
    if (headingCount.h1 === 0) {
      recommendations.push('メインタイトル（H1タグ）を設定してください');
    }
  }

  // キーワード最適化関連
  if (scores.keywordOptimizationScore < 50) {
    recommendations.push('重要なキーワードを適切な頻度で使用してください');
    recommendations.push('関連キーワードを記事に含めてキーワードの多様性を高めてください');
  }

  return recommendations;
};

/**
 * メインのSEO分析関数
 */
export const analyzeSEO = (
  articleId: string,
  input: SEOAnalysisInput
): SEOMetrics => {
  const plainText = extractPlainText(input.content);
  const headingCount = countHeadings(input.content);
  const keywords = analyzeKeywords(plainText, input.keywords);

  // 各スコアを計算
  const titleScore = calculateTitleScore(input.title);
  const metaDescriptionScore = calculateMetaDescriptionScore(input.metaDescription);
  const contentStructureScore = calculateContentStructureScore(input.content, headingCount);
  const keywordOptimizationScore = calculateKeywordOptimizationScore(keywords);
  const overallScore = calculateOverallScore(
    titleScore,
    metaDescriptionScore,
    contentStructureScore,
    keywordOptimizationScore
  );

  // 推奨事項を生成
  const recommendations = generateRecommendations(input, {
    titleScore,
    metaDescriptionScore,
    contentStructureScore,
    keywordOptimizationScore,
  });

  return {
    id: `seo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    articleId,
    titleLength: input.title.length,
    metaDescriptionLength: input.metaDescription.length,
    wordCount: plainText.split(/\s+/).length,
    headingCount,
    keywords,
    overallScore,
    titleScore,
    metaDescriptionScore,
    contentStructureScore,
    keywordOptimizationScore,
    recommendations,
    calculatedAt: new Date().toISOString(),
  };
};

/**
 * DraftArticleからSEO分析を実行
 */
export const analyzeDraftArticle = (draft: DraftArticle): SEOMetrics => {
  return analyzeSEO(draft.id, {
    title: draft.title,
    content: draft.content,
    metaDescription: draft.metaDescription,
    keywords: draft.keywords,
  });
};

export default {
  analyzeSEO,
  analyzeDraftArticle,
  extractPlainText,
  countHeadings,
  analyzeKeywords,
  calculateTitleScore,
  calculateMetaDescriptionScore,
  calculateContentStructureScore,
  calculateKeywordOptimizationScore,
  calculateOverallScore,
  generateRecommendations,
};