import * as THREE from 'three'
import GameScreen from './game_screen.js'

class StartScreen {
    #nextScreenCallback
    #assetLocations

    constructor(assetLocations) {
        this.#assetLocations = assetLocations
    }

    /**
     * Initialize the start screen
     * 
     * @param {*} scene 
     * @param {*} camera 
     * @param {*} renderer 
     * @param {*} nextScreenCallback 
     */
    init(scene, camera, renderer, nextScreenCallback) {
        this.#nextScreenCallback = nextScreenCallback
    }

    /**
     * Animation frame
     * 
     * @param {*} scene 
     * @param {*} camera 
     */
    animate(scene, camera) {
        this.#nextScreenCallback(new GameScreen(this.#assetLocations))
    }
}

export default StartScreen