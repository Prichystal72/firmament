// Postprocessing: vyhlazeny (MSAA) render, bloom, tonemapping a filmovy dojezd
// (chromaticka aberace k okrajum, vinetace, jemne zrno).
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { naMobilu } from './dotyk.js';

const VZORKY_MSAA = naMobilu ? 2 : 4;
const ROZLISENI_ZARE = naMobilu ? 0.5 : 1; // bloom na mobilu v polovicnim rozliseni

const FILM = {
  uniforms: { tDiffuse: { value: null }, cas: { value: 0 } },
  vertexShader: `varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float cas; varying vec2 vUv;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      vec2 d = vUv - 0.5;
      float r2 = dot(d, d);
      vec2 aberace = d * 0.006 * r2 * 4.0;
      vec3 c = vec3(texture2D(tDiffuse, vUv + aberace).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - aberace).b);
      c *= 1.0 - smoothstep(0.08, 0.5, r2) * 0.85;
      c += (hash(vUv * 1000.0 + cas) - 0.5) * 0.025;
      gl_FragColor = vec4(c, 1.0);
    }`,
};

export function vytvorPostproces(renderer, scena, kamera) {
  const cil = new THREE.WebGLRenderTarget(innerWidth, innerHeight, { type: THREE.HalfFloatType, samples: VZORKY_MSAA });
  const composer = new EffectComposer(renderer, cil);
  composer.addPass(new RenderPass(scena, kamera));
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth * ROZLISENI_ZARE, innerHeight * ROZLISENI_ZARE), 0.55, 0.35, 0.7));
  composer.addPass(new OutputPass());
  const film = new ShaderPass(FILM);
  composer.addPass(film);
  return {
    composer,
    render(cas) {
      film.uniforms.cas.value = cas % 100;
      composer.render();
    },
  };
}
