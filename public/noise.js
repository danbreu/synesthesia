/**
 * Functions to generate noise and put it into the right data structures for use with the gpu or cpu
 */

import * as THREE from './ext/three.js'

const BUFFER_SIZE = 64
const noiseBuffer = {}

/**
  * Deterministic randomness
  *
  * References:
  * - https://stackoverflow.com/a/47593316
  */
const random = (a) => {
	let t = a += 0x6D2B79F5
	t = Math.imul(t ^ t >>> 15, t | 1)
	t ^= t + Math.imul(t ^ t >>> 7, t | 61)
	return ((t ^ t >>> 14) >>> 0) / 4294967296
}

/**
  * Implementation of improved perlin noise with fifth degree interpolaton polynomial
  *
  * References:
  * - https://developer.nvidia.com/gpugems/gpugems/part-i-natural-effects/chapter-5-implementing-improved-perlin-noise
  * - https://cs.nyu.edu/~perlin/noise/
  */
export const noise = function (x, y, z) {
	const floorX = Math.floor(x); const floorY = Math.floor(y); const floorZ = Math.floor(z)

	const X = floorX & 255; const Y = floorY & 255; const Z = floorZ & 255

	x -= floorX
	y -= floorY
	z -= floorZ

	const xMinus1 = x - 1; const yMinus1 = y - 1; const zMinus1 = z - 1

	const u = fade(x); const v = fade(y); const w = fade(z)

	const A = p[X] + Y; const AA = p[A] + Z; const AB = p[A + 1] + Z; const B = p[X + 1] + Y; const BA = p[B] + Z; const BB = p[B + 1] + Z

	return lerp(w, lerp(v, lerp(u, grad(p[AA], x, y, z),
		grad(p[BA], xMinus1, y, z)),
	lerp(u, grad(p[AB], x, yMinus1, z),
		grad(p[BB], xMinus1, yMinus1, z))),
	lerp(v, lerp(u, grad(p[AA + 1], x, y, zMinus1),
		grad(p[BA + 1], xMinus1, y, z - 1)),
	lerp(u, grad(p[AB + 1], x, yMinus1, zMinus1),
		grad(p[BB + 1], xMinus1, yMinus1, zMinus1))))
}
const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10)
const lerp = (t, a, b) => a + (b - a) * t
const p = [151, 160, 137, 91, 90, 15, 131, 13, 201, 95, 96, 53, 194, 233, 7, 225, 140, 36, 103, 30, 69, 142, 8, 99, 37, 240, 21, 10,
	23, 190, 6, 148, 247, 120, 234, 75, 0, 26, 197, 62, 94, 252, 219, 203, 117, 35, 11, 32, 57, 177, 33, 88, 237, 149, 56, 87,
	174, 20, 125, 136, 171, 168, 68, 175, 74, 165, 71, 134, 139, 48, 27, 166, 77, 146, 158, 231, 83, 111, 229, 122, 60, 211,
	133, 230, 220, 105, 92, 41, 55, 46, 245, 40, 244, 102, 143, 54, 65, 25, 63, 161, 1, 216, 80, 73, 209, 76, 132, 187, 208,
	89, 18, 169, 200, 196, 135, 130, 116, 188, 159, 86, 164, 100, 109, 198, 173, 186, 3, 64, 52, 217, 226, 250, 124, 123, 5,
	202, 38, 147, 118, 126, 255, 82, 85, 212, 207, 206, 59, 227, 47, 16, 58, 17, 182, 189, 28, 42, 223, 183, 170, 213, 119,
	248, 152, 2, 44, 154, 163, 70, 221, 153, 101, 155, 167, 43, 172, 9, 129, 22, 39, 253, 19, 98, 108, 110, 79, 113, 224, 232,
	178, 185, 112, 104, 218, 246, 97, 228, 251, 34, 242, 193, 238, 210, 144, 12, 191, 179, 162, 241, 81, 51, 145, 235, 249,
	14, 239, 107, 49, 192, 214, 31, 181, 199, 106, 157, 184, 84, 204, 176, 115, 121, 50, 45, 127, 4, 150, 254, 138, 236, 205,
	93, 222, 114, 67, 29, 24, 72, 243, 141, 128, 195, 78, 66, 215, 61, 156, 180]
for (let i = 0; i < 256; i++) {
	p[256 + i] = p[i]
}

function grad (hash, x, y, z) {
	const h = hash & 15
	const u = h < 8 ? x : y; const v = h < 4 ? y : h == 12 || h == 14 ? x : z
	return ((h & 1) == 0 ? u : -u) + ((h & 2) == 0 ? v : -v)
}

