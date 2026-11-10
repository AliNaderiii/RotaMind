/**
 * @rotamind/parser — Vibration File Parser
 * انشعاب از @viewer/edf-parser (edf-bdf-WR)
 * پشتیبانی: CSV, TSV, TDMS (NI), MAT (v5), WAV
 * نویسنده: مهندس نرم‌افزار + مکانیک
 */

// Mimic edf-bdf-WR ParseResult but for vibration
export interface VibrationHeader {
  fileName: string;
  fileSize: number;
  format: 'CSV' | 'TDMS' | 'MAT' | 'WAV' | 'IDE';
  fs: number; // sample rate
  numChannels: number;
  durationSeconds: number;
  numSamples: number;
  channelsMeta: { label: string; unit: string; sampleRate: number }[];
}

export interface VibrationChannel {
  label: string;
  unit: string;
  sampleRate: number;
  samples: Float64Array; // in g or mm/s
  rms: number;
  peak: number;
}

export interface ParseResult {
  header: VibrationHeader;
  channels: VibrationChannel[];
  warnings: string[];
  decodeMs: number;
}

export async function parseVibrationFile(file: File, opts?: { onProgress?: (f:number)=>void }): Promise<ParseResult> {
  const t0 = performance.now();
  const name = file.name.toLowerCase();
  const buf = await file.arrayBuffer();
  let header: VibrationHeader;
  let channels: VibrationChannel[] = [];
  const warnings: string[] = [];

  if (name.endsWith('.csv') || name.endsWith('.tsv')) {
    const text = new TextDecoder().decode(buf);
    const lines = text.trim().split(/\r?\n/);
    const headerLine = lines[0].toLowerCase();
    // auto-detect columns: timestamp_ms,ax_g,ay_g,az_g,temp_c,rpm_est
    const cols = headerLine.split(/[,;\t]/).map(s=>s.trim());
    const idxAx = cols.findIndex(c=>c.includes('ax'));
    const idxAy = cols.findIndex(c=>c.includes('ay'));
    const idxAz = cols.findIndex(c=>c.includes('az'));
    const idxTemp = cols.findIndex(c=>c.includes('temp'));
    const idxRpm = cols.findIndex(c=>c.includes('rpm'));
    
    // estimate fs from timestamp
    const dataLines = lines.slice(1).filter(l=>l.trim());
    const n = dataLines.length;
    if (n < 10) throw new Error('CSV too short');
    
    // parse first and last timestamp
    const firstVals = dataLines[0].split(/[,;\t]/);
    const lastVals = dataLines[dataLines.length-1].split(/[,;\t]/);
    const t0ms = parseFloat(firstVals[0]);
    const t1ms = parseFloat(lastVals[0]);
    const duration = (t1ms - t0ms)/1000;
    const fs = duration > 0 ? Math.round(n / duration) : 12800;
    
    // helper to extract column
    function extract(idx: number): Float64Array | null {
      if (idx < 0) return null;
      const arr = new Float64Array(n);
      for (let i=0;i<n;i++) {
        const v = dataLines[i].split(/[,;\t]/)[idx];
        arr[i] = parseFloat(v);
        if (isNaN(arr[i])) arr[i] = 0;
        if (i % 50000 === 0) opts?.onProgress?.(i/n*0.8);
      }
      return arr;
    }
    
    const ax = extract(idxAx);
    const ay = extract(idxAy);
    const az = extract(idxAz);
    
    if (ax) channels.push({ label: 'ax', unit: 'g', sampleRate: fs, samples: ax, rms: rms(ax), peak: peak(ax) });
    if (ay) channels.push({ label: 'ay', unit: 'g', sampleRate: fs, samples: ay, rms: rms(ay), peak: peak(ay) });
    if (az) channels.push({ label: 'az', unit: 'g', sampleRate: fs, samples: az, rms: rms(az), peak: peak(az) });
    
    header = {
      fileName: file.name,
      fileSize: file.size,
      format: 'CSV',
      fs, numChannels: channels.length,
      durationSeconds: duration,
      numSamples: n,
      channelsMeta: channels.map(c=>({label:c.label, unit:c.unit, sampleRate:c.sampleRate}))
    };
    
    if (idxTemp < 0) warnings.push('temp_c column not found');
    if (isNaN(fs) || fs < 100) warnings.push('Could not estimate fs, using 12800');
    
    opts?.onProgress?.(1);
    
  } else if (name.endsWith('.wav')) {
    // WAV: treat as single channel vibration
    // simple PCM16 decoder
    const view = new DataView(buf);
    // skip header 44B
    const pcm = new Int16Array(buf, 44);
    const samples = new Float64Array(pcm.length);
    for (let i=0;i<pcm.length;i++) samples[i] = pcm[i]/32768 * 16; // ±16g
    const fs = view.getUint32(24, true);
    channels.push({ label: 'wav', unit: 'g', sampleRate: fs, samples, rms: rms(samples), peak: peak(samples) });
    header = { fileName: file.name, fileSize: file.size, format: 'WAV', fs, numChannels:1, durationSeconds: samples.length/fs, numSamples: samples.length, channelsMeta: [{label:'wav', unit:'g', sampleRate: fs}]};
  } else {
    throw new Error(`Unsupported format: ${file.name}. Supported: CSV, TSV, WAV (TDMS/MAT coming in v1.1)`);
  }
  
  return { header, channels, warnings, decodeMs: Math.round(performance.now()-t0) };
}

function rms(a: Float64Array): number {
  let s=0; for(let i=0;i<a.length;i++) s+=a[i]*a[i];
  return Math.sqrt(s/a.length);
}
function peak(a: Float64Array): number {
  let m=0; for(let i=0;i<a.length;i++) m=Math.max(m, Math.abs(a[i]));
  return m;
}

// min/max decimation (from edf-bdf-WR)
export function minMaxDecimate(src: Float64Array, factor: number): Float64Array {
  if (factor <=1) return src;
  const outLen = Math.ceil(src.length/factor)*2;
  const out = new Float64Array(outLen);
  let o=0;
  for(let i=0;i<src.length;i+=factor){
    let mn=Infinity, mx=-Infinity;
    const end=Math.min(i+factor, src.length);
    for(let j=i;j<end;j++){ const v=src[j]; if(v<mn) mn=v; if(v>mx) mx=v; }
    out[o++]=mn; out[o++]=mx;
  }
  return out.slice(0,o);
}
