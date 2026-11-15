// Prilet vetrelcu z hloubky prostoru do formace: kazdy leti po vlastni krivce (Bezier),
// rady nalétají postupne. Behem priletu se nestrili a vetrelce nejde zasahnout.
import * as THREE from 'three';

const DOBA_LETU_S = 2.4;
const ZPOZDENI_RADY_S = 0.45;
const ZPOZDENI_SLOUPCE_S = 0.06;
const HLOUBKA_STARTU = -320;    // z, odkud prilétají (za sceneou v mlze)

export function novyPrilet(r, c) {
  const strana = c < 5 ? -1 : 1;
  return {
    t: 0,
    zpozdeni_s: r * ZPOZDENI_RADY_S + c * ZPOZDENI_SLOUPCE_S + Math.random() * 0.2,
    start: new THREE.Vector3((Math.random() - 0.5) * 160, 15 + Math.random() * 70, HLOUBKA_STARTU - Math.random() * 80),
    // ridici bod: obloukem pres stranu a pred hrace, at je videt hloubka
    oblouk: new THREE.Vector3(strana * (40 + Math.random() * 30), -5 + Math.random() * 20, 25 + Math.random() * 25),
    vrut: (Math.random() < 0.5 ? -1 : 1) * (2 + Math.random() * 2),
  };
}

const pom = new THREE.Vector3();

// Posune vetrelce po krivce k cili; vrati true, kdyz doletel.
export function aktualizujPrilet(v, cil, dt) {
  const p = v.prilet;
  p.t += dt;
  const k = THREE.MathUtils.clamp((p.t - p.zpozdeni_s) / DOBA_LETU_S, 0, 1);
  const e = 1 - Math.pow(1 - k, 3);      // dobrzdi u cile
  const a = 1 - e;
  // kvadraticky Bezier: start -> oblouk -> cil
  pom.copy(p.start).multiplyScalar(a * a)
    .addScaledVector(p.oblouk, 2 * a * e)
    .addScaledVector(cil, e * e);
  v.mesh.position.copy(pom);
  v.mesh.rotation.set(a * 1.2, a * p.vrut * 3, a * p.vrut);
  v.mesh.visible = k > 0;
  return k >= 1;
}
