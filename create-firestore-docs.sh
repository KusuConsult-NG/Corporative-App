#!/bin/bash
# Create Firestore documents via Firebase CLI
# Run with: bash create-firestore-docs.sh

set -e

echo "🚀 Creating Firestore documents for Phase 3..."
echo ""

PROJECT_ID="corporative-app"

# Create temporary JSON files
cat > /tmp/system_config.json << 'EOF'
{
  "fields": {
    "enforceWhitelist": {"booleanValue": false},
    "modifiedBy": {"stringValue": "setup_script"},
    "createdAt": {"timestampValue": "2026-01-27T15:00:00Z"}
  }
}
EOF

cat > /tmp/ip_whitelist.json << 'EOF'
{
  "fields": {
    "ip": {"stringValue": "102.91.103.159"},
    "type": {"stringValue": "single"},
    "label": {"stringValue": "My Current IP"},
    "allowedRoles": {
      "arrayValue": {
        "values": [
          {"stringValue": "admin"},
          {"stringValue": "super_admin"}
        ]
      }
    },
    "active": {"booleanValue": true},
    "addedBy": {"stringValue": "setup_script"},
    "addedAt": {"timestampValue": "2026-01-27T15:00:00Z"}
  }
}
EOF

echo "📋 Creating documents using Firebase Firestore REST API..."
echo ""

# Get Firebase auth token
TOKEN=$(gcloud auth print-access-token 2>/dev/null || firebase login:ci 2>&1 | tail -1)

# Create system_config/ip_whitelist
echo "Creating system_config/ip_whitelist..."
curl -X PATCH \
  "https://firestore.googleapis.com/v1/projects/$PROJECT_ID/databases/(default)/documents/system_config/ip_whitelist" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d @/tmp/system_config.json

echo ""
echo ""

# Create ip_whitelist document
echo "Creating ip_whitelist entry..."
curl -X POST \
  "https://firestore.googleapis.com/v1/projects/$PROJECT_ID/databases/(default)/documents/ip_whitelist" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d @/tmp/ip_whitelist.json

echo ""
echo ""
echo "=" | head -c 60 | tr '\n' '='
echo ""
echo "🎉 Firestore Setup Complete!"
echo "=" | head -c 60 | tr '\n' '='
echo ""
echo ""
echo "📊 Created Documents:"
echo ""
echo "  1. system_config/ip_whitelist"
echo "     └─ enforceWhitelist: false (log-only mode)"
echo ""
echo "  2. ip_whitelist/[auto-id]"
echo "     ├─ IP: 102.91.103.159"
echo "     ├─ Type: single"
echo "     └─ Roles: admin, super_admin"
echo ""
echo "✅ Ready for testing!"
echo ""

# Cleanup
rm /tmp/system_config.json /tmp/ip_whitelist.json
