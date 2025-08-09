import React, { useState } from 'react';

const SearchPanel = ({ onSearch, onSelect, onClose, onSearchKeyword }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const performSearch = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    
    setLoading(true);
    try {
      const results = await onSearch(query);
      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    // エンターキーを押すまで検索しない
    // performSearch(query);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      // エンターキー押下時は検索を実行して検索パネルを閉じる
      if (onSearchKeyword) {
        onSearchKeyword(searchQuery.trim());
      }
    }
  };

  return (
    <div className="fixed top-0 left-0 right-0 bg-black bg-opacity-95 text-white p-4 z-50">
      <div className="flex items-center space-x-2 mb-4">
        <input
          type="text"
          placeholder="動画、女優、ジャンルを検索... (Enterで検索)"
          value={searchQuery}
          onChange={handleSearchChange}
          onKeyPress={handleKeyPress}
          className="flex-1 bg-gray-800 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-white"
          autoFocus
        />
        <button
          onClick={onClose}
          className="bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
        >
          閉じる
        </button>
      </div>
      
      {loading && (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
        </div>
      )}
      
      {!loading && searchResults.length > 0 && (
        <div className="max-h-96 overflow-y-auto">
          <h3 className="text-sm font-bold mb-2 text-gray-400">検索結果 ({searchResults.length})</h3>
          <div className="grid grid-cols-2 gap-2">
            {searchResults.map(video => (
              <div 
                key={video.id}
                className="bg-gray-800 rounded p-2 cursor-pointer hover:bg-gray-700"
                onClick={() => onSelect(video)}
              >
                <img 
                  src={video.thumbnail} 
                  alt={video.title}
                  className="w-full h-20 object-cover rounded mb-1"
                />
                <p className="text-xs font-medium truncate">{video.title}</p>
                <p className="text-xs text-gray-400 truncate">{video.actress}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchPanel;