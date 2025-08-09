#!/bin/bash

# Secret Update Helper Script
# This script helps update Firebase secrets without accidentally adding newlines

echo "=== Firebase Secrets Update Helper ==="
echo ""
echo "⚠️  IMPORTANT: When entering values, do NOT press Enter at the end!"
echo "    Just type the value and wait for Firebase to accept it."
echo ""

# Function to update a secret
update_secret() {
    local secret_name=$1
    local secret_desc=$2
    
    echo "📝 Updating $secret_name"
    echo "   Description: $secret_desc"
    echo ""
    echo "   Current value info (if exists):"
    firebase functions:secrets:access $secret_name 2>/dev/null || echo "   (No current value found)"
    echo ""
    echo "   To update, run:"
    echo "   firebase functions:secrets:set $secret_name"
    echo ""
    read -p "   Do you want to update $secret_name now? (y/n): " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo ""
        echo "   ⚠️  REMINDER: Type the value and DO NOT press Enter at the end!"
        echo "   Firebase will automatically accept the value after a moment."
        echo ""
        firebase functions:secrets:set $secret_name
        echo ""
        echo "   ✅ $secret_name updated"
    else
        echo "   ⏭️  Skipped $secret_name"
    fi
    echo ""
}

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI is not installed. Please install it first:"
    echo "   npm install -g firebase-tools"
    exit 1
fi

# Show current project
echo "📋 Current Firebase project:"
firebase use
echo ""

# Update secrets
update_secret "FANZA_API_ID" "Your FANZA API ID (example: vVyu7XpkYJVmkV3PSmAN)"
update_secret "FANZA_AFFILIATE_ID" "Your FANZA Affiliate ID (example: nori06-999)"

echo "=== Secret Update Complete ==="
echo ""
echo "Next steps:"
echo "1. Deploy the functions: cd functions && firebase deploy --only functions"
echo "2. Verify deployment: ./verify-deployment.sh"
echo ""