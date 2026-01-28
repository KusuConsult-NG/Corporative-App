#!/bin/bash

# AWSLMCSL Cloud Functions Deployment Script
# This script deploys all Cloud Functions for:
# 1. Guarantor Email Approval Workflow
# 2. Virtual Account & KYC System
# 3. Existing payment and notification functions

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_step() {
    echo -e "${BLUE}==>${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check if we're in the project root
if [ ! -d "functions" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

print_step "AWSLMCSL Cloud Functions Deployment"
echo ""

# Step 1: Install dependencies
print_step "Step 1: Installing Cloud Function dependencies..."
cd functions

if ! npm install; then
    print_error "Failed to install dependencies"
    exit 1
fi

print_success "Dependencies installed"
echo ""

# Step 2: Check for required configuration
print_step "Step 2: Checking Firebase configuration..."

# Check if firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    print_error "Firebase CLI is not installed. Install with: npm install -g firebase-tools"
    exit 1
fi

# Check if logged in
if ! firebase projects:list &> /dev/null; then
    print_warning "Not logged in to Firebase. Running firebase login..."
    firebase login
fi

print_success "Firebase CLI ready"
echo ""

# Step 3: Configure API keys
print_step "Step 3: Configuring API keys..."
echo ""

# Get current config
echo "Current Firebase Functions config:"
firebase functions:config:get || echo "No config set yet"
echo ""

# Prompt for Paystack key
read -p "Do you want to set/update Paystack Secret Key? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Enter your Paystack Secret Key (starts with sk_test_ or sk_live_):"
    read -s PAYSTACK_KEY
    firebase functions:config:set paystack.secret_key="$PAYSTACK_KEY"
    print_success "Paystack key configured"
fi
echo ""

# Prompt for Resend key
read -p "Do you want to set/update Resend API Key? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Enter your Resend API Key (starts with re_):"
    read -s RESEND_KEY
    firebase functions:config:set resend.key="$RESEND_KEY"
    print_success "Resend key configured"
fi
echo ""

# Prompt for encryption key
read -p "Do you want to set/update Encryption Key? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Generating new 32-byte encryption key..."
    ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
    firebase functions:config:set encryption.key="$ENCRYPTION_KEY"
    print_success "Encryption key configured"
    print_warning "IMPORTANT: Save this key securely: $ENCRYPTION_KEY"
fi
echo ""

# Prompt for app URL
read -p "Do you want to set/update App URL? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Enter your app URL (e.g., https://awslmcsl.com or http://localhost:3000):"
    read APP_URL
    firebase functions:config:set app.url="$APP_URL"
    print_success "App URL configured"
fi
echo ""

# Step 4: List functions to deploy
print_step "Step 4: Functions to be deployed..."
echo ""
echo "Guarantor Approval Workflow:"
echo "  - sendGuarantorApprovalEmail"
echo "  - getGuarantorApprovalByToken"
echo "  - approveGuarantorRequest"
echo "  - rejectGuarantorRequest"
echo "  - resendGuarantorApprovalEmail"
echo ""
echo "Virtual Account & KYC:"
echo "  - verifyBVN"
echo "  - resolveBVN"
echo "  - uploadNINSlip"
echo "  - deleteNINSlip"
echo "  - createVirtualAccount (already exists, will update)"
echo "  - getVirtualAccount (already exists)"
echo "  - paystackWebhook (already exists)"
echo ""
echo "Existing Functions:"
echo "  - All other existing Cloud Functions will be updated"
echo ""

# Confirm deployment
read -p "Do you want to proceed with deployment? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_warning "Deployment cancelled"
    exit 0
fi
echo ""

# Step 5: Deploy functions
print_step "Step 5: Deploying Cloud Functions..."
echo ""

# Option to deploy only new functions or all functions
read -p "Deploy only new/guarantor/virtual account functions? (y for selective, n for all): " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Deploy only new functions
    print_step "Deploying new functions only..."
    firebase deploy --only functions:sendGuarantorApprovalEmail,functions:getGuarantorApprovalByToken,functions:approveGuarantorRequest,functions:rejectGuarantorRequest,functions:resendGuarantorApprovalEmail,functions:verifyBVN,functions:resolveBVN,functions:uploadNINSlip,functions:deleteNINSlip
else
    # Deploy all functions
    print_step "Deploying all functions..."
    firebase deploy --only functions
fi

if [ $? -eq 0 ]; then
    print_success "Cloud Functions deployed successfully!"
else
    print_error "Deployment failed. Check the error messages above."
    exit 1
fi

echo ""

# Step 6: Verify deployment
print_step "Step 6: Verifying deployment..."
echo ""

# List deployed functions
firebase functions:list | grep -E "(sendGuarantorApprovalEmail|verifyBVN|uploadNINSlip)" || true

print_success "Deployment complete!"
echo ""

# Step 7: Next steps
print_step "Next Steps:"
echo ""
echo "1. ✅ Cloud Functions deployed"
echo ""
echo "2. Test Guarantor Workflow:"
echo "   - Submit a loan application with guarantor email"
echo "   - Check email delivery"
echo "   - Test approval/rejection flow"
echo ""
echo "3. Test Virtual Account System:"
echo "   - Complete wallet onboarding"
echo "   - Test BVN verification (use Paystack test BVN: 20123456789)"
echo "   - Test NIN slip upload"
echo "   - Verify account creation"
echo ""
echo "4. Monitor logs:"
echo "   firebase functions:log --only verifyBVN"
echo "   firebase functions:log --only sendGuarantorApprovalEmail"
echo ""
echo "5. Check configuration:"
echo "   firebase functions:config:get"
echo ""

print_success "All done! 🚀"
