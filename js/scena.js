// Scena: renderer, kamera, svetla, odlesky prostredi, otres a zablesky.
import * as THREE from 'three';
import { vytvorPozadi } from './pozadi.js';
import { vytvorPostproces } from './postproces.js';
import { naMobilu } from './dotyk.js';

const BARVA_POZADI = 0x02040c;
// Pohledy kamery: pozice a cil podle x hrace a casu; prepina se klavesou V.
const POHLEDY = [
  { nazev: 'ZA LODÍ', // nizko za lodi, vetrelci nad hlavou a v dalce
    pozice: (x) => [x * 0.7, -6, 46], cil: (x) => [x * 0.4, 0, -30], naklon: 0.06, zorne: 62 },
  { nazev: 'KLASICKÝ', pozice: (x) => [x * 0.12, -5, 72], cil: (x) => [x * 0.06, 3, 0], naklon: 0, zorne: 50 },
  { nazev: 'KAMERAMAN', // pomalu krouzi kolem bojiste
    pozice: (x, t) => [Math.sin(t * 0.13) * 55, -8 + Math.sin(t * 0.09) * 10, 48 + Math.cos(t * 0.13) * 18],
    cil: (x) => [x * 0.2, 4, -5], naklon: 0.02, zorne: 56 },
];
const PLYNULOST_KAMERY = 2.5;   // cim vic, tim rychleji kamera dotahne cil

// Na uzkem displeji (telefon na vysku) zvetsit svisle zorne pole, aby se veslo cele bojiste do sirky.
const POMER_NAVRHU = 16 / 9;
const MAX_ZORNE = 105;
function zorneProPomer(zorne, pomer) {
  if (pomer >= POMER_NAVRHU) return zorne;
  const vodorovne = Math.tan(THREE.MathUtils.degToRad(zorne) / 2) * POMER_NAVRHU;
  return Math.min(MAX_ZORNE, THREE.MathUtils.radToDeg(2 * Math.atan(vodorovne / pomer)));
}

export function vytvorScenu(kontejner) {
  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
  // mobil: nizsi rozliseni kvuli vykonu a teplu
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, naMobilu ? 1 : 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.9;
  kontejner.appendChild(renderer.domElement);

  const scena = new THREE.Scene();
  scena.background = new THREE.Color(BARVA_POZADI);
  scena.fog = new THREE.Fog(BARVA_POZADI, 160, 520);

  const kamera = new THREE.PerspectiveCamera(POHLEDY[0].zorne, innerWidth / innerHeight, 0.1, 800);
  kamera.position.set(...POHLEDY[0].pozice(0, 0));

  scena.add(new THREE.HemisphereLight(0x9a6bff, 0x200030, 0.15));
  const svetlo = new THREE.DirectionalLight(0xffffff, 0.8);
  svetlo.position.set(15, 30, 50);
  const protisvetlo = new THREE.DirectionalLight(0x3aa0ff, 1.0); // modry obrys zezadu (odlesk kupole)
  protisvetlo.position.set(0, 10, -60);
  scena.add(svetlo, protisvetlo);
  const zablesk = new THREE.PointLight(0xffffff, 0, 60, 1);
  scena.add(zablesk);

  const pozadi = vytvorPozadi(scena);
  const post = vytvorPostproces(renderer, scena, kamera);

  addEventListener('resize', () => {
    kamera.aspect = innerWidth / innerHeight;
    kamera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
    post.composer.setSize(innerWidth, innerHeight);
  });

  let otresy = 0;
  let pohled = 0;
  let minuleX = 0;
  let naklon = 0;
  const cil = new THREE.Vector3();
  const cilPlynuly = new THREE.Vector3(...POHLEDY[0].cil(0));
  const poziceCil = new THREE.Vector3();
  return {
    scena, kamera,
    render: post.render,
    otres(sila) { otresy = Math.min(1.5, otresy + sila); },
    prepniPohled() { pohled = (pohled + 1) % POHLEDY.length; return POHLEDY[pohled].nazev; },
    zablesk(pozice, barva) {
      zablesk.position.set(pozice.x, pozice.y, pozice.z + 6);
      zablesk.color.copy(barva);
      zablesk.intensity = 90;
    },
    aktualizuj(dt, cas, hracX) {
      pozadi.aktualizuj(cas);
      zablesk.intensity *= Math.exp(-dt * 9);
      otresy = Math.max(0, otresy - dt * 1.8);
      const s = otresy * otresy * 1.4;
      const p = POHLEDY[pohled];
      const k = 1 - Math.exp(-dt * PLYNULOST_KAMERY);
      poziceCil.set(...p.pozice(hracX, cas));
      kamera.position.lerp(poziceCil, k);
      const zorne = zorneProPomer(p.zorne, kamera.aspect);
      if (Math.abs(kamera.fov - zorne) > 0.05) {
        kamera.fov += (zorne - kamera.fov) * k;
        kamera.updateProjectionMatrix();
      }
      cilPlynuly.lerp(cil.set(...p.cil(hracX)), k);
      kamera.position.x += (Math.random() - 0.5) * s;
      kamera.position.y += (Math.random() - 0.5) * s;
      kamera.lookAt(cilPlynuly);
      // naklon do zatacky podle rychlosti hrace
      const rychlost = dt > 0 ? (hracX - minuleX) / dt : 0;
      minuleX = hracX;
      naklon += (-rychlost * p.naklon * 0.03 - naklon) * Math.min(1, dt * 4);
      kamera.rotateZ(naklon);
    },
  };
}
