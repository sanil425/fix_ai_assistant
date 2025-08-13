#!/usr/bin/env bash
set -euo pipefail

echo "=== SAFETY FIRST ==="
echo "1) Rotate any leaked keys (OpenAI, etc.) BEFORE proceeding."
echo "2) Make a backup branch locally:  git branch backup/pre-scrub"
echo
read -p "Have you rotated keys and created a backup branch? (y/N) " yn
[[ "${yn}" == "y" || "${yn}" == "Y" ]] || { echo "Aborting."; exit 1; }

# Ensure git-filter-repo is available
if ! command -v git-filter-repo >/dev/null 2>&1; then
  echo "git-filter-repo not found. Install with:"
  echo "  brew install git-filter-repo   # macOS"
  echo "  # or"
  echo "  python3 -m pip install --user git-filter-repo"
  exit 1
fi

echo "=== Running git-filter-repo to purge secrets from ALL history ==="
echo "Purging: backend/.env, backend/.env.example, backend/server.log"
git filter-repo --force \
  --invert-paths \
  --path backend/.env \
  --path backend/.env.example \
  --path backend/server.log

echo "=== Rebuilding sanitized .env.example ==="
cat > backend/.env.example <<'EOF'
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
EOF

echo "=== Strengthening .gitignore ==="
# idempotent appends
grep -qxF '.env' .gitignore || echo '.env' >> .gitignore
grep -qxF '**/.env' .gitignore || echo '**/.env' >> .gitignore
grep -qxF '*.env' .gitignore || echo '*.env' >> .gitignore
grep -qxF '*.log' .gitignore || echo '*.log' >> .gitignore
grep -qxF 'backend/server.log' .gitignore || echo 'backend/server.log' >> .gitignore

git add backend/.env.example .gitignore
git commit -m "chore(security): sanitize env example and ignore secrets/logs after history scrub"

echo
echo "=== Next steps ==="
echo "1) Verify no secrets remain:"
echo "   git grep -nE \"sk-[A-Za-z0-9]+\" \$(git rev-list --all) || echo 'No sk- tokens found'"
echo "2) Force-push rewritten history:"
echo "   git push origin --force --all"
echo "   git push origin --force --tags"
echo
echo "If GitHub still flags something, re-run the grep above to locate stray files and re-run filter-repo including those paths."
