#!/bin/bash

# ============================================================================
# AWSLMCSL Firebase Complete Setup Script
# ============================================================================
# This script completes all pending Firebase configurations including:
# 1. Cloud Functions deployment
# 2. Phase 3 Advanced Security initialization
# 3. Firebase Cloud Messaging (FCM) setup
# 4. Storage rules configuration
# 5. Firestore indexes
# ============================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_header() {
    echo -e "\n${BLUE}============================================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}============================================================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "firebase.json" ]; then
    print_error "firebase.json not found. Please run this script from the project root."
    exit 1
fi

PROJECT_ID="device-streaming-c7297924"

print_header "STEP 1: Pre-deployment Checks"

# Check Firebase CLI
if ! command -v firebase &> /dev/null; then
    print_error "Firebase CLI not found. Installing..."
    npm install -g firebase-tools
else
    print_success "Firebase CLI found"
fi

# Check if logged in
print_info "Checking Firebase authentication..."
if ! firebase projects:list &> /dev/null; then
    print_warning "Not logged in to Firebase. Please login:"
    firebase login
fi

# Verify project
print_info "Verifying Firebase project: $PROJECT_ID"
firebase use $PROJECT_ID

print_success "Pre-deployment checks complete"

# ============================================================================
print_header "STEP 2: Install Cloud Functions Dependencies"

cd functions

print_info "Installing Cloud Functions dependencies..."
npm install

print_info "Installing additional required packages..."
npm install --save \
    axios \
    node-fetch \
    date-fns \
    express \
    cors

print_success "Cloud Functions dependencies installed"

cd ..

# ============================================================================
print_header "STEP 3: Configure Environment Variables"

print_info "Checking for required environment variables..."

# Check if .env exists
if [ ! -f ".env" ]; then
    print_error ".env file not found!"
    exit 1
fi

# Source the .env file to get variables
set -a
source .env
set +a

# Check for Resend API key
if [ -z "$VITE_RESEND_API_KEY" ]; then
    print_warning "VITE_RESEND_API_KEY not set in .env file"
    echo -n "Enter your Resend API key (or press Enter to skip): "
    read RESEND_KEY
    if [ ! -z "$RESEND_KEY" ]; then
        echo "VITE_RESEND_API_KEY=$RESEND_KEY" >> .env
        export VITE_RESEND_API_KEY=$RESEND_KEY
    fi
fi

# Set Firebase Functions environment config
print_info "Setting Cloud Functions environment variables..."

if [ ! -z "$VITE_RESEND_API_KEY" ]; then
    firebase functions:config:set resend.api_key="$VITE_RESEND_API_KEY" --project=$PROJECT_ID
    print_success "Resend API key configured"
else
    print_warning "Skipping Resend config (email notifications won't work)"
fi

if [ ! -z "$VITE_PAYSTACK_SECRET_KEY" ]; then
    firebase functions:config:set paystack.secret_key="$VITE_PAYSTACK_SECRET_KEY" --project=$PROJECT_ID
    print_success "Paystack secret key configured"
else
    print_warning "Skipping Paystack config"
fi

# ============================================================================
print_header "STEP 4: Deploy Firestore Security Rules"

print_info "Deploying Firestore security rules..."
firebase deploy --only firestore:rules --project=$PROJECT_ID

print_success "Firestore security rules deployed"

# ============================================================================
print_header "STEP 5: Deploy Firestore Indexes"

print_info "Deploying Firestore indexes..."
firebase deploy --only firestore:indexes --project=$PROJECT_ID

print_success "Firestore indexes deployed"

# ============================================================================
print_header "STEP 6: Deploy Storage Rules"

print_info "Deploying Storage security rules..."
firebase deploy --only storage --project=$PROJECT_ID

print_success "Storage rules deployed"

# ============================================================================
print_header "STEP 7: Deploy Cloud Functions"

print_info "Deploying all Cloud Functions (this may take several minutes)..."
firebase deploy --only functions --project=$PROJECT_ID

print_success "Cloud Functions deployed successfully"

# ============================================================================
print_header "STEP 8: Initialize Phase 3 Advanced Security"

print_info "Running Firestore initialization for advanced security features..."

