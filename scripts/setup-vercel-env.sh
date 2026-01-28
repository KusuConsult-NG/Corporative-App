#!/bin/bash

# Script to automatically set Vercel environment variables
# This configures all required Firebase, Paystack, and email service variables

set -e  # Exit on error

echo "🚀 Vercel Environment Variables Setup"
echo "======================================"
echo ""

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI is not installed."
    echo ""
    echo "📥 Installation Instructions:"
    echo ""
    echo "  npm install -g vercel"
    echo ""
    echo "Or visit: https://vercel.com/docs/cli"
    echo ""
    exit 1
fi

echo "✅ Vercel CLI found"
echo ""

# Check if authenticated
echo "🔑 Checking authentication..."
if ! vercel whoami &> /dev/null; then
    echo "⚠️  Not authenticated with Vercel"
    echo "🔐 Running authentication..."
    vercel login
fi

echo "✅ Authenticated"
echo ""

# Set project context
echo "🎯 Linking to Vercel project..."
vercel link --yes

echo ""
echo "📝 Setting environment variables..."
echo ""

# Function to set environment variable
set_env_var() {
    local name=$1
    local value=$2
    
    echo "  Setting: $name"
    
    # Set for all environments (production, preview, development)
    vercel env add "$name" production preview development <<< "$value" 2>/dev/null || \
    vercel env rm "$name" production preview development --yes 2>/dev/null && \
    vercel env add "$name" production preview development <<< "$value"
}

# Firebase Configuration
set_env_var "VITE_FIREBASE_API_KEY" "AIzaSyBTUfg0lKz-ybpeqzKOfxHZUsvBLUEKvI4"
set_env_var "VITE_FIREBASE_AUTH_DOMAIN" "device-streaming-c7297924.firebaseapp.com"
set_env_var "VITE_FIREBASE_PROJECT_ID" "device-streaming-c7297924"
set_env_var "VITE_FIREBASE_STORAGE_BUCKET" "device-streaming-c7297924.firebasestorage.app"
set_env_var "VITE_FIREBASE_MESSAGING_SENDER_ID" "785564049496"
set_env_var "VITE_FIREBASE_APP_ID" "1:785564049496:web:a778b09e42d71cb18c2a2d"
set_env_var "VITE_FIREBASE_MEASUREMENT_ID" "G-09DVG1MK6S"
set_env_var "VITE_FIREBASE_VAPID_KEY" "BKpV8fXVqJ9YQJbZJ_VxqXdZ8wKXZ5N9Z7Z8Z9Z0Z1Z2Z3Z4Z5Z6Z7Z8Z9Z0Z1Z2Z3Z4Z5Z6Z7Z8Z9Z0Z1Z2"

# Paystack Configuration
set_env_var "VITE_PAYSTACK_PUBLIC_KEY" "pk_test_3e87802dae281fbeb004f2b0f741a6e662aba103"
set_env_var "PAYSTACK_SECRET_KEY" "sk_test_your-secret-key-here"

# Email Service (Resend)
set_env_var "VITE_RESEND_API_KEY" "your-resend-api-key"

echo ""
echo "✅ All environment variables set successfully!"
echo ""
echo "🔄 Triggering redeployment..."
vercel --prod

echo ""
echo "✅ Deployment triggered!"
echo ""
echo "🎉 Setup complete!"
echo ""
echo "📋 Summary:"
echo "   - 11 environment variables configured"
echo "   - All environments: Production, Preview, Development"
echo "   - Production deployment triggered"
echo ""
echo "🧪 Test your app at:"
echo "   https://corporative-app.vercel.app"
echo ""
