import * as THREE from 'three'
import StartScreen from './startScreen.js'


const MILLIS_PER_FRAME = 1000 / 24

const startScreen = StartScreen

/**
 * Main entry point of the application.
 */
async function main () {
	const start = new startScreen()
	await initThree(start)
}

/**
 * Initialize three js and initial screen and start render loop
 * 
 * @param {*} start Initial screen to start at
 */
const initThree = async (start) => {
	const canvas = document.createElement('canvas')
	const context = canvas.getContext('webgl2', { alpha: false, antialias: true })
	if (!context) {
		alert('WebGL 2 is required for running this application')
	}
	const renderer = new THREE.WebGLRenderer({ canvas, context })
	renderer.setSize(window.innerWidth, window.innerHeight)
	document.body.appendChild(renderer.domElement)

	let scene = null
	let camera = null
	let current = null
	/**
	 * Initialize screen
	 */
	const init = async (screen) => {
		scene = new THREE.Scene()
		camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
		scene.add(camera)

		await screen.init(scene, camera, renderer, init)
		current = screen
	}

	await init(start)

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

	let delta = MILLIS_PER_FRAME
	let last = 0
	/**
	 * Render loop
	 */
	const animate = async () => {
		if (MILLIS_PER_FRAME > performance.now() - last) {
			setTimeout(animate, 5)
			return
		}

		delta = performance.now() - last

		if (delta >= MILLIS_PER_FRAME) {
			last = performance.now()
			await current.animate(scene, camera, delta, last)
		}

		requestAnimationFrame(animate)
		resizeCanvasToWindowSize()
	}

	await animate()
}

window.addEventListener('DOMContentLoaded', main)
