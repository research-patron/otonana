# WordPress記事最適化提案アプリケーション

WordPress記事の作成・最適化をAIが支援するWebアプリケーションです。ユーザー自身のGemini APIキーを使用して、SEOに最適化された質の高い記事提案を行い、直接WordPressサイトに投稿できます。

## 🚀 主要機能

### ✨ AI記事提案
- **Gemini AI連携**: Google Gemini 2.5 Pro/Flash APIを使用
- **SEOタイトル生成**: 3-5パターンの最適化されたタイトル提案
- **記事構成提案**: H2-H4見出し構成と各セクション概要
- **メタディスクリプション**: 120-160文字の検索最適化説明文
- **カテゴリー・タグ**: 既存データを分析した適切な分類提案

### 📝 高機能エディタ
- **ビジュアルエディタ**: TinyMCEベースのリッチテキストエディタ
- **Markdownエディタ**: 軽量なMarkdownエディタ（プレビュー機能付き）
- **リアルタイム文字数カウント**: 読了時間推定機能
- **自動保存**: 30秒ごとの自動下書き保存

### 🔗 WordPress連携
- **REST API接続**: WordPress REST APIを使用した安全な接続
- **複数認証方式**: Application Passwords、Basic認証、カスタムヘッダー対応
- **最大5サイト管理**: 複数のWordPressサイトを同時管理
- **直接投稿**: 下書き・公開状態での即座投稿

### 🛡️ セキュリティ
- **APIキー暗号化**: クライアントサイドでの暗号化保存
- **Firebase Functions**: 機密情報保護用のサーバーレス機能
- **プライベートモード推奨**: セキュリティ警告・推奨事項表示

### 📊 使用統計・管理
- **API使用量追跡**: 日次・月次のAPI使用統計
- **コスト概算**: Gemini APIの推定コスト表示
- **設定管理**: エクスポート・インポート機能

## 🛠️ 技術スタック

- **フロントエンド**: React 18 + TypeScript + Vite
- **UIフレームワーク**: Material-UI (MUI)
- **状態管理**: Zustand
- **エディタ**: TinyMCE + 自作Markdownエディタ
- **バックエンド**: Firebase Functions (Node.js)
- **データベース**: Firestore + LocalStorage
- **ホスティング**: Firebase Hosting
- **AI API**: Google Gemini 2.5 Pro/Flash
- **外部API**: WordPress REST API

## 📋 システム要件

- **Node.js**: 18.x以上
- **ブラウザ**: Chrome, Firefox, Safari, Edge (最新2バージョン)
- **WordPress**: 5.0以上、REST API有効化必須
- **Gemini API**: Google AI Studio APIキー

## 🚀 セットアップ

### 1. 依存関係のインストール

```bash
cd wordpress-optimizer
npm install
```

### 2. Firebase設定

```bash
# Firebase CLI インストール（グローバル）
npm install -g firebase-tools

# Firebaseログイン
firebase login

# プロジェクト設定確認
firebase use adjust-wordpress
```

### 3. 環境構築

```bash
# 開発サーバー起動
npm run dev

# ビルド（本番用）
npm run build

# プレビュー（ビルド後）
npm run preview
```

### 4. Firebase Functions デプロイ（オプション）

```bash
cd functions
npm install
npm run build
firebase deploy --only functions
```

## 🔧 設定手順

### 1. Gemini APIキー取得
1. [Google AI Studio](https://makersuite.google.com/app/apikey) にアクセス
2. 新しいAPIキーを作成
3. アプリの設定画面でAPIキーを入力

### 2. WordPressサイト設定
1. WordPressサイトでREST APIを有効化
2. Application Passwordsを作成（推奨）
3. アプリでサイト情報と認証情報を入力
4. 接続テストを実行

### 3. 初回使用
1. サイト分析を実行（カテゴリー・タグ・既存記事を分析）
2. 記事タイトルまたは内容を入力
3. AI提案を生成
4. エディタで記事を作成・編集
5. 下書き保存または直接投稿

## 📁 プロジェクト構造

```
wordpress-optimizer/
├── public/                 # 静的ファイル
├── src/
│   ├── components/         # Reactコンポーネント
│   │   ├── common/        # 共通コンポーネント
│   │   ├── editor/        # エディタ関連
│   │   ├── layout/        # レイアウト
│   │   └── wordpress/     # WordPress連携
│   ├── config/            # 設定ファイル
│   ├── hooks/             # カスタムフック
│   ├── pages/             # ページコンポーネント
│   ├── services/          # API連携サービス
│   ├── store/             # 状態管理（Zustand）
│   ├── types/             # TypeScript型定義
│   └── utils/             # ユーティリティ
├── functions/             # Firebase Functions
├── firebase.json          # Firebase設定
├── firestore.rules        # Firestoreルール
└── README.md
```

## 🔒 セキュリティ注意事項

- **APIキー管理**: プライベートブラウジングでの使用推奨
- **定期更新**: APIキーは定期的に更新
- **権限確認**: WordPress側で最小限の権限設定
- **HTTPS必須**: セキュアな接続でのみ使用

## 📊 API使用量とコスト

### Gemini API料金（概算）
- **Gemini 2.5 Pro**: 入力 $0.00125/1K tokens, 出力 $0.005/1K tokens
- **Gemini 2.5 Flash**: 入力 $0.000075/1K tokens, 出力 $0.0003/1K tokens

### 推定使用量
- 記事1本の提案生成: 約2,000-4,000 tokens
- 月100記事作成: 約$2-10（使用モデル・内容により変動）

## 🚫 制限事項

### 技術的制限
- ローカルストレージ容量: 5-10MB
- 同時接続サイト数: 最大5サイト
- CORS制限: 一部WordPressサイトで接続不可の場合あり

### 機能制限
- カスタムブロック（Gutenberg）の完全サポート困難
- メディアアップロード: 既存ライブラリからの選択のみ
- リアルタイム共同編集: 非対応

## 🔄 今後の拡張予定

- [ ] ブラウザ拡張機能版
- [ ] デスクトップアプリ版（Electron）
- [ ] 他AI API対応（Claude, GPT-4等）
- [ ] 画像生成AI連携
- [ ] チーム共有機能

## 📝 ライセンス

MIT License - 詳細は[LICENSE](LICENSE)ファイルを参照

## 🤝 サポート・フィードバック

- **GitHub Issues**: バグ報告・機能要望
- **ドキュメント**: [仕様書](../wordpress-optimizer-spec.md)参照

---

**⚠️ 重要**: このアプリケーションはAI支援ツールです。生成されたコンテンツは必ず確認・編集してから公開してください。
