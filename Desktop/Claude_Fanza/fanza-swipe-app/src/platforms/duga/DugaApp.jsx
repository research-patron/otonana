import React, { useState, useEffect } from 'react';
import { Search, Settings, Info, MoreVertical } from 'lucide-react';
import { httpsCallable, connectFunctionsEmulator } from 'firebase/functions';
import { initializeApp } from 'firebase/app';
import { Routes, Route } from 'react-router-dom';

// Components (共有コンポーネントを使用)
import VideoSwiper from '../../VideoSwiper';
import ProductDetailsModal from '../../ProductDetailsModal';
import OnboardingScreen from '../../OnboardingScreen';
import SearchPanel from '../../SearchPanel';
import SettingsPanel from '../../SettingsPanel';

// Configuration and utilities
import firebaseConfig from '../../config/firebase';
import { createFunctionsInstance } from '../../config/functions';
import ApiRateLimiter from '../../apiRateLimiter';

// DUGA専用ブログコンポーネント
import DugaBlogIndex from './DugaBlogIndex';

// ============================================================================
// FIREBASE CONFIGURATION
// ============================================================================
const app = initializeApp(firebaseConfig);
const functions = createFunctionsInstance(app);

// Development environment: connect to emulator if specified
if (import.meta.env.DEV && import.meta.env.VITE_USE_EMULATOR === 'true') {
  connectFunctionsEmulator(functions, 'localhost', 5001);
}

// Cloud Functions references
const getDugaVideos = httpsCallable(functions, 'getDugaVideos');
const healthCheck = httpsCallable(functions, 'healthCheck');

// API rate limiting
const rateLimiter = new ApiRateLimiter();

