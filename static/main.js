import * as THREE from "./ext/three.js";
import { noise, noiseBlueprint, bufferNoise, createBufferedNoise, getLayeredNoise } from "./noise.js"
import { findStartingLocation, initTerrainWorker, updateChunkPosition } from "./terrain.js"

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

const canvas = document.createElement( 'canvas' );
const context = canvas.getContext( 'webgl2', { alpha: false } );
if(!context) {
    alert("WebGL 2 is required for running this application")
}
const renderer = new THREE.WebGLRenderer({ canvas: canvas, context: context });
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );
const skyColor = 0xB1E1FF;  // light blue
const groundColor = 0xB97A20;  // brownish orange
const light = new THREE.HemisphereLight(skyColor, groundColor, 0.2);
const hem = new THREE.PointLight(0xFFFFFF, 0.8)
hem.position.y+=1
scene.add(light)
camera.add(hem)

const n0 = noiseBlueprint(new THREE.Matrix4().set(0, 0, 1/34, 0, 0, 1/30, 0, 0, 1/30, 0, 0, 0, 0, 0, 0, 1), new THREE.Matrix4().makeTranslation(0, 3, 2), 10)
const n2 = noiseBlueprint(new THREE.Matrix4().multiplyScalar(1/25), new THREE.Matrix4(), 10)
const n3 = noiseBlueprint(new THREE.Matrix4().set(0, 0, 1/5, 0, 1/5, 0, 0, 0, 0, 1/5, 0, 0, 0, 0, 0, 1), new THREE.Matrix4(), 2)
const n4 = noiseBlueprint(new THREE.Matrix4().set(0, 0, 1/2, 0, 0, 1/2, 0, 0, 1/2, 0, 0, 0, 0, 0, 0, 1), new THREE.Matrix4(), 5)
const blueprints = [n0, n2, n3]
blueprints.forEach(bufferNoise)
const fun = getLayeredNoise(blueprints)
const start = findStartingLocation(fun)
scene.add( camera )
camera.position.x = start[0]
camera.position.y = start[1]
camera.position.z = start[2]

const v = 0.08
const nextPos = (pos, dir) => {
    return pos.add(dir.multiplyScalar(v))
}
const ln = new THREE.Vector3()
const lne = new THREE.Matrix4()
const lookNext = (pos, dir) => {
    ln.copy(pos).add(dir)
    let current = fun(pos.x, pos.y, pos.z)
    let next = fun(ln.x, ln.y, ln.z)

    if(current - next > 0) {
        lne.makeRotationY((current-next)/10)
        lne.makeRotationX((current-next)/30)
        dir.applyMatrix4(lne)
    } 
    dir.normalize()
}

const pos = new THREE.Vector3()
const camLookAt = new THREE.Vector3()
const render = () => {
    updateChunkPosition(scene, blueprints, pos.set(Math.floor(camera.position.x/32),Math.floor(camera.position.y/32),Math.floor(camera.position.z/32)))
    nextPos(camera.position, camera.getWorldDirection(camLookAt))
    requestAnimationFrame( render )
    renderer.render( scene, camera )
}
render()
