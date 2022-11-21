import * as THREE from 'three'
import StartScreen from './start_screen.js'

const startScreen = StartScreen

/**
 * Main entry point of the application.
 */
async function main () {
	const assetUrls = await fetchAssets([
		'./music/madragora.wav',
		'./assets/lightbulb.glb'
	])

	const start = new startScreen()
	initThree(start)
}

/**
 * Fetch assets from server and create ObjectURLs
 *
 * @param {string[]} assets
 * @returns {Promise<{[key: string]: string}>} ObjectURLs
 * @throws {Error} If any asset could not be loaded
 * @throws {TypeError} If assets is not an array
 */
const fetchAssets = async (assets) => {
	const assetPromises = assets.map(async (asset) => {
		const response = await fetch(asset)
		const blob = await response.blob()
		return URL.createObjectURL(blob)
	})
	return Promise.all(assetPromises)
}


const initThree = (start) => {
	const scene = new THREE.Scene()
	const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
	scene.add(camera)

	const canvas = document.createElement('canvas')
	const context = canvas.getContext('webgl2', { alpha: false, antialias: true })
	if (!context) {
		alert('WebGL 2 is required for running this application')
	}
	const renderer = new THREE.WebGLRenderer({ canvas, context })
	renderer.setSize(window.innerWidth, window.innerHeight)
	document.body.appendChild(renderer.domElement)

	let current = null
	const init = (screen) => {
		screen.init(scene, camera, renderer, init)
		current = screen
	}

	init(start)

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

	const animate = () => {
		current.animate(scene, camera)

		resizeCanvasToWindowSize()
		requestAnimationFrame(animate)
	}
	animate()
}

window.addEventListener('DOMContentLoaded', main)
