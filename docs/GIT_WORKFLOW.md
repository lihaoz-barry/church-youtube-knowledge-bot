# Git Workflow & Branch Protection

## Overview

This project uses a **staging-based development workflow** with three main branches:

- **`main`** - Production-ready code (protected)
- **`staging`** - Integration branch for testing (protected, has static Vercel URL)
- **Feature branches** - Individual development work

**Important:**
- Direct pushes to `main` and `staging` are **NOT allowed**
- All changes go through Pull Requests
- PRs merge into `staging` first, then `staging` → `main` after testing

## Workflow Steps

### 1. Create a Feature Branch

```bash
# Update staging branch
git checkout staging
git pull origin staging

# Create feature branch from staging (use descriptive name)
git checkout -b feature/youtube-oauth-flow
# or
git checkout -b fix/database-connection-error
# or
git checkout -b task/T021-youtube-oauth
```

**Branch Naming Convention:**
- `feature/` - New features
- `fix/` - Bug fixes
- `task/` - Specific task from tasks.md (e.g., `task/T021`)
- `refactor/` - Code refactoring
- `docs/` - Documentation updates

### 2. Make Changes

Work on your feature/fix:

```bash
# Make changes
# Test thoroughly

# Stage changes
git add .

# Commit with clear message
git commit -m "feat(US1): implement YouTube OAuth flow

- Task T021: Create OAuth initiation endpoint
- Follows principle: User Experience First
- Acceptance: OAuth redirects correctly to Google
"
```

**Commit Message Format:**
```
<type>(<scope>): <subject>

- Task T###: What was done
- Follows principle: [Constitutional Principle]
- Acceptance: [Test result]
```

**Types:** `feat`, `fix`, `refactor`, `docs`, `test`, `chore`

### 3. Push Branch

```bash
# Push feature branch to remote
git push -u origin feature/youtube-oauth-flow
```

### 4. Create Pull Request (to staging)

**IMPORTANT: Set base branch to `staging`, not `main`!**

**Via GitHub Web:**
1. Go to repository on GitHub
2. Click "Compare & pull request"
3. **Change base branch from `main` to `staging`**
4. Fill out PR template
5. Request review if applicable
6. Link related issues/tasks

**Via GitHub CLI:**
```bash
gh pr create --base staging \
  --title "feat(US1): Implement YouTube OAuth flow" \
  --body "Implements Task T021 - YouTube OAuth initiation"
```

### 5. Review & Merge

**Before Merging:**
- [ ] All CI checks pass (if configured)
- [ ] Code review approved (if required)
- [ ] No merge conflicts
- [ ] Branch is up to date with main
- [ ] Local testing completed

**Merge via GitHub:**
1. Click "Merge pull request" on GitHub
2. Choose merge method (usually "Squash and merge")
3. Delete branch after merge

**Merge via CLI:**
```bash
# Update branch with latest main
git checkout feature/youtube-oauth-flow
git merge main

# Push updates
git push

# Merge PR
gh pr merge --squash --delete-branch
```

### 6. Clean Up

```bash
# Switch back to staging
git checkout staging

# Pull latest changes
git pull origin staging

# Delete local branch
git branch -d feature/youtube-oauth-flow
```

### 7. Promote Staging to Main (Production Release)

After testing on the staging deployment, promote changes to production:

```bash
# Update local branches
git checkout main
git pull origin main
git checkout staging
git pull origin staging

# Create PR from staging to main
gh pr create --base main --head staging \
  --title "release: Deploy staging to production" \
  --body "Promoting tested changes from staging to production.

Changes included:
- List major features/fixes being deployed

Tested on staging: https://church-youtube-knowledge-bot-staging.vercel.app
Ready for production deployment.
"

# After approval, merge to main
# This will trigger production deployment on Vercel
```

**When to promote staging → main:**
- After completing a user story
- After fixing critical bugs
- At regular intervals (e.g., weekly releases)
- When staging has been tested and verified stable

## Branch Protection Rules

### GitHub Repository Settings

To enforce this workflow, configure branch protection for **both `main` and `staging`** branches.

**Navigate to:** Settings → Branches → Branch protection rules → Add rule

### Rule 1: Protect `main` branch

**Branch name pattern:** `main`

2. **Protect matching branches:**
   - ✅ Require a pull request before merging
     - Require approvals: 0 (can be increased if team grows)
     - ✅ Dismiss stale pull request approvals when new commits are pushed
     - ✅ Require review from Code Owners (optional)

   - ✅ Require status checks to pass before merging (when CI is set up)
     - ✅ Require branches to be up to date before merging

   - ✅ Require conversation resolution before merging (optional)

   - ✅ Require signed commits (optional, recommended for production)

   - ✅ Require linear history (enforces squash/rebase, prevents merge commits)

   - ✅ Include administrators (even repo admins must follow rules)

   - ✅ Restrict pushes that create matching branches (optional)

   - ✅ Lock branch (optional, for extra protection)

3. **Save changes**

### Rule 2: Protect `staging` branch

**Branch name pattern:** `staging`

