// Pozadi: placata Zeme (disk s mapou), ledova stena na okraji, sklenena kupole (firmament),
// male Slunce a Mesic krouzici nad diskem, hvezdy a mlhovina za kupoli.
import * as THREE from 'three';

export const PODLAHA_Y = -24;
const POLOMER_DISKU = 300;
const VYSKA_STENY = 34;
const POLOMER_KUPOLE = 330;
const VYSKA_SVETEL = 90;          // Slunce a Mesic krouzi nad diskem
const POLOMER_OBEHU = 140;
const DOBA_OBEHU_S = 150;
const OTACENI_DISKU = 0.01;       // rad/s, pomale otaceni mapy pod hracem

// Mapa disku kreslena do canvasu: ocean, pevniny ze sumu, rovnobezky, poledniky, led na okraji.
function vytvorMapu() {
  const VEL = 2048;
  const cv = document.createElement('canvas');
  cv.width = cv.height = VEL;
  const g = cv.getContext('2d');
  const s = VEL / 2;
  const ocean = g.createRadialGradient(s, s, 0, s, s, s);
  ocean.addColorStop(0, '#0b3d6e');
  ocean.addColorStop(0.85, '#06213f');
  ocean.addColorStop(1, '#03101f');
  g.fillStyle = ocean;
  g.fillRect(0, 0, VEL, VEL);

  // pevniny: shluky kruhu podel nekolika "ramen" od stredu (azimutalni dojem)
  const nahoda = (() => { let x = 7; return () => (x = (x * 16807) % 2147483647) / 2147483647; })();
  for (let rameno = 0; rameno < 6; rameno++) {
    const uhel0 = rameno * Math.PI / 3 + nahoda() * 0.6;
    for (let i = 0; i < 260; i++) {
      const r = (0.12 + nahoda() * 0.7) * s;
      const u = uhel0 + (nahoda() - 0.5) * (0.9 - r / s * 0.5);
      const x = s + Math.cos(u) * r, y = s + Math.sin(u) * r;
      const vel = (8 + nahoda() * 38) * (1 - r / s * 0.5);
      g.fillStyle = `hsl(${95 + nahoda() * 40}, ${35 + nahoda() * 25}%, ${18 + nahoda() * 14}%)`;
      g.beginPath();
      g.arc(x, y, vel, 0, Math.PI * 2);
      g.fill();
    }
  }
  // severni pol uprostred
  g.fillStyle = '#9fc8e0';
  g.beginPath();
  g.arc(s, s, 34, 0, Math.PI * 2);
  g.fill();
  // rovnobezky a poledniky
  g.strokeStyle = 'rgba(255, 210, 120, 0.35)';
  g.lineWidth = 3;
  for (let k = 1; k <= 6; k++) {
    g.beginPath();
    g.arc(s, s, (k / 6.4) * s, 0, Math.PI * 2);
    g.stroke();
  }
  for (let k = 0; k < 24; k++) {
    const u = (k / 24) * Math.PI * 2;
    g.beginPath();
    g.moveTo(s, s);
    g.lineTo(s + Math.cos(u) * s, s + Math.sin(u) * s);
    g.stroke();
  }
  // ledovy prstenec (Antarktida po obvodu)
  g.lineWidth = 70;
  g.strokeStyle = '#cfeeff';
  g.beginPath();
  g.arc(s, s, s - 35, 0, Math.PI * 2);
  g.stroke();
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function vytvorDisk() {
  const mapa = vytvorMapu();
  const disk = new THREE.Mesh(
    new THREE.CircleGeometry(POLOMER_DISKU, 160).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({
      map: mapa, emissiveMap: mapa, emissive: 0xffffff, emissiveIntensity: 0.14, roughness: 0.85, metalness: 0.05,
    }));
  disk.position.y = PODLAHA_Y;
  return disk;
}

// Ledova stena: otevreny valec po obvodu s rozeklanym hornim okrajem.
function vytvorStenu() {
  const geo = new THREE.CylinderGeometry(POLOMER_DISKU, POLOMER_DISKU + 6, VYSKA_STENY, 360, 6, true);
  const poz = geo.attributes.position;
  for (let i = 0; i < poz.count; i++) {
    const y = poz.getY(i);
    if (y < VYSKA_STENY / 2 - 0.01) continue;
    const u = Math.atan2(poz.getZ(i), poz.getX(i));
    poz.setY(i, y + 6 * Math.sin(u * 37) + 4 * Math.sin(u * 91 + 1.3) + 3 * Math.sin(u * 173));
  }
  geo.computeVertexNormals();
  const stena = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
    color: 0x8fc4e6, emissive: 0x1a4a70, emissiveIntensity: 0.35, roughness: 0.35, metalness: 0.1,
    side: THREE.DoubleSide, flatShading: true,
  }));
  stena.position.y = PODLAHA_Y + VYSKA_STENY / 2;
  return stena;
}

