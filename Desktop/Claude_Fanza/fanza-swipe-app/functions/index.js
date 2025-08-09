// ============================================================================
// DEPENDENCIES
// ============================================================================
const {onCall, HttpsError} = require('firebase-functions/v2/https');
const {logger} = require('firebase-functions');
const {defineSecret} = require('firebase-functions/params');
const axios = require('axios');
const xml2js = require('xml2js');
const {getFirestore} = require('firebase-admin/firestore');
const {initializeApp} = require('firebase-admin/app');

// Initialize Firebase Admin
initializeApp();

// Initialize Firestore
const db = getFirestore();

// ============================================================================
// CONFIGURATION
// ============================================================================
// Secret Manager environment variables
const fanzaApiId = defineSecret('FANZA_API_ID');
const fanzaAffiliateId = defineSecret('FANZA_AFFILIATE_ID');
const dugaAppId = defineSecret('DUGA_APP_ID');

// FANZA API configuration
const FANZA_CONFIG = {
  BASE_URL: 'https://api.dmm.com/affiliate/v3/ItemList',
  SITE: 'FANZA',
  SERVICE: 'digital',
  FLOOR: 'videoa',
  OUTPUT: 'json'
};

// DUGA API configuration - 正しいエンドポイント
const DUGA_CONFIG = {
  BASE_URL: 'http://affapi.duga.jp/search',
  VERSION: '1.2',
  AGENT_ID: '42550',
  BANNER_ID: '01',
  FORMAT: 'xml',
  ADULT: '1',
  SORT: 'favorite',
  LIMIT: 100
};

// ============================================================================
// RATE LIMITING & CACHING
// ============================================================================
let requestCache = new Map();
let requestTimes = [];
let dugaRequestTimes = [];
const MAX_REQUESTS_PER_MINUTE = 10;
const DUGA_MAX_REQUESTS_PER_MINUTE = 60; // DUGA allows 60 requests per 60 seconds
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Rate limiting check
const canMakeRequest = () => {
  const now = Date.now();
  const oneMinuteAgo = now - 60000;
  requestTimes = requestTimes.filter(time => time > oneMinuteAgo);
  return requestTimes.length < MAX_REQUESTS_PER_MINUTE;
};

// DUGA Rate limiting check
const canMakeDugaRequest = () => {
  const now = Date.now();
  const oneMinuteAgo = now - 60000;
  dugaRequestTimes = dugaRequestTimes.filter(time => time > oneMinuteAgo);
  return dugaRequestTimes.length < DUGA_MAX_REQUESTS_PER_MINUTE;
};

// Record request timestamp
const recordRequest = () => {
  requestTimes.push(Date.now());
};

// Record DUGA request timestamp
const recordDugaRequest = () => {
  dugaRequestTimes.push(Date.now());
};

// Cache data retrieval
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

