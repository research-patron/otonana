import type {
  WordPressSite,
  WordPressPost,
  WordPressCategory,
  WordPressTag,
  ArticleCSVData,
  CSVManagerState,
  CSVExportOptions,
  APIError,
} from '../types';
import { getPosts, getCategories, getTags } from './wordpress';

// CSV管理クラス
class CSVManager {
  private storageKeyPrefix = 'ultrathink_csv_';

  // ローカルストレージからCSV状態を取得
  getCSVState(siteId: string): CSVManagerState | null {
    try {
      const key = `${this.storageKeyPrefix}${siteId}`;
      const data = localStorage.getItem(key);
      if (!data) return null;
      
      const state: CSVManagerState = JSON.parse(data);
      return state;
    } catch (error) {
      console.error('Failed to load CSV state:', error);
      return null;
    }
  }

  // ローカルストレージにCSV状態を保存
  saveCSVState(state: CSVManagerState): void {
    try {
      const key = `${this.storageKeyPrefix}${state.siteId}`;
      localStorage.setItem(key, JSON.stringify(state));
    } catch (error) {
      console.error('Failed to save CSV state:', error);
      throw new Error('CSV状態の保存に失敗しました');
    }
  }

  // WordPressポストをArticleCSVDataに変換
  private convertPostToCSVData(
    post: WordPressPost,
    categories: WordPressCategory[],
    tags: WordPressTag[],
    siteUrl: string
  ): ArticleCSVData {
    // カテゴリー情報の構築
    const postCategories = post.categories
      .map(catId => categories.find(cat => cat.id === catId))
      .filter(Boolean)
      .map(cat => ({
        id: cat!.id,
        name: cat!.name,
        slug: cat!.slug,
      }));

    // タグ情報の構築
    const postTags = post.tags
      .map(tagId => tags.find(tag => tag.id === tagId))
      .filter(Boolean)
      .map(tag => ({
        id: tag!.id,
        name: tag!.name,
        slug: tag!.slug,
      }));

    // メタディスクリプションの抽出
    let metaDescription = '';
    if (post.yoast_head_json?.description) {
      metaDescription = post.yoast_head_json.description;
    } else if (post.excerpt.rendered) {
      metaDescription = post.excerpt.rendered.replace(/<[^>]*>/g, '').trim();
    } else {
      // コンテンツの最初の160文字
      const plainContent = post.content.rendered.replace(/<[^>]*>/g, '').trim();
      metaDescription = plainContent.substring(0, 160) + (plainContent.length > 160 ? '...' : '');
    }

    // 文字数カウント
    const plainContent = post.content.rendered.replace(/<[^>]*>/g, '');
    const wordCount = plainContent.length;

    return {
      id: post.id,
      title: post.title.rendered,
      slug: post.slug,
      url: post.link,
      status: post.status,
      categories: postCategories,
      tags: postTags,
      metaDescription,
      publishedDate: post.date,
      modifiedDate: post.modified,
      wordCount,
    };
  }

  // WordPressから記事データを取得してCSVデータを生成
  async generateCSVData(
    site: WordPressSite,
    categoryIds: number[] = [],
    includeStatuses: Array<'publish' | 'draft' | 'private' | 'pending' | 'future'> = ['publish'],
    maxArticles: number = 1000
  ): Promise<ArticleCSVData[]> {
    try {
      console.log(`Generating CSV data for site: ${site.url}`);
      console.log(`Categories: ${categoryIds.join(', ')}`);
      console.log(`Statuses: ${includeStatuses.join(', ')}`);

      // カテゴリーとタグの情報を取得
      const [categories, tags] = await Promise.all([
        getCategories(site),
        getTags(site),
      ]);

      // 記事データを取得
      const allPosts: WordPressPost[] = [];
      for (const status of includeStatuses) {
        try {
          const posts = await getPosts(site, {
            per_page: Math.min(maxArticles, 100),
            status,
            categories: categoryIds.length > 0 ? categoryIds : undefined,
          });
          allPosts.push(...posts);
        } catch (error) {
          console.warn(`Failed to fetch posts with status ${status}:`, error);
        }
      }

      console.log(`Retrieved ${allPosts.length} posts from WordPress`);

      // ArticleCSVData形式に変換
      const csvData = allPosts.map(post =>
        this.convertPostToCSVData(post, categories, tags, site.url)
      );

      // 最大記事数制限
      return csvData.slice(0, maxArticles);

    } catch (error) {
      console.error('Failed to generate CSV data:', error);
      throw new Error('記事データの取得に失敗しました');
    }
  }

