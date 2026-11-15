// Hudba: J. S. Bach, Toccata a fuga d moll BWV 565, presne podle MIDI z Mutopia Project
// (volne dilo, hudba/ToccataFugue.mid). Noty se prehravaji beze zmen, v puvodnim tempu, dokola.
import { NOTY } from './toccata.js';

const A4_HZ = 440;
const hz = (midi) => A4_HZ * Math.pow(2, (midi - 69) / 12);
const PREDSTIH_S = 0.15;          // jak daleko dopredu se planuji tony
const KANAL_PEDALU = 2;
const HLASITOST_MANUALU = 0.085;
const HLASITOST_PEDALU = 0.11;
const POCET_NOT = NOTY.length / 4;
const DELKA_SKLADBY_S = NOTY[NOTY.length - 4] + NOTY[NOTY.length - 2] + 2;

export class Hudba {
  constructor(zvuk) {
    this.zvuk = zvuk;
    this.zapnuta = true;
    this.sbernice = null;
    this.hraje = false;
  }

  // Kazde prehravani ma vlastni sbernici, aby slo naplanovane tony umlcet.
  _novaSbernice() {
    const ctx = this.zvuk.ctx;
    if (this.sbernice) {
      const stara = this.sbernice;
      stara.gain.setTargetAtTime(0, ctx.currentTime, 0.15);
      setTimeout(() => stara.disconnect(), 2000);
    }
    this.zvuk.zrusHlasy();
    this.sbernice = ctx.createGain();
    this.sbernice.gain.value = this.zapnuta ? 1 : 0;
    this.sbernice.connect(this.zvuk.hudbaVstup);
  }

  // Spusti skladbu od zacatku.
  hraj() {
    if (!this.zvuk.ctx) return;
    this._novaSbernice();
    this.hraje = true;
    this.zacatek = this.zvuk.ctx.currentTime + 0.1;
    this.index = 0;
  }

  // Ztlumeni pod hlasem vysilacky (1 = plna hlasitost).
  ztlum(uroven) {
    if (!this.sbernice || !this.zapnuta) return;
    this.sbernice.gain.setTargetAtTime(uroven, this.zvuk.ctx.currentTime, 0.12);
  }

  prepniZvuk() {
    this.zapnuta = !this.zapnuta;
    if (this.sbernice) this.sbernice.gain.value = this.zapnuta ? 1 : 0;
  }

  aktualizuj() {
    if (!this.hraje) return;
    const ted = this.zvuk.ctx.currentTime;
    while (this.index < POCET_NOT) {
      const i = this.index * 4;
      const cas = this.zacatek + NOTY[i];
      if (cas > ted + PREDSTIH_S) return;
      const pedal = NOTY[i + 3] === KANAL_PEDALU;
      // ton, ktery se kvuli skryte zalozce nestihl zahrat, se preskoci
      if (cas >= ted) {
        this.zvuk.varhany(cas, hz(NOTY[i + 1]), NOTY[i + 2], pedal ? HLASITOST_PEDALU : HLASITOST_MANUALU, this.sbernice);
      }
      this.index++;
    }
    // konec skladby: znovu od zacatku
    if (ted > this.zacatek + DELKA_SKLADBY_S) {
      this.zacatek = ted + 0.1;
      this.index = 0;
    }
  }
}
