const {onCall, HttpsError} = require('firebase-functions/v2/https');
const {logger} = require('firebase-functions');
const {defineSecret} = require('firebase-functions/params');
const axios = require('axios');

// Secret Manager環境変数定義
const fanzaApiId = defineSecret('FANZA_API_ID');
const fanzaAffiliateId = defineSecret('FANZA_AFFILIATE_ID');

// FANZA API設定
const FANZA_CONFIG = {
  BASE_URL: 'https://api.dmm.com/affiliate/v3/ItemList',
  SITE: 'FANZA',
  SERVICE: 'digital',
  FLOOR: 'videoa',
  OUTPUT: 'json'
};

// レート制限とキャッシュ管理
let requestCache = new Map();
let requestTimes = [];
const MAX_REQUESTS_PER_MINUTE = 10;
const CACHE_DURATION = 5 * 60 * 1000; // 5分間

// レート制限チェック
const canMakeRequest = () => {
  const now = Date.now();
  const oneMinuteAgo = now - 60000;
  requestTimes = requestTimes.filter(time => time > oneMinuteAgo);
  return requestTimes.length < MAX_REQUESTS_PER_MINUTE;
};

// リクエスト記録
const recordRequest = () => {
  requestTimes.push(Date.now());
};

// キャッシュチェック
const getCachedData = (key) => {
  const cached = requestCache.get(key);
  if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
    return cached.data;
  }
  if (cached) {
    requestCache.delete(key);
  }
  return null;
};

// キャッシュ保存
const setCachedData = (key, data) => {
  requestCache.set(key, {
    data,
    timestamp: Date.now()
  });
};

// 動画URL生成関数
const generateDirectVideoUrl = (content_id) => {
  return `https://cc3001.dmm.co.jp/litevideo/freepv/${content_id.slice(0,1)}/${content_id.slice(0,3)}/${content_id}/${content_id}_mhb_w.mp4`;
};

const generateIframeUrl = (content_id) => {
  return `https://www.dmm.co.jp/litevideo/-/player/=/title=player/cid=${content_id}/`;
};

// FANZA API呼び出し関数
exports.getFanzaVideos = onCall(
  { 
    secrets: [fanzaApiId, fanzaAffiliateId],
    region: 'asia-northeast1',
    maxInstances: 100
  },
  async (request) => {
    try {
      const {hits = 5, offset = 1, keyword} = request.data;

      // Secret Manager環境変数から認証情報を取得（すべての空白文字を削除）
      const API_ID = fanzaApiId.value().replace(/\s+/g, '');
      const AFFILIATE_ID = fanzaAffiliateId.value().replace(/\s+/g, '');

      if (!API_ID || !AFFILIATE_ID) {
        logger.error('FANZA API credentials not configured');
        throw new HttpsError('failed-precondition', 'API credentials not configured');
      }
      

      // キャッシュキー生成
    const cacheKey = JSON.stringify({hits, offset, keyword});
    const cachedData = getCachedData(cacheKey);
    
    if (cachedData) {
        return {success: true, data: cachedData};
    }

    // レート制限チェック
    if (!canMakeRequest()) {
      logger.warn('Rate limit exceeded', {requestCount: requestTimes.length});
      throw new HttpsError('resource-exhausted', 'API rate limit exceeded');
    }

    // APIパラメータ構築
    const params = {
      api_id: API_ID,
      affiliate_id: AFFILIATE_ID,
      site: FANZA_CONFIG.SITE,
      service: FANZA_CONFIG.SERVICE,
      floor: FANZA_CONFIG.FLOOR,
      hits,
      offset,
      output: FANZA_CONFIG.OUTPUT
    };

    if (keyword) {
      params.keyword = keyword;
    }


    // FANZA API呼び出し
    const response = await axios.get(FANZA_CONFIG.BASE_URL, {
      params,
      timeout: 10000
    });

    recordRequest();

    if (response.data.result && response.data.result.items) {
      const items = response.data.result.items;
      
      // 結果をマップ
      const mappedItems = items.map(item => {
        let videoUrl = null;
        if (item.content_id) {
          videoUrl = generateDirectVideoUrl(item.content_id);
        }
        
        return {
          id: item.content_id,
          title: item.title,
          thumbnail: item.imageURL ? item.imageURL.large || item.imageURL.small : null,
          videoUrl: videoUrl,
          iframeUrl: item.content_id ? generateIframeUrl(item.content_id) : null,
          duration: item.volume || 'N/A',
          genre: item.iteminfo ? item.iteminfo.genre?.map(g => g.name) || [] : [],
          actress: item.iteminfo ? item.iteminfo.actress?.[0]?.name || 'Unknown' : 'Unknown',
          likes: Math.floor(Math.random() * 5000) + 100,
          views: Math.floor(Math.random() * 50000) + 1000,
          clips: [],
          productUrl: item.affiliateURL || `https://www.dmm.co.jp/digital/videoa/-/detail/=/cid=${item.content_id}/`,
          price: item.prices ? `¥${item.prices.price?.replace('円', '') || item.prices.list_price?.replace('円', '') || '2,980'}` : '¥2,980',
          originalPrice: item.prices ? `¥${parseInt((item.prices.price || item.prices.list_price || '2980').replace('円', '')) + 1000}` : '¥3,980',
          saleEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          rating: (Math.random() * 2 + 3).toFixed(1),
          reviewCount: Math.floor(Math.random() * 500) + 50
        };
      });

      // キャッシュに保存
      setCachedData(cacheKey, mappedItems);

      return {success: true, data: mappedItems};

    } else {
      logger.error('Invalid FANZA API response', response.data);
      throw new HttpsError('internal', 'Invalid API response');
    }

  } catch (error) {
    logger.error('FANZA API request failed', error);
    
    if (error instanceof HttpsError) {
      throw error;
    }
    
    // 400 Bad Requestエラーの詳細な処理
    if (error.response && error.response.status === 400) {
      logger.error('400 Bad Request from FANZA API', {
        errorMessage: error.response.data?.result?.message || 'No error message'
      });
      
      // APIからのエラーメッセージを含める
      const apiErrorMessage = error.response.data?.result?.message || '認証情報を確認してください';
      throw new HttpsError('invalid-argument', `FANZA API エラー: ${apiErrorMessage}`);
    }
    
    if (error.code === 'ECONNABORTED') {
      throw new HttpsError('deadline-exceeded', 'API request timeout');
    }
    
    throw new HttpsError('internal', 'API request failed');
  }
});

// ヘルスチェック用
exports.healthCheck = onCall(
  { 
    region: 'asia-northeast1',
    maxInstances: 100
  },
  async (request) => {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    const currentRequests = requestTimes.filter(time => time > oneMinuteAgo);
    
    return {
      success: true,
      timestamp: new Date().toISOString(),
      rateLimit: {
        used: currentRequests.length,
        limit: MAX_REQUESTS_PER_MINUTE,
        remaining: Math.max(0, MAX_REQUESTS_PER_MINUTE - currentRequests.length)
      }
    };
  }
);
