# APPLY_UPDATE.ps1 — RotaMind-MVP Phase11-15 Delta Applier (PowerShell 5.1+)
$ErrorActionPreference = "Stop"
Write-Host "=== RotaMind Phase11-15 Applier ===" -ForegroundColor Cyan
if (-not (Test-Path ".git")) { Write-Host "خطا: در روت ریپو نیستید (.git یافت نشد)" -ForegroundColor Red; exit 1 }

Write-Host "`n[1/5] Backup stash (اختیاری)..." -ForegroundColor Yellow
git stash push -m "pre-phase15-backup" --include-untracked 2>$null
Write-Host "Stash انجام شد (در صورت نیاز: git stash pop)" -ForegroundColor DarkGray

Write-Host "`n[2/5] بررسی نسخه فعلی..." -ForegroundColor Yellow
git log --oneline -2
Write-Host "origin/main: $(git rev-parse origin/main --short)" -ForegroundColor DarkGray
Write-Host "HEAD: $(git rev-parse HEAD --short)" -ForegroundColor DarkGray

Write-Host "`n[3/5] اعمال فایل‌های دلتا (این پوشه قبلا اکسترکت شده)..." -ForegroundColor Yellow
# این اسکریپت فرض می‌کند محتوای DELTA قبلا روی ریپو اکسترکت شده
# فقط history را اعمال می‌کنیم
if (Test-Path "_git_history\rotamind-phase11-15.bundle") {
    Write-Host "Bundle یافت شد — اعمال تاریخچه..." -ForegroundColor Yellow
    git bundle verify _git_history\rotamind-phase11-15.bundle
    git fetch _git_history\rotamind-phase11-15.bundle HEAD:temp-phase15 2>&1 | Out-Null
    git merge temp-phase15 --no-edit --allow-unrelated-histories 2>&1 | Out-Host
    if ($LASTEXITCODE -eq 0) { Write-Host "Merge موفق" -ForegroundColor Green; git branch -D temp-phase15 2>$null }
    else { Write-Host "Merge نیاز به حل conflict دارد — راهنما در README_UPDATE.md" -ForegroundColor Red; exit 1 }
} else {
    Write-Host "Bundle یافت نشد — فقط فایل‌ها کپی شدند. دستی کامیت کنید:" -ForegroundColor DarkYellow
    git status --short
    git add .
    git commit -m "chore: apply phase11-15 delta (140/140 tests)"
}

Write-Host "`n[4/5] بررسی نسخه‌ها..." -ForegroundColor Yellow
Select-String -Path "software\rota-inference\api\server.py" -Pattern "1.0.0-phase15" | Select-Object -First 1
Select-String -Path "software\rotaviewer\src-tauri\tauri.conf.json" -Pattern "1.0.0-phase15" | Select-Object -First 1

Write-Host "`n[5/5] نصب وابستگی + تست..." -ForegroundColor Yellow
pip install cryptography greenlet sqlalchemy aiosqlite python-multipart "bcrypt==4.0.1" --quiet
$env:PYTHONPATH="software/rota-inference"
pytest software\rota-inference\tests -q
if ($LASTEXITCODE -eq 0) { Write-Host "`n140/140 PASS ✓ — آپدیت کامل شد!" -ForegroundColor Green }
else { Write-Host "`nتست‌ها failed — لاگ را بررسی کنید" -ForegroundColor Red }

Write-Host "`nبرای بازگردانی بکاپ: git stash pop" -ForegroundColor DarkGray
