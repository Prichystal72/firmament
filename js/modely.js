// Voxelove modely: kulatozemci (2 snimky animace), kanon strazce kupole, raketoplan, ledove kry a strely.
// Vzory jsou vicebarevne: kazdy znak je barva z palety, '.' je prazdno.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const VOXEL = 0.5;
const VOXEL_STITU = 0.6;

const PALETA = {
  b: 0x1f6fff, // modra
  r: 0xff2a2a, // cervena
  w: 0xffffff, // bila
  c: 0x00b4ff, // azurova (ESA)
  s: 0xb8c4d0, // stribrna (Starship)
  k: 0x101418, // cerna
  o: 0xff7a1a, // oranzova (plamen)
  y: 0xffd23f, // zluta
  f: 0xffc8a0, // plet
  g: 0x3cd23c, // zelena (pevnina)
};

// Radky formace odshora (body 50, 40, 30, 20, 10): NASA, ESA, Starship, Einstein, globus.
// Vlastni zjednodusene voxelove vyobrazeni, ne presna loga.
const VETRELCI = [
  { barva: 0x1f6fff, vzory: [ // NASA: modry kruh s cervenou drahou a hvezdami
    ['..bbbbb..', '.bbwbbbb.', 'bbbbbrrrb', 'bwbbrrbbb', 'brrrbbbwb', 'rrbbbbbbb', '.bbbwbbb.', '..bbbbb..'],
    ['..bbbbb..', '.bbbbbwb.', 'bbbbbrrrb', 'bbbbrrbbb', 'brrrbbbbb', 'rrbbbbwbb', '.bwbbbbb.', '..bbbbb..'],
  ] },
  { barva: 0x00b4ff, vzory: [ // ESA: bile "e" v azurovem kruhu
    ['..ccccc..', '.cwwwwwc.', 'ccwcccwcc', 'ccwwwwwcc', 'ccwcccccc', '.cwwwwwc.', '..ccccc..'],
    ['..cwccc..', '.cwwwwwc.', 'ccwcccwcc', 'ccwwwwwcc', 'ccwcccccc', '.cwwwwwc.', '..cccwc..'],
  ] },
  { barva: 0xb8c4d0, vzory: [ // Starship s plamenem
    ['....s....', '...sss...', '...sks...', '..sssss..', '...sss...', '...sss...', '..sssss..', '..s...s..', '...oyo...'],
    ['....s....', '...sss...', '...sks...', '..sssss..', '...sss...', '...sss...', '..sssss..', '..s...s..', '..oyyyo..'],
  ] },
  { barva: 0xffffff, vzory: [ // Einstein: rozcuchane vlasy, knir; ve druhem snimku vyplazeny jazyk
    ['.w.www.w.', 'wwwwwwwww', 'ww.fff.ww', 'w.fkfkf.w', '..fffff..', '..wwwww..', '...fff...'],
    ['w..www..w', 'wwwwwwwww', 'ww.fff.ww', 'w.fkfkf.w', '..fffff..', '..wwwww..', '...frf...'],
  ] },
  { barva: 0x3cd23c, vzory: [ // globus na stojanku, otaci se
    ['..bbbbb..', '.bggbbbb.', 'bbgggbbgb', 'bggbbbggb', 'bbbbgbggb', '.bbbggbb.', '..bbbbb..', '....y....', '..yyyyy..'],
    ['..bbbbb..', '.bbbggbb.', 'bgbbgggbb', 'bggbbggbb', 'bggbbbbgb', '.bbggbbb.', '..bbbbb..', '....y....', '..yyyyy..'],
  ] },
];

// Hrac: kanon strazce kupole. Bonus nahore: raketoplan.
const HRAC = ['....w....', '....w....', '...ccc...', '..ccccc..', '.ccccccc.', 'ccccccccc'];
const UFO = ['.k..........', '.kw.........', 'wwwwwwwwwwww', '.wwwwwwwwwkk', '..kkkkkkkkk.', '........oo..'];
export const VZOR_STITU = [
  '..########..', '.##########.', '############', '############', '####....####', '###......###',
];

function geometrieZVzoru(vzor, voxel, hloubka) {
  const vyska = vzor.length, sirka = vzor[0].length;
  const kusy = [];
  const barva = new THREE.Color();
  vzor.forEach((radek, r) => [...radek].forEach((znak, c) => {
    if (znak === '.') return;
    // zaoblene hrany = svetlo se leskne na hranach kosticek
    const g = new RoundedBoxGeometry(voxel * 0.93, voxel * 0.93, hloubka, 2, voxel * 0.16);
    g.translate((c - (sirka - 1) / 2) * voxel, ((vyska - 1) / 2 - r) * voxel, 0);
    barva.setHex(PALETA[znak] ?? 0xffffff);
    const barvy = new Float32Array(g.attributes.position.count * 3);
    for (let i = 0; i < barvy.length; i += 3) barvy.set([barva.r, barva.g, barva.b], i);
    g.setAttribute('color', new THREE.BufferAttribute(barvy, 3));
    kusy.push(g);
  }));
  const geo = mergeGeometries(kusy);
  kusy.forEach((g) => g.dispose());
  return geo;
}

function zariciMaterial(barva, zare) {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(barva).multiplyScalar(0.12), emissive: barva, emissiveIntensity: zare, roughness: 0.3, metalness: 0.6,
  });
}

// Svit (emissive) podle barvy vrcholu, aby kazda kosticka zarila svou barvou.
function viceBarevnyMaterial(zare) {
  const mat = new THREE.MeshStandardMaterial({
    color: 0x1e1e1e, vertexColors: true, emissive: 0xffffff, emissiveIntensity: zare, roughness: 0.3, metalness: 0.6,
  });
  mat.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <emissivemap_fragment>',
      '#include <emissivemap_fragment>\n  totalEmissiveRadiance *= vColor;');
  };
  return mat;
}

function model(vzory, barva, zare, voxel = VOXEL) {
  return {
    geo: vzory.map((v) => geometrieZVzoru(v, voxel, voxel * 1.6)),
    mat: viceBarevnyMaterial(zare),
    barva: new THREE.Color(barva),
    pulSirka: (vzory[0][0].length * voxel) / 2,
    pulVyska: (vzory[0].length * voxel) / 2,
  };
}

export function vytvorModely() {
  return {
    vetrelci: VETRELCI.map(({ vzory, barva }) => model(vzory, barva, 0.8)),
    hrac: model([HRAC], 0x9fffe0, 0.7),
    ufo: model([UFO], 0xf0f4ff, 0.6),
    stit: {
      geo: new RoundedBoxGeometry(VOXEL_STITU * 0.92, VOXEL_STITU * 0.92, VOXEL_STITU * 1.8, 2, VOXEL_STITU * 0.15),
      mat: zariciMaterial(0xa8e8ff, 0.5),
      barva: new THREE.Color(0xa8e8ff),
      voxel: VOXEL_STITU,
    },
    strelaHrace: {
      geo: new THREE.BoxGeometry(0.28, 1.9, 0.28),
      mat: zariciMaterial(0x7ffcff, 1.6),
    },
    strelaVetrelce: {
      geo: new THREE.BoxGeometry(0.5, 1.3, 0.5),
      mat: zariciMaterial(0xffd23f, 1.4),
    },
  };
}
