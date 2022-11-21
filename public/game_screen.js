import * as THREE from 'three'

import { noiseBlueprint, bufferNoise, getLayeredNoise, getLayeredNoiseShader } from './noise.js'
import { initShaderMaterial, updateChunkPosition } from './terrain.js'
import { EffectComposer } from './ext/threeAddons/postprocessing/EffectComposer.js'
import { RenderPass } from './ext/threeAddons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from './ext/threeAddons/postprocessing/UnrealBloomPass.js'
import { GLTFLoader } from './ext/threeAddons/loaders/GLTFLoader.js'
import { OrbitControls } from './ext/threeAddons/controls/OrbitControls.js';
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
    #controls
    #saucer
    #direction

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
     * 
     */
    #initSaucer(onFinished) {
        const loader = new GLTFLoader();
        loader.load( "./assets/saucer.glb", function ( gltf ) {
            onFinished(gltf)
        }, undefined, function ( error ) {
            console.error( error );
        } );
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

        this.#initSaucer((gltf) => {
            gltf.scene.scale.multiplyScalar(0.01)
            this.#saucer = gltf.scene
            gltf.scene.position.y += 20
            scene.add( gltf.scene )

            this.#controls = new OrbitControls( camera, renderer.domElement )
            this.#controls.enabled = false
            this.#controls.rotate(4, 0.3)
        })

        camera.position.x = 16
        camera.position.y = 20
        camera.position.z = 8

        const onKeyDown = (event) => {
            switch(event.code) {
                case "KeyA":
                    this.#controls.rotate(-0.1,0)
                break;
                case "KeyD":
                    this.#controls.rotate(0.1,0)
                break;
            }
        }
        document.addEventListener('keydown', onKeyDown);
    
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

        this.#direction = new THREE.Vector3(0,0,0)
    }

    /**
     * Animation frame
     * 
     * @param {*} scene 
     * @param {*} camera 
     */
    animate(scene, camera, delta) {
        if(this.#controls){
        updateChunkPosition(scene,
			this.#noiseBlueprints,
			this.#chunkPos.set(Math.floor(this.#saucer.position.x / 32),
				Math.floor(this.#saucer.position.y / 32),
				Math.floor(this.#saucer.position.z / 32)))

            this.#uniforms.uPlayerPos.value.copy(this.#saucer.position)

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

            this.#controls.target = this.#saucer.position
            this.#controls.update()

            this.#saucer.rotation.y += 0.02 * delta

            this.#direction.copy(camera.position).sub(this.#saucer.position)
            this.#direction.y = 0
            this.#direction.normalize()
            this.#direction.multiplyScalar(-0.01 * delta)

            this.#saucer.position.add(this.#direction)
            camera.position.add(this.#direction)
            console.log(this.#saucer.position)
        }

        this.#composer.render()
    }
}


export default GameScreen