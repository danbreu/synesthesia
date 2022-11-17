const AV = require('av')
require('mp3')

/**
 * Class to analyze music properties like e.g. bpm, frequency spectrum, etc. from a music file.
 */
module.exports = class MusicAnalyzer {
	/**
	 * Create a MusicAnalyzer object for given audio file.
	 * @param {File} musicFile A file object of a MP3 music file.
	 * @param {() => any} decodingDoneCallback Callback after decoding is done.
	 */
	constructor (musicFile, decodingDoneCallback) {
		if (!(musicFile instanceof File)) { throw Error(`Expected instance of 'File', but got ${musicFile.constructor.name}`) }
		if (musicFile.type !== 'audio/mpeg') { throw Error(`Expected type 'audio/mpeg' but got ${musicFile.type}`) }

		this.asset = AV.Asset.fromFile(musicFile)

		this.#format = null
		this.asset.get('format', format => { this.format = format })

		this.#decodedData = null
		this.decodingDone = false
		this.decodingDoneCallback = decodingDoneCallback
	}

	get isDecodingDone() {
		return this.decodingDone
	}

	/**
	 * Start the decoding of the Mp3 file.
	 */
	startDecoding () {
		this.asset.decodeToBuffer(buffer => {
			this.decodedData = buffer
			this.decodingDone = true
			this.decodingDoneCallback()
		})
		this.asset.start()
	}

	#splitChannel () {
		if (!this.decodingDone) {
			throw new Error("Can't split channels before decoding is done.")
		}
		const sampleRate = this.format.sampleRate
		const bitsPerChannel = this.format.bitsPerChannel
		const channelCount = this.format.channelsPerFrame


	}

}