// ============================================================================
// DEMO DATA (DUGA向け)
// ============================================================================
const DEMO_VIDEOS = [
  {
    id: 'duga_demo1',
    title: 'DUGA サンプル動画 1',
    thumbnail: 'https://picsum.photos/400/600?random=101',
    videoUrl: null,
    duration: '90分',
    genre: ['アマチュア', 'リアル'],
    actress: 'DUGA出演者1',
    likes: 987,
    views: 23456,
    clips: [],
    productUrl: 'https://duga.jp/ppv/duga-demo1/',
    price: '¥1,980',
    originalPrice: '¥2,980',
    saleEndsAt: '2024-12-31',
    rating: '4.2',
    reviewCount: 156,
    platform: 'duga'
  },
  {
    id: 'duga_demo2',
    title: 'DUGA サンプル動画 2',
    thumbnail: 'https://picsum.photos/400/600?random=102',
    videoUrl: null,
    duration: '75分',
    genre: ['ライブ', '個人撮影'],
    actress: 'DUGA出演者2',
    likes: 1543,
    views: 34567,
    clips: [],
    productUrl: 'https://duga.jp/ppv/duga-demo2/',
    price: '¥1,480',
    originalPrice: '¥2,480',
    saleEndsAt: '2024-12-31',
    rating: '4.0',
    reviewCount: 89,
    platform: 'duga'
  }
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================
const DugaApp = () => {
  // State management
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [videos, setVideos] = useState(DEMO_VIDEOS || []);
  const [showProductModal, setShowProductModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showSearchPanel, setShowSearchPanel] = useState(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [initialized, setInitialized] = useState(false);
  const [userBehavior, _setUserBehavior] = useState({
    favorites: [],
    dislikes: [],
    genres: [],
    searchHistory: []
  });

  // Pagination state
  const [hasMoreVideos, setHasMoreVideos] = useState(true);
  const [currentOffset, setCurrentOffset] = useState(1);
  const [showLoadMoreButton, setShowLoadMoreButton] = useState(false);
  const [totalVideosViewed, setTotalVideosViewed] = useState(0);
  
  // Search state (for header display)
  const [searchKeyword, setSearchKeyword] = useState('');

  // ============================================================================
  // API FUNCTIONS
  // ============================================================================
  const fetchDugaVideos = async (options = {}) => {
    if (!rateLimiter.canMakeRequest()) {
      setError('APIリクエスト制限に達しました。しばらくお待ちください。');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await getDugaVideos({
        hits: options.hits || 5, // 5件ずつ取得（FANZA版と同様）
        offset: options.offset || currentOffset,
        keyword: options.keyword,
        genre: options.genre
      });

      if (response.data && response.data.success && response.data.data) {
        const newVideos = response.data.data;
        if (Array.isArray(newVideos) && newVideos.length > 0) {
          if (options.replace) {
            setVideos(newVideos);
            setCurrentVideoIndex(0);
            setCurrentOffset(1);
            setTotalVideosViewed(0);
          } else {
            // 重複を除去
            const existingIds = new Set(videos.map(v => v.id));
            const uniqueNewVideos = newVideos.filter(v => !existingIds.has(v.id));
            setVideos(prev => [...(prev || []), ...uniqueNewVideos]);
            setCurrentOffset(prev => prev + options.hits || 5);
          }
          
          // API制限に配慮してリクエストを記録
          if (response.data.source === 'api') {
            rateLimiter.recordRequest();
          }
          
          // 取得した動画数が要求数未満なら、これ以上動画がないと判断
          setHasMoreVideos(newVideos.length >= (options.hits || 5));
        } else {
          setHasMoreVideos(false);
        }
      }
    } catch (error) {
      console.error('DUGA API Error:', error);
      setError('動画の取得に失敗しました。しばらく待ってから再試行してください。');
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================================================
  // INITIALIZATION
  // ============================================================================
  useEffect(() => {
    const initializeDugaApp = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Fetch real videos first (don't start with demo videos)
        try {
          await fetchDugaVideos({ replace: true, offset: 1, hits: 5 });
          setInitialized(true);
        } catch (apiError) {
          console.warn('Could not fetch DUGA videos, using demo data:', apiError);
          // Use demo videos as fallback only if API fails
          setVideos(DEMO_VIDEOS);
          setInitialized(true);
        }
      } catch (initError) {
        console.error('App initialization error:', initError);
        setError('アプリの初期化に失敗しました');
      } finally {
        setIsLoading(false);
      }
    };

    if (!initialized) {
      initializeDugaApp();
    }
  }, [initialized]);

  // ============================================================================
  // UI COMPONENTS
  // ============================================================================
  const LoadingScreen = () => (
    <div className="h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-purple-900 flex items-center justify-center">
      <div className="text-white text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-400 mx-auto mb-4"></div>
        <p className="text-lg mb-2">動画を読み込み中...</p>
        <p className="text-sm text-gray-300">少々お待ちください</p>
        {error && (
          <div className="mt-4 p-4 bg-purple-800/50 rounded-lg max-w-md">
            <p className="text-purple-200 text-sm">{error}</p>
          </div>
        )}
      </div>
    </div>
  );

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================
  const handleVideoChange = (newIndex) => {
    // インデックスの範囲チェック
    if (!videos || !Array.isArray(videos) || newIndex < 0 || newIndex >= videos.length) {
      console.warn('Invalid video index:', newIndex, 'videos length:', videos?.length);
      return;
    }
    
    setCurrentVideoIndex(newIndex);
    setTotalVideosViewed(Math.max(totalVideosViewed, newIndex + 1));
    
    // Debug logging for button visibility (minimal)
    if (!videos[newIndex]) {
      console.warn('DUGA: No video at index', newIndex);
    }
    
    // Show "Load More" button every 5 videos (FANZA版と同様)
    const shouldShowButton = (newIndex + 1) % 5 === 0 && hasMoreVideos;
    setShowLoadMoreButton(shouldShowButton);
    
    // Pre-load more videos when approaching the end (but not if button is showing)
    if (newIndex >= videos.length - 2 && !showLoadMoreButton && hasMoreVideos) {
      fetchDugaVideos().catch(err => {
        console.warn('Failed to load more videos:', err);
      });
    }
  };

  // Handle manual load more button click
  const handleLoadMore = async () => {
    setShowLoadMoreButton(false);
    await fetchDugaVideos();
  };

  const handleSearch = (searchParams) => {
    const keyword = searchParams.keyword;
    setSearchKeyword(keyword);
    fetchDugaVideos({
      keyword: keyword,
      genre: searchParams.genre,
      replace: true
    });
  };

  const handleProductClick = (video) => {
    setSelectedProduct(video);
    setShowProductModal(true);
  };

  const handleProductPurchase = () => {
    if (selectedProduct?.productUrl || selectedProduct?.iframeUrl) {
      // DUGAアフィリエイトリンクを使用（productUrlまたはiframeUrl）
      const affiliateUrl = selectedProduct.productUrl || selectedProduct.iframeUrl;
      window.open(affiliateUrl, '_blank');
      
      // 収益トラッキング（FANZA版と同様）
      console.log('DUGA affiliate click tracked:', {
        productId: selectedProduct.id,
        title: selectedProduct.title,
        price: selectedProduct.price,
        affiliateUrl: affiliateUrl
      });
    } else {
      // フォールバック: 直接DUGAサイトへ
      window.open(`https://duga.jp/ppv/${selectedProduct?.id || ''}`, '_blank');
    }
    
    // モーダルを閉じる
    setShowProductModal(false);
  };

  // ============================================================================
  // COMPONENT RENDER
  // ============================================================================
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-purple-900">
      <Routes>
        {/* DUGA ブログルート */}
        <Route path="/post/*" element={<DugaBlogIndex />} />
        
        {/* メインアプリルート */}
        <Route path="/*" element={
          <>
            {/* Header Navigation */}
            <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
              <div className="flex justify-between items-center pointer-events-auto">
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => {
                      if (searchKeyword) {
                        setSearchKeyword('');
                        // Clear search and reload
                        fetchDugaVideos({ replace: true, offset: 1, hits: 5 });
                      }
                    }}
                    className="text-white/80 text-sm hover:text-white transition-colors"
                  >
                    {searchKeyword ? `${searchKeyword} ✕` : 'すべて'}
                  </button>
                </div>
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => setShowSearchPanel(true)}
                    className="bg-white/20 hover:bg-white/30 p-3 rounded-full transition-colors"
                  >
                    <Search className="w-5 h-5 text-white" />
                  </button>
                  {/* Details button */}
                  {videos[currentVideoIndex] && (
                    <button
                      onClick={() => handleProductClick(videos[currentVideoIndex])}
                      className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-full transition-colors flex items-center space-x-2"
                      aria-label="作品詳細"
                    >
                      <Info className="w-4 h-4 text-white" />
                      <span className="text-white text-sm">作品詳細</span>
                    </button>
                  )}
                  <button
                    onClick={() => setShowSettingsPanel(true)}
                    className="bg-white/20 hover:bg-white/30 p-3 rounded-full transition-colors"
                    aria-label="設定"
                  >
                    <MoreVertical className="w-5 h-5 text-white" />
                  </button>              </div>
              </div>
            </div>

            {/* Main content */}
            {showOnboarding ? (
              <OnboardingScreen 
                onComplete={() => setShowOnboarding(false)}
                platform="duga"
                brandColor="purple"
              />
            ) : (
              <>
                {/* Show loading screen if no videos are available or still loading */}
                {(!videos || videos.length === 0 || !initialized) ? (
                  <LoadingScreen />
                ) : (
                  <VideoSwiper
                    videos={videos}
                    currentIndex={Math.min(currentVideoIndex, videos.length - 1)}
                    onVideoChange={handleVideoChange}
                    onProductClick={handleProductClick}
                    onLoadMore={handleLoadMore}
                    loading={isLoading}
                    showLoadMoreButton={showLoadMoreButton}
                    hasMoreVideos={hasMoreVideos}
                    platform="duga"
                  />
                )}
                
                {error && (
                  <div className="fixed bottom-20 left-4 right-4 bg-red-500/90 backdrop-blur-sm text-white p-4 rounded-lg z-40">
                    {error}
                  </div>
                )}
                
                {isLoading && (
                  <div className="fixed bottom-20 left-4 right-4 bg-purple-500/90 backdrop-blur-sm text-white p-4 rounded-lg z-40 flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    動画を読み込み中...
                  </div>
                )}
              </>
            )}

            {/* DUGA Credit */}
            <div className="fixed bottom-4 right-4 z-50 opacity-70 hover:opacity-100 transition-opacity">
              <a href="https://click.duga.jp/aff/api/42550-01" target="_blank" rel="noopener noreferrer">
                <img 
                  src="https://ad.duga.jp/img/webservice_142.gif" 
                  alt="DUGAウェブサービス" 
                  width="142" 
                  height="18" 
                  className="rounded shadow-lg"
                />
              </a>
            </div>

            {/* Modals and Panels */}
            {showProductModal && selectedProduct && (
              <ProductDetailsModal
                video={selectedProduct}
                onClose={() => setShowProductModal(false)}
                onPurchase={handleProductPurchase}
                platform="duga"
                themeColor="purple"
              />
            )}

            {showSearchPanel && (
              <SearchPanel
                onClose={() => setShowSearchPanel(false)}
                onSearch={handleSearch}
                platform="duga"
                themeColor="purple"
              />
            )}

            {showSettingsPanel && (
              <SettingsPanel
                onClose={() => setShowSettingsPanel(false)}
                platform="duga"
                themeColor="purple"
              />
            )}
          </>
        } />
      </Routes>
    </div>
  );
};

export default DugaApp;