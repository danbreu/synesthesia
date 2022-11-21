import * as THREE from 'three'
import GameScreen from './game_screen.js'

const startScreen = GameScreen

/**
 * Main entry point of the application.
 */
async function main () {
	const start = new startScreen()
	initThree(start)
}

const initThree = (start) => {
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
