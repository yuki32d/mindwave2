// ===================================
// Login Page JavaScript
// ===================================

document.addEventListener('DOMContentLoaded', function () {

    const form = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const loginBtn = document.getElementById('loginBtn');
    const passwordToggle = document.getElementById('passwordToggle');
    const demoBtn = document.getElementById('demoBtn');

    // ===================================
    // Password Toggle
    // ===================================
    passwordToggle.addEventListener('click', function () {
        const type = passwordInput.type === 'password' ? 'text' : 'password';
        passwordInput.type = type;

        const icon = this.querySelector('i');
        icon.classList.toggle('fa-eye');
        icon.classList.toggle('fa-eye-slash');
    });

    // ===================================
    // Form Validation
    // ===================================
    function validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    // ===================================
    // Form Submission
    // ===================================
    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        const email = emailInput.value.trim();
        const password = passwordInput.value;
        const remember = document.getElementById('remember').checked;

        const emailError = document.getElementById('emailError');
        const passwordError = document.getElementById('passwordError');

        let hasError = false;

        // Validate email
        if (!email) {
            emailError.textContent = 'Email is required';
            hasError = true;
        } else if (!validateEmail(email)) {
            emailError.textContent = 'Please enter a valid email';
            hasError = true;
        } else {
            emailError.textContent = '';
        }

        // Validate password
        if (!password) {
            passwordError.textContent = 'Password is required';
            hasError = true;
        } else {
            passwordError.textContent = '';
        }

        if (hasError) return;

        // Show loading state
        loginBtn.classList.add('loading');
        loginBtn.disabled = true;

        try {
            // TODO: Replace with actual API call
            // const response = await fetch('/api/login', {
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify({ email, password, remember })
            // });

            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1500));

            // For now, redirect to main app
            window.location.href = '../admin.html';

        } catch (error) {
            console.error('Login error:', error);
            passwordError.textContent = 'Invalid email or password';
            loginBtn.classList.remove('loading');
            loginBtn.disabled = false;
        }
    });

    // ===================================
    // Demo Account
    // ===================================
    demoBtn.addEventListener('click', function () {
        // Auto-fill demo credentials
        emailInput.value = 'demo@mindwave.app';
        passwordInput.value = 'Demo123!';

        // Trigger login
        form.dispatchEvent(new Event('submit'));
    });

    // ===================================
    // Social Login Buttons
    // ===================================
    document.querySelectorAll('.btn-social').forEach(btn => {
        btn.addEventListener('click', function () {
            const provider = this.classList.contains('btn-google') ? 'Google' : 'Microsoft';
            alert(`${provider} login will be implemented with OAuth 2.0`);
            // TODO: Implement OAuth flow
        });
    });

    // ===================================
    // Enter key support
    // ===================================
    emailInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            passwordInput.focus();
        }
    });

});
