// Super Admin API Endpoints
// Add these to server.js after the organization management endpoints

// Super Admin Email (add to environment variables at top of server.js)
const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || "rajkumarw88d@gmail.com";

// Super Admin Middleware
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

// Blocked Email Schema (add to schemas section)
const blockedEmailSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true, lowercase: true },
    reason: String,
    blockedAt: { type: Date, default: Date.now },
    blockedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

const BlockedEmail = mongoose.model('BlockedEmail', blockedEmailSchema);

// ===================================
// SUPER ADMIN API ENDPOINTS
// ===================================

// Verify super admin access
app.get("/api/superadmin/verify", authMiddleware, superAdminMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.sub);
        res.json({
            ok: true,
            email: user.email,
            isSuperAdmin: true
        });
    } catch (error) {
        res.status(500).json({ ok: false, message: 'Server error' });
    }
});

// Get statistics
app.get("/api/superadmin/stats", authMiddleware, superAdminMiddleware, async (req, res) => {
    try {
        const totalUsers = await User.countDocuments({ userType: 'organization' });
        const totalOrgs = await Organization.countDocuments();
        const totalBlocked = await BlockedEmail.countDocuments();
        const activeUsers = await User.countDocuments({ userType: 'organization', suspended: { $ne: true } });

        res.json({
            ok: true,
            stats: {
                totalUsers,
                totalOrgs,
                totalBlocked,
                activeUsers
            }
        });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ ok: false, message: 'Server error' });
    }
});

// Get all organization users
app.get("/api/superadmin/users", authMiddleware, superAdminMiddleware, async (req, res) => {
    try {
        const users = await User.find({ userType: 'organization' })
            .select('-password')
            .sort({ createdAt: -1 })
            .lean();

        // Get organization names
        const usersWithOrgs = await Promise.all(users.map(async (user) => {
            if (user.organizationId) {
                const org = await Organization.findById(user.organizationId).select('name');
                user.organizationName = org ? org.name : 'N/A';
            }
            return user;
        }));

        res.json({
            ok: true,
            users: usersWithOrgs
        });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ ok: false, message: 'Server error' });
    }
});

// Get all organizations
app.get("/api/superadmin/organizations", authMiddleware, superAdminMiddleware, async (req, res) => {
    try {
        const organizations = await Organization.find()
            .sort({ createdAt: -1 })
            .lean();

        // Get owner emails and member counts
        const orgsWithDetails = await Promise.all(organizations.map(async (org) => {
            const owner = await User.findById(org.ownerId).select('email');
            org.ownerEmail = owner ? owner.email : 'N/A';
            org.memberCount = org.members ? org.members.length : 0;
            return org;
        }));

        res.json({
            ok: true,
            organizations: orgsWithDetails
        });
    } catch (error) {
        console.error('Get organizations error:', error);
        res.status(500).json({ ok: false, message: 'Server error' });
    }
});

// Delete user
app.delete("/api/superadmin/users/:userId", authMiddleware, superAdminMiddleware, async (req, res) => {
    try {
        const { userId } = req.params;

        // Delete user
        await User.findByIdAndDelete(userId);

        // Remove from organization members
        await Organization.updateMany(
            { 'members.userId': userId },
            { $pull: { members: { userId: userId } } }
        );

        res.json({
            ok: true,
            message: 'User deleted successfully'
        });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ ok: false, message: 'Server error' });
    }
});

// Suspend user
app.post("/api/superadmin/suspend-user", authMiddleware, superAdminMiddleware, async (req, res) => {
    try {
        const { userId } = req.body;

        await User.findByIdAndUpdate(userId, { suspended: true });

        res.json({
            ok: true,
            message: 'User suspended successfully'
        });
    } catch (error) {
        console.error('Suspend user error:', error);
        res.status(500).json({ ok: false, message: 'Server error' });
    }
});

// Activate user
app.post("/api/superadmin/activate-user", authMiddleware, superAdminMiddleware, async (req, res) => {
    try {
        const { userId } = req.body;

        await User.findByIdAndUpdate(userId, { suspended: false });

        res.json({
            ok: true,
            message: 'User activated successfully'
        });
    } catch (error) {
        console.error('Activate user error:', error);
        res.status(500).json({ ok: false, message: 'Server error' });
    }
});

// Delete organization
app.delete("/api/superadmin/organizations/:orgId", authMiddleware, superAdminMiddleware, async (req, res) => {
    try {
        const { orgId } = req.params;

        // Delete all users in organization
        await User.deleteMany({ organizationId: orgId });

        // Delete organization
        await Organization.findByIdAndDelete(orgId);

        res.json({
            ok: true,
            message: 'Organization and all members deleted successfully'
        });
    } catch (error) {
        console.error('Delete organization error:', error);
        res.status(500).json({ ok: false, message: 'Server error' });
    }
});

// Block email
app.post("/api/superadmin/block-email", authMiddleware, superAdminMiddleware, async (req, res) => {
    try {
        const { email, reason } = req.body;

        const blocked = await BlockedEmail.create({
            email: email.toLowerCase(),
            reason: reason || 'No reason provided',
            blockedBy: req.user.sub
        });

        res.json({
            ok: true,
            message: 'Email blocked successfully',
            blocked
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ ok: false, message: 'Email already blocked' });
        }
        console.error('Block email error:', error);
        res.status(500).json({ ok: false, message: 'Server error' });
    }
});

// Get blocked emails
app.get("/api/superadmin/blocked-emails", authMiddleware, superAdminMiddleware, async (req, res) => {
    try {
        const blocked = await BlockedEmail.find().sort({ blockedAt: -1 });

        res.json({
            ok: true,
            blocked
        });
    } catch (error) {
        console.error('Get blocked emails error:', error);
        res.status(500).json({ ok: false, message: 'Server error' });
    }
});

// Unblock email
app.delete("/api/superadmin/blocked-emails/:id", authMiddleware, superAdminMiddleware, async (req, res) => {
    try {
        const { id } = req.params;

        await BlockedEmail.findByIdAndDelete(id);

        res.json({
            ok: true,
            message: 'Email unblocked successfully'
        });
    } catch (error) {
        console.error('Unblock email error:', error);
        res.status(500).json({ ok: false, message: 'Server error' });
    }
});
