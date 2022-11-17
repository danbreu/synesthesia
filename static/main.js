import * as THREE from "./ext/three.js";
import { terrainSdfMaterial } from "./terrain.js"
import { marchCubes } from "./marching_cubes.js"
import { noise } from "./noise.js"

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

const light = new THREE.AmbientLight(0xFFFFFF, 0.2)
const hem = new THREE.DirectionalLight(0xFFFFFF, 1)
hem.position.y+=1
scene.add(light)
scene.add(hem)
const material = new THREE.MeshPhongMaterial({color: 'red', flatShading: true}) //; terrainSdfMaterial()
 // STRIPES TEXTURE (GOOD FOR MAKING MARBLE)
const stripes = (x, f) => {
    let t = .5 + .5 * Math.sin(f * 2*Math.PI * x)
    return t * t - .5
}
 // TURBULENCE TEXTURE
const turbulence = (x, y, z) => {
    let f=1
    let t = -.5
    for ( ; f <=100/12 ; f *= 2)
        t += Math.abs(noise(x,y,z,f) / f)
    return t
}
let biggest = 0
const n = (x,y,z) => {
    x-=10; y-=10; z-=10;
    return noise(z/20, y/20, x/20)*15 + noise(y/20, z/20, x/20)*15 + noise(x/20,y/20,z/20)*20 + noise(z/5,x/5,y/5) + noise(z/2,y/2,x/2)
}
const sph = (x,y,z) => {x-=4; y-=4; z-=4; return Math.sqrt(x*x+y*y+z*z)-4;}
const cube = (x,y,z) => {
    x-=6; y-=6; z-=6;
    x = Math.abs(x)-3
    y = Math.abs(y)-3
    z = Math.abs(z)-3

    const insideDistance = Math.min(Math.max(x, Math.max(y, z)), 0.0);

    const outsideDistance = Math.max(x, y, z, 0.0);

    return insideDistance + outsideDistance;
}
const geometry = marchCubes(n, 20, 20, 20) //new THREE.BoxGeometry( 2, 2, 2 );
const mesh = new THREE.Mesh( geometry, material );
scene.add( mesh );
camera.position.z = 50;

const render = () => {
    mesh.rotation.x += 0.01
    mesh.rotation.y += 0.01
    requestAnimationFrame( render )
    renderer.render( scene, camera )
    console.log(biggest)
}
render()
