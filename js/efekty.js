// Vybuchy: trosky a jiskry (InstancedMesh), ohnive koule a razove vlny.
// Castice letí vsemi smery vcetne ke kamere (kladne z).
import * as THREE from 'three';

const MAX_CASTIC = 3000;
const MAX_KOULI = 16;
const MAX_KRUHU = 16;
const TIHA = 14;          // jednotek/s^2
const ODPOR = 1.6;        // utlum rychlosti za sekundu

// Recepty druhu vybuchu: pocty, rychlosti a ke kamere (rychlost v z navic)
const DRUHY = {
  trosky:  { trosky: 45, jiskry: 20, rychlost: 18, keKamere: 20, koule: 2.5, kruhy: 0 },
  plazma:  { trosky: 12, jiskry: 40, rychlost: 22, keKamere: 10, koule: 6, kruhy: 1 },
  ohnostroj: { trosky: 0, jiskry: 110, rychlost: 38, keKamere: 25, koule: 1.5, kruhy: 1 },
  ufo:     { trosky: 70, jiskry: 140, rychlost: 30, keKamere: 60, koule: 9, kruhy: 2 },
  hrac:    { trosky: 90, jiskry: 220, rychlost: 34, keKamere: 70, koule: 11, kruhy: 3 },
  stit:    { trosky: 10, jiskry: 6, rychlost: 7, keKamere: 6, koule: 0, kruhy: 0 },
  strela:  { trosky: 0, jiskry: 14, rychlost: 14, keKamere: 6, koule: 1, kruhy: 0 },
};

const BILA = new THREE.Color(1, 1, 1);

function aditivni(barva) {
  return new THREE.MeshBasicMaterial({
    color: barva, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  });
}

export class Vybuchy {
  constructor(scena) {
    this.mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial(), MAX_CASTIC);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.castice = [];
    this.pom = new THREE.Object3D();
    this.pom.scale.setScalar(0);
    this.pom.updateMatrix();
    for (let i = 0; i < MAX_CASTIC; i++) {
      this.castice.push({ zivot: 0, max: 1, velikost: 1, jiskra: false,
        pos: new THREE.Vector3(), rych: new THREE.Vector3(), rot: new THREE.Vector3(), otacka: 0 });
      this.mesh.setMatrixAt(i, this.pom.matrix);
      this.mesh.setColorAt(i, BILA);
    }
    this.dalsi = 0;
    this.barva = new THREE.Color();
    this.cil = new THREE.Vector3();
    scena.add(this.mesh);

