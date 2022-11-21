import { marchCubes } from './marching_cubes.js'
import { bufferNoise, getLayeredNoise } from './noise.js'

let noise = null

onmessage = (message) => {
	const [command, arg0, arg1, arg2] = message.data

	switch (command) {
	case 'setNoise':
		arg0.forEach(bufferNoise)
		noise = getLayeredNoise(arg0)
		postMessage(['doneSetNoise'])
		break
	case 'marchCubes':
		const dimensions = arg0
		const position = arg1
		const triangles = marchCubes(noise, ...position, ...dimensions)
		postMessage(['doneMarchCubes', triangles.buffer, triangles.length, position], [triangles.buffer])
		break
	default:
		console.log(`Unknown command for marching cubes worker: ${command}`)
		break
	}
}
