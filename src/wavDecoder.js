/**
 * Class to decode .wav audio files to mono PCM data.
 */
class WavDecoder {
	#buffer
	#musicFile
	#isInitialized = false
	#decodedData

	/**
	 * Basic decoder for WAVE audio files.
	 * @param {File} musicFile WAVE music file.
	 * @throws If musicFile is no instance of {@link https://developer.mozilla.org/en-US/docs/Web/API/File File} or if it isn't the type 'audio/wav'.
	 */
	constructor (musicFile) {
		if (!(musicFile instanceof File)) { throw Error(`Expected instance of 'File', but got ${musicFile.constructor.name}`) }
		if (musicFile.type !== 'audio/wav') { throw Error(`Expected type 'audio/wav' but got ${musicFile.type}`) }

		this.#musicFile = musicFile
	}

	/**
	 * Mono PCM data. Either a Int16Array or Int32Array based on bit depth.
	 * @see {@link bitsPerSample}
	 * @type {Int32Array | Int16Array}
	 */
	get pcmData () {
		return this.#isInitialized ? this.#decodedData.pcmData : null
	}

	/**
	 * The sample rate of the music file.
	 * @type {number}
	 */
	get sampleRate () {
		return this.#isInitialized ? this.#decodedData.sampleRate : null
	}

	/**
	 * The byte rate of the music file.
	 * @type {number}
	 */
	get byteRate () {
		return this.#isInitialized ? this.#decodedData.byteRate : null
	}

	/**
	 * The bit depth of one sample.
	 * @type {number}
	 */
	get bitsPerSample () {
		return this.#isInitialized ? this.#decodedData.bitsPerSample : null
	}

	/**
	 * Duration of the music file.
	 * @type {number}
	 */
	get duration () {
		return this.#isInitialized ? this.#decodedData.duration : null
	}

	/**
	 * Start the decoder.
	 */
	async start () {
		this.#buffer = await this.#musicFile.arrayBuffer()
		this.#decodedData = this.#decode()
		if (this.#decodedData.channelCount === 2) {
			this.#stripRightChannel()
		}
		this.#decodedData.duration = this.#decodedData.pcmData.length / this.#decodedData.sampleRate
		this.#isInitialized = true
	}

	/**
	 * Decode the .wav file.
	 * @returns Object of all data of the .wav file.
	 */
	#decode () {
		const formatType = new Int16Array(this.#buffer.slice(20, 22))[0]
		if (formatType !== 1) { throw new Error('Audio File contains no PCM data.') }

		const channelCount = (new Int16Array(this.#buffer.slice(22, 24)))[0]
		if (channelCount > 2) {
			throw new Error('Only accept mono or stereo files.')
		}
		const sampleRate = (new Int32Array(this.#buffer.slice(24, 28)))[0]
		const byteRate = (new Int32Array(this.#buffer.slice(28, 32)))[0]
		// blockAlign == (channelCount * bitsPerSample) / 8
		const blockAlign = (new Int16Array(this.#buffer.slice(32, 34)))[0]
		const bitsPerSample = (new Int16Array(this.#buffer.slice(34, 36)))[0]
		const pcmDataSize = (new Int32Array(this.#buffer.slice(40, 44)))[0]

		let pcmData
		if (bitsPerSample === 16) {
			pcmData = new Int16Array(this.#buffer.slice(44, this.#buffer.byteLength - (pcmDataSize % 2)))
		} else if (bitsPerSample === 32) {
			pcmData = new Int32Array(this.#buffer.slice(44, this.#buffer.byteLength - (pcmDataSize % 2)))
		} else {
			throw new Error('Unsupported bit depth. Supported are 16 and 32 bit.')
		}

		return {
			channelCount,
			sampleRate,
			byteRate,
			blockAlign,
			bitsPerSample,
			pcmData
		}
	}

	/**
	 * Strip the right channel of stereo PCM data.
	 */
	#stripRightChannel () {
		const newLength = Math.floor(this.#decodedData.pcmData.length / 2)
		const monoPcmData = this.#decodedData.bitsPerSample === 16 ? new Int16Array(newLength) : new Int32Array(newLength)

		for (let i = 0; i <= this.#decodedData.pcmData.length; i += 2) {
			monoPcmData[i / 2] = this.#decodedData.pcmData[i]
		}

		this.#decodedData.pcmData = monoPcmData
	}
}

module.exports = WavDecoder
