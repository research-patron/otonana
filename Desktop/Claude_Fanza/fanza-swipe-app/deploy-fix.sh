#!/bin/bash

echo "=== Cloud Functions 緊急修正デプロイ ==="
echo ""
echo "⚠️  改行文字バグの修正をデプロイします"
echo ""

# 現在のディレクトリを保存
ORIGINAL_DIR=$(pwd)

# functionsディレクトリに移動
cd functions

echo "📍 現在のディレクトリ: $(pwd)"
echo ""

# デプロイ前の確認
echo "🔍 修正内容の確認（79-80行目）:"
sed -n '78,81p' index.js
echo ""

read -p "👆 上記の修正内容でデプロイしますか？ (y/n): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "🚀 デプロイを開始します..."
    echo ""
    
    # デプロイ実行（詳細ログ付き）
    firebase deploy --only functions --debug
    
    echo ""
    echo "✅ デプロイが完了しました"
    echo ""
    
    # デプロイ後の確認
    echo "📋 デプロイされた関数の確認:"
    firebase functions:list
    echo ""
    
    echo "📊 最新のログを確認（エラーチェック）:"
    firebase functions:log --only getFanzaVideos -n 20 | grep -E "(API credentials status|400|Bad Request)"
    
else
    echo "❌ デプロイをキャンセルしました"
fi

# 元のディレクトリに戻る
cd $ORIGINAL_DIR

echo ""
echo "=== 完了 ==="
echo ""
echo "次のステップ："
echo "1. ブラウザでアプリをリロードして動作確認"
echo "2. まだエラーが出る場合は ./update-secrets.sh でシークレットを更新"