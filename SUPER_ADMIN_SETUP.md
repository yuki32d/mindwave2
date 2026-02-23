# Super Admin Backend Integration Instructions

## Step 1: Add Environment Variable

At the top of `server.js`, find the environment variables section (around line 29-56) and add:

```javascript
SUPER_ADMIN_EMAIL = "rajkumarw88d@gmail.com"
```

Add it after `STRIPE_WEBHOOK_SECRET` in the destructuring.

## Step 2: Add Blocked Email Schema

Find the schemas section (where User, Organization, etc. are defined) and add:

```javascript
const blockedEmailSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  reason: String,
  blockedAt: { type: Date, default: Date.now },
  blockedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

const BlockedEmail = mongoose.model('BlockedEmail', blockedEmailSchema);
```

## Step 3: Add Super Admin Middleware

After the `authMiddleware` function, add:

```javascript
function superAdminMiddleware(req, res, next) {
  const userId = req.user.sub;
  User.findById(userId).then(user => {
    if (!user || user.email !== SUPER_ADMIN_EMAIL) {
      return res.status(403).json({ ok: false, message: 'Super admin access required' });
    }
    next();
  }).catch(error => {
    res.status(500).json({ ok: false, message: 'Server error' });
  });
}
```

## Step 4: Add Super Admin Endpoints

Copy all the endpoints from `super-admin-endpoints.js` and paste them after the organization management endpoints (after the `/api/organizations/*` routes).

The endpoints include:
- GET `/api/superadmin/verify` - Verify super admin access
- GET `/api/superadmin/stats` - Get statistics
- GET `/api/superadmin/users` - Get all users
- GET `/api/superadmin/organizations` - Get all organizations
- DELETE `/api/superadmin/users/:userId` - Delete user
- POST `/api/superadmin/suspend-user` - Suspend user
- POST `/api/superadmin/activate-user` - Activate user
- DELETE `/api/superadmin/organizations/:orgId` - Delete organization
- POST `/api/superadmin/block-email` - Block email
- GET `/api/superadmin/blocked-emails` - Get blocked emails
- DELETE `/api/superadmin/blocked-emails/:id` - Unblock email

## Step 5: Restart Server

After adding all the endpoints, restart your server:

```bash
npm start
```

## Access Super Admin Page

Navigate to: `http://localhost:8081/marketing-site/super-admin.html`

You'll be able to:
- View all organization users
- Delete users
- Suspend/activate accounts
- Block emails
- Manage organizations
- View statistics
