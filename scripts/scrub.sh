#!/usr/bin/env bash
set -euo pipefail

echo ">>> IMPORTANT: Rotate/delete any previously leaked OpenAI keys BEFORE continuing."
read -p "Have you rotated your keys? (y/N) " yn
[[ "${yn}" =~ ^[Yy]$ ]] || { echo "Aborting."; exit 1; }

# Safety backup
git fetch --all --prune
git branch backup/pre-scrub || true

# Ensure git-filter-repo exists
if ! command -v git-filter-repo >/dev/null 2>&1; then
  echo "git-filter-repo not found."
  echo "Install with: brew install git-filter-repo   (or)   python3 -m pip install --user git-filter-repo"
  exit 1
fi

echo ">>> Rewriting history to remove leaked files:"
echo "    - backend/.env"
echo "    - backend/.env.example"
echo "    - backend/server.log"
git filter-repo --force \
  --invert-paths \
  --path backend/.env \
  --path backend/.env.example \
  --path backend/server.log

echo ">>> Recreate sanitized sample env (NO real key)"
cat > backend/.env.example <<'EOF'
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
EOF

echo ">>> Strengthen .gitignore"
touch .gitignore
{
  echo ".env"
  echo "**/.env"
  echo "*.env"
  echo "*.log"
  echo "backend/server.log"
} | sort -u >> .gitignore.tmp
cat .gitignore .gitignore.tmp | sort -u > .gitignore.new
mv .gitignore.new .gitignore
rm -f .gitignore.tmp

git add backend/.env.example .gitignore
git commit -m "chore(security): sanitize env example and ignore secrets/logs after history scrub" || true

echo ">>> Verify no sk- tokens remain in history (this may be slow)"
git rev-list --all | xargs -n1 -I{} git grep -nE 'sk-[[:alnum:]]{20,}' {} || echo "No sk-like tokens found"

echo ">>> Force-push rewritten history"
git push origin --force --all
git push origin --force --tags

echo ">>> Done. If GitHub still flags something, rerun the verify step to find remaining paths/commits, add them to the filter list above, and run this script again."
