import * as THREE from 'three'
import GameScreen from './game_screen.js'

class StartScreen {
    #nextSceneCallback

    constructor() {

    }

    init(scene, camera, renderer, nextSceneCallback) {
        this.#nextSceneCallback = nextSceneCallback
    }

    animate(scene, camera) {
        this.#nextSceneCallback(new GameScreen())
    }
}

export default StartScreen