  // CSVデータを更新（新規作成または増分更新）
  async updateCSVData(
    site: WordPressSite,
    categoryIds: number[],
    includeStatuses: Array<'publish' | 'draft' | 'private' | 'pending' | 'future'> = ['publish'],
    forceFullUpdate: boolean = false
  ): Promise<CSVManagerState> {
    try {
      const existingState = this.getCSVState(site.id);
      
      if (forceFullUpdate || !existingState) {
        // 全体更新
        console.log('Performing full CSV data update');
        const csvData = await this.generateCSVData(site, categoryIds, includeStatuses);
        
        const newState: CSVManagerState = {
          siteId: site.id,
          lastUpdated: new Date().toISOString(),
          totalArticles: csvData.length,
          csvData,
          selectedCategoryIds: categoryIds,
          includeStatuses,
        };
        
        this.saveCSVState(newState);
        return newState;
      } else {
        // 増分更新
        console.log('Performing incremental CSV data update');
        
        // 最新データを取得
        const latestData = await this.generateCSVData(site, categoryIds, includeStatuses);
        
        // 既存データとの差分を計算
        const existingIds = new Set(existingState.csvData.map(item => item.id));
        const latestIds = new Set(latestData.map(item => item.id));
        
        // 新規追加された記事
        const newArticles = latestData.filter(item => !existingIds.has(item.id));
        
        // 削除された記事のIDを特定
        const deletedIds = Array.from(existingIds).filter(id => !latestIds.has(id));
        
        // 更新された記事を特定
        const updatedArticles = latestData.filter(item => {
          const existing = existingState.csvData.find(existing => existing.id === item.id);
          return existing && existing.modifiedDate !== item.modifiedDate;
        });
        
        // CSVデータを更新
        let updatedCsvData = existingState.csvData.filter(item => !deletedIds.includes(item.id));
        
        // 新規記事を追加
        updatedCsvData.push(...newArticles);
        
        // 更新された記事を置換
        updatedArticles.forEach(updatedArticle => {
          const index = updatedCsvData.findIndex(item => item.id === updatedArticle.id);
          if (index !== -1) {
            updatedCsvData[index] = updatedArticle;
          }
        });
        
        const updatedState: CSVManagerState = {
          ...existingState,
          lastUpdated: new Date().toISOString(),
          totalArticles: updatedCsvData.length,
          csvData: updatedCsvData,
          selectedCategoryIds: categoryIds,
          includeStatuses,
        };
        
        this.saveCSVState(updatedState);
        
        console.log(`CSV update summary: +${newArticles.length} new, -${deletedIds.length} deleted, ~${updatedArticles.length} updated`);
        
        return updatedState;
      }
    } catch (error) {
      console.error('Failed to update CSV data:', error);
      throw new Error('CSVデータの更新に失敗しました');
    }
  }

