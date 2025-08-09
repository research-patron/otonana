#!/bin/bash

echo "=== Cloud Functions 完全修正デプロイ ==="
echo ""
echo "⚠️  重複した関数を削除して、正しくデプロイします"
echo ""

# 現在のディレクトリを保存
ORIGINAL_DIR=$(pwd)

echo "📋 現在デプロイされている関数："
firebase functions:list
echo ""

echo "🗑️  us-central1の古い関数を削除します..."
echo ""

# us-central1の関数を削除
firebase functions:delete getFanzaVideos --region us-central1 --force
firebase functions:delete healthCheck --region us-central1 --force

echo ""
echo "✅ us-central1の関数を削除しました"
echo ""

# functionsディレクトリに移動
cd functions

echo "📍 現在のディレクトリ: $(pwd)"
echo ""

echo "🔍 修正コードの確認（改行削除処理）:"
echo "79-80行目："
sed -n '79,80p' index.js
echo ""

echo "🚀 asia-northeast1にデプロイします..."
firebase deploy --only functions

echo ""
echo "✅ デプロイが完了しました"
echo ""

# デプロイ後の確認
echo "📋 デプロイ後の関数リスト:"
firebase functions:list
echo ""

# 元のディレクトリに戻る
cd $ORIGINAL_DIR

echo ""
echo "⚠️  重要：クライアントコードの更新が必要です！"
echo ""
echo "src/config/functions.js の primaryRegion を 'asia-northeast1' に変更してください："
echo ""
echo "export const functionsConfig = {"
echo "  primaryRegion: 'asia-northeast1',  // ← ここを変更"
echo "  ..."
echo "};"
echo ""
echo "または、src/App.jsx と src/utils/firebaseTest.js で直接変更："
echo "const functions = getFunctions(app, 'asia-northeast1');"
echo ""
echo "=== 完了 ==="