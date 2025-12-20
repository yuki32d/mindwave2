# OAuth Client Secrets - Quick Setup Guide

## 🔐 You Need These 3 Secrets

All OAuth providers now require client secrets for server-side token exchange. Here's how to get them:

---

## 1️⃣ Google Client Secret

### Get the Secret:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Go to **APIs & Services** → **Credentials**
4. Find your OAuth 2.0 Client ID (the one with ID: `354642649256-dequ81au879v846gnukejhu6cacmbhrg`)
5. Click on it
6. Copy the **Client Secret** (it's right below Client ID)

### Add to `.env`:
```env
GOOGLE_CLIENT_SECRET=your_google_secret_here
```

---

## 2️⃣ LinkedIn Client Secret

### Get the Secret:
1. Go to [LinkedIn Developers](https://www.linkedin.com/developers/apps)
2. Click on your **MindWave** app
3. Go to **"Auth"** tab
4. Under **"Application credentials"**, click **"Show"** next to Client Secret
5. Copy the secret

### Add to `.env`:
```env
LINKEDIN_CLIENT_SECRET=your_linkedin_secret_here
```

---

## 3️⃣ Facebook App Secret (Optional)

Facebook works with just the App ID for now, but if you need the secret:

### Get the Secret:
1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Go to **"My Apps"** → Select your app
3. Go to **Settings** → **Basic**
4. Click **"Show"** next to App Secret
5. Copy the secret

---

## 📝 Your `.env` File Should Have:

```env
# Google OAuth
GOOGLE_CLIENT_SECRET=your_google_secret_here

# LinkedIn OAuth
LINKEDIN_CLIENT_ID=861kbeeryboggw
LINKEDIN_CLIENT_SECRET=your_linkedin_secret_here

# Facebook OAuth (App ID already in code)
# FACEBOOK_APP_SECRET=your_facebook_secret_here (optional)
```

---

## 🚀 Add to Render Environment

Once you have all secrets, add them to Render:

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Select your **MindWave** service
3. Go to **"Environment"** tab
4. Add these variables:

```
GOOGLE_CLIENT_SECRET = [your Google secret]
LINKEDIN_CLIENT_ID = 861kbeeryboggw
LINKEDIN_CLIENT_SECRET = [your LinkedIn secret]
```

5. Click **"Save Changes"**
6. Wait for redeploy (1-2 minutes)

---

## ✅ Test After Adding Secrets

Once all secrets are added to Render:
1. Visit your signup page
2. Try all three OAuth buttons:
   - ✅ Continue with Google
   - ✅ Continue with LinkedIn  
   - ✅ Continue with Facebook

All should work perfectly! 🎉

---

## 🐛 Still Having Issues?

### Error: "OAuth not configured on server"
- **Fix**: Make sure you added the secret to Render environment variables

### Error: "Invalid client secret"
- **Fix**: Double-check you copied the correct secret

### Error: "client_secret is missing"
- **Fix**: The secret isn't in Render yet - add it and redeploy

---

**Once you add all secrets to Render, your OAuth will be 100% functional!** 🚀
