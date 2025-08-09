import React, { useState } from 'react';
import VideoSwiper from './VideoSwiper';

const OnboardingScreen = ({ videos, onComplete, updateUserBehavior }) => {
  const [likedVideos, setLikedVideos] = useState([]);
  const [dislikedVideos, setDislikedVideos] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [ratedCount, setRatedCount] = useState(0);

  const handleVideoChange = (index) => {
    setCurrentIndex(index);
  };

  const handleFavorite = (videoId) => {
    const video = videos.find(v => v.id === videoId);
    if (!video) return;

    if (likedVideos.includes(videoId)) {
      // すでにいいねしている場合は取り消し
      setLikedVideos(prev => prev.filter(id => id !== videoId));
    } else {
      // いいねする
      setLikedVideos(prev => [...prev, videoId]);
      updateUserBehavior('like', video);
      
      // 評価済みカウントを増やす
      setRatedCount(prev => prev + 1);
      
      // 十分な評価が集まったら完了
      if (ratedCount >= 4) { // 5つ評価したら完了
        setTimeout(() => completeOnboarding(), 500);
      }
    }
  };

  const completeOnboarding = () => {
    const likedGenres = new Set();
    const likedActresses = new Set();
    
    videos.forEach(video => {
      if (likedVideos.includes(video.id)) {
        video.genre?.forEach(genre => likedGenres.add(genre));
        likedActresses.add(video.actress);
      }
    });
    
    const preferences = {
      genres: Array.from(likedGenres),
      actresses: Array.from(likedActresses),
      duration: 'all',
      quality: 'high'
    };
    
    onComplete(preferences);
  };

  return (
    <div className="fixed inset-0 bg-black z-50">
      {/* ヘッダー */}
      <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black to-transparent z-20">
        <div className="text-center text-white">
          <h2 className="text-lg font-bold">あなたの好みを教えてください</h2>
          <p className="text-sm opacity-80 mt-1">
            気に入った動画にいいね❤️をタップしてください
          </p>
          <div className="mt-2">
            <p className="text-xs opacity-60">評価済み: {ratedCount} / 5</p>
            <div className="w-full bg-gray-600 rounded-full h-2 mt-1">
              <div 
                className="bg-white h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min((ratedCount / 5) * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* VideoSwiperを使用 */}
      <VideoSwiper
        videos={videos}
        onVideoChange={handleVideoChange}
        onFavorite={handleFavorite}
        favorites={likedVideos}
        loading={false}
        hideBottomNav={true} // オンボーディング中は下部ナビを非表示
      />

      {/* スキップボタン */}
      <button
        onClick={completeOnboarding}
        className="absolute top-20 right-4 text-white text-sm underline opacity-70 hover:opacity-100 z-30"
      >
        スキップ
      </button>

      {/* インストラクション */}
      <div className="absolute bottom-32 left-0 right-0 px-8 pointer-events-none z-30">
        <div className="text-white text-center bg-black/50 rounded-lg p-4">
          <p className="text-sm">
            上下にスワイプして動画を切り替え
          </p>
          <p className="text-xs opacity-80 mt-1">
            右側の❤️ボタンで「いいね」できます
          </p>
        </div>
      </div>
    </div>
  );
};

export default OnboardingScreen;