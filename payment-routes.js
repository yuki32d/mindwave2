import express from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';

const router = express.Router();

// Initialize Razorpay instance (only if credentials are provided)
let razorpay = null;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET
    });
}

// Create order endpoint
router.post('/create-order', async (req, res) => {
    try {
        if (!razorpay) {
            return res.status(503).json({
                success: false,
                message: 'Payment service not configured'
            });
        }

        const { amount, currency, plan, userId } = req.body;

        const options = {
            amount: amount * 100, // Razorpay expects amount in paise
            currency: currency || 'INR',
            receipt: `receipt_${Date.now()}`,
            notes: {
                plan: plan,
                userId: userId
            }
        };

        const order = await razorpay.orders.create(options);

        res.json({
            success: true,
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            key: process.env.RAZORPAY_KEY_ID
        });
    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create order',
            error: error.message
        });
    }
});

// Verify payment endpoint
router.post('/verify-payment', async (req, res) => {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            plan,
            userId,
            organizationName
        } = req.body;

        // Verify signature
        const sign = razorpay_order_id + '|' + razorpay_payment_id;
        const expectedSign = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(sign.toString())
            .digest('hex');

        if (razorpay_signature === expectedSign) {
            // Payment is verified - Now create organization
            try {
                // Import models (assuming they're available in server.js context)
                const { User, Organization } = await import('./server.js');

                // Find user
                const user = await User.findById(userId);
                if (!user) {
                    return res.status(404).json({
                        success: false,
                        message: 'User not found'
                    });
                }

                // Check if user already has an organization
                let organization;
                if (user.organizationId) {
                    organization = await Organization.findById(user.organizationId);
                } else {
                    // Create organization slug
                    const orgName = organizationName || `${user.name}'s Organization`;
                    const slug = orgName.toLowerCase()
                        .replace(/[^a-z0-9]+/g, '-')
                        .replace(/(^-|-$)/g, '');

                    // Create new organization
                    organization = new Organization({
                        name: orgName,
                        slug: slug,
                        ownerId: user._id,
                        subscriptionTier: plan || 'premium',
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
                        trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                        billingEmail: user.email,
                        currentPeriodStart: new Date(),
                        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                        limits: {
                            maxStudents: -1,
                            maxCourses: -1,
                            maxStorage: 10240,
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

                    // Update user
                    user.organizationId = organization._id;
                    user.orgRole = 'owner';
                    user.userType = 'organization';
                    await user.save();
                }

                res.json({
                    success: true,
                    message: 'Payment verified successfully',
                    paymentId: razorpay_payment_id,
                    orderId: razorpay_order_id,
                    organizationCreated: true,
                    organizationId: organization._id,
                    redirectUrl: '/marketing-site/modern-dashboard.html' // REDIRECT TO DASHBOARD
                });
            } catch (dbError) {
                console.error('Error creating organization:', dbError);
                // Payment verified but org creation failed
                res.json({
                    success: true,
                    message: 'Payment verified successfully',
                    paymentId: razorpay_payment_id,
                    orderId: razorpay_order_id,
                    organizationCreated: false,
                    error: 'Organization creation pending',
                    redirectUrl: '/marketing-site/modern-dashboard.html' // Still redirect to dashboard
                });
            }
        } else {
            res.status(400).json({
                success: false,
                message: 'Invalid payment signature'
            });
        }
    } catch (error) {
        console.error('Error verifying payment:', error);
        res.status(500).json({
            success: false,
            message: 'Payment verification failed',
            error: error.message
        });
    }
});

// Get payment status
router.get('/payment-status/:paymentId', async (req, res) => {
    try {
        if (!razorpay) {
            return res.status(503).json({
                success: false,
                message: 'Payment service not configured'
            });
        }

        const payment = await razorpay.payments.fetch(req.params.paymentId);

        res.json({
            success: true,
            status: payment.status,
            method: payment.method,
            amount: payment.amount / 100,
            currency: payment.currency
        });
    } catch (error) {
        console.error('Error fetching payment status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch payment status',
            error: error.message
        });
    }
});

// Create subscription endpoint
router.post('/create-subscription', async (req, res) => {
    try {
        if (!razorpay) {
            return res.status(503).json({
                success: false,
                message: 'Payment service not configured'
            });
        }

        const { planId, customerId, totalCount } = req.body;

        const subscription = await razorpay.subscriptions.create({
            plan_id: planId,
            customer_notify: 1,
            total_count: totalCount || 12, // 12 months by default
            quantity: 1
        });

        res.json({
            success: true,
            subscriptionId: subscription.id,
            status: subscription.status
        });
    } catch (error) {
        console.error('Error creating subscription:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create subscription',
            error: error.message
        });
    }
});

export default router;
