#!/bin/bash

# Script to restrict Firebase API key using gcloud CLI
# This automates the domain restriction setup for security

set -e  # Exit on error

PROJECT_ID="device-streaming-c7297924"
API_KEY="AIzaSyCgEwZHMXe9J_TfmDKrRNuFGH_IqYQXxKg"

echo "🔐 Firebase API Key Restriction Setup"
echo "======================================"
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ gcloud CLI is not installed."
    echo ""
    echo "📥 Installation Instructions:"
    echo ""
    echo "macOS:"
    echo "  brew install --cask google-cloud-sdk"
    echo ""
    echo "Or download from:"
    echo "  https://cloud.google.com/sdk/docs/install"
    echo ""
    exit 1
fi

echo "✅ gcloud CLI found"
echo ""

# Check if authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" &> /dev/null; then
    echo "⚠️  Not authenticated with gcloud"
    echo "🔑 Running authentication..."
    gcloud auth login
fi

echo "✅ Authenticated"
echo ""

# Set project
echo "🎯 Setting project to: $PROJECT_ID"
gcloud config set project "$PROJECT_ID"
echo ""

# Get the API key resource name
echo "🔍 Finding API key..."
KEY_NAME=$(gcloud services api-keys list --filter="displayName:'Browser key (auto created by Firebase)'" --format="value(name)" 2>/dev/null || echo "")

if [ -z "$KEY_NAME" ]; then
    echo "⚠️  Could not find API key automatically"
    echo "📋 Listing all API keys in project..."
    gcloud services api-keys list
    echo ""
    echo "❌ Please set restrictions manually in Google Cloud Console:"
    echo "   https://console.cloud.google.com/apis/credentials?project=$PROJECT_ID"
    exit 1
fi

echo "✅ Found API key: $KEY_NAME"
echo ""

# Update API key restrictions
echo "🔧 Applying domain restrictions..."

gcloud services api-keys update "$KEY_NAME" \
  --allowed-referrers="localhost:*,127.0.0.1:*,*.vercel.app/*,corporative-app.vercel.app/*" \
  --api-target=service=firebase.googleapis.com \
  --api-target=service=firebaseauth.googleapis.com \
  --api-target=service=firestore.googleapis.com \
  --api-target=service=firebasestorage.googleapis.com \
  --api-target=service=fcm.googleapis.com \
  --api-target=service=identitytoolkit.googleapis.com

echo ""
echo "✅ API key restrictions applied successfully!"
echo ""
echo "🔒 Allowed Domains:"
echo "   - localhost:*"
echo "   - 127.0.0.1:*"
echo "   - *.vercel.app/*"
echo "   - corporative-app.vercel.app/*"
echo ""
echo "🔒 Allowed APIs:"
echo "   - Firebase Authentication"
echo "   - Cloud Firestore"
echo "   - Firebase Storage"
echo "   - Firebase Cloud Messaging"
echo "   - Identity Toolkit"
echo ""
echo "⏰ Wait 5-10 minutes for changes to propagate globally"
echo ""
echo "🧪 Test your app at: https://corporative-app.vercel.app"
echo ""
