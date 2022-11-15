const THREE = require('three');
const AV = require('av');
require('mp3');

async function main() {
	const blob = await fetch('./music/madragora.mp3')
	.then( res => {
		if (!res.ok) {
			console.log(res.status);
			return null;
		}
		return res.blob();
	});

	if (blob === null) {
		return console.log("Sad blob noises :(");
	}

	const file = new File([blob], 'madragora.mp3', {type: "audio/mpeg"});

	const player = AV.Player.fromFile(file);
	player.volume = 100;
	player.play();

	const scene = new THREE.Scene();
	const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

	const renderer = new THREE.WebGLRenderer();
	renderer.setSize( window.innerWidth, window.innerHeight );
	document.body.appendChild( renderer.domElement );

	const geometry = new THREE.BoxGeometry( 1, 1, 1 );
	const material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
	const cube = new THREE.Mesh( geometry, material );
	scene.add( cube );

	camera.position.z = 5;

	function animate() {
		requestAnimationFrame( animate );

		cube.rotation.x += 0.01;
		cube.rotation.y += 0.01;

		renderer.render( scene, camera );
	};

	animate();
}

window.addEventListener('DOMContentLoaded', main);
