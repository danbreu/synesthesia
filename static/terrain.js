import * as THREE from "./ext/three.js";

import { noise, toArray, toDepthTexture } from "./noise.js"

export const terrainSdfMaterial = () => {
  const noise1 = toDepthTexture(toArray(sampleNoise(0.2), 16, 16, 16), 16, 16, 16)
  const noise2 = toDepthTexture(toArray(sampleNoise(0.1), 16, 16, 16), 16, 16, 16)
  const noise3 = toDepthTexture(toArray(sampleNoise(0.03), 16, 16, 16), 16, 16, 16)

    const uniforms = {
      uNoise1: { value: noise1 },
      uNoise2: { value: noise2 },
      uNoise3: { value: noise3 }
    }

    const material = new THREE.ShaderMaterial( {
        uniforms: uniforms,
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
    });

    return material
}
const sampleNoise = step => (x,y,z) => noise(step*x, step*y, step*z)
const vertexShader = `
out vec4 pos;

void main() {
  vec4 modelPos = modelViewMatrix * vec4( position, 1.0 );
  pos = modelPos;
  gl_Position = projectionMatrix * modelPos;

}
`
const fragmentShader = `
precision mediump sampler3D;

in vec4 pos;
uniform sampler3D uNoise1;
uniform sampler3D uNoise2;
uniform sampler3D uNoise3;

void main() {

	gl_FragColor = vec4(1.0);

}
`
