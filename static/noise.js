/**
 * Functions to generate noise and put it into the right data structures for use with the gpu or cpu
 */

import * as THREE from "./ext/three.js";

/**
 * Deterministic randomness
 *
 * References:
 * - https://stackoverflow.com/a/47593316
 */
const random = (a) => {
    var t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
}

/**
 * Implementation of improved perlin noise with fifth degree interpolaton polynomial
 *
 * References:
 * - https://developer.nvidia.com/gpugems/gpugems/part-i-natural-effects/chapter-5-implementing-improved-perlin-noise
 * - https://cs.nyu.edu/~perlin/noise/
 */
export const noise = (x, y = 0, z = 0) => {
    // Unit cube containing sample point
    const [ cubeX, cubeY, cubeZ ] = [x, y, z].map(Math.floor)

    // Relative position of sample point in cube
    x -= cubeX
    y -= cubeY
    z -= cubeZ

    // Interpolation/fade for every direction
    const [ u, v, w ] = [x, y, z].map(fade)

    // Interpolate between dot products of corner offset and random gradient vector
    return lerp(w, lerp(v, lerp(u, dotGradient(x  , y  , z   ),
                                   dotGradient(x-1, y  , z   )),
                           lerp(u, dotGradient(x  , y-1, z   ),
                                   dotGradient(x-1, y-1, z   ))),
                   lerp(v, lerp(u, dotGradient(x  , y  , z-1 ),
                                   dotGradient(x-1, y  , z-1 )),
                           lerp(u, dotGradient(x  , y-1, z-1 ),
                                   dotGradient(x-1, y-1, z-1 ))))
}
const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10)
const lerp = (t, a, b) => a + (b - a) * t
const dotGradient = (x, y, z) => {
    const hash = 5 * x + 7 * y + 11 * z
    const u = random(hash)
    const v = random(hash+1)
    const w = random(hash+2)
    const length = Math.sqrt(u*u+v*v+w*w)
    return (x * u + y * v + z * w) / length
}

/**
 * Sample noiseFunction into [x,y,z]-length Array
 */
export const toArray = (noiseFunction, xLength, yLength, zLength) => {
    const data = new Float32Array(xLength * yLength * zLength)

    for(let i = 0; i < xLength; ++i) {
        for(let j = 0; j < yLength; ++j) {
            for(let k = 0; k < zLength; ++k) {
                data[i + xLength * j + xLength * yLength * k] = noiseFunction(i, j, k)
            }
        }
    }

    return data
}

/**
 * Get depth texture from sampled array
 */
export const toDepthTexture = (data, xLength, yLength, zLength) => {
    const texture = new THREE.Data3DTexture(data, xLength, yLength, zLength)
    texture.format = THREE.RedFormat
    texture.type = THREE.FloatType
    texture.magFilter = THREE.LinearFilter
    texture.unpackAlignment = 1
    texture.needsUpdate = true
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.wrapR = THREE.RepeatWrapping

    return texture
}
