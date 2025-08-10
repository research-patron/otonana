import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Settings, BookOpen, Home, Hash, Book, X, MoreVertical, List } from 'lucide-react';

const DropdownMenu = ({ onSettingsClick, platform = 'fanza' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);

  const themeColors = {
    fanza: {
      accent: 'text-red-500',
      bg: 'bg-black/98',
      border: 'border-gray-600',
      hover: 'hover:bg-gray-800/80',
      buttonBg: 'bg-white/10',
      buttonHover: 'hover:bg-white/20',
      divider: 'border-gray-700'
    },
    duga: {
      accent: 'text-purple-500',
      bg: 'bg-purple-900/98',
      border: 'border-purple-500',
      hover: 'hover:bg-purple-800/80',
      buttonBg: 'bg-white/10',
      buttonHover: 'hover:bg-white/20',
      divider: 'border-purple-700'
    }
  };

  const colors = themeColors[platform];

  // フラットなメニュー構造に変更
  const menuItems = [
    { 
      icon: Settings, 
      label: '設定', 
      description: 'アプリの設定を変更',
      type: 'action',
      action: onSettingsClick
    },
    { 
      icon: BookOpen, 
      label: '操作マニュアル', 
      description: '使い方ガイド',
      type: 'external',
      url: platform === 'duga' ? '/duga/post/operation-manual.html' : '/post/operation-manual.html'
    },
    {
      icon: List,
      label: 'サイト一覧',
      description: '',
      type: 'header',
      isHeader: true
    },
    { 
      icon: Home, 
      label: 'otonana.org', 
      description: 'メインサイト',
      type: 'navigation',
      url: '/',
      isIndented: true
    },
    { 
      icon: Hash, 
      label: 'otonana.org/duga', 
      description: 'DUGAサイト',
      type: 'navigation',
      url: '/duga',
      isIndented: true
    },
    { 
      icon: Book, 
      label: 'otonana.org/post', 
      description: 'SEO集客ブログ',
      type: 'navigation',
      url: '/post',
      isIndented: true
    }
  ];

  const toggleDropdown = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  const handleItemClick = useCallback((item) => {
    // ヘッダー項目はクリック不可
    if (item.isHeader) return;
    
    if (item.type === 'action' && item.action) {
      item.action();
    } else if (item.type === 'external' && item.url) {
      window.open(item.url, '_blank', 'noopener,noreferrer');
    } else if (item.type === 'navigation' && item.url) {
      window.location.href = item.url;
    }
    setIsOpen(false);
  }, []);

  const handleClickOutside = useCallback((event) => {
    if (dropdownRef.current && 
        !dropdownRef.current.contains(event.target) && 
        buttonRef.current && 
        !buttonRef.current.contains(event.target)) {
      setIsOpen(false);
    }
  }, []);

  const handleKeyDown = useCallback((event) => {
    if (event.key === 'Escape') {
      setIsOpen(false);
      buttonRef.current?.focus();
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, handleClickOutside, handleKeyDown]);

  const IconComponent = ({ icon: Icon, className }) => (
    <Icon className={`${className} icon-bounce`} />
  );

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={toggleDropdown}
        className={`
          ${colors.buttonBg} ${colors.buttonHover}
          p-3 rounded-full transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-white/30
          transform hover:scale-105 active:scale-95
          backdrop-blur-enhanced
        `}
        style={{ minWidth: '44px', minHeight: '44px' }}
        aria-label="メニューを開く"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {isOpen ? (
          <X className="w-5 h-5 text-white transition-transform duration-200" />
        ) : (
          <MoreVertical className="w-5 h-5 text-white" />
        )}
      </button>

      {isOpen && (
        <div
          ref={dropdownRef}
          className={`
            absolute right-0 mt-2 menu-list-container menu-scroll
            ${colors.bg} ${colors.border}
            rounded-2xl border shadow-2xl backdrop-blur-enhanced
            z-50 overflow-y-auto
          `}
          style={{ 
            animation: 'dropIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' 
          }}
          role="menu"
          aria-orientation="vertical"
        >
          <div className="py-4">
            {menuItems.map((item, index) => (
              <div key={index} className="mb-1">
                {item.isHeader ? (
                  // ヘッダー項目（クリック不可）
                  <div className="px-4 py-3 flex items-center space-x-3 menu-header-item">
                    <div className={`
                      p-2 rounded-lg ${colors.accent.replace('text-', 'bg-').replace('-500', '-500/20')}
                      flex-shrink-0
                    `}>
                      <IconComponent 
                        icon={item.icon} 
                        className={`w-5 h-5 ${colors.accent}`} 
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-white">
                        {item.label}
                      </div>
                    </div>
                  </div>
                ) : (
                  // 通常の項目（クリック可能）
                  <button
                    onClick={() => handleItemClick(item)}
                    className={`
                      w-full py-3 text-left flex items-center space-x-3
                      text-white ${colors.hover} dropdown-item menu-item-enhanced
                      transition-all duration-200 focus:outline-none
                      focus:ring-2 focus:ring-inset focus:ring-white/20
                      rounded-none hover:rounded-lg mx-2
                      ${item.isIndented ? 'menu-indented-item' : 'px-4'}
                    `}
                    style={{ minHeight: '48px' }}
                    role="menuitem"
                  >
                    {/* アイコン */}
                    <div className={`
                      p-2 rounded-lg ${colors.accent.replace('text-', 'bg-').replace('-500', '-500/20')}
                      flex-shrink-0
                    `}>
                      <IconComponent 
                        icon={item.icon} 
                        className={`w-4 h-4 ${colors.accent}`} 
                      />
                    </div>
                    
                    {/* テキストコンテンツ */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white">
                        {item.label}
                      </div>
                      {item.description && (
                        <div className="text-xs text-gray-300 leading-relaxed">
                          {item.description}
                        </div>
                      )}
                    </div>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DropdownMenu;