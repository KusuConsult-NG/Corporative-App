# Firebase API Key Restriction Scripts

## Quick Setup (Manual - Recommended)

The easiest way is through the Google Cloud Console UI:

1. Visit: https://console.cloud.google.com/apis/credentials?project=device-streaming-c7297924
2. Find your API key (starts with `AIzaSyCgEwZH...`)
3. Click Edit → Add HTTP referrers:
   ```
   localhost:*
   127.0.0.1:*
   *.vercel.app/*
   corporative-app.vercel.app/*
   ```
4. Restrict APIs to Firebase-only services
5. Save changes

**Time**: ~2 minutes

---

## Automated Setup (Using gcloud CLI)

### Prerequisites

Install Google Cloud SDK:

**macOS**:
```bash
brew install --cask google-cloud-sdk
```

**Linux/Windows**: Download from https://cloud.google.com/sdk/docs/install

### Run the Script

```bash
# Make executable
chmod +x scripts/restrict-api-key.sh

# Run it
./scripts/restrict-api-key.sh
```

### What It Does

1. ✅ Checks if gcloud is installed
2. ✅ Authenticates with Google Cloud (if needed)
3. ✅ Sets your Firebase project
4. ✅ Finds your API key
5. ✅ Applies domain restrictions
6. ✅ Restricts to Firebase APIs only

### Expected Output

```
🔐 Firebase API Key Restriction Setup
======================================

✅ gcloud CLI found
✅ Authenticated
🎯 Setting project to: device-streaming-c7297924
✅ Found API key: projects/123456/locations/global/keys/xyz
🔧 Applying domain restrictions...
✅ API key restrictions applied successfully!

🔒 Allowed Domains:
   - localhost:*
   - *.vercel.app/*
   - corporative-app.vercel.app/*
```

---

## Troubleshooting

### Script Not Found Error
```bash
# Make sure you're in the project root
cd "/Users/mac/Corporative App"
./scripts/restrict-api-key.sh
```

### Permission Denied
```bash
chmod +x scripts/restrict-api-key.sh
```

### Authentication Failed
```bash
# Re-authenticate
gcloud auth login
```

### API Key Not Found
The script will list all API keys. If it can't find it automatically:
1. Copy the key name from the list
2. Go to Google Cloud Console manually
3. Apply restrictions via UI

---

## Manual Verification

After running the script, verify restrictions:

```bash
# List API keys and their restrictions
gcloud services api-keys list --project=device-streaming-c7297924
```

Or visit:
https://console.cloud.google.com/apis/credentials?project=device-streaming-c7297924

---

## Security Benefits

✅ **Blocks unauthorized domains** from using your API key  
✅ **Allows only your Vercel app** and localhost  
✅ **Restricts to Firebase APIs** only  
✅ **Prevents abuse** of your Firebase quota  

---

## Recommended Approach

**For first-time setup**: Use the **manual method** (it's faster and more visual)

**For automation/CI/CD**: Use the **script method** (can be integrated into deployment pipeline)
