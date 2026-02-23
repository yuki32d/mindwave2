# OAuth 2.0 Setup Guide for MindWave

This guide will help you configure Google and Microsoft OAuth 2.0 authentication for the MindWave application.

## Overview

The OAuth implementation includes:
- **PKCE (Proof Key for Code Exchange)** for enhanced security
- **State parameter** for CSRF protection
- **Secure token exchange** flow
- **User profile retrieval** from OAuth providers

---

## 🔵 Google OAuth Setup

### Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **"Create Project"** or select an existing project
3. Give your project a name (e.g., "MindWave Auth")

### Step 2: Enable Google+ API

1. In the left sidebar, go to **APIs & Services > Library**
2. Search for **"Google+ API"** or **"Google Identity"**
3. Click **Enable**

### Step 3: Create OAuth 2.0 Credentials

1. Go to **APIs & Services > Credentials**
2. Click **"Create Credentials" > "OAuth client ID"**
3. If prompted, configure the OAuth consent screen:
   - User Type: **External** (for testing) or **Internal** (for organization)
   - App name: **MindWave**
   - User support email: Your email
   - Developer contact: Your email
   - Add scopes: `email`, `profile`, `openid`
   - Add test users if using External type

4. Create OAuth Client ID:
   - Application type: **Web application**
   - Name: **MindWave Web Client**
   - Authorized JavaScript origins:
     - `http://localhost:5500` (for local testing)
     - `http://127.0.0.1:5500`
     - Your production domain (e.g., `https://mindwave2.onrender.com`)
   - Authorized redirect URIs:
     - `http://localhost:5500/marketing-site/oauth-callback.html`
     - `http://127.0.0.1:5500/marketing-site/oauth-callback.html`
     - `https://mindwave2.onrender.com/marketing-site/oauth-callback.html`

5. Click **Create**
6. Copy your **Client ID** (looks like: `123456789-abc123.apps.googleusercontent.com`)

### Step 4: Update Your Code

In `marketing-site/js/signup.js`, replace:
```javascript
clientId: 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com',
```

With your actual Client ID:
```javascript
clientId: '123456789-abc123.apps.googleusercontent.com',
```

Also update in `marketing-site/js/oauth-callback.js` at line 64.

---

## 🔷 Microsoft OAuth Setup

### Step 1: Register an Application

1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to **Azure Active Directory > App registrations**
3. Click **"New registration"**

### Step 2: Configure Application

1. **Name**: MindWave
2. **Supported account types**: 
   - Select **"Accounts in any organizational directory and personal Microsoft accounts"**
3. **Redirect URI**:
   - Platform: **Web**
   - URI: `http://localhost:5500/marketing-site/oauth-callback.html`
4. Click **Register**

### Step 3: Add Additional Redirect URIs

1. In your app registration, go to **Authentication**
2. Under **Web > Redirect URIs**, click **"Add URI"**
3. Add:
   - `http://127.0.0.1:5500/marketing-site/oauth-callback.html`
   - `https://mindwave2.onrender.com/marketing-site/oauth-callback.html` (your production URL)
4. Under **Implicit grant and hybrid flows**, enable:
   - ✅ **ID tokens**
5. Click **Save**

### Step 4: Configure API Permissions

1. Go to **API permissions**
2. Click **"Add a permission"**
3. Select **Microsoft Graph**
4. Choose **Delegated permissions**
5. Add these permissions:
   - `openid`
   - `email`
   - `profile`
   - `User.Read`
6. Click **Add permissions**
7. (Optional) Click **"Grant admin consent"** if you have admin rights

### Step 5: Get Your Client ID

1. Go to **Overview** in your app registration
2. Copy the **Application (client) ID** (looks like: `12345678-1234-1234-1234-123456789abc`)

### Step 6: Update Your Code

In `marketing-site/js/signup.js`, replace:
```javascript
clientId: 'YOUR_MICROSOFT_CLIENT_ID',
```

With your actual Client ID:
```javascript
clientId: '12345678-1234-1234-1234-123456789abc',
```

Also update in `marketing-site/js/oauth-callback.js` at line 69.

---

## 🧪 Testing Locally

### 1. Start a Local Server

