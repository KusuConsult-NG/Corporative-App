#!/bin/bash
# Firebase Deployment Setup Script
# Run this before deploying to production

set -e  # Exit on error

echo "🚀 AWSLMCSL Corporative App - Pre-Deployment Setup"
echo "=================================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Check Node/npm versions
echo "1️⃣ Checking Node.js and npm versions..."
node --version
npm --version
echo ""

# Step 2: Install dependencies
echo "2️⃣ Installing frontend dependencies..."
npm install
echo ""

echo "3️⃣ Installing Cloud Functions dependencies..."
cd functions
npm install
cd ..
echo ""

# Step 3: Check environment files
echo "4️⃣ Checking environment configuration..."
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ .env file not found!${NC}"
    exit 1
fi

if [ ! -f "functions/.env" ]; then
    echo -e "${YELLOW}⚠️  functions/.env not found - creating template${NC}"
    cat > functions/.env << 'EOF'
# Resend API Key (REQUIRED for email alerts)
RESEND_API_KEY=re_your_actual_key_here

# Optional: Admin email for alerts
ADMIN_EMAIL=admin@yourdomain.com
EOF
    echo -e "${YELLOW}⚠️  Please edit functions/.env and add your Resend API key${NC}"
    exit 1
fi

# Check if Resend key is set
if grep -q "re_your_actual_key_here" functions/.env; then
    echo -e "${RED}❌ Resend API key not configured in functions/.env${NC}"
    echo -e "${YELLOW}   Please update RESEND_API_KEY with your actual key${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Environment files configured${NC}"
echo ""

# Step 4: Build frontend
echo "5️⃣ Building frontend..."
npm run build
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Frontend build successful${NC}"
else
    echo -e "${RED}❌ Frontend build failed${NC}"
    exit 1
fi
echo ""

# Step 5: Check Firebase CLI
echo "6️⃣ Checking Firebase CLI..."
if ! command -v firebase &> /dev/null; then
    echo -e "${RED}❌ Firebase CLI not installed${NC}"
    echo "   Install with: npm install -g firebase-tools"
    exit 1
fi
firebase --version
echo ""

# Step 6: Check Firebase login
echo "7️⃣ Checking Firebase authentication..."
if ! firebase projects:list &> /dev/null; then
    echo -e "${YELLOW}⚠️  Not logged into Firebase${NC}"
    echo "   Running: firebase login"
    firebase login
fi
echo -e "${GREEN}✅ Firebase authenticated${NC}"
echo ""

# Step 7: Set Firebase config (if not already set)
echo "8️⃣ Setting Firebase Functions config..."
echo "   Setting Resend API key from functions/.env..."

# Read API key from functions/.env
RESEND_KEY=$(grep RESEND_API_KEY functions/.env | cut -d '=' -f2)
if [ ! -z "$RESEND_KEY" ]; then
    firebase functions:config:set resend.key="$RESEND_KEY" 2>/dev/null || true
    echo -e "${GREEN}✅ Resend API key configured${NC}"
fi
echo ""

# Step 8: Preview deployment
echo "9️⃣ Deployment Summary"
echo "====================="
echo ""
echo "The following will be deployed:"
echo "  📦 Frontend (Hosting)"
echo "  ⚡ Cloud Functions ($(ls -1 functions/*.js | grep -v node_modules | wc -l | xargs) files)"
echo "  🔐 Firestore Rules"
echo "  📊 Firestore Indexes"
echo ""

# Step 9: Confirmation
echo "🎯 Pre-deployment checks complete!"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT: Before deploying, ensure you have:${NC}"
echo "   1. ✅ Resend API key configured"
echo "   2. ✅ Email domain verified in Resend dashboard"
echo "   3. ✅ Updated FROM email in functions/emailAlertService.js (line 267)"
echo "   4. ✅ Created system_config/ip_whitelist in Firestore"
echo "   5. ✅ Added initial IP whitelist rules"
echo ""
echo -e "${GREEN}Ready to deploy?${NC}"
echo "Run: firebase deploy"
echo ""
echo "Or deploy specific components:"
echo "  firebase deploy --only hosting      # Frontend only"
echo "  firebase deploy --only functions    # Functions only"
echo "  firebase deploy --only firestore    # Rules & indexes only"
echo ""
