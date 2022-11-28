import { getLoudness, FREQUENCY_MIN, FREQUENCY_MAX } from "./ext/equalLoudness.js"

/**
 * Class to analyze music using the AudioContext API
 */
 class AudioContextAnalyzer {
    // Audio player DOM element
    #audioElement
    // Audio context and analyzer node
    #context
    #analyzer
    // Buffer used for frequency spectrum
    #frequencyData
    #averageAmplitudes

	constructor (audioUrl, samplesPerFrame=1024) {
        this.#initAudioElement(audioUrl)
        this.#initAudioContext(samplesPerFrame)
    
        this.#frequencyData = new Uint8Array(this.#analyzer.frequencyBinCount)
        this.#averageAmplitudes = {}
    }

    /**
     * Create audio player DOM element
     * 
     * @param {String} audioUrl 
     */
    #initAudioElement (audioUrl) {
        this.#audioElement = new Audio()
        this.#audioElement.src = audioUrl
        this.#audioElement.crossOrigin = "anonymous"
        document.body.appendChild(this.#audioElement)
    }

    /**
     * Initialize audio context and analyzer node
     * 
     * @param {Number} samplesPerFrame 
     * @throws If audio context can not be created
     */
    #initAudioContext (samplesPerFrame) {
        this.#context = new (window.AudioContext || window.webkitAudioContext)()
        if(!this.#context) { throw Error("Could not create audio context (API not supported in this browser?)") }

        const elementSrc = this.#context.createMediaElementSource(this.#audioElement)

        this.#analyzer = this.#context.createAnalyser()
        this.#analyzer.fftSize = samplesPerFrame

        this.#analyzer.maxDecibels = -5
        this.#analyzer.minDecibels = -50
        this.#analyzer.smoothingTimeConstant = 0
    
        elementSrc.connect(this.#analyzer)
        this.#analyzer.connect(this.#context.destination)
    }

	getFrequencySlice (lowerFrequency, upperFrequency) {
        // Update buffer
        this.#analyzer.getByteFrequencyData(this.#frequencyData)

        // Translate frequency bounds into frequency bin indices
        const maxFrequency = this.#context.sampleRate / 2

        if(upperFrequency > maxFrequency) { upperFrequency = maxFrequency }

		const lowerBucket = Math.floor(lowerFrequency / maxFrequency * this.#analyzer.frequencyBinCount)
        const upperBucket = Math.floor(upperFrequency / maxFrequency * this.#analyzer.frequencyBinCount) + 1

        // Get buckets and correct for the fact that human ears percieve different frequencies differently
        const correctedBuckets = (this.#frequencyData
            .subarray(lowerBucket, upperBucket)
            .map((x, i) => {
                let currentFrequency = (lowerBucket + i) / this.#analyzer.frequencyBinCount * maxFrequency
                const currentDecibel = x / 255 * 45 + 5

                if (currentFrequency < FREQUENCY_MIN) { currentFrequency = FREQUENCY_MIN }
                else if (currentFrequency > FREQUENCY_MAX) { currentFrequency = FREQUENCY_MAX - 1 }

                const loudness = getLoudness(currentDecibel, currentFrequency)
                return loudness < 0 ? 0 : loudness * 32
            }))

        // Average buckets
        let average = (correctedBuckets
            .reduce((a, b) => a + b)
            / (upperBucket - lowerBucket))



        return average
	}

    get audioElement () {
        return this.#audioElement
    }

    get context () {
        return this.#context
    }
}

const hashFrequencyRange = (lowerFrequency, upperFrequency) => {
    return lowerFrequency * 11 + upperFrequency * 13
}

export default AudioContextAnalyzer
