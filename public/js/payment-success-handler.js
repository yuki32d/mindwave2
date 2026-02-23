// ============================================
// PAYMENT SUCCESS HANDLER
// Handles Razorpay payment success and redirects to dashboard
// ============================================

// This function should be called after Razorpay payment success
async function handlePaymentSuccess(paymentData) {
    const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        plan,
        organizationName
    } = paymentData;

    try {
        // Get user data
        const user = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');

        if (!user || !user._id) {
            console.error('User not found in session');
            alert('Please login first');
            window.location.href = '/admin-login.html';
            return;
        }

        // Show loading overlay
        showLoadingOverlay('Processing payment...');

        // Verify payment with backend
        const response = await fetch('/api/verify-payment', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                razorpay_order_id,
                razorpay_payment_id,
                razorpay_signature,
                plan: plan || 'premium',
                userId: user._id,
                organizationName: organizationName || `${user.name}'s Organization`
            })
        });

        const result = await response.json();

        if (result.success) {
            // Update user data in localStorage/sessionStorage
            user.organizationId = result.organizationId;
            user.orgRole = 'owner';
            user.userType = 'organization';

            if (localStorage.getItem('user')) {
                localStorage.setItem('user', JSON.stringify(user));
            } else {
                sessionStorage.setItem('user', JSON.stringify(user));
            }

            // Show success message
            showSuccessOverlay('Payment Successful!', 'Setting up your organization dashboard...');

            // Redirect to dashboard after 2 seconds
            setTimeout(() => {
                window.location.href = result.redirectUrl || '/marketing-site/modern-dashboard.html';
            }, 2000);
        } else {
            throw new Error(result.message || 'Payment verification failed');
        }
    } catch (error) {
        console.error('Payment processing error:', error);
        hideOverlay();
        alert('Payment processing failed: ' + error.message);
    }
}

// ============================================
// UI HELPER FUNCTIONS
// ============================================

function showLoadingOverlay(message) {
    const overlay = document.createElement('div');
    overlay.id = 'payment-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
    `;

    overlay.innerHTML = `
        <div style="
            background: white;
            padding: 3rem;
            border-radius: 20px;
            text-align: center;
            max-width: 400px;
        ">
            <div class="spinner" style="
                width: 50px;
                height: 50px;
                border: 4px solid #e2e8f0;
                border-top-color: #6366f1;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 0 auto 1.5rem;
            "></div>
            <h2 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 0.5rem; color: #1e293b;">
                ${message}
            </h2>
            <p style="color: #64748b;">Please wait...</p>
        </div>
    `;

    const style = document.createElement('style');
    style.textContent = `
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);
    document.body.appendChild(overlay);
}

function showSuccessOverlay(title, message) {
    const overlay = document.getElementById('payment-overlay');
    if (!overlay) return;

    overlay.innerHTML = `
        <div style="
            background: white;
            padding: 3rem;
            border-radius: 20px;
            text-align: center;
            max-width: 400px;
            animation: slideUp 0.3s ease;
        ">
            <div style="font-size: 4rem; margin-bottom: 1rem;">✅</div>
            <h2 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 0.5rem; color: #1e293b;">
                ${title}
            </h2>
            <p style="color: #64748b; margin-bottom: 1.5rem;">
                ${message}
            </p>
            <div class="spinner" style="
                width: 40px;
                height: 40px;
                border: 4px solid #e2e8f0;
                border-top-color: #6366f1;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 0 auto;
            "></div>
        </div>
    `;
}

function hideOverlay() {
    const overlay = document.getElementById('payment-overlay');
    if (overlay) {
        overlay.remove();
    }
}

// ============================================
// EXAMPLE USAGE WITH RAZORPAY
// ============================================

/*
// Initialize Razorpay
const options = {
    key: "YOUR_RAZORPAY_KEY",
    amount: 249900, // Amount in paise (₹2499)
    currency: "INR",
    name: "MindWave",
    description: "Premium Plan Subscription",
    order_id: "order_xxxxx", // Get this from /api/create-order
    handler: function (response) {
        // This is called after successful payment
        handlePaymentSuccess({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            plan: 'premium',
            organizationName: 'My Organization' // Optional
        });
    },
    prefill: {
        name: user.name,
        email: user.email
    },
    theme: {
        color: "#6366f1"
    }
};

const rzp = new Razorpay(options);
rzp.open();
*/

console.log('✅ Payment success handler loaded');
