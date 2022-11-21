import * as THREE from 'three'
import GameScreen from './game_screen.js'

class StartScreen {
    #nextScreenCallback

    constructor() {

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
        this.#nextScreenCallback(new GameScreen())
    }
}

export default StartScreen