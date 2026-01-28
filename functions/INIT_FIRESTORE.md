# Firestore Initialization Script Instructions

This script automatically sets up required Firestore documents for Phase 3 Advanced Security.

## Prerequisites

You need a Firebase service account key to run this script.

### Get Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com/project/corporative-app/settings/serviceaccounts/adminsdk)
2. Click "Generate new private key"
3. Save the downloaded JSON file as `service-account-key.json` in the `functions/` directory

## Run the Script

```bash
cd functions
node init-firestore.js
```

## What It Does

1. **Detects your public IP** automatically
2. **Creates** `system_config/ip_whitelist` document with enforcement disabled
3. **Adds** your current IP to the `ip_whitelist` collection
4. **Displays** summary of what was created

## Output

You should see:
```
✅ Your public IP: [your IP]
✅ Created system_config/ip_whitelist (enforcement: disabled)
✅ Added IP to whitelist
🎉 Firestore Initialization Complete!
```

## Security Note

⚠️ **Important**: Do NOT commit `service-account-key.json` to git!

It's already in `.gitignore`, but double-check:
```bash
git status  # Should NOT show service-account-key.json
```
