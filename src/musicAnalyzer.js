const FFT = require('fft.js')
const FileSaver = require('file-saver')


/**
 * Class to analyze music properties like e.g. bpm, frequency spectrum, etc. from music PCM data.
 */
class MusicAnalyzer {
	#pcmData
	#duration
	#sampleRate
	#samplesPerFrame
	#bassMap = new Map()
	#frameRate
	#bitsPerSample

	/**
	 * Create a MusicAnalyzer object for given PCM data.
	 * @param {Int16Array | Int32Array} pcmData Mono PCM data of the music file.
	 * @param {number} duration The duration of the music file in seconds.
	 * @param {number} sampleRate The sample rate of the PCM data in samples per second.
	 * @param {number} [samplesPerFrame=1024] How many samples per frame should be used. Must be a power of 2.
	 * @throws If `pcmData` is no instance of *Int16Array* or *Int32Array*.
	 * @throws If `samplesPerFrame` is no power of 2.
	 */
	constructor (pcmData, duration, sampleRate, bitsPerSample, samplesPerFrame = 1024) {
		if (!(pcmData instanceof Int16Array) && !(pcmData instanceof Int32Array)) {
			throw Error(`Expected instance of Int16Array or Int32Array, but got ${pcmData.constructor.name}`)
		}
		if (Math.log2(1024) % 1 !== 0) {
			throw Error(`Parameter samplesPerFrame must be a power of 2.`)
		}

		this.#pcmData = pcmData
		this.#duration = duration
		this.#sampleRate = sampleRate
		this.#samplesPerFrame = samplesPerFrame
		this.#frameRate = this.#sampleRate / samplesPerFrame
		this.#bitsPerSample = pcmData instanceof Int16Array ? 16 : 32

		this.#createBassnessMap()
	}

	/**
	 * Returns the bassness at a given time.
	 * @param {number} time Time in milliseconds where the bass should be get.
	 * @returns {number} Integer between 0 and 255 which represents bassness.
	 */
	getBassness (time) {
		if (time >= (this.#duration * 1000)) {
			return null
		}

		const key = Math.floor(time / 1000 * this.#frameRate)
		return this.#bassMap.get(key)
	}

	/**
	 * Create a bassness map with FFT.
	 * @details Creates a bassness map with using Radix-4 FFT of {@link https://github.com/indutny/fft.js/ fft.js}.
	 * 			To be better able to interpret the output, the highest bass value will be taken and mapped to 255.
	 */
	#createBassnessMap () {
		const frameCount = Math.floor(this.#duration * this.#frameRate)
		const fft = new FFT(this.#samplesPerFrame)
		const output = fft.createComplexArray()
		const real = new Array(this.#samplesPerFrame)
		for (let i = 0; i < frameCount; ++i) {
			fft.realTransform(output, this.#pcmData.slice(i * this.#samplesPerFrame, (i + 1) * this.#samplesPerFrame))
			fft.fromComplexArray(output, real)
			fft.completeSpectrum(output)
			const bassness = this.#analyzeBassness(output)
			this.#bassMap.set(i, bassness)
		}
		const max = Math.max(...this.#bassMap.values())
		this.#bassMap.forEach( (val, key, map) => {
			map.set(key, Math.floor(MusicAnalyzer.#mapValues(val, 0, max, 0, 255)))
		})
	}

	static #mapValues (value, x1, y1, x2, y2) {
		return (value - x1) * (y2 - x2) / (y1 - x1) + x2
	}

	/**
	 * Calculate average magnitude of bass frequencies.
	 * @param {Array} fftResult Complex array of the FFT result.
	 * @returns {number} The average bass magnitude.
	 */
	#analyzeBassness (fftResult) {
		const magnitude = []
		const higherIndex = Math.floor(this.#samplesPerFrame * 250 / this.#sampleRate)

		for (let i = 0; i <= higherIndex; ++i) {
			const re = fftResult[2 * i]
			const im = fftResult[2 * i + 1]
			magnitude.push(Math.sqrt(re*re + im*im))
		}

		return magnitude.reduce((a,b) => a + b, 0) / magnitude.length
	}
}

module.exports = MusicAnalyzer
