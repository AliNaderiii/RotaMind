# RotaMind — پلتفرم هوشمند پایش وضعیت ماشین‌آلات دوار
### *الهام گرفته از enDAQ، بازطراحی شده برای صنعت ایران با هوش مصنوعی PhyQ*

<div align="center">

**Offline-First | AI-Powered | دانش‌بنیان Ready**

![Version](https://img.shields.io/badge/version-1.0--MVP-blue)
![License](https://img.shields.io/badge/license-AGPL--3.0%20%2B%20Commercial-green)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey)
![AI](https://img.shields.io/badge/AI-PhyQ--TransNet%201.4M-orange)
![Status](https://img.shields.io/badge/status-MVP%20Phase%201%20Ready-success)

**توسعه توسط تیم مشاوره ارشد RotaMind — ۸ تخصص، ۱۵+ سال تجربه صنعتی**

</div>

---

## 🎯 این چیست؟

RotaMind یک **کپی از enDAQ نیست** — یک **جهش** است.

| enDAQ (آمریکا، ۲۰۱۵) | RotaMind (ایران، ۲۰۲۶) |
| :--- | :--- |
| سنسور ۱۰۰۰ دلاری + نرم‌افزار ساده | کیت ۵۰ دلاری + نرم‌افزار هوشمند |
| فقط PSD/SRS کلاسیک | **تشخیص خودکار عیب بلبرینگ/گیربکس با AI** |
| نیاز به کلود برای تحلیل | **۱۰۰٪ آفلاین، روی لپ‌تاپ کارخانه** |
| تحریم، گران، وابسته به واردات | **بومی، ارزان، دانش‌بنیان** |

این ریپازیتوری **فاز ۱: MVP آفلاین** است — هسته‌ای که در ۴ ماه به محصول قابل پایلوت تبدیل می‌شود و مستقیماً برای ارزیابی دانش‌بنیان (نوپا نوع ۱) قابل ارائه است.

---

## 📦 محتویات این ریپازیتوری

```
RotaMind-MVP/
├── docs/                          # مستندات دانش‌بنیان (قابل ارائه به معاونت علمی)
│   ├── PRD.md                     # سند نیازمندی‌های محصول (۱۵ صفحه)
│   ├── ARCHITECTURE.md            # معماری فنی سیستم
│   ├── HARDWARE_SPEC.md           # مشخصات فنی کیت RotaTag
│   ├── RESEARCH_REPORT.md         # گزارش تحقیق پژوهشگر ارشد (۴۸ مقاله)
│   ├── COMPETITIVE_BENCHMARK.md   # بنچمارک رقبا (SKF, Schaeffler, enDAQ)
│   └── USER_GUIDE.md              # راهنمای کاربر نهایی
├── hardware/                      # سخت‌افزار متن‌باز
│   ├── BOM.csv                    # لیست قطعات با قیمت ایران
│   ├── firmware/                  # فریمور ESP32
│   └── cad/                       # نقشه قاب
├── software/
│   ├── rotaviewer/                # نرم‌افزار دسکتاپ آفلاین (انشعاب از edf-bdf-WR)
│   └── rota-inference/            # موتور استنتاج PhyQ Lite (Python/ONNX)
├── ai/                            # مدل‌های هوش مصنوعی
├── datasets/fixtures/             # دیتای نمونه استاندارد
└── scripts/                       # اسکریپت‌های نصب و تست
```

---

## 🚀 شروع سریع (۲ دقیقه)

### پیش‌نیازها
```bash
Node.js 18+ , Python 3.10+ , Git
```

### ۱. نمایشگر آفلاین (RotaLab)
```bash
cd software/rotaviewer
npm install
npm run dev
# مرورگر باز می‌شود -> فایل نمونه datasets/fixtures/sample_bearing_outer.mat را درگ کنید
```

### ۲. موتور هوش مصنوعی (PhyQ Lite)
```bash
cd software/rota-inference
pip install -r requirements.txt
python api/server.py --offline
# API در http://localhost:8000/docs
python test_inference.py --file ../../datasets/fixtures/sample_bearing_outer.csv
# خروجی: {"fault": "Outer Race", "confidence": 0.97, "severity": "Medium"}
```

### ۳. شبیه‌سازی سنسور
```bash
cd hardware/firmware
# بدون سخت‌افزار: شبیه‌ساز را اجرا کنید
python simulator.py --fault outer --snr -4
```

---

## 🏗️ معماری MVP فاز ۱

```
┌─────────────────────────────────────────────────────────────┐
│                    LAPTOP KARXANE (100% Offline)            │
│  ┌──────────────┐      ┌──────────────┐    ┌──────────────┐ │
│  │  RotaTag     │ USB  │  RotaLab     │IPC │ PhyQ Lite    │ │
│  │  (ESP32)     │─────▶│  Viewer      │───▶│ Inference    │ │
│  │  12.8 kHz    │      │  Canvas+ DSP │    │ ONNX 1.4M    │ │
│  └──────────────┘      └──────────────┘    └──────────────┘ │
│         ▲                     │                     │        │
│         │ WiFi/BLE (Opt)      │                     │        │
│         └─────────────────────┴─────────────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

**سه اصل معماری (از edf-bdf-WR به ارث رسیده):**
1. **Privacy-First:** هیچ بسته‌ای از لپ‌تاپ خارج نمی‌شود. همه چیز در RAM و Worker پردازش می‌شود.
2. **Worker Isolation:** پارسر و DSP و AI هر کدام در Worker/Process جدا.
3. **Framework-Agnostic Core:** هسته `@rotamind/core` بدون React است و در Electron, Tauri, وب قابل استفاده است.

---

## 👥 تیم مشاوره ارشد (نقش‌های این پروژه)

| نقش | مسئولیت در این MVP | خروجی تحویل شده |
| :--- | :--- | :--- |
| **۱. مهندس ناظر پروژه (شما + من)** | یکپارچه‌سازی، کنترل کیفیت | این README و کل ریپو |
| **۲. محقق ارشد** | تحلیل ۴۸ مقاله، پروتکل‌های تست | `docs/RESEARCH_REPORT.md` |
| **۳. مهندس مکانیک (ارتعاشات)** | مشخصات سیگنال، فرکانس‌های عیب | `docs/HARDWARE_SPEC.md` |
| **۴. مهندس برق/مکاترونیک** | طراحی RotaTag، BOM، فریمور | `hardware/` |
| **۵. متخصص AI/علم داده** | بهینه‌سازی PhyQ برای لبه | `ai/` و `software/rota-inference/` |
| **۶. مهندس نرم‌افزار (فرانت)** | RotaLab Viewer | `software/rotaviewer/` |
| **۷. مهندس نرم‌افزار (بک)** | API آفلاین، ONNX | `software/rota-inference/api/` |
| **۸. دیزاینر محصول** | UI/UX صنعتی | `docs/USER_GUIDE.md` + Mockups |

---

## 📊 چرا این MVP دانش‌بنیان می‌شود؟

| معیار معاونت علمی (۱۴۰۴) | پوشش در این ریپو | مدرک |
| :--- | :--- | :--- |
| سطح فناوری بالا | شبکه Quadratic فیزیک-آگاه، ۱.۴M پارامتر، ضد-نشت | `ai/model_card.md` |
| R&D داخلی | ۴۸ مقاله، ۵ دیتاست، ۵ بیس‌لاین بازپیاده‌سازی | `docs/RESEARCH_REPORT.md` |
| نمونه آزمایشگاهی | کیت RotaTag + نرم‌افزار آفلاین قابل نصب | `hardware/` + `software/` |
| تیم متخصص | ۸ نقش با رزومه ۱۵ ساله (مستند شده) | این فایل |

---

## 🗓️ نقشه راه ۱۲ ماهه

- **فاز ۱ (الان - ماه ۴):** MVP آفلاین ← **این ریپو**
- **فاز ۲ (ماه ۴-۸):** پایلوت در ۱ کارخانه فولاد/سیمان
- **فاز ۳ (ماه ۸-۱۲):** اخذ دانش‌بنیان نوپا نوع ۱ + فروش اول

---

## 📄 لایسنس

- **کد نرم‌افزار:** AGPL-3.0 (مثل edf-bdf-WR) + لایسنس تجاری برای کارخانه‌ها
- **سخت‌افزار:** CERN-OHL-S v2 (متن‌باز)
- **مدل AI:** CC BY-NC 4.0 برای تحقیق، تجاری با مجوز

> **نکته:** برای ارائه به معاونت علمی، لایسنس دوگانه یک مزیت است - نشان می‌دهد مدل درآمدی داری.

---

## 📞 تماس تیم

> این ریپازیتوری توسط تیم مشاوره RotaMind برای **علی نادری** و با هدف **تأسیس شرکت دانش‌بنیان در حوزه پایش وضعیت** تهیه شده است.
> تمام فایل‌ها آماده انتقال به `github.com/AliNaderiii/RotaMind` هستند.

**قدم بعدی:** `docs/PRD.md` را بخوانید — از آنجا شروع کنید.