    const vytvorPool = (geo, pocet) => Array.from({ length: pocet }, () => {
      const m = new THREE.Mesh(geo, aditivni(0xffffff));
      m.visible = false;
      scena.add(m);
      return { mesh: m, zivot: 0, max: 1, polomer: 1 };
    });
    this.koule = vytvorPool(new THREE.SphereGeometry(1, 24, 16), MAX_KOULI);
    this.kruhy = vytvorPool(new THREE.RingGeometry(0.85, 1, 64), MAX_KRUHU);
    this.dalsiKoule = 0;
    this.dalsiKruh = 0;
  }

  // smer (volitelny): kam vybuch odhodi trosky, napr. od mista zasahu
  vybuch(pozice, barva, druh, smer = null) {
    const d = DRUHY[druh];
    for (let n = 0; n < d.trosky; n++) this._castice(pozice, barva, d, false, smer);
    for (let n = 0; n < d.jiskry; n++) this._castice(pozice, Math.random() < 0.4 ? BILA : barva, d, true, smer);
    this.mesh.instanceColor.needsUpdate = true;
    if (d.koule) this._koule(pozice, barva, d.koule);
    for (let k = 0; k < d.kruhy; k++) this._kruh(pozice, k === 0 ? barva : BILA, d.koule * (2 + k), k * 0.08);
  }

  _castice(pozice, barva, d, jiskra, smer) {
    const i = this.dalsi;
    this.dalsi = (this.dalsi + 1) % MAX_CASTIC;
    const c = this.castice[i];
    c.pos.copy(pozice);
    const rychlost = d.rychlost * (jiskra ? 0.6 + Math.random() * 0.9 : 0.2 + Math.random() * 0.8);
    c.rych.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(rychlost);
    // cast trosek leti primo na hrace (kameru)
    if (Math.random() < 0.35) c.rych.z += d.keKamere * (0.4 + Math.random() * 0.6);
    if (smer) c.rych.addScaledVector(smer, d.rychlost * (0.5 + Math.random() * 0.8));
    c.rot.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
    c.otacka = (Math.random() - 0.5) * 20;
    c.jiskra = jiskra;
    c.velikost = jiskra ? 0.1 + Math.random() * 0.08 : 0.25 + Math.random() * 0.4;
    c.zivot = c.max = jiskra ? 0.35 + Math.random() * 0.5 : 0.8 + Math.random() * 1.2;
    this.barva.copy(barva).multiplyScalar(jiskra ? 1.8 : 1.1);
    this.mesh.setColorAt(i, this.barva);
  }

  _koule(pozice, barva, polomer) {
    const k = this.koule[this.dalsiKoule];
    this.dalsiKoule = (this.dalsiKoule + 1) % MAX_KOULI;
    k.mesh.position.copy(pozice);
    k.mesh.material.color.copy(barva).lerp(BILA, 0.2).multiplyScalar(1.2);
    k.mesh.visible = true;
    k.zivot = k.max = 0.45;
    k.polomer = polomer;
  }

  _kruh(pozice, barva, polomer, zpozdeni_s) {
    const k = this.kruhy[this.dalsiKruh];
    this.dalsiKruh = (this.dalsiKruh + 1) % MAX_KRUHU;
    k.mesh.position.copy(pozice);
    k.mesh.rotation.set((Math.random() - 0.5) * 0.8, (Math.random() - 0.5) * 0.8, 0);
    k.mesh.material.color.copy(barva).multiplyScalar(1.5);
    k.zivot = k.max = 0.6 + zpozdeni_s;
    k.zpozdeni = zpozdeni_s;
    k.polomer = polomer;
  }

  aktualizuj(dt) {
    const p = this.pom;
    const utlum = Math.exp(-ODPOR * dt);
    for (let i = 0; i < MAX_CASTIC; i++) {
      const c = this.castice[i];
      if (c.zivot <= 0) continue;
      c.zivot -= dt;
      c.rych.multiplyScalar(utlum);
      c.rych.y -= TIHA * dt * (c.jiskra ? 0.3 : 1);
      c.pos.addScaledVector(c.rych, dt);
      const zbyva = Math.max(0, c.zivot / c.max);
      p.position.copy(c.pos);
      if (c.jiskra) {
        // jiskra = protazena carka ve smeru letu
        p.lookAt(this.cil.copy(c.pos).add(c.rych));
        p.scale.set(c.velikost, c.velikost, Math.min(3, 0.2 + c.rych.length() * 0.07) * zbyva);
      } else {
        c.rot.addScalar(dt * c.otacka);
        p.rotation.set(c.rot.x, c.rot.y, c.rot.z);
        p.scale.setScalar(c.velikost * Math.min(1, zbyva * 2));
      }
      p.updateMatrix();
      this.mesh.setMatrixAt(i, p.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;

    for (const k of this.koule) {
      if (!k.mesh.visible) continue;
      k.zivot -= dt;
      const t = 1 - k.zivot / k.max;
      k.mesh.scale.setScalar(k.polomer * (0.3 + Math.sqrt(t)));
      k.mesh.material.opacity = Math.max(0, 1 - t) ** 2;
      if (k.zivot <= 0) k.mesh.visible = false;
    }
    for (const k of this.kruhy) {
      if (k.zivot <= 0) continue;
      k.zivot -= dt;
      const t = (k.max - k.zivot - k.zpozdeni) / (k.max - k.zpozdeni);
      k.mesh.visible = t > 0 && k.zivot > 0;
      if (!k.mesh.visible) continue;
      k.mesh.scale.setScalar(k.polomer * (0.2 + t));
      k.mesh.material.opacity = (1 - t) * 0.9;
    }
  }
}
