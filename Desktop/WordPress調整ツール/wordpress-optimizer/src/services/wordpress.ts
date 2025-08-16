import type { 
  WordPressSite, 
  WordPressPost, 
  WordPressCategory, 
  WordPressTag,
  SiteAnalysis,
  APIError 
} from '../types';

// WordPress REST API エンドポイント
const WP_ENDPOINTS = {
  POSTS: '/wp/v2/posts',
  CATEGORIES: '/wp/v2/categories',
  TAGS: '/wp/v2/tags',
  MEDIA: '/wp/v2/media',
  USERS: '/wp/v2/users/me',
} as const;

// HTTPステータスコードのエラーメッセージマッピング
const ERROR_MESSAGES = {
  400: '不正なリクエストです',
  401: '認証に失敗しました',
  403: 'アクセス権限がありません',
  404: 'リソースが見つかりません',
  429: 'リクエストが多すぎます。しばらく待ってから再試行してください',
  500: 'サーバーエラーが発生しました',
  502: 'サーバーに接続できません',
  503: 'サービスが一時的に利用できません',
} as const;

class WordPressAPIError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: any,
    public status?: number
  ) {
    super(message);
    this.name = 'WordPressAPIError';
  }
}

// 認証ヘッダーの生成
const generateAuthHeaders = (site: WordPressSite): Record<string, string> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  try {
    switch (site.authMethod) {
      case 'application-passwords':
        // WordPress Application Passwords (推奨)
        const authString = btoa(`${site.username}:${site.password}`);
        headers['Authorization'] = `Basic ${authString}`;
        break;
        
      case 'basic':
        // Basic認証
        const basicAuth = btoa(`${site.username}:${site.password}`);
        headers['Authorization'] = `Basic ${basicAuth}`;
        break;
        
      default:
        throw new WordPressAPIError('AUTH_ERROR', '不明な認証方式です');
    }

    // カスタムヘッダーがある場合は追加
    if (site.customHeaders) {
      Object.assign(headers, site.customHeaders);
    }
  } catch (error) {
    throw new WordPressAPIError('AUTH_ERROR', '認証ヘッダーの生成に失敗しました', error);
  }

  return headers;
};

// API リクエストの実行
const makeRequest = async <T>(
  site: WordPressSite,
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  // REST API URLを自動取得または構築
  let apiEndpoint = site.restApiUrl;
  if (!apiEndpoint) {
    apiEndpoint = await discoverRestAPI(site.url);
  }
  
  const url = `${apiEndpoint}${endpoint}`;
  
  try {
    const headers = {
      ...generateAuthHeaders(site),
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'omit', // CORS対策
    });

    if (!response.ok) {
      const errorMessage = ERROR_MESSAGES[response.status as keyof typeof ERROR_MESSAGES] 
        || `HTTPエラー: ${response.status}`;
      
      let details;
      try {
        details = await response.json();
      } catch {
        details = await response.text();
      }

      throw new WordPressAPIError(
        `HTTP_${response.status}`,
        errorMessage,
        details,
        response.status
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof WordPressAPIError) {
      throw error;
    }
    
    // ネットワークエラーやCORSエラーの処理
    if (error instanceof TypeError) {
      throw new WordPressAPIError(
        'NETWORK_ERROR',
        'ネットワークエラーまたはCORSエラーが発生しました。サイトのCORS設定を確認してください。',
        error
      );
    }
    
    throw new WordPressAPIError(
      'UNKNOWN_ERROR',
      '予期しないエラーが発生しました',
      error
    );
  }
};

// REST API の存在確認
export const discoverRestAPI = async (siteUrl: string): Promise<string> => {
  const possibleEndpoints = [
    `${siteUrl}/wp-json`,
    `${siteUrl}/wp-json/wp/v2`,
    `${siteUrl}/?rest_route=/`,
    `${siteUrl}/index.php?rest_route=/`,
  ];

  for (const endpoint of possibleEndpoints) {
    try {
      const response = await fetch(endpoint, { method: 'HEAD' });
      if (response.ok) {
        return endpoint.replace(/\/wp\/v2$/, '');
      }
    } catch {
      continue;
    }
  }

  throw new WordPressAPIError(
    'API_NOT_FOUND',
    'WordPress REST APIが見つかりません。サイトでREST APIが有効化されているか確認してください。'
  );
};

