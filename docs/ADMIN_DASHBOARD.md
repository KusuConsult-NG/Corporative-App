# Admin Dashboard & Role Management

## 🎯 Overview

The Corporative App features a comprehensive role-based access control system with three admin levels:

1. **Limited Admin** (View-Only)
2. **Admin** (Full Access)
3. **Super Admin** (Full Access + Role Management)

## 🔑 Admin Roles

### 1. Member (Default)
- Regular user access
- Can apply for loans, save money, order commodities
- No admin panel access

### 2. Limited Admin
**Permissions:**
- ✅ View members
- ✅ View loans
- ✅ View savings
- ✅ View commodity orders
- ✅ View reports
- ✅ View complaints
- ✅ View approvals
- ❌ **Cannot approve/reject anything**
- ❌ Cannot manage roles

**Use Case:** Auditors, observers, read-only administrators

### 3. Admin
**Permissions:**
- ✅ Everything Limited Admin can see
- ✅ **Approve/reject loans**
- ✅ **Approve/reject commodity orders**
- ✅ **Process savings reductions**
- ✅ **Approve profile changes**
- ✅ **Respond to complaints**
- ✅ **Send broadcasts**
- ✅ **Manage commodities**
- ✅ **Export reports**
- ❌ Cannot manage roles

**Use Case:** Main administrators who handle daily operations

### 4. Super Admin
**Permissions:**
- ✅ Everything Admin can do
- ✅ **Manage user roles** (promote/demote admins)
- ✅ Full system access

**Use Case:** System administrators, organization leadership

## 🚀 Quick Start

### Make Yourself an Admin

Run the interactive script:

```bash
node scripts/setAdminRole.js
```

Follow the prompts:
1. Enter the user's email
2. Select role (1-4)
3. Confirm the change

**Example:**
```
Enter user email: admin@unijos.edu.ng
Enter role number (1-4): 4

Found user: John Doe (S1001)
Current role: member
New role: superadmin

Proceed with role update? (yes/no): yes

✅ Successfully updated admin@unijos.edu.ng to role: superadmin
```

### Log In as Admin

1. **Log out** of the application
2. **Log back in** with your email
3. You'll be automatically redirected to `/admin/dashboard`

## 📊 Admin Dashboard Features

### Dashboard Overview

The dashboard adapts based on your role:

#### All Admins See:
- System statistics (based on permissions)
- Recent activity feed
- Role badge indicator
- Quick action buttons

#### Limited Admin View:
- 🔒 Locked cards for restricted features
- "No Access" labels on unavailable stats
- Blue notification banner explaining view-only access

#### Full Admin View:
- All statistics with full data
- Quick action cards:
  - Pending Orders
  - Open Complaints
  - Profile Change Requests
  - Broadcast Message

#### Super Admin View:
- Everything Full Admin sees
- **"Manage Roles"** button
- Access to `/admin/roles` page

### Stats Cards

Each stat card shows:
- Icon with color coding
- Metric name
- Current value
- Growth/trend indicator (if applicable)
- Click-through to detailed view

**Permission-Based Display:**
- ✅ **Has Permission**: Full card with data, clickable
- ❌ **No Permission**: Greyed out card with lock icon

### Recent Activity Table

Shows latest activities across:
- Loan applications
- Commodity orders
- Savings deposits
- User registrations

Filtered based on your permissions.

## 🛣️ Admin Routes

### Accessible Routes by Role

| Route | Limited Admin | Admin | Super Admin |
|-------|--------------|-------|-------------|
| `/admin/dashboard` | ✅ | ✅ | ✅ |
| `/admin/members` | ✅ View | ✅ View | ✅ View |
| `/admin/approvals` | ✅ View | ✅ Approve | ✅ Approve |
| `/admin/loans/requests` | ✅ View | ✅ Approve | ✅ Approve |
| `/admin/commodity-orders` | ✅ View | ✅ Approve | ✅ Approve |
| `/admin/savings` | ✅ View | ✅ Manage | ✅ Manage |
| `/admin/broadcast` | ❌ | ✅ Send | ✅ Send |
| `/admin/reports` | ✅ View | ✅ Export | ✅ Export |
| `/admin/roles` | ❌ | ❌ | ✅ Manage |

