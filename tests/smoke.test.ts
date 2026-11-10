import { describe, it, expect } from 'vitest';
import { parseVibrationFile } from '../software/rotaviewer/src/core/parser';
import { envelopeSpectrum, faultFreqs } from '../software/rotaviewer/src/core/dsp';

describe('RotaMind MVP Smoke', () => {
  it('parses CSV', async () => {
    const csv = 'timestamp_ms,ax_g,ay_g\n0,0.1,0.2\n0.078,0.3,0.4\n';
    const file = new File([csv], 'test.csv', { type: 'text/csv' });
    const res = await parseVibrationFile(file);
    expect(res.channels.length).toBe(2);
    expect(res.header.format).toBe('CSV');
  });
  it('computes fault freqs', () => {
    const f = faultFreqs({ n:9, d:7.94, D:39.04, alphaDeg:0 }, 1500);
    expect(f.BPFO).toBeCloseTo(89, 0);
    expect(f.BPFI).toBeCloseTo(136, 0);
  });
  it('envelope spectrum', () => {
    const x = new Float64Array(4096).fill(0).map((_,i)=> Math.sin(2*Math.PI*87*i/12800));
    const { freqs, mag } = envelopeSpectrum(x, 12800);
    expect(freqs.length).toBeGreaterThan(0);
  });
});
