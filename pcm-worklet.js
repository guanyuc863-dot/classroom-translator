// Captures audio, mixes to mono, resamples to 16 kHz and posts 100 ms chunks of int16 PCM.
class PcmCapture extends AudioWorkletProcessor {
  constructor() {
    super();
    this.ratio = sampleRate / 16000; // sampleRate is the AudioContext rate (global in worklet scope)
    this.out = new Int16Array(1600);
    this.n = 0;
    this.acc = 0;
    this.accN = 0;
    this.phase = 0;
    this.sq = 0;
  }

  push(v) {
    const s = v > 1 ? 1 : v < -1 ? -1 : v;
    this.out[this.n++] = s < 0 ? s * 32768 : s * 32767;
    this.sq += s * s;
    if (this.n === this.out.length) {
      const rms = Math.sqrt(this.sq / this.n);
      this.port.postMessage({ pcm: this.out.buffer, rms }, [this.out.buffer]);
      this.out = new Int16Array(1600);
      this.n = 0;
      this.sq = 0;
    }
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || !input[0]) return true;
    const a = input[0];
    const b = input[1];
    for (let i = 0; i < a.length; i++) {
      const v = b ? 0.5 * (a[i] + b[i]) : a[i];
      if (this.ratio === 1) {
        this.push(v);
        continue;
      }
      // box-filter decimation: average the input samples that fall into each output sample
      this.acc += v;
      this.accN++;
      this.phase += 1;
      if (this.phase >= this.ratio) {
        this.phase -= this.ratio;
        this.push(this.acc / this.accN);
        this.acc = 0;
        this.accN = 0;
      }
    }
    return true;
  }
}

registerProcessor('pcm-capture', PcmCapture);
