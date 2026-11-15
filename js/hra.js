// Herni logika: hrac, formace vetrelcu, stity, UFO, strely a kolize.
import * as THREE from 'three';
import { VZOR_STITU } from './modely.js';
import { novyPrilet, aktualizujPrilet } from './prilet.js';
import { Body } from './body.js';

const POLE_X = 38;            // pulka sirky hraciho pole (jednotky sceny)
const HRAC_Y = -18;
const STIT_Y = -11;
const STITY_X = [-27, -9, 9, 27];
const UFO_Y = 29;
const FORMACE_Y = 24;
const RADKY = 5, SLOUPCE = 11;
const ROZTEC_X = 5.6, ROZTEC_Y = 4.4;
const POSUN_DOLU = 0.9;
const RYCHLOST_HRACE = 32;
const RYCHLOST_STRELY = 100;
const PRODLEVA_STRELBY_S = 0.11;
const MAX_STREL_HRACE = 6;
const BODY_RADKU = [50, 40, 30, 20, 10];
const BODY_UFO = [150, 200, 300, 500];
const STRED_ZASAHU = 0.3;    // podil pulsirky: zasah do stredu
const KRAJ_ZASAHU = 0.7;     // od teto hodnoty zasah na kraji
const ZIVOTY = 5;
const MAX_ZIVOTU = 6;
const SVETEL_STREL = 6;       // pevny pocet, zmena poctu svetel = prekompilace shaderu
const PAUZA_MEZI_VLNAMI_S = 2.5;
const ZLATA = new THREE.Color(0xffd23f);

export class Hra {
  constructor(sc, modely, vybuchy, zvuk) {
    this.sc = sc;
    this.m = modely;
    this.vybuchy = vybuchy;
    this.zvuk = zvuk;
    this.skupina = new THREE.Group();
    sc.scena.add(this.skupina);
    this.hrac = new THREE.Mesh(modely.hrac.geo[0], modely.hrac.mat);
    this.hrac.position.set(0, HRAC_Y, 0);
    this.ufo = new THREE.Mesh(modely.ufo.geo[0], modely.ufo.mat);
    this.ufo.visible = false;
    this.skupina.add(this.hrac, this.ufo);
    // strely nasviti okoli (vetrelce, stity, podlahu)
    this.svetlaStrel = Array.from({ length: SVETEL_STREL }, () => {
      const s = new THREE.PointLight(0xffffff, 0, 16, 1.2);
      this.skupina.add(s);
      return s;
    });
    this.vetrelci = [];
    this.body = new Body(sc.scena);
    this._cil = new THREE.Vector3();
    this.stity = [];
    this.strely = [];
    this.skore = 0;
    this.zivoty = ZIVOTY;
    this.vlna = 1;
    this.konec = false;
    this.oznameni = { text: '', zbyva_s: 0 };
    this.postavVlnu();
    this.postavStity();
  }

  novaHra() {
    this.skore = 0;
    this.zivoty = ZIVOTY;
    this.vlna = 1;
    this.konec = false;
    for (const s of this.strely) this.skupina.remove(s.mesh);
    this.strely = [];
    this._skryjUfo();
    this.postavVlnu();
    this.postavStity();
    this.hrac.position.x = 0;
    this.hrac.visible = true;
    this.nesmrtelnost_s = 1;
    this.prodleva_s = 0;
    this._oznam('VLNA 1');
  }

  postavVlnu() {
    for (const v of this.vetrelci) this.skupina.remove(v.mesh);
    this.vetrelci = [];
    this.formace = { x: 0, y: FORMACE_Y - Math.min(this.vlna - 1, 5) * 0.6, smer: 1, snimek: 0, casSnimku: 0 };
    for (let r = 0; r < RADKY; r++) {
      for (let c = 0; c < SLOUPCE; c++) {
        const mod = this.m.vetrelci[r];
        const mesh = new THREE.Mesh(mod.geo[0], mod.mat);
        this.skupina.add(mesh);
        this.vetrelci.push({ mesh, mod, r, c, dx: (c - (SLOUPCE - 1) / 2) * ROZTEC_X, dy: -r * ROZTEC_Y, faze: Math.random() * 6.28, prilet: novyPrilet(r, c) });
      }
    }
    this.prilet = true;
    this._umistiVetrelce(0, 0);
    this.casStrelbyVetrelcu = 1.5;
    this.casUfo = 12 + Math.random() * 10;
    this.mezivlna_s = 0;
  }

