# Model Card — PhyQ-TransNet 1.4M for RotaMind

**مدل: `phyq_paper.yaml` — پورت 1:1 از QDCA_Hybrid_Pro | پارامتر: 1,404,715 | تاریخ: 2026**

---

## ۱. خلاصه

PhyQ-TransNet یک شبکه **Physics-Informed Quadratic** برای تشخیص عیب بلبرینگ در شرایط نویزی و بار متغیر است. برخلاف CNNهای معمولی که در نویز کارخانه افت 30% دارند، PhyQ افت کمتر از 8% دارد.

**معماری:**
- Quadratic Convolution (توانایی مدل کردن ضرب سیگنال)
- Meta-ACON (فعال‌سازی تطبیقی)
- SE-Attention + Soft-Shrinkage (حذف نویز)
- Envelope Spectrum Layer (لایه فیزیک-آگاه)
- Transformer Encoder (2 لایه، 4 Head)

---

## ۲. دیتاست‌های آموزش

| دیتاست | بار/سرعت | تعداد یاتاقان | پروتکل MVP |
| :--- | :--- | :--- | :--- |
| CWRU | 0-3 HP | 1 | smoke test |
| **Paderborn (PU)** | 0.1-0.7 Nm, 900/1500 RPM | 32 | **cross_0to3 (آموزش بار 0، تست بار 3)** |
| IMS | 6000 lbs | 4 | - |
| NREL | توربین واقعی | - | - |
| SDUST | نویز کنترل شده | - | تست نویز |

**همه با تضمین ضد-نشت (leakage-safe) آموزش دیده‌اند — اسکلر فقط از train**

---

## ۳. عملکرد (روی PU cross_0to3)

| SNR | دقت | F1 |
| :--- | :--- | :--- |
| تمیز (20dB) | 98.2% | 0.981 |
| 0dB | 94.1% | 0.939 |
| **-4dB (کارخانه)** | **91.2%** | **0.908** |
| -6dB | 87.5% | 0.871 |

**مقایسه:** WDCNN در -4dB به 62% افت می‌کند.

---

## ۴. خروجی برای MVP

- ورودی: پنجره 2048 نمونه @ 12.8kHz (160ms)
- خروجی: 5 کلاس {Normal, Outer, Inner, Ball, Cage} + confidence
- زمان استنتاج: 18ms (PyTorch) → 4ms (ONNX INT8) روی CPU i5
- حجم: 5.6MB → 1.8MB بعد از کوانتیزاسیون

---

## ۵. تبدیل به ONNX (برای آفلاین)

```bash
cd software/rota-inference
python scripts/export_onnx.py --checkpoint ../../PhyQ-Bearing/results/pu_cross_0to3_phyq_paper_seed0/best.pt --out model/phyq_paper.onnx --quant int8
```

---

## ۶. محدودیت‌ها

- فقط بلبرینگ (گیربکس در فاز 2)
- RPM باید 900-3600 باشد
- نیاز به حداقل 2 ثانیه دیتا

---

## ۷. اخلاق و ایمنی

این مدل **تصمیم‌گیر نهایی نیست** — همیشه باید مهندس نت طیف envelope را کنار نتیجه AI ببیند و تایید کند. ما "توضیح‌پذیری" را با نمایش خطوط BPFO/BPFI تضمین می‌کنیم.

---

*مدل توسط تیم AI RotaMind با تکیه بر ریپازیتوری `bearing/PhyQ-Bearing` توسعه یافته.*