# Create a temporary initialization script
cat > /tmp/run-init.js << 'EOF'
const admin = require('firebase-admin');
const serviceAccount = require('./device-streaming-c7297924-firebase-adminsdk-fbsvc-21df50dc23.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function initializeSecurity() {
    try {
        console.log('🔧 Initializing Phase 3 Advanced Security...');
        
        // Get public IP
        const https = require('https');
        const publicIP = await new Promise((resolve, reject) => {
            https.get('https://api.ipify.org?format=json', (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => resolve(JSON.parse(data).ip));
            }).on('error', reject);
        });
        
        // Initialize system config
        const systemConfigRef = db.collection('system').doc('config');
        await systemConfigRef.set({
            security: {
                ipWhitelistEnabled: false,
                ipWhitelist: [publicIP],
                rateLimitEnabled: true,
                maxRequestsPerMinute: 60,
                auditLogEnabled: true
            },
            maintenance: {
                enabled: false,
                message: ''
            },
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log('✅ System configuration initialized');
        console.log(`✅ Your IP (${publicIP}) added to whitelist`);
        
        // Create audit logs collection with index
        const auditRef = db.collection('auditLogs').doc();
        await auditRef.set({
            action: 'SYSTEM_INIT',
            user: 'system',
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            details: 'Phase 3 Advanced Security initialized'
        });
        
        console.log('✅ Audit logging initialized');
        
        console.log('🎉 Phase 3 Advanced Security setup complete!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error initializing security:', error);
        process.exit(1);
    }
}

initializeSecurity();
EOF

# Run the initialization
node /tmp/run-init.js

# Cleanup
rm /tmp/run-init.js

print_success "Phase 3 Advanced Security initialized"

# ============================================================================
print_header "STEP 9: Configure Firebase Cloud Messaging (FCM)"

print_info "Setting up Firebase Cloud Messaging..."

# Check if FCM is already configured in firebase.json
if grep -q "messaging" firebase.json; then
    print_success "FCM already configured in firebase.json"
else
    print_info "FCM configuration not found in firebase.json"
    print_warning "Please enable Cloud Messaging in Firebase Console:"
    print_warning "1. Go to: https://console.firebase.google.com/project/$PROJECT_ID/settings/cloudmessaging"
    print_warning "2. Enable Cloud Messaging API"
    print_warning "3. Generate a new Web Push certificate"
fi

# ============================================================================
print_header "STEP 10: Verify Deployment"

print_info "Verifying all deployments..."

# List deployed functions
print_info "Deployed Cloud Functions:"
firebase functions:list --project=$PROJECT_ID

# Check Firestore
print_info "Verifying Firestore access..."
firebase firestore:get system/config --project=$PROJECT_ID

print_success "Deployment verification complete"

# ============================================================================
print_header "STEP 11: Post-Deployment Setup"

print_info "Creating admin users (if needed)..."

# Create a script to add admin role to existing users
cat > /tmp/add-admin.js << 'EOF'
const admin = require('firebase-admin');
const serviceAccount = require('./device-streaming-c7297924-firebase-adminsdk-fbsvc-21df50dc23.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function addAdminRole(email) {
    try {
        const userRecord = await admin.auth().getUserByEmail(email);
        await admin.auth().setCustomUserClaims(userRecord.uid, { admin: true });
        
        // Update Firestore user document
        const usersSnapshot = await db.collection('users')
            .where('userId', '==', userRecord.uid)
            .get();
        
        if (!usersSnapshot.empty) {
            const userDoc = usersSnapshot.docs[0];
            await userDoc.ref.update({ role: 'admin' });
            console.log(`✅ Admin role granted to: ${email}`);
        }
    } catch (error) {
        console.error(`❌ Error granting admin role to ${email}:`, error.message);
    }
}

// Add admin role to jos@jos.com (main test account)
addAdminRole('jos@jos.com').then(() => process.exit(0));
EOF

print_info "Granting admin role to jos@jos.com..."
node /tmp/add-admin.js

# Cleanup
rm /tmp/add-admin.js

# ============================================================================
print_header "DEPLOYMENT COMPLETE! 🎉"

echo -e "${GREEN}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "                    FIREBASE SETUP SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${NC}"

print_success "Firestore Rules: Deployed"
print_success "Firestore Indexes: Deployed"
print_success "Storage Rules: Deployed"
print_success "Cloud Functions: Deployed"
print_success "Advanced Security: Initialized"
print_success "Admin Users: Configured"

echo -e "\n${YELLOW}IMPORTANT NEXT STEPS:${NC}"
echo "1. Enable Cloud Messaging in Firebase Console if not done"
echo "2. Test all Cloud Functions endpoints"
echo "3. Verify email notifications are working"
echo "4. Test Paystack payment integration"
echo "5. Review audit logs in Firestore"

echo -e "\n${BLUE}View your project:${NC}"
echo "🌐 Firebase Console: https://console.firebase.google.com/project/$PROJECT_ID"
echo "💻 Local App: http://localhost:3000"

echo -e "\n${GREEN}All Firebase setup tasks completed successfully! ✨${NC}\n"
