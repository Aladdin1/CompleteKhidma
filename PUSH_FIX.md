# Fix GitHub push HTTP 500 (large repo)

Your push failed with **HTTP 500** because the repo is large (~49 MB) and contained **npm cache** (`frontend/.npm-cache`, `backend/.npm-cache`) that should not be in git.

## What was done

- **`.npm-cache/`** added to root and frontend `.gitignore`
- **`frontend/.npm-cache`** and **`backend/.npm-cache`** removed from git tracking (one commit)

The **history** still contains those files, so the next push can still be large and may hit the same error. Try the steps below in order.

---

## Step 1: Increase Git HTTP buffer and retry

Run in terminal:

```bash
cd /Users/aladdin/Downloads/khidma

# Use a 500 MB buffer for the push (default is small)
git config http.postBuffer 524288000

# Push again
git push -u origin main
```

If the push **succeeds**, you’re done.

If you still get **HTTP 500** or timeout, do Step 2 to shrink history.

---

## Step 2 (optional): Shrink repo by removing .npm-cache from history

This rewrites history so `.npm-cache` is removed from **all** commits. The push will be much smaller.

**Only do this if:**
- No one else has cloned this repo yet, or they’re okay resetting their clone, or
- The remote `Aladdin1/CompleteKhidma` is new / can be overwritten

Run:

```bash
cd /Users/aladdin/Downloads/khidma

# Remove frontend/.npm-cache and backend/.npm-cache from entire history
git filter-branch --force --index-filter \
  'git rm -rf --cached --ignore-unmatch frontend/.npm-cache backend/.npm-cache' \
  --prune-empty HEAD

# Garbage-collect to free space
git reflog expire --expire=now --all && git gc --prune=now --aggressive

# Push (overwrites remote; use only if remote can be replaced)
git push origin main --force
```

After that, future clones and pushes will be smaller and less likely to hit HTTP 500.
