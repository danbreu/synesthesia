import * as THREE from 'three'

import { noiseBlueprint, bufferNoise, getLayeredNoise, getLayeredNoiseShader } from './noise.js'
import { initShaderMaterial, updateChunkPosition } from './terrain.js'
import { EffectComposer } from './ext/threeAddons/postprocessing/EffectComposer.js'
import { RenderPass } from './ext/threeAddons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from './ext/threeAddons/postprocessing/UnrealBloomPass.js'
import { GLTFLoader } from './ext/threeAddons/loaders/GLTFLoader.js'
import { OrbitControls } from './ext/threeAddons/controls/OrbitControls.js'
import MusicAnalyzer from './musicAnalyzer.js'

class GameScreen {
	#chunkPos = new THREE.Vector3()
	#noiseBlueprints
	#uniforms
	#composer
	#assetLocations
	#controls
	#angularVelocity
	#angularAccel
	#saucer
	#direction
	#stars

	constructor (assetLocations) {
		this.#assetLocations = assetLocations
	}

	/**
     * Initialize noise function the terrain is generated from
     *
     * @returns [blueprints, fun] Noise blueprints and resulting noise function
     */
	#initNoise () {
		const blueprints = [noiseBlueprint(new THREE.Matrix4().makeScale(1, 2, 1).multiplyScalar(0.1), new THREE.Matrix4().makeTranslation(4, 4, 4), 8),
			noiseBlueprint(new THREE.Matrix4().makeScale(2, 1, 1).multiplyScalar(0.1), new THREE.Matrix4().makeScale(1, 0, 1), 8),
			noiseBlueprint(new THREE.Matrix4().multiplyScalar(0.07), new THREE.Matrix4().makeTranslation(8, 8, 8), 4),
			noiseBlueprint(new THREE.Matrix4().multiplyScalar(0.15), new THREE.Matrix4(), 0.2)]
		console.log(getLayeredNoiseShader(blueprints))
		blueprints.forEach(bufferNoise)
		const fun = getLayeredNoise(blueprints)

		return [blueprints, fun]
	}

	#initStars (scene) {
		const particlesGeonometry = new THREE.BufferGeometry()
		const particlesCnt = 7000

		// Array for the 3d xyz cords
		const posArray = new Float32Array(particlesCnt * 3)

		const distance = new THREE.Vector3(1000, 0, 0)
		const rot = new THREE.Euler()
		for (let i = 0; i < particlesCnt; i += 3) {
			distance.applyEuler(rot.set(Math.random() * Math.PI * 2, Math.random() * Math.PI * 2, 0))
			posArray[i] = distance.x
			posArray[i + 1] = distance.y
			posArray[i + 2] = distance.z
		}

		particlesGeonometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3))

		const particlesMaterial = new THREE.PointsMaterial({
			size: 0.6
		}
		)
		this.#stars = new THREE.Points(particlesGeonometry, particlesMaterial)
		scene.add(this.#stars)
	}

	/**
     * Initialize the game screen
     *
     * @param {*} scene
     * @param {*} camera
     * @param {*} renderer
     * @param {*} nextScreenCallback
     */
	async init (scene, camera, renderer, nextScreenCallback) {
		const [noiseBlueprints, noiseFunction] = this.#initNoise()
		this.#noiseBlueprints = noiseBlueprints
		this.#uniforms = initShaderMaterial(noiseBlueprints)

		const loader = new GLTFLoader()
		const saucer = await loader.loadAsync('./assets/saucer.glb')
		this.#saucer = saucer.scene
		this.#saucer.scale.multiplyScalar(0.01)
		this.#saucer.position.y = 18
		scene.add(this.#saucer)

		camera.position.x = 16
		camera.position.y = 18
		camera.position.z = 8

		this.#angularAccel = 0
		this.#angularVelocity = 0
		document.addEventListener('keydown', (event) => {
			switch (event.code) {
			case 'KeyA':
				this.#angularAccel = -0.0001
				break
			case 'KeyD':
				this.#angularAccel = 0.0001
				break
			}
		})
		document.addEventListener('keyup', (event) => {
			switch (event.code) {
			case 'KeyA':
			case 'KeyD':
				this.#angularAccel = 0
				this.#angularAccel = 0
				break
			}
		})

		const skyColor = 0xFFFFFF
		const groundColor = 0x003300
		const hemisphere = new THREE.HemisphereLight(skyColor, groundColor, 2.2)
		scene.add(hemisphere)

		const renderScene = new RenderPass(scene, camera)

		const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85)
		bloomPass.threshold = 0.078
		bloomPass.strength = 1
		bloomPass.radius = 0.7

		this.#composer = new EffectComposer(renderer)
		this.#composer.addPass(renderScene)
		this.#composer.addPass(bloomPass)

		this.#assetLocations.audioContextAnalyzer.context.resume()
        this.#assetLocations.audioContextAnalyzer.audioElement.play()

		this.#direction = new THREE.Vector3(0, 0, 0)

		this.#initStars(scene)

		this.#controls = new OrbitControls(camera, renderer.domElement)
		this.#controls.enabled = false
		this.#controls.rotate(4, 0.3)
	}

	/**
     * Animation frame
     *
     * @param {*} scene
     * @param {*} camera
     */
	async animate (scene, camera, delta, now) {
		// Update position the terrain is generated from
		updateChunkPosition(scene,
			this.#noiseBlueprints,
			this.#chunkPos.set(Math.floor(this.#saucer.position.x / 32),
				Math.floor(this.#saucer.position.y / 32),
				Math.floor(this.#saucer.position.z / 32)))

		// Set uniforms for the mesh material (player position + audio spectrum)
		this.#uniforms.uPlayerPos.value.copy(this.#saucer.position)

		this.#uniforms.uBass.value.set(
			this.#assetLocations.audioContextAnalyzer.getFrequencySlice(16, 60),
			this.#assetLocations.audioContextAnalyzer.getFrequencySlice(60, 250),
			this.#assetLocations.audioContextAnalyzer.getFrequencySlice(250, 500),
			this.#assetLocations.audioContextAnalyzer.getFrequencySlice(500, 2000))
		this.#uniforms.uHigh.value.set(
			this.#assetLocations.audioContextAnalyzer.getFrequencySlice(2000, 4000),
			this.#assetLocations.audioContextAnalyzer.getFrequencySlice(4000, 6000),
			this.#assetLocations.audioContextAnalyzer.getFrequencySlice(6000, 12499),
			128.0)

		// View rotation
		this.#controls.target = this.#saucer.position
		this.#controls.update()

		this.#angularVelocity += this.#angularAccel * delta
		this.#angularVelocity *= 0.5

		this.#controls.rotate(this.#angularVelocity * delta, 0)

		// Forward
		this.#saucer.position.add(this.#direction)
		camera.position.add(this.#direction)
		this.#stars.position.add(this.#direction)

		this.#direction.copy(camera.position).sub(this.#saucer.position)
		this.#direction.y = 0
		this.#direction.normalize()
		this.#direction.multiplyScalar(-0.01 * delta)

		// Visual rotation
		this.#saucer.rotation.y += 0.02 * delta

		// Screen shake
		camera.rotation.x += (-128 + this.#assetLocations.audioContextAnalyzer.getFrequencySlice(16, 2000)) / 10000
		camera.rotation.y += (-128 + this.#assetLocations.audioContextAnalyzer.getFrequencySlice(40, 1300)) / 10000

		this.#composer.render()
	}
}

export default GameScreen
