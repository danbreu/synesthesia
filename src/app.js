const THREE = require('three')
const MusicAnalyzer = require('./musicAnalyzer')
const noise = require('./noise')
const terrain = require('./terrain.js')
const WavDecoder = require('./wavDecoder')

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
	const file = new File([blob], 'madragora.mp3', { type: 'audio/wav' })

	const wavDecoder = new WavDecoder(file)
	await wavDecoder.start()
	const pcmData = wavDecoder.pcmData

	const musicAnalyzer = new MusicAnalyzer(pcmData, wavDecoder.duration, wavDecoder.sampleRate)

	console.log(musicAnalyzer.getBassness(56800))
}

const initNoise = () => {
	const scale = 0.6
	const n0 = noise.noiseBlueprint(new THREE.Matrix4().set(0, 0, 1 / 60 * scale, 0, 0, 1 / 40 * scale, 0, 0, 1 / 40 * scale, 0, 0, 0, 0, 0, 0, 1), new THREE.Matrix4().makeTranslation(2, 2, 2), 20)
	const n2 = noise.noiseBlueprint(new THREE.Matrix4().multiplyScalar(1 / 80 * scale), new THREE.Matrix4(), 20)
	const n3 = noise.noiseBlueprint(new THREE.Matrix4().set(0, 0, 1 / 5 * scale, 0, 1 / 5 * scale, 0, 0, 0, 0, 1 / 5 * scale, 0, 0, 0, 0, 0, 1), new THREE.Matrix4(), 1)
	const n4 = noise.noiseBlueprint(new THREE.Matrix4().set(0, 0, 1 / 2 * scale, 0, 0, 1 / 2 * scale, 0, 0, 1 / 2 * scale, 0, 0, 0, 0, 0, 0, 1), new THREE.Matrix4(), 5)
	const blueprints = [n0, n2, n3]
	blueprints.forEach(noise.bufferNoise)
	const fun = noise.getLayeredNoise(blueprints)
	const start = terrain.findStartingLocation(fun, 5, 5, 5)

	return [blueprints, fun, start]
}

const v = 0.1
const nextPos = (pos, dir) => {
	return pos.add(dir.multiplyScalar(v))
}

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
const buffer = new THREE.Vector3(0, 0, 0)
const startingPoint = new THREE.Vector3()
const bufferEuler = new THREE.Euler()
const topEuler = new THREE.Euler()
const topDirection = new THREE.Vector3()
const angularVelocity = new THREE.Euler(0.2, 0.2, 0)
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
	if (!(topEuler.x == topEuler.y == topEuler.z == 0)) {
		console.log('a', camera.getWorldDirection(topDirection))
		console.log('b', buffer)
	}

	return buffer
}

const initThree = () => {
	const scene = new THREE.Scene()
	const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
	scene.add(camera)

	const canvas = document.createElement('canvas')
	const context = canvas.getContext('webgl2', { alpha: false })
	if (!context) {
		alert('WebGL 2 is required for running this application')
	}
	const renderer = new THREE.WebGLRenderer({ canvas, context })
	renderer.setSize(window.innerWidth, window.innerHeight)
	document.body.appendChild(renderer.domElement)

	const [noiseBlueprints, noiseFunction, startLocation] = initNoise()
	camera.position.x = startLocation[0]
	camera.position.y = startLocation[1]
	camera.position.z = startLocation[2]

	const skyColor = 0xB1E1FF
	const groundColor = 0xB97A20
	const hemisphere = new THREE.HemisphereLight(skyColor, groundColor, 0.2)
	const point = new THREE.PointLight(0xFFFFFF, 0.8)
	point.position.y += 1
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

	const pos = new THREE.Vector3()
	const animate = () => {
		terrain.updateChunkPosition(scene,
			noiseBlueprints,
			pos.set(Math.floor(camera.position.x / 32),
				Math.floor(camera.position.y / 32),
				Math.floor(camera.position.z / 32)))

		camera.lookAt(lookNext(noiseFunction, camera).add(camera.position))
		nextPos(camera.position, camera.getWorldDirection(buffer))

		resizeCanvasToWindowSize()
		requestAnimationFrame(animate)
		renderer.render(scene, camera)
	}

	animate()
}

window.addEventListener('DOMContentLoaded', main)
