# Secure Push (Fix GH013)

## 0) Rotate Keys
- Rotate/delete any leaked OpenAI key before proceeding.

## 1) Backup
```bash
git fetch --all --prune
git branch backup/pre-scrub
```

## 2) Scrub History
```bash
bash scripts/scrub_secrets.sh
```
This removes `backend/.env`, `backend/.env.example` (old), and `backend/server.log` from all history, then adds a sanitized `backend/.env.example` and strengthens `.gitignore`.

## 3) Verify and Force-Push
```bash
git grep -nE "sk-[A-Za-z0-9]+" $(git rev-list --all) || echo "No sk- tokens found"
git push origin --force --all
git push origin --force --tags
```

## 4) Optional: Enable Local Hooks
```bash
bash scripts/enable_hooks.sh
```
This enables a simple pre-commit check that blocks commits containing tokens like `sk-...`.

---

**Note**: History rewrite affects collaborators. Tell them to `git fetch --all` and rebase or reset to the new history.
