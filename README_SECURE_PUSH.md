# Secure Push (Fix GH013)

## 0) Rotate Keys
Rotate/delete any leaked OpenAI key first.

## 1) Backup (locally)
```bash
git fetch --all --prune
git branch backup/pre-scrub
```

## 2) Scrub History
```bash
chmod +x scripts/scrub.sh
bash scripts/scrub.sh
```
This removes `backend/.env`, `backend/.env.example` (old), and `backend/server.log` from all history, then adds a sanitized `backend/.env.example` and strengthens `.gitignore`, verifies no `sk-...` tokens remain, and force-pushes.

## 3) Optional: Enable local hooks to prevent future leaks
```bash
chmod +x scripts/enable_hooks.sh
bash scripts/enable_hooks.sh
```

## Notes
- History rewrite affects collaborators. Ask them to `git fetch --all` and rebase or reset to the new history.
- If GitHub still flags something, re-run the verify step to see remaining paths/commits and add them to the filter list in `scripts/scrub.sh`, then run it again.
