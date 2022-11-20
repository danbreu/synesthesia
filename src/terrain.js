const THREE = require('three')

const { marchCubes } = require('./marching_cubes.js')
const { noise, noiseBlueprint, bufferNoise, getBufferedNoise, createBufferedNoise } = require('./noise.js')

const CHUNK_SIZE = 32
const RENDER_DIRECTIONS = [new THREE.Vector3(0, 0, 0),
	new THREE.Vector3(0, 1, 0),
	new THREE.Vector3(0, -1, 0),
	new THREE.Vector3(1, 0, 0),
	new THREE.Vector3(0, 0, 1),
	new THREE.Vector3(-1, 0, 0),
	new THREE.Vector3(0, 0, -1),
	new THREE.Vector3(-1, 0, 1),
	new THREE.Vector3(-1, 0, -1),
	new THREE.Vector3(1, 0, 1),
	new THREE.Vector3(1, 0, -1),
	new THREE.Vector3(0, -1, 1),
	new THREE.Vector3(0, -1, -1),
	new THREE.Vector3(-1, -1, 0),
	new THREE.Vector3(-1, -1, 1),
	new THREE.Vector3(-1, -1, -1),
	new THREE.Vector3(1, -1, 0),
	new THREE.Vector3(1, -1, 1),
	new THREE.Vector3(1, -1, -1),
	new THREE.Vector3(0, 1, 1),
	new THREE.Vector3(0, 1, -1),
	new THREE.Vector3(-1, 1, 0),
	new THREE.Vector3(-1, 1, 1),
	new THREE.Vector3(-1, 1, -1),
	new THREE.Vector3(1, 1, 0),
	new THREE.Vector3(1, 1, 1),
	new THREE.Vector3(1, 1, -1)]
let terrainWorker = null
let meshes = {}
const currentPosition = new THREE.Vector3(Infinity, Infinity, Infinity)

/* +
 * Find location reasonably far away from walls to start at
 */
const findStartingLocation = (noiseFunction, startX = 0, startY = 0, startZ = 0) => {
	let [gradientX, gradientY, gradientZ] = [0, 0, 0]
	let [x, y, z] = [startX, startY, startZ]
	let delta = Infinity
	let last = noiseFunction(x, y, z)
	while (delta > 0.05) {
		gradientX = noiseFunction(x + 1, y, z) - last
		gradientY = noiseFunction(x, y + 1, z) - last
		gradientZ = noiseFunction(x, y, z + 1) - last

		x += gradientX * STEP_SIZE
		y += gradientY * STEP_SIZE
		z += gradientZ * STEP_SIZE

		delta = last
		last = noiseFunction(x, y, z)
		delta = last - delta
	}
	return [x, y, z]
}
const STEP_SIZE = 0.5

const initTerrainWorker = (scene, noiseBlueprints, setNoiseCallback) => {
	terrainWorker = new Worker('terrain_worker.js', { type: 'module' })

	terrainWorker.onmessage = (message) => {
		const [command, arg0, arg1, arg2] = message.data

		switch (command) {
		case 'doneSetNoise':
			setNoiseCallback(terrainWorker)
			break
		case 'doneMarchCubes':
			createChunk(scene, arg0, arg2)
			break
		}
	}

	terrainWorker.postMessage(['setNoise', noiseBlueprints])

	return terrainWorker
}

const createChunk = (scene, buffer, position) => {
	const geometry = new THREE.BufferGeometry()
	geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(buffer), 3))
	geometry.computeBoundingSphere()
	const mesh = new THREE.Mesh(geometry, material)
	mesh.position.x = position[0]
	mesh.position.y = position[1]
	mesh.position.z = position[2]
	scene.add(mesh)

	meshes[hashPosition(position[0], position[1], position[2])] = mesh
}
const material = new THREE.MeshStandardMaterial({ color: 'darkblue', flatShading: true })

const updateChunkPosition = (scene, noiseBlueprints, position) => {
	if (position.equals(currentPosition)) return

	console.log(`Now at: ${position.x} ${position.y} ${position.z}`)
	currentPosition.copy(position)
	if (terrainWorker) terrainWorker.terminate()
	terrainWorker = initTerrainWorker(scene, noiseBlueprints, (worker) => {
		const preserve = {}

		RENDER_DIRECTIONS.forEach((direction) => {
			const chunkPosition = direction.clone().add(position).multiplyScalar(CHUNK_SIZE)

			const positionHash = hashPosition(chunkPosition.x, chunkPosition.y, chunkPosition.z)
			if (meshes[positionHash]) {
				preserve[positionHash] = meshes[positionHash]
			} else {
				worker.postMessage(['marchCubes', [CHUNK_SIZE, CHUNK_SIZE, CHUNK_SIZE], [chunkPosition.x, chunkPosition.y, chunkPosition.z]])
			}
		})

		Object.keys(meshes).forEach(key => {
			if (!preserve[key]) {
				const mesh = meshes[key]
				console.log('delete', key)
				scene.remove(mesh)
				mesh.geometry.dispose()
				mesh.material.dispose()
			}
		})

		meshes = preserve
		console.log('meshes', Object.keys(meshes).length)
	})
}
const getCurrentChunk = () => {
	return meshes[hashPosition(currentPosition.x, currentPosition.y, currentPosition.z)]
}

const hashPosition = (x, y, z) => {
	return x * 11 + y * 13 + z * 17
}

module.exports = {
	findStartingLocation,
	initTerrainWorker,
	updateChunkPosition,
	getCurrentChunk
}
