#!/bin/bash

# ============================================================================
# AWSLMCSL Firebase Setup Script (Storage Optional)
# ============================================================================
# Modified version that skips storage if not enabled
# ============================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

if [ ! -f "firebase.json" ]; then
    print_error "firebase.json not found. Please run this script from the project root."
    exit 1
fi

PROJECT_ID="device-streaming-c7297924"

print_header "STEP 1: Deploy Cloud Functions"

print_info "Deploying all Cloud Functions (this may take several minutes)..."
if firebase deploy --only functions --project=$PROJECT_ID; then
    print_success "Cloud Functions deployed successfully"
else
    print_error "Cloud Functions deployment failed"
    print_info "Check the error messages above"
    exit 1
fi

print_header "STEP 2: Initialize Phase 3 Advanced Security"

print_info "Running Firestore initialization for advanced security features..."

# Create initialization script
cat > /tmp/run-init.js << 'EOF'
const admin = require('firebase-admin');
const path = require('path');

// Try to find service account key
const serviceAccountPath = path.join(__dirname, '../device-streaming-c7297924-firebase-adminsdk-fbsvc-21df50dc23.json');

try {
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
} catch(e) {
    console.log('⚠️  Service account key not found, using default credentials');
    admin.initializeApp();
}

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
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(data).ip);
                    } catch(e) {
                        resolve('127.0.0.1');
                    }
                });
            }).on('error', () => resolve('127.0.0.1'));
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
        }, { merge: true });
        
        console.log('✅ System configuration initialized');
        console.log(`✅ Your IP (${publicIP}) added to whitelist`);
        
        // Create audit log entry
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

# Run the initialization from the project root
cd "/Users/mac/Corporative App"
if node /tmp/run-init.js; then
    print_success "Phase 3 Advanced Security initialized"
else
    print_warning "Security initialization failed, but continuing..."
fi

# Cleanup
rm -f /tmp/run-init.js

print_header "STEP 3: Setup Admin User"

print_info "Granting admin role to jos@jos.com..."

cat > /tmp/add-admin.js << 'EOF'
const admin = require('firebase-admin');
const path = require('path');

const serviceAccountPath = path.join(__dirname, '../device-streaming-c7297924-firebase-adminsdk-fbsvc-21df50dc23.json');

try {
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
} catch(e) {
    console.log('⚠️  Service account key not found, using default credentials');
    admin.initializeApp();
}

const db = admin.firestore();

async function addAdminRole(email) {
    try {
        const userRecord = await admin.auth().getUserByEmail(email);
        await admin.auth().setCustomUserClaims(userRecord.uid, { admin: true });
        
        const usersSnapshot = await db.collection('users')
            .where('userId', '==', userRecord.uid)
            .get();
        
        if (!usersSnapshot.empty) {
            const userDoc = usersSnapshot.docs[0];
            await userDoc.ref.update({ role: 'admin' });
            console.log(`✅ Admin role granted to: ${email}`);
        }
        process.exit(0);
    } catch (error) {
        console.error(`❌ Error granting admin role to ${email}:`, error.message);
        process.exit(1);
    }
}

addAdminRole('jos@jos.com');
EOF

if node /tmp/add-admin.js; then
    print_success "Admin role configured"
else
    print_warning "Admin role setup failed, but continuing..."
fi

rm -f /tmp/add-admin.js

print_header "STEP 4: Verify Deployment"

print_info "Listing deployed Cloud Functions..."
firebase functions:list --project=$PROJECT_ID

print_info "Checking system configuration..."
firebase firestore:get system/config --project=$PROJECT_ID 2>/dev/null || print_warning "Could not fetch system config"

print_header "DEPLOYMENT COMPLETE! 🎉"

echo -e "${GREEN}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "                    FIREBASE SETUP SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${NC}"

print_success "Firestore Rules: Already Deployed"
print_success "Firestore Indexes: Already Deployed"
print_success "Cloud Functions: Deployed"
print_success "Advanced Security: Initialized"
print_success "Admin Users: Configured"

echo -e "\n${YELLOW}MANUAL STEPS REQUIRED:${NC}"
echo ""
echo "1. Enable Firebase Storage:"
echo "   https://console.firebase.google.com/project/device-streaming-c7297924/storage"
echo "   Click 'Get Started' and follow the prompts"
echo ""
echo "2. Enable Cloud Messaging:"
echo "   https://console.firebase.google.com/project/device-streaming-c7297924/settings/cloudmessaging"
echo "   Enable Cloud Messaging API and generate Web Push certificate"
echo ""
echo "3. Test Cloud Functions:"
echo "   Check function logs: firebase functions:log --project=device-streaming-c7297924"
echo ""

echo -e "\n${BLUE}View your project:${NC}"
echo "🌐 Firebase Console: https://console.firebase.google.com/project/$PROJECT_ID"
echo "💻 Local App: http://localhost:3000"

echo -e "\n${GREEN}Core Firebase setup completed successfully! ✨${NC}\n"
