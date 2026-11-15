// Start, vstup (klavesnice, gamepad), stavy obrazovek, HUD a hlavni smycka.
import * as THREE from 'three';
import { vytvorScenu } from './scena.js';
import { vytvorModely } from './modely.js';
import { Vybuchy } from './efekty.js';
import { Zvuk } from './zvuk.js';
import { Hudba } from './hudba.js';
import { Hra } from './hra.js';
import { Vysilacka } from './vysilacka.js';
import { vDiscordu, spustDiscord } from './discord.js';
import { Dotyk, naMobilu } from './dotyk.js';

const MAX_KROK_S = 0.05;      // pri zaseknuti nedelat obri skok
const MRTVA_ZONA_PAKY = 0.2;
const KLIC_REKORDU = 'invaders_rekord';
const SIRKA_POLE = 84;        // jednotek sceny na celou sirku displeje pri tazeni prstem
const CITLIVOST_DOTYKU = 0.8;

const el = (id) => document.getElementById(id);
const sc = vytvorScenu(el('hra'));
spustDiscord();
const zvuk = new Zvuk();
const hudba = new Hudba(zvuk);
const vybuchy = new Vybuchy(sc.scena);
const hra = new Hra(sc, vytvorModely(), vybuchy, zvuk);
const vysilacka = new Vysilacka(zvuk, hudba);

let stav = 'titul'; // titul | hra | pauza | konec
let rekord = Number(localStorage.getItem(KLIC_REKORDU) || 0);
const klavesy = new Set();

function celaObrazovka() {
  if (vDiscordu) return; // velikost okna aktivity ridi Discord
  if (!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {});
}

function zacni() {
  celaObrazovka();
  zvuk.start();
  stav = 'hra';
  hra.novaHra();
  hudba.hraj();
  minule = { vlna: 1, zivoty: hra.zivoty, ufo: false, malo: false, mezivlna: false };
  vysilacka.pripravUdalosti();
  setTimeout(() => vysilacka.rekni('vlna', true), 1200);
  el('titul').classList.add('skryte');
  el('konec').classList.add('skryte');
}

function prepniPauzu() {
  stav = stav === 'pauza' ? 'hra' : 'pauza';
  if (stav === 'pauza') zvuk.ctx?.suspend(); else zvuk.ctx?.resume();
}

function konecHry() {
  stav = 'konec';
  if (hra.skore > rekord) {
    rekord = hra.skore;
    localStorage.setItem(KLIC_REKORDU, String(rekord));
  }
  el('konecSkore').textContent = `SKÓRE ${hra.skore}`;
  if (naMobilu) el('konecVyzva').textContent = 'Klepni = znovu';
  el('konec').classList.remove('skryte');
}

function akce(kod) {
  if (kod === 'Enter' && (stav === 'titul' || stav === 'konec')) zacni();
  else if (stav === 'titul' && !zvuk.ctx) {
    // prohlizec pusti zvuk az po prvni klavese
    zvuk.start();
    hudba.hraj();
    el('vyzva').textContent = 'ENTER = hrát';
  } else if ((kod === 'KeyP' || kod === 'Escape') && (stav === 'hra' || stav === 'pauza')) prepniPauzu();
  else if (kod === 'KeyM') hudba.prepniZvuk();
  else if (kod === 'KeyR') vysilacka.prepni();
  else if (kod === 'KeyV') {
    hra.oznameni = { text: `POHLED: ${sc.prepniPohled()}`, zbyva_s: 1.5 };
  }
  else if (kod === 'KeyF') {
    if (document.fullscreenElement) document.exitFullscreen(); else celaObrazovka();
  }
}

addEventListener('keydown', (e) => {
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) e.preventDefault();
  klavesy.add(e.code);
  if (!e.repeat) akce(e.code);
});

// Mobil: tazeni prstu = pohyb, drzeni = strelba, klepnuti na titulku nebo konci = start
let cilDotyku = 0;
const dotyk = new Dotyk({
  naZacatek: () => { cilDotyku = hra.hrac.position.x; },
  naKonec: () => { if (stav === 'titul' || stav === 'konec') zacni(); },
});
for (const tl of document.querySelectorAll('#tlacitka button')) {
  tl.addEventListener('click', () => akce(tl.dataset.kod));
}
if (naMobilu) {
  document.body.classList.add('mobil');
  el('vyzva').textContent = 'Klepni = hrát';
}
addEventListener('keyup', (e) => klavesy.delete(e.code));
addEventListener('blur', () => klavesy.clear());

