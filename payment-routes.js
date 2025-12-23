import express from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';

const router = express.Router();

// Initialize Razorpay instance
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Create order endpoint
router.post('/create-order', async (req, res) => {
    try {
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
            userId
        } = req.body;

        // Verify signature
        const sign = razorpay_order_id + '|' + razorpay_payment_id;
        const expectedSign = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(sign.toString())
            .digest('hex');

        if (razorpay_signature === expectedSign) {
            // Payment is verified
            // TODO: Save payment details to database
            // TODO: Update user subscription status

            res.json({
                success: true,
                message: 'Payment verified successfully',
                paymentId: razorpay_payment_id,
                orderId: razorpay_order_id
            });
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
