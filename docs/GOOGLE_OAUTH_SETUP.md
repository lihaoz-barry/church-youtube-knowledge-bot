# Google OAuth Setup Guide

## Overview

Google OAuth requires configuring **two separate settings** in Google Cloud Console to work correctly.

## Step-by-Step Setup

### Step 1: Go to Google Cloud Console

1. Visit: https://console.cloud.google.com/
2. Select your project (or create new one)
3. Go to: **APIs & Services** → **Credentials**

### Step 2: Create OAuth 2.0 Client ID

1. Click **"Create Credentials"** → **"OAuth client ID"**
2. Choose Application type: **"Web application"**
3. Give it a name: `Church YouTube Knowledge Bot`

### Step 3: Configure Authorized JavaScript Origins

**What it is:** The base URL where your app runs (NO path)

**Add these URLs:**

```
http://localhost:3000
https://church-youtube-knowledge-bot-git-staging-[your-team].vercel.app
```

*(Add production URL later when you have a custom domain)*

**Examples:**
- ✅ Correct: `http://localhost:3000`
- ✅ Correct: `https://my-app.vercel.app`
- ❌ Wrong: `http://localhost:3000/auth/callback` (no path!)
- ❌ Wrong: `https://my-app.vercel.app/` (no trailing slash!)

### Step 4: Configure Authorized Redirect URIs

**What it is:** The FULL URL where Google redirects after sign-in (WITH path)

**Add these URLs:**

```
http://localhost:3000/auth/callback
https://church-youtube-knowledge-bot-git-staging-[your-team].vercel.app/auth/callback
```

*(Add production URL later when you have a custom domain)*

**Examples:**
- ✅ Correct: `http://localhost:3000/auth/callback`
- ✅ Correct: `https://my-app.vercel.app/auth/callback`
- ❌ Wrong: `http://localhost:3000` (needs path!)
- ❌ Wrong: `https://my-app.vercel.app/auth/callback/` (no trailing slash!)

### Step 5: Save Configuration

1. Click **"Create"** or **"Save"**
2. Copy the **Client ID** and **Client Secret**
3. Add them to your `.env.local`:

```env
GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret-here
```

### Step 6: Get Your Staging URL

After merging to `staging` branch:

1. Go to Vercel Dashboard → Your Project → Deployments
2. Find the deployment from `staging` branch
3. The URL will be: `church-youtube-knowledge-bot-git-staging-[team].vercel.app`
4. Update Google OAuth config with this URL

## Visual Reference

```
┌─────────────────────────────────────────────────────┐
│  Google Cloud Console - OAuth 2.0 Client ID         │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Authorized JavaScript origins                      │
│  ┌───────────────────────────────────────────────┐ │
│  │ http://localhost:3000                         │ │
│  │ https://your-app-git-staging-xxx.vercel.app   │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  Authorized redirect URIs                           │
│  ┌───────────────────────────────────────────────┐ │
│  │ http://localhost:3000/auth/callback           │ │
│  │ https://your-app-git-staging-xxx.vercel.app/  │ │
│  │          auth/callback                         │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  [ Save ]                                           │
└─────────────────────────────────────────────────────┘
```

## Complete Configuration Example

### For Local Development + Staging

**Authorized JavaScript origins:**
```
http://localhost:3000
https://church-youtube-knowledge-bot-git-staging-lihaoz-barry.vercel.app
```

**Authorized redirect URIs:**
```
http://localhost:3000/auth/callback
https://church-youtube-knowledge-bot-git-staging-lihaoz-barry.vercel.app/auth/callback
```

### Later: Add Production URLs

When you deploy to production with a custom domain:

**Authorized JavaScript origins:**
```
http://localhost:3000
https://church-youtube-knowledge-bot-git-staging-lihaoz-barry.vercel.app
https://app.yourchurch.com
```

**Authorized redirect URIs:**
```
http://localhost:3000/auth/callback
https://church-youtube-knowledge-bot-git-staging-lihaoz-barry.vercel.app/auth/callback
https://app.yourchurch.com/auth/callback
```

## Testing OAuth Flow

### Test Locally (http://localhost:3000)

1. Run dev server: `npm run dev`
2. Go to: http://localhost:3000/login
3. Click "Sign in with Google"
4. Should redirect to Google
5. After signing in, should redirect back to http://localhost:3000/auth/callback
6. Should see your homepage with user logged in

### Test on Staging (https://...-git-staging-....vercel.app)

1. Merge PR #1 to deploy to staging
2. Go to staging URL: https://your-app-git-staging-xxx.vercel.app/login
3. Click "Sign in with Google"
4. Should redirect to Google
5. After signing in, should redirect back to https://your-app-git-staging-xxx.vercel.app/auth/callback
6. Should see homepage with user logged in

## Common Issues & Fixes

### Error: "redirect_uri_mismatch"

**Problem:** The redirect URI doesn't match what's configured in Google Cloud Console.

**Fix:**
1. Check browser URL bar - copy the exact redirect URI from error message
2. Add that exact URL to "Authorized redirect URIs" in Google Cloud Console
3. Make sure there's no trailing slash
4. Make sure protocol matches (http vs https)

### Error: "origin_mismatch"

**Problem:** The origin (base URL) doesn't match what's configured.

**Fix:**
1. Add the base URL (without any path) to "Authorized JavaScript origins"
2. Example: If accessing `https://my-app.vercel.app/login`, add `https://my-app.vercel.app`

### OAuth works locally but not on staging

**Problem:** Staging URL not added to Google OAuth config.

**Fix:**
1. Get exact staging URL from Vercel deployment
2. Add both origin AND redirect URI to Google Cloud Console
3. Wait a few seconds for changes to propagate
4. Try again

### OAuth works on staging but not in preview deployments

**Expected behavior!** Preview deployments have dynamic URLs that change per PR. This is why we use the `staging` branch with a static URL for OAuth testing.

**Workflow:**
1. Test locally first
2. Merge to staging, test OAuth there
3. Don't worry about OAuth in preview deployments
4. Only `staging` and `production` need OAuth configured

## Security Best Practices

- ✅ Never commit `GOOGLE_CLIENT_SECRET` to git
- ✅ Store secrets in `.env.local` (gitignored)
- ✅ Add secrets to Vercel environment variables
- ✅ Use different OAuth clients for dev/staging/prod (optional but recommended)
- ✅ Regularly rotate secrets
- ❌ Never expose credentials in frontend code
- ❌ Never share secrets in public issues/PRs

## Summary Checklist

- [ ] Created OAuth 2.0 Client ID in Google Cloud Console
- [ ] Added `http://localhost:3000` to JavaScript origins
- [ ] Added `http://localhost:3000/auth/callback` to redirect URIs
- [ ] Tested OAuth flow locally
- [ ] Merged to staging branch
- [ ] Got staging URL from Vercel
- [ ] Added staging URL to JavaScript origins
- [ ] Added staging callback URL to redirect URIs
- [ ] Tested OAuth flow on staging
- [ ] Added credentials to `.env.local`
- [ ] Added credentials to Vercel environment variables
- [ ] Verified OAuth works end-to-end

---

Need help? Check the error message carefully - it usually tells you exactly which URL to add!