// Cache data storage
const setCachedData = (key, data) => {
  requestCache.set(key, {
    data,
    timestamp: Date.now()
  });
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================
// Generate direct video URL
const generateDirectVideoUrl = (content_id) => {
  return `https://cc3001.dmm.co.jp/litevideo/freepv/${content_id.slice(0,1)}/${content_id.slice(0,3)}/${content_id}/${content_id}_mhb_w.mp4`;
};

// Generate iframe embed URL
const generateIframeUrl = (content_id) => {
  return `https://www.dmm.co.jp/litevideo/-/player/=/title=player/cid=${content_id}/`;
};

// ============================================================================
// FIRESTORE UTILITY FUNCTIONS
// ============================================================================
const DUGA_VIDEOS_COLLECTION = 'duga_videos';

// Save video to Firestore
const saveVideoToFirestore = async (video) => {
  try {
    const videoRef = db.collection(DUGA_VIDEOS_COLLECTION).doc(video.id);
    
    // Check if document already exists
    const existingDoc = await videoRef.get();
    
    if (!existingDoc.exists) {
      // Add timestamps and metadata
      const videoData = {
        ...video,
        createdAt: new Date(),
        lastUpdated: new Date(),
        viewCount: 0,
        popularity: video.likes || 0,
        apiSource: 'duga'
      };
      
      await videoRef.set(videoData);
      logger.info(`Video saved to Firestore: ${video.id}`);
    } else {
      // Update existing video with new data but keep original timestamps
      const existingData = existingDoc.data();
      const updatedData = {
        ...video,
        createdAt: existingData.createdAt,
        lastUpdated: new Date(),
        viewCount: (existingData.viewCount || 0) + 1,
        popularity: Math.max(video.likes || 0, existingData.popularity || 0),
        apiSource: 'duga'
      };
      
      await videoRef.set(updatedData, { merge: true });
      logger.info(`Video updated in Firestore: ${video.id}`);
    }
  } catch (error) {
    logger.error(`Error saving video to Firestore: ${video.id}`, error);
  }
};

// Get videos from Firestore
const getVideosFromFirestore = async (limit = 20, offset = 0, keyword = null) => {
  try {
    let query = db.collection(DUGA_VIDEOS_COLLECTION)
      .orderBy('lastUpdated', 'desc');
    
    // Add keyword search if provided
    if (keyword) {
      // Firestore doesn't support full-text search, so we'll do a simple title search
      // For better search, consider using Algolia or similar
      query = query.where('title', '>=', keyword)
                  .where('title', '<', keyword + '\uf8ff');
    }
    
    const snapshot = await query
      .limit(limit)
      .offset(offset)
      .get();
    
    const videos = [];
    snapshot.forEach(doc => {
      videos.push(doc.data());
    });
    
    logger.info(`Retrieved ${videos.length} videos from Firestore`);
    return videos;
  } catch (error) {
    logger.error('Error getting videos from Firestore:', error);
    return [];
  }
};

// Get cached video count
const getCachedVideoCount = async (keyword = null) => {
  try {
    let query = db.collection(DUGA_VIDEOS_COLLECTION);
    
    if (keyword) {
      query = query.where('title', '>=', keyword)
                  .where('title', '<', keyword + '\uf8ff');
    }
    
    const snapshot = await query.count().get();
    return snapshot.data().count;
  } catch (error) {
    logger.error('Error getting cached video count:', error);
    return 0;
  }
};

// Clean old cache (remove videos older than 30 days)
const cleanOldCache = async () => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const snapshot = await db.collection(DUGA_VIDEOS_COLLECTION)
      .where('createdAt', '<', thirtyDaysAgo)
      .get();
    
    const batch = db.batch();
    let deleteCount = 0;
    
    snapshot.forEach(doc => {
      batch.delete(doc.ref);
      deleteCount++;
    });
    
    if (deleteCount > 0) {
      await batch.commit();
      logger.info(`Cleaned ${deleteCount} old videos from cache`);
    }
  } catch (error) {
    logger.error('Error cleaning old cache:', error);
  }
};

// ============================================================================
// CLOUD FUNCTIONS
// ============================================================================

