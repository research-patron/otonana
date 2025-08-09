# オトナナ デプロイガイド

## 機密情報の管理について

### ビルド時の環境変数

このアプリケーションでは、Viteの環境変数システムを使用しています。
- `VITE_` プレフィックスの付いた環境変数は**クライアントサイドに露出します**
- APIキーとアフィリエイトIDはクライアントサイドで使用されるため、本番環境での露出は避けられません
- **重要**: 本番環境では必ず本番用のAPIキーを使用してください

### セキュリティ確認事項

1. `.env` ファイルは `.gitignore` に含まれています ✅
2. ビルド成果物（`dist/`）はGitにコミットされません ✅
3. APIキーはハードコードされていません ✅
4. デバッグモードはデフォルトで無効になっています ✅

## デプロイ方法

### 1. Vercel を使用したデプロイ（推奨）

#### 事前準備
```bash
# プロジェクトをGitHubにプッシュ
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/otonana-app.git
git push -u origin main
```

#### Vercelでのセットアップ

1. [Vercel](https://vercel.com) にアクセスしてアカウントを作成
2. "Import Project" をクリック
3. GitHubリポジトリを選択
4. 以下の設定を行う：
   - Framework Preset: `Vite`
   - Build Command: `npm run build`
   - Output Directory: `dist`
5. 環境変数を設定：
   - `VITE_FANZA_API_ID`: あなたのAPIキー
   - `VITE_FANZA_AFFILIATE_ID`: あなたのアフィリエイトID
6. "Deploy" をクリック

#### カスタムドメインの設定
1. Vercelダッシュボードでプロジェクトを選択
2. "Settings" → "Domains"
3. カスタムドメインを追加
4. DNSレコードを設定

### 2. Netlify を使用したデプロイ

#### GitHubとの連携
1. [Netlify](https://www.netlify.com) でアカウントを作成
2. "New site from Git" をクリック
3. GitHubを選択して認証
4. リポジトリを選択
5. ビルド設定：
   - Build command: `npm run build`
   - Publish directory: `dist`
6. 環境変数を設定（Site settings → Environment variables）

#### 手動デプロイ
```bash
# ビルド
npm run build

# Netlify CLIをインストール
npm install -g netlify-cli

# デプロイ
netlify deploy --dir=dist --prod
```

### 3. Cloudflare Pages を使用したデプロイ

```bash
# ビルド
npm run build

# Wrangler CLIをインストール
npm install -g wrangler

# Cloudflareにログイン
wrangler login

# デプロイ
wrangler pages deploy dist --project-name=otonana-app

# 環境変数はCloudflareダッシュボードで設定
```

### 4. 静的ホスティング（Apache/Nginx）

```bash
# ビルド
npm run build

# distフォルダの内容をWebサーバーにアップロード
scp -r dist/* user@yourserver.com:/var/www/html/
```

#### Nginx設定例
```nginx
server {
    listen 80;
    server_name otonana.com;
    root /var/www/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # HTTPS推奨
    # Let's Encryptを使用した証明書の設定
}
```

## パフォーマンス最適化

### 最大同時アクセス1000件対応

アプリケーションは以下の最適化により、最大1000件の同時アクセスに対応しています：

1. **接続数管理**
   - API同時接続数: 最大10件
   - 動画同時読み込み数: 最大3件
   - iframe同時使用数: 最大2件

2. **広告ブロック**
   - 外部広告トラッキングスクリプトを自動ブロック
   - 不要なネットワークリクエストを削減

3. **セキュリティヘッダー**
   - Content Security Policy (CSP) で許可されたドメインのみに制限
   - 悪意のあるスクリプトの実行を防止

## デプロイ前のチェックリスト

- [ ] 環境変数が正しく設定されている
- [ ] `.env` ファイルがGitにコミットされていない
- [ ] APIキーが本番用のものになっている
- [ ] ビルドが正常に完了する
- [ ] ローカルでのプレビューが正常に動作する（`npm run preview`）
- [ ] HTTPS/SSL証明書の設定が完了している
- [ ] vercel.json または netlify.toml が含まれている

## トラブルシューティング

### 環境変数が読み込まれない
- 環境変数名が `VITE_` で始まっているか確認
- デプロイサービスで環境変数が設定されているか確認
- ビルド後に環境変数を変更した場合は、再ビルドが必要

### CORS エラー
- FANZA APIはJSONP形式で呼び出しているため、通常のCORSエラーは発生しません
- もし発生する場合は、APIキーとアフィリエイトIDが正しいか確認

### 404エラー
- SPAのルーティング設定が正しくない可能性があります
- 上記のNginx設定例を参考にしてください

## セキュリティのベストプラクティス

1. **APIキーの管理**
   - 本番環境では必ず本番用のAPIキーを使用
   - 定期的にAPIキーをローテーション
   - 不要なアクセス権限は削除

2. **HTTPS の使用**
   - 必ずHTTPS/SSLを有効化
   - HTTP Strict Transport Security (HSTS) の設定を推奨

3. **Content Security Policy**
   - 適切なCSPヘッダーを設定
   - XSS攻撃を防ぐ

4. **定期的な依存関係の更新**
   ```bash
   npm audit
   npm update
   ```