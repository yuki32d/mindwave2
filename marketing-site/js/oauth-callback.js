// ===================================
// OAuth Callback Handler
// Processes OAuth responses from Google, LinkedIn, and Facebook
// ===================================

document.addEventListener('DOMContentLoaded', async function () {

    // Parse URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const error = urlParams.get('error');
    const errorDescription = urlParams.get('error_description');

    // Check for errors from OAuth provider
    if (error) {
        showError('Authentication Failed', errorDescription || error);
        return;
    }

    // Verify we have required parameters
    if (!code || !state) {
        showError('Invalid Response', 'Missing required authentication parameters.');
        return;
    }

    // Verify state matches (CSRF protection)
    const storedState = sessionStorage.getItem('oauth_state');
    if (state !== storedState) {
        showError('Security Error', 'State verification failed. Please try again.');
        return;
    }

    // Get stored OAuth data
    const provider = sessionStorage.getItem('oauth_provider');
    const codeVerifier = sessionStorage.getItem('oauth_code_verifier');

    if (!provider || !codeVerifier) {
        showError('Session Error', 'OAuth session data not found. Please try again.');
        return;
    }

    // Process the authorization code
    try {
        await exchangeCodeForToken(provider, code, codeVerifier);
    } catch (err) {
        console.error('OAuth error:', err);
        showError('Authentication Error', err.message || 'Failed to complete authentication.');
    }
});

// ===================================
// Exchange Authorization Code for Token
// ===================================
async function exchangeCodeForToken(provider, code, codeVerifier) {
    const config = {
        google: {
            tokenEndpoint: 'https://oauth2.googleapis.com/token',
            clientId: '354642649256-dequ81au879v846gnukejhu6cacmbhrg.apps.googleusercontent.com',
            redirectUri: window.location.origin + '/marketing-site/oauth-callback.html'
        },
        linkedin: {
            tokenEndpoint: 'https://www.linkedin.com/oauth/v2/accessToken',
            clientId: '861kbeeryboggw',
            redirectUri: window.location.origin + '/marketing-site/oauth-callback.html'
        },
        facebook: {
            tokenEndpoint: 'https://graph.facebook.com/v18.0/oauth/access_token',
            clientId: '1261081012497583',
            redirectUri: window.location.origin + '/marketing-site/oauth-callback.html'
        }
    };

    const providerConfig = config[provider];

    try {
        // All providers now use backend token exchange
        const response = await fetch('/api/auth/oauth/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                provider: provider,
                code: code,
                codeVerifier: codeVerifier || null, // Facebook doesn't use PKCE
                redirectUri: providerConfig.redirectUri
            })
        });


        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `${provider} authentication failed`);
        }

        const result = await response.json();

        // Store authentication token and user data
        if (result.token) {
            localStorage.setItem('auth_token', result.token);
            localStorage.setItem('user_email', result.user.email);
            localStorage.setItem('user_name', result.user.name);

            // Store user object with organization data if exists
            const userData = {
                email: result.user.email,
                name: result.user.name,
                token: result.token
            };

            // If user has organization, store it
            if (result.user.organizationId) {
                userData.organizationId = result.user.organizationId;
                userData.orgRole = result.user.orgRole || 'member';
                userData.userType = result.user.userType || 'organization';
                localStorage.setItem('organization_id', result.user.organizationId);
            }

            localStorage.setItem('user', JSON.stringify(userData));
        }

        // Clear OAuth session data
        sessionStorage.removeItem('oauth_state');
        sessionStorage.removeItem('oauth_provider');
        sessionStorage.removeItem('oauth_code_verifier');

        // Redirect based on organization status
        showSuccess(provider, result.user);

    } catch (error) {
        throw new Error(`Failed to exchange authorization code: ${error.message}`);
    }
}