  postavStity() {
    for (const s of this.stity) this.skupina.remove(s.mesh);
    this.stity = [];
    const { voxel } = this.m.stit;
    const vyska = VZOR_STITU.length, sirka = VZOR_STITU[0].length;
    for (const x0 of STITY_X) {
      VZOR_STITU.forEach((radek, r) => [...radek].forEach((znak, c) => {
        if (znak !== '#') return;
        const mesh = new THREE.Mesh(this.m.stit.geo, this.m.stit.mat);
        const x = x0 + (c - (sirka - 1) / 2) * voxel;
        const y = STIT_Y + ((vyska - 1) / 2 - r) * voxel;
        mesh.position.set(x, y, 0);
        this.skupina.add(mesh);
        this.stity.push({ mesh, x, y });
      }));
    }
  }

  // Titulek a konec hry: formace se jen vlni.
  ukazka(dt, cas) {
    this._animujSnimky(dt);
    this._umistiVetrelce(cas, dt);
    this.body.aktualizuj(dt);
    if (this.ufo.visible) this._ufo(dt, cas);
  }

  aktualizuj(dt, vstup, cas) {
    if (this.oznameni.zbyva_s > 0) this.oznameni.zbyva_s -= dt;
    if (this.mezivlna_s > 0) {
      this.mezivlna_s -= dt;
      if (this.mezivlna_s <= 0) {
        this.vlna++;
        this.postavVlnu();
        this.postavStity();
        this._oznam(`VLNA ${this.vlna}`);
      }
    }
    this._hrac(dt, vstup);
    this._formace(dt, cas);
    this._strelbaVetrelcu(dt);
    this._ufo(dt, cas);
    this._strely(dt);
    this._svetlaStrel();
    this.body.aktualizuj(dt);
  }

  _svetlaStrel() {
    this.svetlaStrel.forEach((svetlo, i) => {
      const s = this.strely[i];
      svetlo.intensity = s ? 30 : 0;
      if (!s) return;
      svetlo.position.set(s.mesh.position.x, s.mesh.position.y, 1.5);
      svetlo.color.setHex(s.hrace ? 0x7ffcff : 0xffb020);
    });
  }

  _oznam(text) { this.oznameni = { text, zbyva_s: 1.8 }; }

  _hrac(dt, vstup) {
    if (this.nesmrtelnost_s > 0) {
      this.nesmrtelnost_s -= dt;
      this.hrac.visible = this.zivoty > 0 && (this.nesmrtelnost_s <= 0 || Math.floor(this.nesmrtelnost_s * 12) % 2 === 0);
    }
    if (this.zivoty <= 0) return;
    const h = this.hrac;
    h.position.x = THREE.MathUtils.clamp(h.position.x + vstup.smer * RYCHLOST_HRACE * dt, -POLE_X, POLE_X);
    h.rotation.z += (-vstup.smer * 0.35 - h.rotation.z) * Math.min(1, dt * 10);
    h.rotation.y += (vstup.smer * 0.5 - h.rotation.y) * Math.min(1, dt * 10);
    this.prodleva_s -= dt;
    if (vstup.strilej && this.prodleva_s <= 0 && this.strely.filter((s) => s.hrace).length < MAX_STREL_HRACE) {
      this._vystrel(h.position.x, HRAC_Y + 2, RYCHLOST_STRELY, true);
      this.prodleva_s = PRODLEVA_STRELBY_S;
      this.zvuk.vystrel();
    }
  }

