// ============================================
// ORG SETUP PAGE - Redirect to Dashboard
// ============================================

// This script should be included in your org setup/payment success page
// It redirects users to the organization dashboard after setup

function redirectToOrgDashboard() {
    // Save organization data to localStorage
    const orgData = {
        organizationId: 'ORG-' + Date.now(), // Replace with actual org ID from backend
        organizationName: 'TechEdu Institute', // Replace with actual org name
        setupComplete: true,
        setupDate: new Date().toISOString()
    };

    // Get user data
    const user = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');

    // Update user with organization info
    user.organizationId = orgData.organizationId;
    user.organizationName = orgData.organizationName;
    user.role = 'organization_admin';

    // Save updated user data
    if (localStorage.getItem('user')) {
        localStorage.setItem('user', JSON.stringify(user));
    } else {
        sessionStorage.setItem('user', JSON.stringify(user));
    }

    // Save organization data
    localStorage.setItem('organization', JSON.stringify(orgData));

    // Show success message
    showSuccessMessage();

    // Redirect after 2 seconds
    setTimeout(() => {
        window.location.href = '/modern-dashboard.html';
    }, 2000);
}

function showSuccessMessage() {
    // Create success overlay
    const overlay = document.createElement('div');
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

    const successCard = document.createElement('div');
    successCard.style.cssText = `
        background: white;
        padding: 3rem;
        border-radius: 20px;
        text-align: center;
        max-width: 400px;
        animation: slideUp 0.3s ease;
    `;

    successCard.innerHTML = `
        <div style="font-size: 4rem; margin-bottom: 1rem;">✅</div>
        <h2 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 0.5rem; color: #1e293b;">
            Setup Complete!
        </h2>
        <p style="color: #64748b; margin-bottom: 1.5rem;">
            Redirecting to your organization dashboard...
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
    `;

    // Add animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideUp {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);

    overlay.appendChild(successCard);
    document.body.appendChild(overlay);
}

// ============================================
// PAYMENT SUCCESS HANDLER
// ============================================

async function handlePaymentSuccess(paymentData) {
    try {
        // Send payment data to backend
        const response = await fetch('/api/organization/setup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getUserToken()}`
            },
            body: JSON.stringify({
                paymentId: paymentData.paymentId,
                planId: paymentData.planId,
                organizationName: paymentData.organizationName
            })
        });

        if (!response.ok) throw new Error('Setup failed');

        const result = await response.json();

        // Save organization data
        const user = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
        user.organizationId = result.organizationId;
        user.organizationName = result.organizationName;
        user.role = 'organization_admin';

        if (localStorage.getItem('user')) {
            localStorage.setItem('user', JSON.stringify(user));
        } else {
            sessionStorage.setItem('user', JSON.stringify(user));
        }

        // Redirect to dashboard
        redirectToOrgDashboard();
    } catch (error) {
        console.error('Error setting up organization:', error);
        alert('There was an error setting up your organization. Please contact support.');
    }
}

function getUserToken() {
    const user = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
    return user.token || '';
}

// ============================================
// EXAMPLE USAGE
// ============================================

// Call this after successful payment
// handlePaymentSuccess({
//     paymentId: 'pi_xxxxx',
//     planId: 'premium',
//     organizationName: 'TechEdu Institute'
// });

// Or call this directly for testing
// redirectToOrgDashboard();

console.log('✅ Org setup redirect script loaded');