## 🧭 Navigation

The sidebar automatically filters menu items based on your permissions:

- **Dashboard**: Always visible
- **Members**: Requires `VIEW_MEMBERS`
- **Approvals**: Requires `VIEW_APPROVALS`
- **Loans**: Requires `VIEW_LOANS`
- **Broadcast**: Requires `SEND_BROADCAST`
- **Role Management**: Super Admin only

## 🎨 Visual Indicators

### Role Badges

Each admin sees a badge on the dashboard:
- **Member**: Grey badge
- **Limited Admin**: Blue badge
- **Administrator**: Purple badge
- **Super Administrator**: Amber/Gold badge

### Permission Warnings

Limited Admins see a blue info banner:
> "Limited Access Account - You have view-only access to the system."

### Locked Features

Features you don't have access to show:
- 🔒 Lock icon
- Greyed out appearance
- "No Access" label

## 🔐 Security

- All permissions checked on both frontend AND backend
- Routes protected with `canAccessAdmin()` check
- Individual features gated with `hasPermission()` checks
- Firestore security rules enforce server-side permissions

## 📝 Permission System

### Available Permissions

```javascript
VIEW_MEMBERS
EDIT_MEMBERS
DELETE_MEMBERS
VIEW_LOANS
APPROVE_LOANS
REJECT_LOANS
VIEW_SAVINGS
APPROVE_SAVINGS_REDUCTION
VIEW_COMMODITY_ORDERS
APPROVE_COMMODITY_ORDERS
MANAGE_COMMODITIES
VIEW_REPORTS
EXPORT_REPORTS
SEND_BROADCAST
VIEW_COMPLAINTS
RESPOND_COMPLAINTS
APPROVE_PROFILE_CHANGES
MANAGE_ROLES
VIEW_APPROVALS
PROCESS_APPROVALS
```

### Checking Permissions

In components:
```javascript
import { hasPermission, PERMISSIONS } from '../utils/permissions'
import { useAuthStore } from '../store/authStore'

const { user } = useAuthStore()

if (hasPermission(user, PERMISSIONS.APPROVE_LOANS)) {
  // Show approve button
}
```

## 🧪 Testing Admin Roles

### Test Users

Create test admin accounts:

```bash
node tests/helpers/setupTestUsers.js
```

Then promote them:

```bash
node scripts/setAdminRole.js
```

### Manual Testing Checklist

- [ ] Limited Admin can view but not approve loans
- [ ] Admin can approve loans
- [ ] Super Admin can access role management
- [ ] Locked cards show for missing permissions
- [ ] Sidebar filters based on permissions
- [ ] Role badge displays correctly

## 🚨 Troubleshooting

### "Access Denied" Error

**Problem**: You see "Access Denied" when trying to access admin panel

**Solution**: 
1. Check your role in Firestore (`users` collection)
2. Ensure role is one of: `limitedAdmin`, `admin`, or `superadmin`
3. Log out and log back in

### Stats Show "No Access"

**Problem**: Dashboard shows locked cards

**Solution**: This is normal for Limited Admins. Contact Super Admin for role upgrade.

### Can't See Role Management

**Problem**: Role Management link missing from sidebar

**Solution**: Only Super Admins can access this. You need `superadmin` role.

## 💡 Best Practices

1. **Least Privilege**: Start users with Limited Admin, promote as needed
2. **Super Admin Limit**: Keep number of Super Admins minimal (1-3 max)
3. **Regular Audits**: Review admin roles quarterly
4. **Activity Logging**: Monitor admin actions in Recent Activity
5. **Multi-Factor Auth**: Enable for all admin accounts (if available)

## 📚 Additional Resources

- **Permissions Reference**: `src/utils/permissions.js`
- **Admin Dashboard**: `src/pages/admin/AdminDashboard.jsx`
- **Sidebar Logic**: `src/components/layout/Sidebar.jsx`
- **Role Model**: `ROLES` in `permissions.js`

---

**Need Help?** Contact the system administrator or check the application logs.
