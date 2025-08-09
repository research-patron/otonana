import React from 'react';
import { X, Heart } from 'lucide-react';

const FavoritesPanel = ({ videos, favorites, onClose, onSelect, onRemoveFavorite }) => {
  // お気に入りの動画のみをフィルタリング
  const favoriteVideos = videos.filter(video => favorites.includes(video.id));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-95 z-50 overflow-y-auto">
      <div className="min-h-screen p-4">
        <div className="max-w-4xl mx-auto">
          {/* ヘッダー */}
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-white text-2xl font-bold flex items-center">
              <Heart className="w-6 h-6 mr-2 text-red-500 fill-current" />
              お気に入り
            </h2>
            <button
              onClick={onClose}
              className="text-white p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* お気に入りリスト */}
          {favoriteVideos.length === 0 ? (
            <div className="text-center py-20">
              <Heart className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 text-lg">まだお気に入りはありません</p>
              <p className="text-gray-500 text-sm mt-2">
                動画の右側にあるハートボタンをタップして追加してください
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {favoriteVideos.map(video => (
                <div 
                  key={video.id}
                  className="bg-gray-900 rounded-lg overflow-hidden hover:bg-gray-800 transition-colors group cursor-pointer"
                >
                  <div 
                    className="relative aspect-video"
                    onClick={() => onSelect(video)}
                  >
                    <img 
                      src={video.thumbnail} 
                      alt={video.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="text-white text-sm">再生</div>
                    </div>
                  </div>
                  
                  <div className="p-3">
                    <h3 className="text-white text-sm font-medium line-clamp-2 mb-1">
                      {video.title}
                    </h3>
                    <p className="text-gray-400 text-xs">
                      {video.actress}
                    </p>
                    
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex flex-wrap gap-1">
                        {video.genre?.slice(0, 2).map((tag, idx) => (
                          <span
                            key={idx}
                            className="bg-gray-700 text-gray-300 text-xs px-2 py-0.5 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveFavorite(video.id);
                        }}
                        className="text-red-500 hover:text-red-400 transition-colors"
                      >
                        <Heart className="w-4 h-4 fill-current" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FavoritesPanel;