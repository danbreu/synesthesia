/**
 * Class to analyze music properties like e.g. bpm, frequency spectrum, etc. from a music file.
 */
module.exports = class MusicAnalyzer {
	#buffer
	#musicFile
	#isInitialized = false
	#decodedData

	/**
	 * Create a MusicAnalyzer object for given audio file.
	 * @param {File} musicFile A file object of a .wav music file.
	 */
	constructor (musicFile) {
		if (!(musicFile instanceof File)) { throw Error(`Expected instance of 'File', but got ${musicFile.constructor.name}`) }
		if (musicFile.type !== 'audio/vnd.wav') { throw Error(`Expected type 'audio/vnd.wav' but got ${musicFile.type}`) }

		this.#musicFile = musicFile
	}

	/**
	 * Initialize the Music Analyzer
	 */
	async initialize () {
		this.#buffer = await this.#musicFile.arrayBuffer()
		this.#decodedData = this.#decode()
		this.#isInitialized = true
	}

	/**
	 * Decode the .wav file.
	 * @returns Object of all data of the .wav file.
	 */
	#decode () {
		const formatType = new Int16Array(this.#buffer.slice(20, 2))
		if (formatType[0] !== 1) { throw new Error('Audio File contains no PCM data.') }

		const channelCount = new Int16Array(this.#buffer.slice(22, 23))
		const sampleRate = new Int32Array(this.#buffer.slice(24, 27))
		const byteRate = new Int32Array(this.#buffer.slice(28, 31))
		const blockAlign = new Int16Array(this.#buffer.slice(32, 33))
		const bitsPerSample = new Int16Array(this.#buffer.slice(34, 35))
		const pcmDataSize = new Int32Array(this.#buffer.slice(40, 43))

		let pcmData
		if (bitsPerSample === 16) {
			pcmData = new Int16Array(this.#buffer.slice(44, this.#buffer.length - 1 - (pcmDataSize % 2)))
		} else if (bitsPerSample === 32) {
			pcmData = new Int32Array(this.#buffer.slice(44, this.#buffer.length - 1 - (pcmDataSize % 2)))
		} else {
			throw new Error('Unsupported bit depth. Supported are 16 and 32 bit.')
		}

		return {
			channelCount,
			sampleRate,
			byteRate,
			blockAlign,
			bitsPerSample,
			pcmDataSize,
			pcmData
		}
	}
}
