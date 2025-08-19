import type {
  ArticleCSVData,
  UltrathinkAIRequest,
  UltrathinkAIResponse,
  PromptTemplate,
  WordPressCategory,
  AISuggestion,
  APIError,
} from '../types';
import { generateArticleSuggestionsStructured, handleGeminiError } from './gemini';
import { decryptApiKey } from '../utils/crypto';

// Ultrathink AI専用のプロンプトテンプレート
const ULTRATHINK_SYSTEM_PROMPTS = {
  competitive_analysis: `あなたは戦略的SEOコンサルタント兼競合分析の専門家です。
既存の記事データベースと新しい記事アイデアを分析し、競合優位性を持つコンテンツ戦略を提案してください。

分析観点：
- 既存記事のコンテンツギャップ特定
- 競合差別化要素の発見
- SEO効果とユーザー価値の最大化
- コンテンツクラスターの最適化
- キーワード戦略の強化`,

  content_strategy: `あなたは経験豊富なコンテンツストラテジストです。
サイトの既存記事データと新規記事要求を分析し、包括的なコンテンツ戦略を立案してください。

戦略要素：
- ユーザージャーニーの最適化
- コンテンツの関連性強化
- 内部リンク戦略
- 記事間の相乗効果
- ブランド一貫性の確保`,

  gap_analysis: `あなたはコンテンツギャップ分析の専門家です。
既存の記事データベースを分析し、不足しているトピックや機会を特定してください。

分析ポイント：
- 未カバートピックの発見
- 薄いコンテンツ領域の特定
- キーワード機会の分析
- ユーザー需要と供給のミスマッチ
- コンテンツボリュームの最適化`,
};

// CSVデータ分析クラス
class CSVAnalyzer {
  // コンテンツギャップを分析
  analyzeContentGaps(csvData: ArticleCSVData[]): {
    missingTopics: string[];
    thinContent: string[];
    opportunities: string[];
  } {
    const analysis = {
      missingTopics: [] as string[],
      thinContent: [] as string[],
      opportunities: [] as string[],
    };

    if (csvData.length === 0) return analysis;

    // カテゴリー別の記事数分析
    const categoryStats = {} as Record<string, { count: number; totalWords: number; articles: ArticleCSVData[] }>;
    
    csvData.forEach(article => {
      article.categories.forEach(category => {
        if (!categoryStats[category.name]) {
          categoryStats[category.name] = { count: 0, totalWords: 0, articles: [] };
        }
        categoryStats[category.name].count++;
        categoryStats[category.name].totalWords += article.wordCount;
        categoryStats[category.name].articles.push(article);
      });
    });

    // 記事数が少ないカテゴリーを特定
    Object.entries(categoryStats).forEach(([category, stats]) => {
      if (stats.count === 1) {
        analysis.missingTopics.push(`${category}関連のコンテンツ拡充`);
      } else if (stats.count <= 3) {
        analysis.opportunities.push(`${category}カテゴリーの記事追加（現在${stats.count}記事）`);
      }
      
      // 平均文字数が少ないカテゴリー
      const avgWords = stats.totalWords / stats.count;
      if (avgWords < 1500) {
        analysis.thinContent.push(`${category}の記事充実（平均${Math.round(avgWords)}文字）`);
      }
    });

    // タグ分析によるトピック発見
    const tagFrequency = {} as Record<string, number>;
    csvData.forEach(article => {
      article.tags.forEach(tag => {
        tagFrequency[tag.name] = (tagFrequency[tag.name] || 0) + 1;
      });
    });

    // 使用頻度の低いタグからトピック機会を発見
    Object.entries(tagFrequency).forEach(([tag, frequency]) => {
      if (frequency === 1) {
        analysis.opportunities.push(`「${tag}」関連の詳細記事作成`);
      }
    });

    return analysis;
  }

  // カテゴリー分布を分析
  analyzeCategoryDistribution(csvData: ArticleCSVData[]): Record<string, number> {
    const distribution = {} as Record<string, number>;
    
    csvData.forEach(article => {
      article.categories.forEach(category => {
        distribution[category.name] = (distribution[category.name] || 0) + 1;
      });
    });

    return distribution;
  }

  // よく使われるトピックを抽出
  extractCommonTopics(csvData: ArticleCSVData[], limit: number = 10): string[] {
    const topicFrequency = {} as Record<string, number>;
    
    // タイトルからキーワードを抽出
    csvData.forEach(article => {
      const words = article.title
        .toLowerCase()
        .split(/[\s\-_・、。]+/)
        .filter(word => word.length >= 2);
      
      words.forEach(word => {
        topicFrequency[word] = (topicFrequency[word] || 0) + 1;
      });
      
      // タグもトピックとして追加
      article.tags.forEach(tag => {
        topicFrequency[tag.name] = (topicFrequency[tag.name] || 0) + 1;
      });
    });

    return Object.entries(topicFrequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([topic]) => topic);
  }

