# LinkedIn & Facebook OAuth Setup Guide

Complete guide to set up LinkedIn and Facebook OAuth 2.0 for MindWave.

---

## 🔵 LinkedIn OAuth Setup

### Step 1: Create LinkedIn App

1. Go to [LinkedIn Developers](https://www.linkedin.com/developers/apps)
2. Click **"Create app"**
3. Fill in the app details:
   - **App name**: MindWave
   - **LinkedIn Page**: Select your company page (or create one)
   - **App logo**: Upload your MindWave logo (optional)
   - **Legal agreement**: Check the box to agree
4. Click **"Create app"**

### Step 2: Configure OAuth Settings

1. In your app dashboard, go to the **"Auth"** tab
2. Under **"OAuth 2.0 settings"**, find **"Redirect URLs"**
3. Click **"Add redirect URL"**
4. Add these URLs:
   ```
   http://localhost:5500/marketing-site/oauth-callback.html
   https://mindwave2.onrender.com/marketing-site/oauth-callback.html
   ```
5. Click **"Update"**

### Step 3: Request API Access

1. Go to the **"Products"** tab
2. Find **"Sign In with LinkedIn using OpenID Connect"**
3. Click **"Request access"**
4. Fill out the form and submit
5. **Note**: Approval is usually instant for Sign In with LinkedIn

### Step 4: Get Your Credentials

1. Go back to the **"Auth"** tab
2. Find **"Application credentials"** section
3. Copy your **Client ID** (looks like: `86abc12def345`)
4. **Important**: You don't need the Client Secret for PKCE flow

### Step 5: Verify Scopes

Make sure these scopes are enabled:
- ✅ `openid`
- ✅ `profile`
- ✅ `email`

---

## 📘 Facebook OAuth Setup

### Step 1: Create Facebook App

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Click **"My Apps"** → **"Create App"**
3. Select **"Consumer"** as the app type
4. Click **"Next"**
5. Fill in app details:
   - **App name**: MindWave
   - **App contact email**: Your email
   - **Business account**: (optional)
6. Click **"Create app"**

### Step 2: Add Facebook Login Product

1. In your app dashboard, find **"Add Products to Your App"**
2. Find **"Facebook Login"** and click **"Set Up"**
3. Select **"Web"** as the platform
4. Enter your site URL: `https://mindwave2.onrender.com`
5. Click **"Save"** and **"Continue"**

### Step 3: Configure OAuth Redirect URIs

1. In the left sidebar, go to **"Facebook Login"** → **"Settings"**
2. Under **"Valid OAuth Redirect URIs"**, add:
   ```
   http://localhost:5500/marketing-site/oauth-callback.html
   https://mindwave2.onrender.com/marketing-site/oauth-callback.html
   ```
3. Click **"Save Changes"**

### Step 4: Configure App Settings

1. Go to **"Settings"** → **"Basic"** in the left sidebar
2. Add **App Domains**:
   ```
   localhost
   mindwave2.onrender.com
   ```
3. Add **Privacy Policy URL**: (your privacy policy page)
4. Add **Terms of Service URL**: (your terms page)
5. Click **"Save Changes"**

### Step 5: Get Your App ID

1. Still in **"Settings"** → **"Basic"**
2. Copy your **App ID** (looks like: `1234567890123456`)
3. **Note**: You don't need the App Secret for client-side OAuth

### Step 6: Make App Live (Important!)

1. At the top of the page, you'll see a toggle that says **"In Development"**
2. Click the toggle to switch to **"Live"** mode
3. **Note**: You may need to complete additional steps:
   - Add a privacy policy URL
   - Add app icon
   - Select a category
4. Once all requirements are met, your app will go live

---

## 🔧 Update Your Code

Once you have both credentials, share them with me:

### LinkedIn Client ID Format:
```
86abc12def345
```

### Facebook App ID Format:
```
1234567890123456
```

I'll update the code in:
- `js/signup.js`
- `js/oauth-callback.js`

---

## 📝 Important Notes

### LinkedIn
- ✅ **Free** - No payment required
- ✅ **Instant approval** for Sign In with LinkedIn
- ✅ **Easy setup** - Usually takes 5-10 minutes
- ⚠️ Requires a LinkedIn Page (you can create a free one)

### Facebook
- ✅ **Free** - No payment required
- ✅ **No approval needed** for basic login
- ⚠️ Must switch app to **"Live"** mode
- ⚠️ Requires privacy policy and terms of service URLs
- ⚠️ May require business verification for advanced features

---

## 🧪 Testing

### Test Locally (Development Mode)

1. **LinkedIn**: Works immediately after setup
2. **Facebook**: Works in development mode with test users

### Test in Production

1. **LinkedIn**: Works immediately
2. **Facebook**: Must switch app to "Live" mode first

---

## 🔒 Security Best Practices

### LinkedIn
- ✅ Uses PKCE (no client secret needed)
- ✅ State parameter for CSRF protection
- ✅ Secure token exchange

### Facebook
- ✅ Uses PKCE (no app secret needed)
- ✅ State parameter for CSRF protection
- ✅ Secure token exchange

---

## 🐛 Common Issues

### LinkedIn Issues

**Issue**: "redirect_uri_mismatch"
- **Solution**: Make sure redirect URI in code exactly matches LinkedIn app settings
- Check for `http` vs `https`
- Check for trailing slashes

**Issue**: "invalid_client_id"
- **Solution**: Verify you copied the Client ID correctly
- Make sure you're using Client ID, not Client Secret

**Issue**: "unauthorized_scope_error"
- **Solution**: Make sure "Sign In with LinkedIn using OpenID Connect" product is approved

### Facebook Issues

**Issue**: "App Not Setup: This app is still in development mode"
- **Solution**: Switch app to "Live" mode in app settings

**Issue**: "URL Blocked: This redirect failed because the redirect URI is not whitelisted"
- **Solution**: Add redirect URI to "Valid OAuth Redirect URIs" in Facebook Login settings

**Issue**: "Can't Load URL: The domain of this URL isn't included in the app's domains"
- **Solution**: Add your domain to "App Domains" in Settings → Basic

---

## 📞 Need Help?

### LinkedIn Resources
- [LinkedIn OAuth Documentation](https://learn.microsoft.com/en-us/linkedin/shared/authentication/authentication)
- [LinkedIn Developer Portal](https://www.linkedin.com/developers/)

### Facebook Resources
- [Facebook Login Documentation](https://developers.facebook.com/docs/facebook-login/)
- [Facebook App Development](https://developers.facebook.com/docs/development)

---

## ✅ Quick Checklist

### LinkedIn Setup
- [ ] Create LinkedIn app
- [ ] Add redirect URIs
- [ ] Request "Sign In with LinkedIn" access
- [ ] Copy Client ID
- [ ] Share Client ID with me

### Facebook Setup
- [ ] Create Facebook app
- [ ] Add Facebook Login product
- [ ] Configure redirect URIs
- [ ] Add app domains
- [ ] Add privacy policy URL
- [ ] Copy App ID
- [ ] Switch app to "Live" mode
- [ ] Share App ID with me

---

## 🚀 Ready to Start?

Follow the steps above for both platforms, then share your credentials:

**Format:**
```
LinkedIn Client ID: [your-client-id]
Facebook App ID: [your-app-id]
```

I'll update the code immediately! 😊