// WordPress接続テスト（直接認証情報で）
export const testWordPressConnection = async (siteData: {
  url: string;
  authMethod: 'application-passwords' | 'basic';
  username: string;
  password: string;
}): Promise<{
  success: boolean;
  message: string;
  capabilities?: string[];
}> => {
  try {
    // REST API エンドポイントを発見
    const restApiUrl = await discoverRestAPI(siteData.url);
    
    // 一時的なサイトオブジェクトを作成
    const tempSite: WordPressSite = {
      id: 'temp',
      url: siteData.url,
      authMethod: siteData.authMethod,
      username: siteData.username,
      password: siteData.password,
      restApiUrl: restApiUrl,
    };

    // 現在のユーザー情報を取得して認証と権限をテスト
    const userInfo = await makeRequest<any>(tempSite, WP_ENDPOINTS.USERS);
    
    const capabilities = userInfo.capabilities || {};
    const relevantCaps = [
      'edit_posts',
      'publish_posts',
      'edit_published_posts',
      'delete_posts',
      'manage_categories',
    ].filter(cap => capabilities[cap]);

    return {
      success: true,
      message: '接続に成功しました',
      capabilities: relevantCaps,
    };
  } catch (error) {
    if (error instanceof WordPressAPIError) {
      return {
        success: false,
        message: error.message,
      };
    }
    
    return {
      success: false,
      message: '接続テストに失敗しました',
    };
  }
};

// サイト接続テスト（既存サイトオブジェクトで）
export const testSiteConnection = async (site: WordPressSite): Promise<{
  success: boolean;
  message: string;
  capabilities?: string[];
}> => {
  try {
    // 現在のユーザー情報を取得して認証と権限をテスト
    const userInfo = await makeRequest<any>(site, WP_ENDPOINTS.USERS);
    
    const capabilities = userInfo.capabilities || {};
    const relevantCaps = [
      'edit_posts',
      'publish_posts',
      'edit_published_posts',
      'delete_posts',
      'manage_categories',
    ].filter(cap => capabilities[cap]);

    return {
      success: true,
      message: '接続に成功しました',
      capabilities: relevantCaps,
    };
  } catch (error) {
    if (error instanceof WordPressAPIError) {
      return {
        success: false,
        message: error.message,
      };
    }
    
    return {
      success: false,
      message: '接続テストに失敗しました',
    };
  }
};

// 投稿の取得
export const getPosts = async (
  site: WordPressSite, 
  params: {
    per_page?: number;
    page?: number;
    status?: string;
    categories?: number[];
    tags?: number[];
    search?: string;
  } = {}
): Promise<WordPressPost[]> => {
  const queryParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      if (Array.isArray(value)) {
        queryParams.append(key, value.join(','));
      } else {
        queryParams.append(key, String(value));
      }
    }
  });

  const endpoint = `${WP_ENDPOINTS.POSTS}?${queryParams.toString()}`;
  return makeRequest<WordPressPost[]>(site, endpoint);
};

// 投稿の作成
export const createPost = async (
  site: WordPressSite,
  postData: {
    title: string;
    content: string;
    excerpt?: string;
    categories?: number[];
    tags?: number[];
    status?: 'draft' | 'publish' | 'private' | 'pending' | 'future';
    date?: string; // 予約投稿用の日時
    meta?: Record<string, any>;
    featured_media?: number;
    slug?: string;
  }
): Promise<WordPressPost> => {
  // 投稿データのログ出力
  console.log('Creating post with data:', {
    ...postData,
    content: postData.content ? `${postData.content.substring(0, 100)}...` : ''
  });
  
  try {
    return await makeRequest<WordPressPost>(site, WP_ENDPOINTS.POSTS, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(postData),
    });
  } catch (error) {
    console.error('Post creation failed:', error);
    console.error('Post data was:', postData);
    throw error;
  }
};

// 予約投稿の取得
export const getScheduledPosts = async (
  site: WordPressSite,
  params: {
    per_page?: number;
    page?: number;
    orderby?: 'date' | 'id' | 'title';
    order?: 'asc' | 'desc';
  } = {}
): Promise<WordPressPost[]> => {
  const queryParams = new URLSearchParams({
    status: 'future',
    per_page: '20',
    orderby: 'date',
    order: 'asc',
    ...Object.fromEntries(
      Object.entries(params).map(([key, value]) => [key, String(value)])
    ),
  });
  
  const endpoint = `${WP_ENDPOINTS.POSTS}?${queryParams.toString()}`;
  return makeRequest<WordPressPost[]>(site, endpoint);
};

// 投稿の更新
export const updatePost = async (
  site: WordPressSite,
  postId: number,
  postData: Partial<{
    title: string;
    content: string;
    excerpt: string;
    categories: number[];
    tags: number[];
    status: 'draft' | 'publish' | 'private' | 'pending';
    meta: Record<string, any>;
    featured_media: number;
    slug: string;
  }>
): Promise<WordPressPost> => {
  return makeRequest<WordPressPost>(site, `${WP_ENDPOINTS.POSTS}/${postId}`, {
    method: 'PUT',
    body: JSON.stringify(postData),
  });
};