// ===================================
// Get User Information
// ===================================
async function getUserInfo(provider, accessToken) {
    const endpoints = {
        google: 'https://www.googleapis.com/oauth2/v2/userinfo',
        linkedin: 'https://api.linkedin.com/v2/userinfo',
        facebook: 'https://graph.facebook.com/me?fields=id,name,email,picture'
    };

    try {
        const response = await fetch(endpoints[provider], {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch user information');
        }

        const userInfo = await response.json();

        // Normalize user data structure based on provider
        if (provider === 'linkedin') {
            return {
                id: userInfo.sub,
                email: userInfo.email,
                name: userInfo.name,
                picture: userInfo.picture,
                provider: provider
            };
        } else if (provider === 'facebook') {
            return {
                id: userInfo.id,
                email: userInfo.email,
                name: userInfo.name,
                picture: userInfo.picture?.data?.url,
                provider: provider
            };
        } else {
            // Google
            return {
                id: userInfo.id || userInfo.sub,
                email: userInfo.email,
                name: userInfo.name,
                picture: userInfo.picture,
                provider: provider
            };
        }

    } catch (error) {
        throw new Error(`Failed to get user info: ${error.message}`);
    }
}

// ===================================
// Process User Login/Registration
// ===================================
async function processUserLogin(provider, userInfo, tokenData) {
    try {
        // TODO: Replace with your actual backend API endpoint
        const response = await fetch('/api/auth/oauth-login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                provider: provider,
                userInfo: userInfo,
                accessToken: tokenData.access_token,
                refreshToken: tokenData.refresh_token,
                expiresIn: tokenData.expires_in,
                // Include organization setup data if available
                orgRole: localStorage.getItem('org_role') || 'student',
                organizationId: localStorage.getItem('organization_id') || null
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Login failed');
        }

        const result = await response.json();

        // Store authentication token
        if (result.token) {
            localStorage.setItem('auth_token', result.token);
            localStorage.setItem('user_email', userInfo.email);
            localStorage.setItem('user_name', userInfo.name);
        }

        // Clear OAuth session data
        sessionStorage.removeItem('oauth_state');
        sessionStorage.removeItem('oauth_provider');
        sessionStorage.removeItem('oauth_code_verifier');

        // Show success and redirect
        showSuccess(provider, userInfo.name);

    } catch (error) {
        // For demo purposes, simulate successful login
        console.warn('Backend not available, simulating login:', error);

        // Store user data locally (for demo)
        localStorage.setItem('user_email', userInfo.email);
        localStorage.setItem('user_name', userInfo.name);
        localStorage.setItem('auth_provider', provider);

        // Clear OAuth session data
        sessionStorage.removeItem('oauth_state');
        sessionStorage.removeItem('oauth_provider');
        sessionStorage.removeItem('oauth_code_verifier');

        // Show success and redirect
        showSuccess(provider, userInfo.name);
    }
}

// ===================================
// UI Helper Functions
// ===================================
function showError(title, message) {
    const container = document.getElementById('errorContainer');
    container.innerHTML = `
        <div class="error-card">
            <div class="error-title">
                <i class="fas fa-exclamation-circle"></i> ${title}
            </div>
            <div class="error-message">${message}</div>
            <button class="btn-retry" onclick="window.location.href='website-signup.html'">
                <i class="fas fa-redo"></i> Try Again
            </button>
        </div>
    `;
    container.style.display = 'block';

    // Hide spinner
    document.querySelector('.spinner').style.display = 'none';
    document.querySelector('.callback-message').style.display = 'none';
}

async function showSuccess(provider, user) {
    const userName = user.name || user;

    console.log('OAuth Success - User data:', user);
    console.log('organizationId:', user.organizationId);

    document.querySelector('.callback-icon').innerHTML = '<i class="fas fa-check-circle"></i>';
    document.querySelector('.callback-title').textContent = 'Success!';
    document.querySelector('.spinner').style.display = 'none';

    // Check if user has an organization in the backend
    if (user.organizationId) {
        // Returning user with organization - go to dashboard
        console.log('Returning user with organization - redirecting to dashboard');
        document.querySelector('.callback-message').textContent = `Welcome back, ${userName}!`;

        // Save organization info to localStorage
        localStorage.setItem('organization_id', user.organizationId);

        setTimeout(() => {
            window.location.href = '/marketing-site/modern-dashboard.html';
        }, 1500);
    } else {
        // New user or deleted user - go to setup
        console.log('New/deleted user - redirecting to organization setup');
        document.querySelector('.callback-message').textContent = `Welcome, ${userName}! Setting up your workspace...`;

        // Clear any old organization data
        localStorage.removeItem('organization_id');
        localStorage.removeItem('organization_name');
        localStorage.removeItem('organization_type');
        localStorage.removeItem('orgRole');

        setTimeout(() => {
            window.location.href = '/marketing-site/organization-setup.html';
        }, 1500);
    }
}
