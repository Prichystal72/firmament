// Dotykove ovladani: tazeni prstu posouva kanon, drzeni prstu strili, klepnuti spousti hru.
export const naMobilu = matchMedia('(pointer: coarse)').matches;

export class Dotyk {
  constructor({ naZacatek, naKonec }) {
    this.aktivni = false;
    this.posun_px = 0;
    this.x = 0;
    // passive: false, aby slo zabranit posouvani a zoomu stranky
    addEventListener('touchstart', (e) => {
      if (e.target.closest('button')) return;
      e.preventDefault();
      this.aktivni = true;
      this.x = e.touches[0].clientX;
      naZacatek();
    }, { passive: false });
    addEventListener('touchmove', (e) => {
      if (!this.aktivni) return;
      e.preventDefault();
      const x = e.touches[0].clientX;
      this.posun_px += x - this.x;
      this.x = x;
    }, { passive: false });
    const konec = (e) => {
      if (!this.aktivni || e.touches.length > 0) return;
      this.aktivni = false;
      naKonec();
    };
    addEventListener('touchend', konec);
    addEventListener('touchcancel', konec);
  }

  // Posun prstu od posledniho cteni v pixelech.
  vezmiPosun() {
    const p = this.posun_px;
    this.posun_px = 0;
    return p;
  }
}