let predchoziStart = false;
function ctiGamepad() {
  const gp = navigator.getGamepads?.()[0];
  if (!gp) return { smer: 0, strilej: false, start: false };
  const osa = Math.abs(gp.axes[0]) > MRTVA_ZONA_PAKY ? gp.axes[0] : 0;
  const krizek = (gp.buttons[15]?.pressed ? 1 : 0) - (gp.buttons[14]?.pressed ? 1 : 0);
  return {
    smer: osa || krizek,
    strilej: !!(gp.buttons[0]?.pressed || gp.buttons[7]?.pressed),
    start: !!gp.buttons[9]?.pressed,
  };
}

function ctiVstup() {
  const gp = ctiGamepad();
  if (gp.start && !predchoziStart) {
    if (stav === 'titul' || stav === 'konec') zacni();
    else if (stav === 'hra' || stav === 'pauza') prepniPauzu();
  }
  predchoziStart = gp.start;
  const k = (...kody) => kody.some((c) => klavesy.has(c));
  let smer = (k('ArrowRight', 'KeyD') ? 1 : 0) - (k('ArrowLeft', 'KeyA') ? 1 : 0) + gp.smer;
  if (dotyk.aktivni) {
    // kanon dojizdi za prstem, rychlost umerna vzdalenosti
    cilDotyku += (dotyk.vezmiPosun() / innerWidth) * SIRKA_POLE;
    smer += (cilDotyku - hra.hrac.position.x) * CITLIVOST_DOTYKU;
  }
  return {
    smer: THREE.MathUtils.clamp(smer, -1, 1),
    strilej: k('Space', 'ArrowUp') || gp.strilej || (dotyk.aktivni && stav === 'hra'),
  };
}

function aktualizujHud() {
  el('skore').textContent = hra.skore;
  el('rekord').textContent = Math.max(rekord, hra.skore);
  el('vlna').textContent = hra.vlna;
  el('zivoty').textContent = '▲'.repeat(Math.max(0, hra.zivoty));
  const zprava = stav === 'pauza' ? 'PAUZA' : (stav === 'hra' && hra.oznameni.zbyva_s > 0 ? hra.oznameni.text : '');
  el('zprava').textContent = zprava;
  el('zprava').classList.toggle('skryte', !zprava);
}

// Vysilacka reaguje na zmeny ve hre.
let minule = null;
function radioUdalosti() {
  const ted = {
    vlna: hra.vlna, zivoty: hra.zivoty, ufo: hra.ufo.visible,
    malo: hra.vetrelci.length > 0 && hra.vetrelci.length <= 10, mezivlna: hra.mezivlna_s > 0,
  };
  if (ted.zivoty < minule.zivoty) vysilacka.rekni(ted.zivoty > 0 ? 'zasah' : 'konec', true);
  else if (ted.mezivlna && !minule.mezivlna) vysilacka.rekni('znicena', true);
  else if (ted.vlna !== minule.vlna) vysilacka.rekni('vlna', true);
  else if (ted.ufo && !minule.ufo) vysilacka.rekni('ufo');
  else if (ted.malo && !minule.malo) vysilacka.rekni('malo');
  minule = ted;
}

const hodiny = new THREE.Clock();
let cas = 0;
function snimek() {
  requestAnimationFrame(snimek);
  const dt = Math.min(hodiny.getDelta(), MAX_KROK_S);
  const vstup = ctiVstup();
  if (stav !== 'pauza') {
    cas += dt;
    if (stav === 'hra') {
      hra.aktualizuj(dt, vstup, cas);
      radioUdalosti();
      vysilacka.aktualizuj(dt, !hra.konec);
      if (hra.konec) konecHry();
    } else {
      hra.ukazka(dt, cas);
    }
    vybuchy.aktualizuj(dt);
    sc.aktualizuj(dt, cas, hra.hrac.position.x);
  }
  if (zvuk.ctx) hudba.aktualizuj();
  aktualizujHud();
  sc.render(cas);
}
snimek();
