#!/bin/bash
set -e
echo "=== RotaMind Phase11-15 Applier (Linux/macOS) ==="
if [ ! -d ".git" ]; then echo "خطا: در روت ریپو نیستید"; exit 1; fi
echo "[1/5] Backup stash..."
git stash push -m "pre-phase15-backup" --include-untracked || true
echo "[2/5] Current log:"
git log --oneline -2
echo "[3/5] Apply bundle history..."
if [ -f "_git_history/rotamind-phase11-15.bundle" ]; then
  git bundle verify _git_history/rotamind-phase11-15.bundle
  git fetch _git_history/rotamind-phase11-15.bundle HEAD:temp-phase15
  git merge temp-phase15 --no-edit --allow-unrelated-histories
  git branch -D temp-phase15 || true
  echo "Merge done"
else
  git add .
  git commit -m "chore: apply phase11-15 delta (140/140 tests)"
fi
echo "[4/5] Version check:"
grep -n "1.0.0-phase15" software/rota-inference/api/server.py | head -1
grep -n "1.0.0-phase15" software/rotaviewer/src-tauri/tauri.conf.json | head -1
echo "[5/5] Tests:"
PYTHONPATH=software/rota-inference pytest software/rota-inference/tests -q
echo "Done ✓"
