// APIレート制限とキャッシュ管理のクラス
class ApiRateLimiter {
  constructor() {
    this.MAX_REQUESTS_PER_MINUTE = 10; // 50から10に削減
    this.CACHE_DURATION = 5 * 60 * 1000; // 5分間
    this.GLOBAL_CACHE_KEY = 'fanza_global_cache';
  }

  // APIリクエストが可能かチェック
  canMakeRequest() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    const requests = this.getRequests();
    const recentRequests = requests.filter(time => time > oneMinuteAgo);
    
    if (recentRequests.length >= this.MAX_REQUESTS_PER_MINUTE) {
      console.log(`API rate limit reached: ${recentRequests.length}/${this.MAX_REQUESTS_PER_MINUTE} requests in the last minute`);
      return false;
    }
    
    return true;
  }

  // リクエストを記録
  recordRequest() {
    const requests = this.getRequests();
    requests.push(Date.now());
    // 1分以上前の記録は削除
    const filtered = requests.filter(time => time > Date.now() - 60000);
    localStorage.setItem('fanza_api_requests', JSON.stringify(filtered));
  }

  // リクエスト履歴を取得
  getRequests() {
    const stored = localStorage.getItem('fanza_api_requests');
    return stored ? JSON.parse(stored) : [];
  }

  // キャッシュデータを取得
  getCachedData(key) {
    const cached = localStorage.getItem(`fanza_cache_${key}`);
    if (!cached) return null;
    
    try {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp > this.CACHE_DURATION) {
        localStorage.removeItem(`fanza_cache_${key}`);
        return null;
      }
      
      console.log('Using cached data for key:', key);
      return data;
    } catch (error) {
      console.error('Error parsing cached data:', error);
      return null;
    }
  }

  // キャッシュにデータを保存
  setCachedData(key, data) {
    try {
      localStorage.setItem(`fanza_cache_${key}`, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.error('Error saving to cache:', error);
      // ストレージが満杯の場合は古いキャッシュを削除
      this.clearOldCache();
    }
  }

  // グローバルキャッシュに動画を追加
  addToGlobalCache(videos) {
    try {
      const globalCache = this.getGlobalCache();
      
      // 重複を避けるため、IDでフィルタリング
      const existingIds = new Set(globalCache.map(v => v.id));
      const newVideos = videos.filter(v => !existingIds.has(v.id));
      
      // 新しい動画を追加（最大500件まで保持）
      const updatedCache = [...globalCache, ...newVideos].slice(-500);
      
      localStorage.setItem(this.GLOBAL_CACHE_KEY, JSON.stringify({
        videos: updatedCache,
        timestamp: Date.now()
      }));
      
      console.log(`Added ${newVideos.length} new videos to global cache. Total: ${updatedCache.length}`);
    } catch (error) {
      console.error('Error adding to global cache:', error);
    }
  }

  // グローバルキャッシュから動画を取得
  getGlobalCache() {
    try {
      const cached = localStorage.getItem(this.GLOBAL_CACHE_KEY);
      if (!cached) return [];
      
      const { videos, timestamp } = JSON.parse(cached);
      
      // キャッシュが古すぎる場合はクリア
      if (Date.now() - timestamp > 24 * 60 * 60 * 1000) { // 24時間
        localStorage.removeItem(this.GLOBAL_CACHE_KEY);
        return [];
      }
      
      return videos || [];
    } catch (error) {
      console.error('Error getting global cache:', error);
      return [];
    }
  }

  // ランダムな動画を取得（レート制限時の代替）
  getRandomVideosFromCache(count = 20) {
    const globalCache = this.getGlobalCache();
    if (globalCache.length === 0) return [];
    
    // ランダムに動画を選択
    const shuffled = [...globalCache].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  // 古いキャッシュをクリア
  clearOldCache() {
    const keys = Object.keys(localStorage);
    const now = Date.now();
    let cleared = 0;
    
    keys.forEach(key => {
      if (key.startsWith('fanza_cache_')) {
        try {
          const cached = JSON.parse(localStorage.getItem(key));
          if (cached.timestamp && now - cached.timestamp > this.CACHE_DURATION) {
            localStorage.removeItem(key);
            cleared++;
          }
        } catch (error) {
          // パースエラーの場合は削除
          localStorage.removeItem(key);
          cleared++;
        }
      }
    });
    
    if (cleared > 0) {
      console.log(`Cleared ${cleared} old cache entries`);
    }
  }

  // レート制限情報を取得
  getRateLimitInfo() {
    const requests = this.getRequests();
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    const recentRequests = requests.filter(time => time > oneMinuteAgo);
    
    return {
      used: recentRequests.length,
      limit: this.MAX_REQUESTS_PER_MINUTE,
      remaining: Math.max(0, this.MAX_REQUESTS_PER_MINUTE - recentRequests.length),
      resetTime: recentRequests.length > 0 ? new Date(Math.min(...recentRequests) + 60000) : null
    };
  }
}

export default ApiRateLimiter;
