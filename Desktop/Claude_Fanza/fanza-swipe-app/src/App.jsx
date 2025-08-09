import React, { useState, useEffect } from 'react';
import VideoSwiper from './VideoSwiper';
import ProductDetailsModal from './ProductDetailsModal';
import OnboardingScreen from './OnboardingScreen';
import SearchPanel from './SearchPanel';
import SettingsPanel from './SettingsPanel';
import { Search, Settings, Info } from 'lucide-react';
import { getFunctions, httpsCallable, connectFunctionsEmulator } from 'firebase/functions';
import { initializeApp } from 'firebase/app';
import firebaseConfig from './config/firebase';
import { createFunctionsInstance, getFunctionsRegion } from './config/functions';
import ApiRateLimiter from './apiRateLimiter';
import { testFirebaseFunctions } from './utils/firebaseTest';

// Firebase初期化
const app = initializeApp(firebaseConfig);

// Cloud Functions設定（設定ファイルからリージョンを取得）
const functions = createFunctionsInstance(app);

// 開発環境でエミュレータを使用する場合のみ
if (import.meta.env.DEV && import.meta.env.VITE_USE_EMULATOR === 'true') {
  connectFunctionsEmulator(functions, 'localhost', 5001);
}

// Cloud Functions参照
const getFanzaVideos = httpsCallable(functions, 'getFanzaVideos');
const healthCheck = httpsCallable(functions, 'healthCheck');

// APIレート制限インスタンス
const rateLimiter = new ApiRateLimiter();

// ===== 動画URL生成関数 =====
const generateDirectVideoUrl = (content_id) => {
  // FANZAの直接動画URLパターン
  const patterns = [
    `https://cc3001.dmm.co.jp/litevideo/freepv/${content_id.slice(0,1)}/${content_id.slice(0,3)}/${content_id}/${content_id}_mhb_w.mp4`,
    `https://cc3001.dmm.co.jp/litevideo/freepv/${content_id.slice(0,1)}/${content_id.slice(0,3)}/${content_id}/${content_id}_dmb_w.mp4`,
    `https://cc3001.dmm.co.jp/litevideo/freepv/${content_id.slice(0,1)}/${content_id.slice(0,3)}/${content_id}/${content_id}_sm_w.mp4`
  ];
  // 最初のパターンを返す（他のパターンはフォールバック用）
  return patterns[0];
};

const generateIframeUrl = (content_id) => {
  // iframe埋め込み用URL
  return `https://www.dmm.co.jp/litevideo/-/player/=/title=player/cid=${content_id}/`;
};

// デモデータ
 const DEMO_VIDEOS = [
  {
    id: 'demo1',
    title: 'サンプル動画 1',
    thumbnail: 'https://picsum.photos/400/600?random=1',
    videoUrl: null,
    duration: '120分',
    genre: ['ドラマ', 'ロマンス'],
    actress: 'サンプル女優1',
    likes: 1234,
    views: 45678,
    clips: [],
    productUrl: '#',
    price: '¥2,980',
    originalPrice: '¥3,980',
    saleEndsAt: '2024-12-31',
    rating: '4.5',
    reviewCount: 234
  },
  {
    id: 'demo2',
    title: 'サンプル動画 2',
    thumbnail: 'https://picsum.photos/400/600?random=2',
    videoUrl: null,
    duration: '90分',
    genre: ['アクション', 'コメディ'],
    actress: 'サンプル女優2',
    likes: 2345,
    views: 56789,
    clips: [],
    productUrl: '#',
    price: '¥2,480',
    originalPrice: '¥3,480',
    saleEndsAt: '2024-12-31',
    rating: '4.2',
    reviewCount: 456
  },
  {
    id: 'demo3',
    title: 'サンプル動画 3',
    thumbnail: 'https://picsum.photos/400/600?random=3',
    videoUrl: null,
    duration: '150分',
    genre: ['サスペンス', 'ミステリー'],
    actress: 'サンプル女優3',
    likes: 3456,
    views: 67890,
    clips: [],
    productUrl: '#',
    price: '¥3,480',
    originalPrice: '¥4,480',
    saleEndsAt: '2024-12-31',
    rating: '4.8',
    reviewCount: 789
  }
];