  // 推奨カテゴリーとタグを分析
  analyzeRecommendations(csvData: ArticleCSVData[], selectedCategories: WordPressCategory[]): {
    recommendedCategories: string[];
    recommendedTags: string[];
  } {
    const categoryStats = this.analyzeCategoryDistribution(csvData);
    const commonTopics = this.extractCommonTopics(csvData);
    
    // 選択されたカテゴリーに関連する推奨カテゴリー
    const recommendedCategories = selectedCategories
      .filter(cat => (categoryStats[cat.name] || 0) > 0)
      .map(cat => cat.name);
    
    // よく使われるトピックから推奨タグを生成
    const recommendedTags = commonTopics.slice(0, 8);

    return {
      recommendedCategories,
      recommendedTags,
    };
  }
}

// Ultrathink AI提案生成器
class UltrathinkAIGenerator {
  private csvAnalyzer = new CSVAnalyzer();

  // CSVデータを分析してプロンプトに組み込む
  private buildContextFromCSV(csvData: ArticleCSVData[], selectedCategories: WordPressCategory[]): string {
    if (csvData.length === 0) {
      return '\n\n【既存記事データ】\n現在、分析対象の記事データがありません。新規サイトまたは記事が少ないサイトとして戦略を立案してください。';
    }

    const analysis = this.csvAnalyzer.analyzeContentGaps(csvData);
    const categoryDistribution = this.csvAnalyzer.analyzeCategoryDistribution(csvData);
    const commonTopics = this.csvAnalyzer.extractCommonTopics(csvData);
    const recommendations = this.csvAnalyzer.analyzeRecommendations(csvData, selectedCategories);

    // 統計情報
    const totalWords = csvData.reduce((sum, article) => sum + article.wordCount, 0);
    const avgWords = Math.round(totalWords / csvData.length);
    const recentArticles = csvData
      .sort((a, b) => new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime())
      .slice(0, 5);

    let context = `\n\n【既存記事データベース分析】
■ 基本統計
- 総記事数: ${csvData.length}記事
- 平均文字数: ${avgWords}文字
- 対象カテゴリー: ${selectedCategories.map(cat => cat.name).join(', ')}

■ カテゴリー分布`;

    Object.entries(categoryDistribution)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .forEach(([category, count]) => {
        context += `\n- ${category}: ${count}記事`;
      });

    context += `\n\n■ よく扱われるトピック\n${commonTopics.slice(0, 8).join(', ')}`;

    if (analysis.missingTopics.length > 0) {
      context += `\n\n■ コンテンツギャップ（機会）\n${analysis.missingTopics.slice(0, 5).join('\n')}`;
    }

    if (analysis.thinContent.length > 0) {
      context += `\n\n■ 充実が必要な領域\n${analysis.thinContent.slice(0, 3).join('\n')}`;
    }

    context += `\n\n■ 最近の記事タイトル（参考）`;
    recentArticles.forEach(article => {
      context += `\n- ${article.title} (${article.wordCount}文字)`;
    });

    context += `\n\n■ 推奨戦略方向性
- 既存強みカテゴリー: ${recommendations.recommendedCategories.slice(0, 3).join(', ')}
- 活用推奨タグ: ${recommendations.recommendedTags.slice(0, 5).join(', ')}`;

    return context;
  }

  // Ultrathink AI提案を生成
  async generateUltrathinkSuggestion(apiKey: string, request: UltrathinkAIRequest): Promise<UltrathinkAIResponse> {
    try {
      // CSVデータ分析
      const csvAnalysis = this.analyzeCsvData(request.csvData, request.selectedCategories);
      
      // コンテキスト構築
      const csvContext = this.buildContextFromCSV(request.csvData, request.selectedCategories);
      
      // 競合分析コンテキスト
      let competitiveContext = '';
      if (request.analysisContext?.competitorAnalysis) {
        competitiveContext = `\n\n【競合分析情報】\n${request.analysisContext.competitorAnalysis}`;
      }

      // ターゲットキーワード
      let keywordContext = '';
      if (request.analysisContext?.targetKeywords && request.analysisContext.targetKeywords.length > 0) {
        keywordContext = `\n\n【ターゲットキーワード】\n${request.analysisContext.targetKeywords.join(', ')}`;
      }

      // ファイルコンテンツ
      let fileContext = '';
      if (request.fileContent) {
        fileContext = `\n\n【アップロードファイル】
ファイル名: ${request.fileContent.filename}
文字数: ${request.fileContent.wordCount}文字
内容: ${request.fileContent.text.substring(0, 1000)}${request.fileContent.text.length > 1000 ? '...(省略)' : ''}`;
      }

      // プロンプト構築
      const systemPrompt = request.promptTemplate?.system || ULTRATHINK_SYSTEM_PROMPTS.competitive_analysis;
      
      const fullPrompt = `${systemPrompt}

【分析依頼】
${request.userInput}${csvContext}${competitiveContext}${keywordContext}${fileContext}

【重要指示】
上記の既存記事データベース分析を基に、以下を考慮した戦略的記事提案を行ってください：

1. 既存記事との差別化と相乗効果
2. 特定されたコンテンツギャップの活用
3. サイト全体のコンテンツ戦略への貢献
4. 競合優位性を持つユニークな視点
5. SEO効果とユーザー価値の両立

特に、既存記事データから見える強みを活かしつつ、不足している領域を補完する記事戦略を提案してください。`;

      // AI提案を生成（既存のgemini.tsを活用）
      const baseSuggestion = await generateArticleSuggestionsStructured(
        apiKey,
        request.promptTemplate?.name || 'gemini-2.5-pro',
        fullPrompt
      );

      // UltrathinkAIResponseに拡張
      const ultrathinkResponse: UltrathinkAIResponse = {
        ...baseSuggestion,
        csvAnalysis,
        competitiveInsights: this.generateCompetitiveInsights(request.csvData, csvAnalysis),
        originalCsvData: request.csvData,
      };

      return ultrathinkResponse;

    } catch (error) {
      console.error('Ultrathink AI generation failed:', error);
      throw new Error('Ultrathink AI提案の生成に失敗しました');
    }
  }

