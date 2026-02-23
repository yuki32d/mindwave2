// ============================================
// MIGRATION SCRIPT - Grant Dashboard Access
// Run this ONCE to give existing paid users access
// ============================================

// This script should be run in your MongoDB console or as a Node.js script

// ============================================
// OPTION 1: MongoDB Console Commands
// ============================================

/*
// 1. Find your user by email
db.users.findOne({ email: "your-email@example.com" })

// 2. Create an organization for this user
db.organizations.insertOne({
    name: "Your Organization Name",
    ownerId: ObjectId("YOUR_USER_ID_HERE"), // Replace with your user ID
    createdAt: new Date(),
    status: "active"
})

// 3. Get the organization ID from the result above, then create subscription
db.subscriptions.insertOne({
    organizationId: ObjectId("YOUR_ORG_ID_HERE"), // Replace with org ID from step 2
    planId: "premium",
    planName: "Premium Plan",
    status: "active",
    renewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    aiLimit: 5000,
    storageLimit: 10737418240, // 10GB
    paymentId: "EXISTING_PAYMENT_ID" // Your payment ID from yesterday
})

// 4. Initialize usage tracking
db.usage.insertOne({
    organizationId: ObjectId("YOUR_ORG_ID_HERE"), // Same org ID
    aiCalls: 0,
    storage: 0,
    lastReset: new Date()
})

// 5. Update your user with organization info
db.users.updateOne(
    { email: "your-email@example.com" },
    { 
        $set: { 
            organizationId: ObjectId("YOUR_ORG_ID_HERE"), // Same org ID
            role: "organization_admin"
        }
    }
)
*/

// ============================================
// OPTION 2: Node.js Script (Recommended)
// ============================================

const { MongoClient, ObjectId } = require('mongodb');

async function grantDashboardAccess() {
    const uri = process.env.MONGODB_URI || "your-mongodb-connection-string";
    const client = new MongoClient(uri);

    try {
        await client.connect();
        const db = client.db('mindwave'); // Replace with your database name

        // ===== CONFIGURE THESE VALUES =====
        const userEmail = "your-email@example.com"; // YOUR EMAIL HERE
        const organizationName = "TechEdu Institute"; // YOUR ORG NAME HERE
        const existingPaymentId = "pi_xxxxx"; // YOUR PAYMENT ID FROM YESTERDAY
        // ==================================

        console.log('🔍 Finding user...');
        const user = await db.collection('users').findOne({ email: userEmail });

        if (!user) {
            console.error('❌ User not found with email:', userEmail);
            return;
        }

        console.log('✅ User found:', user.name);

        // Check if user already has an organization
        if (user.organizationId) {
            console.log('⚠️  User already has an organization:', user.organizationId);
            console.log('Skipping organization creation...');
            return;
        }

        // Create organization
        console.log('📝 Creating organization...');
        const orgResult = await db.collection('organizations').insertOne({
            name: organizationName,
            ownerId: user._id,
            createdAt: new Date(),
            status: 'active'
        });

        const orgId = orgResult.insertedId;
        console.log('✅ Organization created:', orgId);

        // Create subscription
        console.log('💳 Creating subscription...');
        await db.collection('subscriptions').insertOne({
            organizationId: orgId,
            planId: 'premium',
            planName: 'Premium Plan',
            status: 'active',
            renewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            aiLimit: 5000,
            storageLimit: 10737418240, // 10GB
            paymentId: existingPaymentId,
            createdAt: new Date()
        });
        console.log('✅ Subscription created');

        // Initialize usage
        console.log('📊 Initializing usage tracking...');
        await db.collection('usage').insertOne({
            organizationId: orgId,
            aiCalls: 0,
            storage: 0,
            lastReset: new Date()
        });
        console.log('✅ Usage tracking initialized');

        // Update user
        console.log('👤 Updating user role...');
        await db.collection('users').updateOne(
            { _id: user._id },
            {
                $set: {
                    organizationId: orgId,
                    role: 'organization_admin',
                    updatedAt: new Date()
                }
            }
        );
        console.log('✅ User updated');

        console.log('\n🎉 SUCCESS! Dashboard access granted!');
        console.log('📋 Summary:');
        console.log('   - Organization ID:', orgId);
        console.log('   - User Email:', userEmail);
        console.log('   - Role: organization_admin');
        console.log('\n✨ You can now access the dashboard at: /modern-dashboard.html');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await client.close();
    }
}

// Run the script
if (require.main === module) {
    grantDashboardAccess();
}

module.exports = { grantDashboardAccess };

// ============================================
// HOW TO RUN THIS SCRIPT
// ============================================

/*
1. Save this file as: grant-dashboard-access.js

2. Update the values at the top:
   - userEmail: Your email address
   - organizationName: Your organization name
   - existingPaymentId: Your payment ID from yesterday

3. Run the script:
   node grant-dashboard-access.js

4. You should see success messages

5. Now you can login and access the dashboard!
*/

// ============================================
// OPTION 3: Quick Fix via Browser Console
// ============================================

/*
If you just want to test the dashboard immediately without backend setup:

1. Open your browser console (F12)
2. Paste this code:

localStorage.setItem('user', JSON.stringify({
    id: 'USER-123',
    email: 'your-email@example.com',
    name: 'Your Name',
    organizationId: 'ORG-' + Date.now(),
    organizationName: 'TechEdu Institute',
    role: 'organization_admin',
    token: 'demo-token'
}));

localStorage.setItem('organization', JSON.stringify({
    organizationId: 'ORG-' + Date.now(),
    organizationName: 'TechEdu Institute',
    setupComplete: true,
    setupDate: new Date().toISOString()
}));

3. Refresh the page or navigate to /modern-dashboard.html
4. You should now see the dashboard!

Note: This is just for testing. For production, use Option 1 or 2 above.
*/