const FanzaSwipeApp = () => {
  // ===== 状態管理 =====
  const [user, setUser] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  // const [currentVideoIndex, setCurrentVideoIndex] = useState(0); // VideoSwiperコンポーネントで管理
  const [videos, setVideos] = useState([]); // 初期値は空配列
  const [loading, setLoading] = useState(true); // 初期状態はローディング中
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [isLandscape, setIsLandscape] = useState(false);
  const [userPreferences, setUserPreferences] = useState({
    genres: [],
    actresses: [],
    duration: 'all',
    quality: 'high'
  });
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingVideos, setOnboardingVideos] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [showProductDetails, setShowProductDetails] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [userBehavior, setUserBehavior] = useState(() => {
    // localStorageから行動データを読み込み
    const savedBehavior = localStorage.getItem('fanza_user_behavior');
    return savedBehavior ? JSON.parse(savedBehavior) : {
      preferredGenres: {},
      preferredActresses: {},
      averageWatchTime: 0,
      skipPatterns: []
    };
  });
  const [_revenue, setRevenue] = useState({
    clickThroughs: 0,
    adViews: 0,
    totalEarnings: 0
  });
  const [apiError, setApiError] = useState(null);
  const [offset, setOffset] = useState(1);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [keywordOffset, setKeywordOffset] = useState(1);

  // ===== Cloud Functions API呼び出し関数 =====
  const fetchFanzaVideos = async (params = {}, retryCount = 0) => {
    try {
      setLoading(true);
      setApiError(null);

      const { hits = 5, offset = 1, keyword } = params;
      
      // キャッシュキーの生成
      const cacheKey = JSON.stringify({ hits, offset, keyword });
      
      // キャッシュチェック
      const cachedData = rateLimiter.getCachedData(cacheKey);
      if (cachedData) {
        return cachedData;
      }
      
      // レート制限チェック
      if (!rateLimiter.canMakeRequest()) {
        const fallbackVideos = rateLimiter.getRandomVideosFromCache(hits);
        if (fallbackVideos.length > 0) {
          setApiError('レート制限中です。キャッシュから動画を表示しています。');
          return fallbackVideos;
        }
        throw new Error('レート制限に達しました。しばらくお待ちください。');
      }
      
      // Cloud Functions経由でAPIを呼び出し
      const result = await getFanzaVideos({ hits, offset, keyword });
      
      if (result.data.success && result.data.data) {
        // リクエストを記録
        rateLimiter.recordRequest();
        
        // キャッシュに保存
        rateLimiter.setCachedData(cacheKey, result.data.data);
        rateLimiter.addToGlobalCache(result.data.data);
        
        return result.data.data;
      } else {
        throw new Error('Cloud Functionsからのデータ取得に失敗しました');
      }
    } catch (error) {
      console.error('Cloud Functions API Error:', error);
      
      // エラーの種類に応じた処理
      let errorMessage = 'API エラー: ';
      let shouldRetry = false;
      
      if (error.code === 'functions/unavailable') {
        errorMessage += 'サービスが一時的に利用できません';
        shouldRetry = true;
      } else if (error.code === 'functions/deadline-exceeded') {
        errorMessage += 'リクエストがタイムアウトしました';
        shouldRetry = true;
      } else if (error.code === 'functions/resource-exhausted') {
        errorMessage += 'APIのレート制限に達しました';
      } else if (error.code === 'functions/internal') {
        errorMessage += 'サーバー内部エラーが発生しました';
        shouldRetry = true;
      } else if (error.code === 'functions/failed-precondition') {
        errorMessage += 'API認証情報が設定されていません';
      } else if (error.code === 'functions/permission-denied') {
        errorMessage += 'アクセス権限がありません';
      } else if (error.code === 'functions/unauthenticated') {
        errorMessage += '認証が必要です';
      } else if (error.code === 'functions/not-found') {
        errorMessage += '関数が見つかりません（リージョンが間違っている可能性があります）';
      } else {
        errorMessage += error.message || '不明なエラーが発生しました';
        shouldRetry = true;
        
        // Check for region-related errors in the message
        if (error.message && error.message.includes('region')) {
          errorMessage += ' (リージョン設定を確認してください)';
        }
      }
      
      // リトライロジック
      if (shouldRetry && retryCount < 3) {
        const delay = Math.min(1000 * Math.pow(2, retryCount), 5000); // Exponential backoff with max 5 seconds
        await new Promise(resolve => setTimeout(resolve, delay));
        return fetchFanzaVideos(params, retryCount + 1);
      }
      
      setApiError(errorMessage);
      
      // エラー時はキャッシュから動画を返す
      const fallbackVideos = rateLimiter.getRandomVideosFromCache(params.hits || 5);
      if (fallbackVideos.length > 0) {
        return fallbackVideos;
      }
      
      // キャッシュもない場合はDEMO_VIDEOSを返す
      return DEMO_VIDEOS.slice(0, params.hits || 5);
    } finally {
      setLoading(false);
    }
  };

  const searchFanzaVideos = async (keyword) => {
    return await fetchFanzaVideos({ 
      keyword: keyword,
      offset: 1 
    });
  };

  // ===== ヘルスチェック関数 =====
  const checkApiHealth = async () => {
    try {
      const result = await healthCheck();
      if (result.data) {
        return result.data;
      }
    } catch (error) {
      console.error('Health check failed:', error);
      return null;
    }
  };

  // ===== 横画面検出 =====
  useEffect(() => {
    const handleOrientationChange = () => {
      setIsLandscape(window.innerWidth > window.innerHeight);
    };

    // 初期状態をセット
    handleOrientationChange();

    // イベントリスナーを追加
    window.addEventListener('resize', handleOrientationChange);
    window.addEventListener('orientationchange', handleOrientationChange);

    return () => {
      window.removeEventListener('resize', handleOrientationChange);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, []);

  // ===== 動画変更の処理 =====
  const handleVideoChangeWithIndex = (index) => {
    setCurrentVideoIndex(index);
    handleVideoChange(index);
  };

  // ===== 初期化 =====
  useEffect(() => {
    const initializeApp = async () => {
      
      // まずAPIの状態をチェック
      const health = await checkApiHealth();
      
      // 初期動画データの読み込み（Cloud Functions経由）
      const randomOffset = Math.floor(Math.random() * 100) * 10 + 1;
      const initialVideos = await fetchFanzaVideos({ offset: randomOffset });
      
      // APIが成功した場合のみ動画を設定
      if (initialVideos.length > 0) {
        setVideos(initialVideos);
      }
      
      // オンボーディングは無効化
      setShowOnboarding(false);

      // ユーザー設定の復元
      const savedPrefs = localStorage.getItem('fanza_user_preferences');
      if (savedPrefs) {
        setUserPreferences(JSON.parse(savedPrefs));
      }

      const savedUser = localStorage.getItem('fanza_user');
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }
      
      // 古いキャッシュをクリーンアップ
      rateLimiter.clearOldCache();
    };

    initializeApp();
  }, []); // 依存配列を空にして無限ループを防止

  // ===== ユーザー行動分析 =====
  const updateUserBehavior = (action, data) => {
    setUserBehavior(prev => {
      const updated = { ...prev };
      
      switch(action) {
        case 'watch':
          data.genre?.forEach(genre => {
            updated.preferredGenres[genre] = (updated.preferredGenres[genre] || 0) + 1;
          });
          updated.preferredActresses[data.actress] = (updated.preferredActresses[data.actress] || 0) + 1;
          break;
        case 'skip':
          updated.skipPatterns.push({
            genre: data.genre,
            timeWatched: data.timeWatched,
            totalDuration: data.totalDuration
          });
          break;
        case 'like':
          data.genre?.forEach(genre => {
            updated.preferredGenres[genre] = (updated.preferredGenres[genre] || 0) + 2;
          });
          break;
      }
      
      // 更新したデータをlocalStorageに保存
      localStorage.setItem('fanza_user_behavior', JSON.stringify(updated));
      return updated;
    });
  };

  // ===== レコメンド機能 =====
  const getRecommendedVideos = async () => {
    // ジャンルと女優の好みを統合
    const topGenres = Object.entries(userBehavior.preferredGenres || {})
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([genre]) => genre);
    
    const topActresses = Object.entries(userBehavior.preferredActresses || {})
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([actress]) => actress);

    // オンボーディングの好みも含める
    const onboardingGenres = userPreferences.genres || [];
    const onboardingActresses = userPreferences.actresses || [];
    
    // すべての好みを統合
    const allPreferredGenres = [...new Set([...topGenres, ...onboardingGenres])];
    const allPreferredActresses = [...new Set([...topActresses, ...onboardingActresses])];
    
    // 検索キーワードを作成（ジャンルと女優を組み合わせる）
    const searchKeywords = [];
    if (allPreferredGenres.length > 0) {
      searchKeywords.push(allPreferredGenres[0]);
    }
    if (allPreferredActresses.length > 0) {
      searchKeywords.push(allPreferredActresses[0]);
    }
    
    if (searchKeywords.length > 0) {
      const recommendedVideos = await fetchFanzaVideos({
        keyword: searchKeywords.join(' '),  // encodeURIComponentは buildFanzaApiUrl で行われる
        offset: Math.floor(Math.random() * 10) + 1 // ランダムなオフセットで多様性を確保
      });
      
      if (recommendedVideos.length > 0) {
        return recommendedVideos;
      }
    }

    // 好みがない場合は通常の動画を取得
    return await fetchFanzaVideos();
  };

  // ===== 動画操作 =====
  const handleVideoChange = (index) => {
    // setCurrentVideoIndex(index);
    if (videos[index]) {
      updateUserBehavior('watch', videos[index]);
    }
  };

  const loadMoreVideos = async () => {
    if (loading) return;
    
    let newVideos = [];
    
    // キーワードがある場合はキーワード検索、ない場合はランダム
    if (searchKeyword) {
      const nextKeywordOffset = keywordOffset + 5; // 固定値5を使用
      newVideos = await fetchFanzaVideos({ 
        keyword: searchKeyword,
        offset: nextKeywordOffset 
      });
      
      if (newVideos.length > 0) {
        setKeywordOffset(nextKeywordOffset);
      }
    } else {
      // ランダムなオフセットで取得
      const randomOffset = Math.floor(Math.random() * 1000) + 1;
      newVideos = await fetchFanzaVideos({ 
        offset: randomOffset 
      });
    }
    
    if (newVideos.length > 0) {
      // 既存の動画と重複しないようにフィルタリング
      const existingIds = new Set(videos.map(v => v.id));
      const uniqueNewVideos = newVideos.filter(v => !existingIds.has(v.id));
      
      setVideos(prev => [...prev, ...uniqueNewVideos]);
      
      // 通常のoffsetは更新しない（ランダム取得のため不要）
      if (!searchKeyword) {
        setOffset(offset + 5); // 固定値5を使用
      }
    }
  };

  // ===== オンボーディング =====
  const handleOnboardingComplete = (preferences) => {
    setUserPreferences(preferences);
    localStorage.setItem('fanza_user_preferences', JSON.stringify(preferences));
    localStorage.setItem('fanza_user_initialized', 'true');
    setShowOnboarding(false);
    
    // レコメンド動画の取得は無効化（API呼び出し削減）
    // getRecommendedVideos().then(recommendedVideos => {
    //   if (recommendedVideos.length > 0) {
    //     setVideos(recommendedVideos);
    //   }
    // });
  };

  // ===== 検索機能 =====
  const handleSearchSelect = (video) => {
    setVideos([video, ...videos.filter(v => v.id !== video.id)]);
    // setCurrentVideoIndex(0);
    setShowSearch(false);
  };
  
  const handleSearchKeyword = async (keyword) => {
    setSearchKeyword(keyword);
    setKeywordOffset(1); // キーワード検索時はoffsetをリセット
    const searchResults = await searchFanzaVideos(keyword);
    if (searchResults.length > 0) {
      setVideos(searchResults);
    }
    setShowSearch(false);
  };

  // ===== その他の機能 =====
  const handleProductClick = (video) => {
    setSelectedProduct(video);
    setShowProductDetails(true);
  };

  const handleProductPurchase = () => {
    setRevenue(prev => ({
      ...prev,
      clickThroughs: prev.clickThroughs + 1,
      totalEarnings: prev.totalEarnings + 50
    }));
    
    if (selectedProduct?.productUrl) {
      window.open(selectedProduct.productUrl, '_blank');
    }
  };

  // ===== UI コンポーネント =====
  const LoadingScreen = () => (
    <div className="h-screen bg-black flex items-center justify-center">
      <div className="text-white text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
        <p className="text-lg mb-2">動画を読み込み中...</p>
        <p className="text-sm text-gray-300">少々お待ちください</p>
        {apiError && (
          <div className="mt-4 p-4 bg-gray-800 rounded-lg max-w-md">
            <p className="text-red-300 text-sm">{apiError}</p>
          </div>
        )}
      </div>
    </div>
  );

  // 動画が存在しない場合はローディング画面を表示
  if (!videos || videos.length === 0) {
    return <LoadingScreen />;
  }

  return (
    <div className="h-screen bg-black">
      {showOnboarding ? (
        <OnboardingScreen 
          videos={onboardingVideos}
          onComplete={handleOnboardingComplete}
          updateUserBehavior={updateUserBehavior}
        />
      ) : (
        <>
          <VideoSwiper
            videos={videos}
            onVideoChange={handleVideoChangeWithIndex}
            onLoadMore={loadMoreVideos}
            onFavorite={() => {}}
            onProductClick={handleProductClick}
            loading={loading}
          />
          
          {/* 検索パネル */}
          {showSearch && (
            <SearchPanel
              onSearch={searchFanzaVideos}
              onSelect={handleSearchSelect}
              onClose={() => {
                setShowSearch(false);
                // 検索パネルを閉じるときはキーワードはクリアしない
              }}
              onSearchKeyword={handleSearchKeyword}
            />
          )}
          
          {/* 商品詳細モーダル */}
          {showProductDetails && selectedProduct && (
            <ProductDetailsModal
              video={selectedProduct}
              onClose={() => setShowProductDetails(false)}
              onPurchase={handleProductPurchase}
            />
          )}
          
          {/* 設定パネル */}
          {showSettings && (
            <SettingsPanel
              user={user}
              preferences={userPreferences}
              onClose={() => setShowSettings(false)}
              onPreferencesChange={setUserPreferences}
              onResetOnboarding={() => {
                setShowOnboarding(true);
                setShowSettings(false);
              }}
            />
          )}

          {/* ヘッダーナビゲーション */}
          <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
            <div className="flex justify-between items-center pointer-events-auto">
              <div className="flex items-center space-x-2">
                <button 
                  onClick={() => {
                    if (searchKeyword) {
                      setSearchKeyword('');
                      setKeywordOffset(1);
                      // 検索キーワードをクリアするだけ（APIは呼ばない）
                    }
                  }}
                  className="text-white/80 text-sm hover:text-white transition-colors"
                >
                  {searchKeyword ? `${searchKeyword} ✕` : 'すべて'}
                </button>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setShowSearch(true)}
                  className="bg-white/20 hover:bg-white/30 p-3 rounded-full transition-colors"
                >
                  <Search className="w-5 h-5 text-white" />
                </button>
                {/* 詳細ボタン（縦画面・横画面共通） */}
                {videos[currentVideoIndex] && (
                  <button
                    onClick={() => handleProductClick(videos[currentVideoIndex])}
                    className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-full transition-colors flex items-center space-x-2"
                  >
                    <Info className="w-4 h-4 text-white" />
                    <span className="text-white text-sm">作品詳細</span>
                  </button>
                )}
                <button
                  onClick={() => setShowSettings(true)}
                  className="bg-white/20 hover:bg-white/30 p-3 rounded-full transition-colors"
                >
                  <Settings className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default FanzaSwipeApp;
