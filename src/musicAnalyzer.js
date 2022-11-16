const AV = require('av')
require('mp3')

/**
 * Class to analyze music properties like e.g. bpm, frequency spectrum, etc. from a music file.
 */
module.exports = class MusicAnalyzer {
	/**
	 * Create a MusicAnalyzer object for given audio file.
	 * @param {File} musicFile A file object of a MP3 music file.
	 */
	constructor (musicFile) {
		if (!(musicFile instanceof File)) { throw Error(`Expected instance of 'File', but got ${musicFile.constructor.name}`) }
		if (musicFile.type !== 'audio/mpeg') { throw Error(`Expected type 'audio/mpeg' but got ${musicFile.type}`) }

		this.asset = AV.Asset.fromFile(musicFile)
		this.player = AV.Player.fromFile(musicFile)
	}

	play () {
		this.player.play()
	}
}
