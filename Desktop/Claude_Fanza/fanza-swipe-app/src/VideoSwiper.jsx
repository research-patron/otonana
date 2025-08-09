import React, { useState, useEffect, useRef } from 'react';
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  MoreVertical,
  Search,
  Home,
  ShoppingBag,
  User,
  Info,
  Play,
  Pause,
  SkipForward,
  SkipBack
} from 'lucide-react';

const VideoSwiper = ({ 
  videos, 
  onVideoChange, 
  onLoadMore,
  loading
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMuted] = useState(false); // Always false for audio enabled
  const [videoErrors, setVideoErrors] = useState({});
  const [useIframe, setUseIframe] = useState({});
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(false);
  const [skipButtonsPosition, setSkipButtonsPosition] = useState('left'); // left or right
  const [hasViewedAll, setHasViewedAll] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isLongPressing, setIsLongPressing] = useState(false);
  
  const containerRef = useRef(null);
  const videoRefs = useRef([]);
  const controlsTimeoutRef = useRef(null);
  const inactivityTimeoutRef = useRef(null);
  const longPressTimerRef = useRef(null);

  // 設定の読み込み
  useEffect(() => {
    const savedPosition = localStorage.getItem('fanza_skip_buttons_position');
    if (savedPosition) {
      setSkipButtonsPosition(savedPosition);
    }
  }, []);

  // 横画面検出と自動全画面化
  useEffect(() => {
    const handleOrientationChange = async () => {
      const newIsLandscape = window.innerWidth > window.innerHeight;
      setIsLandscape(newIsLandscape);
      
      // モバイルデバイスで横画面になったら自動で全画面化
      if (newIsLandscape && window.innerWidth <= 768) {
        try {
          if (document.fullscreenElement === null && containerRef.current) {
            await containerRef.current.requestFullscreen();
          }
        } catch (err) {
          console.log('Fullscreen request failed:', err);
        }
      }
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

  // 全画面状態の監視
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  // 非アクティブタイマーの管理
  const resetInactivityTimer = () => {
    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
    }
    
    // 5秒後にフルスクリーンモードに移行
    inactivityTimeoutRef.current = setTimeout(() => {
      setIsFullscreen(true);
      setShowControls(false);
    }, 5000);
  };

  // ユーザーアクティビティの検出
  useEffect(() => {
    const handleActivity = () => {
      if (isFullscreen) {
        setIsFullscreen(false);
        setShowControls(true);
      }
      resetInactivityTimer();
    };

    // イベントリスナーの設定
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      document.addEventListener(event, handleActivity);
    });

    // 初期タイマーの開始
    resetInactivityTimer();

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      if (inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current);
      }
    };
  }, [isFullscreen]);

  // 動画リストが更新されたらhasViewedAllをリセット
  useEffect(() => {
    setHasViewedAll(false);
  }, [videos.length]);

  // スクロールイベントの監視
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      const containerHeight = container.clientHeight;
      const newIndex = Math.round(scrollTop / containerHeight);
      
      if (newIndex !== currentIndex && newIndex >= 0 && newIndex < videos.length) {
        setCurrentIndex(newIndex);
        onVideoChange && onVideoChange(newIndex);
        
        // 最後の動画に到達したらhasViewedAllをtrueにする
        if (newIndex === videos.length - 1) {
          setHasViewedAll(true);
        }
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [currentIndex, videos.length, onVideoChange]);

  // 現在の動画を自動再生
  useEffect(() => {
    const currentVideo = videoRefs.current[currentIndex];
    const currentVideoData = videos[currentIndex];
    
    if (!currentVideo || !currentVideoData) {
      console.log('Video or video data not available for index:', currentIndex);
      return;
    }

    // 他の動画を一時停止
    videoRefs.current.forEach((video, index) => {
      if (video && index !== currentIndex) {
        video.pause();
      }
    });
    
    // 動画切り替え時のみ再生状態をリセット（ユーザーの手動操作は維持）
    setIsPlaying(true);
    
    // iframe使用時は自動再生しない
    if (!useIframe[currentVideoData.id]) {
      currentVideo.play().catch(err => console.log('Auto-play blocked:', err));
    }
    
    // 動画が読み込まれていない場合は時間をリセットしない
    if (currentVideo.readyState >= 1) { // HAVE_METADATA
      setCurrentTime(currentVideo.currentTime || 0);
      setDuration(currentVideo.duration || 0);
    } else {
      // 読み込み完了を待つ
      const handleLoadedMetadata = () => {
        setCurrentTime(currentVideo.currentTime || 0);
        setDuration(currentVideo.duration || 0);
        console.log('Video metadata loaded for index:', currentIndex, 'duration:', currentVideo.duration);
      };
      
      currentVideo.addEventListener('loadedmetadata', handleLoadedMetadata, { once: true });
      
      // クリーンアップのため初期値をセット
      setCurrentTime(0);
      setDuration(0);
    }
    
    // 動画変更時に短時間コントロールを表示
    showControlsTemporarily();
  }, [currentIndex, useIframe]);

  // 再生時間の更新と再生状態の同期
  useEffect(() => {
    const interval = setInterval(() => {
      const currentVideo = videoRefs.current[currentIndex];
      if (currentVideo && !useIframe[videos[currentIndex]?.id]) {
        setCurrentTime(currentVideo.currentTime || 0);
        setDuration(currentVideo.duration || 0);
        
        // 動画の実際の再生状態とisPlayingステートを同期
        const videoIsPlaying = !currentVideo.paused && !currentVideo.ended;
        if (videoIsPlaying !== isPlaying) {
          setIsPlaying(videoIsPlaying);
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [currentIndex, videos, isPlaying]);

  // 再生/一時停止切り替え
  const togglePlayPause = () => {
    const currentVideo = videoRefs.current[currentIndex];
    if (currentVideo && !useIframe[videos[currentIndex]?.id]) {
      if (isPlaying) {
        currentVideo.pause();
        setIsPlaying(false);
      } else {
        currentVideo.play();
        setIsPlaying(true);
      }
    }
  };

  // シーク機能
  const handleSeek = (newTime) => {
    const currentVideo = videoRefs.current[currentIndex];
    if (currentVideo && !useIframe[videos[currentIndex]?.id]) {
      currentVideo.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  // スキップ機能
  const skipForward = (seconds = 15) => {
    const currentVideo = videoRefs.current[currentIndex];
    const currentVideoData = videos[currentIndex];
    
    if (!currentVideo || !currentVideoData || useIframe[currentVideoData.id]) {
      console.log('Skip forward blocked: video not ready or is iframe');
      return;
    }

    // 動画の読み込み状態をチェック
    if (currentVideo.readyState < 2) { // HAVE_CURRENT_DATA
      console.log('Skip forward blocked: video not loaded enough');
      return;
    }

    const videoDuration = currentVideo.duration;
    if (!videoDuration || isNaN(videoDuration) || videoDuration === 0) {
      console.log('Skip forward blocked: duration not available');
      return;
    }

    const currentTime = currentVideo.currentTime || 0;
    const newTime = Math.min(currentTime + seconds, videoDuration);
    
    try {
      handleSeek(newTime);
      console.log(`Skipped forward: ${currentTime} -> ${newTime}`);
    } catch (error) {
      console.error('Skip forward error:', error);
    }
  };

  const skipBackward = (seconds = 15) => {
    const currentVideo = videoRefs.current[currentIndex];
    const currentVideoData = videos[currentIndex];
    
    if (!currentVideo || !currentVideoData || useIframe[currentVideoData.id]) {
      console.log('Skip backward blocked: video not ready or is iframe');
      return;
    }

    // 動画の読み込み状態をチェック
    if (currentVideo.readyState < 2) { // HAVE_CURRENT_DATA
      console.log('Skip backward blocked: video not loaded enough');
      return;
    }

    const currentTime = currentVideo.currentTime || 0;
    const newTime = Math.max(currentTime - seconds, 0);
    
    try {
      handleSeek(newTime);
      console.log(`Skipped backward: ${currentTime} -> ${newTime}`);
    } catch (error) {
      console.error('Skip backward error:', error);
    }
  };

  // コントロール表示管理
  const showControlsTemporarily = () => {
    setShowControls(true);
    
    // 既存のタイムアウトをクリア
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    
    // 1秒後に非表示
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 1000);
  };

  // 時間フォーマット
  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // タップゾーンハンドラー
  const handleTapZone = (zone) => {
    // シングルタップで即座にスキップ実行
    if (skipButtonsPosition === 'left') {
      if (zone === 'left-top') {
        skipForward(15);
      } else if (zone === 'left-bottom') {
        skipBackward(15);
      }
    } else {
      if (zone === 'right-top') {
        skipForward(15);
      } else if (zone === 'right-bottom') {
        skipBackward(15);
      }
    }
    
    showControlsTemporarily();
  };

  // videosが空の場合のエラーチェック
  if (!videos || videos.length === 0) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-white text-center">
          <p>動画がありません</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black">
      {/* 垂直スワイプコンテナ */}
      <div 
        ref={containerRef}
        className="swiper-container"
      >
        {videos.map((video, index) => (
          <div
            key={`${video.id}_${index}`}
            className="video-item"
          >
            {/* 動画背景 */}
            {useIframe[video.id] && video.iframeUrl ? (
              // iframe埋め込み
              <iframe
                src={video.iframeUrl}
                className="absolute inset-0 w-full h-full"
                frameBorder="0"
                allow="autoplay; fullscreen"
                allowFullScreen
                title={video.title}
              />
            ) : video.videoUrl && !videoErrors[video.id] ? (
              // 通常の動画再生
              <>
                <video
                  ref={el => videoRefs.current[index] = el}
                  className="w-full h-full object-contain bg-black z-10"
                  src={video.videoUrl}
                  poster={video.thumbnail}
                  muted={isMuted}
                  playsInline
                  webkit-playsinline="true"
                  x5-playsinline="true"
                  preload={Math.abs(index - currentIndex) <= 1 ? "auto" : "none"}
                  playbackRate={playbackRate}
                  onContextMenu={(e) => {
                    e.preventDefault(); // 右クリックメニューを無効化
                    return false;
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    if (index === currentIndex) {
                      // 長押しタイマー開始
                      longPressTimerRef.current = setTimeout(() => {
                        setIsLongPressing(true);
                        setPlaybackRate(2);
                        const video = videoRefs.current[currentIndex];
                        if (video) video.playbackRate = 2;
                      }, 500); // 500msで長押し判定
                    }
                  }}
                  onMouseUp={() => {
                    if (longPressTimerRef.current) {
                      clearTimeout(longPressTimerRef.current);
                      longPressTimerRef.current = null;
                    }
                    if (isLongPressing) {
                      setIsLongPressing(false);
                      setPlaybackRate(1);
                      const video = videoRefs.current[currentIndex];
                      if (video) video.playbackRate = 1;
                    } else if (index === currentIndex) {
                      // 通常のクリック
                      togglePlayPause();
                      showControlsTemporarily();
                    }
                  }}
                  onMouseLeave={() => {
                    if (longPressTimerRef.current) {
                      clearTimeout(longPressTimerRef.current);
                      longPressTimerRef.current = null;
                    }
                    if (isLongPressing) {
                      setIsLongPressing(false);
                      setPlaybackRate(1);
                      const video = videoRefs.current[currentIndex];
                      if (video) video.playbackRate = 1;
                    }
                  }}
                  onTouchStart={(e) => {
                    e.preventDefault(); // デフォルトのタッチ動作を防ぐ
                    if (index === currentIndex) {
                      // タッチ開始時に長押しタイマー開始
                      longPressTimerRef.current = setTimeout(() => {
                        setIsLongPressing(true);
                        setPlaybackRate(2);
                        const video = videoRefs.current[currentIndex];
                        if (video) {
                          video.playbackRate = 2;
                          // 長押し中も動画を再生継続
                          if (!video.paused && !video.ended) {
                            video.play().catch(() => {});
                          }
                        }
                      }, 500);
                    }
                  }}
                  onTouchEnd={(e) => {
                    if (longPressTimerRef.current) {
                      clearTimeout(longPressTimerRef.current);
                      longPressTimerRef.current = null;
                    }
                    if (isLongPressing) {
                      e.preventDefault(); // タップイベントを防ぐ
                      setIsLongPressing(false);
                      setPlaybackRate(1);
                      const video = videoRefs.current[currentIndex];
                      if (video) video.playbackRate = 1;
                    } else if (index === currentIndex) {
                      // 通常のタップ
                      togglePlayPause();
                      showControlsTemporarily();
                    }
                  }}
                  onTouchCancel={() => {
                    if (longPressTimerRef.current) {
                      clearTimeout(longPressTimerRef.current);
                      longPressTimerRef.current = null;
                    }
                    if (isLongPressing) {
                      setIsLongPressing(false);
                      setPlaybackRate(1);
                      const video = videoRefs.current[currentIndex];
                      if (video) video.playbackRate = 1;
                    }
                  }}
                  onDoubleClick={(e) => {
                    e.preventDefault();
                    if (index === currentIndex) {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const x = e.clientX - rect.left;
                      const width = rect.width;
                      
                      if (x < width / 2) {
                        skipBackward(15);
                      } else {
                        skipForward(15);
                      }
                      showControlsTemporarily();
                    }
                  }}
                  onEnded={() => {
                    // 動画終了時は自動切り替えせず、一時停止状態で停止
                    setIsPlaying(false);
                  }}
                  onError={(e) => {
                    console.error('Video playback error:', e, 'URL:', video.videoUrl);
                    console.log('Switching to iframe for video:', video.id);
                    setVideoErrors(prev => ({ ...prev, [video.id]: true }));
                    // iframeが利用可能な場合は切り替え
                    if (video.iframeUrl) {
                      setUseIframe(prev => ({ ...prev, [video.id]: true }));
                    }
                  }}
                  onLoadedData={() => {
                    // Video loaded successfully
                    console.log('Video loaded data for index:', index);
                  }}
                  onLoadedMetadata={() => {
                    // Metadata loaded - duration should be available now
                    const video = videoRefs.current[index];
                    if (video && index === currentIndex) {
                      setDuration(video.duration || 0);
                      setCurrentTime(video.currentTime || 0);
                      console.log('Video metadata loaded for current video, duration:', video.duration);
                    }
                  }}
                  onCanPlay={() => {
                    // Video can start playing - good time to enable skip functions
                    console.log('Video can play for index:', index);
                  }}
                />
              </>
            ) : (
              // フォールバック：サムネイル表示
              <div 
                className="absolute inset-0 w-full h-full bg-contain bg-no-repeat bg-center bg-black"
                style={{ backgroundImage: `url(${video.thumbnail})` }}
              >
                {videoErrors[video.id] && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <div className="text-white text-center p-4">
                      <p className="text-sm mb-2">動画を再生できません</p>
                      {video.iframeUrl && (
                        <button
                          onClick={() => setUseIframe(prev => ({ ...prev, [video.id]: true }))}
                          className="bg-white text-black px-4 py-2 rounded-full text-xs"
                        >
                          プレイヤーで再生
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* オーバーレイグラデーション */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/50 pointer-events-none" />

            {/* PC用ラッパー */}
            <div className="video-wrapper w-full h-full pointer-events-none">



              {/* タイムライン（横画面時は最下部、縦画面時は動画情報の上） */}
              {!isFullscreen && showControls && index === currentIndex && !useIframe[video.id] && (
                <div className={`absolute left-0 right-0 pointer-events-auto ${
                  isLandscape 
                    ? 'bottom-0 z-40' 
                    : window.innerWidth >= 768 
                      ? 'bottom-56 z-40' // タブレット
                      : 'bottom-52 z-40' // スマホ
                }`}>
                  <div className="px-4 pb-2">
                    <div className="bg-black/70 rounded-lg p-2">
                      {/* 再生時間 */}
                      <div className="flex items-center justify-between text-white text-xs mb-1">
                        <span>{formatTime(currentTime)}</span>
                        <span>{formatTime(duration)}</span>
                      </div>
                      
                      {/* タイムラインスライダー */}
                      <div className="relative py-2">
                        <input
                          type="range"
                          min="0"
                          max={duration || 100}
                          value={currentTime}
                          onChange={(e) => handleSeek(parseFloat(e.target.value))}
                          onInput={(e) => handleSeek(parseFloat(e.target.value))}
                          onTouchStart={(e) => {
                            e.stopPropagation();
                            // タッチ開始時にコントロールを表示し続ける
                            if (controlsTimeoutRef.current) {
                              clearTimeout(controlsTimeoutRef.current);
                            }
                          }}
                          onTouchMove={(e) => {
                            e.stopPropagation();
                          }}
                          onTouchEnd={(e) => {
                            e.stopPropagation();
                            // タッチ終了後にコントロール非表示タイマーを再開
                            showControlsTemporarily();
                          }}
                          className="w-full h-3 bg-white/30 rounded-lg appearance-none cursor-pointer touch-none"
                          style={{
                            background: `linear-gradient(to right, white ${(currentTime / duration) * 100}%, rgba(255,255,255,0.3) ${(currentTime / duration) * 100}%)`,
                            WebkitAppearance: 'none',
                            outline: 'none'
                          }}
                        />
                        <style jsx>{`
                          input[type="range"]::-webkit-slider-thumb {
                            -webkit-appearance: none;
                            appearance: none;
                            width: 20px;
                            height: 20px;
                            background: white;
                            border-radius: 50%;
                            cursor: pointer;
                            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                          }
                          input[type="range"]::-moz-range-thumb {
                            width: 20px;
                            height: 20px;
                            background: white;
                            border-radius: 50%;
                            cursor: pointer;
                            border: none;
                            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                          }
                        `}</style>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 動画情報（縦画面時のみ表示） */}
              {!isFullscreen && showControls && !isLandscape && (
                <div className="absolute bottom-0 left-0 right-0 z-30 pointer-events-auto">
                  <div className="p-4 pb-20 max-h-48 overflow-y-auto">
                    <div className="flex items-start space-x-3">
                      {/* 動画情報 */}
                      <div className="flex-1">
                        <h3 className="text-white font-semibold text-sm mb-1 line-clamp-2">
                          {video.title}
                        </h3>
                        <p className="text-white/80 text-xs mb-2">
                          {video.actress}
                        </p>
                        
                        {/* ジャンルタグ */}
                        <div className="flex flex-wrap gap-1">
                          {video.genre?.slice(0, 3).map((tag, idx) => (
                            <span
                              key={idx}
                              className="bg-white/20 text-white text-xs px-2 py-1 rounded"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}



              {/* タップゾーン（15秒スキップ） - 常に有効 */}
              {index === currentIndex && !useIframe[video.id] && (
                <>
                  {/* 左側タップゾーン - 画面の15% */}
                  <div 
                    className="absolute left-0 top-0 bottom-0 flex flex-col z-50 pointer-events-auto"
                    style={{ width: '15%' }}
                  >
                    <div 
                      className="flex-1 flex items-center justify-center"
                      onTouchStart={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                      }}
                      onTouchEnd={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        handleTapZone(skipButtonsPosition === 'left' ? 'left-top' : 'left-skip');
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        handleTapZone(skipButtonsPosition === 'left' ? 'left-top' : 'left-skip');
                      }}
                    >
                      {skipButtonsPosition === 'left' && showControls && (
                        <div className="bg-black/50 p-3 rounded-full transition-opacity duration-300 pointer-events-none">
                          <SkipForward className="w-6 h-6 text-white" />
                        </div>
                      )}
                    </div>
                    <div 
                      className="flex-1 flex items-center justify-center"
                      onTouchStart={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                      }}
                      onTouchEnd={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        handleTapZone(skipButtonsPosition === 'left' ? 'left-bottom' : 'left-skip');
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        handleTapZone(skipButtonsPosition === 'left' ? 'left-bottom' : 'left-skip');
                      }}
                    >
                      {skipButtonsPosition === 'left' && showControls && (
                        <div className="bg-black/50 p-3 rounded-full transition-opacity duration-300 pointer-events-none">
                          <SkipBack className="w-6 h-6 text-white" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 右側タップゾーン - 画面の15% */}
                  <div 
                    className="absolute right-0 top-0 bottom-0 flex flex-col z-50 pointer-events-auto"
                    style={{ width: '15%' }}
                  >
                    <div 
                      className="flex-1 flex items-center justify-center"
                      onTouchStart={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                      }}
                      onTouchEnd={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        handleTapZone(skipButtonsPosition === 'right' ? 'right-top' : 'right-skip');
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        handleTapZone(skipButtonsPosition === 'right' ? 'right-top' : 'right-skip');
                      }}
                    >
                      {skipButtonsPosition === 'right' && showControls && (
                        <div className="bg-black/50 p-3 rounded-full transition-opacity duration-300 pointer-events-none">
                          <SkipForward className="w-6 h-6 text-white" />
                        </div>
                      )}
                    </div>
                    <div 
                      className="flex-1 flex items-center justify-center"
                      onTouchStart={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                      }}
                      onTouchEnd={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        handleTapZone(skipButtonsPosition === 'right' ? 'right-bottom' : 'right-skip');
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        handleTapZone(skipButtonsPosition === 'right' ? 'right-bottom' : 'right-skip');
                      }}
                    >
                      {skipButtonsPosition === 'right' && showControls && (
                        <div className="bg-black/50 p-3 rounded-full transition-opacity duration-300 pointer-events-none">
                          <SkipBack className="w-6 h-6 text-white" />
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* 再生コントロール */}
              {index === currentIndex && !useIframe[video.id] && showControls && (
                <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-auto">
                  {/* 中央の再生/一時停止ボタン */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePlayPause();
                    }}
                    className="bg-black/50 p-4 rounded-full"
                  >
                    {isPlaying ? (
                      <Pause className="w-8 h-8 text-white" />
                    ) : (
                      <Play className="w-8 h-8 text-white" />
                    )}
                  </button>
                </div>
              )}

            </div>
          </div>
        ))}
      </div>

      {/* 2倍速インジケーター */}
      {isLongPressing && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none">
          <div className="bg-black/70 px-4 py-2 rounded-full">
            <span className="text-white text-lg font-bold">2x</span>
          </div>
        </div>
      )}

      {/* プログレスインジケーター（上部） */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-white/10 z-20">
        <div className="flex h-full">
          {videos.map((_, index) => (
            <div
              key={index}
              className={`flex-1 ${
                index <= currentIndex ? 'bg-white' : 'bg-white/30'
              } ${index > 0 ? 'ml-1' : ''}`}
            />
          ))}
        </div>
      </div>

      {/* ローディングインジケーター */}
      {loading && (
        <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 z-20">
          <div className="bg-black/70 px-4 py-2 rounded-full">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span className="text-white text-sm">読み込み中...</span>
            </div>
          </div>
        </div>
      )}

      {/* 次の動画を見るボタン */}
      {hasViewedAll && currentIndex === videos.length - 1 && onLoadMore && (
        <div className="absolute bottom-32 left-1/2 transform -translate-x-1/2 z-50">
          <button
            onClick={() => {
              setHasViewedAll(false);
              onLoadMore();
            }}
            className="bg-white text-black px-6 py-3 rounded-full font-medium shadow-lg hover:shadow-xl transition-shadow"
          >
            次の動画を見る
          </button>
        </div>
      )}
    </div>
  );
};

export default VideoSwiper;
