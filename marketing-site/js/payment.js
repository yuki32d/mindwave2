// Get plan details from URL parameters
const urlParams = new URLSearchParams(window.location.search);
const plan = urlParams.get('plan') || 'Personal';
const currency = urlParams.get('currency') || 'INR';

// Plan configurations
const plans = {
    Personal: {
        name: 'Personal Plan',
        priceINR: 499,
        priceUSD: 12,
        features: [
            'Up to 100 students',
            'Unlimited quizzes',
            'AI quiz builder',
            'Basic analytics',
            'Email support'
        ]
    },
    Team: {
        name: 'Team Plan',
        priceINR: 2499,
        priceUSD: 59,
        features: [
            'Up to 500 students',
            'Unlimited quizzes',
            'AI quiz builder',
            'Advanced analytics',
            'Priority support',
            'Team collaboration',
            'Custom branding'
        ]
    },
    Enterprise: {
        name: 'Enterprise Plan',
        priceINR: 9999,
        priceUSD: 179,
        features: [
            'Unlimited students',
            'Unlimited quizzes',
            'AI quiz builder',
            'Advanced analytics',
            '24/7 dedicated support',
            'Team collaboration',
            'Custom branding',
            'LMS integration',
            'SSO & advanced security'
        ]
    }
};

// Update page with plan details
function updatePlanDetails() {
    const selectedPlan = plans[plan];
    if (!selectedPlan) {
        alert('Invalid plan selected');
        window.location.href = 'website-home.html#pricing';
        return;
    }

    document.getElementById('planName').textContent = selectedPlan.name;

    const price = currency === 'USD' ? selectedPlan.priceUSD : selectedPlan.priceINR;
    const currencySymbol = currency === 'USD' ? '$' : '₹';

    document.getElementById('currency').textContent = currencySymbol;
    document.getElementById('price').textContent = price;

    // Update features
    const featuresHTML = selectedPlan.features.map(feature =>
        `<li><i class="fas fa-check-circle"></i> ${feature}</li>`
    ).join('');
    document.getElementById('planFeatures').innerHTML = featuresHTML;
}

// Initialize Razorpay payment
async function initiatePayment() {
    const payButton = document.getElementById('payButton');
    payButton.disabled = true;
    payButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

    try {
        const selectedPlan = plans[plan];
        const amount = currency === 'USD' ? selectedPlan.priceUSD : selectedPlan.priceINR;

        // Create order on backend
        const apiUrl = window.location.hostname === 'localhost'
            ? 'http://localhost:3000'
            : 'https://mindwave2.onrender.com';

        const response = await fetch(`${apiUrl}/api/create-order`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                amount: amount,
                currency: currency,
                plan: plan,
                userId: 'user_' + Date.now() // Replace with actual user ID from session
            })
        });

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.message || 'Failed to create order');
        }

        // Initialize Razorpay checkout
        const options = {
            key: data.key,
            amount: data.amount,
            currency: data.currency,
            name: 'MindWave',
            description: selectedPlan.name,
            image: 'https://your-logo-url.com/logo.png', // Replace with actual logo URL
            order_id: data.orderId,
            handler: function (response) {
                verifyPayment(response);
            },
            prefill: {
                name: '',
                email: '',
                contact: ''
            },
            notes: {
                plan: plan
            },
            theme: {
                color: '#667eea'
            },
            modal: {
                ondismiss: function () {
                    payButton.disabled = false;
                    payButton.innerHTML = '<i class="fas fa-lock"></i> Proceed to Pay';
                }
            }
        };

        const razorpay = new Razorpay(options);
        razorpay.open();

    } catch (error) {
        console.error('Payment error:', error);
        alert('Failed to initiate payment. Please try again.');
        payButton.disabled = false;
        payButton.innerHTML = '<i class="fas fa-lock"></i> Proceed to Pay';
    }
}

// Verify payment on backend
async function verifyPayment(response) {
    try {
        const apiUrl = window.location.hostname === 'localhost'
            ? 'http://localhost:3000'
            : 'https://mindwave2.onrender.com';

        const verifyResponse = await fetch(`${apiUrl}/api/verify-payment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                plan: plan,
                userId: 'user_' + Date.now() // Replace with actual user ID
            })
        });

        const data = await verifyResponse.json();

        if (data.success) {
            // Payment successful
            window.location.href = `payment-success.html?payment_id=${data.paymentId}&plan=${plan}`;
        } else {
            alert('Payment verification failed. Please contact support.');
        }
    } catch (error) {
        console.error('Verification error:', error);
        alert('Payment verification failed. Please contact support.');
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', function () {
    updatePlanDetails();

    document.getElementById('payButton').addEventListener('click', initiatePayment);

    // Payment method selection (for future enhancement)
    document.querySelectorAll('.payment-method').forEach(method => {
        method.addEventListener('click', function () {
            document.querySelectorAll('.payment-method').forEach(m => m.classList.remove('active'));
            this.classList.add('active');
        });
    });
});
