#!/usr/bin/env bash
set -e
git config core.hooksPath .githooks
chmod +x .githooks/pre-commit
echo "Git hooks enabled."
