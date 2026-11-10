# ARCHITECTURE — معماری فنی RotaMind MVP
## Offline-First Vibration Intelligence Platform

**معمار: تیم مهندسی نرم‌افزار RotaMind | الگو: edf-bdf-WR + enDAQ + SKF Enlight**

---

### ۱. اصول معماری (سه ستون)

ما معماری اثبات شده `edf-bdf-WR` تو را (که خودت با ۵۴ تست و parity با SciPy ساختی) به عنوان **هسته** برمی‌داریم و برای ارتعاشات گسترش می‌دهیم:

1. **Offline-First, Privacy by Design:** هیچ `fetch()` به بیرون. همه چیز در Worker/Process محلی. این برای کارخانه‌های بدون اینترنت و برای اخذ دانش‌بنیان (امنیت داده) حیاتی است.
2. **Decoupled Core:** هسته `@rotamind/core` هیچ وابستگی به React/Electron ندارد. می‌تواند فردا در یک اپ Tauri یا حتی روی خود ESP32 اجرا شود.
3. **Worker-per-Task:** هر کار سنگین در Worker جدا: Parser, DSP, AI. UI هرگز فریز نمی‌شود (مثل edf-bdf-WR).

---

### ۲. دیاگرام کلی سیستم

```
┌──────────────────────────────────────────────────────────────────┐
│                        RotaTag Hardware                          │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐             │
│  │ ADXL345 │  │  Temp   │  │  ESP32  │  │ microSD │ 12.8kHz     │
│  │ 3-Axis  │─▶│  DS18B20│─▶│  S3     │─▶│  8GB    │────────────┐  │
│  │ ±16g    │  │         │  │  FW     │  │         │            │  │
│  └─────────┘  └─────────┘  └────┬────┘  └─────────┘            │  │
│                                 │ USB-C / BLE 5.0               │  │
└─────────────────────────────────┼───────────────────────────────┘  │
                                  │                                  │
┌─────────────────────────────────┼───────────────────────────────┐  │
│              Laptop (Windows/macOS/Linux) 100% Offline           │  │
│                                 ▼                                  │
│  ┌──────────────────────────────────────────────────────────┐   │  │
│  │              RotaLab Desktop (Electron + Vite)           │   │  │
│  │  ┌──────────────────────────────────────────────────┐  │   │  │
│  │  │  UI Layer (React 18)                             │  │   │  │
│  │  │  - DropZone, Transport, ChannelList, Spectrum    │  │   │  │
│  │  │  - PDF Export, شمسی Date, RTL Support            │  │   │  │
│  │  └──────────────┬───────────────────────────────────┘  │   │  │
│  │                 │ postMessage (transferable)            │   │  │
│  │  ┌──────────────▼──────────────┐  ┌──────────────────┐  │   │  │
│  │  │  Core: @rotamind/parser    │  │ @rotamind/dsp    │  │   │  │
│  │  │  - CSV/TDMS/MAT/IDE reader │  │ - Butterworth    │  │   │  │
│  │  │  - Chunked File.slice 4MB  │  │ - Envelope       │  │   │  │
│  │  │  - ISO 10816 cal           │  │ - Spectral Kurt. │  │   │  │
│  │  └──────────────┬──────────────┘  └────────┬─────────┘  │   │  │
│  │                 │                          │            │   │  │
│  │  ┌──────────────▼──────────────────────────▼─────────┐  │   │  │
│  │  │  Renderer: @rotamind/signal-render               │  │   │  │
│  │  │  Canvas2D + min/max decimation (از edf-bdf-WR) │  │   │  │
│  │  │  HiDPI, 60fps, rAF, 8ch x 1400px                │  │   │  │
│  │  └──────────────────────────────────────────────────┘  │   │  │
│  └──────────────────────┬───────────────────────────────────┘   │  │
│                         │ IPC (Electron) / HTTP (localhost)      │  │
│  ┌──────────────────────▼───────────────────────────────────┐   │  │
│  │         PhyQ Lite Inference Engine (Python)              │   │  │
│  │  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐   │   │  │
│  │  │  FastAPI    │  │  ONNX Runtime│  │  Post-Proc   │   │   │  │
│  │  │  localhost  │─▶│  phyq.onnx  │─▶│  Explainable │   │   │  │
│  │  │  :8000      │  │  INT8 1.4M   │  │  Spectrum    │   │   │  │
│  │  └─────────────┘  └──────────────┘  └──────────────┘   │   │  │
│  └──────────────────────────────────────────────────────────┘   │  │
└──────────────────────────────────────────────────────────────────┘  │
```

---

### ۳. پشته فناوری (Tech Stack)

| لایه | انتخاب | دلیل (تجربه ۱۵ ساله) |
| :--- | :--- | :--- |
| **زبان اصلی** | TypeScript Strict | از edf-bdf-WR به ارث رسیده، قابل نگهداری |
| **بیلد** | Vite + Electron-Builder | بیلد آفلاین `dist-offline` آماده، نصب با یک کلیک |
| **UI** | React 18 + Zustand (به جای Redux) | ساده، سریع، فارسی/RTL راحت |
| **رندر** | Canvas 2D (فاز ۱) → WebGL (فاز ۲) | کد `renderer.ts` تو را بدون تغییر می‌آوریم، فقط محور Y از µV به g تغییر می‌کند |
| **Worker** | Web Worker + Comlink | Parser/DSP/AI هرگز UI را بلاک نمی‌کنند |
| **AI Runtime** | ONNX Runtime (Node + Python) | مدل PyTorch تو به ONNX تبدیل می‌شود، روی CPU کارخانه بدون GPU اجرا می‌شود |
| **Firmware** | Arduino-ESP32 + FreeRTOS | ساده‌ترین برای نمونه اولیه، بعداً به ESP-IDF مهاجرت |

