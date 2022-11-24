import * as THREE from 'three'
import GameScreen from './gameScreen.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'

class StartScreen {
	#assetLocations
	#nextScreenCallback
	#crawfishGlbUrl
	#composer
	#clock = new THREE.Clock()
	#spiral
	#particlesMesh
	#mouseMoveX
	#mouseMoveY
	#crawfish
	#menuScene = false
	constructor (assetLocations) {
		this.#assetLocations = assetLocations
		this.#crawfishGlbUrl = URL.createObjectURL(assetLocations['./assets/Crawfish.glb'])
	}

	/**
     * Initialize the start screen
     *
     * @param {*} scene
     * @param {*} camera
     * @param {*} renderer
     * @param {*} nextScreenCallback
     */
	init (scene, camera, renderer, nextScreenCallback) {
		this.#nextScreenCallback = nextScreenCallback

		// Object
		// const geometry = new THREE.TorusGeometry( .7, .2, 200, 100 ); //ring
		const geometrySprial = new THREE.CylinderGeometry(0.3, 1.3, 5, 75, 70)

		const particlesGeonometry = new THREE.BufferGeometry()
		const particlesCnt = 7000

		// Array for the 3d xyz cords
		const posArray = new Float32Array(particlesCnt * 3)

		for (let i = 0; i < particlesCnt * 3; i++) {
			posArray[i] = (Math.random() - 0.5) * 5
		}

		particlesGeonometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3))

		// Materials
		const material = new THREE.PointsMaterial({
			size: 0.01,
			color: 'blue'
		}
		)

		const particlesMaterial = new THREE.PointsMaterial({
			size: 0.005
		}
		)

		// load crawfish glb
		const loader = new GLTFLoader()
		loader.load(this.#crawfishGlbUrl, (gltf) => {
			this.#crawfish = gltf.scene
			this.#crawfish.scale.multiplyScalar(0.1)
			scene.add(this.#crawfish)
		})

		// Mesh
		this.#spiral = new THREE.Points(geometrySprial, material)
		this.#spiral.position.y = 10
		this.#particlesMesh = new THREE.Points(particlesGeonometry, particlesMaterial)
		scene.add(this.#spiral)
		scene.add(this.#particlesMesh)

		const light = new THREE.PointLight(0xff0000, 1, 100)
		light.position.set(0, 2, 2)
		scene.add(light)

		// Camera plcement
		camera.position.x = 0
		camera.position.y = 0
		camera.position.z = 2

		// Mouse

		this.#mouseMoveY = 0
		this.#mouseMoveX = 0

		const renderScene = new RenderPass(scene, camera)

		const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85)
		bloomPass.threshold = 0.078
		bloomPass.strength = 1
		bloomPass.radius = 0.7

		this.#composer = new EffectComposer(renderer)
		this.#composer.addPass(renderScene)
		this.#composer.addPass(bloomPass)

		document.addEventListener('mousemove', (event) => this.#animateParticales(event))
		document.addEventListener('click', function () {
			this.#menuScene = true
		}.bind(this))
	}

	#animateParticales (event) {
		this.#mouseMoveY = event.clientY
		this.#mouseMoveX = event.clientX
	}

	/**
     * Animation frame
     *
     * @param {*} scene
     * @param {*} camera
     */
	animate (scene, camera) {
		if (!this.#crawfish) { return }
		if (this.#menuScene == true) {
			this.#spiral.position.y -= 0.1

			if (this.#spiral.position.y <= 0) {
				this.#spiral.position.y = 0

				this.#crawfish.position.y += 0.1
				if (this.#crawfish.position.y >= 3) {
					this.#nextScreenCallback(new GameScreen(this.#assetLocations))
				}
			}
		}

		const elapsedTime = this.#clock.getElapsedTime()

		// Update objects
		this.#crawfish.rotation.y = 0.5 * elapsedTime
		this.#particlesMesh.rotation.y = -0.1 * elapsedTime

		if (this.#mouseMoveX > 0) {
			this.#particlesMesh.rotation.y = -this.#mouseMoveY * (elapsedTime * 0.00004)
			this.#particlesMesh.rotation.x = -this.#mouseMoveX * (elapsedTime * 0.00004)
		}

		// Render
		this.#composer.render(scene, camera)
	}
}

export default StartScreen