// 投稿の削除
export const deletePost = async (
  site: WordPressSite,
  postId: number,
  force: boolean = false
): Promise<{ deleted: boolean; previous: WordPressPost }> => {
  const endpoint = `${WP_ENDPOINTS.POSTS}/${postId}${force ? '?force=true' : ''}`;
  return makeRequest(site, endpoint, { method: 'DELETE' });
};

// カテゴリーの取得
export const getCategories = async (
  site: WordPressSite,
  params: { per_page?: number; hide_empty?: boolean } = {}
): Promise<WordPressCategory[]> => {
  const queryParams = new URLSearchParams({
    per_page: '100',
    hide_empty: 'false',
    ...Object.fromEntries(
      Object.entries(params).map(([key, value]) => [key, String(value)])
    ),
  });

  const endpoint = `${WP_ENDPOINTS.CATEGORIES}?${queryParams.toString()}`;
  return makeRequest<WordPressCategory[]>(site, endpoint);
};

// カテゴリーの作成
export const createCategory = async (
  site: WordPressSite,
  categoryData: {
    name: string;
    description?: string;
    parent?: number;
    slug?: string;
  }
): Promise<WordPressCategory> => {
  return makeRequest<WordPressCategory>(site, WP_ENDPOINTS.CATEGORIES, {
    method: 'POST',
    body: JSON.stringify(categoryData),
  });
};

// タグの取得
export const getTags = async (
  site: WordPressSite,
  params: { per_page?: number; hide_empty?: boolean } = {}
): Promise<WordPressTag[]> => {
  const queryParams = new URLSearchParams({
    per_page: '100',
    hide_empty: 'false',
    ...Object.fromEntries(
      Object.entries(params).map(([key, value]) => [key, String(value)])
    ),
  });

  const endpoint = `${WP_ENDPOINTS.TAGS}?${queryParams.toString()}`;
  return makeRequest<WordPressTag[]>(site, endpoint);
};

// タグの作成
export const createTag = async (
  site: WordPressSite,
  tagData: {
    name: string;
    description?: string;
    slug?: string;
  }
): Promise<WordPressTag> => {
  return makeRequest<WordPressTag>(site, WP_ENDPOINTS.TAGS, {
    method: 'POST',
    body: JSON.stringify(tagData),
  });
};

