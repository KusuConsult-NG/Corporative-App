#!/bin/bash
# Firestore Setup via Firebase CLI
# Creates required documents using Firebase CLI commands

set -e

echo "🚀 Setting up Firestore documents via Firebase CLI..."
echo ""

# Get Firebase token
echo "📋 Getting Firebase auth token..."
TOKEN=$(firebase login:ci --no-localhost 2>&1 | grep -o "1//[a-zA-Z0-9_-]*" || firebase login:ci 2>&1 | tail -1)

if [ -z "$TOKEN" ]; then
    echo "⚠️  Using existing Firebase session..."
fi

# Project ID
PROJECT_ID="corporative-app"

echo ""
echo "📋 Step 1: Creating system_config/ip_whitelist document..."
echo ""

# Create system_config/ip_whitelist using firebase firestore
cat > /tmp/system_config_ip_whitelist.json << EOF
{
  "fields": {
    "enforceWhitelist": {"booleanValue": false},
    "createdAt": {"timestampValue": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"},
    "modifiedBy": {"stringValue": "cli_setup"},
    "lastModified": {"timestampValue": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"}
  }
}
EOF

# Use Firebase CLI to set the document
firebase firestore:write system_config/ip_whitelist < /tmp/system_config_ip_whitelist.json --project $PROJECT_ID 2>/dev/null || echo "Note: Document may already exist"

echo "✅ Created system_config/ip_whitelist"
echo ""

echo "📋 Step 2: Adding IP 102.91.103.159 to whitelist..."
echo ""

# Create ip_whitelist document
cat > /tmp/ip_whitelist_rule.json << EOF
{
  "fields": {
    "ip": {"stringValue": "102.91.103.159"},
    "type": {"stringValue": "single"},
    "label": {"stringValue": "CLI Setup IP"},
    "allowedRoles": {
      "arrayValue": {
        "values": [
          {"stringValue": "admin"},
          {"stringValue": "super_admin"}
        ]
      }
    },
    "active": {"booleanValue": true},
    "addedBy": {"stringValue": "cli_setup"},
    "addedAt": {"timestampValue": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"}
  }
}
EOF

# Generate random ID for the document
DOC_ID=$(uuidgen | tr '[:upper:]' '[:lower:]')
firebase firestore:write "ip_whitelist/$DOC_ID" < /tmp/ip_whitelist_rule.json --project $PROJECT_ID

echo "✅ Added IP 102.91.103.159 to whitelist"
echo ""

# Cleanup
rm /tmp/system_config_ip_whitelist.json /tmp/ip_whitelist_rule.json

echo "=" | tr '=' '=' | head -c 60 && echo ""
echo "🎉 Firestore Setup Complete!"
echo "=" | tr '=' '=' | head -c 60 && echo ""
echo ""
echo "📊 Created Documents:"
echo ""
echo "  1. system_config/ip_whitelist"
echo "     └─ enforceWhitelist: false (log-only mode)"
echo ""
echo "  2. ip_whitelist/$DOC_ID"
echo "     ├─ IP: 102.91.103.159"
echo "     ├─ Type: single"
echo "     └─ Roles: admin, super_admin"
echo ""
echo "✅ Ready for deployment!"
echo ""
echo "Next: firebase deploy --only functions"
echo ""
