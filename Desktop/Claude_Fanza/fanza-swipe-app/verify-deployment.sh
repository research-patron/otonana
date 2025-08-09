#!/bin/bash

# Cloud Functions Deployment Verification Script
# This script helps verify that the Cloud Functions are deployed correctly

echo "=== Cloud Functions Deployment Verification ==="
echo ""

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI is not installed. Please install it first:"
    echo "   npm install -g firebase-tools"
    exit 1
fi

echo "✅ Firebase CLI is installed"
echo ""

# Show current project
echo "📋 Current Firebase project:"
firebase use
echo ""

# List deployed functions
echo "📋 Deployed functions:"
firebase functions:list
echo ""

# Check recent logs for deployment
echo "📋 Recent deployment logs (last 10 entries):"
firebase functions:log --only getFanzaVideos -n 10
echo ""

# Look for credential status logs
echo "🔍 Checking for credential status logs:"
firebase functions:log --only getFanzaVideos | grep "API credentials status" | tail -5
echo ""

# Look for recent errors
echo "🔍 Checking for recent errors:"
firebase functions:log --only getFanzaVideos | grep -E "(400|Bad Request|ERR_BAD_REQUEST)" | tail -5
echo ""

echo "=== Verification Complete ==="
echo ""
echo "📌 What to look for:"
echo "1. Functions should show recent deployment timestamp"
echo "2. 'API credentials status' logs should show whitespace was removed"
echo "3. No recent 400 Bad Request errors with %0A in the URL"
echo ""
echo "If you still see errors, run:"
echo "  cd functions && firebase deploy --only functions --force"