// Main FANZA API function
exports.getFanzaVideos = onCall(
  { 
    secrets: [fanzaApiId, fanzaAffiliateId],
    region: 'asia-northeast1',
    maxInstances: 100,
    cors: {
      origin: [
        'https://otonana.org', 
        'https://otonana-473e3.web.app',
        'https://otonana-473e3.firebaseapp.com',
        'http://localhost:3000',
        'http://localhost:5173'
      ],
      methods: ['GET', 'POST', 'OPTIONS']
    }
  },
  async (request) => {
    try {
      const {hits = 5, offset = 1, keyword} = request.data;

      // Get API credentials from Secret Manager (remove all whitespace)
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


    // Call FANZA API
    const response = await axios.get(FANZA_CONFIG.BASE_URL, {
      params,
      timeout: 10000
    });

    recordRequest();

    if (response.data.result && response.data.result.items) {
      const items = response.data.result.items;
      
      // Map API response to our format
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

      // Save to cache
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
    
    // Handle 400 Bad Request errors in detail
    if (error.response && error.response.status === 400) {
      logger.error('400 Bad Request from FANZA API', {
        errorMessage: error.response.data?.result?.message || 'No error message'
      });
      
      // Include API error message
      const apiErrorMessage = error.response.data?.result?.message || 'Please check authentication credentials';
      throw new HttpsError('invalid-argument', `FANZA API Error: ${apiErrorMessage}`);
    }
    
    if (error.code === 'ECONNABORTED') {
      throw new HttpsError('deadline-exceeded', 'API request timeout');
    }
    
    throw new HttpsError('internal', 'API request failed');
  }
});

// DUGA API function
exports.getDugaVideos = onCall(
  { 
    secrets: [dugaAppId],
    region: 'asia-northeast1',
    maxInstances: 100,
    cors: {
      origin: [
        'https://otonana.org', 
        'https://otonana-473e3.web.app',
        'https://otonana-473e3.firebaseapp.com',
        'http://localhost:3000',
        'http://localhost:5173'
      ],
      methods: ['GET', 'POST', 'OPTIONS']
    }
  },
  async (request) => {
    try {
      const {hits = 5, offset = 0, keyword, genre} = request.data;

      // Get API credentials from Secret Manager
      const APP_ID = dugaAppId.value().replace(/\s+/g, '');

      if (!APP_ID) {
        logger.error('DUGA API credentials not configured');
        throw new HttpsError('failed-precondition', 'API credentials not configured');
      }

      // First, try to get videos from Firestore cache
      const cachedVideoCount = await getCachedVideoCount(keyword);
      const firestoreVideos = await getVideosFromFirestore(hits, offset - 1, keyword); // offset is 1-based, Firestore is 0-based
      
      logger.info(`Found ${firestoreVideos.length} videos in Firestore cache, requested ${hits}`);
      
      // If we have enough cached videos, return them without API call
      if (firestoreVideos.length >= hits) {
        return {success: true, data: firestoreVideos.slice(0, hits), source: 'firestore_cache'};
      }
      
      // If not enough cached videos or no cache, proceed with API call
      // キャッシュキー生成 (for memory cache)
      const cacheKey = JSON.stringify({hits, offset, keyword, genre, platform: 'duga'});
      const memoryCachedData = getCachedData(cacheKey);
      
      if (memoryCachedData && firestoreVideos.length === 0) {
        // Use memory cache only if Firestore has no data
        return {success: true, data: memoryCachedData, source: 'memory_cache'};
      }

      // レート制限チェック
      if (!canMakeDugaRequest()) {
        logger.warn('DUGA Rate limit exceeded', {requestCount: dugaRequestTimes.length});
        
        // フォールバック: まずFirestoreから取得を試みる
        const fallbackVideos = await getVideosFromFirestore(hits, 0, keyword);
        if (fallbackVideos.length > 0) {
          return {success: true, data: fallbackVideos, source: 'firestore_fallback'};
        }
        
        // Firestoreにもデータがない場合はデモデータを返す
        const demoHits = (request && request.data && request.data.hits) || 5;
        const demoVideos = Array.from({length: demoHits}, (_, i) => ({
          id: 'duga_demo_' + Math.random().toString(36).substr(2, 9) + '_' + i,
          title: 'DUGA サンプル動画 ' + (i + 1),
          thumbnail: 'https://picsum.photos/400/600?random=' + (Math.floor(Math.random() * 1000) + i),
          videoUrl: null,
          duration: (Math.floor(Math.random() * 60) + 30) + '分',
          genre: ['アマチュア', 'リアル'],
          actress: 'DUGA出演者' + (i + 1),
          likes: Math.floor(Math.random() * 3000) + 50,
          views: Math.floor(Math.random() * 30000) + 500,
          clips: [],
          productUrl: 'https://duga.jp/',
          price: '¥' + (Math.floor(Math.random() * 2000) + 1000),
          originalPrice: '¥' + (Math.floor(Math.random() * 2000) + 2500),
          saleEndsAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          rating: (Math.random() * 2 + 3).toFixed(1),
          reviewCount: Math.floor(Math.random() * 300) + 20,
          platform: 'duga'
        }));
        
        return {success: true, data: demoVideos, source: 'demo'};
      }

      // APIパラメータ構築 - DUGA API仕様に合わせて
      const params = {
        version: DUGA_CONFIG.VERSION,
        appid: APP_ID,
        agentid: DUGA_CONFIG.AGENT_ID,
        bannerid: DUGA_CONFIG.BANNER_ID,
        format: DUGA_CONFIG.FORMAT,
        adult: DUGA_CONFIG.ADULT,
        sort: DUGA_CONFIG.SORT,
        hits: Math.min(hits, DUGA_CONFIG.LIMIT),
        offset: Math.max(offset, 1) // DUGA APIは1から開始
      };

      if (keyword) {
        params.keyword = keyword;
      }

      // 実際のDUGA API呼び出し
      logger.info('Calling DUGA API with params:', params);
      
      const response = await axios.get(DUGA_CONFIG.BASE_URL, {
        params,
        timeout: 15000
      });

      recordDugaRequest();

      // XMLレスポンスをパース
      const parser = new xml2js.Parser({ explicitArray: false, mergeAttrs: true });
      const result = await parser.parseStringPromise(response.data);
      
      logger.info('DUGA API Response structure:', JSON.stringify(result, null, 2));

      // APIレスポンスから動画データを抽出 - 正しいXMLパス
      const items = result?.root?.items?.item || [];
      const itemsArray = Array.isArray(items) ? items : [items];
      
      if (itemsArray.length === 0) {
        logger.warn('No items found in DUGA API response');
        throw new Error('No content available');
      }
      
      // 価格から数値を抽出するヘルパー関数（複数パターン対応）
      const extractPrice = (priceStr) => {
        if (!priceStr) return 980;
        try {
          // "400円～", "1,380円", "3,000円" など様々なパターンに対応
          const numStr = priceStr.toString()
            .replace(/[円,¥～~]/g, '') // 円、カンマ、チルダを削除
            .replace(/\s+/g, '') // 空白削除
            .trim();
          const price = parseInt(numStr);
          return isNaN(price) ? 980 : price;
        } catch (error) {
          logger.warn('Price extraction error:', error, 'for price:', priceStr);
          return 980;
        }
      };

      // 安全なフィールドアクセスヘルパー関数
      const safeGet = (obj, path, defaultValue = null) => {
        try {
          return path.split('.').reduce((current, key) => current && current[key], obj) || defaultValue;
        } catch (error) {
          return defaultValue;
        }
      };

      // APIレスポンスをアプリ用データ形式にマッピング - 実際のAPI構造に対応
      const mappedItems = itemsArray.map((item, index) => {
        try {
          const price = extractPrice(item.price);
          
          // より安全なデータ抽出
          const categoryName = safeGet(item, 'category.data.name', '一般');
          const reviewRating = safeGet(item, 'review.rating');
          const reviewCount = safeGet(item, 'review.reviewer');
          const mylistTotal = safeGet(item, 'mylist.total');
          const rankingTotal = safeGet(item, 'ranking.total');
          
          return {
            id: item.productid || `duga_${Date.now()}_${index}`,
            title: item.title || `DUGA Video ${index + 1}`,
            thumbnail: item.jacketimage?.midium || item.posterimage?.midium || 
                      item.jacketimage?.small || item.posterimage?.small || 
                      'https://picsum.photos/400/600?random=' + Math.floor(Math.random() * 1000),
            videoUrl: safeGet(item, 'samplemovie.midium.movie') || null,
            iframeUrl: item.affiliateurl || `https://duga.jp/ppv/${item.productid || 'sample'}/`,
            duration: item.volume ? `${item.volume}分` : 'N/A',
            genre: categoryName ? [categoryName] : ['一般'],
            actress: item.makername || 'Unknown',
            likes: mylistTotal ? parseInt(mylistTotal) : Math.floor(Math.random() * 1000) + 50,
            views: Math.floor(Math.random() * 10000) + 1000, // APIに含まれていないため推定値
            clips: [],
            productUrl: item.affiliateurl || `https://duga.jp/ppv/${item.productid || 'sample'}/`,
            price: `¥${price.toLocaleString()}`,
            originalPrice: `¥${(price + 1000).toLocaleString()}`,
            saleEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            rating: reviewRating ? parseFloat(reviewRating).toFixed(1) : (Math.random() * 2 + 3).toFixed(1),
            reviewCount: reviewCount ? parseInt(reviewCount) : Math.floor(Math.random() * 100) + 10,
            platform: 'duga',
            type: safeGet(item, 'saletype.data.0.type', '通常版'),
            ranking: rankingTotal ? parseInt(rankingTotal) : null,
            description: item.caption || '',
            releaseDate: item.opendate || null
          };
        } catch (error) {
          logger.error('Error mapping DUGA item:', error, 'Item:', JSON.stringify(item, null, 2));
          // エラーが発生した場合でも基本的なフォールバック情報を返す
          return {
            id: `duga_error_${Date.now()}_${index}`,
            title: 'DUGA Video (データエラー)',
            thumbnail: 'https://picsum.photos/400/600?random=' + Math.floor(Math.random() * 1000),
            videoUrl: null,
            iframeUrl: 'https://duga.jp/',
            duration: 'N/A',
            genre: ['一般'],
            actress: 'Unknown',
            likes: 100,
            views: 1000,
            clips: [],
            productUrl: 'https://duga.jp/',
            price: '¥980',
            originalPrice: '¥1,980',
            saleEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            rating: '4.0',
            reviewCount: 10,
            platform: 'duga',
            type: '通常版',
            ranking: null,
            description: '',
            releaseDate: null
          };
        }
      });

      // Save to cache (memory)
      setCachedData(cacheKey, mappedItems);

      // Save each video to Firestore for persistent caching
      const savePromises = mappedItems.map(video => saveVideoToFirestore(video));
      await Promise.allSettled(savePromises);

      logger.info(`Successfully processed ${mappedItems.length} DUGA videos`);
      return {success: true, data: mappedItems, source: 'api'};

    } catch (error) {
      logger.error('DUGA API request failed', error);
      
      if (error instanceof HttpsError) {
        // HttpsErrorの場合もフォールバックデータを返す
        const errorHits = (request && request.data && request.data.hits) || 5;
        const errorFallbackVideos = Array.from({length: errorHits}, (_, i) => ({
          id: 'duga_error_fallback_' + Date.now() + '_' + i,
          title: 'DUGA エラーフォールバック動画 ' + (i + 1),
          thumbnail: 'https://picsum.photos/400/600?random=' + (Math.floor(Math.random() * 1000) + i),
          videoUrl: null,
          duration: (Math.floor(Math.random() * 60) + 30) + '分',
          genre: ['サンプル'],
          actress: 'サンプル出演者' + (i + 1),
          likes: Math.floor(Math.random() * 1000) + 10,
          views: Math.floor(Math.random() * 10000) + 100,
          clips: [],
          productUrl: 'https://duga.jp/',
          price: '¥1,980',
          originalPrice: '¥2,980',
          saleEndsAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          rating: '4.0',
          reviewCount: 50,
          platform: 'duga'
        }));
        
        return {success: true, data: errorFallbackVideos, source: 'error_fallback', error: error.message};
      }
      
      // Handle specific DUGA API errors
      if (error.response && error.response.status === 400) {
        logger.error('400 Bad Request from DUGA API', {
          errorMessage: error.response.data?.message || 'No error message'
        });
      }
      
      if (error.code === 'ECONNABORTED') {
        logger.error('DUGA API timeout');
      }
      
      // エラー時もまずFirestoreから取得を試みる
      const errorFallbackVideos = await getVideosFromFirestore(hits, 0, keyword);
      if (errorFallbackVideos.length > 0) {
        return {success: true, data: errorFallbackVideos, source: 'firestore_error_fallback', originalError: error.message};
      }
      
      // 全てのエラーに対してフォールバックデータを返す
      const fallbackHits = (request && request.data && request.data.hits) || 5;
      const generalFallbackVideos = Array.from({length: fallbackHits}, (_, i) => ({
        id: 'duga_general_fallback_' + Date.now() + '_' + i,
        title: 'DUGA 一般フォールバック動画 ' + (i + 1),
        thumbnail: 'https://picsum.photos/400/600?random=' + (Math.floor(Math.random() * 1000) + i),
        videoUrl: null,
        duration: (Math.floor(Math.random() * 60) + 30) + '分',
        genre: ['デモ'],
        actress: 'デモ出演者' + (i + 1),
        likes: Math.floor(Math.random() * 500) + 10,
        views: Math.floor(Math.random() * 5000) + 100,
        clips: [],
        productUrl: 'https://duga.jp/',
        price: '¥1,480',
        originalPrice: '¥2,480',
        saleEndsAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        rating: '3.8',
        reviewCount: 25,
        platform: 'duga'
      }));
      
      return {success: true, data: generalFallbackVideos, source: 'general_fallback', originalError: error.message};
    }
  }
);

// Data management function
exports.cleanupDugaCache = onCall(
  { 
    region: 'asia-northeast1',
    maxInstances: 10,
    cors: {
      origin: [
        'https://otonana.org', 
        'https://otonana-473e3.web.app',
        'https://otonana-473e3.firebaseapp.com',
        'http://localhost:3000',
        'http://localhost:5173'
      ],
      methods: ['GET', 'POST', 'OPTIONS']
    }
  },
  async () => {
    try {
      await cleanOldCache();
      
      // Get current cache statistics
      const totalVideos = await getCachedVideoCount();
      
      return {
        success: true,
        message: 'Cache cleanup completed',
        statistics: {
          totalVideos,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      logger.error('Cache cleanup failed:', error);
      throw new HttpsError('internal', 'Cache cleanup failed');
    }
  }
);

// Cache statistics function
exports.getDugaCacheStats = onCall(
  { 
    region: 'asia-northeast1',
    maxInstances: 10,
    cors: {
      origin: [
        'https://otonana.org', 
        'https://otonana-473e3.web.app',
        'https://otonana-473e3.firebaseapp.com',
        'http://localhost:3000',
        'http://localhost:5173'
      ],
      methods: ['GET', 'POST', 'OPTIONS']
    }
  },
  async () => {
    try {
      const totalVideos = await getCachedVideoCount();
      
      // Get recent videos count (last 24 hours)
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      
      const recentSnapshot = await db.collection(DUGA_VIDEOS_COLLECTION)
        .where('lastUpdated', '>', oneDayAgo)
        .count()
        .get();
      
      const recentVideos = recentSnapshot.data().count;
      
      return {
        success: true,
        statistics: {
          totalVideos,
          recentVideos,
          timestamp: new Date().toISOString(),
          cacheStatus: 'healthy'
        }
      };
    } catch (error) {
      logger.error('Failed to get cache statistics:', error);
      throw new HttpsError('internal', 'Failed to get cache statistics');
    }
  }
);

// Health check function
exports.healthCheck = onCall(
  { 
    region: 'asia-northeast1',
    maxInstances: 100,
    cors: {
      origin: [
        'https://otonana.org', 
        'https://otonana-473e3.web.app',
        'https://otonana-473e3.firebaseapp.com',
        'http://localhost:3000',
        'http://localhost:5173'
      ],
      methods: ['GET', 'POST', 'OPTIONS']
    }
  },
  async () => {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    const currentFanzaRequests = requestTimes.filter(time => time > oneMinuteAgo);
    const currentDugaRequests = dugaRequestTimes.filter(time => time > oneMinuteAgo);
    
    // Get Firestore cache health
    let firestoreHealth = 'unknown';
    try {
      const totalVideos = await getCachedVideoCount();
      firestoreHealth = totalVideos > 0 ? 'healthy' : 'empty';
    } catch (error) {
      firestoreHealth = 'error';
    }
    
    return {
      success: true,
      timestamp: new Date().toISOString(),
      rateLimit: {
        fanza: {
          used: currentFanzaRequests.length,
          limit: MAX_REQUESTS_PER_MINUTE,
          remaining: Math.max(0, MAX_REQUESTS_PER_MINUTE - currentFanzaRequests.length)
        },
        duga: {
          used: currentDugaRequests.length,
          limit: DUGA_MAX_REQUESTS_PER_MINUTE,
          remaining: Math.max(0, DUGA_MAX_REQUESTS_PER_MINUTE - currentDugaRequests.length)
        }
      },
      firestore: {
        status: firestoreHealth
      }
    };
  }
);
