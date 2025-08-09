# FANZA動画アプリ開発環境構築ガイド

## 📋 必要なID情報

### **API IDとアフィリエイトIDの違い**

検索結果から確認した正確な情報：

- **API ID**: DMM Webサービス利用のために発行される専用ID
- **アフィリエイトID**: DMM アフィリエイト用のID（990-999の特殊ID範囲）

**⚠️ 重要**: APIアクセス時は両方のIDが必要です！
```javascript
// APIリクエスト例
https://api.dmm.com/affiliate/v3/ItemList?
api_id=[API_ID]&
affiliate_id=[アフィリエイトID]&
site=FANZA&service=digital&floor=videoa
```

## 🔑 ID取得手順

### **1. DMMアフィリエイト登録**
1. [DMM.com](https://www.dmm.com) で会員登録
2. [DMMアフィリエイト](https://affiliate.dmm.com/) に登録
3. サイト審査（3営業日程度）

### **2. API ID取得**
1. DMMアフィリエイト管理画面にログイン
2. 「Webサービス」→「利用登録」
3. 利用規約に同意して「API IDを発行する」をクリック
4. **即時発行**されます

### **3. アフィリエイトID確認**
1. 管理画面「登録情報」→「登録情報トップ」
2. 「商品情報API用登録」項目を確認
3. **990-999番台のID**を使用してください

## 🛠 開発環境要件

### **必須ソフトウェア**

#### **1. Node.js環境**
```bash
# Node Version Manager (推奨)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Node.js LTS版インストール
nvm install --lts
nvm use --lts

# バージョン確認
node --version  # v18.0.0以上推奨
npm --version   # 9.0.0以上推奨
```

#### **2. React開発環境**
```bash
# Create React App（グローバルインストール不要）
npx create-react-app fanza-swipe-app
cd fanza-swipe-app

# 開発サーバー起動
npm start
```

#### **3. 必要パッケージ**
```bash
# プロジェクト作成後に追加インストール
npm install axios          # API通信
npm install lucide-react    # アイコン
npm install tailwindcss     # CSS フレームワーク
```

### **開発ツール（推奨）**

#### **コードエディタ**
- **Visual Studio Code** (無料・推奨)
  - React Extension Pack
  - ES7+ React/Redux/React-Native snippets
  - Tailwind CSS IntelliSense

#### **バージョン管理**
```bash
# Git設定
git --version  # 2.30.0以上推奨
git config --global user.name "あなたの名前"
git config --global user.email "your-email@example.com"
```

#### **ブラウザ**
- **Chrome** + React Developer Tools
- **Firefox** + React Developer Tools

## 🚀 プロジェクト初期化

### **1. プロジェクト作成**
```bash
# React アプリ作成
npx create-react-app fanza-swipe-app
cd fanza-swipe-app

# Tailwind CSS セットアップ
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### **2. Tailwind CSS 設定**
`tailwind.config.js`:
```javascript
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

`src/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### **3. API設定ファイル**
`src/config/fanza.js`:
```javascript
export const FANZA_CONFIG = {
  API_ID: 'YOUR_API_ID_HERE',        // ← API ID
  AFFILIATE_ID: 'YOUR_AFFILIATE_ID', // ← アフィリエイトID  
  BASE_URL: 'https://api.dmm.com/affiliate/v3/ItemList',
  SITE: 'FANZA',
  SERVICE: 'digital',
  FLOOR: 'videoa'
};
```

## 📁 推奨プロジェクト構造

```
fanza-swipe-app/
├── public/
│   └── index.html
├── src/
│   ├── components/           # React コンポーネント
│   │   ├── VideoPlayer.js
│   │   ├── Navigation.js
│   │   └── ...
│   ├── config/              # 設定ファイル
│   │   └── fanza.js
│   ├── hooks/               # カスタムフック
│   │   └── useFanzaAPI.js
│   ├── utils/               # ユーティリティ
│   │   └── api.js
│   ├── App.js               # メインコンポーネント
│   └── index.js             # エントリーポイント
├── package.json
└── README.md
```

## 🔒 環境変数設定

### **本番環境用**
`.env`:
```bash
REACT_APP_FANZA_API_ID=your_actual_api_id
REACT_APP_FANZA_AFFILIATE_ID=your_actual_affiliate_id
```

`src/config/fanza.js` (本番用):
```javascript
export const FANZA_CONFIG = {
  API_ID: process.env.REACT_APP_FANZA_API_ID,
  AFFILIATE_ID: process.env.REACT_APP_FANZA_AFFILIATE_ID,
  // その他設定...
};
```

## 🌐 デプロイ環境

### **1. 開発用サーバー**
```bash
npm start  # http://localhost:3000
```

### **2. 本番ビルド**
```bash
npm run build
```

### **3. 本番デプロイ先（推奨）**
- **Vercel** (無料・簡単)
- **Netlify** (無料・簡単)
- **AWS S3 + CloudFront**
- **さくらのレンタルサーバー**

## ⚡ パフォーマンス考慮事項

### **API制限**
- リクエスト間隔: **1秒以上**推奨
- 1日のリクエスト上限: 要確認
- レスポンス時間: 1-3秒程度

### **CORS対応**
FANZA APIはJSONP形式のため、CORS問題は発生しません。

### **キャッシュ戦略**
```javascript
// APIレスポンスキャッシュ
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5分

const fetchWithCache = async (url) => {
  const cached = cache.get(url);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  
  const data = await fetchAPI(url);
  cache.set(url, { data, timestamp: Date.now() });
  return data;
};
```

## 🔧 必要な最小システム要件

### **開発マシン**
- **OS**: Windows 10/11, macOS 10.15+, Ubuntu 18.04+
- **RAM**: 8GB以上推奨
- **ストレージ**: 5GB以上の空き容量
- **インターネット**: 常時接続必須

### **ブラウザサポート**
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 📞 サポート・リファレンス

### **公式ドキュメント**
- [DMM Web APIサービス](https://affiliate.dmm.com/api/)
- [React公式ドキュメント](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)

### **トラブルシューティング**
1. **API IDが取得できない**
   → DMMアフィリエイト審査完了を確認

2. **API レスポンスが空**
   → アフィリエイトIDが990-999範囲か確認

3. **JSONP エラー**
   → Content Security Policy設定を確認

## ✅ 開発開始チェックリスト

- [ ] Node.js v18以上インストール済み
- [ ] DMMアフィリエイト登録・審査完了
- [ ] API ID取得済み
- [ ] アフィリエイトID（990-999）確認済み
- [ ] React開発環境構築完了
- [ ] VS Code + 拡張機能インストール済み
- [ ] Git設定完了
- [ ] プロジェクト初期化済み

**これで開発環境の準備完了です！🎉**