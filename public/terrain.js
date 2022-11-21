import * as THREE from 'three'

import { getLayeredNoiseShader, getLayeredNoiseTextures } from './noise.js'

export const CHUNK_SIZE = 32
const RENDER_DIRECTIONS = [new THREE.Vector3(0, 0, -1),
	new THREE.Vector3(1, 0, -1),
	new THREE.Vector3(0, 0, 0),
	new THREE.Vector3(-1, 0, -1),
	new THREE.Vector3(0, 0, -2),
	new THREE.Vector3(-1, 0, 0),
	new THREE.Vector3(-1, 0, -2),
	new THREE.Vector3(1, 0, 0),
	new THREE.Vector3(1, 0, -2)]
let terrainWorker = null
let meshes = {}
const currentPosition = new THREE.Vector3(Infinity, Infinity, Infinity)
let material = null

/**
 * Find location reasonably far away from walls to start at
 */
export const findStartingLocation = (noiseFunction, startX = 0, startY = 0, startZ = 0) => {
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

/**
 * Init the shader material used for rendering the terrain.
 * 
 * Contains uniforms for music amplitutes and player position.
 * 
 * @param {Array} noiseBlueprints 
 * @returns 
 */
export const initShaderMaterial = (noiseBlueprints) => {
	const shader = getLayeredNoiseShader(noiseBlueprints)
	const uniforms = getLayeredNoiseTextures(noiseBlueprints)
	uniforms["uPlayerPos"] = new THREE.Uniform( new THREE.Vector3(0.0, 0.0, 0.0))
	uniforms["uBassBoomPos"] = new THREE.Uniform( new THREE.Vector3(0.0, 0.0, 0.0))
	uniforms["uBassness"] = {type: "f", value: 0.0}
	uniforms["uHightness"] = {type: "f", value: 0.0}
	uniforms["uBass"] = new THREE.Uniform( new THREE.Vector4(0.0, 0.0, 0.0, 0.0))
	uniforms["uHigh"] = new THREE.Uniform( new THREE.Vector4(0.0, 0.0, 0.0, 0.0))


	material = new THREE.ShaderMaterial({
		uniforms,
		vertexShader: `
		precision mediump sampler3D;
		precision mediump float;

		uniform vec3 uPlayerPos;
		uniform vec3 uBassBoomPos;

		uniform vec4 uBass;
		uniform vec4 uHigh;

		out vec3 vPos;
		out vec3 vNormal;
		out vec3 vPlayerPos;

		out vec4 vBass;
		out vec4 vHigh;

		out float vBassness;
		out float vHighness;

		${shader}

		vec4 normalFromNoise(vec4 pos) {
			float s = sampleNoise(pos);
			return vec4(sampleNoise(pos+vec4(1.0,0.0,0.0,1.0))-s,
				sampleNoise(pos+vec4(0.0,1.0,0.0,1.0))-s,
				sampleNoise(pos+vec4(0.0,0.0,1.0,1.0))-s,
				1.0);
		}

		void main() {
			float bassness = length(uBass)/length(vec4(255.0));
			vBassness = bassness;
			float highness = length(uHigh)/length(vec4(255.0));
			vHighness = highness;

			float values[7] = float[7](uBass.x, uBass.y, uBass.z, uBass.w, uHigh.x, uHigh.y, uHigh.z);
	
			vec4 posVec4 = vec4( position, 1.0 ) ;
			vec4 modelPos = modelViewMatrix * posVec4;
			float dist = length(modelPos.xz);

			float s = sampleNoise(modelPos);
			float ifl = 0.0;
			if(modelPos.z < -64.0 && (s < 0.01 || s > -0.01) ) {
				for(int i = 0; i < 7; i++) {
					ifl = float(i);
					if( values[i] > 40.0 && -60.0+20.0*ifl-10.0*values[i]/255.0 < modelPos.x && modelPos.x < -70.0+20.0*ifl+10.0*values[i]/255.0 ) {
						gl_Position = vec4(-0.01, 1.2, -1.2, 1.0);
						vPos = vec3(1e20);
						vNormal = vec3(values[i]/512.0);
						vPlayerPos = vec3(0.0);
						return;
					}
				}
			}

			modelPos.y += bassness*sin(dist*bassness/64.0);

			vPos = position;
			vNormal = normalFromNoise(modelPos).xyz;
			vPlayerPos = uPlayerPos;
			vBass = uBass;
			vHigh = uHigh;
			gl_Position = projectionMatrix * modelPos;
		}
		`,
		fragmentShader: `
		in vec3 vPos;
		in vec3 vNormal;
		in vec3 vPlayerPos;

		in vec4 vBass;
		in vec4 vHigh;

		in float vBassness;
		in float vHighness;

		void main() {
			if(vPos.x >= 1e19 && vPos.y >= 1e19 && vPos.z >= 1e19) {
				gl_FragColor = vec4(1.0, length(vNormal), 1.0, 1.0);
				return;
			}

			vec3 objectColor = vec3(1.0, 1.0, 1.0);
			vec3 lightPos = vec3(0.0, 8.0, 0.0);
			vec3 lightColor = vec3(0.0, 1.0, 0.0);
			float ambientStrength = 0.1*vBassness;
			vec3 ambient = ambientStrength * lightColor;

			// diffuse
			vec3 norm = normalize(vNormal);
			vec3 lightDir = normalize(lightPos - vPos);
			float diff = max(dot(norm, lightDir), 0.0);
			vec3 diffuse = diff * lightColor;

			vec3 result = (ambient + diffuse) * objectColor;
			gl_FragColor = vec4(result, 1.0);
		}
		`
	})

	return uniforms
}

/**
 * Initialize a worker which builds the terrain defined via noiseBlueprints
 * using the marching cubes algorithm.
 * 
 * If the worker finished a terrain piece it is created via the createChunk function.
 * 
 * @param {*} scene Scene terrain pieces are placed on
 * @param {*} noiseBlueprints Noise blueprints defining the terrain
 * @param {*} setNoiseCallback Called when the noise is buffered on the worker thread
 * @returns 
 */
 export const initTerrainWorker = (scene, noiseBlueprints, setNoiseCallback) => {
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

/**
 * Function called when a chunk mesh is generated.
 * 
 * Chunks are kept track of via the meshes object.
 * 
 * @param {*} scene Scene chunk is placed in
 * @param {*} buffer Buffer containing the chunk vertices coming from the caller
 * @param {*} position Chunk position to place chunk at
 */
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

/**
 * Update center position on chunk grid.
 * The chunks around this center are shown. (Relative positions defined by RENDER_DIRECTIONS)
 *  
 * @param {*} scene Scene chunks are shown on
 * @param {*} noiseBlueprints Noise blueprints defining the terrain
 * @param {*} position Position in chunk coordinates floor(playerCoordinates)/CHUNK_SIZE
 * @returns 
 */
export const updateChunkPosition = (scene, noiseBlueprints, position) => {
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

/**
 * Get the current chunk mesh at the center position
 */
export const getCurrentChunk = () => {
	return meshes[hashPosition(currentPosition.x, currentPosition.y, currentPosition.z)]
}

/**
 * Hash a position. Used for generating keys for the meshes object.
 */
const hashPosition = (x, y, z) => {
	return x * 11 + y * 13 + z * 17
}