  _vystrel(x, y, vy, hrace) {
    const mod = hrace ? this.m.strelaHrace : this.m.strelaVetrelce;
    const mesh = new THREE.Mesh(mod.geo, mod.mat);
    mesh.position.set(x, y, 0);
    this.skupina.add(mesh);
    this.strely.push({ mesh, vy, hrace });
  }

  _animujSnimky(dt) {
    const f = this.formace;
    const podil = this.vetrelci.length / (RADKY * SLOUPCE);
    f.casSnimku += dt;
    if (f.casSnimku < 0.12 + 0.5 * podil) return;
    f.casSnimku = 0;
    f.snimek ^= 1;
    for (const v of this.vetrelci) v.mesh.geometry = v.mod.geo[f.snimek];
  }

  _umistiVetrelce(cas, dt) {
    this.m.vetrelci.forEach((mod, i) => { mod.mat.emissiveIntensity = 0.8 * (0.6 + 0.4 * Math.sin(cas * 3 + i * 0.9)); });
    const f = this.formace;
    let priletaji = false;
    for (const v of this.vetrelci) {
      if (v.prilet) {
        this._cil.set(f.x + v.dx, f.y + v.dy, 0);
        if (aktualizujPrilet(v, this._cil, dt)) v.prilet = null;
        else { priletaji = true; continue; }
      }
      v.mesh.position.set(f.x + v.dx, f.y + v.dy, 0);
      v.mesh.rotation.y = Math.sin(cas * 1.6 + v.faze) * 0.35;
      v.mesh.rotation.x = Math.sin(cas * 1.1 + v.faze) * 0.12;
    }
    this.prilet = priletaji;
  }

  _formace(dt, cas) {
    if (!this.vetrelci.length) return;
    const f = this.formace;
    if (this.prilet) {
      // formace stoji, dokud vsichni nedoleti
      this._animujSnimky(dt);
      this._umistiVetrelce(cas, dt);
      return;
    }
    const podil = this.vetrelci.length / (RADKY * SLOUPCE);
    const rychlost = (3 + this.vlna * 0.4) * (1 + (1 - podil) * 2.5);
    f.x += f.smer * rychlost * dt;
    let minX = Infinity, maxX = -Infinity, minY = Infinity;
    for (const v of this.vetrelci) {
      minX = Math.min(minX, f.x + v.dx - v.mod.pulSirka);
      maxX = Math.max(maxX, f.x + v.dx + v.mod.pulSirka);
      minY = Math.min(minY, f.y + v.dy - v.mod.pulVyska);
    }
    if (f.smer > 0 && maxX > POLE_X) { f.x -= maxX - POLE_X; f.smer = -1; f.y -= POSUN_DOLU; }
    else if (f.smer < 0 && minX < -POLE_X) { f.x += -POLE_X - minX; f.smer = 1; f.y -= POSUN_DOLU; }
    this._animujSnimky(dt);
    this._umistiVetrelce(cas, dt);
    if (minY < STIT_Y + 3) this._vetrelciDoStitu();
    if (minY < HRAC_Y + 1.5 && !this.konec) {
      this.zivoty = 0;
      this._znicHrace();
    }
  }

  _vetrelciDoStitu() {
    for (const v of this.vetrelci) {
      const p = v.mesh.position;
      for (let j = this.stity.length - 1; j >= 0; j--) {
        const s = this.stity[j];
        if (Math.abs(s.x - p.x) < v.mod.pulSirka && Math.abs(s.y - p.y) < v.mod.pulVyska) {
          this.skupina.remove(s.mesh);
          this.stity.splice(j, 1);
        }
      }
    }
  }

