import FFT from './ext/fft.js'

/**
 * Class to analyze music properties like e.g. bpm, frequency spectrum, etc. from music PCM data.
 */
class MusicAnalyzer {
	#pcmData
	#duration
	#sampleRate
	#samplesPerFrame
	#frequencyMap = new Map()
	#frameRate

	/**
	 * Create a MusicAnalyzer object for given PCM data.
	 *
	 * @param {Int16Array | Int32Array} pcmData Mono PCM data of the music file.
	 * @param {number} duration The duration of the music file in seconds.
	 * @param {number} sampleRate The sample rate of the PCM data in samples per second.
	 * @param {number} [samplesPerFrame=1024] How many samples per frame should be used. Must be a power of 2.
	 * @throws If `pcmData` is no instance of *Int16Array* or *Int32Array*.
	 * @throws If `samplesPerFrame` is no power of 2.
	 */
	constructor (pcmData, duration, sampleRate, samplesPerFrame = 1024) {
		if (!(pcmData instanceof Int16Array) && !(pcmData instanceof Int32Array)) {
			throw Error(`Expected instance of Int16Array or Int32Array, but got ${pcmData.constructor.name}`)
		}
		if (Math.log2(1024) % 1 !== 0) {
			throw Error('Parameter samplesPerFrame must be a power of 2.')
		}

		this.#pcmData = pcmData
		this.#duration = duration
		this.#sampleRate = sampleRate
		this.#samplesPerFrame = samplesPerFrame
		this.#frameRate = this.#sampleRate / samplesPerFrame
	}

	/**
	 * Returns the bassness at a given time.
	 *
	 * @param {number} time Time in milliseconds where the bass should be get.
	 * @param {number} lowerFrequency Lower frequency of the slice.
	 * @param {number} upperFrequency Upper frequency of the slice.
	 * @returns {number} Integer between 0 and 255 which represents bassness.
	 */
	getFrequencySlice (time, lowerFrequency, upperFrequency) {
		if (time >= (this.#duration * 1000)) { return null }

		const key = this.#hashFrequencyRange(lowerFrequency, upperFrequency)
		const mapEntry = this.#frequencyMap.get(key)

		if (!mapEntry) {
			this.#frequencyMap.set(key, this.#createFrequencySliceMap(lowerFrequency, upperFrequency))
		}

		const timeKey = Math.floor(time / 1000 * this.#frameRate)
		return this.#frequencyMap.get(key).get(timeKey)
	}

	/**
	 * Create a map for the magnitudes of a given frequency slice with FFT.
	 *
	 * @param {number} lowerFrequency lower frequency of the slice.
	 * @param {number} upperFrequency upper frequency of the slice.
	 * @returns {Map<number, number>} Map consisting of time and magnitude of frequency slice.
	 *
	 * @details
	 * Creates a map with a key being the frame count and the value representing the magnitude in the given frequency range.
	 * The magnitude is determined using Radix-4 FFT of {@link https://github.com/indutny/fft.js/ fft.js}.
	 * To be better able to interpret the output, the highest average magnitude will be taken and mapped to 255.
	 */
	#createFrequencySliceMap (lowerFrequency, upperFrequency) {
		const map = new Map
		const frameCount = Math.floor(this.#duration * this.#frameRate)
		const fft = new FFT(this.#samplesPerFrame)
		const output = fft.createComplexArray()
		const real = new Array(this.#samplesPerFrame)
		for (let i = 0; i < frameCount; ++i) {
			fft.realTransform(output, this.#pcmData.slice(i * this.#samplesPerFrame, (i + 1) * this.#samplesPerFrame))
			fft.fromComplexArray(output, real)
			fft.completeSpectrum(output)
			const bassness = this.#analyzeSpectrumSlice(output, lowerFrequency, upperFrequency)
			map.set(i, bassness)
		}
		const max = Math.max(...map.values())
		map.forEach((val, key, map) => {
			map.set(key, Math.floor(MusicAnalyzer.#mapValues(val, 0, max, 0, 255)))
		})
		return map
	}

	/**
	 * Method to create a key for the {@link #frequencyMap}.
	 *
	 * @param {number} lowerFrequency Lower frequency for the hash value.
	 * @param {number} upperFrequency Upper frequency for the hash value.
	 * @returns {number} Hash value.
	 */
	#hashFrequencyRange (lowerFrequency, upperFrequency) {
		return lowerFrequency * 11 + upperFrequency * 13
	}

	/**
	 * Map values from one range to another.
	 *
	 * @param {number} value Input value which should be mapped.
	 * @param {number} x1 Lower border from input range.
	 * @param {number} y1 Upper border from input range.
	 * @param {number} x2 Lower border from output range.
	 * @param {number} y2 Upper border form output range.
	 * @returns {number} Mapped value.
	 */
	static #mapValues (value, x1, y1, x2, y2) {
		return (value - x1) * (y2 - x2) / (y1 - x1) + x2
	}

	/**
	 * Calculate average magnitude of bass frequencies.
	 *
	 * @param {Array} fftResult Complex array of the FFT result.
	 * @returns {number} The average bass magnitude.
	 */
	#analyzeSpectrumSlice (fftResult, lowerFrequency, higherFrequency) {
		const magnitude = []
		const lowerIndex = Math.floor(this.#samplesPerFrame * lowerFrequency / this.#sampleRate)
		const higherIndex = Math.floor(this.#samplesPerFrame * higherFrequency / this.#sampleRate)

		for (let i = 0; i <= higherIndex; ++i) {
			const re = fftResult[2 * i]
			const im = fftResult[2 * i + 1]
			magnitude.push(Math.sqrt(re * re + im * im))
		}

		return magnitude.reduce((a, b) => a + b, 0) / magnitude.length
	}

}

export default MusicAnalyzer
