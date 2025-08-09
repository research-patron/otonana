import React, { useState, useEffect } from 'react';
import { Search, Settings, Info } from 'lucide-react';
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
        
        // Start with demo videos
        setVideos(DEMO_VIDEOS);
        setInitialized(true);
        
        // Try to fetch real videos in background (but don't block UI)
        try {
          await fetchDugaVideos({ replace: true, offset: 1, hits: 5 });
        } catch (apiError) {
          console.warn('Could not fetch DUGA videos, using demo data:', apiError);
          // Keep demo videos as fallback
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
    fetchDugaVideos({
      keyword: searchParams.keyword,
      genre: searchParams.genre,
      replace: true
    });
  };

  const handleProductClick = (video) => {
    setSelectedProduct(video);
    setShowProductModal(true);
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
            {/* Header with DUGA branding */}
            <div className="fixed top-0 left-0 right-0 z-30 bg-gradient-to-r from-purple-800/20 to-indigo-800/20 backdrop-blur-sm">
              <div className="flex justify-between items-center p-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                    D
                  </div>
                  <span className="font-bold text-white text-lg">DUGA Swipe</span>
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowSearchPanel(true)}
                    className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
                    aria-label="検索"
                  >
                    <Search size={20} />
                  </button>
                  <button
                    onClick={() => setShowSettingsPanel(true)}
                    className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
                    aria-label="設定"
                  >
                    <Settings size={20} />
                  </button>
                </div>
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
              <div className="pt-16">
                {videos && Array.isArray(videos) && videos.length > 0 ? (
                  <VideoSwiper
                    videos={videos}
                    currentIndex={Math.min(currentVideoIndex, videos.length - 1)}
                    onVideoChange={handleVideoChange}
                    onProductClick={handleProductClick}
                    onLoadMore={handleLoadMore}
                    loading={isLoading}
                    showLoadMoreButton={showLoadMoreButton}
                    hasMoreVideos={hasMoreVideos}
                  />
                ) : (
                  <div className="flex items-center justify-center h-screen">
                    <div className="text-center text-white">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto mb-4"></div>
                      <p>{error || '動画を読み込み中...'}</p>
                    </div>
                  </div>
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
              </div>
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
                product={selectedProduct}
                onClose={() => setShowProductModal(false)}
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