  _strelbaVetrelcu(dt) {
    this.casStrelbyVetrelcu -= dt;
    if (this.casStrelbyVetrelcu > 0 || !this.vetrelci.length || this.zivoty <= 0 || this.prilet) return;
    this.casStrelbyVetrelcu = Math.max(0.5, 1.8 - this.vlna * 0.08) * (0.5 + Math.random());
    if (this.strely.filter((s) => !s.hrace).length >= 2 + Math.floor(this.vlna / 2)) return;
    const nejnizsi = new Map(); // sloupec -> nejnizsi vetrelec
    for (const v of this.vetrelci) {
      const n = nejnizsi.get(v.c);
      if (!n || v.r > n.r) nejnizsi.set(v.c, v);
    }
    const kandidati = [...nejnizsi.values()];
    const x = this.hrac.position.x;
    // casteji striles sloupec nad hracem
    const strelec = Math.random() < 0.25
      ? kandidati.reduce((a, b) => (Math.abs(a.mesh.position.x - x) < Math.abs(b.mesh.position.x - x) ? a : b))
      : kandidati[Math.floor(Math.random() * kandidati.length)];
    const p = strelec.mesh.position;
    this._vystrel(p.x, p.y - strelec.mod.pulVyska, -(14 + this.vlna * 1.2), false);
  }

  _ufo(dt, cas) {
    if (!this.ufo.visible) {
      this.casUfo -= dt;
      if (this.casUfo <= 0 && this.vetrelci.length > 8 && !this.konec) {
        this.ufoSmer = Math.random() < 0.5 ? 1 : -1;
        this.ufo.position.set(-this.ufoSmer * 50, UFO_Y, 0);
        this.ufo.visible = true;
        this.zastavUfoZvuk = this.zvuk.ufoStart();
      }
      return;
    }
    this.ufo.position.x += this.ufoSmer * 13 * dt;
    this.ufo.position.y = UFO_Y + Math.sin(cas * 3) * 0.6;
    this.ufo.rotation.y += dt * 2.5;
    if (Math.abs(this.ufo.position.x) > 52) this._skryjUfo();
  }

  _skryjUfo() {
    this.ufo.visible = false;
    this.casUfo = 18 + Math.random() * 12;
    if (this.zastavUfoZvuk) this.zastavUfoZvuk();
    this.zastavUfoZvuk = null;
  }

  _strely(dt) {
    for (let i = this.strely.length - 1; i >= 0; i--) {
      const s = this.strely[i];
      const p = s.mesh.position;
      p.y += s.vy * dt;
      if (!s.hrace) s.mesh.rotation.y += dt * 12;
      let pryc = p.y > 36 || p.y < -26 || this._zasahStitu(p, s.hrace);
      if (!pryc && s.hrace) pryc = this._zasahVetrelce(p) || this._zasahUfo(p);
      if (!pryc && !s.hrace) pryc = this._zasahHrace(p);
      if (pryc) s.pryc = true;
    }
    // strela proti strele
    for (const a of this.strely) {
      if (!a.hrace || a.pryc) continue;
      for (const b of this.strely) {
        if (b.hrace || b.pryc) continue;
        if (Math.abs(a.mesh.position.x - b.mesh.position.x) < 0.8 && Math.abs(a.mesh.position.y - b.mesh.position.y) < 1.6) {
          a.pryc = b.pryc = true;
          this.vybuchy.vybuch(a.mesh.position, new THREE.Color(0xffffff), 'strela');
          this.zvuk.zasahStitu();
          break;
        }
      }
    }
    for (const s of this.strely) if (s.pryc) this.skupina.remove(s.mesh);
    this.strely = this.strely.filter((s) => !s.pryc);
  }

  _zasahStitu(p, hrace) {
    const voxel = this.m.stit.voxel;
    const zasah = this.stity.find((v) => Math.abs(v.x - p.x) < voxel * 0.8 && Math.abs(v.y - p.y) < voxel * 1.3);
    if (!zasah) return false;
    const polomer = hrace ? 0.9 : 1.3;
    for (let j = this.stity.length - 1; j >= 0; j--) {
      const w = this.stity[j];
      const d = Math.hypot(w.x - zasah.x, w.y - zasah.y);
      if (d < voxel * 0.6 || (d < polomer && Math.random() < 0.6)) {
        this.skupina.remove(w.mesh);
        this.stity.splice(j, 1);
      }
    }
    this.vybuchy.vybuch(zasah.mesh.position, this.m.stit.barva, 'stit');
    this.zvuk.zasahStitu();
    return true;
  }

