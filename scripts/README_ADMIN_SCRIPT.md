# Admin User Creation Script

This script automates the creation of admin users for the AWSLMCSL Cooperative App.

## Prerequisites

1. **Firebase Service Account Key**
   - Go to [Firebase Console → Project Settings → Service Accounts](https://console.firebase.google.com/u/0/project/device-streaming-c7297924/settings/serviceaccounts/adminsdk)
   - Click **"Generate new private key"**
   - Save the file as `serviceAccountKey.json` in the project root
   - ⚠️ **NEVER commit this file to Git** (already in `.gitignore`)

2. **Install Firebase Admin SDK**
   ```bash
   npm install firebase-admin
   ```

## Usage

### Run the Script

```bash
node scripts/create-admin-user.js
```

### Follow the Prompts

The script will ask for:
- Email address (e.g., `admin@kusuconsult.com`)
- Password (minimum 6 characters)
- First name (default: Admin)
- Last name (default: User)
- Phone number (default: +2348000000000)
- Staff ID (default: ADMIN001)

### What It Does

1. ✅ Creates Firebase Auth account
2. ✅ Marks email as verified
3. ✅ Sets custom claims (`role: super_admin`)
4. ✅ Creates Firestore document with UID as document ID
5. ✅ Bypasses all security gates:
   - Email verification: `true`
   - Approval status: `approved`
   - Registration fee: `true`
6. ✅ Sets profile as complete (100%)

### Example Output

```
🔧 AWSLMCSL Cooperative - Admin User Creator

Enter admin email: admin@kusuconsult.com
Enter admin password: ********
Enter first name: Admin
Enter last name: User
Enter phone: +2348000000000
Enter staff ID: ADMIN001

⏳ Creating admin user...

1️⃣ Creating Firebase Auth account...
✅ Auth user created with UID: abc123xyz456

2️⃣ Setting custom claims (super_admin role)...
✅ Custom claims set

3️⃣ Creating Firestore user document...
✅ Firestore document created

✅ SUCCESS! Admin user created successfully!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📧 Email: admin@kusuconsult.com
🆔 UID: abc123xyz456
👤 Role: super_admin
✅ Email verified: true
✅ Approved: true
✅ Fee paid: true
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 You can now login at:
   https://corporative-app.vercel.app/auth
```

## Troubleshooting

### Error: serviceAccountKey.json not found

**Solution**: Download the service account key from Firebase Console (see Prerequisites above)

### Error: auth/email-already-exists

**Solution**: 
- Delete the existing user from [Firebase Console → Authentication](https://console.firebase.google.com/u/0/project/device-streaming-c7297924/authentication/users)
- Or use a different email

### Error: auth/weak-password

**Solution**: Use a password with at least 6 characters

### Custom claims not working immediately

**Solution**: 
- Wait 2-3 minutes for custom claims to propagate
- Log out and log back in
- Clear browser cache

## Security Notes

- ⚠️ **Never commit `serviceAccountKey.json` to Git**
- ⚠️ **Store service account keys securely**
- ⚠️ **Only run this script from a trusted environment**
- ⚠️ **Limit who has access to create admin users**

## What This Script Bypasses

| Security Gate | Normal Flow | This Script |
|---------------|-------------|-------------|
| Email Verification | User clicks link in email | ✅ Pre-verified |
| Admin Approval | Waits for admin | ✅ Auto-approved |
| Registration Fee | Must pay ₦2000 | ✅ Marked as paid |
| Profile Completion | User fills forms | ✅ 100% complete |

## Next Steps

After running the script:

1. **Login** to https://corporative-app.vercel.app/auth
2. **Verify admin access** - should see admin dashboard
3. **Test admin features**:
   - Member management
   - Loan approvals
   - Registration approvals
   - System settings
4. **Create additional admins** if needed (run script again)

## Alternative: Manual Creation

If you prefer not to use the script, see `admin_setup_and_permissions.md` for manual creation steps in Firebase Console.
