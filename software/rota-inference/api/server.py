"""
RotaMind PhyQ Lite — FastAPI localhost inference
طراح: متخصص AI + مهندس نرم‌افزار بک
اجرا: python api/server.py --offline
API: http://localhost:8000/docs
"""

from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import numpy as np
import onnxruntime as ort
import json
import os
from pathlib import Path

app = FastAPI(title="RotaMind PhyQ Lite", version="1.0-MVP", description="Offline bearing fault diagnosis - PhyQ-TransNet 1.4M ONNX")

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

MODEL_PATH = Path(__file__).parent.parent / "model" / "phyq_paper.onnx"
SCALER_PATH = Path(__file__).parent.parent / "model" / "scaler.json"

# Fallback mock if ONNX not yet exported (for MVP demo without GPU)
MOCK_MODE = not MODEL_PATH.exists()

CLASSES = ["Normal", "Outer", "Inner", "Ball", "Cage"]
# رنگ‌ها برای UI
COLORS = {"Normal": "#2ecc71", "Outer": "#e74c3c", "Inner": "#e67e22", "Ball": "#9b59b6", "Cage": "#3498db"}

if not MOCK_MODE:
    sess = ort.InferenceSession(str(MODEL_PATH), providers=["CPUExecutionProvider"])
    print(f"✅ Loaded ONNX: {MODEL_PATH} ({os.path.getsize(MODEL_PATH)/1e6:.1f} MB)")
else:
    print("⚠️  ONNX not found — running in MOCK mode (for UI demo). Export real model with scripts/export_onnx.py")

with open(SCALER_PATH) as f:
    scaler = json.load(f) if SCALER_PATH.exists() else {"mean": 0.0, "std": 1.0}

@app.get("/health")
def health():
    return {"status": "ok", "model": "PhyQ-TransNet 1.4M" if not MOCK_MODE else "MOCK", "classes": CLASSES}

@app.post("/infer")
async def infer(file: UploadFile = File(...), rpm: float = 1500, fs: int = 12800):
    """
    ورودی: CSV با ستون ax_g (یا هر کانال ارتعاش)
    خروجی: {fault, confidence, severity, all_probs, envelope}
    """
    data = await file.read()
    # parse CSV simple
    import io
    text = data.decode('utf-8', errors='ignore')
    lines = text.strip().splitlines()
    header = lines[0].lower()
    cols = header.split(',')
    idx = next((i for i,c in enumerate(cols) if 'ax' in c), 1)
    vals = []
    for line in lines[1:]:
        try:
            vals.append(float(line.split(',')[idx]))
        except:
            continue
    x = np.array(vals, dtype=np.float32)
    if len(x) < 2048:
        return {"error": "Need at least 2048 samples (~0.16s at 12.8kHz)"}
    
    # windowing: take middle 2048
    # in real: sliding window + vote
    window = x[len(x)//2 - 1024 : len(x)//2 + 1024]
    # normalize with train scaler (leakage-safe)
    window = (window - scaler["mean"]) / (scaler["std"] + 1e-8)
    
    if MOCK_MODE:
        # Mock logic: detect outer fault by energy at BPFO-like freq
        # این فقط برای دموست — مدل واقعی جایگزین می‌شود
        # simple heuristic: if kurtosis high -> Outer
        kurt = np.mean((window - window.mean())**4) / (np.var(window)**2 + 1e-8) - 3
        if kurt > 5:
            pred = "Outer"
            conf = 0.92
        elif kurt > 2:
            pred = "Inner"
            conf = 0.78
        else:
            pred = "Normal"
            conf = 0.94
        probs = {c: (conf if c==pred else (1-conf)/4) for c in CLASSES}
    else:
        # real ONNX
        inputs = {"input": window[np.newaxis, np.newaxis, :]}  # (1,1,2048)
        logits = sess.run(None, inputs)[0]
        # softmax
        e = np.exp(logits - logits.max())
        probs_arr = e / e.sum()
        idx_pred = int(np.argmax(probs_arr))
        pred = CLASSES[idx_pred]
        conf = float(probs_arr[0, idx_pred])
        probs = {c: float(probs_arr[0,i]) for i,c in enumerate(CLASSES)}
    
    severity = "Low" if conf < 0.7 else "Medium" if conf < 0.9 else "High"
    if pred == "Normal":
        severity = "None"
        recommendation = "وضعیت عالی — پایش ماهانه"
    elif pred == "Outer":
        recommendation = "عیب رینگ خارجی — برنامه تعویض 2-3 هفته آینده، روانکاری را چک کنید"
    elif pred == "Inner":
        recommendation = "عیب رینگ داخلی — پایش هفتگی، آماده تعویض"
    else:
        recommendation = f"عیب {pred} — با متخصص ارتعاشات مشورت کنید"
    
    # envelope for explainability (simple)
    # در نسخه اصلی از dsp.envelopeSpectrum استفاده می‌کنیم
    return {
        "fault": pred,
        "confidence": round(conf,3),
        "severity": severity,
        "all_probs": probs,
        "rpm": rpm,
        "fs": fs,
        "samples": len(x),
        "recommendation": recommendation,
        "color": COLORS[pred],
        "mode": "MOCK" if MOCK_MODE else "ONNX"
    }

@app.get("/")
def root():
    return {"name": "RotaMind PhyQ Lite", "docs": "/docs", "health": "/health"}

if __name__ == "__main__":
    import uvicorn
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument("--offline", action="store_true")
    args = parser.parse_args()
    print(f"🚀 RotaMind Inference on http://localhost:{args.port} (offline={args.offline})")
    uvicorn.run(app, host="127.0.0.1", port=args.port)
