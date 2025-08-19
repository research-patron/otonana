import type {
  QualityCheckConfig,
  QualityCheckResult,
  QualityCheckProgress,
  QualityCheckReport,
  WordPressSite,
  WordPressPost,
  WordPressCategory,
  GeminiQualityAnalysis
} from '../types';
import { getPosts, getCategories } from './wordpress';
import textlintService from './textlint';
import geminiService from './gemini';

class QualityCheckerService {
  private currentConfig: QualityCheckConfig | null = null;
  private isRunning = false;
  private shouldCancel = false;
  private progressCallback: ((progress: QualityCheckProgress) => void) | null = null;

  // 品質チェックを開始
  async startQualityCheck(
    site: WordPressSite,
    config: QualityCheckConfig,
    apiKey: string,
    onProgress?: (progress: QualityCheckProgress) => void
  ): Promise<QualityCheckReport> {
    if (this.isRunning) {
      throw new Error('品質チェックは既に実行中です');
    }

    // APIキーの検証（Gemini分析が有効な場合のみ）
    if (this.shouldUseGeminiAnalysis(config) && (!apiKey || apiKey.trim() === '')) {
      throw new Error('Gemini APIキーが提供されていません。設定画面でAPIキーを入力してください。');
    }

    this.isRunning = true;
    this.shouldCancel = false;
    this.currentConfig = config;
    this.progressCallback = onProgress || null;

    const startTime = Date.now();

    try {
      // 初期進捗を報告
      this.reportProgress({
        total: 0,
        current: 0,
        currentTitle: '',
        percentage: 0,
        status: 'fetching',
        errors: []
      });

      // 1. 対象記事を取得
      const posts = await this.fetchTargetPosts(site, config);
      
      if (posts.length === 0) {
        throw new Error('チェック対象の記事が見つかりませんでした');
      }

      // 2. カテゴリー情報を取得
      const categories = await getCategories(site);

      // 3. 各記事を分析
      const results: QualityCheckResult[] = [];
      const errors: string[] = [];

      for (let i = 0; i < posts.length; i++) {
        if (this.shouldCancel) {
          throw new Error('ユーザーによってキャンセルされました');
        }

        const post = posts[i];

        this.reportProgress({
          total: posts.length,
          current: i + 1,
          currentTitle: post.title.rendered,
          percentage: Math.round(((i + 1) / posts.length) * 100),
          status: 'analyzing',
          errors
        });

        try {
          const result = await this.analyzePost(post, config, categories, apiKey);
          results.push(result);
        } catch (error) {
          const errorMessage = `記事「${post.title.rendered}」の分析に失敗: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`;
          errors.push(errorMessage);
          console.error(errorMessage, error);
          
          // エラーでも部分的な結果を作成
          results.push(this.createErrorResult(post, errorMessage, categories));
        }

        // API制限対策（1秒間隔）
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // 4. レポートを生成
      const totalTime = Date.now() - startTime;
      
      this.reportProgress({
        total: posts.length,
        current: posts.length,
        currentTitle: '',
        percentage: 100,
        status: 'completed',
        errors
      });

      const report = this.generateReport(site, config, results, totalTime, categories);
      
      return report;

    } catch (error) {
      this.reportProgress({
        total: 0,
        current: 0,
        currentTitle: '',
        percentage: 0,
        status: 'error',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      });
      
      throw error;
    } finally {
      this.isRunning = false;
      this.currentConfig = null;
      this.progressCallback = null;
    }
  }

  // 品質チェックをキャンセル
  cancelQualityCheck(): void {
    this.shouldCancel = true;
  }

  // 対象記事を取得
  private async fetchTargetPosts(
    site: WordPressSite, 
    config: QualityCheckConfig
  ): Promise<WordPressPost[]> {
    const { filters } = config;
    
    let allPosts: WordPressPost[] = [];
    let page = 1;
    const perPage = 100;

    // ページネーションで全記事を取得
    while (true) {
      const posts = await getPosts(site, {
        per_page: perPage,
        page,
        status: filters.statusFilter.join(','),
        categories: filters.categoryIds?.length ? filters.categoryIds : undefined
      });

      if (posts.length === 0) break;
      
      allPosts = allPosts.concat(posts);
      
      if (posts.length < perPage) break; // 最後のページ
      page++;
    }

    // フィルタリング
    let filteredPosts = allPosts;

    // 除外記事を除去
    if (filters.excludedPostIds?.length) {
      filteredPosts = filteredPosts.filter(
        post => !filters.excludedPostIds!.includes(post.id)
      );
    }

    // 日付範囲でフィルタリング
    if (filters.dateRange) {
      const fromDate = new Date(filters.dateRange.from);
      const toDate = new Date(filters.dateRange.to);
      
      filteredPosts = filteredPosts.filter(post => {
        const postDate = new Date(post.date);
        return postDate >= fromDate && postDate <= toDate;
      });
    }

    return filteredPosts;
  }

  // 個別記事を分析
  private async analyzePost(
    post: WordPressPost,
    config: QualityCheckConfig,
    categories: WordPressCategory[],
    apiKey: string
  ): Promise<QualityCheckResult> {
    const startTime = Date.now();

    try {
      // 1. TextLint分析
      const textlintResult = await textlintService.checkArticleQuality(
        post.content.rendered,
        config,
        `post-${post.id}.html`
      );

      // 2. Gemini分析（設定が有効な場合）
      let geminiAnalysis: GeminiQualityAnalysis;
      
      if (this.shouldUseGeminiAnalysis(config)) {
        geminiAnalysis = await geminiService.analyzeArticleQuality(
          post.title.rendered,
          post.content.rendered,
          config.geminiAnalysis,
          apiKey
        );
      } else {
        geminiAnalysis = this.createEmptyGeminiAnalysis();
      }

      // 3. スコア計算
      const scores = this.calculateScores(post, textlintResult, geminiAnalysis, config);

      // 4. 優先度とアクションを決定
      const { priority, rewriteReasons, recommendedActions } = this.determineActions(
        scores,
        textlintResult,
        geminiAnalysis,
        config
      );

      // 5. カテゴリー情報を取得
      const postCategories = categories
        .filter(cat => post.categories.includes(cat.id))
        .map(cat => ({ id: cat.id, name: cat.name }));

      const result: QualityCheckResult = {
        postId: post.id,
        title: post.title.rendered,
        url: post.link,
        status: post.status,
        lastModified: post.modified,
        categories: postCategories,
        overallScore: scores.overall,
        ageScore: scores.age,
        aiTextScore: scores.aiText,
        misinformationScore: scores.misinformation,
        textlintResult,
        geminiAnalysis,
        priority,
        rewriteReasons,
        recommendedActions,
        checkedAt: new Date().toISOString(),
        processingTime: Date.now() - startTime
      };

      return result;

    } catch (error) {
      throw new Error(`記事分析エラー: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // スコア計算
  private calculateScores(
    post: WordPressPost,
    textlintResult: any,
    geminiAnalysis: GeminiQualityAnalysis,
    config: QualityCheckConfig
  ): {
    overall: number;
    age: number;
    aiText: number;
    misinformation: number;
  } {
    // 古さスコア計算
    const lastModified = new Date(post.modified);
    const now = new Date();
    const monthsOld = (now.getTime() - lastModified.getTime()) / (1000 * 60 * 60 * 24 * 30);
    const ageScore = Math.max(0, 100 - (monthsOld * 5)); // 1ヶ月ごとに5点減点

    // AI文章スコア計算
    const aiTextScore = textlintService.calculateAITextScore(textlintResult);

    // 誤情報スコア計算
    const misinformationScore = geminiAnalysis.misinformationRisk.score;

    // 総合スコア計算（重み付け）
    const overall = Math.round(
      (ageScore * config.scoring.ageWeight) +
      (aiTextScore * config.scoring.aiTextWeight) +
      (misinformationScore * config.scoring.misinformationWeight)
    );

    return {
      overall: Math.max(0, Math.min(100, overall)),
      age: Math.round(ageScore),
      aiText: Math.round(aiTextScore),
      misinformation: Math.round(misinformationScore)
    };
  }

  // アクションと優先度の決定
  private determineActions(
    scores: { overall: number; age: number; aiText: number; misinformation: number },
    textlintResult: any,
    geminiAnalysis: GeminiQualityAnalysis,
    config: QualityCheckConfig
  ): {
    priority: 'high' | 'medium' | 'low';
    rewriteReasons: string[];
    recommendedActions: string[];
  } {
    const rewriteReasons: string[] = [];
    const recommendedActions: string[] = [];

    // スコアベースの優先度判定
    let priority: 'high' | 'medium' | 'low' = 'low';
    
    if (scores.overall < 40) {
      priority = 'high';
    } else if (scores.overall < 70) {
      priority = 'medium';
    }

    // 具体的な問題を特定
    if (scores.age < 60) {
      rewriteReasons.push('情報が古い可能性があります');
      recommendedActions.push('最新情報への更新');
    }

    if (scores.aiText < 60) {
      rewriteReasons.push('AI生成文章の特徴が検出されました');
      recommendedActions.push('自然な文章への書き換え');
    }

    if (scores.misinformation < 60) {
      rewriteReasons.push('事実確認が必要な内容が含まれています');
      recommendedActions.push('信頼できるソースによる事実確認');
    }

    // TextLint結果から詳細な推奨事項を追加
    const errorStats = textlintService.getErrorStatistics(textlintResult);
    
    if (errorStats['excessive-bullet-points']) {
      rewriteReasons.push('箇条書きの使用が過度です');
      recommendedActions.push('箇条書きを段落形式に変更');
    }

    if (errorStats['inconsistent-tone']) {
      rewriteReasons.push('文体が統一されていません');
      recommendedActions.push('敬語または常体に統一');
    }

    if (errorStats['long-sentence']) {
      rewriteReasons.push('長すぎる文章があります');
      recommendedActions.push('文章を短く分割');
    }

    // Gemini分析結果から詳細な推奨事項を追加
    if (geminiAnalysis.seoAnalysis.brokenLinks.length > 0) {
      rewriteReasons.push('リンク切れが検出されました');
      recommendedActions.push('リンクの確認と修正');
    }

    if (geminiAnalysis.readabilityScore.missingAltTexts > 0) {
      rewriteReasons.push('画像のalt属性が不足しています');
      recommendedActions.push('画像にalt属性を追加');
    }

    return { priority, rewriteReasons, recommendedActions };
  }

  // Gemini分析が必要かどうか判定
  private shouldUseGeminiAnalysis(config: QualityCheckConfig): boolean {
    const { geminiAnalysis } = config;
    return (
      geminiAnalysis.checkMisinformation ||
      geminiAnalysis.checkRecency ||
      geminiAnalysis.checkLogicalConsistency ||
      geminiAnalysis.checkSEO ||
      geminiAnalysis.checkReadability
    );
  }

  // 空のGemini分析結果を作成
  private createEmptyGeminiAnalysis(): GeminiQualityAnalysis {
    return {
      misinformationRisk: { score: 100, issues: [], recommendations: [] },
      recencyCheck: { score: 100, outdatedInfo: [], updateSuggestions: [] },
      logicalConsistency: { score: 100, inconsistencies: [], improvements: [] },
      seoAnalysis: { metaDescriptionScore: 100, headingStructureScore: 100, brokenLinks: [], recommendations: [] },
      readabilityScore: { score: 100, sentenceLengthIssues: 0, complexTermsCount: 0, missingAltTexts: 0, suggestions: [] }
    };
  }

  // エラー時の結果を作成
  private createErrorResult(
    post: WordPressPost,
    errorMessage: string,
    categories: WordPressCategory[]
  ): QualityCheckResult {
    const postCategories = categories
      .filter(cat => post.categories.includes(cat.id))
      .map(cat => ({ id: cat.id, name: cat.name }));

    return {
      postId: post.id,
      title: post.title.rendered,
      url: post.link,
      status: post.status,
      lastModified: post.modified,
      categories: postCategories,
      overallScore: 0,
      ageScore: 0,
      aiTextScore: 0,
      misinformationScore: 0,
      textlintResult: { messages: [] },
      geminiAnalysis: this.createEmptyGeminiAnalysis(),
      priority: 'high',
      rewriteReasons: ['分析中にエラーが発生しました'],
      recommendedActions: ['手動での確認が必要です'],
      checkedAt: new Date().toISOString(),
      processingTime: 0,
      error: errorMessage
    };
  }

  // レポート生成
  private generateReport(
    site: WordPressSite,
    config: QualityCheckConfig,
    results: QualityCheckResult[],
    totalTime: number,
    categories: WordPressCategory[]
  ): QualityCheckReport {
    const validResults = results.filter(r => !r.error);
    
    // サマリー計算
    const highPriorityIssues = results.filter(r => r.priority === 'high').length;
    const mediumPriorityIssues = results.filter(r => r.priority === 'medium').length;
    const lowPriorityIssues = results.filter(r => r.priority === 'low').length;
    
    const averageScore = validResults.length > 0 
      ? Math.round(validResults.reduce((sum, r) => sum + r.overallScore, 0) / validResults.length)
      : 0;

    // 統計情報を計算
    const statistics = this.calculateStatistics(results, categories);

    return {
      siteId: site.id,
      siteName: site.name || site.url,
      generatedAt: new Date().toISOString(),
      config,
      summary: {
        totalPosts: results.length,
        postsChecked: validResults.length,
        highPriorityIssues,
        mediumPriorityIssues,
        lowPriorityIssues,
        averageScore,
        processingTime: totalTime
      },
      results: results.sort((a, b) => {
        // 優先度順でソート
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        }
        // 同じ優先度の場合はスコア順
        return a.overallScore - b.overallScore;
      }),
      statistics,
      exportFormat: 'csv',
      fileName: `quality-check-${site.id}-${new Date().toISOString().split('T')[0]}.csv`
    };
  }

  // 統計情報を計算
  private calculateStatistics(
    results: QualityCheckResult[],
    categories: WordPressCategory[]
  ) {
    // スコア分布
    const scoreDistribution = [
      { range: '0-20', count: 0 },
      { range: '21-40', count: 0 },
      { range: '41-60', count: 0 },
      { range: '61-80', count: 0 },
      { range: '81-100', count: 0 }
    ];

    results.forEach(result => {
      const score = result.overallScore;
      if (score <= 20) scoreDistribution[0].count++;
      else if (score <= 40) scoreDistribution[1].count++;
      else if (score <= 60) scoreDistribution[2].count++;
      else if (score <= 80) scoreDistribution[3].count++;
      else scoreDistribution[4].count++;
    });

    // 共通問題
    const issueFrequency: Record<string, number> = {};
    results.forEach(result => {
      result.rewriteReasons.forEach(reason => {
        issueFrequency[reason] = (issueFrequency[reason] || 0) + 1;
      });
    });

    const commonIssues = Object.entries(issueFrequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([issue, frequency]) => ({ issue, frequency }));

    // カテゴリー別分析
    const categoryStats: Record<number, { postsCount: number; totalScore: number }> = {};
    
    results.forEach(result => {
      result.categories.forEach(cat => {
        if (!categoryStats[cat.id]) {
          categoryStats[cat.id] = { postsCount: 0, totalScore: 0 };
        }
        categoryStats[cat.id].postsCount++;
        categoryStats[cat.id].totalScore += result.overallScore;
      });
    });

    const categoryBreakdown = Object.entries(categoryStats).map(([catId, stats]) => {
      const category = categories.find(c => c.id === parseInt(catId));
      return {
        categoryName: category?.name || `Category ${catId}`,
        postsCount: stats.postsCount,
        averageScore: Math.round(stats.totalScore / stats.postsCount)
      };
    }).sort((a, b) => b.postsCount - a.postsCount);

    return {
      scoreDistribution,
      commonIssues,
      categoryBreakdown
    };
  }

  // 進捗を報告
  private reportProgress(progress: QualityCheckProgress): void {
    if (this.progressCallback) {
      this.progressCallback(progress);
    }
  }

  // 実行状態の確認
  getIsRunning(): boolean {
    return this.isRunning;
  }

  // 現在の設定を取得
  getCurrentConfig(): QualityCheckConfig | null {
    return this.currentConfig;
  }
}

// シングルトンインスタンス
const qualityCheckerService = new QualityCheckerService();

export default qualityCheckerService;
export { QualityCheckerService };