  // CSVファイルとしてエクスポート
  exportAsCSV(csvData: ArticleCSVData[], filename?: string): void {
    try {
      // CSVヘッダー
      const headers = [
        'ID',
        'タイトル',
        'スラッグ',
        'URL',
        'ステータス',
        'カテゴリー',
        'タグ',
        'メタディスクリプション',
        '公開日',
        '更新日',
        '文字数',
      ];

      // CSVデータを構築
      const csvRows = [
        headers.join(','),
        ...csvData.map(article => [
          article.id,
          `"${article.title.replace(/"/g, '""')}"`,
          article.slug,
          article.url,
          article.status,
          `"${article.categories.map(cat => cat.name).join(', ').replace(/"/g, '""')}"`,
          `"${article.tags.map(tag => tag.name).join(', ').replace(/"/g, '""')}"`,
          `"${article.metaDescription.replace(/"/g, '""')}"`,
          article.publishedDate,
          article.modifiedDate,
          article.wordCount,
        ].join(','))
      ];

      // Blob作成とダウンロード
      const csvContent = csvRows.join('\n');
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename || `articles_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      
      URL.revokeObjectURL(link.href);
    } catch (error) {
      console.error('Failed to export CSV:', error);
      throw new Error('CSVエクスポートに失敗しました');
    }
  }

  // JSONファイルとしてエクスポート
  exportAsJSON(csvData: ArticleCSVData[], filename?: string): void {
    try {
      const jsonContent = JSON.stringify(csvData, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename || `articles_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      
      URL.revokeObjectURL(link.href);
    } catch (error) {
      console.error('Failed to export JSON:', error);
      throw new Error('JSONエクスポートに失敗しました');
    }
  }

  // データ分析用の統計情報を取得
  analyzeCSVData(csvData: ArticleCSVData[]): {
    totalArticles: number;
    statusDistribution: Record<string, number>;
    categoryDistribution: Record<string, number>;
    tagDistribution: Record<string, number>;
    averageWordCount: number;
    publicationTrend: Record<string, number>;
  } {
    const analysis = {
      totalArticles: csvData.length,
      statusDistribution: {} as Record<string, number>,
      categoryDistribution: {} as Record<string, number>,
      tagDistribution: {} as Record<string, number>,
      averageWordCount: 0,
      publicationTrend: {} as Record<string, number>,
    };

    if (csvData.length === 0) return analysis;

    // ステータス分布
    csvData.forEach(article => {
      analysis.statusDistribution[article.status] = 
        (analysis.statusDistribution[article.status] || 0) + 1;
    });

    // カテゴリー分布
    csvData.forEach(article => {
      article.categories.forEach(category => {
        analysis.categoryDistribution[category.name] = 
          (analysis.categoryDistribution[category.name] || 0) + 1;
      });
    });

    // タグ分布
    csvData.forEach(article => {
      article.tags.forEach(tag => {
        analysis.tagDistribution[tag.name] = 
          (analysis.tagDistribution[tag.name] || 0) + 1;
      });
    });

    // 平均文字数
    analysis.averageWordCount = Math.round(
      csvData.reduce((sum, article) => sum + article.wordCount, 0) / csvData.length
    );

    // 公開傾向（月別）
    csvData.forEach(article => {
      const month = article.publishedDate.substring(0, 7); // YYYY-MM
      analysis.publicationTrend[month] = 
        (analysis.publicationTrend[month] || 0) + 1;
    });

    return analysis;
  }

  // CSV状態を削除
  deleteCSVState(siteId: string): void {
    try {
      const key = `${this.storageKeyPrefix}${siteId}`;
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Failed to delete CSV state:', error);
    }
  }

  // 全サイトのCSV状態を取得
  getAllCSVStates(): Array<CSVManagerState & { siteName?: string }> {
    try {
      const states: Array<CSVManagerState & { siteName?: string }> = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.storageKeyPrefix)) {
          const data = localStorage.getItem(key);
          if (data) {
            const state: CSVManagerState = JSON.parse(data);
            states.push(state);
          }
        }
      }
      
      return states.sort((a, b) => 
        new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
      );
    } catch (error) {
      console.error('Failed to get all CSV states:', error);
      return [];
    }
  }
}

// シングルトンインスタンス
const csvManager = new CSVManager();

export default csvManager;

// 個別関数のエクスポート
export const {
  getCSVState,
  saveCSVState,
  generateCSVData,
  updateCSVData,
  exportAsCSV,
  exportAsJSON,
  analyzeCSVData,
  deleteCSVState,
  getAllCSVStates,
} = csvManager;