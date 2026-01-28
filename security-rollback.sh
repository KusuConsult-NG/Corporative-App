#!/bin/bash
#
# SECURITY ROLLBACK SCRIPT
# Rollback security fixes if something goes wrong
#

set -e

RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${RED}⚠️  WARNING: SECURITY ROLLBACK${NC}"
echo ""
echo "This will restore your code to the state BEFORE security hardening."
echo "Only use this if the security fixes caused breaking issues."
echo ""

# Find most recent backup
BACKUP_DIR=$(ls -dt security-backups-* | head -1)

if [ -z "$BACKUP_DIR" ]; then
    echo -e "${RED}ERROR: No backup directory found!${NC}"
    exit 1
fi

echo "Found backup: $BACKUP_DIR"
echo ""
read -p "Are you sure you want to rollback? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Rollback cancelled."
    exit 0
fi

echo ""
echo "Rolling back..."

# Restore files
cp -r "$BACKUP_DIR/functions" ./
cp "$BACKUP_DIR/firestore.rules" ./

echo "✅ Files restored from backup"
echo ""
echo "IMPORTANT: You must redeploy to Firebase:"
echo "  firebase deploy --only functions,firestore:rules --project=device-streaming-c7297924"
echo ""
echo -e "${YELLOW}⚠️  Your system is now LESS SECURE. Address the original issues.${NC}"
