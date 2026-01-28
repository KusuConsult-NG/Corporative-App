# Cloud Functions Deployment Guide

## Quick Start

```bash
# Make script executable (first time only)
chmod +x deploy-functions.sh

# Run deployment
./deploy-functions.sh
```

## What the Script Does

1. **Installs Dependencies**
   - Runs `npm install` in `/functions` directory
   - Installs `@google-cloud/storage` and other required packages

2. **Checks Firebase Setup**
   - Verifies Firebase CLI is installed
   - Ensures you're logged in to Firebase
   - Checks current project

3. **Configures API Keys** (Interactive)
   - **Paystack Secret Key** - For BVN verification and virtual accounts
   - **Resend API Key** - For guarantor approval emails
   - **Encryption Key** - For BVN/NIN encryption (auto-generated)
   - **App URL** - For email links (e.g., https://awslmcsl.com)

4. **Deploys Functions**
   - Option A: Deploy only new functions (faster)
   - Option B: Deploy all functions (comprehensive)

5. **Verifies Deployment**
   - Lists deployed functions
   - Shows next steps for testing

## API Keys You'll Need

### 1. Paystack Secret Key

**Get it from**: https://dashboard.paystack.com/#/settings/developers

- Test mode: `sk_test_...`
- Live mode: `sk_live_...`

**Functions that use it**:
- `verifyBVN` - BVN Match API
- `resolveBVN` - BVN details
- `createVirtualAccount` - Dedicated virtual accounts
- `paystackWebhook` - Payment notifications

### 2. Resend API Key

**Get it from**: https://resend.com/api-keys

- Format: `re_...`

**Functions that use it**:
- `sendGuarantorApprovalEmail` - Guarantor request emails
- `resendGuarantorApprovalEmail` - Reminder emails

### 3. Encryption Key

**Generated automatically** by the script using:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Functions that use it**:
- `verifyBVN` - Encrypt BVN before storage

**⚠️ IMPORTANT**: Save this key securely! If lost, encrypted data cannot be recovered.

### 4. App URL

**Examples**:
- Development: `http://localhost:3000`
- Production: `https://awslmcsl.com`

**Functions that use it**:
- `sendGuarantorApprovalEmail` - For approval link
- `resendGuarantorApprovalEmail` - For approval link

## Manual Deployment (Alternative)

If you prefer to deploy manually:

```bash
# 1. Install dependencies
cd functions
npm install

# 2. Configure API keys
firebase functions:config:set paystack.secret_key="sk_test_YOUR_KEY"
firebase functions:config:set resend.key="re_YOUR_KEY"
firebase functions:config:set encryption.key="$(node -e 'console.log(require(\"crypto\").randomBytes(32).toString(\"hex\"))')"
firebase functions:config:set app.url="https://awslmcsl.com"

# 3. View configuration
firebase functions:config:get

# 4. Deploy functions
firebase deploy --only functions

# Or deploy specific functions
firebase deploy --only functions:verifyBVN,functions:sendGuarantorApprovalEmail
```

## Testing After Deployment

### Test Guarantor Workflow

1. **Send Email**:
   ```bash
   # Submit a loan application with guarantor email
   # Check that email is received
   ```

2. **Check Logs**:
   ```bash
   firebase functions:log --only sendGuarantorApprovalEmail
   ```

3. **Test Approval**:
   - Click link in email
   - Approve or reject
   - Check borrower notification

### Test Virtual Account System

1. **Test BVN Verification**:
   ```bash
   # Use Paystack test BVN: 20123456789
   # Complete onboarding flow
   ```

2. **Check Logs**:
   ```bash
   firebase functions:log --only verifyBVN
   ```

3. **Test NIN Upload**:
   - Upload test image (JPG/PNG/PDF)
   - Check Firebase Storage console
   - Verify Firestore update

4. **Test Account Creation**:
   - Complete full flow
   - Check Paystack dashboard
   - Verify virtual account details

## Monitoring

### View All Logs
```bash
firebase functions:log
```

### View Specific Function
```bash
firebase functions:log --only verifyBVN
firebase functions:log --only sendGuarantorApprovalEmail
```

### Follow Logs in Real-Time
```bash
firebase functions:log --only verifyBVN --lines 50
```

### List Deployed Functions
```bash
firebase functions:list
```

## Troubleshooting

### "Command not found: firebase"
```bash
npm install -g firebase-tools
```

### "Authentication Error"
```bash
firebase login
```

### "Permission denied: deploy-functions.sh"
```bash
chmod +x deploy-functions.sh
```

### "CORS Error" in Browser
Check that Cloud Functions have CORS enabled:
```javascript
// Already handled in index.js
const cors = require('cors')({ origin: true })
```

### "Paystack API Error"
- Verify API key is correct (test vs live)
- Check Paystack dashboard for API limits
- Ensure account is activated

### "Storage Upload Failed"
- Check Firebase Storage rules
- Verify Storage bucket exists
- Check file size limit (5MB)

## Configuration Reference

### View Current Config
```bash
firebase functions:config:get
```

### Set Individual Keys
```bash
firebase functions:config:set paystack.secret_key="sk_test_..."
firebase functions:config:set resend.key="re_..."
firebase functions:config:set encryption.key="abc123..."
firebase functions:config:set app.url="https://example.com"
```

### Unset Keys
```bash
firebase functions:config:unset paystack.secret_key
```

### Clone Config to Another Project
```bash
firebase functions:config:clone --from <sourceProject>
```

## Production Checklist

Before deploying to production:

- [ ] Get live Paystack API keys
- [ ] Get live Resend API key
- [ ] Set production app URL
- [ ] Update Firestore security rules
- [ ] Test all functions in staging
- [ ] Set up monitoring/alerts
- [ ] Document API key rotation process
- [ ] Back up encryption key securely

## Function Costs

Firebase Cloud Functions pricing:
- **Free tier**: 2M invocations/month
- **After free tier**: $0.40 per million invocations

Paystack API costs:
- **BVN Verification**: ₦10 per check (live mode)
- **Virtual Account**: Free
- **Transactions**: 1.5% + ₦100 cap

Resend email costs:
- **Free tier**: 3,000 emails/month
- **After free tier**: $20/month for 50,000 emails

## Support

- **Firebase Docs**: https://firebase.google.com/docs/functions
- **Paystack Docs**: https://paystack.com/docs/api
- **Resend Docs**: https://resend.com/docs

## Next Steps

After deployment:
1. Update admin panel to show guarantor status
2. Add resend button to My Loans page
3. Create admin review panel for NIN slips
4. Implement transaction limit enforcement
5. Add analytics tracking
