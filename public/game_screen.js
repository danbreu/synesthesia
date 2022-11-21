import * as THREE from 'three'

import { noiseBlueprint, bufferNoise, getLayeredNoise, getLayeredNoiseShader } from './noise.js'
import { initShaderMaterial, updateChunkPosition } from './terrain.js'
import { EffectComposer } from './ext/threeAddons/postprocessing/EffectComposer.js'
import { RenderPass } from './ext/threeAddons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from './ext/threeAddons/postprocessing/UnrealBloomPass.js'
import MusicAnalyzer from './musicAnalyzer.js'

class GameScreen {
    #chunkPos = new THREE.Vector3()
    #noiseBlueprints
    #noiseFunction
    #uniforms
    #composer
    #assetLocations
    #audio
    #musicAnalyzer

    constructor(assetLocations) {
        this.#assetLocations = assetLocations
    }

    /**
     * Initialize noise function the terrain is generated from
     * 
     * @returns [blueprints, fun] Noise blueprints and resulting noise function
     */
    #initNoise() {
        const blueprints = [noiseBlueprint(new THREE.Matrix4().makeScale(1, 2, 1).multiplyScalar(0.1), new THREE.Matrix4().makeTranslation(4, 4, 4), 8),
            noiseBlueprint(new THREE.Matrix4().makeScale(1, 2, 1).multiplyScalar(0.1), new THREE.Matrix4().makeScale(1, 0, 1), 8)]
        console.log(getLayeredNoiseShader(blueprints))
        blueprints.forEach(bufferNoise)
        const fun = getLayeredNoise(blueprints)
        // const start = findStartingLocation(fun, 5, 5, 5)
    
        return [blueprints, fun]
    }

    /**
     * Initialize audio player and music analyzer
     */
    #initSound() {
        const wavDecoder = this.#assetLocations.wavDecoder
        this.#musicAnalyzer = new MusicAnalyzer(wavDecoder.pcmData, wavDecoder.duration, wavDecoder.sampleRate)

        const url = URL.createObjectURL(this.#assetLocations["./music/mandragora.wav"])
        this.#audio = new Audio(url)
        this.#audio.play()
        this.#audio.currentTime = 100
    }

    /**
     * Initialize the game screen
     * 
     * @param {*} scene 
     * @param {*} camera 
     * @param {*} renderer 
     * @param {*} nextScreenCallback 
     */
    init(scene, camera, renderer, nextScreenCallback) {
        const [noiseBlueprints, noiseFunction] = this.#initNoise()
        this.#noiseBlueprints = noiseBlueprints
        this.#noiseFunction = noiseFunction
        this.#uniforms = initShaderMaterial(noiseBlueprints)

        camera.position.x = 16
        camera.position.y = 20
        camera.position.z = 8
        camera.rotation.x = -0.2
    
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

        this.#initSound()
    }

    /**
     * Animation frame
     * 
     * @param {*} scene 
     * @param {*} camera 
     */
    animate(scene, camera) {
        updateChunkPosition(scene,
			this.#noiseBlueprints,
			this.#chunkPos.set(Math.floor(camera.position.x / 32),
				Math.floor(camera.position.y / 32),
				Math.floor(camera.position.z / 32)))

		camera.position.z -= 0.3

		this.#uniforms.uPlayerPos.value.copy(camera.position)
		this.#uniforms.uPlayerPos.value.copy(camera.position)

        const freq = (a, b) => this.#musicAnalyzer.getFrequencySlice(this.#audio.currentTime, a, b)
		this.#uniforms.uBass.value.set(
            freq(16, 60),
            freq(60, 250),
            freq(250, 500),
            freq(500, 2000))
        this.#uniforms.uHigh.value.set(
            freq(2000, 4000),
            freq(4000, 6000),
            freq(6000, 20000),
            128.0)
        console.log(this.#uniforms.uBass.value)

        this.#composer.render()
    }
}


export default GameScreen