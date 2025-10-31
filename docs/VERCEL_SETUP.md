# Vercel Environment Variables Setup

This guide explains how to configure environment variables in Vercel for **Preview** (PR deployments) and **Production** environments.

## Overview

Environment variables are stored in **Vercel Dashboard**, not in code. This ensures:
- ✅ Secrets never committed to Git
- ✅ Different values for preview vs production
- ✅ Easy updates without code changes

---

## Step 1: Access Vercel Dashboard

1. Go to https://vercel.com
2. Select your project: `church-youtube-knowledge-bot`
3. Click **Settings** tab
4. Click **Environment Variables** in left sidebar

---

## Step 2: Add Variables for Preview (Staging)

Add these variables and select **Preview** environment:

### Supabase (Staging Database)

```
Variable name: NEXT_PUBLIC_SUPABASE_URL
Value: [Get from Supabase Dashboard → Settings → API → Project URL]
Environments: ✅ Preview
```

```
Variable name: NEXT_PUBLIC_SUPABASE_ANON_KEY
Value: [Get from Supabase Dashboard → Settings → API → anon public key]
Environments: ✅ Preview
```

```
Variable name: SUPABASE_SERVICE_ROLE_KEY
Value: [Get from Supabase Dashboard → Settings → API → service_role secret]
Environments: ✅ Preview
```

### Google OAuth

```
Variable name: GOOGLE_CLIENT_ID
Value: [Get from Google Cloud Console → APIs & Services → Credentials]
Environments: ✅ Preview
```

```
Variable name: GOOGLE_CLIENT_SECRET
Value: [Get from Google Cloud Console → APIs & Services → Credentials]
Environments: ✅ Preview
```

### OpenAI

```
Variable name: OPENAI_API_KEY
Value: [Get from https://platform.openai.com/api-keys]
Environments: ✅ Preview
```

### N8N Workflows

```
Variable name: N8N_WEBHOOK_URL
Value: [Your n8n instance URL]
Environments: ✅ Preview
```

```
Variable name: N8N_WEBHOOK_SECRET
Value: [Generate when creating n8n webhooks]
Environments: ✅ Preview
```

### Encryption Key

```
Variable name: ENCRYPTION_KEY
Value: [From .env.local - 32-byte hex string]
Environments: ✅ Preview
```

**Note**: Get all actual values from your `.env.local` file. Never commit real credentials to Git!

---

## Step 3: How PR Previews Work

When you create a pull request:

1. **Create PR** from feature branch:
   ```bash
   git checkout -b feature/youtube-oauth
   git push origin feature/youtube-oauth
   # Create PR on GitHub
   ```

2. **Vercel auto-deploys** to preview URL:
   ```
   https://church-youtube-knowledge-bot-git-feature-youtube-oauth-lihaoz-barry.vercel.app
   ```

3. **Vercel injects Preview environment variables** at build time

4. **Test on preview URL** - connects to staging Supabase database

5. **Merge to staging branch** for persistent staging environment:
   ```bash
   git checkout staging
   git merge feature/youtube-oauth
   git push origin staging
   # Always deploys to: https://church-youtube-knowledge-bot-staging.vercel.app
   ```

---

## Step 4: Add Variables for Production (Later)

When ready to launch production:

1. Create **production** Supabase project
2. Add same variables but select **Production** environment
3. Use production Supabase credentials

Example for production:
```
Variable name: NEXT_PUBLIC_SUPABASE_URL
Value: https://production-project-id.supabase.co
Environments: ✅ Production
```

---

## Step 5: Google OAuth Redirect URIs

Make sure your Google Cloud Console has these redirect URIs:

### For Supabase Auth (Google Sign-In)
```
https://[YOUR-PROJECT-ID].supabase.co/auth/v1/callback
```
Replace `[YOUR-PROJECT-ID]` with your Supabase project ID from Settings → API

### For YouTube OAuth
```
http://localhost:3000/api/youtube/callback (development)
https://church-youtube-knowledge-bot-staging.vercel.app/api/youtube/callback (staging)
https://church-youtube-knowledge-bot.vercel.app/api/youtube/callback (production - later)
```

**Setup:**
1. Go to https://console.cloud.google.com/apis/credentials
2. Select your OAuth client
3. Add **Authorized redirect URIs**
4. Click **Save**

---

## Step 6: Verify Setup

### Test Local Development
```bash
# .env.local should have all variables
npm run dev
# Visit http://localhost:3000
```

### Test PR Preview
```bash
# Create PR, wait for Vercel deployment
# Check Vercel deployment logs for errors
# Visit preview URL
```

### Check Environment Variables are Loaded
In your app, you can log (temporarily):
```typescript
console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
// Should see: https://cwiehstggqlxafglkkda.supabase.co
```

**⚠️ Remove console.logs before committing!**

---

## Troubleshooting

### "Supabase URL is undefined"
- Check variable name is **exactly** `NEXT_PUBLIC_SUPABASE_URL`
- Check it's set for the correct environment (Preview/Production)
- Redeploy after adding variables

### "OAuth redirect URI mismatch"
- Check Google Console redirect URIs match your deployment URL
- For PR previews, add the specific preview URL to Google Console

### "Can't connect to database"
- Check Supabase credentials are correct
- Test connection in Supabase Dashboard → SQL Editor
- Check RLS policies aren't blocking queries

---

## Security Best Practices

✅ **DO:**
- Store all secrets in Vercel Environment Variables
- Use different databases for preview and production
- Rotate API keys regularly
- Use Preview environment for all PR testing

❌ **DON'T:**
- Commit `.env.local` to Git (already in .gitignore)
- Share API keys in Slack/email
- Use production database for testing
- Expose service role key in client-side code

---

## Summary

**Current Setup:**
- ✅ Staging database: cwiehstggqlxafglkkda.supabase.co
- ✅ Google OAuth configured
- ✅ Environment variables for Preview
- ⏳ Production database (create later)
- ⏳ Production environment variables (add later)

**Workflow:**
1. Develop locally → uses `.env.local`
2. Create PR → Vercel deploys with Preview variables
3. Merge to `staging` → Stable staging URL
4. Merge to `main` → Production deployment (later)
