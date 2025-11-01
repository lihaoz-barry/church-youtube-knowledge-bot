# Quick Start Guide

## Prerequisites

- Node.js 18+
- Git
- Supabase account (with project created)
- Vercel account (optional, for deployment)
- Google Cloud Console (for OAuth)

## Setup Steps

### 1. Clone & Install

```bash
git clone https://github.com/lihaoz-barry/church-youtube-knowledge-bot.git
cd church-youtube-knowledge-bot
npm install
```

### 2. Environment Variables

Create `.env.local` from template:

```bash
cp .env.local.example .env.local
```

Add your credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-secret

OPENAI_API_KEY=your-openai-key
N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook
N8N_API_KEY=your-n8n-api-key
```

### 3. Database Setup

Apply migrations in Supabase Dashboard:

1. Go to Supabase Dashboard → SQL Editor
2. Copy contents of `supabase/migrations/001_initial_schema.sql`
3. Run the SQL
4. Repeat for migrations 002, 003, 004

**Or use Supabase CLI:**
```bash
npx supabase db push
```

### 4. Run Development Server

```bash
npm run dev
```

Visit: http://localhost:3000

### 5. Test Authentication

1. Go to http://localhost:3000/login
2. Click "Test Database" - should see connection success
3. Click "Sign in with Google" - should redirect to Google OAuth
4. Verify callback works after signing in

## Development Workflow

### Start New Feature

```bash
# 1. Update staging
git checkout staging
git pull origin staging

# 2. Create feature branch
git checkout -b feature/my-new-feature

# 3. Make changes, commit, push
git add .
git commit -m "feat: Add my new feature"
git push -u origin feature/my-new-feature

# 4. Create PR to staging (NOT main!)
gh pr create --base staging --fill
```

### Promote to Production

```bash
# After testing on staging
git checkout staging
git pull

# Create release PR
gh pr create --base main --head staging \
  --title "release: Deploy to production" \
  --fill
```

## Branch Structure

```
main (production)
  ↑
staging (testing - has static Vercel URL)
  ↑
feature/xyz (development)
```

**Never push directly to `main` or `staging`!**

## Testing

### Unit Tests
```bash
npm test
```

### Type Check
```bash
npm run type-check
```

### Lint
```bash
npm run lint
```

### Build
```bash
npm run build
```

## Deployment (Vercel)

### Automatic Deployments

- **PR created** → Preview deployment (dynamic URL)
- **Merged to `staging`** → Staging deployment (static URL: `*-git-staging-*.vercel.app`)
- **Merged to `main`** → Production deployment

### Configure Branch Protection

See `docs/GIT_WORKFLOW.md` for detailed setup instructions.

1. Go to GitHub Settings → Branches
2. Add protection rules for `main` and `staging`
3. Require PR before merging
4. Require linear history

## Common Commands

```bash
# Start dev server
npm run dev

# Run tests
npm test

# Type check
npm run type-check

# Lint code
npm run lint

# Build for production
npm run build

# Start production build
npm start
```

## OAuth Setup

### Google Cloud Console

1. Create OAuth 2.0 Client ID
2. Add authorized redirect URIs:
   - `http://localhost:3000/auth/callback` (local dev)
   - `https://your-app-git-staging-*.vercel.app/auth/callback` (staging)
   - `https://your-production-domain.com/auth/callback` (production)

### Get Staging URL

After merging to `staging` branch, check Vercel deployment to get the static staging URL.

## Troubleshooting

### "Missing environment variables" error

- Check `.env.local` exists and has all required variables
- For Vercel: Check Settings → Environment Variables
- Make sure variables are set for correct environment (Preview/Production)

### "No QueryClient set" error

- This has been fixed in the latest code
- Make sure you pulled latest from `staging`

### OAuth redirect not working

- Verify redirect URI in Google Cloud Console matches exactly
- Check Vercel deployment URL (staging branch has static URL)
- Ensure HTTPS is used (localhost can use HTTP)

### Database connection fails

- Verify Supabase URL and keys in `.env.local`
- Check migrations have been applied
- Test connection at http://localhost:3000/login

## Documentation

- **Git Workflow**: `docs/GIT_WORKFLOW.md`
- **Vercel Setup**: `docs/VERCEL_SETUP.md`
- **Project Guide**: `.claude/CLAUDE.md`
- **Feature Spec**: `specs/001-youtube-connection/spec.md`
- **Tasks**: `specs/001-youtube-connection/tasks.md`

## Need Help?

1. Check `docs/` directory for detailed guides
2. Review `.claude/CLAUDE.md` for project patterns
3. See `specs/` for feature specifications
4. Check existing code for examples

## Next Steps

After completing setup:

1. ✅ Merge PR #1 (feature → staging)
2. ✅ Test on staging deployment
3. ✅ Set up branch protection
4. ✅ Configure Google OAuth with staging URL
5. ✅ Merge PR #2 (staging → main)
6. 🚀 Start implementing Feature 001 tasks

Happy coding! 🎉
