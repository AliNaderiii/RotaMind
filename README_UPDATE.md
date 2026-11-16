# RotaMind-MVP — بسته آپدیت Phase 11 → 15 (DELTA)

**مخزن مبدا:** origin/main = `c1a72ea v1.0` → **HEAD** = `dd0e926 Phase15` (140/140 PASS)
**تعداد فایل تغییر یافته:** 164 فایل | **حجم دلتا:** ~988K (بدون history)

این بسته فقط فایل‌های تغییر یافته نسبت به origin/main را دارد. برای آپدیت کامل مخزن محلی خود:

## گزینه A) آپدیت سریع (overwrite فایل‌ها) — پیشنهادی اگر تاریخچه گیت شما قبلا آپدیت است
1. پشتیبان بگیرید: `git stash` یا کپی پوشه
2. اکسترکت: `Expand-Archive RotaMind-MVP-UPDATE-v15-DELTA.zip -DestinationPath C:\path\to\RotaMind-MVP -Force`
3. تست: `pytest software/rota-inference/tests -q` → باید 140 passed

## گزینه B) آپدیت با حفظ تاریخچه کامل (توصیه می‌شود)
```powershell
cd C:\path\to\RotaMind-MVP
git fetch origin  # اطمینان از origin/main قدیمی
git bundle verify _git_history\rotamind-phase11-15.bundle
git fetch _git_history\rotamind-phase11-15.bundle HEAD:temp-update
git merge temp-update --no-edit
# یا اعمال patchها:
# git am _git_history\patches\*.patch
```
## تغییرات اصلی Phase 11-15
- Phase11: SIL2 safety + Policy Engine 4 policies P1-P4 + WorkOrder
- Phase12: Self-Healing CB + AIOps RCA PageRank MTTD 1.2min
- Phase13: WS 50ms Realtime + MLOps Registry + Scheduler 73%
- Phase14: Vault AES-GCM + Perf LRU 10k + Advisor RAG
- Phase15: Global Mesh 450 vnodes + Pilot RL+DAG + Cortex Graph

نسخه نهایی: `api/server.py 1.0.0-phase15` / `tauri.conf.json 1.0.0-phase15`

## فایل‌های کلیدی
- `software/rota-inference/api/server.py` — 45K شامل همه endpoints
- `docs/BACKEND_ROADMAP.md` — مستند کامل 15 فاز
- `_git_history/rotamind-phase11-15.bundle` — 27 کامیت Phase11-15
- `APPLY_UPDATE.ps1` / `APPLY_UPDATE.sh` — اسکریپت خودکار

در صورت تداخل (conflict) در فایل‌های دستی شما:
```powershell
git diff --name-only --diff-filter=U
git checkout --theirs -- <file>  # یا --ours برای نگه داشتن نسخه شما
git add .
git commit -m "merge: phase15"
```
