// ============================================
// LOGIN REDIRECT HANDLER
// Automatically redirects to correct dashboard based on user type
// ============================================

// Call this function after successful login
function handleLoginSuccess(userData) {
    // Save user data to storage
    const storage = userData.rememberMe ? localStorage : sessionStorage;
    storage.setItem('user', JSON.stringify(userData));

    // Determine redirect URL based on user type and organization
    let redirectUrl = '/homepage.html'; // Default for students

    if (userData.organizationId || userData.userType === 'organization' || userData.orgRole) {
        // User has organization access - redirect to modern dashboard
        redirectUrl = '/marketing-site/modern-dashboard.html';
        console.log('✅ Redirecting to Organization Dashboard');
    } else if (userData.role === 'admin') {
        // Admin without organization - redirect to admin page
        redirectUrl = '/admin.html';
        console.log('✅ Redirecting to Admin Dashboard');
    } else {
        // Regular student
        redirectUrl = '/homepage.html';
        console.log('✅ Redirecting to Student Homepage');
    }

    // Show success message and redirect
    showLoginSuccess(userData.name, redirectUrl);
}

function showLoginSuccess(userName, redirectUrl) {
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

    overlay.innerHTML = `
        <div style="
            background: white;
            padding: 3rem;
            border-radius: 20px;
            text-align: center;
            max-width: 400px;
            animation: slideUp 0.3s ease;
        ">
            <div style="font-size: 4rem; margin-bottom: 1rem;">👋</div>
            <h2 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 0.5rem; color: #1e293b;">
                Welcome back, ${userName}!
            </h2>
            <p style="color: #64748b; margin-bottom: 1.5rem;">
                Redirecting to your dashboard...
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
    document.body.appendChild(overlay);

    // Redirect after 1.5 seconds
    setTimeout(() => {
        window.location.href = redirectUrl;
    }, 1500);
}

// ============================================
// AUTO-REDIRECT ON PAGE LOAD
// Check if user is already logged in and redirect
// ============================================

function checkAndRedirect() {
    const user = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');

    if (user && user.email) {
        // User is logged in
        if (user.organizationId || user.userType === 'organization' || user.orgRole) {
            // Has organization - redirect to modern dashboard
            window.location.href = '/marketing-site/modern-dashboard.html';
        } else if (user.role === 'admin') {
            // Admin - redirect to admin dashboard
            window.location.href = '/admin.html';
        } else {
            // Student - redirect to homepage
            window.location.href = '/homepage.html';
        }
    }
}

// Auto-check on login pages
if (window.location.pathname.includes('login') || window.location.pathname === '/') {
    // Only redirect if on login page and already logged in
    const user = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
    if (user && user.email && window.location.pathname.includes('login')) {
        checkAndRedirect();
    }
}

console.log('✅ Login redirect handler loaded');
