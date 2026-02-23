// ===================================
// Signup Page JavaScript
// Multi-step form with validation
// ===================================

document.addEventListener('DOMContentLoaded', function () {

    let currentStep = 1;
    const totalSteps = 3;

    // Form elements
    const form = document.getElementById('signupForm');
    const emailInput = document.getElementById('email');
    const fullNameInput = document.getElementById('fullName');
    const passwordInput = document.getElementById('password');
    const orgNameInput = document.getElementById('orgName');
    const orgSizeSelect = document.getElementById('orgSize');
    const roleSelect = document.getElementById('role');
    const termsCheckbox = document.getElementById('terms');

    // Buttons
    const emailNextBtn = document.getElementById('emailNextBtn');
    const passwordNextBtn = document.getElementById('passwordNextBtn');
    const backBtn = document.getElementById('backBtn');
    const backBtn2 = document.getElementById('backBtn2');
    const submitBtn = document.getElementById('submitBtn');
    const passwordToggle = document.getElementById('passwordToggle');

    // ===================================
    // Step Navigation
    // ===================================
    function showStep(step) {
        // Hide all steps
        document.querySelectorAll('.form-step').forEach(s => s.classList.remove('active'));

        // Show current step
        document.querySelector(`.form-step[data-step="${step}"]`).classList.add('active');

        // Update progress dots
        document.querySelectorAll('.progress-dots .dot').forEach((dot, index) => {
            if (index < step) {
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
            }
        });

        currentStep = step;
    }

    // ===================================
    // Email Validation
    // ===================================
    function validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    emailNextBtn.addEventListener('click', function () {
        const email = emailInput.value.trim();
        const errorEl = document.getElementById('emailError');

        if (!email) {
            errorEl.textContent = 'Email is required';
            emailInput.focus();
            return;
        }

        if (!validateEmail(email)) {
            errorEl.textContent = 'Please enter a valid email address';
            emailInput.focus();
            return;
        }

        errorEl.textContent = '';
        showStep(2);
        fullNameInput.focus();
    });

    // ===================================
    // Password Strength Checker
    // ===================================
    const requirements = {
        length: false,
        uppercase: false,
        number: false
    };

    passwordInput.addEventListener('input', function () {
        const password = this.value;

        // Check requirements
        requirements.length = password.length >= 8;
        requirements.uppercase = /[A-Z]/.test(password);
        requirements.number = /[0-9]/.test(password);

        // Update UI
        document.getElementById('req-length').classList.toggle('valid', requirements.length);
        document.getElementById('req-uppercase').classList.toggle('valid', requirements.uppercase);
        document.getElementById('req-number').classList.toggle('valid', requirements.number);

        // Calculate strength
        const strength = Object.values(requirements).filter(Boolean).length;
        const strengthFill = document.querySelector('.strength-fill');
        const strengthText = document.querySelector('.strength-text');

        strengthFill.className = 'strength-fill';
        strengthText.className = 'strength-text';

        if (strength === 1) {
            strengthFill.classList.add('weak');
            strengthText.classList.add('weak');
            strengthText.textContent = 'Weak password';
        } else if (strength === 2) {
            strengthFill.classList.add('medium');
            strengthText.classList.add('medium');
            strengthText.textContent = 'Medium password';
        } else if (strength === 3) {
            strengthFill.classList.add('strong');
            strengthText.classList.add('strong');
            strengthText.textContent = 'Strong password';
        } else {
            strengthText.textContent = '';
        }
    });

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
    // Password Validation
    // ===================================
    passwordNextBtn.addEventListener('click', function () {
        const name = fullNameInput.value.trim();
        const password = passwordInput.value;
        const nameError = document.getElementById('nameError');
        const passwordError = document.getElementById('passwordError');

        let hasError = false;

        // Validate name
        if (!name) {
            nameError.textContent = 'Full name is required';
            hasError = true;
        } else {
            nameError.textContent = '';
        }

        // Validate password
        if (!password) {
            passwordError.textContent = 'Password is required';
            hasError = true;
        } else if (!requirements.length || !requirements.uppercase || !requirements.number) {
            passwordError.textContent = 'Password must meet all requirements';
            hasError = true;
        } else {
            passwordError.textContent = '';
        }

        if (hasError) return;

        showStep(3);
        orgNameInput.focus();
    });

    // ===================================
    // Back Buttons
    // ===================================
    backBtn.addEventListener('click', () => showStep(1));
    backBtn2.addEventListener('click', () => showStep(2));

    // ===================================
    // Form Submission
    // ===================================
    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        // Validate final step
        const orgName = orgNameInput.value.trim();
        const orgSize = orgSizeSelect.value;
        const role = roleSelect.value;
        const terms = termsCheckbox.checked;

        let hasError = false;

        if (!orgName) {
            document.getElementById('orgNameError').textContent = 'Organization name is required';
            hasError = true;
        } else {
            document.getElementById('orgNameError').textContent = '';
        }

        if (!orgSize) {
            document.getElementById('orgSizeError').textContent = 'Please select organization size';
            hasError = true;
        } else {
            document.getElementById('orgSizeError').textContent = '';
        }

        if (!role) {
            document.getElementById('roleError').textContent = 'Please select your role';
            hasError = true;
        } else {
            document.getElementById('roleError').textContent = '';
        }

        if (!terms) {
            document.getElementById('termsError').textContent = 'You must accept the terms';
            hasError = true;
        } else {
            document.getElementById('termsError').textContent = '';
        }

        if (hasError) return;

        // Show loading state
        submitBtn.classList.add('loading');
        submitBtn.disabled = true;

        // Collect form data
        const formData = {
            email: emailInput.value.trim(),
            fullName: fullNameInput.value.trim(),
            password: passwordInput.value,
            orgName: orgNameInput.value.trim(),
            orgSize: orgSizeSelect.value,
            role: roleSelect.value,
            newsletter: document.getElementById('newsletter').checked
        };

        try {
            // TODO: Replace with actual API call
            // const response = await fetch('/api/signup', {
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify(formData)
            // });

            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Show success modal and redirect to organization setup
            if (typeof showSuccessModal === 'function') {
                showSuccessModal(
                    'Account Created Successfully!',
                    'Let\'s set up your organization workspace.'
                );

                // Redirect to organization setup after 2 seconds
                setTimeout(() => {
                    window.location.href = 'organization-setup.html';
                }, 2000);
            } else {
                alert('Account created successfully! Setting up your workspace...');
                window.location.href = 'organization-setup.html';
            }

        } catch (error) {
            console.error('Signup error:', error);
            alert('An error occurred. Please try again.');
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
        }
    });

    // ===================================
    // OAuth 2.0 Configuration
    // ===================================
    const OAUTH_CONFIG = {
        google: {
            clientId: '354642649256-dequ81au879v846gnukejhu6cacmbhrg.apps.googleusercontent.com',
            authEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
            scope: 'openid email profile',
            responseType: 'code',
            redirectUri: window.location.origin + '/marketing-site/oauth-callback.html'
        },
        linkedin: {
            clientId: '861kbeeryboggw',
            authEndpoint: 'https://www.linkedin.com/oauth/v2/authorization',
            scope: 'openid profile email',
            responseType: 'code',
            redirectUri: window.location.origin + '/marketing-site/oauth-callback.html'
        },
        facebook: {
            clientId: '1261081012497583',
            authEndpoint: 'https://www.facebook.com/v18.0/dialog/oauth',
            scope: 'email public_profile',
            responseType: 'code',
            redirectUri: window.location.origin + '/marketing-site/oauth-callback.html'
        }
    };

    // ===================================
    // OAuth Helper Functions
    // ===================================

    // Generate random state for CSRF protection
    function generateState() {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }

    // Generate code verifier for PKCE
    function generateCodeVerifier() {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return base64URLEncode(array);
    }

    // Generate code challenge from verifier
    async function generateCodeChallenge(verifier) {
        const encoder = new TextEncoder();
        const data = encoder.encode(verifier);
        const hash = await crypto.subtle.digest('SHA-256', data);
        return base64URLEncode(new Uint8Array(hash));
    }

    // Base64 URL encoding
    function base64URLEncode(buffer) {
        const base64 = btoa(String.fromCharCode(...buffer));
        return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    }

    // Store OAuth state in sessionStorage
    function storeOAuthState(provider, state, codeVerifier) {
        sessionStorage.setItem('oauth_state', state);
        sessionStorage.setItem('oauth_provider', provider);
        if (codeVerifier) {
            sessionStorage.setItem('oauth_code_verifier', codeVerifier);
        }
    }

    // ===================================
    // Google OAuth Login
    // ===================================
    async function initiateGoogleLogin() {
        const config = OAUTH_CONFIG.google;
        const state = generateState();
        const codeVerifier = generateCodeVerifier();
        const codeChallenge = await generateCodeChallenge(codeVerifier);

        // Store state and verifier for later verification
        storeOAuthState('google', state, codeVerifier);

        // Build authorization URL
        const params = new URLSearchParams({
            client_id: config.clientId,
            redirect_uri: config.redirectUri,
            response_type: config.responseType,
            scope: config.scope,
            state: state,
            code_challenge: codeChallenge,
            code_challenge_method: 'S256',
            access_type: 'offline',
            prompt: 'consent'
        });

        // Redirect to Google OAuth
        window.location.href = `${config.authEndpoint}?${params.toString()}`;
    }

    // ===================================
    // LinkedIn OAuth Login
    // ===================================
    async function initiateLinkedInLogin() {
        const config = OAUTH_CONFIG.linkedin;
        const state = generateState();
        const codeVerifier = generateCodeVerifier();
        const codeChallenge = await generateCodeChallenge(codeVerifier);

        // Store state and verifier for later verification
        storeOAuthState('linkedin', state, codeVerifier);

        // Build authorization URL
        const params = new URLSearchParams({
            client_id: config.clientId,
            redirect_uri: config.redirectUri,
            response_type: config.responseType,
            scope: config.scope,
            state: state,
            code_challenge: codeChallenge,
            code_challenge_method: 'S256'
        });

        // Redirect to LinkedIn OAuth
        window.location.href = `${config.authEndpoint}?${params.toString()}`;
    }

    // ===================================
    // Facebook OAuth Login
    // ===================================
    async function initiateFacebookLogin() {
        const config = OAUTH_CONFIG.facebook;
        const state = generateState();

        // Store state for CSRF protection (Facebook doesn't use PKCE)
        sessionStorage.setItem('oauth_state', state);
        sessionStorage.setItem('oauth_provider', 'facebook');

        // Build authorization URL (no PKCE for Facebook)
        const params = new URLSearchParams({
            client_id: config.clientId,
            redirect_uri: config.redirectUri,
            response_type: config.responseType,
            scope: config.scope,
            state: state
        });

        // Redirect to Facebook OAuth
        window.location.href = `${config.authEndpoint}?${params.toString()}`;
    }

    // ===================================
    // Social Login Buttons
    // ===================================
    const googleBtn = document.querySelector('.btn-google');

    if (googleBtn) {
        googleBtn.addEventListener('click', async function () {
            try {
                await initiateGoogleLogin();
            } catch (error) {
                console.error('Google login error:', error);
                alert('Failed to initiate Google login. Please try again.');
            }
        });
    }

});