---

### ۴. تفکیک ماژول‌ها (Module Map)

#### A) `@rotamind/parser` (انشعاب از `@viewer/edf-parser`)
```
src/core/parser/
├── header.ts      // هدر TDMS/CSV/MAT (جایگزین EDF header 256B)
├── reader.ts      // chunked File.slice برای فایل‌های 1GB ارتعاشی
├── calibration.ts // تبدیل ADC → g (مثل bitvalue/edf، ولی با حساسیت ADXL345)
├── tad.ts         // Time-Annotated Data (مشابه TAL در EDF+، برای RPM/events)
└── index.ts
```
- **API:** `parseVibrationFile(file, {maxSamplesPerChannel}) => Promise<ParseResult>`
- **parity:** خروجی با MATLAB/Rigol/NI-DAQ مقایسه و تست می‌شود (golden vectors)

#### B) `@rotamind/dsp` (انشعاب از `@viewer/dsp`)
```
src/core/dsp/
├── design.ts      // butterSos, notchSos (از تو، بدون تغییر)
├── envelope.ts    // NEW: Hilbert envelope + spectral kurtosis (برای بلبرینگ)
├── order.ts       // NEW: Order tracking (برای گیربکس با دور متغیر)
└── med.ts         // NEW: Minimum Entropy Deconvolution (حذف نویز)
```
- تمام فیلترهای SciPy-exact تو حفظ می‌شوند، فقط ۳ ماژول جدید ارتعاشی اضافه می‌شود.

#### C) `@rotamind/signal-render`
- بدون تغییر منطقی، فقط:
  - لیبل محور Y: `µV` → `g` یا `mm/s`
  - رنگ‌ها: پالت صنعتی (SKF طوسی-نارنجی) به جای سفید بالینی
  - اضافه: خطوط عمودی برای فرکانس‌های عیب (BPFO/BPFI)

#### D) `PhyQ Lite`
```
software/rota-inference/
├── model/
│   ├── phyq_paper.onnx      // 1.4M FP32 → INT8 (7.8MB)
│   ├── phyq_paper.json      // metadata (fs, window, classes)
│   └── scaler.json          // scaler فقط از train (leakage-safe)
├── api/
│   ├── server.py            // FastAPI localhost:8000
│   └── infer.py             // load + predict
└── requirements.txt
```
- **قرارداد IPC:**
```ts
// Electron -> Python
{type: 'infer', id: 123, channels: Float32Array[], fs: 12800, rpm: 1800}
// Python -> Electron
{type: 'result', id: 123, predictions: [{class: 'Outer', prob: 0.97, severity: 'Medium'}], envelope: Float32Array}
```

---

### ۵. جریان داده (Data Flow)

1. **اتصال:** کاربر RotaTag را با USB وصل می‌کند → `navigator.serial` یا `WebUSB` فایل `DATA001.CSV` را می‌خواند (یا درگ-اند-دراپ).
2. **پارسر:** `ViewerStore.loadFile(file)` → Worker پارسر → `Float64Array` کانال‌ها + RPM
3. **نمایش اولیه:** Renderer با min/max decimation در < 100ms رسم می‌کند.
4. **DSP:** کاربر فیلتر Envelope را می‌زند → Worker DSP → طیف جدید
5. **AI:** دکمه "تحلیل هوشمند" → ۸ پنجره ۲۰۴۸ نمونه‌ای به Python فرستاده می‌شود → ONNX → نتیجه + طیف envelope توضیح‌پذیر → UI
6. **گزارش:** دکمه PDF → `jsPDF` + `html2canvas` → فایل شمسی

---

### ۶. امنیت و دانش‌بنیان

- **آفلاین:** `Content-Security-Policy: default-src 'self'` — هیچ CDN، هیچ تله‌متری
- **امضا:** بیلد Electron با `electron-builder --publish never` — قابل ارائه به حراست کارخانه
- **ممیزی:** `npm audit` و `pip audit` در CI

---

### ۷. تصمیمات معماری کلیدی (ADRs)

**ADR-001: چرا Electron و نه Tauri/PWA؟**
- چون edf-bdf-WR تو از قبل Electron دارد و بیلد آفلاینش تست شده. Tauri برای فاز ۲ (حجم کمتر) بررسی می‌شود.

**ADR-002: چرا ONNX INT8 و نه PyTorch؟**
- کارخانه GPU ندارد. ONNX روی CPU ۵ برابر سریع‌تر است و با `onnxruntime==1.17` روی Win7 هم کار می‌کند.

**ADR-003: چرا Canvas2D و نه WebGL فعلاً؟**
- ریسک کمتر برای MVP. کد فعلی تو ۶۰fps را با ۸ کانال می‌دهد. WebGL برای ۳۲ کانال لازم است که در فاز ۱ نداریم.

---

*سند بعدی: `HARDWARE_SPEC.md` — طراحی RotaTag*
