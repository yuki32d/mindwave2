// ============================================
// GRANT DASHBOARD ACCESS - Migration Script
// For users who already paid
// ============================================

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/mindwave";

// ===== CONFIGURE THESE VALUES =====
const USER_EMAIL = "rajkumar@example.com"; // YOUR EMAIL HERE
const ORG_NAME = "TechEdu Institute"; // YOUR ORG NAME HERE
const PAYMENT_ID = "pi_xxxxx"; // YOUR PAYMENT ID (optional)
// ==================================

async function grantDashboardAccess() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        // Import models
        const User = mongoose.model('User');
        const Organization = mongoose.model('Organization');

        // Find user
        console.log(`🔍 Looking for user: ${USER_EMAIL}`);
        const user = await User.findOne({ email: USER_EMAIL });

        if (!user) {
            console.error(`❌ User not found with email: ${USER_EMAIL}`);
            console.log('\n💡 Tip: Make sure the email matches exactly what you used to sign up');
            process.exit(1);
        }

        console.log(`✅ Found user: ${user.name} (ID: ${user._id})\n`);

        // Check if user already has an organization
        if (user.organizationId) {
            console.log('⚠️  User already has an organization!');
            const existingOrg = await Organization.findById(user.organizationId);
            if (existingOrg) {
                console.log(`   Organization: ${existingOrg.name}`);
                console.log(`   Subscription: ${existingOrg.subscriptionTier}`);
                console.log(`   Status: ${existingOrg.subscriptionStatus}`);
                console.log('\n✅ You should already have dashboard access!');
                console.log('   Try logging in and navigating to: /modern-dashboard.html');
                process.exit(0);
            }
        }

        // Create organization slug
        const slug = ORG_NAME.toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');

        // Create organization
        console.log('📝 Creating organization...');
        const organization = new Organization({
            name: ORG_NAME,
            slug: slug,
            ownerId: user._id,
            subscriptionTier: 'premium',
            subscriptionStatus: 'active',
            setupCompleted: true,
            setupCompletedAt: new Date(),
            firstLoginAt: new Date(),
            lastLoginAt: new Date(),
            setupSteps: {
                profileCompleted: true,
                teamInvited: false,
                studentsImported: false,
                firstGameCreated: false
            },
            analytics: {
                aiCallsThisMonth: 0,
                totalImpressions: 0,
                totalInteractions: 0,
                lastResetDate: new Date()
            },
            trialStartedAt: new Date(),
            trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
            billingEmail: user.email,
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            limits: {
                maxStudents: -1, // Unlimited
                maxCourses: -1, // Unlimited
                maxStorage: 10240, // 10GB
                features: {
                    customBranding: true,
                    apiAccess: true,
                    ssoIntegration: true,
                    prioritySupport: true,
                    advancedAnalytics: true
                }
            },
            usage: {
                studentCount: 0,
                courseCount: 0,
                storageUsed: 0
            }
        });

        await organization.save();
        console.log(`✅ Organization created: ${organization.name} (ID: ${organization._id})\n`);

        // Update user
        console.log('👤 Updating user role...');
        user.organizationId = organization._id;
        user.orgRole = 'owner';
        user.userType = 'organization';
        await user.save();
        console.log('✅ User updated with organization access\n');

        // Success summary
        console.log('═══════════════════════════════════════');
        console.log('🎉 SUCCESS! Dashboard Access Granted!');
        console.log('═══════════════════════════════════════');
        console.log(`📋 Organization: ${organization.name}`);
        console.log(`🆔 Organization ID: ${organization._id}`);
        console.log(`👤 User: ${user.name} (${user.email})`);
        console.log(`🎭 Role: ${user.orgRole}`);
        console.log(`💎 Plan: ${organization.subscriptionTier}`);
        console.log(`✅ Status: ${organization.subscriptionStatus}`);
        console.log('═══════════════════════════════════════\n');
        console.log('✨ Next Steps:');
        console.log('   1. Login to your account');
        console.log('   2. Navigate to: /modern-dashboard.html');
        console.log('   3. You should see your organization dashboard!\n');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error(error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
        process.exit(0);
    }
}

// Run the script
grantDashboardAccess();
