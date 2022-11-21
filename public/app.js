import { Matrix4, Vector3, Euler, Scene, PerspectiveCamera, WebGLRenderer, HemisphereLight, PointLight } from './ext/three.js'
import MusicAnalyzer from './musicAnalyzer.js'
import { noiseBlueprint, bufferNoise, getLayeredNoise, getLayeredNoiseShader } from './noise.js'
import { findStartingLocation, initShaderMaterial, updateChunkPosition } from './terrain.js'
import WavDecoder from './wavDecoder.js'

/**
 * Main entry point of the application.
 */
async function main () {
	initMusicAnalyzer()

	initThree()
}

const initMusicAnalyzer = async () => {
	const blob = await fetch('./music/madragora.wav')
		.then((res) => {
			if (!res.ok) {
				throw Error(`File could not be fetched. Code: ${res.status}: ${res.statusText}`)
			}
			return res.blob()
		})
	const file = new File([blob], 'madragora.wav', { type: 'audio/wav' })

	const wavDecoder = new WavDecoder(file)
	await wavDecoder.start()
	const pcmData = wavDecoder.pcmData

	const musicAnalyzer = new MusicAnalyzer(pcmData, wavDecoder.duration, wavDecoder.sampleRate)
	console.log(musicAnalyzer.getFrequencySlice(56800, 0, 250))
	console.log(musicAnalyzer.getFrequencySlice(80800, 0, 250))
	console.log(musicAnalyzer.getFrequencySlice(80800, 8000, 20000))

}

const initNoise = () => {
	const blueprints = [noiseBlueprint(new Matrix4().makeScale(1, 2, 1).multiplyScalar(0.1), new Matrix4().makeTranslation(4,4,4), 8),
		noiseBlueprint(new Matrix4().makeScale(1, 2, 1).multiplyScalar(0.1), new Matrix4().makeScale(1, 0, 1), 8)]
	console.log(getLayeredNoiseShader(blueprints))
	blueprints.forEach(bufferNoise)
	const fun = getLayeredNoise(blueprints)
	//const start = findStartingLocation(fun, 5, 5, 5)

	return [blueprints, fun, null]//, start]
}

const v = 0.1
const nextPos = (pos, dir) => {
	return pos.add(dir.multiplyScalar(v))
}

/**
 * Casts a ray from position in direction using ray marching on terrainFunction
 * 
 * @param {(x, y, z) => number} terrainFunction Geometry defined implicitly using (distanceish) scalar field
 * @param {Vector3} position Position to cast the ray from
 * @param {Vector3} direction Direction to cast the ray in
 * @param {number} noSamples Maximum amount of times the ray is advanced 
 * @param {number} isoLevel Level below which an object exist at point
 * @returns number
 */
const marchRay = (terrainFunction, position, direction, noSamples = 10, isoLevel = 0) => {
	let distance = 0
	let cumDistance = 0

	for (let i = 0; i < noSamples; i++) {
		distance = terrainFunction(position.x + direction.x * distance,
			position.y + direction.y * distance,
			position.z + direction.z * distance) - 2
		if (distance > isoLevel) cumDistance += distance
		else break
	}

	return cumDistance
}

const coneAngle = 4
const samples = 40
const buffer = new Vector3(0, 0, 0)
const startingPoint = new Vector3()
const bufferEuler = new Euler()
const topEuler = new Euler()
const topDirection = new Vector3()
const angularVelocity = new Euler(0.2, 0.2, 0)
const lookNext = (terrainFunction, camera) => {
	camera.getWorldDirection(buffer)

	startingPoint.copy(buffer)

	let tries = 0
	let topDistance = 0
	const posDistance = terrainFunction(camera.position.x, camera.position.y, camera.position.z)
	for (let i = 0; i < samples * 2; i++) {
		bufferEuler.set(0, coneAngle / samples * i / 2 * (i % 2 == 0 ? -1 : 1), 0)

		buffer.copy(startingPoint)
		buffer.applyEuler(bufferEuler)

		const distance = marchRay(terrainFunction, camera.position, buffer)
		if (distance > (posDistance < 0 ? 10 : 8)) {
			topEuler.copy(bufferEuler)
			topDistance = distance
			break
		}
		tries++
	}

	let y = false
	for (let i = 0; i < tries * 2; i++) {
		bufferEuler.set(coneAngle / samples * i / 2 * (i % 2 == 0 ? -1 : 1), 0, 0)

		buffer.copy(startingPoint)
		buffer.applyEuler(bufferEuler)

		const distance = marchRay(terrainFunction, camera.position, buffer)
		if (distance > topDistance) {
			topEuler.copy(bufferEuler)
			y = true
			break
		}
	}

	for (let i = 0; i < samples * 2; i++) {
		bufferEuler[y ? 'x' : 'y'] = coneAngle / samples * i / 2 * (i % 2 == 0 ? -1 : 1)

		buffer.copy(startingPoint)
		buffer.applyEuler(bufferEuler)

		const distance = marchRay(terrainFunction, camera.position, buffer)
		if (distance > (posDistance < 0 ? 12 : 8)) {
			topEuler.copy(bufferEuler)
			break
		}
	}

	camera.getWorldDirection(buffer)
	topEuler.x *= angularVelocity.x
	topEuler.y *= angularVelocity.y
	buffer.applyEuler(topEuler)

	return buffer
}

const initThree = () => {
	const scene = new Scene()
	const camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
	scene.add(camera)

	const canvas = document.createElement('canvas')
	const context = canvas.getContext('webgl2', { alpha: false })
	if (!context) {
		alert('WebGL 2 is required for running this application')
	}
	const renderer = new WebGLRenderer({ canvas, context })
	renderer.setSize(window.innerWidth, window.innerHeight)
	document.body.appendChild(renderer.domElement)

	const [noiseBlueprints, noiseFunction, startLocation] = initNoise()
	initShaderMaterial(noiseBlueprints)
	camera.position.x = 16
	camera.position.y = 16
	camera.position.z = 8

	const skyColor = 0xB1E1FF
	const groundColor = 0xB97A20
	const hemisphere = new HemisphereLight(skyColor, groundColor, 0.2)
	const point = new PointLight(0xFFFFFF, 0.8)
	point.position.y += 2
	scene.add(hemisphere)
	camera.add(point)

	/**
	 * Resize canvas and update projection matrix if the window size changed.
	 */
	const resizeCanvasToWindowSize = () => {
		const canvas = renderer.domElement

		if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
			renderer.setSize(window.innerWidth, window.innerHeight)
			camera.aspect = window.innerWidth / window.innerHeight
			camera.updateProjectionMatrix()
		}
	}

	const pos = new Vector3()
	const animate = () => {
		updateChunkPosition(scene,
			noiseBlueprints,
			pos.set(Math.floor(camera.position.x / 32),
				Math.floor(camera.position.y / 32),
				Math.floor(camera.position.z / 32)))

		//camera.lookAt(lookNext(noiseFunction, camera).add(camera.position))
		//nextPos(camera.position, camera.getWorldDirection(buffer))
		camera.position.z -= 0.3
		//camera.rotation.x -= 0.01

		resizeCanvasToWindowSize()
		requestAnimationFrame(animate)
		renderer.render(scene, camera)
	}

	animate()
}

window.addEventListener('DOMContentLoaded', main)
