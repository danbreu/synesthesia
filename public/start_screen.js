import * as THREE from 'three'
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js'
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js'
import GameScreen from './game_screen.js'

class StartScreen {
    #nextScreenCallback
    #composer
    #renderer
    #clock = new THREE.Clock()
    #sphere
    #particlesMesh
    #mouseMoveX
    #mouseMoveY
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
        this.#renderer = renderer
        

        // Object
        //const geometry = new THREE.TorusGeometry( .7, .2, 100, 100 ); //ring
        const geometry = new THREE.CylinderGeometry( .2, .5, 1.5, 100, 20 );

        const particlesGeonometry = new THREE.BufferGeometry;
        const particlesCnt = 7000;

        var mtlLoader = new MTLLoader();
        mtlLoader.setTexturePath("./assets/")
        mtlLoader.setPath("./assets/")
        mtlLoader.load("crayfish.mtl", function(materials){
            materials.preload();

            var objLoader = new OBJLoader()
            objLoader.setMaterials(materials)
            objLoader.setPath("./assets/")
            objLoader.load("crayfish.obj", function(Object){
                object.position.y = 0;
                scene.add(object)
            })
        })


        //Array for the 3d xyz cords
        const posArray = new Float32Array(particlesCnt * 3)

        for(let i = 0; i < particlesCnt * 3; i++){
            posArray[i] = (Math.random() - 0.5) * 5;
        }

        particlesGeonometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3))

        // Materials
        const material = new THREE.PointsMaterial({
            size: 0.01,
            color: 'blue',
            }
        )

        const particlesMaterial = new THREE.PointsMaterial({
            size: 0.005
            }
        )

        // Mesh
        this.#sphere = new THREE.Points(geometry,material)
        this.#particlesMesh = new THREE.Points(particlesGeonometry, particlesMaterial)
        scene.add(this.#sphere)
        scene.add(this.#particlesMesh)

        // Camera plcement
        camera.position.x = 0
        camera.position.y = 0
        camera.position.z = 2

        // Mouse

        this.#mouseMoveY = 0;
        this.#mouseMoveX = 0;

        document.addEventListener('mousemove', (event)=>this.#animateParticales(event))

    }


    #animateParticales(event){
        this.#mouseMoveY = event.clientY
        this.#mouseMoveX = event.clientX

    }
    
    

    /**
     * Animation frame
     * 
     * @param {*} scene 
     * @param {*} camera 
     */
    animate(scene, camera) {
        if (false){
        this.#nextScreenCallback(new GameScreen())}
        
        const elapsedTime = this.#clock.getElapsedTime()

        // Update objects
        this.#sphere.rotation.y = .5 * elapsedTime
        this.#particlesMesh.rotation.y = -0.1 * elapsedTime

        if (this.#mouseMoveX > 0){
        this.#particlesMesh.rotation.y = -this.#mouseMoveY * (elapsedTime * 0.00008)
        this.#particlesMesh.rotation.x = -this.#mouseMoveX * (elapsedTime * 0.00008)
        }

       // Update objects
       this.#sphere.rotation.y = .5 * elapsedTime

       // Update Orbital Controls
       // controls.update()

       // Render
       this.#renderer.render(scene, camera)
    }
}

export default StartScreen