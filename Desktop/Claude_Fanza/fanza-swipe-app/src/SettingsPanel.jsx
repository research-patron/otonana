import React, { useState, useEffect } from 'react';
import { Smartphone, BookOpen, Home, Hash, Book, ExternalLink } from 'lucide-react';

const SettingsPanel = ({ user, preferences, onClose, onPreferencesChange, onResetOnboarding, platform = 'fanza' }) => {
  const [skipButtonsPosition, setSkipButtonsPosition] = useState('left');

  useEffect(() => {
    const savedPosition = localStorage.getItem('fanza_skip_buttons_position') || 'left';
    setSkipButtonsPosition(savedPosition);
  }, []);

  const handleSkipPositionChange = (position) => {
    setSkipButtonsPosition(position);
    localStorage.setItem('fanza_skip_buttons_position', position);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-95 z-50 overflow-y-auto">
      <div className="min-h-screen p-4">
        <div className="max-w-md mx-auto">
          {/* ヘッダー */}
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-white text-2xl font-bold">設定</h2>
            <button
              onClick={onClose}
              className="text-white text-2xl"
            >
              ×
            </button>
          </div>


          {/* 操作設定 */}
          <div className="bg-gray-900 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-3 mb-4">
              <Smartphone className="w-6 h-6 text-gray-400" />
              <h3 className="text-white font-semibold">操作設定</h3>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-gray-400 text-sm mb-3">15秒スキップボタンの位置</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleSkipPositionChange('left')}
                    className={`p-3 rounded-lg border transition-colors ${
                      skipButtonsPosition === 'left'
                        ? 'bg-white text-black border-white'
                        : 'bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700'
                    }`}
                  >
                    <div className="text-xs mb-1">左手操作</div>
                    <div className="text-xs opacity-70">左側タップでスキップ</div>
                  </button>
                  <button
                    onClick={() => handleSkipPositionChange('right')}
                    className={`p-3 rounded-lg border transition-colors ${
                      skipButtonsPosition === 'right'
                        ? 'bg-white text-black border-white'
                        : 'bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700'
                    }`}
                  >
                    <div className="text-xs mb-1">右手操作</div>
                    <div className="text-xs opacity-70">右側タップでスキップ</div>
                  </button>
                </div>
                <p className="text-gray-500 text-xs mt-2">
                  {skipButtonsPosition === 'left' 
                    ? '左側の上部をダブルタップで15秒進む、下部で15秒戻る'
                    : '右側の上部をダブルタップで15秒進む、下部で15秒戻る'
                  }
                </p>
              </div>
            </div>
          </div>


          {/* 操作マニュアル */}
          <div className="bg-gray-900 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-3 mb-4">
              <BookOpen className="w-6 h-6 text-blue-400" />
              <h3 className="text-white font-semibold">操作マニュアル</h3>
            </div>
            <button
              onClick={() => window.open(platform === 'duga' ? '/duga/post/operation-manual.html' : '/post/operation-manual.html', '_blank')}
              className="w-full bg-gray-800 hover:bg-gray-700 text-white p-3 rounded-lg transition-colors flex items-center justify-between"
            >
              <span>使い方ガイドを開く</span>
              <ExternalLink className="w-4 h-4" />
            </button>
          </div>

          {/* サイト一覧 */}
          <div className="bg-gray-900 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-3 mb-4">
              <Home className="w-6 h-6 text-green-400" />
              <h3 className="text-white font-semibold">サイト一覧</h3>
            </div>
            <div className="space-y-2">
              <button
                onClick={() => window.location.href = '/'}
                className="w-full bg-gray-800 hover:bg-gray-700 text-white p-3 rounded-lg transition-colors flex items-center justify-between text-left"
              >
                <div>
                  <div className="font-medium">メインサイト</div>
                  <div className="text-sm text-gray-400">otonana.org</div>
                </div>
                <Home className="w-4 h-4 text-blue-400" />
              </button>
              
              <button
                onClick={() => window.location.href = '/duga'}
                className="w-full bg-gray-800 hover:bg-gray-700 text-white p-3 rounded-lg transition-colors flex items-center justify-between text-left"
              >
                <div>
                  <div className="font-medium">DUGAサイト</div>
                  <div className="text-sm text-gray-400">otonana.org/duga</div>
                </div>
                <Hash className="w-4 h-4 text-purple-400" />
              </button>
              
              <button
                onClick={() => window.location.href = '/post'}
                className="w-full bg-gray-800 hover:bg-gray-700 text-white p-3 rounded-lg transition-colors flex items-center justify-between text-left"
              >
                <div>
                  <div className="font-medium">記事一覧</div>
                  <div className="text-sm text-gray-400">otonana.org/post</div>
                </div>
                <Book className="w-4 h-4 text-yellow-400" />
              </button>
            </div>
          </div>

          {/* バージョン情報 */}
          <div className="mt-8 text-center text-gray-500 text-xs">
            <p>FANZA Swipe App v1.0.0</p>
            <p className="mt-1">© 2024 All rights reserved</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;