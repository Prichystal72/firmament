// Vysilacka: predgenerovane repliky pilotu (zvuky/vysilacka, uz se zvukem dobove vysilacky),
// k tomu cvaknuti, sum mezi replikami a ztlumeni hudby behem hovoru. Texty jsou v repliky.js.
import { UDALOSTI, ROZHOVORY } from './repliky.js';
import { SOUBORY } from './vysilacka_soubory.js';

const PAUZA_ROZHOVORU_S = [12, 26];   // rozsah nahodne pauzy mezi rozhovory
const PAUZA_MEZI_REPLIKAMI_S = 0.3;
const ZTLUMENI_HUDBY = 0.45;
const HLASITOST = 0.9;

const zamichej = (pole) => {
  const p = [...pole];
  for (let i = p.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  return p;
};
const klic = ([mluvci, text]) => `${mluvci}|${text}`;

export class Vysilacka {
  constructor(zvuk, hudba) {
    this.zvuk = zvuk;
    this.hudba = hudba;
    this.zapnuta = true;
    this.cache = new Map();   // klic -> Promise<AudioBuffer>
    this.fronta = [];
    this.mluvi = false;
    this.hovor = 0;           // cislo hovoru; preruseny hovor uz nepokracuje
    this.doRozhovoru_s = 10;
    this.posledni = {};
    this.poradi = [];
  }

  _nacti(replika) {
    const k = klic(replika);
    if (!this.cache.has(k)) {
      const soubor = SOUBORY[k];
      if (!soubor) return Promise.reject(new Error(`chybi zvuk repliky: ${k}`));
      this.cache.set(k, fetch(soubor)
        .then((r) => { if (!r.ok) throw new Error(`${soubor}: HTTP ${r.status}`); return r.arrayBuffer(); })
        .then((data) => this.zvuk.ctx.decodeAudioData(data)));
    }
    return this.cache.get(k);
  }

  // Repliky k udalostem nacist predem, aby zazneli hned.
  pripravUdalosti() {
    for (const repliky of Object.values(UDALOSTI)) for (const r of repliky) this._nacti(r).catch(() => {});
  }

  prepni() {
    this.zapnuta = !this.zapnuta;
    if (!this.zapnuta) this._zrus();
  }

  _zrus() {
    this.hovor++;
    this.fronta = [];
    if (this.zdroj) this.zdroj.stop();
    if (this.zastavSum) this.zastavSum();
    this.zdroj = this.zastavSum = null;
    this.mluvi = false;
  }

  // Replika k udalosti; dulezite = prerusi probihajici rozhovor.
  rekni(druh, dulezite = false) {
    if (!this.zapnuta || !this.zvuk.ctx) return;
    if (this.mluvi && !dulezite) return;
    const moznosti = UDALOSTI[druh].filter((r) => r !== this.posledni[druh]);
    const replika = moznosti[Math.floor(Math.random() * moznosti.length)];
    this.posledni[druh] = replika;
    this._zrus();
    this._spust([replika]);
  }

  // Dalsi rozhovor; poradi se zamicha a opakuje az po vycerpani vsech (vic nez pul hodiny).
  _rozhovor() {
    if (!this.poradi.length) this.poradi = zamichej(ROZHOVORY);
    this._spust(this.poradi.pop());
  }

  _spust(repliky) {
    this.fronta = [...repliky];
    this.doRozhovoru_s = PAUZA_ROZHOVORU_S[0] + Math.random() * (PAUZA_ROZHOVORU_S[1] - PAUZA_ROZHOVORU_S[0]);
    for (const r of repliky) this._nacti(r).catch(() => {});
    this.mluvi = true;
    this.hudba.ztlum(ZTLUMENI_HUDBY);
    this.zastavSum = this.zvuk.sumVysilacky();
    this._dalsi(this.hovor);
  }

  async _dalsi(hovor) {
    const replika = this.fronta.shift();
    if (!replika) {
      if (this.zastavSum) this.zastavSum();
      this.zastavSum = null;
      this.mluvi = false;
      this.hudba.ztlum(1);
      return;
    }
    let buffer;
    try {
      buffer = await this._nacti(replika);
    } catch (chyba) {
      console.warn('Vysílačka:', chyba.message);
      this._dalsi(hovor);
      return;
    }
    if (hovor !== this.hovor) return;
    const ctx = this.zvuk.ctx;
    this.zvuk.cvak();
    const zdroj = ctx.createBufferSource();
    zdroj.buffer = buffer;
    const g = ctx.createGain();
    g.gain.value = HLASITOST;
    zdroj.connect(g).connect(this.zvuk.hlavni);
    zdroj.onended = () => {
      if (hovor !== this.hovor) return;
      this.zvuk.cvak();
      setTimeout(() => this._dalsi(hovor), PAUZA_MEZI_REPLIKAMI_S * 1000);
    };
    zdroj.start(ctx.currentTime + 0.05);
    this.zdroj = zdroj;
  }

  // Rozhovory behem hry.
  aktualizuj(dt, hraBezi) {
    if (!hraBezi || !this.zapnuta || this.mluvi) return;
    this.doRozhovoru_s -= dt;
    if (this.doRozhovoru_s <= 0) this._rozhovor();
  }
}
