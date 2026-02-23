// ============================================
// ADD THESE MODELS AFTER LINE 895 in server.js
// (After GoogleClassroomAnnouncement model, before const app = express();)
// ============================================

const User = mongoose.model("User", userSchema);
const Organization = mongoose.model("Organization", organizationSchema);
const PasswordReset = mongoose.model("PasswordReset", passwordResetSchema);
const AdminNotification = mongoose.model("AdminNotification", adminNotificationSchema);
const SubscriptionEvent = mongoose.model("SubscriptionEvent", subscriptionEventSchema);
const Game = mongoose.model("Game", gameSchema);
const BlockedEmail = mongoose.model("BlockedEmail", blockedEmailSchema);

// ============================================
// ADD THESE ENDPOINTS AFTER THE AUTH MIDDLEWARE in server.js
// (Search for "authMiddleware" function and add these endpoints after it)
// ============================================

// ===================================
// ORGANIZATION MANAGEMENT ENDPOINTS
// ===================================

// Create Organization
app.post("/api/organizations/create", authMiddleware, async (req, res) => {
    try {
        const { name, subdomain, type, size, country, website } = req.body;
        const userId = req.user.userId;

        // Validate required fields
        if (!name || !subdomain || !type) {
            return res.status(400).json({
                ok: false,
                message: "Name, subdomain, and type are required"
            });
        }

        // Check if subdomain is already taken
        const existingOrg = await Organization.findOne({ slug: subdomain });
        if (existingOrg) {
            return res.status(400).json({
                ok: false,
                message: "Subdomain is already taken. Please choose another."
            });
        }

        // Create organization
        const organization = await Organization.create({
            name,
            slug: subdomain,
            ownerId: userId,
            subscriptionTier: 'trial',
            subscriptionStatus: 'trialing',
            trialStartedAt: new Date(),
            trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
            setupCompleted: true,
            setupCompletedAt: new Date(),
            firstLoginAt: new Date(),
            lastLoginAt: new Date()
        });

        // Update user with organization info
        await User.findByIdAndUpdate(userId, {
            organizationId: organization._id,
            orgRole: 'owner',
            userType: 'organization'
        });

        res.json({
            ok: true,
            organization: {
                _id: organization._id,
                name: organization.name,
                slug: organization.slug,
                type: type,
                subscriptionTier: organization.subscriptionTier,
                subscriptionStatus: organization.subscriptionStatus,
                trialDaysRemaining: 14
            },
            message: "Organization created successfully"
        });

    } catch (error) {
        console.error("Error creating organization:", error);
        res.status(500).json({
            ok: false,
            message: "Failed to create organization"
        });
    }
});

// Get Organization Details
app.get("/api/organizations/details", authMiddleware, async (req, res) => {
    try {
        const userId = req.user.userId;

        // Get user to find their organization
        const user = await User.findById(userId);
        if (!user || !user.organizationId) {
            return res.status(404).json({
                ok: false,
                message: "No organization found for this user"
            });
        }

        // Get organization
        const organization = await Organization.findById(user.organizationId);
        if (!organization) {
            return res.status(404).json({
                ok: false,
                message: "Organization not found"
            });
        }

        // Calculate trial days remaining
        let trialDaysRemaining = 0;
        if (organization.trialEndsAt) {
            const now = new Date();
            const trialEnd = new Date(organization.trialEndsAt);
            trialDaysRemaining = Math.max(0, Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24)));
        }

        // Get member count
        const memberCount = await User.countDocuments({ organizationId: organization._id });

        res.json({
            ok: true,
            organization: {
                _id: organization._id,
                name: organization.name,
                slug: organization.slug,
                subscriptionTier: organization.subscriptionTier,
                subscriptionStatus: organization.subscriptionStatus,
                trialDaysRemaining,
                memberCount,
                currentPeriodEnd: organization.currentPeriodEnd,
                setupCompleted: organization.setupCompleted
            }
        });

    } catch (error) {
        console.error("Error getting organization details:", error);
        res.status(500).json({
            ok: false,
            message: "Failed to get organization details"
        });
    }
});

// Get Student Domains
app.get("/api/organizations/student-domains", authMiddleware, async (req, res) => {
    try {
        const userId = req.user.userId;
        const user = await User.findById(userId);

        if (!user || !user.organizationId) {
            return res.status(404).json({ ok: false, message: "No organization found" });
        }

        const organization = await Organization.findById(user.organizationId);
        if (!organization) {
            return res.status(404).json({ ok: false, message: "Organization not found" });
        }

        res.json({
            ok: true,
            domains: organization.allowedStudentDomains || []
        });

    } catch (error) {
        console.error("Error getting student domains:", error);
        res.status(500).json({ ok: false, message: "Failed to get student domains" });
    }
});

// Configure Student Domains
app.post("/api/organizations/configure-student-domains", authMiddleware, async (req, res) => {
    try {
        const { allowedDomains } = req.body;
        const userId = req.user.userId;

        const user = await User.findById(userId);
        if (!user || !user.organizationId) {
            return res.status(404).json({ ok: false, message: "No organization found" });
        }

        // Update organization
        await Organization.findByIdAndUpdate(user.organizationId, {
            allowedStudentDomains: allowedDomains
        });

        res.json({
            ok: true,
            message: "Student domains configured successfully"
        });

    } catch (error) {
        console.error("Error configuring student domains:", error);
        res.status(500).json({ ok: false, message: "Failed to configure student domains" });
    }
});

// Invite Admin
app.post("/api/organizations/invite-admin", authMiddleware, async (req, res) => {
    try {
        const { email, role, autoGeneratePassword } = req.body;
        const userId = req.user.userId;

        const user = await User.findById(userId);
        if (!user || !user.organizationId) {
            return res.status(404).json({ ok: false, message: "No organization found" });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ ok: false, message: "User with this email already exists" });
        }

        // Generate password if requested
        let password = null;
        if (autoGeneratePassword) {
            password = crypto.randomBytes(8).toString('hex');
        }

        // Create user
        const hashedPassword = await bcrypt.hash(password || 'changeme', 10);
        const newUser = await User.create({
            name: email.split('@')[0],
            email,
            password: hashedPassword,
            role: 'admin',
            userType: 'organization',
            organizationId: user.organizationId,
            orgRole: role || 'admin'
        });

        res.json({
            ok: true,
            message: "Admin invited successfully",
            credentials: autoGeneratePassword ? { email, password } : null
        });

    } catch (error) {
        console.error("Error inviting admin:", error);
        res.status(500).json({ ok: false, message: "Failed to invite admin" });
    }
});