  _zasahVetrelce(p) {
    const i = this.vetrelci.findIndex((v) => !v.prilet &&
      Math.abs(v.mesh.position.x - p.x) < v.mod.pulSirka && Math.abs(v.mesh.position.y - p.y) < v.mod.pulVyska);
    if (i < 0) return false;
    const v = this.vetrelci[i];
    this.vetrelci.splice(i, 1);
    this.skupina.remove(v.mesh);
    // druh vybuchu podle mista zasahu
    const odchylka = (p.x - v.mesh.position.x) / v.mod.pulSirka;
    let body = BODY_RADKU[v.r] * this.vlna;
    if (Math.abs(odchylka) < STRED_ZASAHU) {
      body *= 2;
      this.vybuchy.vybuch(v.mesh.position, v.mod.barva, 'plazma');
      this.zvuk.vybuch(0.9);
      this.sc.otres(0.6);
    } else if (Math.abs(odchylka) < KRAJ_ZASAHU) {
      this.vybuchy.vybuch(v.mesh.position, v.mod.barva, 'ohnostroj');
      this.zvuk.vybuch(0.6);
      this.sc.otres(0.35);
    } else {
      // kraj: trosky odleti na stranu zasahu a nahoru
      this.vybuchy.vybuch(v.mesh.position, v.mod.barva, 'trosky', new THREE.Vector3(Math.sign(odchylka), 0.6, 0.3));
      this.zvuk.vybuch(0.5);
      this.sc.otres(0.25);
    }
    this.skore += body;
    const stred = Math.abs(odchylka) < STRED_ZASAHU;
    this.body.ukaz(v.mesh.position, stred ? `+${body} ×2` : `+${body}`, stred ? ZLATA : v.mod.barva);
    this.sc.zablesk(v.mesh.position, v.mod.barva);
    if (!this.vetrelci.length) {
      this.mezivlna_s = PAUZA_MEZI_VLNAMI_S;
      this.zivoty = Math.min(MAX_ZIVOTU, this.zivoty + 1);
      this._oznam('KUPOLE DRŽÍ! +1 ŽIVOT');
    }
    return true;
  }

  _zasahUfo(p) {
    const u = this.ufo, mod = this.m.ufo;
    if (!u.visible || Math.abs(u.position.x - p.x) > mod.pulSirka || Math.abs(u.position.y - p.y) > mod.pulVyska) return false;
    const body = BODY_UFO[Math.floor(Math.random() * BODY_UFO.length)];
    this.skore += body;
    this.body.ukaz(u.position, `+${body}`, ZLATA);
    this.vybuchy.vybuch(u.position, mod.barva, 'ufo');
    this.zvuk.vybuch(1.2);
    this.sc.otres(0.8);
    this.sc.zablesk(u.position, mod.barva);
    this._skryjUfo();
    return true;
  }

  _zasahHrace(p) {
    const h = this.hrac, mod = this.m.hrac;
    if (this.zivoty <= 0 || this.nesmrtelnost_s > 0) return false;
    if (Math.abs(h.position.x - p.x) > mod.pulSirka || Math.abs(h.position.y - p.y) > mod.pulVyska) return false;
    this.zivoty--;
    this._znicHrace();
    return true;
  }

  _znicHrace() {
    const h = this.hrac;
    this.vybuchy.vybuch(h.position, new THREE.Color(0x29d8ff), 'hrac');
    this.zvuk.vybuch(1.6);
    this.sc.otres(1.4);
    this.sc.zablesk(h.position, new THREE.Color(0x7ffcff));
    this.nesmrtelnost_s = 3;
    if (this.zivoty <= 0) {
      this.hrac.visible = false;
      this.konec = true;
      this._skryjUfo();
    }
  }
}