// サイト分析の実行
export const analyzeSite = async (
  site: WordPressSite,
  options: {
    postCount?: number;
    includeStats?: boolean;
  } = {}
): Promise<SiteAnalysis> => {
  try {
    const { postCount = 50 } = options;
    
    // 並行してデータを取得（メタ情報も含む）
    const [categories, tags, recentPosts] = await Promise.all([
      getCategories(site),
      getTags(site),
      getPosts(site, { 
        per_page: postCount, 
        status: 'publish',
        _embed: true // 埋め込み情報を含む
      }),
    ]);

    // 基本統計を計算
    const totalWords = recentPosts.reduce((total, post) => {
      const plainText = post.content.rendered.replace(/<[^>]*>/g, '');
      return total + plainText.length;
    }, 0);

    const averagePostLength = recentPosts.length > 0 
      ? Math.round(totalWords / recentPosts.length) 
      : 0;

    // よく使われるキーワードを抽出（簡易実装）
    const allText = recentPosts.map(post => 
      post.title.rendered + ' ' + post.content.rendered.replace(/<[^>]*>/g, '')
    ).join(' ');
    
    const words = allText.toLowerCase().match(/\b\w{3,}\b/g) || [];
    const wordCounts = words.reduce((acc, word) => {
      acc[word] = (acc[word] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const commonKeywords = Object.entries(wordCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([word]) => word);

    // メタディスクリプション抽出
    const metaDescriptions = recentPosts
      .map(post => {
        // Yoast SEO のメタディスクリプション
        if (post.yoast_head_json?.description) {
          return post.yoast_head_json.description;
        }
        // 抜粋から生成
        if (post.excerpt.rendered) {
          return post.excerpt.rendered.replace(/<[^>]*>/g, '').trim();
        }
        // コンテンツの最初の160文字
        const plainContent = post.content.rendered.replace(/<[^>]*>/g, '').trim();
        return plainContent.substring(0, 160) + (plainContent.length > 160 ? '...' : '');
      })
      .filter(desc => desc.length > 10); // 短すぎる説明は除外

    // タイトルパターン分析
    const titlePatterns = analyzeTitlePatterns(recentPosts);

    // コンテンツ構造分析
    const contentStructure = analyzeContentStructure(recentPosts);

    return {
      siteId: site.id,
      categories,
      tags,
      recentPosts,
      analyzedAt: new Date().toISOString(),
      postCount: recentPosts.length,
      averagePostLength,
      commonKeywords,
      metaDescriptions,
      titlePatterns,
      contentStructure,
    };
  } catch (error) {
    if (error instanceof WordPressAPIError) {
      throw error;
    }
    
    throw new WordPressAPIError(
      'ANALYSIS_ERROR',
      'サイト分析中にエラーが発生しました',
      error
    );
  }
};

// タイトルパターンを分析
const analyzeTitlePatterns = (posts: WordPressPost[]): string[] => {
  const patterns: Record<string, number> = {};
  
  posts.forEach(post => {
    const title = post.title.rendered;
    
    // 疑問形パターン
    if (title.includes('？') || title.includes('?')) {
      patterns['疑問形'] = (patterns['疑問形'] || 0) + 1;
    }
    
    // 方法・手順系
    if (title.includes('方法') || title.includes('やり方') || title.includes('手順')) {
      patterns['How-to系'] = (patterns['How-to系'] || 0) + 1;
    }
    
    // まとめ系
    if (title.includes('まとめ') || title.includes('総まとめ')) {
      patterns['まとめ系'] = (patterns['まとめ系'] || 0) + 1;
    }
    
    // 比較系
    if (title.includes('比較') || title.includes('vs') || title.includes('VS')) {
      patterns['比較系'] = (patterns['比較系'] || 0) + 1;
    }
    
    // 数字入り
    if (/\d+/.test(title)) {
      patterns['数字入り'] = (patterns['数字入り'] || 0) + 1;
    }
    
    // 感嘆符
    if (title.includes('！') || title.includes('!')) {
      patterns['感嘆符付き'] = (patterns['感嘆符付き'] || 0) + 1;
    }
  });
  
  return Object.entries(patterns)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([pattern, count]) => `${pattern} (${count}個)`);
};

// コンテンツ構造を分析
const analyzeContentStructure = (posts: WordPressPost[]): {
  averageHeadingCount: number;
  commonHeadingPatterns: string[];
} => {
  let totalHeadings = 0;
  const headingPatterns: Record<string, number> = {};
  
  posts.forEach(post => {
    const content = post.content.rendered;
    
    // 見出しタグを抽出
    const headings = content.match(/<h[1-6][^>]*>.*?<\/h[1-6]>/gi) || [];
    totalHeadings += headings.length;
    
    // 見出しの内容を分析
    headings.forEach(heading => {
      const text = heading.replace(/<[^>]*>/g, '').trim();
      
      if (text.includes('とは') || text.includes('とは？')) {
        headingPatterns['定義・概要系'] = (headingPatterns['定義・概要系'] || 0) + 1;
      }
      if (text.includes('メリット') || text.includes('利点')) {
        headingPatterns['メリット系'] = (headingPatterns['メリット系'] || 0) + 1;
      }
      if (text.includes('デメリット') || text.includes('注意')) {
        headingPatterns['注意・デメリット系'] = (headingPatterns['注意・デメリット系'] || 0) + 1;
      }
      if (text.includes('まとめ') || text.includes('結論')) {
        headingPatterns['まとめ系'] = (headingPatterns['まとめ系'] || 0) + 1;
      }
      if (text.includes('手順') || text.includes('ステップ') || /\d+\./.test(text)) {
        headingPatterns['手順系'] = (headingPatterns['手順系'] || 0) + 1;
      }
    });
  });
  
  const averageHeadingCount = posts.length > 0 ? Math.round(totalHeadings / posts.length) : 0;
  
  const commonHeadingPatterns = Object.entries(headingPatterns)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([pattern, count]) => `${pattern} (${count}個)`);
  
  return {
    averageHeadingCount,
    commonHeadingPatterns,
  };
};

// メディア（画像）の取得
export const getMedia = async (
  site: WordPressSite,
  params: { per_page?: number; media_type?: string } = {}
): Promise<any[]> => {
  const queryParams = new URLSearchParams({
    per_page: '20',
    ...Object.fromEntries(
      Object.entries(params).map(([key, value]) => [key, String(value)])
    ),
  });

  const endpoint = `${WP_ENDPOINTS.MEDIA}?${queryParams.toString()}`;
  return makeRequest<any[]>(site, endpoint);
};

// エラーハンドリングヘルパー
export const handleWordPressError = (error: unknown): APIError => {
  if (error instanceof WordPressAPIError) {
    return {
      code: error.code,
      message: error.message,
      details: error.details,
      timestamp: new Date().toISOString(),
    };
  }

  return {
    code: 'UNKNOWN_ERROR',
    message: 'WordPress APIエラーが発生しました',
    details: error,
    timestamp: new Date().toISOString(),
  };
};


export default {
  discoverRestAPI,
  testSiteConnection,
  testWordPressConnection,
  getPosts,
  createPost,
  updatePost,
  deletePost,
  getCategories,
  createCategory,
  getTags,
  createTag,
  analyzeSite,
  getMedia,
  handleWordPressError,
};