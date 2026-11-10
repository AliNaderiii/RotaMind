"""
RotaTag Simulator — تولید دیتای ارتعاشی مصنوعی برای تست RotaLab بدون سخت‌افزار
نویسنده: تیم AI + مکانیک
استفاده: python simulator.py --fault outer --snr -4 --rpm 1500 --duration 10 --out sample.csv
"""

import argparse
import numpy as np
import pandas as pd

# فرکانس‌های عیب برای 6205 (n=9, d=7.94mm, D=39.04mm)
def get_fault_freqs(rpm, bearing="6205"):
    fr = rpm / 60.0
    # برای 6205 ساده شده
    bpfo = 3.58 * fr
    bpfi = 5.42 * fr
    bsf = 2.32 * fr
    ftf = 0.40 * fr
    return {"BPFO": bpfo, "BPFI": bpfi, "BSF": bsf, "FTF": ftf, "FR": fr}

def generate_bearing_signal(duration=10, fs=12800, rpm=1500, fault="normal", snr_db=20, seed=0):
    np.random.seed(seed)
    n = int(duration * fs)
    t = np.arange(n) / fs
    
    fr = rpm / 60.0
    freqs = get_fault_freqs(rpm)
    
    # سیگنال پایه: نویز سفید + هارمونیک دور
    x = 0.05 * np.random.randn(n)
    x += 0.02 * np.sin(2*np.pi*fr*t)  # imbalance
    x += 0.01 * np.sin(2*np.pi*2*fr*t) # misalignment
    
    if fault == "outer":
        f_fault = freqs["BPFO"]
        # ضربه‌های تناوبی با مدولاسیون
        impulses = np.zeros(n)
        period = int(fs / f_fault)
        for i in range(0, n, period):
            if i < n:
                # شکل ضربه: سینک
                win = np.hanning(40)
                # میرایی
                burst = win * np.sin(2*np.pi*3000 * np.arange(len(win))/fs) * np.exp(-np.arange(len(win))/10)
                end = min(i+len(burst), n)
                impulses[i:end] += burst[:end-i] * 2.0
        x += impulses
        # هارمونیک‌ها
        x += 0.3 * np.sin(2*np.pi*f_fault*t) * (1 + 0.5*np.sin(2*np.pi*fr*t))
        x += 0.15 * np.sin(2*np.pi*2*f_fault*t)
        
    elif fault == "inner":
        f_fault = freqs["BPFI"]
        # مدوله شده با دور
        x += 0.5 * np.sin(2*np.pi*f_fault*t) * (1 + 0.8*np.sin(2*np.pi*fr*t))
        x += 0.2 * np.sin(2*np.pi*2*f_fault*t)
        
    elif fault == "ball":
        f_fault = freqs["BSF"]
        x += 0.4 * np.sin(2*np.pi*f_fault*t) * (1 + 0.3*np.sin(2*np.pi*freqs["FTF"]*t))
    
    # نویز
    if snr_db is not None:
        sig_power = np.mean(x**2)
        snr_linear = 10**(snr_db/10)
        noise_power = sig_power / snr_linear if snr_linear > 0 else sig_power * 10
        noise = np.sqrt(noise_power) * np.random.randn(n)
        x_noisy = x + noise
    else:
        x_noisy = x
        noise = np.zeros(n)
    
    # سه محوره: ax اصلی، ay/az با تاخیر و نویز بیشتر
    ax = x_noisy
    ay = 0.7 * x_noisy + 0.05*np.random.randn(n)
    az = 0.3 * x_noisy + 0.05*np.random.randn(n) + 1.0  # گرانش روی Z
    
    df = pd.DataFrame({
        "timestamp_ms": t*1000,
        "ax_g": ax,
        "ay_g": ay,
        "az_g": az,
        "temp_c": 42.0 + 0.5*np.random.randn(n),
        "rpm_est": rpm + 5*np.random.randn(n)
    })
    return df, freqs, x, noise

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="RotaTag Simulator")
    parser.add_argument("--fault", choices=["normal","outer","inner","ball"], default="outer")
    parser.add_argument("--snr", type=float, default=-4, help="SNR in dB")
    parser.add_argument("--rpm", type=int, default=1500)
    parser.add_argument("--duration", type=int, default=10)
    parser.add_argument("--fs", type=int, default=12800)
    parser.add_argument("--out", type=str, default="sample_bearing_outer.csv")
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()
    
    df, freqs, clean, noise = generate_bearing_signal(
        duration=args.duration, fs=args.fs, rpm=args.rpm, 
        fault=args.fault, snr_db=args.snr, seed=args.seed
    )
    
    df.to_csv(args.out, index=False, float_format="%.5f")
    print(f"✅ Generated {args.out}")
    print(f"   Fault: {args.fault}, SNR: {args.snr}dB, RPM: {args.rpm}")
    print(f"   Freqs: {freqs}")
    print(f"   Samples: {len(df)}, Duration: {args.duration}s, FS: {args.fs}Hz")
    print(f"   Preview:")
    print(df.head().to_string())
