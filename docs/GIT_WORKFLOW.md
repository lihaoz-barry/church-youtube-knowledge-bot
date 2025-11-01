# Git Workflow & Branch Protection

## Overview

This project enforces a branch-based development workflow. **Direct pushes to `main` are not allowed.** All changes must go through a Pull Request.

## Workflow Steps

### 1. Create a Feature Branch

```bash
# Update main branch
git checkout main
git pull origin main

# Create feature branch (use descriptive name)
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

### 4. Create Pull Request

**Via GitHub Web:**
1. Go to repository on GitHub
2. Click "Compare & pull request"
3. Fill out PR template
4. Request review if applicable
5. Link related issues/tasks

**Via GitHub CLI:**
```bash
gh pr create --title "feat(US1): Implement YouTube OAuth flow" \
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
# Switch back to main
git checkout main

# Pull latest changes
git pull origin main

# Delete local branch
git branch -d feature/youtube-oauth-flow
```

## Branch Protection Rules

### GitHub Repository Settings

To enforce this workflow, configure these settings on GitHub:

**Navigate to:** Settings → Branches → Branch protection rules → Add rule

**Rule Configuration for `main` branch:**

1. **Branch name pattern:** `main`

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

## Common Scenarios

### Scenario 1: Quick Fix

```bash
git checkout main
git pull
git checkout -b fix/env-variable-error
# Make fix
git add .
git commit -m "fix: Add environment variable validation"
git push -u origin fix/env-variable-error
gh pr create --fill
gh pr merge --squash --delete-branch
```

### Scenario 2: Feature Development

```bash
git checkout main
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

# Create PR when ready
gh pr create --fill
# Request review, wait for approval
gh pr merge --squash --delete-branch
```

### Scenario 3: Urgent Hotfix

```bash
git checkout main
git pull
git checkout -b hotfix/production-auth-error
# Make fix
git add .
git commit -m "fix: Critical auth token expiry bug"
git push -u origin hotfix/production-auth-error
gh pr create --fill
# Fast-track review and merge
gh pr merge --squash --delete-branch
```

### Scenario 4: Keeping Branch Up to Date

```bash
# On your feature branch
git checkout feature/youtube-oauth-flow

# Fetch latest main
git fetch origin main

# Merge main into your branch
git merge origin/main

# Or rebase (cleaner history)
git rebase origin/main

# Push updates (use --force-with-lease after rebase)
git push --force-with-lease
```

## Handling Merge Conflicts

```bash
# If conflicts occur during merge
git merge origin/main

# Git will mark conflicted files
# Edit files to resolve conflicts
# Look for markers: <<<<<<<, =======, >>>>>>>

# After resolving
git add .
git commit -m "Merge main and resolve conflicts"
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

1. **Never push directly to `main`**
2. **Always create a branch** for changes
3. **Use descriptive branch names** (feature/, fix/, task/)
4. **Write clear commit messages** with task references
5. **Create PR** with filled-out template
6. **Test thoroughly** before merging
7. **Squash and merge** to keep main history clean
8. **Delete branch** after merging

This workflow ensures code quality, traceability, and allows for proper review and testing before changes reach production.
