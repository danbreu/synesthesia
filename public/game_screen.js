import * as THREE from 'three'

import { noiseBlueprint, bufferNoise, getLayeredNoise, getLayeredNoiseShader } from './noise.js'
import { initShaderMaterial, updateChunkPosition } from './terrain.js'
import { EffectComposer } from './ext/threeAddons/postprocessing/EffectComposer.js'
import { RenderPass } from './ext/threeAddons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from './ext/threeAddons/postprocessing/UnrealBloomPass.js'


class GameScreen {
    #chunkPos = new THREE.Vector3()
    #noiseBlueprints
    #noiseFunction
    #uniforms
    #composer

    constructor() {

    }

    #initNoise() {
        const blueprints = [noiseBlueprint(new THREE.Matrix4().makeScale(1, 2, 1).multiplyScalar(0.1), new THREE.Matrix4().makeTranslation(4, 4, 4), 8),
            noiseBlueprint(new THREE.Matrix4().makeScale(1, 2, 1).multiplyScalar(0.1), new THREE.Matrix4().makeScale(1, 0, 1), 8)]
        console.log(getLayeredNoiseShader(blueprints))
        blueprints.forEach(bufferNoise)
        const fun = getLayeredNoise(blueprints)
        // const start = findStartingLocation(fun, 5, 5, 5)
    
        return [blueprints, fun]
    }

    init(scene, camera, renderer, nextSceneCallback) {
        const [noiseBlueprints, noiseFunction] = this.#initNoise()
        this.#noiseBlueprints = noiseBlueprints
        this.#noiseFunction = noiseFunction
        this.#uniforms = initShaderMaterial(noiseBlueprints)

        camera.position.x = 16
        camera.position.y = 16
        camera.position.z = 8
    
        const skyColor = 0xB1E1FF
        const groundColor = 0xB97A20
        const hemisphere = new THREE.HemisphereLight(skyColor, groundColor, 0.2)
        const point = new THREE.PointLight(0xFFFFFF, 0.8)
        point.position.y += 2
        scene.add(hemisphere)
        camera.add(point)
    
        const renderScene = new RenderPass( scene, camera )
    
        const bloomPass = new UnrealBloomPass( new THREE.Vector2( window.innerWidth, window.innerHeight ), 1.5, 0.4, 0.85 )
        bloomPass.threshold = 0.078
        bloomPass.strength = 1
        bloomPass.radius = 0.7
    
        this.#composer = new EffectComposer( renderer )
        this.#composer.addPass( renderScene )
        this.#composer.addPass( bloomPass )
    }

    animate(scene, camera) {
        updateChunkPosition(scene,
			this.#noiseBlueprints,
			this.#chunkPos.set(Math.floor(camera.position.x / 32),
				Math.floor(camera.position.y / 32),
				Math.floor(camera.position.z / 32)))

		camera.position.z -= 0.3

		this.#uniforms.playerPos.value.copy(camera.position)
		this.#uniforms.bassBoomPos.value.copy(camera.position)
		this.#uniforms.bassness.value = 2

        this.#composer.render()
    }
}


export default GameScreen