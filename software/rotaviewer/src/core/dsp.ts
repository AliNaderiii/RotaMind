/**
 * @rotamind/dsp — DSP for Vibration
 * انشعاب از @viewer/dsp (edf-bdf-WR) با 3 ماژول جدید ارتعاشی
 */

// === از edf-bdf-WR به ارث رسیده (SciPy-exact) ===
export type Sos = [number, number, number, number, number, number];
export type SosArray = Sos[];

// Butterworth design (stub — در نسخه کامل از edf-bdf-WR کپی می‌شود)
export function butterSos(order: number, cutoffHz: number, fs: number, type: 'lowpass'|'highpass'): SosArray {
  // simplified: 1 biquad for MVP — در نسخه اصلی SciPy parity دارد
  const w0 = 2 * Math.PI * cutoffHz / fs;
  const Q = 1/Math.sqrt(2);
  const alpha = Math.sin(w0)/(2*Q);
  let b0,b1,b2,a0,a1,a2;
  if (type === 'lowpass') {
    b0 = (1-Math.cos(w0))/2; b1=1-Math.cos(w0); b2=(1-Math.cos(w0))/2;
    a0=1+alpha; a1=-2*Math.cos(w0); a2=1-alpha;
  } else {
    b0=(1+Math.cos(w0))/2; b1=-(1+Math.cos(w0)); b2=(1+Math.cos(w0))/2;
    a0=1+alpha; a1=-2*Math.cos(w0); a2=1-alpha;
  }
  return [[b0/a0,b1/a0,b2/a0,1,a1/a0,a2/a0]];
}
export function notchSos(freqHz: number, q: number, fs: number): SosArray {
  const w0=2*Math.PI*freqHz/fs; const alpha=Math.sin(w0)/(2*q);
  const b0=1, b1=-2*Math.cos(w0), b2=1;
  const a0=1+alpha, a1=-2*Math.cos(w0), a2=1-alpha;
  return [[b0/a0,b1/a0,b2/a0,1,a1/a0,a2/a0]];
}
export function sosfilt(sos: SosArray, x: Float64Array): Float64Array {
  const y = new Float64Array(x.length);
  // transposed DF-II per sos (simplified)
  for (const s of sos) {
    const [b0,b1,b2,_,a1,a2] = s;
    let z1=0,z2=0;
    for(let i=0;i<x.length;i++){
      const xv = (s===sos[0]? x[i]: y[i]);
      const yv = b0*xv + z1;
      z1 = b1*xv - a1*yv + z2;
      z2 = b2*xv - a2*yv;
      y[i]=yv;
    }
  }
  return y;
}

// === NEW: Envelope Analysis (برای بلبرینگ) ===
export function envelopeSpectrum(x: Float64Array, fs: number): { freqs: Float64Array, mag: Float64Array } {
  // 1) Bandpass 1-5kHz (برای ضربه)
  const bp = sosfilt([...butterSos(4, 1000, fs, 'highpass'), ...butterSos(4, 5000, fs, 'lowpass')], x);
  // 2) Hilbert envelope via analytic signal (simplified: rectify + lowpass)
  const rect = new Float64Array(bp.length);
  for(let i=0;i<bp.length;i++) rect[i]=Math.abs(bp[i]);
  const env = sosfilt(butterSos(4, 500, fs, 'lowpass'), rect);
  // 3) FFT of envelope (naive DFT for MVP - در نسخه اصلی با FFTW)
  const n = 1<<Math.ceil(Math.log2(env.length));
  const mag = new Float64Array(n/2);
  const freqs = new Float64Array(n/2);
  // Use simple periodogram
  for(let k=0;k<n/2;k++){
    let re=0, im=0;
    for(let i=0;i<env.length;i++){
      const ang = 2*Math.PI*k*i/n;
      re += env[i]*Math.cos(ang);
      im -= env[i]*Math.sin(ang);
    }
    mag[k] = Math.sqrt(re*re+im*im)/n;
    freqs[k] = k*fs/n;
  }
  return { freqs, mag };
}

// === NEW: Fault Frequencies ===
export interface BearingGeometry { n: number; d: number; D: number; alphaDeg: number; }
export function faultFreqs(geom: BearingGeometry, rpm: number){
  const fr = rpm/60;
  const dD = geom.d/geom.D;
  const cosA = Math.cos(geom.alphaDeg*Math.PI/180);
  return {
    FR: fr,
    BPFO: (geom.n/2)*fr*(1 - dD*cosA),
    BPFI: (geom.n/2)*fr*(1 + dD*cosA),
    BSF: (geom.D/(2*geom.d))*fr*(1 - Math.pow(dD*cosA,2)),
    FTF: 0.5*fr*(1 - dD*cosA),
  };
}

// === NEW: Spectral Kurtosis (برای انتخاب باند بهینه) ===
export function spectralKurtosis(x: Float64Array, fs: number, nperseg=256): { freqs: Float64Array, kurt: Float64Array } {
  // simplified
  const nseg = Math.floor(x.length/nperseg);
  const kurt = new Float64Array(nperseg/2);
  const freqs = new Float64Array(nperseg/2);
  for(let k=0;k<nperseg/2;k++){
    const vals: number[] = [];
    for(let s=0;s<nseg;s++){
      let re=0, im=0;
      for(let i=0;i<nperseg;i++){
        const ang=2*Math.PI*k*i/nperseg;
        re += x[s*nperseg+i]*Math.cos(ang);
        im -= x[s*nperseg+i]*Math.sin(ang);
      }
      vals.push(re*re+im*im);
    }
    const m = vals.reduce((a,b)=>a+b,0)/vals.length;
    const m2 = vals.reduce((a,b)=>a+(b-m)**2,0)/vals.length;
    const m4 = vals.reduce((a,b)=>a+Math.pow(b-m,4),0)/vals.length;
    kurt[k] = m4/(m2*m2+1e-12) - 3;
    freqs[k] = k*fs/nperseg;
  }
  return { freqs, kurt };
}
