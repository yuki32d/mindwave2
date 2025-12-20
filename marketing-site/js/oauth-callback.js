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

    // Prepare token request
    const tokenParams = new URLSearchParams({
        client_id: providerConfig.clientId,
        code: code,
        code_verifier: codeVerifier,
        grant_type: 'authorization_code',
        redirect_uri: providerConfig.redirectUri
    });

    try {
        // Exchange code for token
        const response = await fetch(providerConfig.tokenEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: tokenParams.toString()
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error_description || 'Token exchange failed');
        }

        const tokenData = await response.json();

        // Get user info
        const userInfo = await getUserInfo(provider, tokenData.access_token);

        // Send to backend for account creation/login
        await processUserLogin(provider, userInfo, tokenData);

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
                expiresIn: tokenData.expires_in
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

function showSuccess(provider, userName) {
    const providerName = provider.charAt(0).toUpperCase() + provider.slice(1);

    document.querySelector('.callback-icon').innerHTML = '<i class="fas fa-check-circle"></i>';
    document.querySelector('.callback-title').textContent = 'Success!';
    document.querySelector('.callback-message').textContent = `Welcome, ${userName}! Redirecting you to your dashboard...`;
    document.querySelector('.spinner').style.display = 'none';

    // Redirect to dashboard after 2 seconds
    setTimeout(() => {
        // TODO: Update this to your actual dashboard URL
        window.location.href = '../faculty-classroom.html';
    }, 2000);
}
