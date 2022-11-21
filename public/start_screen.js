import * as THREE from 'three'
import GameScreen from './game_screen.js'

class StartScreen {
    #nextSceneCallback

    constructor() {

    }

    /**
     * Initialize the start screen
     * 
     * @param {*} scene 
     * @param {*} camera 
     * @param {*} renderer 
     * @param {*} nextSceneCallback 
     */
    init(scene, camera, renderer, nextSceneCallback) {
        this.#nextSceneCallback = nextSceneCallback
    }

    /**
     * Animation frame
     * 
     * @param {*} scene 
     * @param {*} camera 
     */
    animate(scene, camera) {
        this.#nextSceneCallback(new GameScreen())
    }
}

export default StartScreen