/**
  * Sample noiseFunction into [x,y,z]-length Array
  */
export const toArray = (noiseFunction, xLength, yLength, zLength) => {
	const data = new Float32Array(xLength * yLength * zLength)
	for (let i = 0; i < xLength; ++i) {
		for (let j = 0; j < yLength; ++j) {
			for (let k = 0; k < zLength; ++k) {
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

/**
  * Get blueprint for generating one octave of perlin noise
  * @param {Matrix4} inputTransformation Transformation of the input coordinates
  * @param {Matrix4} outputTransformation Transformation of the output coordinates
  */
export const noiseBlueprint = (inputTransformation, outputTranformation, sampleScale) => {
	return {
		inputTransformation,
		outputTransformation: outputTranformation,
		sampleScale
	}
}

/**
  * Buffer noise for blueprint for fast access
  */
export const bufferNoise = (blueprint) => {
	const X = new THREE.Vector4()
	const resultingFun = (x, y, z) => {
		X.set(x, y, z, 1)

		X.applyMatrix4(blueprint.inputTransformation)

		return noise(X.x, X.y, X.z)
	}
	const array = toArray(resultingFun, BUFFER_SIZE, BUFFER_SIZE, BUFFER_SIZE)

	noiseBuffer[blueprint.inputTransformation] = array
}

/**
  * Get function for sampling buffered noise
  */
export const getBufferedNoise = (blueprint) => {
	const buffer = noiseBuffer[blueprint.inputTransformation]
	const X = new THREE.Vector4()
	return (x, y, z) => {
		X.x = Math.round(x)
		X.y = Math.round(y)
		X.z = Math.round(z)
		X.w = 1

		X.applyMatrix4(blueprint.outputTransformation)

		return sample(buffer, X.x, X.y, X.z) * blueprint.sampleScale
	}
}
const sample = (buffer, x, y, z) => buffer[Math.abs(x) % BUFFER_SIZE + (Math.abs(y) % BUFFER_SIZE) * BUFFER_SIZE + (Math.abs(z) % BUFFER_SIZE) * BUFFER_SIZE * BUFFER_SIZE]

/**
  * Create buffered noise with transoftmation and scale
  */
export const createBufferedNoise = (inputTransformation, outputTransformation, sampleScale) => {
	const blueprint = noiseBlueprint(inputTransformation, outputTransformation, sampleScale)
	bufferNoise(blueprint)
	return getBufferedNoise(blueprint)
}

/**
  * Get function calculating layered noise on the CPU
  */
export const getLayeredNoise = (noiseBlueprints) => {
	const functions = noiseBlueprints.map(getBufferedNoise)
	return (x, y, z) => {
		let value = y - 8
		functions.forEach(fun => value += fun(x, y, z))
		return value
	}
}

/**
  * Get shader program for calculating layered noise on the GPU
  */
export const getLayeredNoiseShader = (noiseBlueprints, name = 'sampleNoise') => {
	const noiseTexture = (no) => `uniform sampler3D uNoise${name}${no};\n`
	const matrix = (m) => `mat4(${String(m.elements.map(x => x.toFixed(12)))})`
	const sampleTexture = (uniform, m, scalar) => `${scalar.toFixed(12)}*texture(uNoise${name}${uniform}, (${matrix(m)}*position).xyz).x`

	let shader = ''
	for (let i = 0; i < noiseBlueprints.length; i++) {
		shader += noiseTexture(i)
	}

	shader += `float ${name}(vec4 position) {
		return `

	for (let i = 0; i < noiseBlueprints.length; i++) {
		shader += sampleTexture(i, noiseBlueprints[i].outputTransformation, noiseBlueprints[i].sampleScale)
		if (i < noiseBlueprints.length - 1) shader += '+'
	}

	shader += '+position.y-8.0;\n}'

	return shader
}

/**
  * Get textures for layered noise shader
  */
export const getLayeredNoiseTextures = (noiseBlueprints, name = 'sampleNoise') => {
	const uniforms = {}

	for (let i = 0; i < noiseBlueprints.length; i++) {
		const blueprint = noiseBuffer[noiseBlueprints[i].inputTransformation]
		uniforms[`uNoise${name}${i}`] = { value: toDepthTexture(blueprint, BUFFER_SIZE, BUFFER_SIZE, BUFFER_SIZE) }
	}

	return uniforms
}
