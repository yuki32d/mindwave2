// ============================================
// ORGANIZATION API ENDPOINTS
// Add these to your server.js or routes file
// ============================================

const express = require('express');
const router = express.Router();

// ============================================
// GET ORGANIZATION DATA
// ============================================

router.get('/api/organization/:orgId', async (req, res) => {
    try {
        const { orgId } = req.params;

        // Fetch from your database
        const organization = await db.collection('organizations').findOne({ _id: orgId });
        const teamMembers = await db.collection('users').find({ organizationId: orgId, role: { $in: ['admin', 'faculty'] } }).toArray();
        const students = await db.collection('users').find({ organizationId: orgId, role: 'student' }).toArray();
        const subscription = await db.collection('subscriptions').findOne({ organizationId: orgId });
        const usage = await db.collection('usage').findOne({ organizationId: orgId });

        res.json({
            organizationName: organization.name,
            teamMembers: teamMembers,
            students: students,
            subscription: {
                planName: subscription.planName,
                renewalDate: subscription.renewalDate,
                status: subscription.status
            },
            usage: {
                aiCalls: usage.aiCalls || 0,
                aiLimit: subscription.aiLimit || 5000,
                storage: usage.storage || 0,
                storageLimit: subscription.storageLimit || 10737418240 // 10GB in bytes
            }
        });
    } catch (error) {
        console.error('Error fetching organization data:', error);
        res.status(500).json({ error: 'Failed to fetch organization data' });
    }
});

// ============================================
// GET TEAM MEMBERS
// ============================================

router.get('/api/organization/:orgId/team', async (req, res) => {
    try {
        const { orgId } = req.params;

        const teamMembers = await db.collection('users').find({
            organizationId: orgId,
            role: { $in: ['admin', 'faculty'] }
        }).toArray();

        const formattedMembers = teamMembers.map(member => ({
            id: member._id,
            name: member.name,
            email: member.email,
            role: member.role,
            title: member.title || 'Team Member',
            avatar: member.avatar,
            joinedDate: member.createdAt,
            status: member.isActive ? 'Active' : 'Inactive'
        }));

        res.json(formattedMembers);
    } catch (error) {
        console.error('Error fetching team members:', error);
        res.status(500).json({ error: 'Failed to fetch team members' });
    }
});

// ============================================
// GET STUDENTS
// ============================================

router.get('/api/organization/:orgId/students', async (req, res) => {
    try {
        const { orgId } = req.params;

        const students = await db.collection('users').find({
            organizationId: orgId,
            role: 'student'
        }).toArray();

        const formattedStudents = await Promise.all(students.map(async (student) => {
            // Get student's game stats
            const gameStats = await db.collection('gameResults').find({ userId: student._id }).toArray();
            const totalGames = gameStats.length;
            const avgProgress = gameStats.length > 0
                ? gameStats.reduce((sum, game) => sum + (game.score || 0), 0) / gameStats.length
                : 0;

            return {
                id: student._id,
                name: student.name,
                email: student.email,
                studentId: student.studentId,
                grade: student.grade,
                avatar: student.avatar,
                gamesPlayed: totalGames,
                progress: Math.round(avgProgress),
                lastActive: student.lastLogin ? getRelativeTime(student.lastLogin) : 'Never'
            };
        }));

        res.json(formattedStudents);
    } catch (error) {
        console.error('Error fetching students:', error);
        res.status(500).json({ error: 'Failed to fetch students' });
    }
});

// ============================================
// GET BILLING HISTORY
// ============================================

router.get('/api/organization/:orgId/billing', async (req, res) => {
    try {
        const { orgId } = req.params;

        const invoices = await db.collection('invoices').find({
            organizationId: orgId
        }).sort({ date: -1 }).toArray();

        const formattedInvoices = invoices.map(invoice => ({
            id: invoice._id,
            invoiceNumber: invoice.invoiceNumber,
            date: invoice.date,
            amount: invoice.amount,
            status: invoice.status
        }));

        res.json(formattedInvoices);
    } catch (error) {
        console.error('Error fetching billing history:', error);
        res.status(500).json({ error: 'Failed to fetch billing history' });
    }
});

// ============================================
// ORGANIZATION SETUP (After Payment)
// ============================================

router.post('/api/organization/setup', async (req, res) => {
    try {
        const { paymentId, planId, organizationName } = req.body;
        const userId = req.user.id; // From auth middleware

        // Verify payment with Stripe/payment provider
        // const payment = await stripe.paymentIntents.retrieve(paymentId);
        // if (payment.status !== 'succeeded') {
        //     return res.status(400).json({ error: 'Payment not successful' });
        // }

        // Create organization
        const organization = await db.collection('organizations').insertOne({
            name: organizationName,
            ownerId: userId,
            createdAt: new Date(),
            status: 'active'
        });

        const orgId = organization.insertedId;

        // Create subscription
        await db.collection('subscriptions').insertOne({
            organizationId: orgId,
            planId: planId,
            planName: planId === 'premium' ? 'Premium Plan' : 'Basic Plan',
            status: 'active',
            renewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
            aiLimit: planId === 'premium' ? 5000 : 1000,
            storageLimit: planId === 'premium' ? 10737418240 : 5368709120, // 10GB or 5GB
            paymentId: paymentId
        });

        // Initialize usage tracking
        await db.collection('usage').insertOne({
            organizationId: orgId,
            aiCalls: 0,
            storage: 0,
            lastReset: new Date()
        });

        // Update user role
        await db.collection('users').updateOne(
            { _id: userId },
            {
                $set: {
                    organizationId: orgId,
                    role: 'organization_admin'
                }
            }
        );

        res.json({
            organizationId: orgId,
            organizationName: organizationName,
            message: 'Organization setup successful'
        });
    } catch (error) {
        console.error('Error setting up organization:', error);
        res.status(500).json({ error: 'Failed to setup organization' });
    }
});

// ============================================
// HELPER FUNCTIONS
// ============================================

function getRelativeTime(date) {
    const now = new Date();
    const diff = now - new Date(date);
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const weeks = Math.floor(diff / (1000 * 60 * 60 * 24 * 7));

    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (weeks < 4) return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
    return new Date(date).toLocaleDateString();
}

module.exports = router;

// ============================================
// USAGE IN server.js
// ============================================

// const organizationRoutes = require('./routes/organization');
// app.use(organizationRoutes);
