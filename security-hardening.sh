#!/bin/bash
#
# SECURITY HARDENING SCRIPT
# AWSLMCSL Corporative App - Automated Security Fix Deployment
#
# This script implements all 17 security fixes identified in the audit
# Run with --dry-run to preview changes without applying them
#

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="device-streaming-c7297924"
BACKUP_DIR="./security-backups-$(date +%Y%m%d-%H%M%S)"
DRY_RUN=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Banner
echo "╔══════════════════════════════════════════════════════════╗"
echo "║     🔒 SECURITY HARDENING SCRIPT                        ║"
echo "║     AWSLMCSL Corporative App                            ║"
echo "║     Fixing 17 Security Vulnerabilities                  ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

if [ "$DRY_RUN" = true ]; then
    log_warning "DRY RUN MODE - No changes will be applied"
    echo ""
fi

# Step 1: Create backups
log_info "Step 1: Creating backups..."
if [ "$DRY_RUN" = false ]; then
    mkdir -p "$BACKUP_DIR"
    
    # Backup Cloud Functions
    cp -r functions "$BACKUP_DIR/functions"
    
    # Backup Firestore rules
    cp firestore.rules "$BACKUP_DIR/firestore.rules"
    
    log_success "Backups created in: $BACKUP_DIR"
else
    log_info "Would create backups in: $BACKUP_DIR"
fi

echo ""
log_info "Step 2: Applying CRITICAL fixes (3 vulnerabilities)..."

# Run the Node.js script that applies all fixes
if [ "$DRY_RUN" = false ]; then
    node security-fixes.cjs --apply
else
    node security-fixes.cjs --dry-run
fi

echo ""
log_info "Step 3: Deploying to Firebase..."

if [ "$DRY_RUN" = false ]; then
    log_info "Deploying Firestore rules..."
    firebase deploy --only firestore:rules --project="$PROJECT_ID"
    
    echo ""
    log_info "Deploying Cloud Functions (this may take 5-10 minutes)..."
    firebase deploy --only functions --project="$PROJECT_ID"
    
    log_success "All deployments complete!"
else
    log_info "Would deploy Firestore rules and Cloud Functions"
fi

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║     ✅ SECURITY HARDENING COMPLETE                      ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

if [ "$DRY_RUN" = false ]; then
    log_success "All 17 security fixes have been applied!"
    echo ""
    echo "📋 Summary of fixes:"
    echo "  🔴 CRITICAL (3): Firestore rules, authorization, token replay"
    echo "  🟠 HIGH (5): Ownership checks, admin verification, rate limiting"
    echo "  🟡 MEDIUM (6): Input sanitization, audit logs, validation"
    echo "  🟢 LOW (3): Error handling, notifications"
    echo ""
    echo "📁 Backups saved to: $BACKUP_DIR"
    echo "📝 Full audit report: .gemini/antigravity/brain/.../SECURITY_AUDIT_REPORT.md"
    echo ""
    echo "⚠️  NEXT STEPS:"
    echo "  1. Test critical user flows (login, loans, virtual accounts)"
    echo "  2. Monitor Cloud Functions logs for errors"
    echo "  3. Review audit logs for suspicious activity"
    echo ""
    echo "🔄 To rollback: Run ./security-rollback.sh"
else
    log_info "DRY RUN complete. Review changes above."
    log_info "Run without --dry-run to apply fixes."
fi
