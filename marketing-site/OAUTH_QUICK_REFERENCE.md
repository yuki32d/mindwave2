# OAuth 2.0 Quick Reference

## 📋 Implementation Checklist

### Files Created
- ✅ `marketing-site/js/signup.js` - Updated with OAuth initiation
- ✅ `marketing-site/oauth-callback.html` - OAuth callback page
- ✅ `marketing-site/js/oauth-callback.js` - Callback handler
- ✅ `marketing-site/OAUTH_SETUP_GUIDE.md` - Complete setup guide
- ✅ `marketing-site/backend-example/oauth-api.js` - Backend example

### Required Configuration

#### 1. Update Client IDs (Required)

**File: `marketing-site/js/signup.js`** (Line 281)
```javascript
google: {
    clientId: 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com',
    // Replace with your actual Google Client ID
}
```

**File: `marketing-site/js/signup.js`** (Line 288)
```javascript
microsoft: {
    clientId: 'YOUR_MICROSOFT_CLIENT_ID',
    // Replace with your actual Microsoft Client ID
}
```

**File: `marketing-site/js/oauth-callback.js`** (Lines 64 & 69)
```javascript
google: {
    clientId: 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com',
}
microsoft: {
    clientId: 'YOUR_MICROSOFT_CLIENT_ID',
}
```

#### 2. Get OAuth Credentials

**Google:**
1. Visit: https://console.cloud.google.com/
2. Create project → Enable Google+ API → Create OAuth Client ID
3. Add redirect URI: `http://localhost:5500/marketing-site/oauth-callback.html`
4. Copy Client ID

**Microsoft:**
1. Visit: https://portal.azure.com/
2. Azure AD → App registrations → New registration
3. Add redirect URI: `http://localhost:5500/marketing-site/oauth-callback.html`
4. Copy Application (client) ID

#### 3. Test Locally

```bash
# Start local server
python -m http.server 5500

# Or use Node.js
npx http-server -p 5500

# Or use VS Code Live Server extension
```

Visit: `http://localhost:5500/marketing-site/website-signup.html`

---

## 🔄 OAuth Flow Diagram

```
User clicks "Continue with Google/Microsoft"
    ↓
signup.js generates state & code_verifier
    ↓
User redirected to OAuth provider (Google/Microsoft)
    ↓
User signs in and grants permissions
    ↓
Provider redirects to oauth-callback.html with code & state
    ↓
oauth-callback.js verifies state
    ↓
Exchanges code for access token (using code_verifier)
    ↓
Fetches user info from provider
    ↓
Sends to backend /api/auth/oauth-login
    ↓
Backend creates/updates user & returns JWT
    ↓
Redirects to dashboard
```

---

## 🔑 Key Security Features

| Feature | Purpose | Implementation |
|---------|---------|----------------|
| **PKCE** | Prevents authorization code interception | `generateCodeVerifier()` + `generateCodeChallenge()` |
| **State** | CSRF protection | `generateState()` + verification in callback |
| **Token Verification** | Ensures token authenticity | Backend verifies with OAuth provider |
| **Secure Storage** | Protects sensitive data | sessionStorage for OAuth state, localStorage for tokens |

---

## 🛠️ Customization Points

### Change Redirect After Login
**File:** `oauth-callback.js` (Line 233)
```javascript
window.location.href = '../faculty-classroom.html';
// Change to your desired dashboard URL
```

### Update Scopes
**File:** `signup.js`
```javascript
google: {
    scope: 'openid email profile', // Add more scopes if needed
}
microsoft: {
    scope: 'openid email profile User.Read', // Add more scopes
}
```

### Backend API Endpoint
**File:** `oauth-callback.js` (Line 156)
```javascript
const response = await fetch('/api/auth/oauth-login', {
    // Update to your actual backend URL
});
```

---

## 🐛 Common Issues & Solutions

### Issue: "redirect_uri_mismatch"
**Solution:** Ensure redirect URI in code matches exactly with OAuth console
- Check: `http` vs `https`
- Check: `localhost` vs `127.0.0.1`
- Check: Trailing slashes
- Check: Port numbers

### Issue: "invalid_client"
**Solution:** Verify Client ID is correct
- Don't use Client Secret (not needed for PKCE flow)
- Copy Client ID exactly as shown in console

### Issue: "State verification failed"
**Solution:** Clear sessionStorage and try again
```javascript
sessionStorage.clear();
```

### Issue: CORS errors
**Solution:** 
- Use a local server (not `file://`)
- Configure CORS on backend
- Add your domain to allowed origins in OAuth console

---

## 📱 Testing Checklist

- [ ] Google login redirects to Google sign-in
- [ ] Microsoft login redirects to Microsoft sign-in
- [ ] After sign-in, redirects back to callback page
- [ ] Callback page shows "Authenticating..." spinner
- [ ] User info is retrieved successfully
- [ ] Redirects to dashboard after success
- [ ] Error messages display for failures
- [ ] State verification works
- [ ] Token exchange completes

---

## 🚀 Production Deployment

### Before Going Live:

1. **Update all redirect URIs to production domain**
   ```javascript
   redirectUri: 'https://yourdomain.com/marketing-site/oauth-callback.html'
   ```

2. **Add production URIs to OAuth consoles**
   - Google Cloud Console
   - Azure Portal

3. **Enable HTTPS** (required by OAuth providers)

4. **Set up backend API**
   - Deploy backend server
   - Update API endpoint in `oauth-callback.js`
   - Configure environment variables

5. **Test on production**
   - Test Google login
   - Test Microsoft login
   - Verify user creation
   - Check error handling

---

## 📞 Support Resources

- **Setup Guide:** `OAUTH_SETUP_GUIDE.md`
- **Backend Example:** `backend-example/oauth-api.js`
- **Google Docs:** https://developers.google.com/identity/protocols/oauth2
- **Microsoft Docs:** https://docs.microsoft.com/en-us/azure/active-directory/develop/

---

## 💡 Quick Tips

1. **Always test locally first** before deploying
2. **Keep Client IDs in environment variables** for production
3. **Never commit secrets** to version control
4. **Use HTTPS in production** (OAuth requirement)
5. **Implement proper error logging** for debugging
6. **Monitor OAuth failures** to catch issues early
7. **Keep refresh tokens secure** (encrypt in database)
8. **Implement token rotation** for better security

---

**Last Updated:** 2024-12-20
**Version:** 1.0
