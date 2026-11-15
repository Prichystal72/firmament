// Body vyskakujici v miste sestrelu: text do canvasu jako sprite, stoupa a mizi.
import * as THREE from 'three';

const DOBA_S = 1.3;
const STOUPANI = 7;            // jednotek sceny za dobu zobrazeni
const VYSKA_TEXTU = 2.6;       // jednotek sceny
const PISMO = "'Press Start 2P', monospace";

export class Body {
  constructor(scena) {
    this.scena = scena;
    this.aktivni = [];
  }

  ukaz(pozice, text, barva) {
    const cv = document.createElement('canvas');
    const g = cv.getContext('2d');
    const VEL_PX = 48;
    g.font = `${VEL_PX}px ${PISMO}`;
    cv.width = Math.ceil(g.measureText(text).width) + 24;
    cv.height = VEL_PX + 24;
    g.font = `${VEL_PX}px ${PISMO}`;
    g.textBaseline = 'middle';
    g.lineWidth = 8;
    g.strokeStyle = 'rgba(0, 0, 0, 0.8)';
    g.strokeText(text, 12, cv.height / 2);
    g.fillStyle = '#' + barva.getHexString();
    g.fillText(text, 12, cv.height / 2);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
    mat.color.setScalar(1.6); // nad 1 = zare bloomu
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(VYSKA_TEXTU * cv.width / cv.height, VYSKA_TEXTU, 1);
    sprite.position.copy(pozice);
    sprite.position.z += 2;
    sprite.renderOrder = 10;
    this.scena.add(sprite);
    this.aktivni.push({ sprite, zbyva_s: DOBA_S, y0: sprite.position.y });
  }

  aktualizuj(dt) {
    for (let i = this.aktivni.length - 1; i >= 0; i--) {
      const b = this.aktivni[i];
      b.zbyva_s -= dt;
      const t = 1 - b.zbyva_s / DOBA_S;
      b.sprite.position.y = b.y0 + STOUPANI * (1 - (1 - t) * (1 - t));
      b.sprite.material.opacity = t < 0.6 ? 1 : 1 - (t - 0.6) / 0.4;
      if (b.zbyva_s <= 0) {
        this.scena.remove(b.sprite);
        b.sprite.material.map.dispose();
        b.sprite.material.dispose();
        this.aktivni.splice(i, 1);
      }
    }
  }
}
