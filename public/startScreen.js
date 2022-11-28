import * as THREE from 'three'
import GameScreen from './gameScreen.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import AudioContextAnalyzer from './audioContextAnalyzer.js'
import { getStreamUrl } from './youtubeHelpers.js'

const PIPED_INSTANCES = ["https://pipedapi.data-niklas.de", "https://pipedapi.kavin.rocks"]
const DEFAULT_SONG = "https://www.youtube.com/watch?v=OjbjZcBctuM" // Camellia - GHOST

class StartScreen {
	#nextScreenCallback
	#composer
	#spiral
	#particlesMesh
	#mouseMoveX
	#mouseMoveY
	#crawfish
	#crawfishBox
	#light
	#domElement
	#click = false
	#menuScene = false
	#textField
	#overlay
	#errorMessage

	constructor (errorMessage = null) {
		this.#errorMessage = errorMessage
	}

	/**
     * Initialize the start screen
     *
     * @param {*} scene
     * @param {*} camera
     * @param {*} renderer
     * @param {*} nextScreenCallback
     */
	async init (scene, camera, renderer, nextScreenCallback) {
		this.#nextScreenCallback = nextScreenCallback

		// Object
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
		})

		const particlesMaterial = new THREE.PointsMaterial({
			size: 0.005
		})

		// load crawfish glb
		const loader = new GLTFLoader()
		const crawfish = await loader.loadAsync('./assets/Crawfish.glb')
		this.#crawfish = crawfish.scene
		this.#crawfish.scale.multiplyScalar(0.1)
		scene.add(this.#crawfish)

		// Mesh
		this.#spiral = new THREE.Points(geometrySprial, material)
		this.#spiral.position.y = 10
		this.#particlesMesh = new THREE.Points(particlesGeonometry, particlesMaterial)
		scene.add(this.#spiral)
		scene.add(this.#particlesMesh)

		const skyColor = 0xFFFFFF
		const groundColor = 0x003300
		this.#light = new THREE.HemisphereLight(skyColor, groundColor, 0.5)
		scene.add(this.#light)

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

		document.addEventListener('mousemove', (event) => {
			this.#setMousePos(event)
		})
		document.addEventListener('click', function () {
			this.#click = true
		}.bind(this))

		// Box around crawfish in screen coordinates (used for check if crawfish was clicked)
		this.#domElement = renderer.domElement

		const viewBox = new THREE.Box3()
		viewBox.min.set(-0.34, -0.08, 1)
		viewBox.max.set(0.34, 0.16, 1)
		viewBox.applyMatrix4(camera.matrixWorldInverse)
		viewBox.applyMatrix4(camera.projectionMatrix)

		this.#crawfishBox = new THREE.Box2()
		this.#crawfishBox.min.set(viewBox.min.x, viewBox.min.y)
		this.#crawfishBox.max.set(viewBox.max.x, viewBox.max.y)

		// Overlay with text field
		this.#overlay = document.createElement("div")
		this.#overlay.className = "overlay"
		this.#textField = document.createElement("input")
		this.#textField.type = "text"
		this.#textField.className = "songTextField"
		this.#textField.value = DEFAULT_SONG
		if(this.#errorMessage) {
			const message = document.createElement("p")
			message.className = "errorMessage"
			message.textContent = this.#errorMessage
			this.#overlay.appendChild(message)
		}
		this.#overlay.appendChild(this.#textField)
		const message = document.createElement("ul")
		message.className = "infoMessage"
		message.innerHTML = `<li>Click the lobster to play youtube url</li>
		<li>Seizure warning!</li>`
		this.#overlay.appendChild(message)
		document.body.appendChild(this.#overlay)
	}

	#setMousePos (event) {
		this.#mouseMoveY = event.clientY
		this.#mouseMoveX = event.clientX
	}

	/**
     * Animation frame
     *
     * @param {*} scene
     * @param {*} camera
     */
	 async animate (scene, camera, delta, time) {
		this.#spiral.rotation.y += 0.004 * delta
		if (this.#menuScene) {
			this.#spiral.position.y -= 0.06 * delta

			if (this.#spiral.position.y <= 0) {
				this.#spiral.position.y = 0 * delta

				this.#crawfish.position.y += 0.003 * delta
				if (this.#crawfish.position.y >= 3) {
					try {
						const streamUrl = await getStreamUrl(PIPED_INSTANCES,  this.#textField.value)
						const audioContextAnalyzer = new AudioContextAnalyzer(streamUrl) 
						await this.#nextScreenCallback(new GameScreen(audioContextAnalyzer))
					}
					catch(error) {
						await this.#nextScreenCallback(new StartScreen(error.message))
					}
				}
			}
		}

		// Update objects
		this.#crawfish.rotation.y = 0.0005 * time
		this.#particlesMesh.rotation.y = -0.0001 * time

		if (this.#mouseMoveX > 0) {
			this.#particlesMesh.rotation.y = -this.#mouseMoveY * (time * 0.00000004)
			this.#particlesMesh.rotation.x = -this.#mouseMoveX * (time * 0.00000004)
		}

		// Update crawfish highlight effect
		const mousePoint = new THREE.Vector2(-1 + 2 * (this.#mouseMoveX / this.#domElement.clientWidth), -1 + 2 * (this.#mouseMoveY / this.#domElement.clientHeight))
		const inCrawfish = this.#crawfishBox.containsPoint(mousePoint)

		// Update crayfish click
		if(inCrawfish && this.#click) {
			this.#overlay.remove()

			// Check if url is valid
			// Run asynchronously to prevent lag in menu animation
			;(async () => {
				if(this.#menuScene) { return }

				try {
					await getStreamUrl(PIPED_INSTANCES,  this.#textField.value)
				}
				catch(error) {
					await this.#nextScreenCallback(new StartScreen(error.message))
				}
			})()

			this.#menuScene = true
		}
		else {
			this.#click = false
		}

		// Update light
		if(inCrawfish || this.#menuScene) {
			this.#light.intensity = 2.2
		}
		else {
			this.#light.intensity = 0.5
		}

		// Render
		this.#composer.render(scene, camera)
	}
}

export default StartScreen