  // CSVデータ分析結果を構造化
  private analyzeCsvData(csvData: ArticleCSVData[], selectedCategories: WordPressCategory[]) {
    const categoryDistribution = this.csvAnalyzer.analyzeCategoryDistribution(csvData);
    const commonTopics = this.csvAnalyzer.extractCommonTopics(csvData);
    const contentGaps = this.csvAnalyzer.analyzeContentGaps(csvData);
    const recommendations = this.csvAnalyzer.analyzeRecommendations(csvData, selectedCategories);

    return {
      totalArticlesAnalyzed: csvData.length,
      categoryDistribution,
      commonTopics,
      contentGaps: contentGaps.missingTopics.concat(contentGaps.opportunities),
      recommendedCategories: recommendations.recommendedCategories,
      recommendedTags: recommendations.recommendedTags,
    };
  }

  // 競合インサイトを生成
  private generateCompetitiveInsights(csvData: ArticleCSVData[], csvAnalysis: any): {
    missingTopics: string[];
    improvementOpportunities: string[];
    contentStrategies: string[];
  } {
    const insights = {
      missingTopics: [] as string[],
      improvementOpportunities: [] as string[],
      contentStrategies: [] as string[],
    };

    // 記事数が少ないカテゴリーから機会を特定
    Object.entries(csvAnalysis.categoryDistribution).forEach(([category, count]) => {
      if (typeof count === 'number' && count <= 2) {
        insights.missingTopics.push(`${category}カテゴリーの深掘り記事`);
      }
    });

    // 改善機会の特定
    const shortArticles = csvData.filter(article => article.wordCount < 1500);
    if (shortArticles.length > 0) {
      insights.improvementOpportunities.push(`短い記事の充実（${shortArticles.length}記事が1500文字未満）`);
    }

    const oldArticles = csvData.filter(article => {
      const monthsOld = (new Date().getTime() - new Date(article.modifiedDate).getTime()) / (1000 * 60 * 60 * 24 * 30);
      return monthsOld > 12;
    });

    if (oldArticles.length > 0) {
      insights.improvementOpportunities.push(`古い記事の更新（${oldArticles.length}記事が1年以上未更新）`);
    }

    // コンテンツ戦略の提案
    insights.contentStrategies.push('既存記事との内部リンク戦略');
    insights.contentStrategies.push('シリーズ記事によるトピッククラスター構築');
    insights.contentStrategies.push('ユーザージャーニーに沿った関連記事作成');

    return insights;
  }
}

// シングルトンインスタンス
const ultrathinkAI = new UltrathinkAIGenerator();

// Ultrathink AI提案の実行
export const generateUltrathinkAISuggestion = async (
  apiKey: string,
  request: UltrathinkAIRequest
): Promise<UltrathinkAIResponse> => {
  return ultrathinkAI.generateUltrathinkSuggestion(apiKey, request);
};

// CSVデータ分析のみ実行
export const analyzeCSVData = (csvData: ArticleCSVData[], selectedCategories: WordPressCategory[]) => {
  const analyzer = new CSVAnalyzer();
  return {
    contentGaps: analyzer.analyzeContentGaps(csvData),
    categoryDistribution: analyzer.analyzeCategoryDistribution(csvData),
    commonTopics: analyzer.extractCommonTopics(csvData),
    recommendations: analyzer.analyzeRecommendations(csvData, selectedCategories),
  };
};

// エラーハンドリング
export const handleUltrathinkError = (error: unknown): APIError => {
  if (error instanceof Error) {
    return {
      code: 'ULTRATHINK_ERROR',
      message: error.message,
      details: error,
      timestamp: new Date().toISOString(),
    };
  }

  return handleGeminiError(error);
};

export default {
  generateUltrathinkAISuggestion,
  analyzeCSVData,
  handleUltrathinkError,
};