**Protect matching branches:**
   - ✅ Require a pull request before merging
     - Require approvals: 0 (can be increased if team grows)
     - ✅ Dismiss stale pull request approvals when new commits are pushed

   - ✅ Require status checks to pass before merging (when CI is set up)
     - ✅ Require branches to be up to date before merging

   - ✅ Require linear history (enforces squash/rebase, prevents merge commits)

   - ✅ Include administrators (even repo admins must follow rules)

**Save changes**

### Vercel Deployment Settings

The `staging` branch will have a **static Vercel URL** for OAuth testing:

1. **Go to Vercel Dashboard** → Your Project → Settings → Domains
2. The staging branch will deploy to: `church-youtube-knowledge-bot-git-staging-[your-team].vercel.app`
3. **Use this URL for Google OAuth redirect URI**:
   ```
   https://church-youtube-knowledge-bot-git-staging-[your-team].vercel.app/auth/callback
   ```

4. **Update Google Cloud Console**:
   - Go to Google Cloud Console → APIs & Services → Credentials
   - Edit your OAuth 2.0 Client ID
   - Add to "Authorized redirect URIs":
     - `http://localhost:3000/auth/callback` (for local dev)
     - `https://church-youtube-knowledge-bot-git-staging-[your-team].vercel.app/auth/callback` (for staging)
     - `https://your-production-domain.com/auth/callback` (later, for production)

**Why this works:**
- Preview deployments have dynamic URLs (change per PR)
- The `staging` branch deployment has a **static URL**
- Google OAuth requires static redirect URIs
- This setup allows testing OAuth on staging before production

## Common Scenarios

### Scenario 1: Quick Fix (to staging)

```bash
git checkout staging
git pull
git checkout -b fix/env-variable-error
# Make fix
git add .
git commit -m "fix: Add environment variable validation"
git push -u origin fix/env-variable-error
gh pr create --base staging --fill
gh pr merge --squash --delete-branch
```

### Scenario 2: Feature Development (to staging)

```bash
git checkout staging
git pull
git checkout -b feature/youtube-video-sync
# Work on feature over multiple commits
git add .
git commit -m "feat: Add video sync API endpoint"
git push -u origin feature/youtube-video-sync

# Continue working
git add .
git commit -m "feat: Add video processing queue"
git push

# Create PR to staging when ready
gh pr create --base staging --fill
# Request review, wait for approval
gh pr merge --squash --delete-branch
```

### Scenario 3: Urgent Hotfix (to staging, then main)

```bash
git checkout staging
git pull
git checkout -b hotfix/production-auth-error
# Make fix
git add .
git commit -m "fix: Critical auth token expiry bug"
git push -u origin hotfix/production-auth-error
gh pr create --base staging --fill
# Fast-track review and merge to staging
gh pr merge --squash --delete-branch

# After testing on staging, promote to main
git checkout staging
git pull
gh pr create --base main --head staging \
  --title "hotfix: Deploy critical auth fix to production" \
  --fill
```

### Scenario 4: Keeping Branch Up to Date (with staging)

```bash
# On your feature branch
git checkout feature/youtube-oauth-flow

# Fetch latest staging
git fetch origin staging

# Merge staging into your branch
git merge origin/staging

# Or rebase (cleaner history)
git rebase origin/staging

# Push updates (use --force-with-lease after rebase)
git push --force-with-lease
```

## Handling Merge Conflicts

```bash
# If conflicts occur during merge with staging
git merge origin/staging

# Git will mark conflicted files
# Edit files to resolve conflicts
# Look for markers: <<<<<<<, =======, >>>>>>>

# After resolving
git add .
git commit -m "Merge staging and resolve conflicts"
git push
```

## CI/CD Integration (Future)

When GitHub Actions CI is set up:

```yaml
# .github/workflows/ci.yml
name: CI

on:
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run tests
        run: npm test
      - name: Run linter
        run: npm run lint
      - name: Type check
        run: npm run type-check
```

## Emergency Access

**If direct push to main is absolutely necessary:**

1. Temporarily disable branch protection on GitHub
2. Push the urgent change
3. **Immediately re-enable branch protection**
4. Document why emergency access was needed

**Better approach:** Use hotfix branch and fast-track PR review.

## Resources

- [GitHub Branch Protection Documentation](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [GitHub CLI Documentation](https://cli.github.com/manual/)
- [Git Flow Cheatsheet](https://danielkummer.github.io/git-flow-cheatsheet/)

## Summary

1. **Never push directly to `main` or `staging`**
2. **Always create a branch from `staging`** for changes
3. **Use descriptive branch names** (feature/, fix/, task/)
4. **Write clear commit messages** with task references
5. **Create PR to `staging`** (not main!) with filled-out template
6. **Test on staging deployment** (static Vercel URL for OAuth)
7. **Promote `staging` → `main`** after testing
8. **Squash and merge** to keep history clean
9. **Delete branch** after merging

## Workflow Diagram

```
feature/xyz → PR → staging → test on staging URL → PR → main → production
```

This three-tier workflow ensures:
- **Static staging URL** for OAuth redirect testing
- **Code quality** through PR reviews
- **Testing** before production deployment
- **Traceability** of all changes
