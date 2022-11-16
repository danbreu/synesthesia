const THREE = require('three')
const MusicAnalyzer = require('./musicAnalyzer.js')

/**
 * Main entry point of the application.
 */
async function main () {
	const blob = await fetch('./music/madragora.mp3')
		.then((res) => {
			if (!res.ok) {
				throw Error(`File could not be fetched. Code: ${res.status}: ${res.statusText}`)
			}
			return res.blob()
		})
	const file = new File([blob], 'madragora.mp3', { type: 'audio/mpeg' })
	const musicAnalyzer = new MusicAnalyzer(file)

	document.body.addEventListener('click', () => { musicAnalyzer.play() }, true)

	const scene = new THREE.Scene()
	const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)

	const renderer = new THREE.WebGLRenderer({ antialias: true })
	renderer.setSize(window.innerWidth, window.innerHeight)
	document.body.appendChild(renderer.domElement)

	const geometry = new THREE.BoxGeometry(1, 1, 1)
	const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 })
	const cube = new THREE.Mesh(geometry, material)
	scene.add(cube)

	camera.position.z = 5

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
		resizeCanvasToWindowSize()
		requestAnimationFrame(animate)

		cube.rotation.x += 0.01
		cube.rotation.y += 0.01

		renderer.render(scene, camera)
	}

	animate()
}

window.addEventListener('DOMContentLoaded', main)
