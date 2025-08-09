import React from 'react';

const DugaBlogIndex = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-purple-900 text-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-800/20 to-indigo-800/20 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-24">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
              🚀 DUGA Swipe攻略ガイド
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed">
              個人撮影・ライブ配信に特化したDUGAをTikTok風インターフェースで楽しむ完全マニュアル
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <a href="/duga" className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-8 py-4 rounded-full text-lg font-semibold hover:from-purple-700 hover:to-indigo-700 transition-all duration-300 transform hover:scale-105 shadow-2xl">
                ✨ 今すぐDUGA Swipeを体験する
              </a>
              <span className="text-sm text-gray-400">登録不要・完全無料</span>
            </div>
          </div>
        </div>
      </div>

      {/* Coming Soon Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6 text-white">
            🚧 コンテンツ準備中
          </h2>
          <p className="text-lg text-gray-300 max-w-4xl mx-auto leading-relaxed mb-8">
            DUGA専用の攻略ガイドを現在制作中です。個人撮影やライブ配信など、
            DUGAならではのコンテンツを最大限に楽しむためのテクニックを詳しく解説予定です。
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Preview Cards */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <div className="text-4xl mb-4">📱</div>
              <h3 className="text-xl font-bold mb-3 text-white">
                個人撮影コンテンツの見つけ方
              </h3>
              <p className="text-gray-300 text-sm leading-relaxed">
                DUGAならではの個人撮影・素人コンテンツを効率的に発見する方法
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <div className="text-4xl mb-4">🔴</div>
              <h3 className="text-xl font-bold mb-3 text-white">
                ライブ配信を最大限活用
              </h3>
              <p className="text-gray-300 text-sm leading-relaxed">
                リアルタイムライブ配信の楽しみ方とお得な視聴テクニック
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <div className="text-4xl mb-4">💰</div>
              <h3 className="text-xl font-bold mb-3 text-white">
                DUGA限定セール攻略法
              </h3>
              <p className="text-gray-300 text-sm leading-relaxed">
                お得なキャンペーンやセール情報をいち早くキャッチする方法
              </p>
            </div>
          </div>

          <div className="mt-12 bg-gradient-to-r from-purple-600/20 to-indigo-600/20 rounded-3xl p-8 md:p-12 border border-white/10">
            <h3 className="text-2xl font-bold mb-4 text-white">
              📢 更新情報をお見逃しなく
            </h3>
            <p className="text-gray-300 mb-6">
              DUGA攻略ガイドの公開と同時に、皆様にお知らせいたします。
              今しばらくお待ちください。
            </p>
            <a href="/duga" className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-8 py-3 rounded-full font-semibold hover:from-purple-700 hover:to-indigo-700 transition-all duration-300">
              DUGA Swipeを先に体験する
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DugaBlogIndex;