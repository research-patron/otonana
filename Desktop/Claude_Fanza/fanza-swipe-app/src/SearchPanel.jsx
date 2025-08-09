import React, { useState } from 'react';

const SearchPanel = ({ onClose, onSearchKeyword }) => {
  const [searchQuery, setSearchQuery] = useState('');

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
    </div>
  );
};

export default SearchPanel;
