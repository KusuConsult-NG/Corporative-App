# Email Alert Service - Configuration Guide

## Setup Instructions

### 1. Get Resend API Key

1. Go to https://resend.com/
2. Sign up for free account
3. Verify your email domain (or use their testing domain)
4. Go to API Keys section
5. Create new API key
6. Copy the key (starts with `re_...`)

**Free Tier**:
- 100 emails/day
- 3,000 emails/month
- Perfect for your use case!

---

### 2. Configure Firebase Functions

```bash
# Navigate to functions directory
cd functions

# Set Resend API key
firebase functions:config:set resend.key="re_your_api_key_here"

# Set sender email (must be verified domain or use resend's testing)
firebase functions:config:set resend.from="alerts@awslmcsl.com"

# Set admin emails (comma-separated)
firebase functions:config:set alerts.admins="admin1@example.com,admin2@example.com,admin3@example.com"

# View configuration
firebase functions:config:get
```

---

### 3. Verify Email Domain (Production)

For production, you need to verify your domain with Resend:

1. **Add DNS Records**:
   ```
   Type: TXT
   Name: resend._domainkey
   Value: (provided by Resend)
   ```

2. **Alternative**: Use Resend's testing domain
   - From: `onboarding@resend.dev`
   - Can send to any email
   - Good for testing

---

### 4. Test Email Alerts

```bash
# Deploy functions first
firebase deploy --only functions

# Then test from frontend or Firebase Console
```

**Frontend Test** (in browser console):
```javascript
const functions = getFunctions()
const testAlert = httpsCallable(functions, 'testEmailAlert')

testAlert().then(result => {
  console.log('Test email sent:', result.data)
})
```

---

## Alert Types

The system monitors and sends alerts for:

### Financial Alerts (HIGH Priority)
- 🚨 **Large Withdrawal**: > ₦50,000
- 🚨 **Large Loan Approval**: > ₦100,000  
- ⚠️ **Large Commodity Order**: > ₦30,000
- ⚠️ **Savings Reduction**: Any amount

### Security Alerts (HIGH/MEDIUM Priority)
- ⚠️ **Failed Login Attempts**: 3+ in 10 minutes
- 🔐 **New Device Login**: New browser/device
- 🚨 **Role Change**: Admin role modified
- 🔐 **Password Change**: User password changed

### Administrative Alerts (LOW/MEDIUM Priority)
- ✅ **Member Approved**: Registration approved
- ❌ **Member Rejected**: Registration rejected
- ⚠️ **Rate Limit Exceeded**: API limits hit
- 🚨 **IP Whitelist Violation**: Unauthorized IP access

---

## Testing Checklist

### Before Production

- [ ] Resend API key configured
- [ ] Sender email verified (or using test domain)
- [ ] Admin emails configured
- [ ] Test email sent successfully
- [ ] Email appears in inbox (not spam)
- [ ] HTML formatting looks good
- [ ] All alert types tested

### Test Commands

```bash
# 1. Check configuration
firebase functions:config:get

# 2. Deploy functions
firebase deploy --only functions:testEmailAlert

# 3. Call test function
# (use Firebase Console or frontend)

# 4. Check logs
firebase functions:log
```

---

## Troubleshooting

### Email Not Received

**Check**:
1. Spam folder
2. Resend dashboard for delivery status
3. Firebase function logs: `firebase functions:log`
4. API key is correct
5. Sender email is verified

### "Resend not configured" Log

**Fix**:
```bash
# Set API key
firebase functions:config:set resend.key="re_xxx"

# Redeploy
firebase deploy --only functions
```

### Email Goes to Spam

**Solutions**:
1. Verify sender domain with DKIM/SPF
2. Use professional sender name
3. Avoid spam trigger words
4. Add unsubscribe link (for production)

---

## Email Template Customization

Edit `/functions/emailAlertService.js`:

```javascript
// Customize HTML in generateEmailHTML()
function generateEmailHTML(type, data) {
  // Modify colors, layout, branding
  // Add logo image
  // Change fonts
}
```

---

## Cost Monitoring

**Resend Free Tier**:
- 100 emails/day = ~3,000/month
- Estimated usage: 10-20 alerts/day
- **Cost**: $0 (within free tier)

**Monitor Usage**:
1. Check Resend dashboard
2. Query `alert_history` collection:
   ```javascript
   db.collection('alert_history')
     .where('timestamp', '>', startOfMonth)
     .where('status', '==', 'sent')
     .count()
   ```

---

## Production Deployment

```bash
# 1. Set production config
firebase use production
firebase functions:config:set resend.key="re_prod_key"
firebase functions:config:set resend.from="alerts@awslmcsl.com"
firebase functions:config:set alerts.admins="real@emails.com"

# 2. Deploy
firebase deploy --only functions

# 3. Test
# Send test alert from admin panel

# 4. Monitor
firebase functions:log --only monitorFailedLogins,monitorLargeWithdrawals
```

---

## Next Steps

After email alerts are working:
1. ✅ Test all alert types
2. ✅ Verify admin emails receive alerts
3. ✅ Monitor alert_history collection
4. 🔜 Implement IP whitelisting (Phase 3b)
5. 🔜 Add device fingerprinting (Phase 3c)

---

_Configuration Guide Created: January 27, 2026_