You need to run a local web server (OAuth doesn't work with `file://` protocol):

**Using Python:**
```bash
# Python 3
python -m http.server 5500

# Python 2
python -m SimpleHTTPServer 5500
```

**Using Node.js:**
```bash
npx http-server -p 5500
```

**Using VS Code:**
- Install "Live Server" extension
- Right-click on `website-signup.html` > "Open with Live Server"

### 2. Access Your Application

Open your browser and navigate to:
```
http://localhost:5500/marketing-site/website-signup.html
```

### 3. Test OAuth Flow

1. Click **"Continue with Google"** or **"Continue with Microsoft"**
2. You should be redirected to the OAuth provider
3. Sign in and grant permissions
4. You'll be redirected back to `oauth-callback.html`
5. The callback page will process the authentication

---

## 🔒 Security Best Practices

### Current Implementation Includes:

✅ **PKCE (Proof Key for Code Exchange)**
- Protects against authorization code interception attacks
- Uses SHA-256 hashing for code challenge

✅ **State Parameter**
- Prevents CSRF attacks
- Verified on callback

✅ **Secure Token Storage**
- Uses sessionStorage for temporary OAuth state
- Uses localStorage for auth tokens (consider httpOnly cookies for production)

### Additional Recommendations for Production:

1. **Never expose client secrets in frontend code**
   - The current implementation uses PKCE, which doesn't require a client secret
   - This is the recommended approach for Single Page Applications (SPAs)

2. **Use HTTPS in production**
   - OAuth providers require HTTPS for production redirect URIs
   - Update all redirect URIs to use `https://`

3. **Implement backend token validation**
   - Don't trust tokens from the frontend alone
   - Validate tokens on your backend server
   - Store sensitive data server-side

4. **Set up proper CORS**
   - Configure your backend to accept requests only from your domain

5. **Token refresh strategy**
   - Implement automatic token refresh using refresh tokens
   - Handle token expiration gracefully

---

## 🔧 Backend Integration

The current implementation expects a backend API endpoint at `/api/auth/oauth-login`.

### Example Backend Endpoint (Node.js/Express):

```javascript
app.post('/api/auth/oauth-login', async (req, res) => {
    const { provider, userInfo, accessToken } = req.body;

    try {
        // Verify the access token with the OAuth provider
        // (Important: Don't trust the frontend data alone)
        
        // Check if user exists in database
        let user = await User.findOne({ email: userInfo.email });
        
        if (!user) {
            // Create new user
            user = await User.create({
                email: userInfo.email,
                name: userInfo.name,
                authProvider: provider,
                providerId: userInfo.id,
                profilePicture: userInfo.picture
            });
        }
        
        // Generate JWT token
        const token = jwt.sign(
            { userId: user._id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        res.json({
            success: true,
            token: token,
            user: {
                id: user._id,
                email: user.email,
                name: user.name
            }
        });
        
    } catch (error) {
        console.error('OAuth login error:', error);
        res.status(500).json({
            success: false,
            message: 'Authentication failed'
        });
    }
});
```

---

## 📝 File Structure

```
mindwave/
└── marketing-site/
    ├── website-signup.html          # Signup page with OAuth buttons
    ├── oauth-callback.html          # OAuth callback page
    └── js/
        ├── signup.js                # OAuth initiation logic
        └── oauth-callback.js        # OAuth callback handler
```

---

## 🐛 Troubleshooting

### "redirect_uri_mismatch" Error
- Ensure the redirect URI in your code exactly matches the one registered in Google/Microsoft console
- Check for trailing slashes, http vs https, localhost vs 127.0.0.1

### "invalid_client" Error
- Verify your Client ID is correct
- Make sure you're using the Client ID, not the Client Secret

### "State verification failed"
- Clear your browser's sessionStorage
- Try the OAuth flow again
- This can happen if you refresh during the OAuth process

### CORS Errors
- Make sure you're running a local server, not opening files directly
- Check that your origins are properly configured in OAuth console

### Callback Page Shows Error
- Open browser console to see detailed error messages
- Check network tab for failed API requests
- Verify your backend endpoint is accessible

---

## 🚀 Deployment Checklist

Before deploying to production:

- [ ] Replace all `localhost` URLs with your production domain
- [ ] Update OAuth redirect URIs in Google Cloud Console
- [ ] Update OAuth redirect URIs in Azure Portal
- [ ] Ensure your production site uses HTTPS
- [ ] Implement backend token validation
- [ ] Set up proper error logging
- [ ] Test OAuth flow on production environment
- [ ] Configure rate limiting on backend
- [ ] Set up monitoring for OAuth failures

---

## 📚 Additional Resources

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Microsoft Identity Platform Documentation](https://docs.microsoft.com/en-us/azure/active-directory/develop/)
- [OAuth 2.0 PKCE RFC](https://tools.ietf.org/html/rfc7636)
- [OAuth 2.0 Security Best Practices](https://tools.ietf.org/html/draft-ietf-oauth-security-topics)

---

## ✅ Quick Start Summary

1. **Google**: Get Client ID from [Google Cloud Console](https://console.cloud.google.com/)
2. **Microsoft**: Get Client ID from [Azure Portal](https://portal.azure.com/)
3. Update Client IDs in `signup.js` and `oauth-callback.js`
4. Add redirect URIs to both OAuth providers
5. Start local server: `python -m http.server 5500`
6. Test at: `http://localhost:5500/marketing-site/website-signup.html`

---

**Need Help?** Check the browser console for detailed error messages and refer to the troubleshooting section above.
