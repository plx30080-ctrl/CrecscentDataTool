#!/bin/bash

# Deploy Firestore Rules via Firebase CLI
# This script deploys the updated firestore.rules to your Firebase project

echo "🔥 Firebase Rules Deployment"
echo "============================"
echo ""

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI is not installed"
    echo ""
    echo "Install it with:"
    echo "  npm install -g firebase-tools"
    echo ""
    exit 1
fi

echo "✅ Firebase CLI found"
echo ""

# Check if user is logged in
firebase auth:list &> /dev/null
if [ $? -ne 0 ]; then
    echo "⚠️  Not logged into Firebase. Logging in..."
    firebase login
fi

echo ""
echo "📋 Current firestore.rules:"
echo "---"
cat firestore.rules
echo "---"
echo ""

# Ask for confirmation
read -p "Deploy these rules? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled."
    exit 0
fi

echo ""
echo "🚀 Deploying firestore.rules..."
echo ""

# Deploy only Firestore rules
firebase deploy --only firestore:rules

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Firestore rules deployed successfully!"
    echo ""
    echo "Updated collections with read/write access:"
    echo "  • forecasts"
    echo "  • dailySummary"
    echo "  • weeklySummary"
    echo "  • monthlySummary"
    echo ""
    echo "Plus all existing collections are now accessible."
else
    echo ""
    echo "❌ Deployment failed. Check the error message above."
    exit 1
fi
