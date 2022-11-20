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

const scale = 0.6
const n0 = noiseBlueprint(new THREE.Matrix4().set(0, 0, 1/60*scale, 0, 0, 1/40*scale, 0, 0, 1/40*scale, 0, 0, 0, 0, 0, 0, 1), new THREE.Matrix4().makeTranslation(2, 2, 2), 20)
const n2 = noiseBlueprint(new THREE.Matrix4().multiplyScalar(1/80*scale), new THREE.Matrix4(), 20)
const n3 = noiseBlueprint(new THREE.Matrix4().set(0, 0, 1/5*scale, 0, 1/5*scale, 0, 0, 0, 0, 1/5*scale, 0, 0, 0, 0, 0, 1), new THREE.Matrix4(), 1)
const n4 = noiseBlueprint(new THREE.Matrix4().set(0, 0, 1/2*scale, 0, 0, 1/2*scale, 0, 0, 1/2*scale, 0, 0, 0, 0, 0, 0, 1), new THREE.Matrix4(), 5)
const blueprints = [n0, n2, n3]
blueprints.forEach(bufferNoise)
const fun = getLayeredNoise(blueprints)
const start = findStartingLocation(fun, 5, 5 , 5)
scene.add( camera )
camera.position.x = start[0]
camera.position.y = start[1]
camera.position.z = start[2]

const v = 0.1
const nextPos = (pos, dir) => {
    return pos.add(dir.multiplyScalar(v))
}

const marchRay = (terrainFunction, position, direction, noSamples = 10, isoLevel = 0) => {
    let distance = 0
    let cumDistance = 0

    for (let i = 0; i < noSamples; i++) {
        distance = terrainFunction(position.x + direction.x * distance,
                        position.y + direction.y * distance,
                        position.z + direction.z * distance) - 2
        if(distance > isoLevel) cumDistance += distance
        else break
    }

    return cumDistance
}
console.log(fun(...start))

const coneAngle = 4
const samples = 40
const buffer = new THREE.Vector3(0,0,0)
const startingPoint = new THREE.Vector3()
const bufferEuler = new THREE.Euler()
const topEuler = new THREE.Euler()
const topDirection = new THREE.Vector3()
const oldEuler = new THREE.Euler(0, 0, 0)
const angularVelocity = new THREE.Euler(0.2,0.2,0)
const raycaster = new THREE.Raycaster()
const lookNext = (terrainFunction, camera) => {
    camera.getWorldDirection(buffer)

    startingPoint.copy(buffer)

    let tries = 0
    let topDistance = 0
    const posDistance = terrainFunction(camera.position.x, camera.position.y, camera.position.z)
    for(let i = 0; i < samples*2; i++) {
        bufferEuler.set(0, coneAngle/samples*i/2*(i % 2 == 0 ? -1 : 1), 0)

        buffer.copy(startingPoint)
        buffer.applyEuler(bufferEuler)

        const distance = marchRay(terrainFunction, camera.position, buffer)
        if(distance > (posDistance < 0 ? 10 : 8)) {
            topEuler.copy(bufferEuler)
            topDistance = distance
            break
        }
        tries++
    }

    let y = false
    for(let i = 0; i < tries*2; i++) {
        bufferEuler.set(coneAngle/samples*i/2*(i % 2 == 0 ? -1 : 1), 0, 0)

        buffer.copy(startingPoint)
        buffer.applyEuler(bufferEuler)

        const distance = marchRay(terrainFunction, camera.position, buffer)
        if(distance > topDistance) {
            topEuler.copy(bufferEuler)
            y = true
            break
        }
    }

    for(let i = 0; i < samples*2; i++) {
        bufferEuler[ y ? "x" : "y" ] = coneAngle/samples*i/2*(i % 2 == 0 ? -1 : 1)

        buffer.copy(startingPoint)
        buffer.applyEuler(bufferEuler)

        const distance = marchRay(terrainFunction, camera.position, buffer)
        if(distance > (posDistance < 0 ? 12 : 8)) {
            topEuler.copy(bufferEuler)
            break
        }
    }

    camera.getWorldDirection(buffer)
    topEuler.x *= angularVelocity.x
    topEuler.y *= angularVelocity.y
    buffer.applyEuler(topEuler)
    if(!(topEuler.x == topEuler.y == topEuler.z == 0)) {
        console.log("a", camera.getWorldDirection(topDirection))
        console.log("b", buffer)
    }

    return buffer
}


const pos = new THREE.Vector3()
const render = () => {
    updateChunkPosition(scene, blueprints, pos.set(Math.floor(camera.position.x/32),Math.floor(camera.position.y/32),Math.floor(camera.position.z/32)))

    camera.lookAt(lookNext(fun, camera).add(camera.position))
    //lookNext(fun, camera)
    nextPos(camera.position, camera.getWorldDirection(buffer))

    requestAnimationFrame( render )
    renderer.render( scene, camera )
}
render()