// Firmament: polokoule zevnitr, skleneny odlesk k okrajum (fresnel) a jemna sit.
function vytvorKupoli() {
  const mat = new THREE.ShaderMaterial({
    uniforms: { cas: { value: 0 } },
    transparent: true, depthWrite: false, side: THREE.BackSide, blending: THREE.AdditiveBlending, fog: false,
    vertexShader: `varying vec3 vNormal; varying vec3 vPohled; varying vec2 vUv;
      void main() {
        vUv = uv;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vPohled = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `uniform float cas; varying vec3 vNormal; varying vec3 vPohled; varying vec2 vUv;
      void main() {
        float fresnel = pow(1.0 - abs(dot(vNormal, vPohled)), 3.0);
        float sit = max(smoothstep(0.985, 1.0, abs(sin(vUv.x * 3.14159 * 24.0))),
                        smoothstep(0.985, 1.0, abs(sin(vUv.y * 3.14159 * 16.0))));
        float vlna = 0.5 + 0.5 * sin(vUv.y * 40.0 - cas * 0.8);
        vec3 c = vec3(0.25, 0.7, 1.0) * (fresnel * 0.55 + sit * 0.07 * (0.6 + 0.4 * vlna));
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  const kupole = new THREE.Mesh(new THREE.SphereGeometry(POLOMER_KUPOLE, 96, 48, 0, Math.PI * 2, 0, Math.PI / 2), mat);
  kupole.position.y = PODLAHA_Y;
  return kupole;
}

// Male Slunce a Mesic nad diskem, Slunce zaroven sviti na scenu.
function vytvorNebeska() {
  const skupina = new THREE.Group();
  const slunce = new THREE.Mesh(new THREE.SphereGeometry(9, 32, 16),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.75, 0.3).multiplyScalar(2.2) }));
  slunce.add(new THREE.PointLight(0xffc070, 2.5, 0, 0));
  const mesic = new THREE.Mesh(new THREE.SphereGeometry(7, 32, 16),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(0.75, 0.82, 1.0).multiplyScalar(1.3) }));
  mesic.add(new THREE.PointLight(0x9fb8ff, 0.8, 0, 0));
  skupina.add(slunce, mesic);
  skupina.position.y = PODLAHA_Y + VYSKA_SVETEL;
  return { skupina, slunce, mesic };
}

function vytvorMlhovinu() {
  const mat = new THREE.ShaderMaterial({
    uniforms: { cas: { value: 0 } },
    depthWrite: false, fog: false,
    vertexShader: `varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `varying vec2 vUv; uniform float cas;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float sum(vec2 p) {
        vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
      }
      float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 6; i++) { v += a * sum(p); p *= 2.03; a *= 0.5; } return v; }
      void main() {
        vec2 p = vUv * vec2(6.0, 3.0) + vec2(cas * 0.01, 0.0);
        float n = fbm(p + fbm(p + cas * 0.005));
        float maska = smoothstep(0.45, 0.85, n) * smoothstep(0.0, 0.35, vUv.y);
        vec3 c = mix(vec3(0.25, 0.05, 0.45), vec3(0.05, 0.25, 0.5), fbm(p * 1.7));
        gl_FragColor = vec4(c * maska * 0.3, 1.0);
      }`,
  });
  const mlhovina = new THREE.Mesh(new THREE.PlaneGeometry(1800, 800), mat);
  mlhovina.position.set(0, 220, -650);
  return mlhovina;
}

function vytvorHvezdy() {
  const POCET = 2600;
  const poz = new Float32Array(POCET * 3);
  const barvy = new Float32Array(POCET * 3);
  const c = new THREE.Color();
  for (let i = 0; i < POCET; i++) {
    // hvezdy za kupoli, v horni polokouli
    const u = Math.random() * Math.PI * 2, v = Math.random() * Math.PI * 0.45;
    const r = 420 + Math.random() * 150;
    poz.set([Math.cos(u) * Math.sin(v) * r, PODLAHA_Y + Math.cos(v) * r * 0.9 + 10, Math.sin(u) * Math.sin(v) * r], i * 3);
    c.setHSL(Math.random() < 0.7 ? 0.62 : Math.random(), 0.6, 0.6 + Math.random() * 0.4);
    barvy.set([c.r, c.g, c.b], i * 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(poz, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(barvy, 3));
  return new THREE.Points(geo, new THREE.PointsMaterial({ size: 1.8, vertexColors: true, fog: false }));
}

export function vytvorPozadi(scena) {
  const disk = vytvorDisk();
  const kupole = vytvorKupoli();
  const mlhovina = vytvorMlhovinu();
  const hvezdy = vytvorHvezdy();
  const nebeska = vytvorNebeska();
  scena.add(mlhovina, hvezdy, disk, vytvorStenu(), kupole, nebeska.skupina);
  return {
    aktualizuj(cas) {
      disk.rotation.y = cas * OTACENI_DISKU;
      kupole.material.uniforms.cas.value = cas;
      mlhovina.material.uniforms.cas.value = cas;
      hvezdy.rotation.y = cas * 0.004;
      const u = (cas / DOBA_OBEHU_S) * Math.PI * 2;
      nebeska.slunce.position.set(Math.cos(u) * POLOMER_OBEHU, 0, Math.sin(u) * POLOMER_OBEHU - 60);
      nebeska.mesic.position.set(-Math.cos(u) * POLOMER_OBEHU, 8, -Math.sin(u) * POLOMER_OBEHU - 60);
    },
  };
}
