import React, { useEffect } from 'react';

const ProductDetailsModal = ({ video, onClose, onPurchase }) => {
  // Escapeキーでモーダルを閉じる
  useEffect(() => {
    if (!video) return;
    
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [video, onClose]);
  
  if (!video) return null;
  
  const isOnSale = new Date(video.saleEndsAt) > new Date();
  const originalPrice = parseInt(video.originalPrice.replace('¥', '').replace(',', ''));
  const currentPrice = parseInt(video.price.replace('¥', '').replace(',', ''));
  const discount = Math.round(((originalPrice - currentPrice) / originalPrice) * 100);

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-75 flex items-end justify-center z-50"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-t-3xl w-full max-w-md max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-900">作品詳細</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-4">
          <img 
            src={video.thumbnail} 
            alt={video.title}
            className="w-full h-48 object-cover rounded-lg mb-4"
          />
          
          <h3 className="text-xl font-bold text-gray-900 mb-2">{video.title}</h3>
          <p className="text-gray-600 mb-3">{video.actress}</p>
          
          <div className="flex items-center mb-4">
            <div className="flex text-yellow-400">
              {[...Array(5)].map((_, i) => (
                <span key={i} className={i < Math.floor(video.rating) ? 'text-yellow-400' : 'text-gray-300'}>
                  ★
                </span>
              ))}
            </div>
            <span className="text-gray-600 ml-2 text-sm">
              {video.rating} ({video.reviewCount}件のレビュー)
            </span>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-2xl font-bold text-red-600">{video.price}</span>
                  {isOnSale && (
                    <span className="text-sm text-gray-500 line-through">{video.originalPrice}</span>
                  )}
                </div>
                {isOnSale && (
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="bg-red-500 text-white text-xs px-2 py-1 rounded">{discount}% OFF</span>
                    <span className="text-sm text-gray-600">セール終了: {video.saleEndsAt}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mb-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">ジャンル</h4>
            <div className="flex flex-wrap gap-1">
              {video.genre?.map(genre => (
                <span key={genre} className="bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded">
                  {genre}
                </span>
              ))}
            </div>
          </div>

          <button
            onClick={onPurchase}
            className="w-full bg-black text-white py-4 rounded-lg font-bold text-lg hover:bg-gray-800 transition-colors"
          >
            今すぐ購入する
          </button>
          
          <p className="text-xs text-gray-500 text-center mt-2">
            ※外部サイト(FANZA)に移動します
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailsModal;
