// Zvukovy engine: varhany s omezenim na 16 hlasu, dozvuk kostela a syntetizovane efekty.
const MAX_HLASU = 16;
const NABEH_S = 0.012;
const DOZNENI_S = 0.09;
// Rejstriky varhan: amplitudy harmonickych (index 1 = zakladni ton)
const REJSTRIKY = [0, 1.0, 0.75, 0.45, 0.4, 0.12, 0.28, 0.05, 0.22];

export class Zvuk {
  constructor() {
    this.ctx = null;
    this.hlasy = [];   // [od, do] naplanovanych tonu kvuli limitu 16 hlasu
  }

  start() {
    if (this.ctx) { this.ctx.resume(); return; }
    const ctx = (this.ctx = new AudioContext());
    const komp = ctx.createDynamicsCompressor();
    komp.threshold.value = -12;
    komp.ratio.value = 4;
    komp.connect(ctx.destination);
    this.hlavni = this._zesileni(0.8, komp);
    this.dozvuk = ctx.createConvolver();
    this.dozvuk.buffer = this._impuls(3.5, 2.8);
    this.dozvuk.connect(this._zesileni(0.45, this.hlavni));
    this.hudbaVstup = this._zesileni(0.55, this.hlavni);
    this.hudbaVstup.connect(this.dozvuk);
    this.efekty = this._zesileni(0.75, this.hlavni);
    this.efekty.connect(this._zesileni(0.2, this.dozvuk));
    this.sum = this._sum(1.5);
    this.vlnaVarhan = ctx.createPeriodicWave(new Float32Array(REJSTRIKY.length), new Float32Array(REJSTRIKY));
  }

  _zesileni(hodnota, cil) {
    const g = this.ctx.createGain();
    g.gain.value = hodnota;
    if (cil) g.connect(cil);
    return g;
  }

  _impuls(delka_s, utlum) {
    const delka = Math.floor(this.ctx.sampleRate * delka_s);
    const buf = this.ctx.createBuffer(2, delka, this.ctx.sampleRate);
    for (let k = 0; k < 2; k++) {
      const d = buf.getChannelData(k);
      for (let i = 0; i < delka; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / delka, utlum);
    }
    return buf;
  }

  _sum(delka_s) {
    const buf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * delka_s), this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  varhany(cas, frekvence, delka_s, hlasitost, cil) {
    if (!this.ctx) return;
    const konec = cas + delka_s + DOZNENI_S;
    this.hlasy = this.hlasy.filter(([, k]) => k > this.ctx.currentTime);
    if (this.hlasy.filter(([o, k]) => o <= cas && k > cas).length >= MAX_HLASU) return;
    this.hlasy.push([cas, konec]);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, cas);
    g.gain.linearRampToValueAtTime(hlasitost, cas + NABEH_S);
    g.gain.setValueAtTime(hlasitost, cas + delka_s);
    g.gain.linearRampToValueAtTime(0, konec);
    g.connect(cil);
    for (const rozladeni_centu of [0, 5]) { // dve mirne rozladene pistaly = sirsi zvuk
      const o = this.ctx.createOscillator();
      o.setPeriodicWave(this.vlnaVarhan);
      o.frequency.value = frekvence;
      o.detune.value = rozladeni_centu;
      o.connect(g);
      o.start(cas);
      o.stop(konec + 0.02);
    }
  }

  zrusHlasy() { this.hlasy = []; }

  vystrel() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    o.type = 'square';
    o.frequency.setValueAtTime(1500, t);
    o.frequency.exponentialRampToValueAtTime(220, t + 0.13);
    const g = this._zesileni(0, this.efekty);
    g.gain.setValueAtTime(0.08, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    o.connect(g);
    o.start(t);
    o.stop(t + 0.16);
  }

  vybuch(sila = 1) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const delka = 0.35 + 0.5 * sila;
    const zdroj = this.ctx.createBufferSource();
    zdroj.buffer = this.sum;
    const filtr = this.ctx.createBiquadFilter();
    filtr.type = 'lowpass';
    filtr.frequency.setValueAtTime(3200, t);
    filtr.frequency.exponentialRampToValueAtTime(90, t + delka);
    const g = this._zesileni(0, this.efekty);
    g.gain.setValueAtTime(0.7 * sila, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + delka);
    zdroj.connect(filtr).connect(g);
    zdroj.start(t);
    zdroj.stop(t + delka);
    // basovy uder
    const o = this.ctx.createOscillator();
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(38, t + 0.25);
    const g2 = this._zesileni(0, this.efekty);
    g2.gain.setValueAtTime(0.9 * sila, t);
    g2.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    o.connect(g2);
    o.start(t);
    o.stop(t + 0.32);
  }

  zasahStitu() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const zdroj = this.ctx.createBufferSource();
    zdroj.buffer = this.sum;
    const filtr = this.ctx.createBiquadFilter();
    filtr.type = 'highpass';
    filtr.frequency.value = 1200;
    const g = this._zesileni(0, this.efekty);
    g.gain.setValueAtTime(0.25, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    zdroj.connect(filtr).connect(g);
    zdroj.start(t, Math.random());
    zdroj.stop(t + 0.09);
  }

  // Cvaknuti tlacitka vysilacky.
  cvak() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    o.type = 'square';
    o.frequency.value = 1100;
    const g = this._zesileni(0, this.efekty);
    g.gain.setValueAtTime(0.05, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
    o.connect(g);
    o.start(t);
    o.stop(t + 0.05);
  }

  // Sum vysilacky behem hovoru (pasmo jako stare radio). Vrati funkci, ktera ho zastavi.
  sumVysilacky() {
    if (!this.ctx) return () => {};
    const t = this.ctx.currentTime;
    const zdroj = this.ctx.createBufferSource();
    zdroj.buffer = this.sum;
    zdroj.loop = true;
    const filtr = this.ctx.createBiquadFilter();
    filtr.type = 'bandpass';
    filtr.frequency.value = 1900;
    filtr.Q.value = 0.8;
    const g = this._zesileni(0, this.efekty);
    g.gain.setTargetAtTime(0.06, t, 0.02);
    zdroj.connect(filtr).connect(g);
    zdroj.start(t);
    return () => {
      const k = this.ctx.currentTime;
      g.gain.setTargetAtTime(0, k, 0.03);
      zdroj.stop(k + 0.2);
    };
  }

  // Vrati funkci, ktera zvuk UFO zastavi.
  ufoStart() {
    if (!this.ctx) return () => {};
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = 620;
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 7;
    const hloubka = this._zesileni(160, o.frequency);
    lfo.connect(hloubka);
    const filtr = this.ctx.createBiquadFilter();
    filtr.type = 'lowpass';
    filtr.frequency.value = 1600;
    const g = this._zesileni(0, this.efekty);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.05, t + 0.3);
    o.connect(filtr).connect(g);
    o.start(t);
    lfo.start(t);
    return () => {
      const k = this.ctx.currentTime;
      g.gain.setTargetAtTime(0, k, 0.05);
      o.stop(k + 0.4);
      lfo.stop(k + 0.4);
    };
  }
}
